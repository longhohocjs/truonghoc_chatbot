<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ThanhToanHocPhi extends Model
{
    protected $table = 'thanhtoanhocphi';
    protected $primaryKey = 'ThanhToanID';
    public $timestamps = false;

    protected $fillable = [
        'HocPhiID',
        'SoTien',
        'NgayThanhToan',
        'HinhThuc'
    ];

    public function hocPhi()
    {
        return $this->belongsTo(HocPhi::class, 'HocPhiID', 'HocPhiID');
    }
}