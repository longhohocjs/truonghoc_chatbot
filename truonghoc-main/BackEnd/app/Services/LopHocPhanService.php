<?php

namespace App\Services;

use App\Models\LopHocPhan;
use App\Models\LichHoc;
use App\Models\LichThi;
use App\Models\GiangVien;
use App\Models\DangKyHocPhan;
use App\Models\DiemSo;
use App\Models\View\VDanhSachLopGiangVien;
use App\Models\View\VSinhVienTrongLopHocPhan;
use App\Services\StoreProcedure\NhapDiemService;
use App\Services\StoreProcedure\TinhDiemTongKetService;
use App\Services\LogService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Database\Eloquent\Collection;
use Carbon\Carbon; // Import Carbon for date manipulation

class LopHocPhanService
{
    protected $logService;
    protected $lichThiService; // Inject LichThiService

    public function __construct(LogService $logService, LichThiService $lichThiService) // Update constructor
    {
        $this->logService = $logService;
        $this->lichThiService = $lichThiService; // Assign injected service
    }

    public function getLopPhanCong($giangVienID)
    {
        return VDanhSachLopGiangVien::where('GiangVienID', $giangVienID)
            ->where('TrangThai', 1)
            ->orderByDesc('TenHocKy')
            ->get()
            ->map(fn($item) => [
                'lop_hoc_phan_id' => $item->LopHocPhanID,
                'ma_lop_hp'       => $item->MaLopHP,
                'ten_mon'         => $item->TenMon ?? 'Chưa có môn',
                'so_tin_chi'      => $item->SoTinChi ?? 0,
                'tiet_lt'         => $item->TietLyThuyet ?? 0,
                'tiet_th'         => $item->TietThucHanh ?? 0,
                'nam_hoc'         => $item->NamHoc ?? 'Chưa có',
                'ten_hoc_ky'      => $item->TenHocKy,
                'so_luong_toi_da' => $item->SoLuongToiDa,
                'so_sinh_vien'    => $currentCount = \App\Models\DangKyHocPhan::where('LopHocPhanID', $item->LopHocPhanID)
                                    ->where('TrangThai', 'ThanhCong')
                                    ->count(),
                'si_so'           => $currentCount . '/' . $item->SoLuongToiDa, 
                'giang_vien'      => [
                    'ho_ten' => $item->TenGiangVien,
                    'hoc_vi' => $item->HocVi,
                ],
            ]);
    }

    public function getSinhVienTrongLop($lopHocPhanID)
    {
        $lop = LopHocPhan::with(['hocKy.namHoc'])->findOrFail($lopHocPhanID);
        $namHoc = $lop->hocKy->namHoc->TenNamHoc ?? 'Chưa có';

        // Truy vấn trực tiếp từ bảng đăng ký kết hợp với bảng sinh viên và bảng điểm
        // Điều này đảm bảo dữ liệu "Sống" và chính xác 100% so với những gì sinh viên thấy
        return DB::table('dangkyhocphan as dk')
            ->join('sinhvien as sv', 'dk.SinhVienID', '=', 'sv.SinhVienID')
            ->leftJoin('diemso as d', 'dk.DangKyID', '=', 'd.DangKyID')
            ->where('dk.LopHocPhanID', $lopHocPhanID)
            ->where('dk.TrangThai', 'ThanhCong')
            ->select([
                'sv.SinhVienID as sinh_vien_id',
                'sv.MaSV as ma_sv',
                'sv.HoTen as ho_ten',
                'sv.Email as email',
                'sv.SoDienThoai as so_dien_thoai',
                'dk.ThoiGianDangKy as thoi_gian_dang_ky',
                'dk.TrangThai as trang_thai',
                'd.DiemChuyenCan as diem_cc',
                'd.DiemGiuaKy as diem_gk',
                'd.DiemThi as diem_thi',
                'd.DiemTongKet as diem_tk',
                'dk.TrangThaiThanhToan as da_thanh_toan_hoc_phi' // Thêm cột này
            ])
            ->orderBy('sv.HoTen', 'asc')
            ->get()
            ->map(function($item) use ($namHoc) {
                $data = (array)$item;
                $data['nam_hoc'] = $namHoc;
                return $data;
            });
    }

