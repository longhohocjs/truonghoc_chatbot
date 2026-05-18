<?php

namespace App\Services;

use App\Models\Khoa;
use App\Models\MonHoc;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;

class ChatbotToolsService
{
    private function normalizeVietnamese(string $str): string
    {
        $str = mb_strtolower(trim($str), 'UTF-8');
        return $str;
    }

    /**
     * Tra cứu danh sách môn học theo từ khóa và hình thức học.
     * $tu_khoa: match LIKE theo MaMon hoặc TenMon hoặc chuỗi nội dung.
     * $hinh_thuc: giá trị match chính xác theo cột HinhThucHoc (nếu cột lưu dạng enum/string).
     */
    public function traCuuMonHocTheoTuKhoaVaHinhThuc(?string $tu_khoa, ?string $hinh_thuc, int $limit = 10): array
    {
        $tu_khoa = $tu_khoa ? $this->normalizeVietnamese($tu_khoa) : null;
        $hinh_thuc = $hinh_thuc ? $this->normalizeVietnamese($hinh_thuc) : null;
        $limit = max(1, min(50, $limit));

        $query = MonHoc::query()->with('khoa');

        if (!empty($hinh_thuc)) {
            $query->where('HinhThucHoc', $hinh_thuc);
        }

        if (!empty($tu_khoa)) {
            $query->where(function ($q) use ($tu_khoa) {
                $q->where('MaMon', 'LIKE', "%{$tu_khoa}%")
                  ->orWhere('TenMon', 'LIKE', "%{$tu_khoa}%");
            });
        }

        $rows = $query->limit($limit)->get(['MonHocID', 'MaMon', 'TenMon', 'SoTinChi', 'KhoaID', 'HinhThucHoc']);

        return [
            'items' => $rows->map(fn($m) => [
                'ma_mon' => $m->MaMon,
                'ten_mon' => $m->TenMon,
                'so_tin_chi' => $m->SoTinChi,
                'khoa_id' => $m->KhoaID,
                'khoa' => $m->khoa?->TenKhoa,
                'hinh_thuc_hoc' => $m->HinhThucHoc,
            ])->values()->all(),
            'count' => $rows->count(),
        ];
    }

    /**
     * Tìm môn học theo mã môn (MaMon).
     */
    public function timMonHocTheoMaMon(string $ma_mon): array
    {
        $ma_mon = trim($ma_mon);
        if ($ma_mon === '') {
            return ['found' => false, 'error' => 'ma_mon_empty'];
        }

        $mon = MonHoc::with('khoa')
            ->where('MaMon', $ma_mon)
            ->first();

        if (!$mon) {
            return ['found' => false, 'error' => 'not_found'];
        }

        return [
            'found' => true,
            'item' => [
                'ma_mon' => $mon->MaMon,
                'ten_mon' => $mon->TenMon,
                'so_tin_chi' => $mon->SoTinChi,
                'khoa_id' => $mon->KhoaID,
                'khoa' => $mon->khoa?->TenKhoa,
                'hinh_thuc_hoc' => $mon->HinhThucHoc,
            ],
        ];
    }

    // =============================================================
    // MODULE "LỚP HỌC PHẦN" - Tool cao cấp
    // =============================================================

    private function getHocKyByKeyword(?string $hoc_ky): ?\App\Models\HocKy
    {
        if (!$hoc_ky) {
            return null;
        }

        // match theo TenHocKy (ví dụ: "Học kỳ Hè")
        return \App\Models\HocKy::where('TenHocKy', 'like', '%' . $hoc_ky . '%')
            ->orWhere('LoaiHocKy', 'like', '%' . $hoc_ky . '%')
            ->first();
    }

