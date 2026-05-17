<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LopSinhHoat extends Model
{
    protected $table = 'lopsinhhoat';
    protected $primaryKey = 'LopSinhHoatID';
    public $timestamps = false;

    protected $fillable = [
        'MaLop',
        'TenLop',
        'KhoaID',
        'GiangVienID',
        'NamNhapHoc'
    ];

    public function khoa()
    {
        return $this->belongsTo(Khoa::class, 'KhoaID', 'KhoaID');
    }

    public function diemRenLuyen()
    {
        return $this->hasManyThrough(DiemRenLuyen::class, SinhVien::class, 'LopSinhHoatID', 'SinhVienID', 'LopSinhHoatID', 'SinhVienID');
    }

    public function coVanHocTap()
    {
        return $this->belongsTo(GiangVien::class, 'GiangVienID', 'GiangVienID');
    }

    public function sinhVien()
    {
        return $this->hasMany(SinhVien::class, 'LopSinhHoatID', 'LopSinhHoatID');
    }
}