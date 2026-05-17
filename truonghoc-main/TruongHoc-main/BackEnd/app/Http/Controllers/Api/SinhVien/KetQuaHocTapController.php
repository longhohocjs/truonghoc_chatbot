<?php
namespace App\Http\Controllers\Api\SinhVien;

use App\Http\Controllers\Controller;
use App\Services\KetQuaHocTapService;
use Illuminate\Http\Request;

class KetQuaHocTapController extends Controller {
    protected $service;

    public function __construct(KetQuaHocTapService $service) {
        $this->service = $service;
    }

    public function xemKetQua(Request $request) {
        $hocKyId = $request->input('HocKyID');
        $result = $this->service->getKetQuaTongHop($request->user(), $hocKyId);

        if (!$result['success']) {
            return $this->error($result['message'], 400);
        }

        return $this->success($result['data'], $result['message']);
    }
}