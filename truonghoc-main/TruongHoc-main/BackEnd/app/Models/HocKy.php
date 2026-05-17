<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HocKy extends Model
{
    protected $table = 'hocky';
    protected $primaryKey = 'HocKyID';
    public $timestamps = false;

    protected $fillable = [
        'NamHocID',
        'TenHocKy',
        'LoaiHocKy',
        'NgayBatDau',
        'NgayKetThuc'
    ];

    public function lopHocPhan()
    {
        return $this->hasMany(LopHocPhan::class, 'HocKyID', 'HocKyID');
    }

    public function dotDangKy()
    {
        return $this->hasMany(DotDangKy::class, 'HocKyID', 'HocKyID');
    }
    public function namHoc()
    {
        return $this->belongsTo(NamHoc::class, 'NamHocID', 'NamHocID');
    }
}