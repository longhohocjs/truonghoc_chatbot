<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\LopHocPhan;
use App\Models\Khoa;
use App\Models\DangKyHocPhan;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class ThongKeController extends Controller
{
    /**
     * Tổng hợp dữ liệu thống kê cho Dashboard Admin
     */
    public function index(): JsonResponse
    {
        try {
            // 1. Tính toán Summary
            $tongLhp = LopHocPhan::count();
            $tongChoNgoi = LopHocPhan::sum('SoLuongToiDa') ?: 0;
            $daDangKy = DangKyHocPhan::where('TrangThai', 'ThanhCong')->count();
            $tiLeLapDay = $tongChoNgoi > 0 ? round(($daDangKy / $tongChoNgoi) * 100, 1) : 0;

            // 2. Tối ưu dữ liệu biểu đồ bằng cách sử dụng GROUP BY (Tránh lỗi N+1 query)
            $slotsPerFaculty = DB::table('lophocphan')
                ->join('monhoc', 'lophocphan.MonHocID', '=', 'monhoc.MonHocID')
                ->select('monhoc.KhoaID', DB::raw('SUM(SoLuongToiDa) as total'))
                ->groupBy('monhoc.KhoaID')
                ->pluck('total', 'KhoaID');

                $registrationsPerFaculty = DB::table('dangkyhocphan')
                ->join('lophocphan', 'dangkyhocphan.LopHocPhanID', '=', 'lophocphan.LopHocPhanID')
                ->join('monhoc', 'lophocphan.MonHocID', '=', 'monhoc.MonHocID')
                ->where('dangkyhocphan.TrangThai', 'ThanhCong')
                ->select('monhoc.KhoaID', DB::raw('COUNT(*) as registered'))
                ->groupBy('monhoc.KhoaID')
                ->pluck('registered', 'KhoaID');

            $chartData = Khoa::all()->map(function($khoa) use ($slotsPerFaculty, $registrationsPerFaculty) {
                $total = $slotsPerFaculty->get($khoa->KhoaID, 0);
                $registered = $registrationsPerFaculty->get($khoa->KhoaID, 0);

                return [
                    'name' => $khoa->TenKhoa,
                    'registered' => (int)$registered,
                    'total' => (int)$total ?: 1, // Tránh chia cho 0
                ];
            });

            // 3. Danh sách lớp tiêu biểu (Tỉ lệ đăng ký cao nhất)
            $topClasses = LopHocPhan::with('monHoc')
                ->withCount(['dangKyHocPhan as si_so' => function($q) {
                    $q->where('TrangThai', 'ThanhCong');
                }])
                ->get()
                ->map(function($lop) {
                    $tiLe = $lop->SoLuongToiDa > 0 ? round(($lop->si_so / $lop->SoLuongToiDa) * 100) : 0;
                    return [
                        'ma_lhp' => $lop->MaLopHP,
                        'ten_mon' => $lop->monHoc->TenMon ?? 'N/A',
                        'ti_le' => $tiLe,
                        'si_so' => "{$lop->si_so}/{$lop->SoLuongToiDa}",
                    ];
                })
                ->sortByDesc('ti_le')
                ->take(5)
                ->values();

            return response()->json([
                'status' => 'success',
                'data' => [
                    'summary' => [
                        'tong_lhp' => $tongLhp,
                        'tong_cho_ngoi' => $tongChoNgoi,
                        'da_dang_ky' => $daDangKy,
                        'ti_le_lap_day' => $tiLeLapDay,
                    ],
                    'chartData' => $chartData,
                    'topClasses' => $topClasses
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage()
            ], 500);
        }
    }
}