    /**
     * Use case (1): Lọc lớp theo môn + học kỳ + trạng thái lớp (đang mở)
     * tinh_trang_si_so: "Còn trống" => SoLuongDaDangKy < SoLuongToiDa
     */
    public function findLopHocPhanConChoTrong(?string $ten_mon, ?string $hoc_ky, string $trang_thai_lop = 'Đang mở', int $limit = 20): array
    {
        $hocKy = $this->getHocKyByKeyword($hoc_ky);
        if (!$hocKy) {
            return ['found' => false, 'error' => 'hoc_ky_not_found'];
        }

        // view mở đăng ký: v_lophocphan_mo_dangky
        $query = \App\Models\View\LopHocPhanMoDangKy::query()
            ->where('TenHocKy', $hocKy->TenHocKy);

        if ($ten_mon) {
            $query->where(function ($q) use ($ten_mon) {
                $q->where('TenMon', 'like', '%' . $ten_mon . '%')
                  ->orWhere('MaMon', 'like', '%' . $ten_mon . '%');
            });
        }

        // "Đang mở" => TrangThaiDot = 1 (đang mở) (theo view đặt tên TrangThaiDot)
        $query->when($trang_thai_lop, function ($q) use ($trang_thai_lop) {
            if (mb_strtolower($trang_thai_lop, 'UTF-8') === mb_strtolower('Đang mở', 'UTF-8')
                || mb_strtolower($trang_thai_lop, 'UTF-8') === mb_strtolower('dang mo', 'UTF-8')) {
                $q->where('TrangThaiDot', 1);
            }
        });

        // Còn trống: SoLuongDaDangKy < SoLuongToiDa
        $query->whereColumn('SoLuongDaDangKy', '<', 'SoLuongToiDa');

        $rows = $query->limit($limit)->get();

        if ($rows->isEmpty()) {
            return ['found' => false, 'error' => 'no_result'];
        }

        $items = $rows->map(function ($r) {
            return [
                'ma_lop' => $r->MaLopHP,
                'ten_mon' => $r->TenMon,
                'ten_hoc_ky' => $r->TenHocKy,
                'ten_giang_vien' => $r->TenGiangVien,
                'si_so_hien_tai' => (int) $r->SoLuongDaDangKy,
                'si_so_toi_da' => (int) $r->SoLuongToiDa,
            ];
        })->values()->all();

        return [
            'found' => true,
            'items' => $items,
            'count' => count($items),
        ];
    }

    /**
     * Use case (2): Liệt kê lớp đang mở nhưng "trống lịch".
     * Option đã chốt: trống lịch = TrangThaiDot(đang mở) nhưng KHÔNG có record lichhoc
     */
    public function listLopHocPhanTrongLich(?string $hoc_ky = null, int $limit = 50): array
    {
        $query = \App\Models\View\LopHocPhanMoDangKy::query()
            ->where('TrangThaiDot', 1);

        if ($hoc_ky) {
            $hocKy = $this->getHocKyByKeyword($hoc_ky);
            if ($hocKy) {
                $query->where('TenHocKy', $hocKy->TenHocKy);
            }
        }

        // không có record lichhoc
        $query->whereNotExists(function ($sub) {
            $sub->select(DB::raw(1))
                ->from('lichhoc as lh')
                ->whereColumn('lh.LopHocPhanID', 'v_lophocphan_mo_dangky.LopHocPhanID');
        });

        $rows = $query->limit($limit)->get();
        if ($rows->isEmpty()) {
            return ['found' => false, 'error' => 'no_result'];
        }

        $items = $rows->map(fn($r) => [
            'ma_lop' => $r->MaLopHP,
            'ten_mon' => $r->TenMon,
            'ten_hoc_ky' => $r->TenHocKy,
            'ten_giang_vien' => $r->TenGiangVien,
            'si_so_hien_tai' => (int) $r->SoLuongDaDangKy,
            'si_so_toi_da' => (int) $r->SoLuongToiDa,
        ])->values()->all();

        return ['found' => true, 'items' => $items, 'count' => count($items)];
    }

    /**
     * Use case (3): đếm số lớp theo giảng viên trong học kỳ.
     * ten_giang_vien: match theo TenGiangVien
     */
    public function countLopHocPhanGiangVienTrongHocKy(?string $ten_giang_vien, ?string $hoc_ky = null): array
    {
        $hocKy = $this->getHocKyByKeyword($hoc_ky);

        $query = \App\Models\View\VDanhSachLopGiangVien::query();

        if ($hocKy) {
            $query->where('TenHocKy', $hocKy->TenHocKy);
        }

        if ($ten_giang_vien) {
            $query->where('TenGiangVien', 'like', '%' . $ten_giang_vien . '%');
        }

        $rows = $query->select('LopHocPhanID')
            ->distinct()
            ->get();

        $count = $rows->count();

        return ['found' => true, 'count' => $count];
    }

