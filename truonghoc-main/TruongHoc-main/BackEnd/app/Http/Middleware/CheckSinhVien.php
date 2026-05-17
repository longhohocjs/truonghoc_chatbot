<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckSinhVien
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->user() && $request->user()->isSinhVien()) {
            if (!$request->user()->isActive()) {
                return response()->json(['message' => 'Tài khoản sinh viên đã bị khóa.'], 403);
            }
            return $next($request);
        }
        
        return response()->json([
            'success' => false,
            'message' => 'Bạn không có quyền truy cập vào chức năng này.'
        ], 403);
    }
}