<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Services\LichThiService;
use Illuminate\Validation\ValidationException;
use Illuminate\Http\Request;
use Exception;

class LichThiController extends Controller
{
    protected $service;

    public function __construct(LichThiService $service) {
        $this->service = $service;
    }

    public function store(Request $request) {
        try {
            // Validate the incoming request data
            $validatedData = $request->validate([
                'LopHocPhanID' => 'required|exists:lophocphan,LopHocPhanID',
                'lich_thi'     => 'required|array',
                'lich_thi.*.NgayThi' => 'required|date',
                'lich_thi.*.GioBatDau' => 'required|date_format:H:i:s',
                'lich_thi.*.GioKetThuc' => 'required|date_format:H:i:s|after:lich_thi.*.GioBatDau',
                'lich_thi.*.PhongThi' => 'required|string|max:50',
                'lich_thi.*.HinhThucThi' => 'required|string|in:Tự luận,Trắc nghiệm,Báo cáo',
            ]);

            // Truyền nguyên mảng validated bao gồm cả LopHocPhanID và mảng lich_thi
            $res = $this->service->createLichThi($validatedData);

            return response()->json($res, 201);
        } catch (ValidationException $e) {
            return response()->json(['errors' => $e->errors()], 422);
        } catch (\Throwable $e) {
            return response()->json(['message' => $e->getMessage()], 400);
        }
    }

    public function update(Request $request) {
        try {
            $validatedData = $request->validate([
                'LichThiID'   => 'required|exists:lichthi,LichThiID',
                'NgayThi'     => 'sometimes|required|date',
                'GioBatDau'   => 'sometimes|required|date_format:H:i:s',
                'GioKetThuc'  => 'sometimes|required|date_format:H:i:s|after:GioBatDau',
                'PhongThi'    => 'sometimes|required|string|max:50',
                'HinhThucThi' => 'sometimes|required|string|in:Tự luận,Trắc nghiệm,Báo cáo',
                'GhiChu'      => 'nullable|string|max:255',
            ]);

            $id = $validatedData['LichThiID'];
            $res = $this->service->updateLichThi($id, $validatedData);
            
            return response()->json($res);
        } catch (ValidationException $e) {
            return response()->json(['errors' => $e->errors()], 422);
        } catch (\Throwable $e) {
            return response()->json(['message' => $e->getMessage()], 400);
        }
    }
}