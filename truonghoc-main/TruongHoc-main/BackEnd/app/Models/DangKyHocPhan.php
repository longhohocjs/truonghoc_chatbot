<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DangKyHocPhan extends Model
{
    protected $table = 'dangkyhocphan';
    protected $primaryKey = 'DangKyID';
    public $timestamps = false;

    protected $fillable = [
        'SinhVienID',
        'LopHocPhanID',
        'ThoiGianDangKy',
        'TrangThai'
    ];


    public function sinhVien()
    {
        return $this->belongsTo(SinhVien::class, 'SinhVienID', 'SinhVienID');
    }

    public function lopHocPhan()
    {
        return $this->belongsTo(LopHocPhan::class, 'LopHocPhanID', 'LopHocPhanID');
    }

    public function diemSo() {
        return $this->hasOne(DiemSo::class, 'DangKyID', 'DangKyID');
    }
}