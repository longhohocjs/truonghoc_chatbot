<?php

namespace App\Services;

use App\Models\MonHoc;
use App\Models\DieuKienMonHoc;
use App\Models\DangKyHocPhan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

class MonHocService
{
    public function getMonHocList(array $filters = [])
    {
        // Eager loading các môn tiên quyết và song hành để frontend hiển thị được
        $query = MonHoc::with([
            'khoa',
            'monTienQuyet' => function ($q) {
                $q->wherePivot('Loai', 1); // Chỉ lấy môn có Loai = 1 (Tiên quyết)
            },
            'monSongHanh' => function ($q) {
                $q->wherePivot('Loai', 2); // Chỉ lấy môn có Loai = 2 (Song hành)
            }
        ]);

        if (!empty($filters['KhoaID'])) {
            $query->where('KhoaID', $filters['KhoaID']);
        }

        // Áp dụng bộ lọc theo Ngành chỉ khi không có từ khóa tìm kiếm chung.
        // Điều này cho phép tìm kiếm môn học tự do (chưa gán CTĐT) bằng tên/mã môn.
        if (!empty($filters['NganhID']) && empty($filters['search'])) {
            $query->whereHas('chuongTrinhDaoTao', function ($q) use ($filters) {
                $q->where('NganhID', $filters['NganhID']);
            });
        }

        // Áp dụng bộ lọc tìm kiếm chung (tên môn hoặc mã môn).
        // Bộ lọc này sẽ hoạt động độc lập và có thể tìm thấy các môn học
        // chưa được gán vào CTĐT nếu không có bộ lọc Ngành cụ thể.
        if (!empty($filters['search'])) {
            $query->where(function ($q) use ($filters) {
                $q->where('monhoc.TenMon', 'like', '%' . $filters['search'] . '%')
                  ->orWhere('monhoc.MaMon', 'like', '%' . $filters['search'] . '%');
            });
        }

        // Sắp xếp môn học mới nhất lên đầu để người dùng thấy ngay sau khi thêm
        $query->orderBy('MonHocID', 'desc');

        // Nếu có tham số phân trang thì thực hiện paginate, ngược lại lấy toàn bộ (cho dropdown)
        return (isset($filters['page']) || isset($filters['per_page']))
            ? $query->paginate($filters['per_page'] ?? 15)
            : $query->get();
    }
    
    public function createMonHoc(array $data): MonHoc
    {
        $monHoc = DB::transaction(function () use ($data) {
            // 1. Kiểm tra trùng lặp: Nếu trùng Tên môn và Số tín chỉ thì không cho tạo
            $exists = MonHoc::where('TenMon', $data['TenMon'])
                ->where('SoTinChi', $data['SoTinChi'])
                ->first();

            if ($exists) {
                throw new \Exception("Môn học '{$data['TenMon']}' với {$data['SoTinChi']} tín chỉ đã tồn tại (Mã: {$exists->MaMon}).");
            }

            // 2. Tự động tạo mã môn học dựa theo mã khoa (VD: CNTT001)
            $khoa = \App\Models\Khoa::findOrFail($data['KhoaID']);
            $prefix = $khoa->MaKhoa;
            $countInFaculty = MonHoc::where('KhoaID', $data['KhoaID'])->count();
            $nextCode = $prefix . str_pad($countInFaculty + 1, 3, '0', STR_PAD_LEFT);

            // Logic tính toán tiết học tự động
            $tinChi = $data['SoTinChi'] ?? 3;
            $loai = $data['LoaiMonHoc'] ?? 'Lý thuyết';
            $tietLT = 0; $tietTH = 0;

            switch ($loai) {
                case 'Thực hành': case 'Thực tập':
                    $tietTH = $tinChi * 30; // 1 tín TH = 30 tiết
                    break;
                case 'Tích hợp':
                    // Ưu tiên chia 2 LT + 1 TH cho môn 3 tín
                    $tietLT = ($tinChi - 1) * 15;
                    $tietTH = 1 * 30;
                    break;
                case 'Đồ án':
                    $tietTH = $tinChi * 45; // Đồ án cần nhiều thời gian hướng dẫn/tự học hơn
                    break;
                default: // Lý thuyết
                    $tietLT = $tinChi * 15; // 1 tín LT = 15 tiết
            }

            $newMon = MonHoc::create([
                'MaMon'         => $nextCode,
                'TenMon'        => $data['TenMon'],
                'SoTinChi'      => $tinChi,
                'HinhThucHoc'   => $data['HinhThucHoc'] ?? 'Trực tiếp',
                'TietLyThuyet'  => $tietLT,
                'TietThucHanh'  => $tietTH,
                'LoaiMonHoc'    => $loai,
                'KhoaID'        => $data['KhoaID'],
            ]);

            // Đồng bộ môn tiên quyết và song hành
            $this->syncDieuKien($newMon, $data['mon_tien_quyet'] ?? [], $data['mon_song_hanh'] ?? []);

            return $newMon;
        });

        $this->logAction('CREATE', "Tạo môn học: {$monHoc->TenMon}", 'monhoc', $monHoc->MonHocID);
        return $monHoc;
    }