    /**
     * Use case (4): Tra cứu đích danh theo mã lớp
     */
    public function traCuuLopHocPhanTheoMaLop(string $ma_lop): array
    {
        $ma_lop = trim($ma_lop);
        if ($ma_lop === '') {
            return ['found' => false, 'error' => 'ma_lop_empty'];
        }

        $lop = \App\Models\LopHocPhan::with(['monHoc', 'hocKy', 'giangVien', 'lichHoc', 'lichThi'])->where('MaLopHP', $ma_lop)->first();

        if (!$lop) {
            return ['found' => false, 'error' => 'not_found'];
        }

        $soDangKy = \App\Models\DangKyHocPhan::where('LopHocPhanID', $lop->LopHocPhanID)
            ->where('TrangThai', 'ThanhCong')
            ->count();

        $daFull = $lop->SoLuongToiDa ? ($soDangKy >= (int)$lop->SoLuongToiDa) : false;

        $coLichHoc = $lop->lichHoc && $lop->lichHoc->count() > 0;
        $coLichThi = $lop->lichThi && $lop->lichThi->count() > 0;

        return [
            'found' => true,
            'item' => [
                'ma_lop' => $lop->MaLopHP,
                'ten_mon' => $lop->monHoc?->TenMon,
                'so_tin_chi' => $lop->monHoc?->SoTinChi ?? 0,
                'ten_hoc_ky' => $lop->hocKy?->TenHocKy,
                'si_so_hien_tai' => (int) $soDangKy,
                'si_so_toi_da' => (int) ($lop->SoLuongToiDa ?? 0),
                'co_lich_hoc' => $coLichHoc,
                'co_lich_thi' => $coLichThi,
                'da_full' => $daFull,
            ],
        ];
    }

    // =============================================================
    // MODULE "LỚP SINH HOẠT" - Tool cao cấp
    // =============================================================

    /**
     * Use case (1): Tra cứu ngược sinh viên -> lớp sinh hoạt + cố vấn.
     */
    public function traCuuLopSinhHoatTheoSinhVien(string $ten_sinh_vien, string $mssv): array
    {
        $ten_sinh_vien = trim($ten_sinh_vien);
        $mssv = trim($mssv);

        if ($mssv === '' || $ten_sinh_vien === '') {
            return ['found' => false, 'error' => 'input_empty'];
        }

        $row = \App\Models\View\VSinhVienLopSinhHoat::query()
            ->where('MaSV', $mssv)
            ->where('HoTen', 'like', '%' . $ten_sinh_vien . '%')
            ->first();

        if (!$row) {
            // fallback: chỉ theo MaSV
            $row = \App\Models\View\VSinhVienLopSinhHoat::query()
                ->where('MaSV', $mssv)
                ->first();
        }

        if (!$row) {
            return ['found' => false, 'error' => 'not_found'];
        }

        return [
            'found' => true,
            'item' => [
                'ho_ten' => $row->HoTen,
                'ma_sv' => $row->MaSV,
                'ma_lop' => $row->MaLop,
                'ten_lop' => $row->TenLop,
                'khoa' => $row->TenKhoa,
                'nam_nhap_hoc' => $row->NamNhapHoc,
                'ten_co_van' => $row->TenCoVan,
                'email_co_van' => $row->EmailCoVan,
            ],
        ];
    }

    /**
     * Use case (2): Lọc lớp hành chính theo Khóa (năm nhập học) và Khoa.
     */
    public function getLopSinhHoatByKhoa($khoa_hoc, string $ten_khoa): array
    {
        $khoa_hoc = trim((string) $khoa_hoc);
        $ten_khoa = trim($ten_khoa);

        if ($khoa_hoc === '' || $ten_khoa === '') {
            return ['found' => false, 'error' => 'input_empty'];
        }

        // VSinhVienLopSinhHoat có NamNhapHoc dạng int; nhưng câu hỏi có thể là "22" hoặc "2022".
        // Heuristic: lấy 2 chữ số cuối nếu chuỗi dài.
        $namNhapHoc = ctype_digit($khoa_hoc) ? (int) $khoa_hoc : null;
        if ($namNhapHoc !== null && $namNhapHoc < 100) {
            // nếu chỉ "22" => giả định 2022
            $namNhapHoc = 2000 + $namNhapHoc;
        }

        $rows = \App\Models\LopSinhHoat::query()
            ->with(['khoa', 'coVanHocTap'])
            ->when($namNhapHoc, fn($q) => $q->where('NamNhapHoc', $namNhapHoc))
            ->whereHas('khoa', fn($q) => $q->where('TenKhoa', 'like', '%' . $ten_khoa . '%'))
            ->get();

        $count = $rows->count();

        return [
            'found' => true,
            'count' => $count,
            'items' => $rows->map(fn($l) => [
                'ma_lop' => $l->MaLop,
                'ten_lop' => $l->TenLop,
                'khoa' => $l->khoa?->TenKhoa,
                'nam_nhap_hoc' => $l->NamNhapHoc,
            ])->values()->all(),
        ];
    }

