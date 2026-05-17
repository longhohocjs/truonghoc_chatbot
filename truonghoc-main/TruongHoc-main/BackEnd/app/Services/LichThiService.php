<?php

namespace App\Services;

use App\Models\LichThi;
use App\Models\DangKyHocPhan;
use App\Models\LopHocPhan;
use Exception;
use Illuminate\Support\Facades\DB;

class LichThiService
{
    public function createLichThi(array $data)
    {
        return DB::transaction(function () use ($data) {
            $lopHocPhanID = $data['LopHocPhanID'];
            $lichThiItems = $data['lich_thi'];

            $lop = LopHocPhan::findOrFail($lopHocPhanID);
            $ngayKetThucHoc = \Carbon\Carbon::parse($lop->NgayKetThuc)->startOfDay();

            // Xóa tất cả lịch thi cũ của lớp học phần này trước khi thêm mới (Sync logic)
            LichThi::where('LopHocPhanID', $lopHocPhanID)->delete();

            foreach ($lichThiItems as $item) {
                $ngayThi = \Carbon\Carbon::parse($item['NgayThi'])->copy()->startOfDay();
                
                if ($ngayThi->lte($ngayKetThucHoc)) {
                    throw new Exception("Lỗi: Ngày thi " . $ngayThi->format('d/m/Y') . " phải diễn ra sau ngày kết thúc học phần (" . $ngayKetThucHoc->format('d/m/Y') . ").");
                }

                // Kiểm tra trùng lịch của sinh viên đã đăng ký
                $this->checkTrungLichThi($lopHocPhanID, $item['NgayThi'], $item['GioBatDau'], $item['GioKetThuc']);
                
                // Kiểm tra trùng lịch của giảng viên được phân công
                $this->checkConflictGiangVienThi($lopHocPhanID, $item['NgayThi'], $item['GioBatDau'], $item['GioKetThuc']);

                // Kiểm tra trùng phòng thi toàn hệ thống
                $this->checkRoomConflict($item['NgayThi'], $item['GioBatDau'], $item['GioKetThuc'], $item['PhongThi']);
                
                // Tạo bản ghi mới cho từng buổi thi
                LichThi::create(array_merge($item, ['LopHocPhanID' => $lopHocPhanID]));
            }

            return ['status' => 'success', 'message' => 'Lịch thi đã được cập nhật thành công.'];
        });
    }

    public function updateLichThi($id, array $data)
    {
        $lichThi = LichThi::findOrFail($id);
        $lop = LopHocPhan::findOrFail($lichThi->LopHocPhanID);

        $ngayThi = $data['NgayThi'] ?? $lichThi->NgayThi;
        $gioBD = $data['GioBatDau'] ?? $lichThi->GioBatDau;
        $gioKT = $data['GioKetThuc'] ?? $lichThi->GioKetThuc;
        $phongThi = $data['PhongThi'] ?? $lichThi->PhongThi;
        $hinhThuc = $data['HinhThucThi'] ?? $lichThi->HinhThucThi;

        // 1. Kiểm tra ngày thi phải sau ngày kết thúc môn
        if ($ngayThi) {
            $ngayThiDt = \Carbon\Carbon::parse($ngayThi)->startOfDay();
            $ngayKetThucHoc = \Carbon\Carbon::parse($lop->NgayKetThuc)->startOfDay();
            if ($ngayThiDt->lte($ngayKetThucHoc)) {
                throw new Exception("Lỗi: Ngày thi phải sau ngày kết thúc học phần (" . $ngayKetThucHoc->format('d/m/Y') . ").");
            }
        }

        $this->checkTrungLichThi($lichThi->LopHocPhanID, $ngayThi, $gioBD, $gioKT, $id);
        $this->checkRoomConflict($ngayThi, $gioBD, $gioKT, $phongThi, $id);
        
        $lichThi->update(array_merge($data, [
            'NgayThi'     => $ngayThi,
            'GioBatDau'   => $gioBD,
            'GioKetThuc'  => $gioKT,
            'HinhThucThi' => $hinhThuc,
        ]));

        return $lichThi;
    }

