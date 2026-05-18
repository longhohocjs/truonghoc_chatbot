<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;

class AuthService
{
    public function login(Request $request): array
    {
        $request->validate([
            'username' => 'required|string|max:255',
            'password' => 'required|string',
        ]);

        $key = 'login:' . Str::lower($request->username) . '|' . $request->ip();
        if (RateLimiter::tooManyAttempts($key, 5)) {
            $seconds = RateLimiter::availableIn($key);
            throw ValidationException::withMessages([
                'username' => "Bạn đã thử quá nhiều lần. Vui lòng thử lại sau {$seconds} giây.",
            ]);
        }

        $credentials = [
            'Username' => $request->username,
            'password' => $request->password
        ];

        if (!$token = JWTAuth::attempt($credentials)) {
            RateLimiter::hit($key, 60);
            throw ValidationException::withMessages([
                'username' => 'Thông tin đăng nhập không chính xác.',
            ]);
        }

        $user = JWTAuth::user();

        if ($user->is_active == 0) {
            JWTAuth::invalidate($token);
            return [
                'success' => false,
                'message' => 'Tài khoản của bạn đã bị khóa.',
                'status' => 403
            ];
        }

        RateLimiter::clear($key);

        return [
            'success' => true,
            'message' => 'Đăng nhập thành công',
            'user' => [
                'id' => $user->UserID,
                'username' => $user->Username,
                'role' => $user->role->RoleName ?? 'Unknown',
            ],
            'token' => $token,
            'token_type' => 'Bearer',
            'expires_in' => config('jwt.ttl') * 60,
        ];
    }

    public function logout(Request $request): array
    {
        try {
            JWTAuth::invalidate(JWTAuth::getToken());
        } catch (\Exception $e) {
            // Token đã hết hạn hoặc không hợp lệ vẫn cho logout thành công ở client
        }

        return [
            'success' => true,
            'message' => 'Đăng xuất thành công'
        ];
    }

    public function me(Request $request): array
    {
        $user = $request->user();

        return [
            'success' => true,
            'user' => [
                'id' => $user->UserID,
                'username' => $user->Username,
                'role' => $user->role->RoleName ?? null,
                'created_at' => $user->created_at,
            ]
        ];
    }

    public function changePassword(Request $request): array
    {
        $request->validate([
            'current_password' => 'required|string',
            'password' => 'required|string|min:6|confirmed',
        ]);

        $user = $request->user();

        if (!Hash::check($request->current_password, $user->PasswordHash)) {
            throw ValidationException::withMessages([
                'current_password' => 'Mật khẩu hiện tại không đúng.',
            ]);
        }

        $user->update([
            'PasswordHash' => Hash::make($request->password),
        ]);

        JWTAuth::invalidate(JWTAuth::getToken());

        return [
            'success' => true,
            'message' => 'Đổi mật khẩu thành công. Vui lòng đăng nhập lại.'
        ];
    }

    public function resetPassword(Request $request): array
    {
        $request->validate([
            'user_id' => 'required|integer|exists:users,UserID',
            'new_password' => 'required|string|min:6',
        ]);

        $targetUser = User::findOrFail($request->user_id);

        $targetUser->update([
            'PasswordHash' => Hash::make($request->new_password),
        ]);

        return [
            'success' => true,
            'message' => 'Reset mật khẩu thành công cho user ' . $targetUser->Username
        ];
    }
}