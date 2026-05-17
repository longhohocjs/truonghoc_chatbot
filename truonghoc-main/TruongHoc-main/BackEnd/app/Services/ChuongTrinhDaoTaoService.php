<?php

namespace App\Services;

use App\Models\ChuongTrinhDaoTao;
use App\Models\User;
use App\Models\MonHoc;
use App\Models\Nganh;
use App\Models\DieuKienMonHoc;
use Illuminate\Support\Facades\DB;
use Exception;

class ChuongTrinhDaoTaoService
{
    /**
     * Lấy toàn bộ chương trình đào tạo của sinh viên dựa trên ngành
     */
    public function getProgramByStudent(User $user)
    {
        $sinhVien = $user->sinhVien;

        if (!$sinhVien || !$sinhVien->NganhID) {
            return [
                'success' => false,
                'message' => 'Sinh viên chưa được gán vào ngành học cụ thể.'
            ];
        }

        $ctdt = ChuongTrinhDaoTao::with(['monHoc'])
            ->where('NganhID', $sinhVien->NganhID)
            ->orderBy('HocKyGoiY', 'asc')
            ->get();

        return [
            'success' => true,
            'data' => [
                'nganh' => $sinhVien->nganh->TenNganh ?? 'N/A',
                'chuong_trinh' => $ctdt
            ]
        ];
    }

    /**
     * Lấy chi tiết các môn còn thiếu (Tách biệt Môn nợ và Môn chưa học)
     */
    public function getMissingSubjectsDetailed(User $user)
    {
        $sinhVien = $user->sinhVien;
        if (!$sinhVien) throw new Exception("Không tìm thấy thông tin sinh viên.");

        // 1. Lấy toàn bộ môn trong CTĐT của ngành
        $ctdt = ChuongTrinhDaoTao::with(['monHoc.khoa'])
            ->where('NganhID', $sinhVien->NganhID)
            ->get();

        // 2. Lấy kết quả học tập thực tế (Lấy điểm cao nhất của mỗi môn đã từng học)
        $hocTap = DB::table('dangkyhocphan as dk')
            ->join('lophocphan as lhp', 'dk.LopHocPhanID', '=', 'lhp.LopHocPhanID')
            ->leftJoin('diemso as d', 'dk.DangKyID', '=', 'd.DangKyID')
            ->where('dk.SinhVienID', $sinhVien->SinhVienID)
            ->where('dk.TrangThai', 'ThanhCong')
            ->select('lhp.MonHocID', DB::raw('MAX(d.DiemTongKet) as max_diem'))
            ->groupBy('lhp.MonHocID')
            ->get()
            ->keyBy('MonHocID');

        $monNo = [];
        $monChuaHoc = [];
        $monDaDat = [];

        foreach ($ctdt as $item) {
            $mon = $item->monHoc;
            $ketQua = $hocTap->get($mon->MonHocID);

            if (!$ketQua) {
                // Trường hợp 1: Chưa từng đăng ký học
                $monChuaHoc[] = $item;
            } elseif ($ketQua->max_diem < 4.0) {
                // Trường hợp 2: Đã học nhưng điểm cao nhất vẫn < 4.0 (Môn nợ)
                $item->DiemHienTai = $ketQua->max_diem;
                $monNo[] = $item;
            } else {
                // Trường hợp 3: Đã hoàn thành (>= 4.0)
                $monDaDat[] = $item;
            }
        }

        return [
            'success' => true,
            'data' => [
                'mon_no' => $monNo,
                'mon_chua_hoc' => $monChuaHoc,
                'mon_da_dat' => $monDaDat
            ]
        ];
    }

