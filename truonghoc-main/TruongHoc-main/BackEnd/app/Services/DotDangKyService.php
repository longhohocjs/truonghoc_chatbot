<?php

namespace App\Services;

use App\Models\DotDangKy;
use App\Models\HocKy;
use App\Services\LogService;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

class DotDangKyService
{
    protected $logService;

    public function __construct(LogService $logService)
    {
        $this->logService = $logService;
    }

    public function getDanhSachDot(int $namHocId = null, int $hocKyId = null)
    {
        $query = DotDangKy::query()->with('hocKy.namHoc');

        if ($hocKyId) {
            $query->where('HocKyID', $hocKyId);
        } elseif ($namHocId) {
            $query->whereHas('hocKy', function ($q) use ($namHocId) {
                $q->where('NamHocID', $namHocId);
            });
        }

        return $query->orderBy('NgayBatDau', 'desc')->get();
    }

    public function getLopHocPhanTheoDot(int $dotId, array $filters = [])
    {
        $dot = DotDangKy::findOrFail($dotId);
        
        $query = \App\Models\LopHocPhan::where('HocKyID', $dot->HocKyID)
            ->with(['monHoc', 'giangVien']);

        if (!empty($filters['KhoaID']) || !empty($filters['NganhID'])) {
            $query->whereHas('monHoc.chuongTrinhDaoTao.nganhDaoTao', function ($q) use ($filters) {
                if (!empty($filters['NganhID'])) {
                    $q->where('NganhID', $filters['NganhID']);
                }
                if (!empty($filters['KhoaID'])) {
                    $q->where('KhoaID', $filters['KhoaID']);
                }
            });
        }

        return $query->get();
    }

    public function create(array $data, HocKy $hocKy): DotDangKy
    {
        $tenDot = $data['TenDot'] ?? "Đợt đăng ký " . $hocKy->TenHocKy;

        return DotDangKy::create([
            'HocKyID'     => $hocKy->HocKyID,
            'TenDot'      => $tenDot,
            'NgayBatDau'  => $data['NgayBatDau'],
            'NgayKetThuc' => $data['NgayKetThuc'],
            'TrangThai'   => $data['TrangThai'] ?? 1,
        ]);
    }

    public function update(DotDangKy $dot, array $data): DotDangKy
    {
        $dot->update([
            'TenDot'      => $data['TenDot'] ?? $dot->TenDot,
            'NgayBatDau'  => $data['NgayBatDau'] ?? $dot->NgayBatDau,
            'NgayKetThuc' => $data['NgayKetThuc'] ?? $dot->NgayKetThuc,
            'TrangThai'   => isset($data['TrangThai']) ? $data['TrangThai'] : $dot->TrangThai,
        ]);

        $this->logAction(
            'CAP_NHAT_DOT',
            "Cập nhật đợt ID {$dot->DotDangKyID}: {$dot->NgayBatDau} → {$dot->NgayKetThuc}"
        );

        return $dot;
    }

    public function changeStatus(DotDangKy $dot, int $trangThai): DotDangKy
    {
        $dot->update(['TrangThai' => $trangThai]);

        $statusLabel = $trangThai === 1 ? 'Kích hoạt' : 'Khóa cứng';

        $this->logAction(
            'DOI_TRANG_THAI_DOT',
            "{$statusLabel} đợt đăng ký ID: {$dot->DotDangKyID}"
        );

        return $dot;
    }

    public function closeAllOpenByHocKy(int $hocKyId): int
    {
        $count = DotDangKy::where('HocKyID', $hocKyId)
            ->where('TrangThai', 1)
            ->update(['TrangThai' => 0]);

        if ($count > 0) {
            $this->logAction(
                'DONG_TAT_CA_DOT',
                "Đóng {$count} đợt đăng ký đang mở của học kỳ ID {$hocKyId}"
            );
        }

        return $count;
    }

    private function logAction(string $action, string $description, int $id = null)
    {
        $this->logService->write($action, $description, 'dotdangky', $id);
    }
}