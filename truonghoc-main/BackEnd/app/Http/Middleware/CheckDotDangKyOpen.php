<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use App\Models\DotDangKy;
use App\Models\LopHocPhan;

class CheckDotDangKyOpen
{
    public function handle(Request $request, Closure $next)
    {
        $lopHocPhanId = $request->input('LopHocPhanID') 
                        ?? $request->route('lopHocPhanId') 
                        ?? $request->route('lhpID');

        $lop = LopHocPhan::find($lopHocPhanId);
        if (!$lop) {
            return response()->json(['message' => 'Lớp không tồn tại'], 404);
        }

        $dotMo = DotDangKy::where('HocKyID', $lop->HocKyID)
            ->where('TrangThai', 1)
            ->where('NgayBatDau', '<=', now())
            ->where('NgayKetThuc', '>=', now())
            ->exists();

        if (!$dotMo) {
            return response()->json(['message' => 'Hiện tại không trong thời gian đăng ký cho học kỳ này'], 403);
        }

        return $next($request);
    }
}