    /**
     * Lấy danh sách chương trình đào tạo cho Admin với bộ lọc và phân trang.
     */
    public function layDanhSachCTDT(array $filters = [])
    {
        $query = ChuongTrinhDaoTao::with(['monHoc', 'nganhDaoTao.khoa']);

        if (!empty($filters['KhoaID'])) {
            $query->whereHas('nganhDaoTao', function ($q) use ($filters) {
                $q->where('KhoaID', $filters['KhoaID']);
            });
        }

        if (!empty($filters['NganhID'])) {
            $query->where('NganhID', $filters['NganhID']);
        }

        if (!empty($filters['HocKyGoiY'])) {
            $query->where('HocKyGoiY', $filters['HocKyGoiY']);
        }

        if (!empty($filters['search'])) {
            $query->whereHas('monHoc', function ($q) use ($filters) {
                $q->where('TenMon', 'like', '%' . $filters['search'] . '%')
                  ->orWhere('MaMon', 'like', '%' . $filters['search'] . '%');
            });
        }

        $perPage = $filters['per_page'] ?? 10; // Default per_page
        return $query->paginate($perPage);
    }

    /**
     * Thêm môn học vào chương trình đào tạo.
     */
    public function themMonVaoCTDT(array $data): ChuongTrinhDaoTao
    {
        // Sử dụng updateOrCreate để tự động cập nhật nếu đã tồn tại, tránh lỗi trùng lặp.
        // Điều này cho phép một môn học có thể xuất hiện ở nhiều ngành khác nhau (dùng chung môn).
        return ChuongTrinhDaoTao::updateOrCreate(
            ['NganhID' => $data['NganhID'], 'MonHocID' => $data['MonHocID']],
            ['HocKyGoiY' => $data['HocKyGoiY'], 'BatBuoc' => $data['BatBuoc'], 'KhoiKienThuc' => $data['KhoiKienThuc'] ?? 'DaiCuong']
        );
    }

    /**
     * Cập nhật môn học trong chương trình đào tạo.
     */
    public function capNhatMonTrongCTDT(ChuongTrinhDaoTao $ctdt, array $data): ChuongTrinhDaoTao
    {
        // Loại bỏ ID khỏi mảng dữ liệu để đảm bảo update các trường còn lại chính xác
        $updateData = array_diff_key($data, array_flip(['ID', 'id']));
        
        $ctdt->update($updateData);
        return $ctdt;
    }

    /**
     * Gán nhiều môn học vào chương trình đào tạo.
     */
    public function ganNhieuMonVaoCTDT(array $data): int
    {
        $insertedCount = 0;
        foreach ($data['MonHocIDs'] as $monHocID) {
            try {
                $this->themMonVaoCTDT([
                    'NganhID' => $data['NganhID'],
                    'MonHocID' => $monHocID,
                    'HocKyGoiY' => $data['HocKyGoiY'],
                    'BatBuoc' => $data['BatBuoc'],
                    'KhoiKienThuc' => $data['KhoiKienThuc'],
                ]);
                $insertedCount++;
            } catch (\Exception $e) {
                // Bỏ qua nếu môn học đã tồn tại
                continue;
            }
        }
        return $insertedCount;
    }

