<?php

namespace App\Http\Controllers\Api\SinhVien;

use App\Http\Controllers\Controller;
use App\Services\SinhVienLichService; // Service đã gộp
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LichThiController extends Controller
{
    public function __construct(
        protected SinhVienLichService $lichService
    ) {}

    public function xemLichThi(Request $request): JsonResponse
    {
        $result = $this->lichService->getLichThi(
            $request->user(),
            $request->integer('hoc_ky_id')
        );

        if (!$result['success']) {
            return $this->error($result['message'], 400);
        }

        // Gỡ bỏ phím 'success' dư thừa từ service trước khi trả về
        $data = $result;
        unset($data['success']);

        return $this->success($data, 'Lấy lịch thi thành công');
    }
}