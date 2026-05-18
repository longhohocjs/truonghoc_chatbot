<?php

namespace App\Services;

use App\Models\LichHoc;
use App\Models\LopHocPhan;
use App\Models\DangKyHocPhan;
use App\Models\HocKy;
use Exception;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon; // Import Carbon for date handling

class LichHocService
{
    public function getDanhSachLopTheoKy($namHocId = null, $hocKyId = null)
    {
        $query = LopHocPhan::with(['monHoc', 'lichHoc', 'hocKy.namHoc']);

        if (!$hocKyId && !$namHocId) {
            $latestHocKy = HocKy::orderBy('HocKyID', 'desc')->first();
            $hocKyId = $latestHocKy ? $latestHocKy->HocKyID : null;
        }

        if ($hocKyId) {
            $query->where('HocKyID', $hocKyId);
        }

        if ($namHocId) {
            $query->whereHas('hocKy', function($q) use ($namHocId) {
                $q->where('NamHocID', $namHocId);
            });
        }

        return $query->get();
    }

    public function createLichHoc(array $data)
    {
        $lopHocPhanID = $data['LopHocPhanID'];
        $lichHocItems = $data['lich_hoc'];

        // Lấy thông tin lớp học phần để xác định ngày bắt đầu và kết thúc
        $lopHocPhan = LopHocPhan::findOrFail($lopHocPhanID);
        $lopNgayBatDau = Carbon::parse($lopHocPhan->NgayBatDau);
        $lopNgayKetThuc = Carbon::parse($lopHocPhan->NgayKetThuc);

        return DB::transaction(function () use ($lopHocPhanID, $lichHocItems, $lopNgayBatDau, $lopNgayKetThuc, $lopHocPhan) {
            // Xóa tất cả lịch học cũ của lớp học phần này trước khi thêm mới (Sync logic)
            LichHoc::where('LopHocPhanID', $lopHocPhanID)->delete();

            foreach ($lichHocItems as $item) {
                $dayOfWeekFrontend = $item['NgayHoc']; // Thứ từ Frontend (2-8)

                // Chuyển đổi thứ sang định dạng Carbon (0=Chủ Nhật, 1=Thứ 2)
                $carbonDayOfWeek = ($dayOfWeekFrontend == 8) ? Carbon::SUNDAY : ($dayOfWeekFrontend - 1);

                // Tìm ngày đầu tiên của thứ này trong kỳ
                $dateToSave = $lopNgayBatDau->copy();
                while ($dateToSave->dayOfWeek !== $carbonDayOfWeek) {
                    $dateToSave->addDay();
                }

                // Lặp qua từng tuần cho đến ngày kết thúc
                while ($dateToSave->lte($lopNgayKetThuc)) {
                    // 1. Kiểm tra trùng lịch sinh viên (những người đã đăng ký lớp này)
                    $this->checkTrungLichSinhVien(
                        $lopHocPhanID,
                        $dateToSave->toDateString(),
                        $item['TietBatDau'],
                        $item['SoTiet']
                    );

                    // 2. Kiểm tra trùng lịch giảng viên (người phụ trách lớp này)
                    $this->checkTrungLichGiangVien(
                        $lopHocPhan->GiangVienID,
                        $dateToSave->toDateString(),
                        $item['TietBatDau'],
                        $item['SoTiet']
                    );

                    // Lưu bản ghi (Lưu ý: NgayHoc trong mảng $item sẽ bị ghi đè bởi ngày cụ thể)
                    LichHoc::create([
                        'LopHocPhanID' => $lopHocPhanID,
                        'NgayHoc'      => $dateToSave->toDateString(),
                        'Thu'          => $dayOfWeekFrontend,
                        'TietBatDau'   => $item['TietBatDau'],
                        'SoTiet'       => $item['SoTiet'],
                        'PhongHoc'     => $item['PhongHoc'],
                        'BuoiHoc'      => $item['BuoiHoc'] ?? ((int)$item['TietBatDau'] <= 6 ? "Sáng" : "Chiều")
                    ]);

                    $dateToSave->addWeek();
                }
            }
            return ['message' => 'Lịch học đã được cập nhật thành công.'];
        });
    }

    public function updateLichHoc($id, array $data)
    {
        $lich = LichHoc::findOrFail($id);
        $this->checkTrungLichSinhVien($lich->LopHocPhanID, $data['NgayHoc'], $data['TietBatDau'], $data['SoTiet'], $id);
        $lich->update($data);
        return $lich;
    }

    private function checkTrungLichSinhVien($lopID, $ngayHoc, $tietBD, $soTiet, $excludeId = null)
    {
        $tietKT = $tietBD + $soTiet - 1;
        $sinhVienIds = DangKyHocPhan::where('LopHocPhanID', $lopID)->pluck('SinhVienID');

        if ($sinhVienIds->isEmpty()) return;

        $trungLich = DB::table('lichhoc as lh')
            ->join('dangkyhocphan as dk', 'lh.LopHocPhanID', '=', 'dk.LopHocPhanID')
            ->whereIn('dk.SinhVienID', $sinhVienIds)
            ->where('lh.NgayHoc', $ngayHoc) // $ngayHoc giờ đây là chuỗi ngày tháng
            ->where(function($q) use ($tietBD, $tietKT) {
                $q->whereBetween('lh.TietBatDau', [$tietBD, $tietKT])
                  ->orWhereRaw('? BETWEEN lh.TietBatDau AND (lh.TietBatDau + lh.SoTiet - 1)', [$tietBD]);
            });

        if ($excludeId) {
            $trungLich->where('lh.LichHocID', '!=', $excludeId);
        } else {
            $trungLich->where('lh.LopHocPhanID', '!=', $lopID);
        }

        if ($trungLich->exists()) {
            throw new Exception("Trùng lịch học của sinh viên đã đăng ký lớp này!");
        }
    }

    private function checkTrungLichGiangVien($gvID, $ngayHoc, $tietBD, $soTiet, $excludeLopId = null)
    {
        if (!$gvID) return;
        $tietKT = $tietBD + $soTiet - 1;

        // Kiểm tra trong bảng lịch học
        $trungLichHoc = DB::table('lichhoc as lh')
            ->join('lophocphan as lhp', 'lh.LopHocPhanID', '=', 'lhp.LopHocPhanID')
            ->where('lhp.GiangVienID', $gvID)
            ->where('lh.NgayHoc', $ngayHoc)
            ->where(function($q) use ($tietBD, $tietKT) {
                $q->whereBetween('lh.TietBatDau', [$tietBD, $tietKT])
                  ->orWhereRaw('? BETWEEN lh.TietBatDau AND (lh.TietBatDau + lh.SoTiet - 1)', [$tietBD]);
            });

        if ($excludeLopId) {
            $trungLichHoc->where('lh.LopHocPhanID', '!=', $excludeLopId);
        }

        if ($trungLichHoc->exists()) {
            $info = $trungLichHoc->first();
            throw new Exception("Giảng viên đã có lịch dạy lớp khác vào ngày {$ngayHoc} (Tiết {$info->TietBatDau})!");
        }
    }
}