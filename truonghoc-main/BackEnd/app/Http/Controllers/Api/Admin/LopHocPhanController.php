<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\LopHocPhan;
use App\Services\LopHocPhanService;
use App\Models\YeuCauMoLop;
use App\Models\HocKy;
use App\Models\MonHoc;
use Illuminate\Http\Request;

class LopHocPhanController extends Controller
{
    protected $service;

    public function __construct(LopHocPhanService $service)
    {
        $this->service = $service;
    }

    public function index()
    {
        // Thực hiện quét và cập nhật trạng thái các lớp thiếu sĩ số cho các học kỳ hiện hành
        $hocKyIDs = \App\Models\HocKy::orderByDesc('HocKyID')->take(2)->pluck('HocKyID');
        foreach($hocKyIDs as $id) {
            $this->service->xuLyLopThieuSiSo($id);
        }

        // Lấy toàn bộ danh sách lớp học phần kèm các quan hệ để hiển thị ở Frontend
        // Thêm withCount để đếm sĩ số thực tế dựa trên trạng thái 'ThanhCong'
        $lops = LopHocPhan::withCount(['dangKyHocPhan as SoLuongHienTai' => function($query) {
            $query->where('TrangThai', 'ThanhCong');
        }])
        ->with(['monHoc', 'hocKy', 'giangVien', 'lichHoc', 'lichThi'])->get();

        return response()->json([
            'success' => true,
            'data'    => $lops
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'MonHocID'       => 'required|exists:monhoc,MonHocID',
            'HocKyID'        => 'required|exists:hocky,HocKyID',
            'MaLopHP'        => 'nullable|string|max:50|unique:lophocphan,MaLopHP',
            'SoLuongToiDa'   => 'nullable|integer|min:10',
            'KhoahocAllowed' => 'nullable|string|max:100',
            'NgayBatDau'     => 'nullable|date',
            'NgayKetThuc'    => 'nullable|date',
            'GiangVienID'    => 'nullable|exists:giangvien,GiangVienID',
        ]);

        // Tự động tạo mã lớp học phần: [LoaiHocKy][MaMon][STT]
        $hk = HocKy::findOrFail($data['HocKyID']);
        $mh = MonHoc::findOrFail($data['MonHocID']);
        
        $prefix = ($hk->LoaiHocKy ?? 'HK') . ($mh->MaMon ?? 'MON');
        
        // Đếm số lượng lớp đã mở của môn này trong học kỳ này để tính STT
        $count = LopHocPhan::where('HocKyID', $data['HocKyID'])
            ->where('MonHocID', $data['MonHocID'])
            ->count();
            
        $data['MaLopHP'] = $prefix . str_pad($count + 1, 3, '0', STR_PAD_LEFT);

        $data['NgayBatDau'] = $hk->NgayBatDau;
        $data['NgayKetThuc'] = $hk->NgayKetThuc;

        $lop = $this->service->taoLop($data);

        return response()->json([
            'message' => 'Tạo lớp học phần thành công',
            'data'    => $lop->load(['monHoc', 'hocKy', 'giangVien'])
        ], 201);
    }
    

    public function update(Request $request)
    {
        $id = $request->input('LopHocPhanID');
        $lop = LopHocPhan::findOrFail($id);

        $data = $request->validate([
            'LopHocPhanID'   => 'required|exists:lophocphan,LopHocPhanID',
            'MaLopHP'        => [
                'sometimes',
                'required',
                'string',
                'max:50',
                'unique:lophocphan,MaLopHP,' . $id . ',LopHocPhanID',
            ],
            'SoLuongToiDa'   => 'sometimes|nullable|integer|min:10',
            'KhoahocAllowed' => 'sometimes|nullable|string|max:100',
            'NgayBatDau'     => 'sometimes|required|date',
            'NgayKetThuc'    => 'sometimes|required|date|after_or_equal:NgayBatDau',
        ]);

        $updated = $this->service->capNhat($lop, $data);

        return response()->json([
            'message' => 'Cập nhật lớp thành công',
            'data'    => $updated
        ]);
    }

