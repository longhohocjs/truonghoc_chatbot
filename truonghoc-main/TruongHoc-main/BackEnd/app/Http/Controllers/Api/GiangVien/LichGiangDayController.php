<?php

namespace App\Http\Controllers\Api\GiangVien;

use App\Http\Controllers\Controller;
use App\Models\LopHocPhan;
use Illuminate\Http\Request;

class LichGiangDayController extends Controller
{
    public function getLichGiangDay(Request $request)
    {
        $giangVien = $request->user()->giangVien;
        
        if (!$giangVien) {
            return response()->json(['message' => 'Không tìm thấy thông tin giảng viên'], 404);
        }

        // QUAN TRỌNG: Phải có with(['monHoc', 'lichHoc'])
        $lichDay = LopHocPhan::with(['monHoc', 'lichHoc'])
            ->where('GiangVienID', $giangVien->GiangVienID)
            ->get();

        return response()->json([
            'success' => true,
            'data' => $lichDay
        ]);
    }
}