    public function getDanhSachIn($lopHocPhanID): array
    {
        $lop = LopHocPhan::with(['monHoc', 'hocKy', 'giangVien'])->findOrFail($lopHocPhanID);
        $sinhVien = $this->getSinhVienTrongLop($lopHocPhanID);

        return [
            'meta' => [
                'ma_lop_hp'   => $lop->MaLopHP,
                'ten_mon'     => $lop->monHoc->TenMon ?? 'N/A',
                'ten_hoc_ky'  => $lop->hocKy->TenHocKy ?? 'N/A',
                'giang_vien'  => $lop->giangVien->HoTen ?? 'N/A',
            ],
            'danh_sach' => $sinhVien,
        ];
    }

    public function capNhatDiemSinhVien(array $data)
    {
        $dangKy = DangKyHocPhan::where('LopHocPhanID', $data['lop_hoc_phan_id'])
            ->where('SinhVienID', $data['sinh_vien_id'])
            ->firstOrFail();

        $userID = Auth::id(); 

        $nhapDiemService = app(NhapDiemService::class);
        
        $dataDiem = [
            'diem_chuyen_can' => $data['diem_chuyen_can'] ?? null,
            'diem_giua_ky'    => $data['diem_giua_ky'] ?? null,
            'diem_thi'        => $data['diem_thi'] ?? null,
        ];

        $resNhapDiem = $nhapDiemService->capNhatDiem(
            $dangKy->DangKyID,
            $dataDiem,
            $userID
        );

        if (!$resNhapDiem['success']) {
            return $resNhapDiem;
        }

        $diemTK = null;
        if (isset($data['diem_thi'])) {
            $tinhDiemService = app(TinhDiemTongKetService::class);
            $tinhDiemService->tinhDiem($dangKy->DangKyID, $userID);

            // Lấy lại điểm tổng kết vừa được procedure tính toán xong
            $diemTK = DB::table('diemso')->where('DangKyID', $dangKy->DangKyID)->value('DiemTongKet');
        }

        return [
            'success' => true,
            'message' => 'Cập nhật điểm thành công và đã tính toán lại tổng kết.',
            'diem_tk' => $diemTK
        ];
    }

    /**
     * Tạo mới lớp học phần
     */
    public function taoLop(array $data): LopHocPhan
    {
        return DB::transaction(function () use ($data) {
            $lop = LopHocPhan::create([
                'MonHocID'     => $data['MonHocID'],
                'HocKyID'      => $data['HocKyID'],
                'GiangVienID'  => $data['GiangVienID'] ?? null,
                'MaLopHP'      => $data['MaLopHP'],
                'SoLuongToiDa' => $data['SoLuongToiDa'] ?? 80,
                'KhoahocAllowed' => $data['KhoahocAllowed'] ?? null,
                'NgayBatDau'   => $data['NgayBatDau'],
                'NgayKetThuc'  => $data['NgayKetThuc'],
                'TrangThai'    => 1,
            ]);

            $this->log('TAO_LOP_HOC_PHAN', "Tạo lớp {$lop->MaLopHP} (ID: {$lop->LopHocPhanID})");

            // --- Logic tự động tạo lịch thi mặc định ---
            try {
                $ngayKetThucHoc = Carbon::parse($lop->NgayKetThuc);
                $ngayThiMacDinh = $ngayKetThucHoc->addWeeks(2); // 2 tuần sau ngày kết thúc học phần

                $defaultLichThi = [
                    [
                        'NgayThi' => $ngayThiMacDinh->toDateString(),
                        'GioBatDau' => '07:30:00',
                        'GioKetThuc' => '09:00:00',
                        'PhongThi' => 'TBD', // To Be Determined - Sẽ được Admin cập nhật sau
                        'HinhThucThi' => 'Tự luận', // Default
                    ]
                ];

                $this->lichThiService->createLichThi([
                    'LopHocPhanID' => $lop->LopHocPhanID,
                    'lich_thi' => $defaultLichThi
                ]);
                $this->log('TAO_LICH_THI_MAC_DINH', "Tạo lịch thi mặc định cho lớp {$lop->MaLopHP} vào ngày {$ngayThiMacDinh->toDateString()}", $lop->LopHocPhanID);
            } catch (\Exception $e) {
                $this->log('LOI_TAO_LICH_THI_MAC_DINH', "Không thể tạo lịch thi mặc định cho lớp {$lop->MaLopHP}: " . $e->getMessage(), $lop->LopHocPhanID);
            }
            // --- Kết thúc logic tự động tạo lịch thi mặc định ---

            return $lop;
        });
    }

