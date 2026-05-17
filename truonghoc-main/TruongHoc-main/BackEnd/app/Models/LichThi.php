<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LichThi extends Model
{
    protected $table = 'lichthi';
    protected $primaryKey = 'LichThiID';
    public $timestamps = true;

    protected $fillable = [
        'LopHocPhanID',
        'NgayThi',
        'GioBatDau',
        'GioKetThuc',
        'PhongThi',
        'HinhThucThi',
        'GhiChu'
    ];

    public function lopHocPhan()
    {
        return $this->belongsTo(LopHocPhan::class, 'LopHocPhanID', 'LopHocPhanID');
    }
}