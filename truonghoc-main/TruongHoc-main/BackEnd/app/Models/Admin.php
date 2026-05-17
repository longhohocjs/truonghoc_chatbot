<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Admin extends Model
{
    protected $table = 'admin';
    protected $primaryKey = 'AdminID';
    public $timestamps = true;

    protected $fillable = [
        'UserID',
        'HoTen',
        'Email',
        'SoDienThoai',
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'UserID', 'UserID');
    }
}