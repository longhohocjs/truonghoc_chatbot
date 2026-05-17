<?php

namespace App\Imports;

use App\Models\DangKyHocPhan;
use App\Models\DiemSo;
use Illuminate\Support\Facades\Auth;
use Maatwebsite\Excel\Concerns\ToModel;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Maatwebsite\Excel\Concerns\WithValidation;
use Maatwebsite\Excel\Concerns\SkipsOnError;
use Maatwebsite\Excel\Concerns\SkipsErrors;

class NhapDiemTuExcel implements ToModel, WithHeadingRow, WithValidation, SkipsOnError
{
    use SkipsErrors;

    protected $lopHocPhanID;
    protected $giangVienID;

    public function __construct($lopHocPhanID)
    {
        $this->lopHocPhanID = $lopHocPhanID;
        $this->giangVienID = Auth::user()->giangVien->GiangVienID;
    }

    public function model(array $row)
    {
        $maSV = trim($row['ma_sv'] ?? '');

        if (empty($maSV)) {
            return null;
        }

        $dangKy = DangKyHocPhan::where('LopHocPhanID', $this->lopHocPhanID)
            ->whereHas('sinhVien', fn($q) => $q->where('MaSV', $maSV))
            ->first();

        if (!$dangKy) {
            return null; 
        }

        $diem = DiemSo::firstOrNew(['DangKyID' => $dangKy->DangKyID]);

        $diem->DiemChuyenCan = $row['diem_chuyen_can'] ?? null;
        $diem->DiemGiuaKy    = $row['diem_giua_ky'] ?? null;
        $diem->DiemThi       = $row['diem_thi'] ?? null;

        $diem->save();

        return $diem;
    }

    public function rules(): array
    {
        return [
            'ma_sv'           => ['required', 'string'],
            'diem_chuyen_can' => ['nullable', 'numeric', 'min:0', 'max:10'],
            'diem_giua_ky'    => ['nullable', 'numeric', 'min:0', 'max:10'],
            'diem_thi'        => ['nullable', 'numeric', 'min:0', 'max:10'],
        ];
    }
}