    /**
     * Use case (3): Liệt kê các lớp mà cố vấn học tập đang phụ trách.
     */
    public function getLopSinhHoatByCoVan(string $ten_co_van): array
    {
        $ten_co_van = trim($ten_co_van);
        if ($ten_co_van === '') {
            return ['found' => false, 'error' => 'input_empty'];
        }

        $rows = \App\Models\LopSinhHoat::query()
            ->with(['khoa', 'coVanHocTap'])
            ->whereHas('coVanHocTap', fn($q) => $q->where('HoTen', 'like', '%' . $ten_co_van . '%'))
            ->orderByDesc('NamNhapHoc')
            ->get();

        if ($rows->isEmpty()) {
            return ['found' => false, 'error' => 'not_found'];
        }

        return [
            'found' => true,
            'items' => $rows->map(fn($l) => [
                'ma_lop' => $l->MaLop,
                'ten_lop' => $l->TenLop,
                'nam_nhap_hoc' => $l->NamNhapHoc,
                'khoa' => $l->khoa?->TenKhoa,
            ])->values()->all(),
            'count' => $rows->count(),
        ];
    }

    /**
     * Use case (4): Drill-down: sĩ số + email sinh viên đầu tiên trong danh sách.
     */
    public function getChiTietLopSinhHoat(string $ma_lop, string $yeu_cau_chi_tiet = ''): array
    {
        $ma_lop = trim($ma_lop);
        if ($ma_lop === '') {
            return ['found' => false, 'error' => 'ma_lop_empty'];
        }

        $lop = \App\Models\LopSinhHoat::query()
            ->where('MaLop', $ma_lop)
            ->first();

        if (!$lop) {
            return ['found' => false, 'error' => 'not_found'];
        }

        $svList = \App\Models\View\VSinhVienLopSinhHoat::query()
            ->where('LopSinhHoatID', $lop->LopSinhHoatID)
            ->orderBy('HoTen')
            ->get();

        $count = $svList->count();
        $first = $svList->first();

        $emailFirst = $first?->Email ?? null;

        return [
            'found' => true,
            'item' => [
                'ma_lop' => $lop->MaLop,
                'ten_lop' => $lop->TenLop,
                'nam_nhap_hoc' => $lop->NamNhapHoc,
                'si_so' => $count,
                'email_sinh_vien_dau_tien' => $emailFirst,
            ],
        ];
    }

    public function traCuuLichHocThi($sinhVienId, $loaiLich, $thoiGian)
    {
        if (!$sinhVienId) {
            return ['found' => false];
        }

        // 1. Xử lý tham số thời gian (NLP sang Date)
        $targetDate = now(); // Mặc định là hôm nay
        $thoiGianLower = mb_strtolower($thoiGian, 'UTF-8');
        
        if (str_contains($thoiGianLower, 'mai')) {
            $targetDate = now()->addDay();
        } elseif (str_contains($thoiGianLower, 'qua')) {
            $targetDate = now()->subDay();
        }

        $items = [];

        // 2. Query Lịch Học hoặc Lịch Thi tùy theo $loaiLich
        if ($loaiLich === 'thi') {
            $lichThi = \App\Models\LichThi::whereHas('lopHocPhan.dangKyHocPhan', function ($q) use ($sinhVienId) {
                $q->where('SinhVienID', $sinhVienId)->where('TrangThai', 1);
            })
            ->whereDate('NgayThi', $targetDate->format('Y-m-d'))
            ->with('lopHocPhan.monHoc')
            ->get();

            foreach ($lichThi as $lt) {
                $items[] = [
                    'ten_mon' => $lt->lopHocPhan->monHoc->TenMon ?? 'N/A',
                    'phong' => $lt->PhongThi ?? 'Chưa xếp phòng',
                    'ca' => $lt->GioBatDau ?? 'Chưa rõ',
                ];
            }
        } else {
            // Mặc định là tìm Lịch Học
            $lichHoc = \App\Models\LichHoc::whereHas('lopHocPhan.dangKyHocPhan', function ($q) use ($sinhVienId) {
                $q->where('SinhVienID', $sinhVienId)->where('TrangThai', 1);
            })
            ->whereDate('NgayHoc', $targetDate->format('Y-m-d'))
            ->with('lopHocPhan.monHoc')
            ->get();

            foreach ($lichHoc as $lh) {
                $items[] = [
                    'ten_mon' => $lh->lopHocPhan->monHoc->TenMon ?? 'N/A',
                    'phong' => $lh->PhongHoc ?? 'Chưa xếp phòng',
                    'ca' => 'Tiết ' . ($lh->TietBatDau ?? '?'),
                ];
            }
        }

        if (empty($items)) {
            return ['found' => false];
        }

        return [
            'found' => true,
            'items' => $items
        ];
    }
    public function traCuuDotDangKy(): array
    {
        $dot = \App\Models\DotDangKy::where('NgayKetThuc', '>=', now())
            ->where('TrangThai', 1)
            ->orderBy('NgayBatDau')
            ->first();

        if (!$dot) {
            return ['found' => false];
        }

        return [
            'found' => true,
            'ten_dot' => $dot->TenDot,
            'ngay_ket_thuc' => \Carbon\Carbon::parse($dot->NgayKetThuc)->format('d/m/Y')
        ];
    }

