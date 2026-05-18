<?php

namespace App\Http\Controllers\Api\GiangVien;

use App\Http\Controllers\Controller;
use App\Services\GiangVienProfileService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ProfileController extends Controller
{
    protected $profileService;

    public function __construct(GiangVienProfileService $profileService)
    {
        $this->profileService = $profileService;
    }

    /**
     * [GET] Xem hồ sơ cá nhân
     */
    public function show(Request $request)
{
    $user = $request->user();
    $giangVien = $user->giangVien;

    if (!$giangVien) {
        return response()->json([
            'status' => 'error',
            'message' => "User ID {$user->UserID} không tìm thấy bản ghi nào trong bảng giangvien.",
            'debug_user_id' => $user->UserID
        ], 404);
    }

    $result = $this->profileService->getProfile($giangVien->GiangVienID);
    return response()->json($result, 200);
}

    /**
     * [PUT] Cập nhật thông tin cá nhân
     */
    public function update(Request $request)
    {
        $user = $request->user();
        $giangVien = $user->giangVien;

        if (!$giangVien) {
            return response()->json([
                'status' => 'error',
                'message' => 'Không tìm thấy hồ sơ giảng viên liên kết với tài khoản này.'
            ], 404);
        }

        $giangVienID = $giangVien->GiangVienID;

        // Chuẩn hóa dữ liệu: chấp nhận cả email/sodienthoai và Email/SoDienThoai
        $input = [
            'email'       => $request->input('email') ?? $request->input('Email'),
            'sodienthoai' => $request->input('sodienthoai') ?? $request->input('SoDienThoai'),
        ];

        $validator = Validator::make($input, [
            'email' => 'nullable|email|max:255|unique:giangvien,email,' . $giangVienID . ',GiangVienID',
            'sodienthoai' => 'nullable|string|max:15'
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            $updatedProfile = $this->profileService->updateContactInfo(
                $giangVienID, 
                $input
            );

            return response()->json([
                'status' => 'success',
                'message' => 'Cập nhật thông tin liên lạc thành công.',
                'data' => $updatedProfile
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Lỗi hệ thống khi cập nhật: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * [POST] Đổi mật khẩu
     */
    public function changePassword(Request $request)
    {
        $user = $request->user();
        
        if (!$user->giangVien) {
            return response()->json([
                'status' => 'error',
                'message' => 'Không tìm thấy hồ sơ giảng viên để thực hiện thao tác này.'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'old_password' => 'required',
            'new_password' => 'required|min:6|confirmed', // Cần trường new_password_confirmation
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            $this->profileService->changePassword(
                $request->user(),
                $request->old_password,
                $request->new_password
            );

            return response()->json([
                'status' => 'success',
                'message' => 'Đổi mật khẩu thành công.'
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage()
            ], 400);
        }
    }
}