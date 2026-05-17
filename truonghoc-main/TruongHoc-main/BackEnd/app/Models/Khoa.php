<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;

class Khoa extends Model
{
    // Khai báo tên bảng chính xác trong DB của bạn
    protected $table = 'khoa';
    
    // Khai báo khóa chính (Laravel mặc định là 'id')
    protected $primaryKey = 'KhoaID';

    /**
     * Nếu bảng của bạn không có cột created_at và updated_at, hãy đặt bằng false.
     * Lỗi 500 thường xảy ra do Laravel cố gắng ghi vào 2 cột này khi chúng không tồn tại.
     */
    public $timestamps = false;

    protected $fillable = ['MaKhoa', 'TenKhoa'];

    /**
     * Một Khoa có nhiều Ngành đào tạo
     */
    public function nganhs(): HasMany
    {
        return $this->hasMany(Nganh::class, 'KhoaID', 'KhoaID');
    }

    /**
     * Một Khoa quản lý nhiều Môn học
     */
    public function monHocs(): HasMany
    {
        return $this->hasMany(MonHoc::class, 'KhoaID', 'KhoaID');
    }

    /**
     * Một Khoa có nhiều Giảng viên trực thuộc
     */
    public function giangViens(): HasMany
    {
        return $this->hasMany(GiangVien::class, 'KhoaID', 'KhoaID');
    }

    /**
     * Một Khoa có nhiều Lớp sinh hoạt (hành chính)
     */
    public function lopSinhHoats(): HasMany
    {
        return $this->hasMany(LopSinhHoat::class, 'KhoaID', 'KhoaID');
    }
}