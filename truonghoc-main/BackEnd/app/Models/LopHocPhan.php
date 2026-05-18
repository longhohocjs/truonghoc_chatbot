<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LopHocPhan extends Model
{
    protected $table = 'lophocphan';
    protected $primaryKey = 'LopHocPhanID';
    public $timestamps = false;

    protected $fillable = [
        'MonHocID',
        'HocKyID',
        'GiangVienID',
        'MaLopHP',
        'SoLuongToiDa',
        'KhoahocAllowed',
        'NgayBatDau',
        'NgayKetThuc',
        'TrangThai' // 1: Bình thường, 0: Đã hủy
    ];

    // Đảm bảo các mối quan hệ luôn được thêm vào JSON/Array output
    protected $appends = ['lich_hoc_details', 'lich_thi_details'];

    // Accessor để trả về chi tiết lịch học
    public function getLichHocDetailsAttribute() {
        return $this->lichHoc;
    }

    // Accessor để trả về chi tiết lịch thi
    public function getLichThiDetailsAttribute() {
        return $this->lichThi;
    }

protected $casts = [
    'NgayBatDau' => 'date',
    'NgayKetThuc' => 'date',
];

    public function monHoc()
    {
        return $this->belongsTo(MonHoc::class, 'MonHocID', 'MonHocID');
    }

    public function giangVien()
    {
        return $this->belongsTo(GiangVien::class, 'GiangVienID', 'GiangVienID');
    }

    public function dangKyHocPhan()
    {
        return $this->hasMany(DangKyHocPhan::class, 'LopHocPhanID', 'LopHocPhanID');
    }

    public function lichHoc() {
        return $this->hasMany(LichHoc::class, 'LopHocPhanID', 'LopHocPhanID');
    }

    public function lichThi() {
        return $this->hasMany(LichThi::class, 'LopHocPhanID', 'LopHocPhanID');
    }

    public function hocKy() {
        return $this->belongsTo(HocKy::class, 'HocKyID', 'HocKyID');
    }
}