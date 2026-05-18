<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Services\LichHocService;
use Illuminate\Http\Request;
use Exception;

class LichHocController extends Controller
{
    protected $service;

    public function __construct(LichHocService $service) {
        $this->service = $service;
    }

    public function index(Request $request) {
        $data = $this->service->getDanhSachLopTheoKy(
            $request->input('NamHocID'), 
            $request->input('HocKyID')
        );
        return response()->json($data);
    }

    public function store(Request $request) {
        try {
            // Validate the incoming request data
            $validatedData = $request->validate([
                'LopHocPhanID' => 'required|exists:lophocphan,LopHocPhanID',
                'lich_hoc'     => 'required|array',
                'lich_hoc.*.NgayHoc' => 'required|integer|min:2|max:8', // Thứ 2 đến Chủ Nhật (8)
                'lich_hoc.*.TietBatDau' => 'required|integer|min:1|max:12',
                'lich_hoc.*.SoTiet' => 'required|integer|min:1|max:5',
                'lich_hoc.*.BuoiHoc' => 'required|string|in:Sáng,Chiều', // Thêm validation cho BuoiHoc
                'lich_hoc.*.PhongHoc' => 'required|string|max:50',
            ]);

            // Truyền nguyên mảng validated cho service xử lý nội bộ
            $res = $this->service->createLichHoc($validatedData);

            return response()->json($res, 201);
        } catch (\Throwable $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }
    }

    public function update(Request $request) {
        $id = $request->input('LichHocID');
        if (!$id) {
            return response()->json(['error' => 'LichHocID is required in JSON body'], 400);
        }

        try {
            $res = $this->service->updateLichHoc($id, $request->all());
            return response()->json($res);
        } catch (\Throwable $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }
    }
}