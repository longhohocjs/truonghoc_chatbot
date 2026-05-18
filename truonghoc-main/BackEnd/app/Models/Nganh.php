<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Nganh extends Model
{
    // Tên bảng khớp với 'exists:nganhdaotao,NganhID' trong UserController
    protected $table = 'nganhdaotao';

    protected $primaryKey = 'NganhID';

    /**
     * Vô hiệu hóa timestamps nếu bảng không có các cột thời gian mặc định
     * Tránh lỗi 500 khi thao tác với model
     */
    public $timestamps = false;

    protected $fillable = ['MaNganh', 'TenNganh', 'KhoaID'];

    public function khoa()
    {
        return $this->belongsTo(Khoa::class, 'KhoaID', 'KhoaID');
    }

    public function chuongTrinhDaoTao()
    {
        return $this->hasMany(ChuongTrinhDaoTao::class, 'NganhID', 'NganhID');
    }

    public function sinhViens()
    {
        return $this->hasMany(SinhVien::class, 'NganhID', 'NganhID');
    }
}