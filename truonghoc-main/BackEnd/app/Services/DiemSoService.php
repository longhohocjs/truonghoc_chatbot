<?php

namespace App\Services;

use App\Models\DiemRenLuyen;
use App\Models\LopHocPhan;
use App\Models\View\VBangDiemLopHocPhan;
use App\Models\View\VDiemRenLuyenSinhVien;
use App\Services\StoreProcedure\NhapDiemService;
use App\Services\StoreProcedure\TinhDiemTongKetService;
use App\Services\StoreProcedure\TinhGpaHocKyService;
use App\Services\LogService;
use Illuminate\Support\Facades\DB;

class DiemSoService
{
    protected $nhapDiemSP;
    protected $tinhDiemTongKetSP;
    protected $tinhGpaSP;
    protected $logService;

    public function __construct(
        NhapDiemService $nhapDiemSP,
        TinhDiemTongKetService $tinhDiemTongKetSP,
        TinhGpaHocKyService $tinhGpaSP,
        LogService $logService
    ) {
        $this->nhapDiemSP = $nhapDiemSP;
        $this->tinhDiemTongKetSP = $tinhDiemTongKetSP;
        $this->tinhGpaSP = $tinhGpaSP;
        $this->logService = $logService;
    }

    public function getBangDiemLopHP(array $filters)
    {
        $model = new VBangDiemLopHocPhan();
        $tableName = $model->getTable();
        $query = $model->newQuery();

        // Thực hiện join với bảng lophocphan để lấy trạng thái khóa nhập điểm (TrangThaiNhapDiem)
        // Chúng ta đặt alias là 'IsLocked' để đồng bộ với cách gọi thuộc tính ở Frontend
        $query->join('lophocphan', "$tableName.LopHocPhanID", '=', 'lophocphan.LopHocPhanID')
              ->join('dangkyhocphan', "$tableName.DangKyID", '=', 'dangkyhocphan.DangKyID') // Join với bảng dangkyhocphan
              ->select("$tableName.*", 'lophocphan.TrangThaiNhapDiem as IsLocked', 'lophocphan.MonHocID', 'dangkyhocphan.TrangThaiThanhToan as DaThanhToanHocPhi'); // Thêm cột trạng thái thanh toán

        $results = $query->when($filters['LopHocPhanID'] ?? null, function($q, $id) use ($tableName) {
            return $q->where("$tableName.LopHocPhanID", $id);
        })->get();

        if ($results->isEmpty()) return $results;

        // Lấy danh sách tên môn điều kiện (Tiên quyết/Song hành) để hiển thị
        $monHocIds = $results->pluck('MonHocID')->unique();
        $requirements = DB::table('dieukienmonhoc as dk')
            ->join('monhoc as m', 'dk.MonTienQuyetID', '=', 'm.MonHocID')
            ->whereIn('dk.MonHocID', $monHocIds)
            ->select('dk.MonHocID', 'm.TenMon', 'dk.Loai')
            ->get()
            ->groupBy('MonHocID');

        return $results->map(function($item) use ($requirements) {
            $req = $requirements->get($item->MonHocID);
            $item->MonTienQuyet = $req ? $req->where('Loai', 1)->pluck('TenMon')->implode(', ') : 'Không có';
            $item->MonSongHanh = $req ? $req->where('Loai', 2)->pluck('TenMon')->implode(', ') : 'Không có';
            return $item;
        });
    }

    public function getDiemRenLuyen(array $filters)
    {
        $model = new VDiemRenLuyenSinhVien();
        $tableName = $model->getTable();

        $query = $model->newQuery()
            ->join('sinhvien', "$tableName.SinhVienID", '=', 'sinhvien.SinhVienID')
            ->select("$tableName.*", 'sinhvien.HoTen', 'sinhvien.MaSV');

        return $query->when($filters['HocKyID'] ?? null, function($q, $id) use ($tableName) {
                return $q->where("$tableName.HocKyID", $id);
            })
            ->when($filters['LopSinhHoatID'] ?? null, function($q, $id) use ($tableName) {
                return $q->whereIn("$tableName.SinhVienID", function($sub) use ($id) {
                    $sub->select('SinhVienID')->from('sinhvien')->where('LopSinhHoatID', $id);
                });
            })
            ->get();
    }

    public function capNhatDiemLopHP(array $data, int $userID)
    {
        $lopHPID = $data['LopHocPhanID'];
        $lop = LopHocPhan::findOrFail($lopHPID);

        if ($lop->TrangThaiNhapDiem == 1) {
            throw new \Exception("Lớp học phần này đã bị khóa nhập điểm.");
        }

        return DB::transaction(function () use ($data, $userID, $lopHPID) {
            foreach ($data['DanhSachDiem'] as $diem) {
                $this->nhapDiemSP->capNhatDiem($diem['DangKyID'], [
                    'diem_chuyen_can' => $diem['DiemChuyenCan'] ?? null,
                    'diem_giua_ky'    => $diem['DiemGiuaKy'] ?? null,
                    'diem_thi'         => $diem['DiemThi'] ?? null,
                ], $userID);

                $this->tinhDiemTongKetSP->tinhDiem($diem['DangKyID'], $userID);
            }

            $this->logService->write(
                'Cập nhật điểm học phần', 
                "Người dùng ID $userID đã cập nhật điểm cho lớp HP ID $lopHPID", 
                'lophocphan', 
                $lopHPID
            );

            return true;
        });
    }

    public function capNhatDiemRenLuyen(array $data)
    {
        return DB::transaction(function () use ($data) {
            foreach ($data['DanhSachDRL'] as $item) {
                DiemRenLuyen::updateOrCreate(
                    ['SinhVienID' => $item['SinhVienID'], 'HocKyID' => $data['HocKyID']],
                    ['TongDiem' => $item['TongDiem'], 'XepLoai' => $item['XepLoai'], 'NgayDanhGia' => now()]
                );
            }

            $this->logService->write(
                'Cập nhật điểm rèn luyện', 
                "Cập nhật điểm rèn luyện học kỳ ID " . $data['HocKyID'], 
                'diemrenluyen'
            );
            
            return true;
        });
    }

    public function setLockStatus(int $lopHPID, int $status)
    {
        $statusText = $status == 1 ? "Khóa" : "Mở khóa";
        $result = LopHocPhan::where('LopHocPhanID', $lopHPID)->update(['TrangThaiNhapDiem' => $status]);
        
        if($result) {
            $this->logService->write(
                "$statusText nhập điểm", 
                "Thực hiện $statusText chức năng nhập điểm cho lớp HP ID $lopHPID", 
                'lophocphan', 
                $lopHPID
            );
        }
        return $result;
    }
}