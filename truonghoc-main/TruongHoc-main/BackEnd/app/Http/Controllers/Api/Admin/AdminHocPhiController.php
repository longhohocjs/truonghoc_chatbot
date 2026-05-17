<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\DangKyHocPhan;
use App\Models\SinhVien;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminHocPhiController extends Controller
{
    public function index(Request $request)
    {
        $filters = $request->only(['KhoaID', 'NganhID', 'search', 'HocKyID', 'page', 'per_page']);

        $query = SinhVien::with([
            'khoa',
            'nganh',
            'dangKyHocPhan' => function($q) use ($filters) {
                $q->where('TrangThai', 'ThanhCong');
                // Lọc đăng ký theo học kỳ nếu có truyền lên
                if (!empty($filters['HocKyID'])) {
                    $q->whereHas('lopHocPhan', function($sq) use ($filters) {
                        $sq->where('HocKyID', $filters['HocKyID']);
                    });
                }
                $q->with('lopHocPhan.monHoc');
            }
        ]);

        if (!empty($filters['search'])) {
            $query->where(function ($q) use ($filters) {
                $q->where('MaSV', 'like', "%{$filters['search']}%")
                  ->orWhere('HoTen', 'like', "%{$filters['search']}%");
            });
        }
        if (!empty($filters['KhoaID'])) $query->where('KhoaID', $filters['KhoaID']);
        if (!empty($filters['NganhID'])) $query->where('NganhID', $filters['NganhID']);

        return response()->json([
            'success' => true,
            'data' => $query->paginate($filters['per_page'] ?? 20)
        ]);
    }

    public function confirmPayment(Request $request)
    {
        $request->validate([
            'SinhVienID' => 'required',
            'HocKyID' => 'required'
        ]);

        // Xác nhận thanh toán cho tất cả môn trong học kỳ đó của sinh viên
        $updated = DangKyHocPhan::where('SinhVienID', $request->SinhVienID)
            ->whereHas('lopHocPhan', function($q) use ($request) {
                $q->where('HocKyID', $request->HocKyID);
            })
            ->update(['TrangThaiThanhToan' => 1]);

        return response()->json([
            'success' => true,
            'message' => "Đã xác nhận thanh toán cho {$updated} học phần."
        ]);
    }
}