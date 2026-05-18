<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Role extends Model
{
    protected $table = 'roles';
    protected $primaryKey = 'RoleID';
    public $timestamps = false;

    protected $fillable = [
        'RoleName'
    ];

    public function users()
    {
        return $this->hasMany(User::class, 'RoleID', 'RoleID');
    }
}