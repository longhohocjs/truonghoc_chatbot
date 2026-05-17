<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HocPhi extends Model
{
    protected $table = 'hocphi';
    protected $primaryKey = 'HocPhiID';
    public $timestamps = false;

    protected $fillable = [
        'SinhVienID',
        'HocKyID',
        'TongTien',
        'DaNop',
        'HanNop'
    ];

    public function isCompleted()
    {
        return $this->DaNop >= $this->TongTien;
    }

    public function getSoTienNoAttribute()
    {
        return max(0, $this->TongTien - $this->DaNop);
    }

    public function sinhVien()
    {
        return $this->belongsTo(SinhVien::class, 'SinhVienID', 'SinhVienID');
    }

    public function hocky()
    {
        return $this->belongsTo(HocKy::class, 'HocKyID', 'HocKyID');
    }
}