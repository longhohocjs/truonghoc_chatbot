<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LichHoc extends Model
{
    protected $table = 'lichhoc';
    protected $primaryKey = 'LichHocID';
    public $timestamps = true;

    protected $fillable = [
        'LopHocPhanID',
        'NgayHoc',
        'Thu', // Thêm trường Thu vào fillable
        'BuoiHoc',
        'TietBatDau',
        'SoTiet',
        'PhongHoc',
        'GhiChu'
    ];

    public function lopHocPhan()
    {
        return $this->belongsTo(LopHocPhan::class, 'LopHocPhanID', 'LopHocPhanID');
    }
}