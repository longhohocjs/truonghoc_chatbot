<?php

namespace App\Http\Controllers\Api\SinhVien;

use App\Http\Controllers\Controller;
use App\Services\ChuongTrinhDaoTaoService;
use App\Services\SinhVienChuongTrinhDaoTaoService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ChuongTrinhDaoTaoController extends Controller
{
    protected $ctdtService;

    public function __construct(ChuongTrinhDaoTaoService $ctdtService)
    {
        $this->ctdtService = $ctdtService;
    }

    public function index(Request $request): JsonResponse
    {
        $result = $this->ctdtService->getProgramByStudent($request->user());

        if (!$result['success']) {
            return $this->error($result['message'], 404);
        }

        return $this->success($result['data']);
    }

    /**
     * Lấy danh sách các môn học sinh viên đã hoàn thành (Điểm >= 5.0)
     */
    public function getMonDaHoanThanh(Request $request): JsonResponse
    {
        $service = app(SinhVienChuongTrinhDaoTaoService::class);
        $result = $service->getMonDaHoanThanh($request->user());
        return $this->success($result);
    }

    /**
     * Lấy danh sách các môn học còn thiếu trong CTĐT
     */
    public function getMonConThieu(Request $request): JsonResponse
    {
        $service = app(SinhVienChuongTrinhDaoTaoService::class);
        $result = $service->getMonConThieu($request->user());
        return $this->success($result);
    }
}