<?php

namespace App\Http\Controllers\Api\GiangVien;

use App\Http\Controllers\Controller;
use App\Services\LichCoiThiService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class LichCoiThiController extends Controller
{
    protected $service;

    public function __construct(LichCoiThiService $service)
    {
        $this->service = $service;
    }

    public function getLichCoiThi(Request $request): JsonResponse
    {
        $giangVien = $request->user()->giangVien;
        $data = $this->service->getLichCoiThi($giangVien->GiangVienID);

        return $this->success($data, 'Lấy lịch coi thi thành công');
    }
}