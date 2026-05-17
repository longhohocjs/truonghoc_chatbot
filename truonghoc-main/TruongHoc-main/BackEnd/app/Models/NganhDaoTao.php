<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class NganhDaoTao extends Model
{
    protected $table = 'nganhdaotao';
    protected $primaryKey = 'NganhID';
    public $timestamps = false;

    protected $fillable = [
        'MaNganh',
        'TenNganh',
        'KhoaID'
    ];

    public function khoa()
    {
        return $this->belongsTo(Khoa::class, 'KhoaID', 'KhoaID');
    }

    public function chuongTrinhDaoTao()
    {
        return $this->hasMany(ChuongTrinhDaoTao::class, 'NganhID', 'NganhID');
    }
}