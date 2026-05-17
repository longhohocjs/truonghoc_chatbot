<?php

namespace App\Http\Controllers\Api\SinhVien;

use App\Http\Controllers\Controller;
use App\Models\DangKyHocPhan;
use App\Models\DotDangKy;
use App\Services\HocPhiService;
use Illuminate\Http\Request;


class HocPhiController extends Controller
{
    protected $hocPhiService;

    public function __construct(HocPhiService $hocPhiService)
    {
        $this->hocPhiService = $hocPhiService;
    }

    public function index(Request $request)
    {
        $sinhVien = $request->user()->sinhVien;
        if (!$sinhVien) return response()->json(['message' => 'Không tìm thấy SV'], 404);

        $data = $this->hocPhiService->getHocPhiHienTai($sinhVien->SinhVienID);
        
        return response()->json([
            'success' => true,
            'data' => $data
        ]);
    }

    public function studentConfirm(Request $request)
    {
        $sinhVien = $request->user()->sinhVien;
        if (!$sinhVien) return response()->json(['message' => 'Không tìm thấy SV'], 404);

        // Lấy đợt đăng ký hiện tại để xác định học kỳ cần xác nhận
        $dot = DotDangKy::where('TrangThai', 1)->orderByDesc('NgayKetThuc')->first();
        if (!$dot) return response()->json(['message' => 'Không có đợt học phí nào đang mở'], 400);

        // Cập nhật trạng thái "Sinh viên đã bấm xác nhận" cho các môn trong kỳ
        $updated = DangKyHocPhan::where('SinhVienID', $sinhVien->SinhVienID)
            ->whereHas('lopHocPhan', function ($q) use ($dot) {
                $q->where('HocKyID', $dot->HocKyID);
            })
            ->update(['SinhVienXacNhan' => 1]);

        return response()->json([
            'success' => true,
            'message' => 'Hệ thống đã ghi nhận thông báo nộp phí của bạn. Vui lòng đợi Admin phê duyệt.'
        ]);
    }
}