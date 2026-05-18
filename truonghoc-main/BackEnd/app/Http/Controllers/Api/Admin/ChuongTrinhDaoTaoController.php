<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\ChuongTrinhDaoTao;
use Illuminate\Http\Request;
use Maatwebsite\Excel\Facades\Excel;

class ChuongTrinhDaoTaoController extends Controller
{
    protected $ctdtService;

    public function __construct(\App\Services\ChuongTrinhDaoTaoService $ctdtService)
    {
        $this->ctdtService = $ctdtService;
    }

    public function index(Request $request)
    {
        $filters = $request->validate([
            'KhoaID'    => 'nullable|exists:khoa,KhoaID',
            'NganhID'   => 'nullable|exists:nganhdaotao,NganhID',
            'HocKyGoiY' => 'nullable|integer',
            'search'    => 'nullable|string',
            'per_page'  => 'nullable|integer|min:1'
        ]);

        $data = $this->ctdtService->layDanhSachCTDT($filters);

        return response()->json([
            'message' => 'Lấy danh sách CTĐT thành công',
            'data'    => $data
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'NganhID'     => 'required|exists:nganhdaotao,NganhID',
            'MonHocID'    => 'required|exists:monhoc,MonHocID',
            'HocKyGoiY'   => 'required|integer|min:1|max:12',
            'BatBuoc'     => 'required|boolean',
            'KhoiKienThuc' => 'required|string|in:DaiCuong,CoSoNganh,ChuyenNganh,TotNghiep,ChuanDauRa',
        ]);

        try {
            $ctdt = $this->ctdtService->themMonVaoCTDT($data);
            return response()->json([
                'message' => 'Thêm môn vào CTĐT thành công',
                'data'    => $ctdt
            ], 201);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function update(Request $request)
    {
        $data = $request->validate([
            'ID'          => 'required|exists:chuongtrinhdaotao,ID',
            'HocKyGoiY'   => 'sometimes|required|integer|min:1|max:12',
            'BatBuoc'     => 'sometimes|required|boolean',
            'KhoiKienThuc' => 'sometimes|required|string|in:DaiCuong,CoSoNganh,ChuyenNganh,TotNghiep,ChuanDauRa',
        ]);

        $ctdt = ChuongTrinhDaoTao::findOrFail($data['ID']);
        $updated = $this->ctdtService->capNhatMonTrongCTDT($ctdt, $data);

        return response()->json([
            'message' => 'Cập nhật CTĐT thành công',
            'data'    => $updated
        ]);
    }

    public function ganNhieuMon(Request $request)
    {
        $data = $request->validate([
            'NganhID'     => 'required|exists:nganhdaotao,NganhID',
            'MonHocIDs'   => 'required|array',
            'MonHocIDs.*' => 'exists:monhoc,MonHocID',
            'HocKyGoiY'   => 'required|integer|min:1|max:12',
            'BatBuoc'     => 'required|boolean',
            'KhoiKienThuc' => 'required|string|in:DaiCuong,CoSoNganh,ChuyenNganh,TotNghiep,ChuanDauRa',
        ]);

        $inserted = $this->ctdtService->ganNhieuMonVaoCTDT($data);

        return response()->json([
            'message' => "Đã gán {$inserted} môn mới vào CTĐT ngành {$data['NganhID']}",
            'inserted' => $inserted
        ], 201);
    }

    public function import(Request $request)
    {
        $request->validate([
            'NganhID' => 'required|exists:nganhdaotao,NganhID',
            'file'    => 'required|mimes:xlsx,xls,csv|max:2048',
            'clear_existing' => 'nullable|boolean'
        ]);

        try {
            // Đọc dữ liệu từ Excel chuyển thành mảng
            $data = Excel::toArray([], $request->file('file'))[0];
            
            // Loại bỏ dòng header và chuyển thành mảng associative
            $header = array_shift($data);
            $rows = array_map(function($row) {
                return [
                    'MaMon'     => $row[0] ?? null,
                    'TenMon'    => $row[1] ?? '',
                    'SoTinChi'  => $row[2] ?? 3,
                    'KhoaID'    => $row[3] ?? null,
                    'TietLyThuyet' => $row[4] ?? 0,
                    'TietThucHanh' => $row[5] ?? 0,
                    'HocKyGoiY' => $row[6] ?? 1,
                    'BatBuoc'   => $row[7] ?? 1,
                    'MonTienQuyet' => $row[8] ?? '', // Danh sách mã môn: MH001,MH002
                    'MonSongHanh'  => $row[9] ?? '',
                    'KhoiKienThuc' => $row[10] ?? 'DaiCuong', // Thêm cột khối kiến thức (Cột K trong Excel)
                ];
            }, $data);

            $clearExisting = $request->boolean('clear_existing', false);
            $result = $this->ctdtService->importChuongTrinh($request->NganhID, $rows, $clearExisting);

            return response()->json($result);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Lỗi khi đọc file: ' . $e->getMessage()], 422);
        }
    }

    public function destroy($id)
    {
        try {
            $this->ctdtService->xoaMonKhoiCTDT($id);
            return response()->json([
                'message' => 'Xóa môn khỏi chương trình đào tạo thành công'
            ]);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function destroyByNganh($nganhId)
    {
        try {
            // Kiểm tra ngành có tồn tại không
            if (!\App\Models\Nganh::where('NganhID', $nganhId)->exists()) {
                return response()->json(['message' => 'Ngành không tồn tại'], 404);
            }
            
            $this->ctdtService->xoaToanBoCTDT($nganhId);
            return response()->json([
                'message' => 'Đã xóa toàn bộ chương trình đào tạo của ngành thành công'
            ]);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }
}