    /**
     * Tra cứu Học phí của Sinh viên
     */
    public function traCuuHocPhi($sinhVienId, $hocKy): array
    {
        if (!$sinhVienId) return ['found' => false];

        // Tìm học kỳ theo tên (nếu có) hoặc lấy học kỳ hiện tại
        $hkModel = null;
        if ($hocKy) {
            $hkModel = \App\Models\HocKy::where('TenHocKy', 'like', '%' . $hocKy . '%')->first();
        }
        
        if (!$hkModel) {
            $hkModel = \App\Models\HocKy::whereDate('NgayBatDau', '<=', now())
                ->whereDate('NgayKetThuc', '>=', now())
                ->first();
        }

        if (!$hkModel) return ['found' => false];

        $hp = \App\Models\HocPhi::where('SinhVienID', $sinhVienId)
            ->where('HocKyID', $hkModel->HocKyID)
            ->first();

        if (!$hp) return ['found' => false];

        $no = max(0, $hp->TongTien - $hp->DaNop);
        
        return [
            'found' => true,
            'ten_hoc_ky' => $hkModel->TenHocKy,
            'tong_tien' => number_format($hp->TongTien),
            'da_nop' => number_format($hp->DaNop),
            'con_no' => number_format($no)
        ];
    }

    /**
     * Tra cứu Tiến độ học tập (GPA, Tín chỉ, Môn nợ, Hoàn thành, Chương trình đào tạo)
     */
    public function traCuuTienDoHocTap($sinhVienId, $loaiTraCuu, $rawMessage = ''): array
    {
        if (!$sinhVienId) return ['found' => false];

        $sv = \App\Models\SinhVien::find($sinhVienId);
        if (!$sv) return ['found' => false];

        // Lấy các môn đã có điểm
        $passed = \App\Models\DangKyHocPhan::where('SinhVienID', $sinhVienId)
            ->whereHas('diemSo')
            ->with(['diemSo', 'lopHocPhan.monHoc'])
            ->get()
            ->groupBy(fn($item) => $item->lopHocPhan->MonHocID)
            ->map(fn($group) => $group->sortByDesc(fn($item) => $item->diemSo->DiemTongKet ?? 0)->first());

        // GỘP CHUNG tham số AI bóc tách và Câu hỏi gốc để check keyword cho chuẩn 100%
        $chuoiKiemTra = mb_strtolower($loaiTraCuu . ' ' . $rawMessage, 'UTF-8');

        // Logic 5: Hỏi về Chương trình đào tạo / Tổng số môn phải học
        if (str_contains($chuoiKiemTra, 'chương trình') || str_contains($chuoiKiemTra, 'ctđt') || str_contains($chuoiKiemTra, 'bao nhiêu môn')) {
            $tongMonCTDT = \App\Models\ChuongTrinhDaoTao::where('NganhID', $sv->NganhID)
                ->distinct('MonHocID')
                ->count('MonHocID');
            
            $monDaQuaCount = $passed->filter(fn($m) => $m->diemSo && $m->diemSo->DiemTongKet >= 4)->count();
            $conLai = max(0, $tongMonCTDT - $monDaQuaCount);
            
            return ['found' => true, 'chi_tiet' => "Chương trình đào tạo ngành của bạn có tổng cộng {$tongMonCTDT} môn. Bạn đã hoàn thành {$monDaQuaCount} môn, còn lại {$conLai} môn cần tích lũy."];
        }

        // Logic 4: Hỏi về Môn đã hoàn thành / đã qua
        if (str_contains($chuoiKiemTra, 'hoàn thành') || str_contains($chuoiKiemTra, 'đã qua') || str_contains($chuoiKiemTra, 'pass')) {
            $monDaQua = $passed->filter(fn($m) => $m->diemSo && $m->diemSo->DiemTongKet >= 4);
            
            if ($monDaQua->isEmpty()) {
                return ['found' => true, 'chi_tiet' => "Bạn chưa có môn nào được ghi nhận là đã hoàn thành (điểm >= 4.0) ạ."];
            }
            
            $tenMons = [];
            foreach ($monDaQua as $m) {
                $tenMons[] = $m->lopHocPhan->monHoc->TenMon . " (" . $m->diemSo->DiemTongKet . "đ)";
            }
            return ['found' => true, 'chi_tiet' => "Bạn đã hoàn thành " . $monDaQua->count() . " môn: " . implode(', ', $tenMons)];
        }

        // Logic 1: Hỏi về GPA / Điểm
        if (str_contains($chuoiKiemTra, 'gpa') || str_contains($chuoiKiemTra, 'điểm')) {
            $tongDiem = 0;
            $tongTC = 0;
            foreach ($passed as $m) {
                if (!$m->diemSo) continue;
                $he10 = $m->diemSo->DiemTongKet ?? 0;
                if($he10 >= 8.5) $he4 = 4.0;
                elseif($he10 >= 7.0) $he4 = 3.0;
                elseif($he10 >= 5.5) $he4 = 2.0;
                elseif($he10 >= 4.0) $he4 = 1.0;
                else $he4 = 0;
                
                $tc = $m->lopHocPhan->monHoc->SoTinChi ?? 0;
                $tongDiem += ($he4 * $tc);
                $tongTC += $tc;
            }
            $gpa = $tongTC > 0 ? round($tongDiem / $tongTC, 2) : 0;
            return ['found' => true, 'chi_tiet' => "GPA hệ 4 ước tính của bạn là {$gpa}/4.0"];
        }

        // Logic 2: Hỏi về Môn nợ / Chưa qua
        if (str_contains($chuoiKiemTra, 'nợ') || str_contains($chuoiKiemTra, 'chưa qua') || str_contains($chuoiKiemTra, 'rớt') || str_contains($chuoiKiemTra, 'thiếu')) {
            $monNos = $passed->filter(fn($m) => $m->diemSo && $m->diemSo->DiemTongKet < 4);
            if ($monNos->isEmpty()) return ['found' => true, 'chi_tiet' => "Chúc mừng! Bạn không có môn nào bị nợ."];
            
            $tenMons = [];
            foreach ($monNos as $m) {
                $tenMons[] = $m->lopHocPhan->monHoc->TenMon . " (" . $m->diemSo->DiemTongKet . "đ)";
            }
            return ['found' => true, 'chi_tiet' => "Bạn đang nợ " . $monNos->count() . " môn: " . implode(', ', $tenMons)];
        }

        // Logic 3: Hỏi về Tín chỉ
        if (str_contains($chuoiKiemTra, 'tín chỉ')) {
            $tongTC = $passed->filter(fn($m) => $m->diemSo && $m->diemSo->DiemTongKet >= 4)
                ->sum(fn($m) => $m->lopHocPhan->monHoc->SoTinChi ?? 0);
            return ['found' => true, 'chi_tiet' => "Bạn đã tích lũy được tổng cộng {$tongTC} tín chỉ."];
        }

        // Fallback cuối cùng
        return ['found' => true, 'chi_tiet' => "Bạn đã học tổng cộng " . $passed->count() . " môn học."];
    }

