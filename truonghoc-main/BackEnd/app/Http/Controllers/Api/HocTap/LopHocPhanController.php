<?php

namespace App\Http\Controllers\Api\HocTap;


use App\Http\Controllers\Controller;
use App\Services\LopHocPhanService;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

class LopHocPhanController extends Controller
{
    protected LopHocPhanService $lopService;

    public function __construct(LopHocPhanService $lopService)
    {
        $this->lopService = $lopService;

        $this->middleware([
            'auth:api',
            \App\Http\Middleware\CheckGiangVien::class,
            \App\Http\Middleware\CheckActiveUser::class,
        ]);
    }

    public function index(): JsonResponse
    {
        $user = Auth::user();
        $data = $this->lopService->getLopPhanCong((int) $user->UserID);

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }

    public function showSinhVien($id): JsonResponse
    {
        try {
            $data = $this->lopService->getSinhVienTrongLop((int) $id);

            return response()->json([
                'success' => true,
                'data' => $data,
            ]);
        } catch (ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Lớp học phần không tồn tại',
            ], 404);
        }
    }

    public function exportPrintData($id): JsonResponse
    {
        try {
            $payload = $this->lopService->getDanhSachIn((int) $id);

            if ($payload['danh_sach']->isEmpty()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Không có dữ liệu',
                ], 404);
            }

            return response()->json([
                'success' => true,
                'meta' => $payload['meta'],
                'danh_sach' => $payload['danh_sach'],
            ]);
        } catch (ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Lớp học phần không tồn tại',
            ], 404);
        }
    }
}
