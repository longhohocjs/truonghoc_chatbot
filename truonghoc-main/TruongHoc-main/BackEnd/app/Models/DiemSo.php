<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DiemSo extends Model
{
    protected $table = 'diemso';
    protected $primaryKey = 'DiemID';
    public $timestamps = false;

    protected $fillable = [
        'DangKyID',
        'DiemChuyenCan',
        'DiemGiuaKy',
        'DiemThi',
        'DiemTongKet'
    ];

    public function getDiemHe4() {
        if ($this->DiemTongKet >= 8.5) return 4.0;
        if ($this->DiemTongKet >= 7.0) return 3.0;
        if ($this->DiemTongKet >= 5.5) return 2.0;
        if ($this->DiemTongKet >= 4.0) return 1.0;
        return 0;
    }

    public function dangKyHocPhan()
    {
        return $this->belongsTo(DangKyHocPhan::class, 'DangKyID', 'DangKyID');
    }
}