<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->alias([
            'admin'           => \App\Http\Middleware\CheckAdmin::class,
            'check.sinhvien'  => \App\Http\Middleware\CheckSinhVien::class,
            'check.giangvien' => \App\Http\Middleware\CheckGiangVien::class,
            'check.active'    => \App\Http\Middleware\CheckActiveUser::class,
            'check.dot_open' => \App\Http\Middleware\CheckDotDangKyOpen::class,
        ]);

        // (tất cả route api/* khi đã auth sẽ phải qua check active)
        $middleware->appendToGroup('api', \App\Http\Middleware\CheckActiveUser::class);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })->create();