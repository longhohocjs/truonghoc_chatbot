<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

class LogService
{
    public function write(string $hanhDong, string $moTa, string $bang = 'lophocphan', int $id = null): void
    {
        DB::table('hethong_log')->insert([
            'UserID'       => Auth::id() ?? 1,
            'HanhDong'     => $hanhDong,
            'MoTa'         => $moTa,
            'BangLienQuan' => $bang,
            'IDBanGhi'     => $id,
            'IP'           => request()->ip(),
            'UserAgent'    => request()->userAgent(),
            'created_at'   => now(),
        ]);
    }
}