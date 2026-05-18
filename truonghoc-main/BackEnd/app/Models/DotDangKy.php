<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class DotDangKy extends Model
{
    protected $table = 'dotdangky';
    protected $primaryKey = 'DotDangKyID';
    public $timestamps = true;

    protected $fillable = [
        'HocKyID',
        'TenDot',
        'NgayBatDau',
        'NgayKetThuc',
        'TrangThai',
        'DoiTuong',
        'GhiChu'
    ];

    public function hocKy()
    {
        return $this->belongsTo(HocKy::class, 'HocKyID', 'HocKyID');
    }

    public function isOpening(): bool
    {
        if ($this->TrangThai === 0) {
            return false;
        }

        $now = now();
        return $this->NgayBatDau <= $now && $this->NgayKetThuc >= $now;
    }
}