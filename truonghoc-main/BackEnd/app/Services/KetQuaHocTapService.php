<?php

namespace App\Services;

use App\Models\DangKyHocPhan;
use App\Models\User;
use App\Models\View\VGpaHocKy;

class KetQuaHocTapService
{
    public function getKetQuaTongHop($user, $hocKyId = null): array
    {
        $sv = $user->sinhVien;
        if (!$sv) {
            return ['success' => false, 'data' => null, 'message' => 'Không tìm thấy sinh viên'];
        }

        // Kiểm tra logic nợ học phí để chặn quyền lợi học tập
        $hocPhiService = app(\App\Services\HocPhiService::class);
        $hocPhiStatus = $hocPhiService->getHocPhiHienTai($sv->SinhVienID);
        
        if ($hocPhiStatus && ($hocPhiStatus['is_locked'] ?? false)) {
            return [
                'success' => false,
                'data' => [
                    'is_locked' => true,
                    'han_nop'   => $hocPhiStatus['han_nop']
                ],
                'message' => 'Tài khoản của bạn đã bị khóa chức năng xem điểm do quá hạn nộp học phí.'
            ];
        }

        // Sử dụng DangKyHocPhan model để đảm bảo cột TrangThai tồn tại
        $query = DangKyHocPhan::where('SinhVienID', $sv->SinhVienID)
            ->where('TrangThai', 'ThanhCong')
            // Chỉ hiện các môn đã hoàn thành nghĩa vụ học phí
            ->where('TrangThaiThanhToan', 1)
            ->with(['lopHocPhan.monHoc', 'lopHocPhan.hocKy', 'lopHocPhan.giangVien', 'diemSo']);

        if ($hocKyId) {
            $query->whereHas('lopHocPhan', fn($q) => $q->where('HocKyID', $hocKyId));
        }

        $diemChiTiet = $query->get()->map(function($item) {
            $diem10 = $item->diemSo->DiemTongKet ?? $item->diemSo->diem_tong_ket ?? null;
            $info4 = $this->quyDoiHe4($diem10);
            
            return [
                'ten_hoc_ky'   => $item->lopHocPhan->hocKy->TenHocKy ?? 'N/A',
                'ma_mon'       => $item->lopHocPhan->monHoc->MaMon ?? 'N/A',
                'ten_mon'      => $item->lopHocPhan->monHoc->TenMon ?? 'N/A',
                'so_tin_chi'   => $item->lopHocPhan->monHoc->SoTinChi ?? 0,
                'giang_vien'   => $item->lopHocPhan->giangVien->HoTen ?? 'N/A',
                'tiet_lt'      => $item->lopHocPhan->monHoc->TietLyThuyet ?? 0,
                'tiet_th'      => $item->lopHocPhan->monHoc->TietThucHanh ?? 0,
                'diem_cc'      => $item->diemSo->DiemChuyenCan ?? $item->diemSo->diem_chuyen_can ?? null,
                'diem_gk'      => $item->diemSo->DiemGiuaKy ?? $item->diemSo->diem_giua_ky ?? null,
                'diem_thi'     => $item->diemSo->DiemThi ?? $item->diemSo->diem_thi ?? null,
                'diem_tk'      => $diem10,
                'diem_chu'     => $info4['chu'],
                'diem_he_4'    => $info4['so'],
            ];
        });

        // Đối với GPA, ta vẫn dùng View nhưng bọc trong try-catch để tránh crash nếu View lỗi
        try {
            $gpa = VGpaHocKy::where('SinhVienID', $sv->SinhVienID)
                ->when($hocKyId, fn($q) => $q->where('HocKyID', $hocKyId))
                ->orderBy('HocKyID', 'desc')
                ->first();
        } catch (\Exception $e) {
            $gpa = null;
        }

        return [
            'success' => true,
            'data'    => [
                'diem_chi_tiet' => $diemChiTiet,
                'gpa_hoc_ky'    => $gpa ? [
                    'ten_hoc_ky'     => $gpa->TenHocKy,
                    'so_mon'         => $gpa->SoMon,
                    'tong_tin_chi'   => $gpa->TongTinChi,
                    'gpa'            => round((float)($gpa->GPA_HocKy_TamTinh ?? 0), 2),
                    'gpa_he_4'       => $this->tinhGpaHe4($diemChiTiet),
                ] : null,
            ],
            'message' => 'Lấy kết quả học tập thành công',
        ];
    }

    private function quyDoiHe4($diem) {
        if ($diem === null) return ['chu' => '-', 'so' => 0];
        if ($diem >= 8.5) return ['chu' => 'A', 'so' => 4.0];
        if ($diem >= 7.0) return ['chu' => 'B', 'so' => 3.0];
        if ($diem >= 5.5) return ['chu' => 'C', 'so' => 2.0];
        if ($diem >= 4.0) return ['chu' => 'D', 'so' => 1.0];
        return ['chu' => 'F', 'so' => 0.0];
    }

    private function tinhGpaHe4($dsDiem) {
        $tongDiemHe4 = 0;
        $tongTinChi = 0;
        foreach ($dsDiem as $d) {
            $tongDiemHe4 += ($d['diem_he_4'] * $d['so_tin_chi']);
            $tongTinChi += $d['so_tin_chi'];
        }
        return $tongTinChi > 0 ? round($tongDiemHe4 / $tongTinChi, 2) : 0;
    }
}