<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use PHPOpenSourceSaver\JWTAuth\Contracts\JWTSubject;

class User extends Authenticatable implements JWTSubject
{
    use Notifiable;

    protected $table = 'users';
    protected $primaryKey = 'UserID';
    public $timestamps = false;

    protected $fillable = [
        'Username',
        'PasswordHash',
        'Email',
        'RoleID',
        'is_active',
    ];

    protected $hidden = [
        'PasswordHash',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function getJWTIdentifier()
    {
        return $this->getKey();
    }

    public function getJWTCustomClaims()
    {
        return [];
    }

    public function getAuthPassword()
    {
        return $this->PasswordHash;
    }

        public function sinhVien()
    {
        return $this->hasOne(SinhVien::class, 'UserID', 'UserID');
    }

    public function giangVien()
    {
        return $this->hasOne(GiangVien::class, 'UserID', 'UserID');
    }

    public function role()
    {
        return $this->belongsTo(Role::class, 'RoleID', 'RoleID');
    }

    public function isAdmin()
    {
        return $this->RoleID === 1;
    }

    public function isGiangVien()
    {
        return $this->RoleID === 2;
    }

    public function isSinhVien()
    {
        return $this->RoleID === 3;
    }

    public function isActive(): bool
    {
        return (bool) $this->is_active;
    }
}