    private function checkTrungLichThi($lopID, $ngayThi, $gioBD, $gioKT, $excludeId = null)
    {
        $sinhVienIds = DangKyHocPhan::where('LopHocPhanID', $lopID)->pluck('SinhVienID');
        if ($sinhVienIds->isEmpty()) return;

        $trung = DB::table('lichthi as lt')
            ->join('dangkyhocphan as dk', 'lt.LopHocPhanID', '=', 'dk.LopHocPhanID')
            ->join('sinhvien as sv', 'dk.SinhVienID', '=', 'sv.SinhVienID')
            ->whereIn('dk.SinhVienID', $sinhVienIds)
            ->where('dk.TrangThai', 'ThanhCong')
            ->where('lt.NgayThi', $ngayThi)
            ->where(function($q) use ($gioBD, $gioKT) {
                $q->where('lt.GioBatDau', '<', $gioKT)
                  ->where('lt.GioKetThuc', '>', $gioBD);
            })
            ->select('sv.MaSV', 'sv.HoTen')
            ->distinct();

        if ($excludeId) {
            $trung->where('lt.LichThiID', '!=', $excludeId);
        } else {
            $trung->where('lt.LopHocPhanID', '!=', $lopID);
        }

        $listTrung = $trung->get();

        if ($listTrung->isNotEmpty()) {
            $details = $listTrung->map(fn($s) => "{$s->HoTen} ({$s->MaSV})")->implode(', ');
            throw new Exception("Trùng lịch thi! Các sinh viên sau đã có lịch thi khác: " . $details);
        }
    }

    private function checkRoomConflict($ngayThi, $gioBD, $gioKT, $phongThi, $excludeId = null)
    {
        // Bỏ qua kiểm tra nếu phòng thi chưa được bố trí (TBD)
        if (empty($phongThi) || strtoupper($phongThi) === 'TBD') return;

        $query = DB::table('lichthi')
            ->where('NgayThi', $ngayThi)
            ->where('PhongThi', $phongThi)
            ->where(function($q) use ($gioBD, $gioKT) {
                $q->where('GioBatDau', '<', $gioKT)
                  ->where('GioKetThuc', '>', $gioBD);
            });

        if ($excludeId) $query->where('LichThiID', '!=', $excludeId);

        if ($query->exists()) {
            throw new Exception("Phòng thi {$phongThi} đã được sử dụng cho một lớp khác trong khung giờ này!");
        }
    }

    private function checkConflictGiangVienThi($lopID, $ngayThi, $gioBD, $gioKT)
    {
        $lop = \App\Models\LopHocPhan::find($lopID);
        if (!$lop || !$lop->GiangVienID) return;

        $trung = DB::table('lichthi as lt')
            ->join('lophocphan as lhp', 'lt.LopHocPhanID', '=', 'lhp.LopHocPhanID')
            ->where('lhp.GiangVienID', $lop->GiangVienID)
            ->where('lt.NgayThi', $ngayThi)
            ->where(function($q) use ($gioBD, $gioKT) {
                $q->where('lt.GioBatDau', '<', $gioKT)
                  ->where('lt.GioKetThuc', '>', $gioBD);
            })
            ->where('lt.LopHocPhanID', '!=', $lopID)
            ->exists();

        if ($trung) {
            $goiY = $this->getAvailableGiangViens($ngayThi, $gioBD, $gioKT, $lop->monHoc->KhoaID);
            $names = collect($goiY)->pluck('HoTen')->implode(', ');
            throw new Exception("Giảng viên bị trùng lịch thi! Gợi ý GV đang rảnh: " . ($names ?: "Không có ai"));
        }
    }

    public function getAvailableGiangViens($ngayThi, $gioBD, $gioKT, $khoaID = null)
    {
        // Lấy danh sách GV thuộc khoa (nếu có)
        $query = \App\Models\GiangVien::query();
        if ($khoaID) $query->where('KhoaID', $khoaID);
        
        $allGV = $query->get();

        return $allGV->filter(function($gv) use ($ngayThi, $gioBD, $gioKT) {
            // 1. Kiểm tra không có lịch dạy (lichhoc) trùng vào giờ đó
            // Lưu ý: Cần logic chuyển đổi Giờ thi sang Tiết học để so sánh chính xác hơn 
            // Ở đây tạm thời kiểm tra trùng lichthi khác
            $hasExamConflict = DB::table('lichthi as lt')
                ->join('lophocphan as lhp', 'lt.LopHocPhanID', '=', 'lhp.LopHocPhanID')
                ->where('lhp.GiangVienID', $gv->GiangVienID)
                ->where('lt.NgayThi', $ngayThi)
                ->where(function($q) use ($gioBD, $gioKT) {
                    $q->where('lt.GioBatDau', '<', $gioKT)
                      ->where('lt.GioKetThuc', '>', $gioBD);
                })->exists();

            return !$hasExamConflict;
        })->values()->take(5); // Lấy 5 người đầu tiên
    }
}