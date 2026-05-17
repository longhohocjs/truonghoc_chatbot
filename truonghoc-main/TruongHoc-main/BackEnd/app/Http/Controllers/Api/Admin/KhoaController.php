<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Nganh; // Import Nganh model
use App\Models\Khoa;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;


class KhoaController extends Controller
{
    /**
     * Lấy danh sách khoa kèm theo các ngành thuộc khoa đó
     */
    public function index(): JsonResponse
    {
        // Eager loading 'nganhs' để frontend hiển thị được danh sách ngành
        $khoas = Khoa::with('nganhs')->get();

        return response()->json([
            'status' => 'success',
            'data' => $khoas
        ]);
    }

    /**
     * Lưu thông tin khoa mới
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'MaKhoa'  => 'required|string|unique:khoa,MaKhoa|max:20',
            'TenKhoa' => 'required|string|max:255',
        ]);

        $khoa = Khoa::create($validated);

        return response()->json([
            'status' => 'success',
            'data' => $khoa
        ], 201);
    }

    /**
     * Cập nhật thông tin khoa
     */
    public function update(Request $request, $id): JsonResponse
    {
        $khoa = Khoa::findOrFail($id);
        
        $validated = $request->validate([
            'MaKhoa'  => 'required|string|max:20|unique:khoa,MaKhoa,' . $id . ',KhoaID',
            'TenKhoa' => 'required|string|max:255',
        ]);

        $khoa->update($validated);

        return response()->json([
            'status' => 'success',
            'message' => 'Cập nhật khoa thành công',
            'data' => $khoa
        ]);
    }

    /**
     * Lưu thông tin ngành mới
     */
    public function storeNganh(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'KhoaID'  => 'required|integer|exists:khoa,KhoaID',
            'MaNganh' => 'required|string|unique:nganhdaotao,MaNganh|max:20',
            'TenNganh' => 'required|string|max:255',
        ]);

        $nganh = Nganh::create($validated);

        return response()->json([
            'status' => 'success',
            'data' => $nganh
        ], 201);
    }

    /**
     * Cập nhật thông tin ngành
     */
    public function updateNganh(Request $request, $id): JsonResponse
    {
        $nganh = Nganh::findOrFail($id);
        
        $validated = $request->validate([
            'KhoaID'  => 'required|integer|exists:khoa,KhoaID',
            'MaNganh' => 'required|string|max:20|unique:nganhdaotao,MaNganh,' . $id . ',NganhID',
            'TenNganh' => 'required|string|max:255',
        ]);

        $nganh->update($validated);

        return response()->json([
            'status' => 'success',
            'message' => 'Cập nhật ngành thành công',
            'data' => $nganh
        ]);
    }

    /**
     * Lấy danh sách ngành thuộc một khoa cụ thể
     */
    public function getNganhByKhoa($id): JsonResponse
    {
        $khoa = Khoa::with('nganhs')->findOrFail($id);
        
        return response()->json([
            'status' => 'success',
            'data' => $khoa->nganhs
        ]);
    }

    /**
     * Xóa khoa
     */
    public function destroy($id): JsonResponse
    {
        // Kiểm tra tất cả các ràng buộc liên quan đến Khoa
        $khoa = Khoa::withCount(['nganhs', 'monHocs', 'giangViens', 'lopSinhHoats'])->findOrFail($id);
        
        $errors = [];
        if ($khoa->nganhs_count > 0) $errors[] = "còn {$khoa->nganhs_count} ngành đào tạo";
        if ($khoa->mon_hocs_count > 0) $errors[] = "còn {$khoa->mon_hocs_count} môn học";
        if ($khoa->giang_viens_count > 0) $errors[] = "còn {$khoa->giang_viens_count} giảng viên";
        if ($khoa->lop_sinh_hoats_count > 0) $errors[] = "còn {$khoa->lop_sinh_hoats_count} lớp sinh hoạt";

        if (!empty($errors)) {
            $message = "Không thể xóa khoa {$khoa->TenKhoa} vì: " . implode(', ', $errors) . ".";
            return response()->json([
                'status' => 'error',
                'message' => $message
            ], 400);
        }

        try {
            $khoa->delete();
            return response()->json([
                'status' => 'success',
                'message' => 'Xóa khoa thành công'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Lỗi hệ thống khi xóa khoa: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Xóa ngành
     */
    public function destroyNganh($id): JsonResponse
    {
        $nganh = Nganh::withCount(['chuongTrinhDaoTao', 'sinhViens'])->findOrFail($id);
        
        $errors = [];
        if ($nganh->chuong_trinh_dao_tao_count > 0) $errors[] = "còn {$nganh->chuong_trinh_dao_tao_count} chương trình đào tạo";
        if ($nganh->sinh_viens_count > 0) $errors[] = "còn {$nganh->sinh_viens_count} sinh viên";

        if (!empty($errors)) {
            $message = "Không thể xóa ngành {$nganh->TenNganh} vì: " . implode(', ', $errors) . ".";
            return response()->json([
                'status' => 'error',
                'message' => $message
            ], 400);
        }

        try {
            $nganh->delete();
            return response()->json([
                'status' => 'success',
                'message' => 'Xóa ngành thành công'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Lỗi hệ thống khi xóa ngành: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Lấy danh sách tất cả các ngành
     */
    public function getAllNganh(): JsonResponse
    {
        $nganhs = Nganh::all();

        return response()->json([
            'status' => 'success',
            'data' => $nganhs
        ]);
    }
}