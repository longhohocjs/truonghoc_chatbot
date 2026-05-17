<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class NamHoc extends Model {
    protected $table = 'namhoc';
    protected $primaryKey = 'NamHocID';
    public $timestamps = false;
    protected $fillable = ['TenNamHoc', 'NgayBatDau', 'NgayKetThuc'];

    public function hocKy() {
        return $this->hasMany(HocKy::class, 'NamHocID', 'NamHocID');
    }
}