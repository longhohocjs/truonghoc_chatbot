<?php

namespace App\Models\View;

use Illuminate\Database\Eloquent\Model;

class VGpaHocKy extends Model
{
    protected $table = 'v_gpa_hoc_ky';
    public $timestamps = false;

    protected $fillable = [
        'SinhVienID', 'MaSV', 'HoTen', 'TenHocKy', 
        'SoMon', 'TongTinChi', 'GPA_HocKy_TamTinh'
    ];
}