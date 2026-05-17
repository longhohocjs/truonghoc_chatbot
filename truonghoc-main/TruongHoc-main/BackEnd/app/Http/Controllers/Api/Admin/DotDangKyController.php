<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\DotDangKy;
use App\Models\HocKy;
use App\Services\DotDangKyService;
use Illuminate\Http\Request;
use App\Models\LopHocPhan;
use Illuminate\Support\Facades\Auth;

class DotDangKyController extends Controller
{
    protected $dotDangKyService;

    public function __construct(DotDangKyService $dotDangKyService)
    {
        $this->dotDangKyService = $dotDangKyService;
    }

    public function index(Request $request)
    {
        $dots = $this->dotDangKyService->getDanhSachDot(
            $request->query('NamHocID'),
            $request->query('HocKyID')
        );

        return response()->json([
            'status' => 'success',
            'data' => $dots
        ]);
    }

    public function filterDots(Request $request)
    {
        $request->validate([
            'NamHocID' => 'nullable|integer',
            'HocKyID'  => 'nullable|integer',
        ]);

        $dots = $this->dotDangKyService->getDanhSachDot(
            $request->input('NamHocID'),
            $request->input('HocKyID')
        );

        return response()->json([
            'status' => 'success',
            'data' => $dots
        ]);
    }

    public function getLopHocPhanByJson(Request $request)
    {
        $request->validate([
            'DotDangKyID' => 'required|integer|exists:dotdangky,DotDangKyID',
        ]);

        // 1. Lấy thông tin đợt đăng ký hiện tại
        $dotDangKy = DotDangKy::findOrFail($request->input('DotDangKyID'));

        // 2. Lấy danh sách lớp học phần dựa trên HocKyID của đợt đăng ký
        //    và chỉ lấy các lớp đang hoạt động (TrangThai = 1)
        $lopHocPhanList = LopHocPhan::where('HocKyID', $dotDangKy->HocKyID)
                                    ->where('TrangThai', 1) // Chỉ lấy các lớp đang hoạt động
                                    ->with(['monHoc', 'giangVien']) // Tải các mối quan hệ cần thiết
                                    ->get();

        return response()->json([
            'success' => true,
            'data' => $lopHocPhanList,
            'dotDangKy' => $dotDangKy // Có thể trả về thông tin đợt đăng ký nếu cần
        ]);
    }

    public function storeDotDangKy(Request $request)
    {
        $request->validate([
            'HocKyID'     => 'required|exists:hocky,HocKyID',
            'NgayBatDau'  => 'required|date',
            'NgayKetThuc' => 'required|date|after:NgayBatDau',
            'TenDot'      => 'nullable|string|max:255',
            'TrangThai'   => 'nullable|in:0,1',
        ]);

        $hocKy = HocKy::findOrFail($request->HocKyID);

        $dot = $this->dotDangKyService->create($request->all(), $hocKy);

        return response()->json([
            'message' => 'Tạo đợt đăng ký thành công',
            'data'    => $dot
        ], 201);
    }

    public function updateDotDangKy(Request $request) 
    {
        $request->validate([
            'DotDangKyID' => 'required|exists:dotdangky,DotDangKyID',
            'TenDot'      => 'nullable|string|max:255',
            'NgayBatDau'  => 'required|date',
            'NgayKetThuc' => 'required|date|after:NgayBatDau',
            'TrangThai'   => 'nullable|in:0,1',
        ]);

        $dot = DotDangKy::findOrFail($request->DotDangKyID);

        $updatedDot = $this->dotDangKyService->update($dot, $request->all());

        return response()->json([
            'status'  => 'success',
            'message' => 'Cập nhật thành công',
            'data'    => $updatedDot
        ]);
    }

    public function changeStatusDotDangKy(Request $request) 
    {
        $request->validate([
            'DotDangKyID' => 'required|exists:dotdangky,DotDangKyID',
            'TrangThai'   => 'required|in:0,1'
        ]);

        $dot = DotDangKy::findOrFail($request->DotDangKyID);

        $updatedDot = $this->dotDangKyService->changeStatus($dot, $request->TrangThai);

        $statusLabel = $request->TrangThai == 1 ? 'Kích hoạt' : 'Khóa cứng';

        return response()->json([
            'status'  => 'success',
            'message' => "Đã {$statusLabel} đợt đăng ký thành công",
            'data'    => $updatedDot
        ]);
    }

    // BackEnd/app/Http/Controllers/Api/Admin/DotDangKyController.php

public function destroy($id)
{
    try {
        $dot = \App\Models\DotDangKy::findOrFail($id);

        // Kiểm tra xem đã có dữ liệu đăng ký liên quan chưa (Tùy chọn)
        // Nếu đã có sinh viên đăng ký, thường chúng ta không cho phép xóa
        $hasEnrollments = \App\Models\DangKyHocPhan::whereHas('lopHocPhan', function($q) use ($dot) {
            $q->where('HocKyID', $dot->HocKyID);
        })->exists();

        if ($hasEnrollments) {
            return response()->json([
                'message' => 'Không thể xóa đợt đăng ký này vì đã có dữ liệu sinh viên đăng ký học phần.'
            ], 422);
        }

        $dot->delete();

        return response()->json([
            'message' => 'Xóa đợt đăng ký thành công'
        ]);
    } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
        return response()->json(['message' => 'Không tìm thấy đợt đăng ký'], 404);
    } catch (\Exception $e) {
        // Trả về lỗi chi tiết để debug (trong môi trường dev)
        return response()->json([
            'message' => 'Lỗi hệ thống: ' . $e->getMessage()
        ], 500);
    }
}

}