<?php

namespace App\Http\Controllers\Api\GiangVien;

use App\Http\Controllers\Controller;
use App\Services\LopHocPhanService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

use Maatwebsite\Excel\Facades\Excel;
use App\Exports\DanhSachSinhVienLopExport;
use App\Imports\NhapDiemTuExcel;
use App\Models\LopHocPhan;                              

class LopHocPhanGiangVienController extends Controller
{
    protected $service;

    public function __construct(LopHocPhanService $service)
    {
        $this->service = $service;
    }

    public function getLopPhanCong(Request $request): JsonResponse
    {
        $giangVien = $request->user()->giangVien;
        $data = $this->service->getLopPhanCong($giangVien->GiangVienID);

        return $this->success($data, 'Lấy danh sách lớp phân công thành công');
    }

    // Xem danh sách sinh viên trong một lớp
    public function getSinhVienTrongLop(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'lopHocPhanID' => 'required|integer|exists:lophocphan,LopHocPhanID',
        ]);

        $lopHocPhanID = $validated['lopHocPhanID'];

        $giangVien = $request->user()->giangVien;
        if (!$giangVien) {
            return response()->json(['message' => 'Không tìm thấy thông tin giảng viên'], 403);
        }

        $lop = LopHocPhan::where('LopHocPhanID', $lopHocPhanID)
            ->where('GiangVienID', $giangVien->GiangVienID)
            ->first();

        if (!$lop) {
            return response()->json(['message' => 'Lớp học phần không thuộc quyền quản lý của bạn'], 403);
        }

        $sinhVienList = $this->service->getSinhVienTrongLop($lopHocPhanID);

        return $this->success($sinhVienList, 'Lấy danh sách sinh viên thành công');
    }

    public function getDanhSachIn(Request $request, $lopHocPhanID): JsonResponse
    {
        $data = $this->service->getDanhSachIn($lopHocPhanID);

        return $this->success($data, 'Lấy dữ liệu danh sách lớp để in thành công');
    }

    public function exportDiemTemplate($lopHocPhanID)
    {
        $giangVien = request()->user()->giangVien;
        $lop = LopHocPhan::where('LopHocPhanID', $lopHocPhanID)
            ->where('GiangVienID', $giangVien->GiangVienID)
            ->firstOrFail();

        return Excel::download(
            new DanhSachSinhVienLopExport($lopHocPhanID),
            'danh-sach-lop-' . $lop->MaLopHP . '-nhap-diem.xlsx'
        );
    }

    /**
     * Import điểm từ file Excel đã điền
     */
    public function importDiemFromExcel(Request $request, $lopHocPhanID)
    {
        $request->validate([
            'file' => 'required|mimes:xlsx,xls,csv|max:10240', // max 10MB
        ]);

        // Kiểm tra quyền lớp
        $giangVien = $request->user()->giangVien;
        LopHocPhan::where('LopHocPhanID', $lopHocPhanID)
            ->where('GiangVienID', $giangVien->GiangVienID)
            ->firstOrFail();

        Excel::import(new NhapDiemTuExcel($lopHocPhanID), $request->file('file'));

        return response()->json([
            'success' => true,
            'message' => 'Nhập điểm từ Excel thành công. Điểm đã được cập nhật vào hệ thống.'
        ]);
    }

    public function updateDiem(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'lop_hoc_phan_id' => 'required|integer|exists:lophocphan,LopHocPhanID',
            'sinh_vien_id'    => 'required|integer|exists:sinhvien,SinhVienID',
            'diem_chuyen_can' => 'nullable|numeric|min:0|max:10',
            'diem_giua_ky'    => 'nullable|numeric|min:0|max:10',
            'diem_thi'        => 'nullable|numeric|min:0|max:10',
        ]);

        // Kiểm tra quyền: Lớp này phải thuộc về giảng viên đang đăng nhập
        $giangVien = $request->user()->giangVien;
        if (!$giangVien) {
            return response()->json(['message' => 'Không tìm thấy thông tin giảng viên'], 403);
        }

        \App\Models\LopHocPhan::where('LopHocPhanID', $validated['lop_hoc_phan_id'])
            ->where('GiangVienID', $giangVien->GiangVienID)
            ->firstOrFail();

        $result = $this->service->capNhatDiemSinhVien($validated);

        return response()->json($result);
    }

    /**
     * Giảng viên cập nhật hình thức thi và thông tin lịch thi
     */
    public function updateLichThi(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'LichThiID'   => 'required|exists:lichthi,LichThiID',
            'HinhThucThi' => 'required|string|in:Tự luận,Trắc nghiệm,Báo cáo',
            'PhongThi'    => 'sometimes|string|max:50',
            'GhiChu'      => 'nullable|string'
        ]);

        $giangVien = $request->user()->giangVien;
        
        // Kiểm tra xem lịch thi này có thuộc lớp của giảng viên này không
        $lichThi = \App\Models\LichThi::whereHas('lopHocPhan', function($q) use ($giangVien) {
            $q->where('GiangVienID', $giangVien->GiangVienID);
        })->find($validated['LichThiID']);

        if (!$lichThi) {
            return response()->json(['message' => 'Bạn không có quyền chỉnh sửa lịch thi này'], 403);
        }

        $lichThi->update($request->only(['HinhThucThi', 'PhongThi', 'GhiChu']));

        return response()->json(['success' => true, 'message' => 'Cập nhật hình thức thi thành công']);
    }
}