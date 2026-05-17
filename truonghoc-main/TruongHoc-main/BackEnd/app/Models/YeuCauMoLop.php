<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class YeuCauMoLop extends Model {
    protected $table = 'yeucaumolop';
    protected $primaryKey = 'YeuCauID';
    protected $fillable = ['SinhVienID', 'MonHocID', 'LyDo', 'TrangThai'];

    // Quan hệ với sinh viên
    public function sinh_vien() {
        return $this->belongsTo(SinhVien::class, 'SinhVienID', 'SinhVienID');
    }

    // Quan hệ với môn học
    public function mon_hoc() {
        return $this->belongsTo(MonHoc::class, 'MonHocID', 'MonHocID');
    }
}