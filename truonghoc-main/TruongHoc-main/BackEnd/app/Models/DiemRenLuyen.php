<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DiemRenLuyen extends Model
{
    protected $table = 'diemrenluyen';
    protected $primaryKey = 'DiemRenLuyenID';
    public $timestamps = false;

    protected $fillable = [
        'SinhVienID',
        'HocKyID',
        'TongDiem',
        'XepLoai',
        'NgayDanhGia'
    ];

    public function hocKy()
    {
        return $this->belongsTo(HocKy::class, 'HocKyID', 'HocKyID');
    }
    
    public function chiTietDiem() {
        return $this->hasMany(ChiTietDiemRenLuyen::class, 'DiemRenLuyenID', 'DiemRenLuyenID');
    }

    public function sinhVien()
    {
        return $this->belongsTo(SinhVien::class, 'SinhVienID', 'SinhVienID');
    }
}