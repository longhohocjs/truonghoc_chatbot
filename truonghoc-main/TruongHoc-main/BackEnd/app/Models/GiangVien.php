<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GiangVien extends Model
{
    protected $table = 'giangvien';
    protected $primaryKey = 'GiangVienID';
    public $timestamps = true;
    const CREATED_AT = 'created_at';
    const UPDATED_AT = null; 

    protected $fillable = [
        'UserID', 
        'MaGV',
        'HoTen', 
        'HocVi', 
        'ChuyenMon', 
        'KhoaID', 
        'email',
        'LoaiGiangVien',      
        'sodienthoai' 
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'UserID', 'UserID');
    }

    public function khoa()
    {
        return $this->belongsTo(Khoa::class, 'KhoaID', 'KhoaID');
    }

    public function lopHocPhans()
    {
        return $this->hasMany(LopHocPhan::class, 'GiangVienID', 'GiangVienID');
    }
}