    public function capNhat(LopHocPhan $lop, array $data): LopHocPhan
    {
        $lop->update([
            'MaLopHP'      => $data['MaLopHP']      ?? $lop->MaLopHP,
            'SoLuongToiDa' => $data['SoLuongToiDa'] ?? $lop->SoLuongToiDa,
            'KhoahocAllowed' => $data['KhoahocAllowed'] ?? $lop->KhoahocAllowed,
            'NgayBatDau'   => $data['NgayBatDau']   ?? $lop->NgayBatDau,
            'NgayKetThuc'  => $data['NgayKetThuc']  ?? $lop->NgayKetThuc,
        ]);

        $this->log('CAP_NHAT_LOP_HP', "Cập nhật lớp {$lop->MaLopHP}");

        return $lop;
    }

    /**
     * Tự động hủy các lớp không đủ 50% sĩ số sau khi hết hạn đăng ký
     */
    public function xuLyLopThieuSiSo($hocKyID)
    {
        $now = now();

        // 0. Tự động đóng các đợt đăng ký đã quá thời gian kết thúc nhưng vẫn đang để trạng thái Mở (1)
        DB::table('dotdangky')
            ->where('HocKyID', $hocKyID)
            ->where('TrangThai', 1)
            ->where('NgayKetThuc', '<', $now)
            ->update(['TrangThai' => 0]);

        // 1. Kiểm tra xem tất cả các đợt đăng ký của học kỳ này đã kết thúc chưa
        $conDotMo = DB::table('dotdangky')
            ->where('HocKyID', $hocKyID)
            ->where('NgayKetThuc', '>=', $now)
            ->exists();

        // Nếu vẫn còn đợt đăng ký đang mở, chưa thực hiện hủy tự động
        if ($conDotMo) return;

        // 2. Tìm các lớp đang mở (TrangThai = 1) của học kỳ này
        $lops = LopHocPhan::where('HocKyID', $hocKyID)
            ->where('TrangThai', 1)
            ->get();

        foreach ($lops as $lop) {
            $siSoHienTai = DB::table('dangkyhocphan')
                ->where('LopHocPhanID', $lop->LopHocPhanID)
                ->where('TrangThai', 'ThanhCong')
                ->count();

            // Nếu sĩ số < 50% số lượng tối đa
            if ($siSoHienTai < ($lop->SoLuongToiDa * 0.5)) {
                DB::transaction(function () use ($lop, $siSoHienTai) {
                    // Chuyển trạng thái lớp sang Đã hủy (0)
                    $lop->update(['TrangThai' => 0]);

                    // Chuyển tất cả đăng ký của sinh viên trong lớp này sang 'DaHuy'
                    DB::table('dangkyhocphan')
                        ->where('LopHocPhanID', $lop->LopHocPhanID)
                        ->where('TrangThai', 'ThanhCong')
                        ->update(['TrangThai' => 'DaHuy']);

                    $this->log('TU_DONG_HUY_LOP', "Hủy lớp {$lop->MaLopHP} do thiếu sĩ số ({$siSoHienTai}/{$lop->SoLuongToiDa})", $lop->LopHocPhanID);
                });
            }
        }
    }

    public function phanCongGiangVien(LopHocPhan $lop, ?int $giangVienId): LopHocPhan
    {
        if ($giangVienId !== null) {
            GiangVien::findOrFail($giangVienId);
        }

        $lop->update(['GiangVienID' => $giangVienId]);

        $moTa = $giangVienId 
            ? "Phân công GV ID {$giangVienId} cho lớp {$lop->MaLopHP}"
            : "Bỏ phân công giảng viên lớp {$lop->MaLopHP}";

        $this->log('PHAN_CONG_GV', $moTa);

        return $lop;
    }

    public function capNhatSiSo(LopHocPhan $lop, int $siSo): LopHocPhan
    {
        $lop->update(['SoLuongToiDa' => $siSo]);

        $this->log('CAP_NHAT_SISO', "Cập nhật sĩ số lớp {$lop->MaLopHP} → {$siSo}");

        return $lop;
    }

    private function log(string $hanhDong, string $moTa, int $id = null): void
    {
        $this->logService->write($hanhDong, $moTa, 'lophocphan', $id);
    }
}