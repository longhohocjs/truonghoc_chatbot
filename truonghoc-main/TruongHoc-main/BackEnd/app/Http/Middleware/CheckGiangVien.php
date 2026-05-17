<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckGiangVien
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Vui lòng đăng nhập.'], 401);
        }

        // Kiểm tra role Giảng viên
        if (!$user->isGiangVien()) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không phải giảng viên.'
            ], 403);
        }

        // Kiểm tra active (đúng logic: nếu KHÔNG active thì block)
        if (!$user->isActive()) {
            return response()->json([
                'success' => false,
                'message' => 'Tài khoản giảng viên đã bị khóa.'
            ], 403);
        }

        return $next($request);
    }
}