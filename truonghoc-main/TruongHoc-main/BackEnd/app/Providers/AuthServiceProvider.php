<?php

namespace App\Providers;

use App\Models\User;
use Illuminate\Support\Facades\Gate;
use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;

class AuthServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $this->registerPolicies();

        // Gate cho admin
        Gate::define('admin-access', function (User $user) {
            return $user->isAdmin();
        });

        // Gate cho giảng viên
        Gate::define('giangvien-access', function (User $user) {
            return $user->isGiangVien();
        });

        // Gate cho sinh viên
        Gate::define('sinhvien-access', function (User $user) {
            return $user->isSinhVien();
        });
    }
}