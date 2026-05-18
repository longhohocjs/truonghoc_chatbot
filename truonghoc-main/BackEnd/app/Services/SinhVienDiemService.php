<?php
namespace App\Services;

class SinhVienDiemService {
    public function getBangDiemTongHop($user) {
        return $user->sinhVien->dangKyHocPhan()
            ->where('TrangThai', 'ThanhCong')
            ->with(['lopHocPhan.monHoc', 'lopHocPhan.hocKy', 'diemSo'])
            ->get();
    }

    public function tinhGPAHe4($danhSachDiem) {
        $tongDiemHe4 = 0;
        $tongTinChi = 0;
        foreach ($danhSachDiem as $item) {
            if ($item->diemSo && $item->lopHocPhan->monHoc) {
                $tinChi = $item->lopHocPhan->monHoc->SoTinChi;
                $tongDiemHe4 += ($item->diemSo->diem_he_4 * $tinChi);
                $tongTinChi += $tinChi;
            }
        }
        return $tongTinChi > 0 ? round($tongDiemHe4 / $tongTinChi, 2) : 0;
    }
}