    /**
     * Tra cứu Cố vấn học tập
     */
    public function traCuuCoVanHocTap($sinhVienId): array
    {
        if (!$sinhVienId) return ['found' => false];

        $sv = \App\Models\SinhVien::with('lopSinhHoat.coVanHocTap')->find($sinhVienId);
        
        if (!$sv || !$sv->lopSinhHoat || !$sv->lopSinhHoat->coVanHocTap) {
            return ['found' => false];
        }

        $coVan = $sv->lopSinhHoat->coVanHocTap;

        return [
            'found' => true,
            'ten_co_van' => $coVan->HoTen,
            'email' => $coVan->Email,
            'sdt' => $coVan->SoDienThoai
        ];
    }

    /**
     * Tra cứu trạng thái đơn xin mở lớp của sinh viên
     */
    public function traCuuDonXinMoLop($sinhVienId): array
    {
        if (!$sinhVienId) return ['found' => false];

        // Sửa lại tên Model 'YeuCauMoLop' cho khớp với hệ thống của bạn nếu cần
        $donXin = \App\Models\YeuCauMoLop::where('SinhVienID', $sinhVienId)
            ->with('mon_hoc') // Nối với bảng môn học để lấy tên môn
            ->orderBy('created_at', 'desc')
            ->get();


        if ($donXin->isEmpty()) {
            return ['found' => false];
        }

        $items = [];
        foreach ($donXin as $don) {
            // Mapping trạng thái (Giả sử 0: Chờ duyệt, 1: Đã duyệt, 2 hoặc -1: Từ chối)
            $trangThaiText = $don->TrangThai; 
            
            if ($don->TrangThai == 0 || $don->TrangThai === 'Chờ duyệt') {
                $trangThaiText = '⏳ Đang chờ duyệt';
            } elseif ($don->TrangThai == 1 || $don->TrangThai === 'Đã duyệt') {
                $trangThaiText = '✅ Đã được duyệt';
            } elseif ($don->TrangThai == 2 || $don->TrangThai == -1 || $don->TrangThai === 'Từ chối') {
                $trangThaiText = '❌ Bị từ chối';
            }

            $items[] = [
                // YeuCauMoLop quan hệ đúng tên là mon_hoc()
                'ten_mon' => $don->mon_hoc?->TenMon ?? 'Môn học không xác định',
                'trang_thai' => $trangThaiText
            ];
        }

        return [
            'found' => true,
            'items' => $items
        ];
    }

