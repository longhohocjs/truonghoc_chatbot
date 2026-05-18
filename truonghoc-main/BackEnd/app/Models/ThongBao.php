<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ThongBao extends Model
{
    protected $table = 'thongbao';
    protected $primaryKey = 'ThongBaoID';
    public $timestamps = true;
    const UPDATED_AT = null; 

    protected $fillable = [
        'TieuDe',
        'NoiDung',
        'LoaiThongBao',
        'NguoiGuiID',
        'DoiTuong',
        'NgayBatDauHienThi',
        'NgayKetThucHienThi',
    ];

    public function scopeActive($query)
    {
        $now = now();
        return $query->where('NgayBatDauHienThi', '<=', $now)
                     ->where('NgayKetThucHienThi', '>=', $now);
    }
}