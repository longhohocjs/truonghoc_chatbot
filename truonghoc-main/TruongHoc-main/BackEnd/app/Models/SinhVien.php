<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SinhVien extends Model
{
    protected $table = 'sinhvien';
    protected $primaryKey = 'SinhVienID';
    public $timestamps = true;
    const CREATED_AT = 'created_at';
    const UPDATED_AT = null;

    protected $fillable = [
        'UserID', 'MaSV', 'khoahoc', 'HoTen', 'NgaySinh', 
        'KhoaID', 'NganhID', 'TinhTrang', 
        'LopSinhHoatID', 'gioitinh', 'email', 
        'sodienthoai'
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'UserID', 'UserID');
    }

    public function nganh()
    {
        return $this->belongsTo(NganhDaoTao::class, 'NganhID', 'NganhID');
    }

    public function khoa()
    {
        return $this->belongsTo(Khoa::class, 'KhoaID', 'KhoaID');
    }

    public function dangKyHocPhan() {
        return $this->hasMany(DangKyHocPhan::class, 'SinhVienID', 'SinhVienID');
    }

    public function diemRenLuyen() {
        return $this->hasMany(DiemRenLuyen::class, 'SinhVienID', 'SinhVienID');
    }

    public function lopSinhHoat()
    {
        return $this->belongsTo(LopSinhHoat::class, 'LopSinhHoatID', 'LopSinhHoatID');
    }
}