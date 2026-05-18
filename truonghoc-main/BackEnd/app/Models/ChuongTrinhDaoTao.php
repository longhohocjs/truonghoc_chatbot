<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ChuongTrinhDaoTao extends Model
{
    protected $table = 'chuongtrinhdaotao';
    protected $primaryKey = 'ID';

    protected $fillable = [
        'NganhID',
        'MonHocID',
        'HocKyGoiY',
        'BatBuoc',
        'KhoiKienThuc'
    ];

    public $timestamps = false;

    private function checkDungCTDT($sinhVien, $monHocID) {
        return ChuongTrinhDaoTao::where('NganhID', $sinhVien->NganhID)
                                ->where('MonHocID', $monHocID)
                                ->exists();
    }
    
    public function nganhDaoTao()
    {
        return $this->belongsTo(NganhDaoTao::class, 'NganhID', 'NganhID');
    }

    public function monHoc()
    {
        return $this->belongsTo(MonHoc::class, 'MonHocID', 'MonHocID');
    }
}