    public function assignGiangVien(Request $request)
    {
        $data = $request->validate([
            'LopHocPhanID' => 'required|exists:lophocphan,LopHocPhanID',
            'GiangVienID'  => 'required|exists:giangvien,GiangVienID',
        ]);

        $lop = LopHocPhan::findOrFail($data['LopHocPhanID']);
        
        // Kiểm tra xung đột lịch nếu lớp này đã được xếp lịch học
        if ($lop->lichHoc->isNotEmpty()) {
             // Gọi logic kiểm tra từ LichHocService tương tự như trên
        }

        $lop->update(['GiangVienID' => $data['GiangVienID']]);

        return response()->json([
            'message' => 'Phân công giảng viên thành công',
            'data'    => $lop
        ]);
    }

    public function setSiSo(Request $request)
    {
        $data = $request->validate([
            'LopHocPhanID' => 'required|exists:lophocphan,LopHocPhanID',
            'SoLuongToiDa' => 'required|integer|min:1',
        ]);

        $lop = LopHocPhan::findOrFail($data['LopHocPhanID']);
        $lop->update(['SoLuongToiDa' => $data['SoLuongToiDa']]);

        return response()->json([
            'message' => 'Cập nhật sĩ số tối đa thành công',
            'data'    => $lop
        ]);
    }

    /**
     * Xóa lớp học phần
     */
    public function destroy($id)
    {
        // Sử dụng withCount để kiểm tra xem đã có sinh viên đăng ký chưa
        $lop = LopHocPhan::withCount(['dangKyHocPhan'])->findOrFail($id);

        if ($lop->dang_ky_hoc_phan_count > 0) {
            return response()->json([
                'success' => false,
                'message' => "Không thể xóa lớp này vì đã có {$lop->dang_ky_hoc_phan_count} sinh viên đăng ký học phần."
            ], 400);
        }

        try {
            // Tự động xóa các dữ liệu liên quan như lịch học, lịch thi nếu cần (tùy thuộc vào thiết lập DB)
            $lop->delete();

            return response()->json([
                'success' => true,
                'message' => 'Xóa lớp học phần thành công'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Lỗi hệ thống khi xóa lớp: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getDanhSachYeuCau()
    {
        $data = YeuCauMoLop::with(['sinh_vien', 'mon_hoc'])
            ->orderBy('created_at', 'desc')
            ->get();
        return response()->json($data);
    }

    public function updateStatusYeuCau(Request $request, $id)
    {
        $yeuCau = YeuCauMoLop::findOrFail($id);
        $yeuCau->update(['TrangThai' => $request->status]);
        return response()->json(['success' => true]);
    }

    public function xoaYeuCau($id)
    {
        YeuCauMoLop::destroy($id);
        return response()->json(['success' => true]);
    }

    /**
     * Duyệt các yêu cầu mở lớp và chuyển thành lớp học phần thật
     */
    public function approveAndCreateClass(Request $request)
    {
        $data = $request->validate([
            'MonHocID' => 'required|exists:monhoc,MonHocID',
            'HocKyID'  => 'required|exists:hocky,HocKyID',
            'SoLuongToiDa' => 'required|integer|min:20',
        ]);

        return DB::transaction(function () use ($data) {
            // 1. Lấy danh sách sinh viên đã xin mở môn này
            $requests = YeuCauMoLop::where('MonHocID', $data['MonHocID'])
                ->where('TrangThai', 0)
                ->get();

            if ($requests->isEmpty()) {
                throw new \Exception("Không có yêu cầu nào cho môn học này.");
            }

            // 2. Tạo lớp học phần thật (sử dụng logic auto-code có sẵn)
            $lopData = [
                'MonHocID' => $data['MonHocID'],
                'HocKyID'  => $data['HocKyID'],
                'SoLuongToiDa' => $data['SoLuongToiDa'],
            ];
            // Gọi logic store có sẵn hoặc copy logic tạo mã vào đây
            $newClassResponse = $this->store(new Request($lopData));
            $newLop = $newClassResponse->original['data'];

            // 3. Tự động đăng ký cho những sinh viên đã xin mở lớp
            foreach ($requests as $req) {
                DangKyHocPhan::create([
                    'SinhVienID' => $req->SinhVienID,
                    'LopHocPhanID' => $newLop->LopHocPhanID,
                    'TrangThai' => 'ThanhCong',
                    'ThoiGianDangKy' => now(),
                ]);
                // Cập nhật trạng thái yêu cầu
                $req->update(['TrangThai' => 1]); // 1: Đã duyệt
            }

            return response()->json(['message' => "Đã tạo lớp {$newLop->MaLopHP} và tự động ghi danh " . $requests->count() . " sinh viên."]);
        });
    }
}