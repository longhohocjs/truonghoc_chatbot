<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\NamHoc;
use App\Models\HocKy;
use App\Services\QuanLyNamHocService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class NamHocController extends Controller
{
    protected $namHocService;

    public function __construct(QuanLyNamHocService $namHocService)
    {
        $this->namHocService = $namHocService;
    }

    public function storeNamHoc(Request $request) {
    $data = $request->validate([
        'TenNamHoc' => 'required|string',
        'NgayBatDau' => 'required|date',
        'NgayKetThuc' => 'required|date',
    ]);

    return DB::transaction(function () use ($data) {
        $namHoc = NamHoc::create($data);
        $startDate = \Carbon\Carbon::parse($namHoc->NgayBatDau);

        // Cấu hình 3 học kỳ, mỗi kỳ đúng 4 tháng (Chia đều 12 tháng)
        $semesters = [
            ['Ten' => 'Học kỳ 1', 'Loai' => 'HK1'],
            ['Ten' => 'Học kỳ 2', 'Loai' => 'HK2'],
            ['Ten' => 'Học kỳ 3', 'Loai' => 'He'],
        ];

        foreach ($semesters as $index => $s) {
            // Kỳ 1 bắt đầu từ ngày bắt đầu năm học, các kỳ sau cộng thêm 4 tháng
            $hkStart = $startDate->copy()->addMonths($index * 4);
            // Kết thúc là 1 ngày trước khi bắt đầu kỳ kế tiếp
            $hkEnd = $hkStart->copy()->addMonths(4)->subDay();

            HocKy::create([
                'NamHocID'   => $namHoc->NamHocID,
                'TenHocKy'   => $s['Ten'],
                'LoaiHocKy'  => $s['Loai'],
                'NgayBatDau' => $hkStart->toDateString(),
                'NgayKetThuc' => $hkEnd->toDateString(),
            ]);
        }

        return response()->json($namHoc, 201);
    });
}

    public function updateNamHoc(Request $request, $id)
    {
        $request->validate([
            'TenNamHoc'   => 'required|string|max:50|unique:namhoc,TenNamHoc,' . $id . ',NamHocID',
            'NgayBatDau'  => 'required|date',
            'NgayKetThuc' => 'required|date|after_or_equal:NgayBatDau',
        ]);

        $namHoc = NamHoc::findOrFail($id);
        $namHoc->update($request->all());

        return response()->json(['message' => 'Cập nhật năm học thành công', 'data' => $namHoc]);
    }


    public function storeHocKy(Request $request)
    {
        $request->validate([
            'NamHocID'    => 'required|exists:namhoc,NamHocID',
            'TenHocKy'    => 'required|string|max:100',
            'LoaiHocKy'   => 'required|in:HK1,HK2,He',
            'NgayBatDau'  => 'required|date',
            'NgayKetThuc' => 'required|date|after_or_equal:NgayBatDau',
        ]);

        $exists = HocKy::where('NamHocID', $request->NamHocID)
            ->where('TenHocKy', $request->TenHocKy)
            ->exists();

        if ($exists) {
            return response()->json(['message' => 'Học kỳ này đã tồn tại trong năm học'], 422);
        }

        $hocKy = $this->namHocService->taoHocKy($request->all());

        return response()->json([
            'message' => 'Thêm học kỳ thành công',
            'data'    => $hocKy
        ], 201);
    }

    public function updateHocKy(Request $request, $id)
    {
        $request->validate([
            'NamHocID'    => 'required|exists:namhoc,NamHocID',
            'TenHocKy'    => 'required|string|max:100',
            'LoaiHocKy'   => 'required|in:HK1,HK2,He',
            'NgayBatDau'  => 'required|date',
            'NgayKetThuc' => 'required|date|after_or_equal:NgayBatDau',
        ]);

        $hocKy = HocKy::findOrFail($id);

        // Kiểm tra trùng lặp, loại trừ chính học kỳ đang cập nhật
        if (HocKy::where('NamHocID', $request->NamHocID)->where('TenHocKy', $request->TenHocKy)->where('HocKyID', '!=', $id)->exists()) {
            return response()->json(['message' => 'Học kỳ này đã tồn tại trong năm học'], 422);
        }

        $hocKy->update($request->all());
        return response()->json(['message' => 'Cập nhật học kỳ thành công', 'data' => $hocKy]);
    }

    public function getDanhSachHocKy(Request $request)
    {
        $query = HocKy::with('namHoc');
        $now = now()->toDateString();

        if ($request->filled('nam_hoc_id')) {
            $query->where('NamHocID', $request->nam_hoc_id);
        }

        $list = $query->orderByDesc('NamHocID')->orderBy('LoaiHocKy')->get()->map(function($hk) use ($now) {
            if ($hk->NgayKetThuc < $now) {
                $hk->TrangThaiHienTai = 'Đã qua';
                $hk->TrangThaiCode = 'PAST';
            } elseif ($hk->NgayBatDau > $now) {
                $hk->TrangThaiHienTai = 'Chưa học';
                $hk->TrangThaiCode = 'FUTURE';
            } else {
                $hk->TrangThaiHienTai = 'Đang học';
                $hk->TrangThaiCode = 'CURRENT';
            }
            return $hk;
        });

        return response()->json([
            'message' => 'Lấy danh sách học kỳ thành công',
            'data'    => $list
        ]);
    }

    public function getDanhSachNamHoc()
    {
        $now = now()->toDateString();
        $list = NamHoc::orderByDesc('NamHocID')->get()->map(function($nh) use ($now) {
            if ($nh->NgayKetThuc < $now) {
                $nh->TrangThaiHienTai = 'Đã qua';
                $nh->TrangThaiCode = 'PAST';
            } elseif ($nh->NgayBatDau > $now) {
                $nh->TrangThaiHienTai = 'Chưa học';
                $nh->TrangThaiCode = 'FUTURE';
            } else {
                $nh->TrangThaiHienTai = 'Đang học';
                $nh->TrangThaiCode = 'CURRENT';
            }
            return $nh;
        });

        return response()->json([
            'message' => 'Lấy danh sách năm học thành công',
            'data'    => $list
        ]);
    }

    public function destroyNamHoc($id)
    {
        $namHoc = NamHoc::findOrFail($id);
        
        // Kiểm tra xem có học kỳ nào thuộc năm học này không
        if (HocKy::where('NamHocID', $id)->exists()) {
            return response()->json(['message' => 'Không thể xóa năm học đã có dữ liệu học kỳ.'], 422);
        }

        $namHoc->delete();
        return response()->json(['message' => 'Xóa năm học thành công']);
    }

    public function destroyHocKy($id)
    {
        $hocKy = HocKy::findOrFail($id);

        // Kiểm tra xem có dữ liệu liên quan không (Lớp học phần, Đợt đăng ký)
        if (\App\Models\LopHocPhan::where('HocKyID', $id)->exists() || \App\Models\DotDangKy::where('HocKyID', $id)->exists()) {
            return response()->json(['message' => 'Không thể xóa học kỳ đã có dữ liệu lớp học hoặc đợt đăng ký.'], 422);
        }

        $hocKy->delete();
        return response()->json(['message' => 'Xóa học kỳ thành công']);
    }
}