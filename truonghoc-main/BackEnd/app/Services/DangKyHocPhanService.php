<?php

namespace App\Services;

use App\Models\LopHocPhan;
use App\Models\DangKyHocPhan;
use App\Models\ChuongTrinhDaoTao;
use App\Models\DotDangKy;
use App\Models\SinhVien;
use Exception;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class DangKyHocPhanService
{
    public function validateAll(SinhVien $sinhVien, int $lopHocPhanID): array
    {
        try {
            $lop = LopHocPhan::with([
                'monHoc.monTienQuyet' => fn($q) => $q->wherePivot('Loai', 1),
                'monHoc.monSongHanh' => fn($q) => $q->wherePivot('Loai', 2),
                'lichHoc',
                'lichThi',
                'hocKy'
            ])->findOrFail($lopHocPhanID);
        } catch (\Exception $e) {
            Log::error("Lỗi khi tải thông tin lớp học phần và các quan hệ (LopHocPhanID: {$lopHocPhanID}): " . $e->getMessage() . " Stack: " . $e->getTraceAsString());
            throw new \Exception("Không thể tải thông tin lớp học phần (ID: {$lopHocPhanID}). Vui lòng kiểm tra cấu hình hoặc dữ liệu. Chi tiết: " . $e->getMessage());
        }

        $dot = DotDangKy::where('HocKyID', $lop->HocKyID)
            ->where('TrangThai', 1)
            ->first();

        if (!$dot || !$dot->isOpening()) {
            throw new Exception('Hiện tại không trong thời gian đăng ký học phần cho học kỳ này.');
        }

        if ($lop->TrangThai === 0) {
            throw new Exception('Lớp học phần này đã bị hủy và không thể đăng ký.');
        }

        if ($this->daDangKyMonTrongHocKy($sinhVien->SinhVienID, $lop->MonHocID, $lop->HocKyID)) {
            throw new Exception('Bạn đã đăng ký một lớp khác của môn học này trong học kỳ hiện tại.');
        }

        if (!$this->checkSiSo($lop)) {
            throw new Exception('Lớp học phần đã đầy sĩ số.');
        }

        $missingTienQuyet = $this->getMissingTienQuyet($sinhVien->SinhVienID, $lop->monHoc);
        if (!empty($missingTienQuyet)) {
            throw new Exception('Bạn chưa hoàn thành các môn tiên quyết bắt buộc: ' . implode(', ', $missingTienQuyet));
        }

        $missingSongHanh = $this->getMissingSongHanh($sinhVien->SinhVienID, $lop->monHoc);
        if (!empty($missingSongHanh)) {
            throw new Exception('Bạn cần phải đăng ký (hoặc đã học) các môn song hành: ' . implode(', ', $missingSongHanh));
        }

        if ($this->checkTrungLich($sinhVien, $lop)) {
            throw new Exception('Lịch học hoặc lịch thi bị trùng với lớp đã đăng ký.');
        }
        
        if ($lop->KhoahocAllowed !== null) {
            $allowed = explode(',', str_replace(' ', '', $lop->KhoahocAllowed));
            if (!in_array($sinhVien->khoahoc, $allowed)) {
                throw new Exception('Lớp học phần này không dành cho khóa ' . $sinhVien->khoahoc . ' của bạn.');
            }
        }

        return [
            'success' => true,
            'message' => 'Validate đăng ký thành công, có thể tiến hành đăng ký.',
        ];
    }

    private function daDangKyMonTrongHocKy(int $sinhVienID, int $monHocID, int $hocKyID): bool
    {
        // Thay thế việc dùng View bằng truy vấn trực tiếp vào bảng đăng ký và lớp học phần
        return DangKyHocPhan::where('SinhVienID', $sinhVienID)
            ->where('TrangThai', 'ThanhCong')
            ->whereHas('lopHocPhan', function ($q) use ($monHocID, $hocKyID) {
                $q->where('MonHocID', $monHocID)
                  ->where('HocKyID', $hocKyID);
            })
            ->exists();
    }

    private function checkSiSo(LopHocPhan $lop): bool
    {
        $daDangKy = $lop->dangKyHocPhan()->where('TrangThai', 'ThanhCong')->count();
        return $daDangKy < $lop->SoLuongToiDa;
    }

    private function getMissingTienQuyet(int $sinhVienID, $monHoc): array
    {
        $tienQuyet = $monHoc->monTienQuyet;
        if ($tienQuyet->isEmpty()) {
            return [];
        }

        $tienQuyetIDs = $tienQuyet->pluck('MonHocID')->toArray();

        // Lấy danh sách ID các môn tiên quyết mà sinh viên đã đạt (điểm >= 4.0)
        $passedIDs = DB::table('dangkyhocphan')
            ->join('lophocphan', 'dangkyhocphan.LopHocPhanID', '=', 'lophocphan.LopHocPhanID')
            ->join('diemso', 'dangkyhocphan.DangKyID', '=', 'diemso.DangKyID')
            ->where('dangkyhocphan.SinhVienID', $sinhVienID)
            ->whereIn('lophocphan.MonHocID', $tienQuyetIDs)
            ->where('diemso.DiemTongKet', '>=', 4.0)
            ->pluck('lophocphan.MonHocID')
            ->toArray();

        // Lọc ra những môn nằm trong danh sách tiên quyết nhưng chưa nằm trong danh sách đã đạt
        $missing = $tienQuyet->filter(fn($m) => !in_array($m->MonHocID, $passedIDs));

        return $missing->map(fn($m) => "{$m->TenMon} ({$m->MaMon})")->toArray();
    }

    private function getMissingSongHanh(int $sinhVienID, $monHoc): array
    {
        $songHanh = $monHoc->monSongHanh;
        if ($songHanh->isEmpty()) {
            return [];
        }

        $songHanhIDs = $songHanh->pluck('MonHocID')->toArray();

        // Kiểm tra xem sinh viên đã đăng ký các môn song hành này chưa (trong bất kỳ học kỳ nào)
        $registeredIDs = DangKyHocPhan::join('lophocphan', 'dangkyhocphan.LopHocPhanID', '=', 'lophocphan.LopHocPhanID')
            ->where('dangkyhocphan.SinhVienID', $sinhVienID)
            ->where('dangkyhocphan.TrangThai', 'ThanhCong')
            ->whereIn('lophocphan.MonHocID', $songHanhIDs)
            ->pluck('lophocphan.MonHocID')
            ->toArray();

        $missing = $songHanh->filter(fn($m) => !in_array($m->MonHocID, $registeredIDs));

        return $missing->map(fn($m) => "{$m->TenMon} ({$m->MaMon})")->toArray();
    }

    private function checkTrungLich(SinhVien $sinhVien, LopHocPhan $lopMoi): bool
    {
        $lichHocMoi = $lopMoi->lichHoc;
        if ($lichHocMoi->isEmpty()) return false;

        // Kiểm tra trùng lịch học bằng 1 truy vấn SQL duy nhất
        $existsLichHoc = DB::table('lichhoc as lh_cu')
            ->join('dangkyhocphan as dk', 'lh_cu.LopHocPhanID', '=', 'dk.LopHocPhanID')
            ->where('dk.SinhVienID', '=', $sinhVien->SinhVienID)
            ->where('dk.TrangThai', '=', 'ThanhCong')
            ->where(function ($query) use ($lichHocMoi) {
                foreach ($lichHocMoi as $lm) {
                    $query->orWhere(function ($sub) use ($lm) {
                        $tietKT = $lm->TietBatDau + $lm->SoTiet - 1;
                        $sub->where('lh_cu.NgayHoc', $lm->NgayHoc)
                            ->where(function ($inner) use ($lm, $tietKT) {
                                $inner->whereRaw('? BETWEEN lh_cu.TietBatDau AND (lh_cu.TietBatDau + lh_cu.SoTiet - 1)', [$lm->TietBatDau])
                                      ->orWhereRaw('lh_cu.TietBatDau BETWEEN ? AND ?', [$lm->TietBatDau, $tietKT]);
                            });
                    });
                }
            })->exists();

        if ($existsLichHoc) return true;

        // Kiểm tra trùng lịch thi
        $lichThiMoi = $lopMoi->lichThi;
        if ($lichThiMoi->isEmpty()) return false;

        foreach ($lichThiMoi as $ltMoi) {
            $existsLichThi = DB::table('lichthi as lt_cu')
                ->join('dangkyhocphan as dk', 'lt_cu.LopHocPhanID', '=', 'dk.LopHocPhanID')
                ->where('dk.SinhVienID', '=', $sinhVien->SinhVienID)
                ->where('dk.TrangThai', '=', 'ThanhCong')
                ->where('lt_cu.NgayThi', $ltMoi->NgayThi)
                ->where('lt_cu.LopHocPhanID', '!=', $lopMoi->LopHocPhanID)
                ->where(function ($q) use ($ltMoi) {
                    $q->where('lt_cu.GioBatDau', '<', $ltMoi->GioKetThuc)
                      ->where('lt_cu.GioKetThuc', '>', $ltMoi->GioBatDau);
                })->exists();

            if ($existsLichThi) return true;
        }

        return false;
    }

    private function trungLich($lh1, $lh2): bool
    {
        if ($lh1->NgayHoc !== $lh2->NgayHoc) {
            return false;
        }

        $tietBD1 = $lh1->TietBatDau;
        $tietKT1 = $tietBD1 + $lh1->SoTiet - 1;

        $tietBD2 = $lh2->TietBatDau;
        $tietKT2 = $tietBD2 + $lh2->SoTiet - 1;

        return !($tietKT1 < $tietBD2 || $tietKT2 < $tietBD1);
    }

    private function trungLichThi($lt1, $lt2): bool
    {
        if ($lt1->NgayThi !== $lt2->NgayThi) {
            return false;
        }

        $start1 = strtotime($lt1->GioBatDau);
        $end1   = strtotime($lt1->GioKetThuc);
        $start2 = strtotime($lt2->GioBatDau);
        $end2   = strtotime($lt2->GioKetThuc);

        if ($start1 === false || $end1 === false || $start2 === false || $end2 === false) {
            return false;
        }

        return !($end1 <= $start2 || $end2 <= $start1);
    }

    private function getCaThi(string $gioBatDau): ?int
    {
        $hour = (int) explode(':', $gioBatDau)[0];
        if ($hour >= 7 && $hour < 10) return 1;
        if ($hour >= 10 && $hour < 13) return 2;
        if ($hour >= 13 && $hour < 16) return 3;
        if ($hour >= 16) return 4;
        return null;
    }
}