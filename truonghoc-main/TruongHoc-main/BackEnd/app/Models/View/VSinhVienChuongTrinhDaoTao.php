<?php

namespace App\Models\View;

use Illuminate\Database\Eloquent\Model;

class VSinhVienChuongTrinhDaoTao extends Model
{
    protected $table = 'v_sinhvien_chuongtrinhdaotao';
    public $timestamps = false;

    protected $fillable = [
        'SinhVienID', 'MaSV', 'HoTen', 'MaNganh', 'TenNganh',
        'MaMon', 'TenMon', 'SoTinChi', 'HocKyGoiY', 'BatBuoc', 'KhoaID'
    ];
}