    /**
     * Import chương trình đào tạo từ dữ liệu mảng (sau khi đọc file)
     */
    public function importChuongTrinh(int $nganhId, array $rows, bool $clearExisting = false): array
    {
        $successCount = 0;
        $errors = [];

        // Lấy KhoaID từ Ngành để gán cho môn học mới nếu hệ thống cần tự tạo
        $nganh = Nganh::find($nganhId);
        $khoaId = $nganh ? $nganh->KhoaID : null;

        DB::transaction(function () use ($nganhId, $khoaId, $rows, $clearExisting, &$successCount, &$errors) {
            // Xóa toàn bộ CTĐT cũ của ngành này trước khi import mới nếu yêu cầu
            if ($clearExisting) {
                ChuongTrinhDaoTao::where('NganhID', $nganhId)->delete();
            }

            foreach ($rows as $index => $row) {
                try {
                    // 1. Tìm môn học (ưu tiên theo Mã môn nếu có)
                    $monHoc = null;
                    if (!empty($row['MaMon'])) {
                        $monHoc = MonHoc::where('MaMon', $row['MaMon'])->first();
                    }
                    
                    if (!$monHoc) {
                        // 2. Nếu mã môn mới, kiểm tra xem có môn nào trùng Tên + Tín chỉ không (Logic chia sẻ môn học)
                        $monHoc = MonHoc::where('TenMon', $row['TenMon'])
                            ->where('SoTinChi', $row['SoTinChi'])
                            ->first();
                        
                        if (!$monHoc) {
                            // Tự động tạo mã môn nếu mã trong file excel bị trống
                            $maMonMoi = $row['MaMon'];
                            if (empty($maMonMoi)) {
                                $prefix = $nganh->ma_nganh ?? 'MON';
                                $count = MonHoc::count();
                                $maMonMoi = $prefix . str_pad($count + 1, 3, '0', STR_PAD_LEFT);
                            }

                            // Ưu tiên KhoaID từ Excel, nếu không có mới dùng của Ngành
                            $finalKhoaId = !empty($row['KhoaID']) ? $row['KhoaID'] : $khoaId;

                            // 3. Nếu hoàn toàn mới, tự động tạo môn học vào danh mục chung
                            $monHoc = MonHoc::create([
                                'MaMon'        => $maMonMoi,
                                'TenMon'       => $row['TenMon'],
                                'SoTinChi'     => $row['SoTinChi'] ?? 3,
                                'HinhThucHoc'  => $row['HinhThucHoc'] ?? 'Trực tiếp',
                                'KhoaID'       => $finalKhoaId,
                                'TietLyThuyet' => $row['TietLyThuyet'] ?? 0,
                                'TietThucHanh' => $row['TietThucHanh'] ?? 0,
                            ]);
                        }
                    }

                    // 4. Xử lý môn Tiên quyết và Song hành từ Excel (nếu có)
                    $this->processExcelDieuKien($monHoc->MonHocID, $row['MonTienQuyet'], 1);
                    $this->processExcelDieuKien($monHoc->MonHocID, $row['MonSongHanh'], 2);

                    $this->themMonVaoCTDT([
                        'NganhID'   => $nganhId,
                        'MonHocID'  => $monHoc->MonHocID,
                        'HocKyGoiY' => $row['HocKyGoiY'],
                        'BatBuoc'   => filter_var($row['BatBuoc'], FILTER_VALIDATE_BOOLEAN),
                        'KhoiKienThuc' => $row['KhoiKienThuc'] ?? 'DaiCuong',
                    ]);
                    $successCount++;
                } catch (\Exception $e) {
                    $errors[] = "Dòng " . ($index + 2) . ": " . $e->getMessage();
                }
            }
        });

        return [
            'success_count' => $successCount,
            'errors' => $errors
        ];
    }

    /**
     * Helper xử lý gắn môn điều kiện từ chuỗi mã môn trong Excel
     */
    private function processExcelDieuKien(int $monHocId, $maMonString, int $loai)
    {
        if (empty($maMonString)) return;

        $maMons = array_map('trim', explode(',', $maMonString));
        foreach ($maMons as $ma) {
            $targetMon = MonHoc::where('MaMon', $ma)->first();
            if ($targetMon) {
                DieuKienMonHoc::updateOrCreate([
                    'MonHocID' => $monHocId,
                    'MonTienQuyetID' => $targetMon->MonHocID,
                    'Loai' => $loai
                ]);
            }
        }
    }

    /**
     * Xóa môn học khỏi chương trình đào tạo.
     */
    public function xoaMonKhoiCTDT($id): void
    {
        $ctdt = ChuongTrinhDaoTao::findOrFail($id);
        // Có thể thêm kiểm tra ràng buộc ở đây nếu cần, ví dụ:
        // if ($ctdt->lopHocPhan()->exists()) {
        //     throw new \Exception('Không thể xóa môn học này vì đã có lớp học phần được mở.');
        // }
        $ctdt->delete();
    }

    /**
     * Xóa toàn bộ chương trình đào tạo của một ngành.
     */
    public function xoaToanBoCTDT(int $nganhId): void
    {
        ChuongTrinhDaoTao::where('NganhID', $nganhId)->delete();
    }
}