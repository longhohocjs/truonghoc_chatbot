<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Services\MonHocService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class MonHocController extends Controller
{
    protected $monHocService;

    public function index(Request $request)
    {
        // Đảm bảo page và per_page luôn được xử lý
        $filters = $request->validate([
            'KhoaID'   => 'nullable|exists:khoa,KhoaID',
            'NganhID'  => 'nullable|exists:nganhdaotao,NganhID',
            'search'   => 'nullable|string',
            'per_page' => 'sometimes|integer|min:1',
            'page'     => 'sometimes|integer|min:1',
        ]);

        $monHocs = $this->monHocService->getMonHocList($filters);

        return response()->json([
            'status' => 'success',
            'data' => $monHocs
        ]);
    }
    
    public function __construct(MonHocService $monHocService)
    {
        $this->monHocService = $monHocService;
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'MaMon'    => 'nullable',
            'TenMon'   => 'required|string',
            'SoTinChi' => 'required|integer|min:1|max:10',
            'KhoaID'   => 'required|exists:khoa,KhoaID',
            'TietLyThuyet' => 'nullable|integer|min:0',
            'TietThucHanh' => 'nullable|integer|min:0',
            'LoaiMonHoc'   => 'required|string|in:Lý thuyết,Thực hành,Đồ án,Thực tập,Tích hợp',
            // Thêm validation cho các mảng ID môn điều kiện
            'mon_tien_quyet'   => 'nullable|array',
            'mon_tien_quyet.*' => 'exists:monhoc,MonHocID',
            'mon_song_hanh'    => 'nullable|array',
            'mon_song_hanh.*'  => 'exists:monhoc,MonHocID',
        ]);

        $monHoc = $this->monHocService->createMonHoc($validated);
        return response()->json([
            'status' => 'success',
            'data' => $monHoc
        ], 201);
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'MonHocID' => 'required|exists:monhoc,MonHocID',
            'MaMon'    => 'nullable',
            'TenMon'   => 'sometimes|string',
            'SoTinChi' => 'sometimes|integer|min:1|max:10',
            'KhoaID'   => 'sometimes|exists:khoa,KhoaID',
            'TietLyThuyet' => 'sometimes|integer|min:0',
            'TietThucHanh' => 'sometimes|integer|min:0',
            'LoaiMonHoc'   => 'sometimes|string|in:Lý thuyết,Thực hành,Đồ án,Thực tập,Tích hợp',
            'mon_tien_quyet'   => 'nullable|array',
            'mon_tien_quyet.*' => 'exists:monhoc,MonHocID',
            'mon_song_hanh'    => 'nullable|array',
            'mon_song_hanh.*'  => 'exists:monhoc,MonHocID',
        ]);

        $monHoc = $this->monHocService->updateMonHoc($validated['MonHocID'], $validated);
        return response()->json([
            'status' => 'success',
            'data' => $monHoc
        ]);
    }

    public function addTienQuyet(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'mon_hoc_id'        => 'required|exists:monhoc,MonHocID',
            'mon_tien_quyet_id' => 'required|exists:monhoc,MonHocID|different:mon_hoc_id',
        ]);

        $record = $this->monHocService->addDieuKien($validated['mon_hoc_id'], $validated['mon_tien_quyet_id']);
        return response()->json(['message' => 'Gán điều kiện thành công', 'data' => $record]);
    }

    public function addSongHanh(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'mon_hoc_id'       => 'required|exists:monhoc,MonHocID',
            'mon_song_hanh_id' => 'required|exists:monhoc,MonHocID|different:mon_hoc_id',
        ]);

        $record = $this->monHocService->addDieuKien($validated['mon_hoc_id'], $validated['mon_song_hanh_id']);
        return response()->json(['message' => 'Gán môn song hành thành công', 'data' => $record]);
    }

    public function destroy($id): JsonResponse
    {
        try {
            $this->monHocService->deleteMonHoc($id);
            return response()->json([
                'message' => 'Xóa môn học thành công'
            ]);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }
}