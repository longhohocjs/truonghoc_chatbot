<?php

namespace App\Services;

use App\Models\LopSinhHoat;
use App\Models\DiemRenLuyen;
use App\Models\View\VSinhVienLopSinhHoat;
use App\Models\HeThongLog;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class LopSinhHoatService
{
    public function taoLopSinhHoat(array $data)
    {
        return \App\Models\LopSinhHoat::create([
            'MaLop'       => $data['MaLop'],
            'TenLop'      => $data['TenLop'],
            'KhoaID'      => $data['KhoaID'],
            'GiangVienID' => $data['GiangVienID'] ?? null,
            'NamNhapHoc'  => $data['NamNhapHoc']
        ]);
    }

    public function filterLopSinhHoat(array $filters)
    {
        $query = \App\Models\LopSinhHoat::with(['khoa', 'coVanHocTap']);

        if (isset($filters['KhoaID'])) {
            $query->where('KhoaID', $filters['KhoaID']);
        }

        if (isset($filters['NamNhapHoc'])) {
            $query->where('NamNhapHoc', $filters['NamNhapHoc']);
        }

        return $query->get();
    }

    public function phanCongCoVan($lopID, $giangVienID)
    {
        $lop = \App\Models\LopSinhHoat::findOrFail($lopID);
        $lop->update(['GiangVienID' => $giangVienID]);
        return $lop;
    }

    public function themSinhVienVaoLop($lopID, array $sinhVienID)
    {
        return \App\Models\SinhVien::whereIn('SinhVienID', $sinhVienID)
            ->update(['LopSinhHoatID' => $lopID]);
    }

    public function xoaSinhVienKhoiLop($sinhVienID)
    {
        $sinhVien = \App\Models\SinhVien::findOrFail($sinhVienID);
        return $sinhVien->update(['LopSinhHoatID' => null]);
    }

    public function layDanhSachLopTongQuat($filters)
    {
        $query = \App\Models\LopSinhHoat::with(['khoa', 'coVanHocTap']);

        if (!empty($filters['KhoaID'])) {
            $query->where('KhoaID', $filters['KhoaID']);
        }

        if (!empty($filters['NamNhapHoc'])) {
            $query->where('NamNhapHoc', $filters['NamNhapHoc']);
        }

        return $query->get();
    }

    public function getLopSinhHoatPhanCong($giangVienID)
    {
        return LopSinhHoat::where('GiangVienID', $giangVienID)
            ->with(['khoa'])
            ->orderByDesc('NamNhapHoc')
            ->get()
            ->map(function ($lop) {
                $siSo = VSinhVienLopSinhHoat::where('LopSinhHoatID', $lop->LopSinhHoatID)->count();

                return [
                    'lop_sinh_hoat_id' => $lop->LopSinhHoatID,
                    'ma_lop'           => $lop->MaLop,
                    'ten_lop'          => $lop->TenLop,
                    'nam_nhap_hoc'     => $lop->NamNhapHoc,
                    'ten_khoa'         => $lop->khoa->TenKhoa ?? 'N/A',
                    'si_so'            => $siSo,
                    'created_at'       => $lop->created_at?->format('d/m/Y'),
                ];
            });
    }

    public function getSinhVienTrongLopSinhHoat($lopSinhHoatID)
    {
        return DB::table('v_sinhvien_lop_sinh_hoat')
            ->where('LopSinhHoatID', $lopSinhHoatID)
            ->orderBy('HoTen')
            ->get()
            ->map(function ($sv) {
                $ngaySinh = $sv->NgaySinh ? Carbon::parse($sv->NgaySinh)->format('d/m/Y') : null;

                return [
                    'sinh_vien_id'   => $sv->SinhVienID,
                    'ma_sv'          => $sv->MaSV,
                    'ho_ten'         => $sv->HoTen,
                    'ngay_sinh'      => $ngaySinh,
                    'email'          => $sv->Email ?? 'Chưa cập nhật',
                    'so_dien_thoai'  => $sv->SoDienThoai ?? 'Chưa cập nhật',
                ];
            });
    }

    public function getDiemRenLuyenTrongLop($lopSinhHoatID, $hocKyID = null, $namHocID = null)
    {
        $query = DB::table('v_sinhvien_lop_sinh_hoat AS v')
            ->where('v.LopSinhHoatID', $lopSinhHoatID);

        if ($hocKyID || $namHocID) {
            $query->leftJoin('diemrenluyen AS dr', function ($join) use ($hocKyID, $namHocID) {
                $join->on('dr.SinhVienID', '=', 'v.SinhVienID');

                if ($hocKyID) {
                    $join->where('dr.HocKyID', '=', $hocKyID);
                }

                if ($namHocID) {
                    $join->join('hocky AS hk', 'dr.HocKyID', '=', 'hk.HocKyID')
                         ->where('hk.NamHocID', '=', $namHocID);
                }
            })
            ->select([
                'v.SinhVienID',
                'v.MaSV',
                'v.HoTen',
                'dr.HocKyID',
                'dr.TongDiem',
                'dr.XepLoai',
                DB::raw("DATE_FORMAT(dr.NgayDanhGia, '%d/%m/%Y') as NgayDanhGia"),
            ]);
        } else {
            $query->leftJoin('diemrenluyen AS dr', function ($join) {
                $join->on('dr.SinhVienID', '=', 'v.SinhVienID')
                     ->whereRaw('dr.DiemRenLuyenID = (
                         SELECT MAX(inner_dr.DiemRenLuyenID)
                         FROM diemrenluyen inner_dr
                         WHERE inner_dr.SinhVienID = dr.SinhVienID
                     )');
            })
            ->select([
                'v.SinhVienID',
                'v.MaSV',
                'v.HoTen',
                'dr.HocKyID',
                'dr.TongDiem',
                'dr.XepLoai',
                DB::raw("DATE_FORMAT(dr.NgayDanhGia, '%d/%m/%Y') as NgayDanhGia"),
            ]);
        }

        $data = $query->orderBy('v.HoTen')
                      ->get();

        return $data->map(function ($item) {
            return [
                'sinh_vien_id'   => $item->SinhVienID,
                'ma_sv'          => $item->MaSV,
                'ho_ten'         => $item->HoTen,
                'hoc_ky_id'      => $item->HocKyID,
                'tong_diem'      => $item->TongDiem,
                'xep_loai'       => $item->XepLoai,
                'ngay_danh_gia'  => $item->NgayDanhGia,
            ];
        });
    }

    public function capNhatDiemRenLuyen($sinhVienID, $hocKyID, $tongDiem, $xepLoai = null, $giangVienID, $nguoiThucHienID)
    {
        return DB::transaction(function () use ($sinhVienID, $hocKyID, $tongDiem, $xepLoai, $giangVienID, $nguoiThucHienID) {
            $diem = DiemRenLuyen::updateOrCreate(
                ['SinhVienID' => $sinhVienID, 'HocKyID' => $hocKyID],
                [
                    'TongDiem'    => $tongDiem,
                    'XepLoai'     => $xepLoai,
                    'NgayDanhGia' => now(),
                    'GiangVienID' => $giangVienID,
                ]
            );

            DB::table('hethong_log')->insert([
                'UserID'       => $nguoiThucHienID,
                'HanhDong'     => 'Update',
                'MoTa'         => "Cập nhật điểm RL cho SV $sinhVienID, HK $hocKyID: $tongDiem",
                'BangLienQuan' => 'diemrenluyen',
                'IDBanGhi'     => $diem->DiemRenLuyenID,
                'IP'           => request()->ip(),
                'UserAgent'    => request()->userAgent(),
                'created_at'   => now(),
            ]);

            return ['success' => true, 'data' => $diem];
        });
    }
}