<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Services\LopSinhHoatService;
use Illuminate\Http\Request;

class LopSinhHoatController extends Controller
{
    protected $lopService;

    public function __construct(LopSinhHoatService $lopService)
    {
        $this->lopService = $lopService;
    }

    public function index(Request $request)
    {
        $filters = $request->only(['KhoaID', 'NamNhapHoc']);
        $data = $this->lopService->filterLopSinhHoat($filters);
        
        return $this->success($data);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'MaLop'      => 'required|unique:lopsinhhoat,MaLop',
            'TenLop'     => 'required',
            'KhoaID'     => 'required|exists:khoa,KhoaID',
            'NamNhapHoc' => 'required|integer',
            'GiangVienID'=> 'nullable|exists:giangvien,GiangVienID'
        ]);

        $lop = $this->lopService->taoLopSinhHoat($data);
        return $this->created($lop, 'Thêm lớp thành công');
    }

    public function assignAdvisor(Request $request) 
    {
        $lopId = $request->input('LopSinhHoatID'); 
        $giangVienId = $request->input('GiangVienID');

        if (!$lopId) {
            return response()->json(['message' => 'Thiếu LopSinhHoatID'], 400);
        }

        try {
            $lop = $this->lopService->phanCongCoVan($lopId, $giangVienId);

            return $this->success($lop, 'Phân công giảng viên thành công');
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy lớp hoặc có lỗi xảy ra: ' . $e->getMessage()
            ], 404);
        }
    }

    public function addStudents(Request $request)
    {
        $lopId = $request->input('LopSinhHoatID'); 
        $danhSachSinhVien = $request->input('SinhVienID'); 
        $lopExists = \App\Models\LopSinhHoat::where('LopSinhHoatID', $lopId)->exists();

        if (!$lopId || empty($danhSachSinhVien)) {
            return response()->json(['message' => 'Thiếu LopSinhHoatID hoặc danh sách sinh viên'], 400);
        }

    
        if (!$lopExists) {
            return response()->json([
                'success' => false,
                'message' => "Lớp học với ID $lopId không tồn tại trong hệ thống."
            ], 404);
        }

        try {
            $this->lopService->themSinhVienVaoLop($lopId, $danhSachSinhVien);

            return $this->success(null, 'Thêm sinh viên vào lớp thành công');
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Lỗi: ' . $e->getMessage()
            ], 500);
        }
    }

    public function listStudents(Request $request) 
    {
        $id = $request->input('LopSinhHoatID'); 

        if (!$id) {
            return response()->json(['message' => 'Thiếu LopSinhHoatID'], 400);
        }

        $data = $this->lopService->getSinhVienTrongLopSinhHoat($id);
        return $this->success($data);
    }

    public function removeStudent(Request $request)
    {
        $data = $request->validate([
            'SinhVienID' => 'required|exists:sinhvien,SinhVienID'
        ]);

        $this->lopService->xoaSinhVienKhoiLop($data['SinhVienID']);
        return $this->success(null, 'Đã xóa sinh viên khỏi lớp');
    }
}