    /**
     * GIẢNG VIÊN: Tra cứu trạng thái nhập điểm của Lớp học phần
     */
    public function gvTraCuuTrangThaiNhapDiem($giangVienId, $maLop = ''): array
    {
        if (!$giangVienId) return ['found' => false];

        $query = \App\Models\LopHocPhan::where('GiangVienID', $giangVienId)
            ->with('monHoc'); 

        if ($maLop) {
            // Nếu Giảng viên hỏi cụ thể 1 lớp (VD: "Lớp INT041 có cho nhập điểm chưa?")
            $query->where('MaLopHP', 'like', '%' . trim($maLop) . '%');
        } else {
            // Nếu hỏi chung chung (VD: "Các lớp của tôi nhập điểm được chưa?")
            // Chỉ lấy các lớp đang mở (Học kỳ hiện tại)
            $query->where('TrangThai', 1);
        }

        $lops = $query->get();

        if ($lops->isEmpty()) {
            return ['found' => false];
        }

        $items = [];
        foreach ($lops as $lop) {
            $trangThaiText = "Chưa rõ";
            
            // =========================================================
            // TÙY CHỈNH THEO DATABASE CỦA BẠN (Sửa 1 trong 2 cách sau)
            // =========================================================
            
            // CÁCH 1: Nếu bảng LopHocPhan có cột TrangThaiNhapDiem (1: Đang mở, 0: Đã khóa)
            if (isset($lop->TrangThaiNhapDiem)) {
                $trangThaiText = $lop->TrangThaiNhapDiem == 1 ? "🟢 Đang MỞ (Trong đợt nhập điểm)" : "🔴 Đã KHÓA";
            } 
            // CÁCH 2: Nếu chỉ lấy trạng thái Lớp Học Phần (đang mở thì cho nhập)
            else {
                $trangThaiText = $lop->TrangThai == 1 ? "🟢 Đang MỞ" : "🔴 Đã KHÓA";
            }

            $items[] = [
                'ma_lop' => $lop->MaLopHP,
                'ten_mon' => $lop->monHoc->TenMon ?? 'N/A',
                'trang_thai' => $trangThaiText
            ];
        }

        return [
            'found' => true,
            'items' => $items
        ];
    }
}