    public function updateMonHoc(int $monHocId, array $data): MonHoc
    {
        $monHoc = MonHoc::findOrFail($monHocId);

        DB::transaction(function () use ($monHoc, $data) {
            // Kiểm tra trùng lặp khi cập nhật (loại trừ chính nó)
            if (isset($data['TenMon']) && isset($data['SoTinChi'])) {
                $exists = MonHoc::where('TenMon', $data['TenMon'])
                    ->where('SoTinChi', $data['SoTinChi'])
                    ->where('MonHocID', '!=', $monHoc->MonHocID)
                    ->exists();
                if ($exists) {
                    throw new \Exception("Tên môn và số tín chỉ này đã tồn tại ở một môn học khác.");
                }
            }

            $loaiMonHocMoi = $data['LoaiMonHoc'] ?? $monHoc->LoaiMonHoc;
            $soTinChiMoi = $data['SoTinChi'] ?? $monHoc->SoTinChi;
            $tietLyThuyetMoi = $data['TietLyThuyet'] ?? null; // Sử dụng null để biết có được cung cấp hay không
            $tietThucHanhMoi = $data['TietThucHanh'] ?? null; // Sử dụng null để biết có được cung cấp hay không

            // Chỉ tính toán lại TietLyThuyet và TietThucHanh nếu chúng không được cung cấp trực tiếp
            // HOẶC nếu LoaiMonHoc hoặc SoTinChi thay đổi (để đảm bảo tính nhất quán)
            if ($tietLyThuyetMoi === null || $tietThucHanhMoi === null || isset($data['LoaiMonHoc']) || isset($data['SoTinChi'])) {
                switch ($loaiMonHocMoi) {
                    case 'Thực hành':
                    case 'Thực tập':
                        $tietThucHanhMoi = $soTinChiMoi * 30; // 1 tín TH = 30 tiết
                        $tietLyThuyetMoi = 0;
                        break;
                    case 'Tích hợp':
                        $tietThucHanhMoi = ($soTinChiMoi >= 1) ? 1 * 30 : 0; // Giả định ít nhất 1 tín chỉ là TH
                        $tietLyThuyetMoi = ($soTinChiMoi > 1) ? ($soTinChiMoi - 1) * 15 : 0;
                        break;
                    case 'Đồ án':
                        $tietThucHanhMoi = $soTinChiMoi * 45; // Đồ án cần nhiều thời gian hướng dẫn/tự học hơn
                        $tietLyThuyetMoi = 0;
                        break;
                    default: // Lý thuyết
                        $tietLyThuyetMoi = $soTinChiMoi * 15; // 1 tín LT = 15 tiết
                        $tietThucHanhMoi = 0;
                }
            }
            
            $monHoc->update(array_merge($data, [
                'SoTinChi'     => $soTinChiMoi,
                'TietLyThuyet' => $tietLyThuyetMoi,
                'TietThucHanh' => $tietThucHanhMoi,
                'LoaiMonHoc'   => $loaiMonHocMoi,
            ]));

            // Cập nhật lại các môn điều kiện
            $this->syncDieuKien($monHoc, $data['mon_tien_quyet'] ?? [], $data['mon_song_hanh'] ?? []);
        });

        $this->logAction('UPDATE', "Cập nhật môn học: {$monHoc->TenMon}", 'monhoc', $monHoc->MonHocID);
        return $monHoc->fresh();
    }

    /**
     * Đồng bộ môn tiên quyết và môn song hành
     * Giả định Loai: 1 là Tiên quyết, 2 là Song hành
     */
    protected function syncDieuKien(MonHoc $monHoc, array $tienQuyetIds, array $songHanhIds)
    {
        // Xóa các điều kiện cũ
        DieuKienMonHoc::where('MonHocID', $monHoc->MonHocID)->delete();

        // Thêm môn tiên quyết
        foreach ($tienQuyetIds as $id) {
            DieuKienMonHoc::create([
                'MonHocID' => $monHoc->MonHocID,
                'MonTienQuyetID' => $id,
                'Loai' => 1 
            ]);
        }

        // Thêm môn song hành
        foreach ($songHanhIds as $id) {
            DieuKienMonHoc::create([
                'MonHocID' => $monHoc->MonHocID,
                'MonTienQuyetID' => $id,
                'Loai' => 2
            ]);
        }
    }

    public function addDieuKien(int $monHocId, int $monDieuKienId)
    {
        return DieuKienMonHoc::updateOrCreate([
            'MonHocID' => $monHocId,
            'MonTienQuyetID' => $monDieuKienId
        ]);
    }

    public function deleteMonHoc(int $id): bool
    {
        $monHoc = MonHoc::findOrFail($id);
        $this->logAction('DELETE', "Xóa môn học: {$monHoc->TenMon}", 'monhoc', $id);
        return $monHoc->delete();
    }

    protected function logAction($hanhDong, $moTa, $bang, $id)
    {

        DB::table('hethong_log')->insert([
            'UserID'       => Auth::id(),
            'HanhDong'     => $hanhDong,
            'MoTa'         => $moTa,
            'BangLienQuan' => $bang,
            'IDBanGhi'     => $id,
            'IP'           => request()->ip(),
            'UserAgent'    => request()->userAgent(),
            'created_at'   => now(),
        ]);
    }
}