<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MonHocSongHanh extends Model
{
    protected $table = 'monhoc_songhanh';
    protected $primaryKey = 'ID';
    public $timestamps = false;

    protected $fillable = [
        'MonHocID',
        'MonSongHanhID',
        'GhiChu'
    ];

    public function monHoc()
    {
        return $this->belongsTo(MonHoc::class, 'MonHocID', 'MonHocID');
    }

    public function monSongHanh()
    {
        return $this->belongsTo(MonHoc::class, 'MonSongHanhID', 'MonHocID');
    }
}