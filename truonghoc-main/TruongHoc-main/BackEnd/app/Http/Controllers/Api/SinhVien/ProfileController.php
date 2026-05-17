<?php

namespace App\Http\Controllers\Api\SinhVien;

use App\Http\Controllers\Controller;
use App\Services\SinhVienProfileService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class ProfileController extends Controller
{
    protected $profileService;

    public function __construct(SinhVienProfileService $profileService)
    {
        $this->profileService = $profileService;
    }

    /**
     * Hiển thị thông tin hồ sơ cá nhân của sinh viên đang đăng nhập
     */
    public function show(): JsonResponse
    {
        $result = $this->profileService->getSinhVienProfile(auth()->user());
        
        if (!$result['success']) {
            return $this->error($result['message'], 404);
        }

        return $this->success($result['data']);
    }

    /**
     * Cập nhật thông tin liên lạc (Email, Số điện thoại)
     */
    public function updateContact(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => 'nullable|email|max:255',
            'sodienthoai' => 'nullable|string|max:15',
        ]);

        try {
            $result = $this->profileService->updateContact(auth()->user(), $data);
            return $this->success($result, 'Cập nhật thông tin liên lạc thành công');
        } catch (\Exception $e) {
            return $this->error($e->getMessage());
        }
    }
}