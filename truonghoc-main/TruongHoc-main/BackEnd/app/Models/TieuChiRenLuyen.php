<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TieuChiRenLuyen extends Model
{
    protected $table = 'tieuchirenluyen';
    protected $primaryKey = 'TieuChiID';
    public $timestamps = false;

    protected $fillable = [
        'TenTieuChi',
        'DiemToiDa',
        'ThuTu'
    ];

    public function chiTietDiem()
    {
        return $this->hasMany(ChiTietDiemRenLuyen::class, 'TieuChiID', 'TieuChiID');
    }
}