<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Services\DiemSoService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log; // Thêm dòng này
use Illuminate\Support\Facades\Auth;

class DiemSoController extends Controller
{
    protected $diemSoService;

    public function __construct(DiemSoService $diemSoService)
    {
        $this->diemSoService = $diemSoService;
    }

    public function indexLopHP(Request $request)
    {
        // Lấy trực tiếp từ input (Hỗ trợ cả JSON body và Query params)
        $lopHocPhanID = $request->input('LopHocPhanID');

        Log::info('DiemSoController@indexLopHP - ID detected:', ['id' => $lopHocPhanID]);

        // Truyền mảng chứa ID chuẩn cho Service
        $data = $this->diemSoService->getBangDiemLopHP(['LopHocPhanID' => $lopHocPhanID]);
        return response()->json([
            'status' => 'success',
            'data' => $data
        ]);
    }

    public function indexRenLuyen(Request $request)
    {
        $data = $this->diemSoService->getDiemRenLuyen($request->all());
        return response()->json([
            'status' => 'success',
            'data' => $data
        ]);
    }

    public function updateDiem(Request $request)
    {
        try {
            $userID = Auth::id() ?: 1; // Ưu tiên Auth ID, fallback về admin hệ thống
            $this->diemSoService->capNhatDiemLopHP($request->all(), $userID);
            return response()->json(['status' => 'success', 'message' => 'Cập nhật điểm thành công']);
        } catch (\Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }

    public function updateRenLuyen(Request $request)
    {
        try {
            $this->diemSoService->capNhatDiemRenLuyen($request->all());
            return response()->json(['status' => 'success', 'message' => 'Cập nhật điểm rèn luyện thành công']);
        } catch (\Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }

    public function lockDiem(Request $request)
    {
        $this->diemSoService->setLockStatus($request->input('LopHocPhanID'), 1);
        return response()->json(['status' => 'success', 'message' => 'Đã khóa nhập điểm']);
    }

    public function unlockDiem(Request $request)
    {
        $this->diemSoService->setLockStatus($request->input('LopHocPhanID'), 0);
        return response()->json(['status' => 'success', 'message' => 'Đã mở khóa nhập điểm']);
    }
}