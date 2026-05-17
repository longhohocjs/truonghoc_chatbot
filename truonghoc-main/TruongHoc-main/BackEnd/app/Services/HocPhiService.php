<?php

namespace App\Services;

use App\Models\DangKyHocPhan;
use App\Models\DotDangKy;
use App\Services\LopHocPhanService;
use Illuminate\Support\Facades\DB;

class HocPhiService
{
    // Định mức học phí theo tiết học (VND)
    const DON_GIA_LT = 35000; // Đơn giá 1 tiết Lý thuyết
    const DON_GIA_TH = 25000; // Đơn giá 1 tiết Thực hành (Thực tập/Đồ án cũng tính vào đây)

    public function getHocPhiHienTai($sinhVienID)
    {
        $sinhVien = \App\Models\SinhVien::find($sinhVienID);
        if (!$sinhVien) return null;

        // 1. Lấy đợt đăng ký/học kỳ hiện tại
        $dot = DotDangKy::where('TrangThai', 1)->orderByDesc('NgayKetThuc')->first();
        
        if (!$dot) {
            return [
                'ma_sv' => $sinhVien->MaSV ?? '',
                'hoc_ky' => 'Chưa có đợt mở',
                'don_gia_lt' => self::DON_GIA_LT,
                'don_gia_th' => self::DON_GIA_TH,
                'chi_tiet' => [],
                'is_locked' => false
            ];
        }

        // Tự động kiểm tra và hủy các lớp không đủ sĩ số trước khi tính toán học phí
        app(LopHocPhanService::class)->xuLyLopThieuSiSo($dot->HocKyID);

        $hanNop = $dot->HanNopHocPhi ? \Carbon\Carbon::parse($dot->HanNopHocPhi) : \Carbon\Carbon::parse($dot->NgayKetThuc)->addDays(7);

        // 2. Lấy danh sách các môn đã đăng ký thành công trong học kỳ này
        $danhSachMon = DangKyHocPhan::where('SinhVienID', $sinhVienID)
            ->where('TrangThai', 'ThanhCong')
            ->whereHas('lopHocPhan', function ($q) use ($dot) {
                $q->where('HocKyID', $dot->HocKyID);
            })
            ->with('lopHocPhan.monHoc')
            ->get();

        $tongTinChi = 0;
        $tongTien = 0;
        $allPaid = true;
        
        $chiTiet = $danhSachMon->map(function ($dk) use (&$tongTinChi, &$allPaid, &$tongTien) {
            $mon = $dk->lopHocPhan->monHoc;
            $tinChi = $mon->SoTinChi ?? 0;
            $tietLT = $mon->TietLyThuyet ?? 0;
            $tietTH = $mon->TietThucHanh ?? 0;

            // Công thức tính: (Số tiết LT * Đơn giá LT) + (Số tiết TH * Đơn giá TH)
            $thanhTien = ($tietLT * self::DON_GIA_LT) + ($tietTH * self::DON_GIA_TH);

            $tongTinChi += $tinChi;
            $tongTien += $thanhTien;

            if (!$dk->TrangThaiThanhToan) $allPaid = false;
            
            return [
                'ma_mon' => $mon->MaMon,
                'ten_mon' => $mon->TenMon,
                'loai_mon' => $mon->LoaiMonHoc,
                'so_tin_chi' => $tinChi,
                'tiet_lt' => $tietLT,
                'tiet_th' => $tietTH,
                'thanh_tien' => $thanhTien,
                'ngay_dang_ky' => $dk->ThoiGianDangKy,
                'da_thanh_toan' => (bool)$dk->TrangThaiThanhToan
            ];
        });

        // Logic khóa: Nếu quá hạn nộp và chưa thanh toán xong hết
        $isOverdue = now()->greaterThan($hanNop);
        $isLocked = $isOverdue && !$allPaid;

        return [
            'ma_sv' => $sinhVien->MaSV ?? '',
            'hoc_ky' => $dot->TenDot,
            'don_gia_lt' => self::DON_GIA_LT,
            'don_gia_th' => self::DON_GIA_TH,
            'tong_tin_chi' => $tongTinChi,
            'tong_tien' => $tongTien,
            'trang_thai_thanh_toan' => $allPaid,
            'han_nop' => $hanNop->format('Y-m-d'),
            'is_locked' => $isLocked,
            'chi_tiet' => $chiTiet
        ];
    }
}