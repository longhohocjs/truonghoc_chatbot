<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ChiTietDiemRenLuyen extends Model
{
    protected $table = 'chitietdiemrenluyen';
    protected $primaryKey = 'ID';
    public $timestamps = false;

    protected $fillable = [
        'DiemRenLuyenID',
        'TieuChiID',
        'DiemDatDuoc'
    ];

    public function tieuChiRenLuyen()
    {
        return $this->belongsTo(TieuChiRenLuyen::class, 'TieuChiID', 'ID');
    }
}