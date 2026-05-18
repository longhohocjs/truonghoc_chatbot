<?php

namespace App\Services;

use App\Models\NamHoc;
use App\Models\HocKy;

class QuanLyNamHocService
{
    public function taoNamHoc(array $data)
    {
        return NamHoc::create($data);
    }

    public function taoHocKy(array $data)
    {
        return HocKy::create($data);
    }
}