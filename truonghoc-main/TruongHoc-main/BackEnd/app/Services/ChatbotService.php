<?php

namespace App\Services;

use App\Models\HocPhi;
use App\Models\HocKy;
use App\Models\LichHoc;
use App\Models\LichThi;
use App\Models\DotDangKy;
use App\Models\DiemRenLuyen;
use App\Models\DangKyHocPhan;
use App\Models\ChuongTrinhDaoTao;
use App\Models\SinhVien;
use App\Models\GiangVien;
use App\Models\User;
use App\Models\Khoa;
use App\Models\Nganh;
use App\Models\LopHocPhan;
use App\Models\LopSinhHoat;
use App\Models\MonHoc;
use Carbon\Carbon;

class ChatbotService
{
    // =========================================================================
    // 1. BỘ ĐỊNH TUYẾN CHÍNH (PHÂN LOẠI NGƯỜI DÙNG)
    // =========================================================================
    public function handle($message, $user)
    {
        $message = mb_strtolower(trim($message), 'UTF-8');

        if ($user->isGiangVien()) {
            return $this->handleGiangVien($message, $user->giangVien);
        } elseif ($user->isSinhVien()) {
            return $this->handleSinhVien($message, $user->sinhVien);
        }

        return "❌ Bạn không có quyền truy cập.";
    }

    private function contains($str, array $keywords)
    {
        foreach ($keywords as $keyword) {
            if (str_contains($str, $keyword)) {
                return true;
            }
        }
        return false;
    }

    // =========================================================================
    // 2. KỊCH BẢN CHO GIẢNG VIÊN (TỪ KHÓA ĐA DẠNG)
    // =========================================================================
    private function handleGiangVien($message, $gv)
    {
        if (!$gv) return "❌ Không tìm thấy hồ sơ giảng viên của bạn.";

        $actions = [
            // Lịch dạy / thời khóa biểu
            [['lịch dạy', 'lich day', 'thời khóa biểu', 'thoi khoa bieu', 'tkb', 'lịch giảng dạy', 'lich giang day', 'hôm nay dạy', 'hom nay day', 'tuần này dạy', 'tuan nay day', 'mai dạy', 'mai day', 'khi nào dạy', 'khi nao day', 'dạy môn gì', 'day mon gi', 'dạy lớp nào', 'lịch lên lớp', 'lich len lop', 'dạy tiết', 'day tiet', 'phòng dạy', 'phong day', 'phòng bao nhiêu', 'dạy phòng nào', 'lịch giảng', 'giờ lên lớp'], 'gvLichDay'],

            // Lịch coi thi / gác thi
            [['lịch coi thi', 'lich coi thi', 'gác thi', 'gac thi', 'coi thi', 'lịch thi', 'lich thi', 'hôm nay coi thi', 'hom nay coi thi', 'tuần này coi thi', 'tuan nay coi thi', 'mai coi thi', 'khi nào coi thi', 'khi nao coi thi', 'môn thi', 'mon thi', 'phòng thi', 'phong thi', 'trực thi', 'truc thi', 'lịch gác', 'giám thị', 'coi thi ở đâu', 'lịch trực thi'], 'gvLichCoiThi'],

            // Cố vấn học tập / chủ nhiệm
            [['cố vấn học tập', 'co van hoc tap', 'cvht', 'cố vấn', 'co van', 'lớp cố vấn', 'lop co van', 'lớp sinh hoạt', 'lop sinh hoat', 'chủ nhiệm', 'chu nhiem', 'lớp chủ nhiệm', 'lop chu nhiem', 'quản lý lớp', 'quan ly lop', 'lớp cn', 'sv lớp', 'danh sách lớp', 'lớp mình phụ trách'], 'gvLopCoVan'],

            // Tra cứu trạng thái nhập điểm
            [['nhập điểm', 'nhap diem', 'trạng thái nhập điểm', 'trang thai nhap diem', 'tình trạng điểm', 'tinh trang diem', 'vào điểm', 'vao diem', 'kiểm tra điểm', 'kiem tra diem', 'mở điểm', 'mo diem', 'khóa điểm', 'khoa diem', 'đã nhập điểm', 'da nhap diem', 'chưa nhập', 'chua nhap', 'đợt nhập điểm', 'dot nhap diem', 'cho nhập điểm', 'vào điểm chưa', 'hạn nhập điểm'], 'gvTraCuuNhapDiem'],

            // HK hiện tại
            [['học kỳ hiện tại', 'hoc ky hien tai', 'hk hiện tại', 'hk hien tai', 'đang là kỳ mấy', 'dang la ky may', 'học kỳ này', 'hoc ky nay', 'năm học'], 'getHocKyHienTaiInfo'],

            // Chào
            [['hello', 'hi', 'xin chào', 'chào', 'chao', 'hey', 'alo', 'chào bot', 'chao bot'], 'helloGV'],
        ];

        foreach ($actions as $action) {
            if ($this->contains($message, $action[0])) {
                $method = $action[1];
                return $this->$method($gv);
            }
        }

        return "👨‍🏫 Chào thầy/cô {$gv->HoTen}. Tôi có thể hỗ trợ tra cứu: Lịch giảng dạy, Lịch coi thi, Lớp cố vấn học tập, Trạng thái nhập điểm.";
    }

    private function helloGV($gv)
    {
        return "👋 Kính chào thầy/cô {$gv->HoTen}. Chúc thầy/cô một ngày làm việc hiệu quả. Thầy/cô cần trợ lý tra cứu thông tin gì ạ?";
    }

    private function gvLichDay($gv)
    {
        $service = app(\App\Services\LichGiangDayService::class);
        $data = $service->getLichGiangDay($gv->GiangVienID);

        if ($data->isEmpty()) {
            return "📓 LỊCH GIẢNG DẠY:\nHiện tại không có lịch giảng dạy đang hoạt động.";
        }

        $res = "📓 LỊCH GIẢNG DẠY (GV {$gv->HoTen}):\n";
        foreach ($data as $lop) {
            $res .= "\n- Mã lớp HP: {$lop['ma_lop_hp']} | {$lop['ten_mon']} | {$lop['ten_hoc_ky']}";
            foreach (($lop['lich_giang_day'] ?? []) as $ld) {
                $ngay = isset($ld['ngay_hoc']) ? Carbon::parse($ld['ngay_hoc'])->format('d/m') : '';
                $tiet = isset($ld['tiet_bd']) ? 'Tiết ' . $ld['tiet_bd'] : '';
                $res .= "\n  + {$ngay} | Buổi {$ld['buoi']} | {$tiet} | Phòng {$ld['phong']}";
            }
        }
        return $res;
    }

    private function gvLichCoiThi($gv)
    {
        $service = app(\App\Services\LichCoiThiService::class);
        $data = $service->getLichCoiThi($gv->GiangVienID);

        if ($data->isEmpty()) {
            return "📕 LỊCH COI THI:\nHiện tại không có lịch coi thi đang hoạt động.";
        }

        $res = "📕 LỊCH COI THI (GV {$gv->HoTen}):\n";
        foreach ($data as $lop) {
            $res .= "\n- Mã lớp HP: {$lop['ma_lop_hp']} | {$lop['ten_mon']} | {$lop['ten_hoc_ky']}";
            foreach (($lop['lich_thi'] ?? []) as $lt) {
                $ngay = isset($lt['ngay_thi']) ? Carbon::parse($lt['ngay_thi'])->format('d/m') : '';
                $res .= "\n  + {$ngay} | {$lt['gio_bd']} - {$lt['gio_kt']} | Phòng {$lt['phong_thi']}";
            }
        }
        return $res;
    }

    private function gvLopCoVan($gv)
    {
        $service = app(\App\Services\LopSinhHoatService::class);
        $data = $service->getLopSinhHoatPhanCong($gv->GiangVienID);

        if ($data->isEmpty()) {
            return "🎫 THÔNG TIN LỚP CỐ VẤN:\nHiện tại bạn chưa được phân công cố vấn lớp nào.";
        }

        $res = "🎫 THÔNG TIN LỚP CỐ VẤN (GV {$gv->HoTen}):\n";
        foreach ($data as $lop) {
            $res .= "\n- {$lop['ma_lop']} ({$lop['ten_lop']}) | Năm nhập học: {$lop['nam_nhap_hoc']} | Khoa: {$lop['ten_khoa']} | Sĩ số: {$lop['si_so']}";
        }
        return $res;
    }

    private function gvTraCuuNhapDiem($gv)
    {
        $service = app(\App\Services\ChatbotToolsService::class);
        $res = $service->gvTraCuuTrangThaiNhapDiem($gv->GiangVienID);

        if (empty($res['found'])) {
            return "Dạ, hiện tại không tìm thấy thông tin đợt nhập điểm cho các lớp học phần của thầy/cô, hoặc thầy/cô chưa được phân công giảng dạy.";
        }

        $lines = [];
        foreach ($res['items'] as $it) {
            $lines[] = "🔹 Lớp {$it['ma_lop']} ({$it['ten_mon']}): **{$it['trang_thai']}**";
        }
        return "Dạ, trạng thái nhập điểm các lớp của thầy/cô như sau:\n" . implode("\n", $lines);
    }

    // =========================================================================
    // 3. KỊCH BẢN CHO SINH VIÊN (TỪ KHÓA ĐA DẠNG)
    // =========================================================================
    private function handleSinhVien($message, $sv)
    {
        if (!$sv) return "❌ Không tìm thấy thông tin sinh viên.";

        $actions = [
            // Lịch học / thời khóa biểu
            [['lịch học', 'lich hoc', 'thời khóa biểu', 'thoi khoa bieu', 'tkb', 'hôm nay học gì', 'hom nay hoc gi', 'mai học gì', 'mai hoc gi', 'tuần này học gì', 'tuan nay hoc gi', 'lịch lên lớp', 'lich len lop', 'khi nào đi học', 'khi nao di hoc', 'phòng học', 'phong hoc', 'tiết mấy', 'tiet may', 'học môn gì', 'hoc mon gi', 'phòng bao nhiêu', 'học ở đâu', 'lịch tuần này', 'lịch ngày mai', 'mấy giờ học'], 'getLichHoc'],
            
            // Lịch thi / coi thi
            [['lịch thi', 'lich thi', 'thi môn gì', 'thi mon gi', 'phòng thi', 'phong thi', 'lịch thi sắp tới', 'lich thi sap toi', 'ngày thi', 'ngay thi', 'khi nào thi', 'khi nao thi', 'giờ thi', 'gio thi', 'sbd', 'số báo danh', 'so bao danh', 'coi thi', 'lịch kiểm tra', 'phòng thi ở đâu', 'mấy giờ thi'], 'getLichThi'],
            
            // Điểm rèn luyện
            [['điểm rèn luyện', 'diem ren luyen', 'đrl', 'drl', 'rèn luyện', 'ren luyen', 'xếp loại rèn luyện', 'xep loai ren luyen', 'điểm rl', 'diem rl', 'loại rèn luyện', 'đạt bao nhiêu điểm rèn luyện'], 'getDiemRenLuyen'],
            
            // Điểm / Bảng điểm / Kết quả học tập
            [['bảng điểm', 'bang diem', 'xem điểm', 'xem diem', 'kết quả học tập', 'ket qua hoc tap', 'kqht', 'điểm thi', 'diem thi', 'được mấy điểm', 'duoc may diem', 'điểm môn', 'diem mon', 'điểm số', 'diem so', 'qua môn', 'qua mon', 'điểm', 'diem', 'tra cứu điểm', 'điểm tổng kết', 'điểm trung bình môn'], 'getDiem'],
            
            // GPA/ĐTB
            [['gpa', 'đtb', 'dtb', 'điểm trung bình', 'diem trung binh', 'tbc', 'trung bình chung', 'trung binh chung', 'tính điểm', 'tinh diem', 'hệ 4', 'he 4', 'điểm tích lũy', 'tổng điểm gpa'], 'getGPA'],
            
            // Môn nợ / tạch / rớt
            [['nợ môn', 'no mon', 'môn nợ', 'mon no', 'môn rớt', 'mon rot', 'rớt môn', 'rot mon', 'học lại', 'hoc lai', 'tạch', 'tach', 'chưa đạt', 'chua dat', 'môn chưa qua', 'mon chua qua', 'thi lại', 'thi lai', 'nợ học phần', 'cần học lại', 'nợ bao nhiêu môn', 'môn bị rớt'], 'getMonNo'],
            
            // Tín chỉ
            [['tín chỉ', 'tin chi', 'tc', 'đã tích lũy', 'da tich luy', 'tích lũy', 'tich luy', 'số tín chỉ', 'so tin chi', 'tổng tín chỉ', 'tong tin chi', 'đã học bao nhiêu', 'số tc'], 'getTinChi'],
            
            // Học phí / Đóng tiền
            [['học phí', 'hoc phi', 'hp', 'đóng tiền', 'dong tien', 'nợ tiền', 'no tien', 'còn nợ', 'con no', 'tiền học', 'tien hoc', 'cần đóng bao nhiêu', 'can dong bao nhieu', 'tổng học phí', 'tong hoc phi', 'biên lai', 'bien lai', 'đóng học phí', 'dong hoc phi', 'nộp học phí', 'hạn đóng tiền', 'tiền học kỳ này'], 'getHocPhi'],
            
            // Đăng ký học phần
            [['đăng ký học phần', 'dang ky hoc phan', 'đkhp', 'dkhp', 'đăng ký môn', 'dang ky mon', 'đkm', 'dkm', 'mở đăng ký', 'mo dang ky', 'đợt đăng ký', 'dot dang ky', 'chọn môn', 'chon mon', 'đăng ký tín chỉ', 'lịch đăng ký môn'], 'getDotDangKy'],
            
            // Gợi ý môn học
            [['gợi ý môn', 'goi y mon', 'gợi ý học tập', 'goi y hoc tap', 'nên học môn gì', 'nen hoc mon gi', 'kỳ tới học gì', 'ky toi hoc gi', 'môn tiếp theo', 'mon tiep theo', 'nên đăng ký môn', 'nen dang ky mon', 'tư vấn học tập'], 'getGoiYHocTap'],
            
            // Cảnh báo học vụ
            [['cảnh báo học vụ', 'canh bao hoc vu', 'cbhv', 'nguy cơ', 'nguy co', 'bị cảnh báo', 'bi canh bao', 'đuổi học', 'duoi hoc', 'thôi học', 'thoi hoc', 'xử lý học vụ', 'bị đình chỉ'], 'getCanhBaoHocVu'],
            
            // TIẾN ĐỘ TỐT NGHIỆP / CÒN THIẾU / HOÀN THÀNH (Đã bổ sung từ khóa của bạn vào đây)
            [['tiến độ tốt nghiệp', 'tien do tot nghiep', 'tiến độ', 'tien do', 'khi nào ra trường', 'khi nao ra truong', 'bao giờ tốt nghiệp', 'bao gio tot nghiep', 'còn mấy môn', 'con may mon', 'còn bao nhiêu môn', 'con bao nhieu mon', 'thiếu mấy môn', 'thieu may mon', 'sắp ra trường', 'sap ra truong', 'hoàn thành', 'hoan thanh', 'hoành thành', 'còn thiếu', 'con thieu', 'thiéu', 'môn đã học', 'mon da hoc', 'chưa học', 'chua hoc', 'tích lũy môn', 'đã hoàn thành bao nhiêu'], 'getTienDoTotNghiep'],
            
            // Tra cứu đơn xin mở lớp (Di chuyển từ controller vào service)
            [['đơn xin mở lớp', 'xin mở lớp', 'mở lớp', 'don xin mo lop', 'xin mo lop', 'mo lop', 'đơn xin', 'xin mở', 'đã duyệt', 'được duyệt'], 'getDonXinMoLop'],

            // HK hiện tại
            [['học kỳ hiện tại', 'hoc ky hien tai', 'hk hiện tại', 'hk hien tai', 'đang là kỳ mấy', 'dang la ky may', 'học kỳ này', 'hoc ky nay'], 'getHocKyHienTaiInfo'],
            
            // Chào
            [['hello', 'hi', 'xin chào', 'chào', 'chao', 'hey', 'alo', 'chào bot', 'chao bot', 'alo bot', 'ê bot'], 'helloSV'],
        ];

        foreach ($actions as $action) {
            if ($this->contains($message, $action[0])) {
                $method = $action[1];
                return $this->$method($sv);
            }
        }

        return $this->defaultMessageSV($sv);
    }

    private function defaultMessageSV($sv)
    {
        return "🎓 Xin chào {$sv->HoTen}\n\nBạn có thể hỏi mình về:\n• Lịch học / Lịch thi\n• Điểm / GPA / Tín chỉ\n• Học phí / Môn nợ\n• Đăng ký học phần\n• Điểm rèn luyện\n• Tiến độ tốt nghiệp";
    }

    private function helloSV($sv)
    {
        return "👋 Xin chào {$sv->HoTen}, mình là trợ lý học tập sinh viên. Hôm nay bạn cần kiểm tra lịch học, điểm số hay thông tin gì nào?";
    }

    // --- SINH VIÊN: CÁC HÀM XỬ LÝ DATABASE ---
    private function getHocKyHienTai()
    {
        return HocKy::whereDate('NgayBatDau', '<=', now())
            ->whereDate('NgayKetThuc', '>=', now())
            ->first();
    }

    private function getHocKyHienTaiInfo()
    {
        $hk = $this->getHocKyHienTai();
        if (!$hk) return "📭 Hiện tại không trong giai đoạn học kỳ nào.";
        return "📚 {$hk->TenHocKy}\n🗓 Thời gian: " . Carbon::parse($hk->NgayBatDau)->format('d/m/Y') . " - " . Carbon::parse($hk->NgayKetThuc)->format('d/m/Y');
    }

    private function getPassedSubjects($sv)
    {
        return DangKyHocPhan::where('SinhVienID', $sv->SinhVienID)
            ->whereHas('diemSo')
            ->with(['diemSo', 'lopHocPhan.monHoc'])
            ->get()
            ->groupBy(fn($item) => $item->lopHocPhan->MonHocID)
            ->map(fn($group) => $group->sortByDesc(fn($item) => $item->diemSo->DiemTongKet ?? 0)->first());
    }

    private function getLichHoc($sv)
    {
        $lichHoc = LichHoc::whereHas('lopHocPhan.dangKyHocPhan', function ($q) use ($sv) {
            $q->where('SinhVienID', $sv->SinhVienID)->where('TrangThai', 1);
        })
            ->whereHas('lopHocPhan', fn($q) => $q->where('TrangThai', 1))
            ->whereDate('NgayHoc', '>=', now())
            ->with('lopHocPhan.monHoc')
            ->orderBy('NgayHoc')
            ->take(5)->get();

        if ($lichHoc->isEmpty()) return "📭 Bạn không có lịch học nào sắp tới.";
        $res = "📅 LỊCH HỌC SẮP TỚI\n";
        foreach ($lichHoc as $lh) {
            $res .= "\n📖 {$lh->lopHocPhan->monHoc->TenMon}\n🗓 " . Carbon::parse($lh->NgayHoc)->format('d/m') . " | 🏫 {$lh->PhongHoc} | ⏰ Tiết {$lh->TietBatDau}";
        }
        return $res;
    }

    private function getLichThi($sv)
    {
        $lichThi = LichThi::whereHas('lopHocPhan.dangKyHocPhan', function ($q) use ($sv) {
            $q->where('SinhVienID', $sv->SinhVienID)->where('TrangThai', 1);
        })
            ->whereHas('lopHocPhan', fn($q) => $q->where('TrangThai', 1))
            ->whereDate('NgayThi', '>=', now())
            ->with('lopHocPhan.monHoc')
            ->orderBy('NgayThi')->get();

        if ($lichThi->isEmpty()) return "✅ Hiện tại bạn chưa có lịch thi.";
        $res = "📝 LỊCH THI CỦA BẠN\n";
        foreach ($lichThi as $lt) {
            $res .= "\n📖 {$lt->lopHocPhan->monHoc->TenMon}\n🗓 " . Carbon::parse($lt->NgayThi)->format('d/m') . " | 🏫 {$lt->PhongThi} | ⏰ {$lt->GioBatDau}";
        }
        return $res;
    }

    private function getDiem($sv)
    {
        $diems = $this->getPassedSubjects($sv);
        if ($diems->isEmpty()) return "📭 Chưa có dữ liệu điểm.";
        $res = "📊 KẾT QUẢ HỌC TẬP\n";
        foreach ($diems->take(6) as $d) {
            $res .= "\n📖 {$d->lopHocPhan->monHoc->TenMon} → ⭐ **{$d->diemSo->DiemTongKet}**";
        }
        return $res;
    }

    private function getGPA($sv)
    {
        $gpa = $this->getGPAValue($sv);
        if ($gpa == 0) return "📭 Bạn chưa có dữ liệu điểm để tính GPA.";
        return "🎓 GPA hệ 4 hiện tại của bạn: **{$gpa}/4.0**";
    }

    private function getDonXinMoLop($sv)
    {
        $service = app(\App\Services\ChatbotToolsService::class);
        $res = $service->traCuuDonXinMoLop($sv->SinhVienID);

        if (empty($res['found']) || empty($res['items'])) {
            return "Dạ, hiện tại hệ thống không ghi nhận đơn xin mở lớp nào của bạn ạ.";
        }

        $lines = [];
        foreach ($res['items'] as $it) {
            $lines[] = "🔹 Môn {$it['ten_mon']}: **{$it['trang_thai']}**";
        }
        return "Dạ, bạn đang có " . count($lines) . " đơn xin mở lớp:\n" . implode("\n", $lines);
    }

    private function getMonNo($sv)
    {
        $subjects = $this->getPassedSubjects($sv);
        $monNos = $subjects->filter(fn($m) => $m->diemSo && $m->diemSo->DiemTongKet < 4);
        if ($monNos->isEmpty()) return "🎉 Chúc mừng! Bạn không có môn nào chưa đạt.";
        $res = "⚠️ DANH SÁCH MÔN CHƯA ĐẠT (MÔN NỢ)\n";
        foreach ($monNos as $m) {
            $res .= "\n❌ {$m->lopHocPhan->monHoc->TenMon} (Điểm: {$m->diemSo->DiemTongKet})";
        }
        return $res;
    }

    private function getHocPhi($sv)
    {
        $hk = $this->getHocKyHienTai();
        if (!$hk) return "📭 Không tìm thấy dữ liệu học kỳ hiện tại.";

        $hp = HocPhi::where('SinhVienID', $sv->SinhVienID)
            ->where('HocKyID', $hk->HocKyID)
            ->first();

        if (!$hp) return "📭 Chưa có dữ liệu học phí cho học kỳ này.";

        $no = max(0, $hp->TongTien - $hp->DaNop);
        return "💰 THÔNG TIN HỌC PHÍ\n💵 Tổng: " . number_format($hp->TongTien) . " VNĐ\n✅ Đã đóng: " . number_format($hp->DaNop) . " VNĐ\n❌ Còn nợ: " . number_format($no) . " VNĐ";
    }

    private function getDotDangKy($sv)
    {
        $dot = DotDangKy::where('NgayKetThuc', '>=', now())
            ->where('TrangThai', 1)
            ->orderBy('NgayBatDau')
            ->first();

        if (!$dot) return "📭 Hiện tại chưa có đợt đăng ký học phần mới.";

        return "📝 {$dot->TenDot}\n🗓 Thời gian: "
            . Carbon::parse($dot->NgayBatDau)->format('d/m/Y')
            . " - "
            . Carbon::parse($dot->NgayKetThuc)->format('d/m/Y');
    }

    private function getGoiYHocTap($sv)
    {
        $passed = $this->getPassedSubjects($sv);
        $passedIds = $passed->filter(fn($m) => $m->diemSo && $m->diemSo->DiemTongKet >= 4)
            ->map(fn($m) => $m->lopHocPhan->MonHocID)
            ->toArray();

        $goiY = ChuongTrinhDaoTao::where('NganhID', $sv->NganhID)
            ->whereNotIn('MonHocID', $passedIds)
            ->with('monHoc')
            ->distinct('MonHocID')
            ->take(5)
            ->get();

        if ($goiY->isEmpty()) return "🎉 Bạn đã hoàn thành chương trình đào tạo.";

        $res = "💡 GỢI Ý MÔN HỌC KỲ TỚI\n";
        foreach ($goiY as $g) {
            $res .= "\n📖 {$g->monHoc->TenMon} ({$g->monHoc->SoTinChi} TC)";
        }
        return $res;
    }

    private function getTinChi($sv)
    {
        $monHocs = $this->getPassedSubjects($sv);
        $tongTC = $monHocs->filter(fn($m) => $m->diemSo && $m->diemSo->DiemTongKet >= 4)
            ->sum(fn($m) => $m->lopHocPhan->monHoc->SoTinChi ?? 0);
        return "🎓 Bạn đã tích lũy được: **{$tongTC}** tín chỉ.";
    }

    private function getCanhBaoHocVu($sv)
    {
        $gpa = $this->getGPAValue($sv);
        if ($gpa < 1.0) return "🚨 Nguy cơ cao! GPA của bạn là {$gpa}. Cần liên hệ phòng học vụ để được tư vấn.";
        if ($gpa < 2.0) return "⚠️ GPA hiện tại là {$gpa}. Bạn cần nỗ lực hơn để cải thiện kết quả.";
        return "✅ Kết quả học tập ổn định (GPA: {$gpa}).";
    }

    private function getGPAValue($sv)
    {
        $monHocs = $this->getPassedSubjects($sv);
        $tongDiem = 0;
        $tongTC = 0;

        foreach ($monHocs as $m) {
            if (!$m->diemSo) continue;
            $he4 = $m->diemSo->getDiemHe4();
            $tc = $m->lopHocPhan->monHoc->SoTinChi;
            $tongDiem += ($he4 * $tc);
            $tongTC += $tc;
        }

        return $tongTC > 0 ? round($tongDiem / $tongTC, 2) : 0;
    }

    private function getTienDoTotNghiep($sv)
    {
        $tongMon = ChuongTrinhDaoTao::where('NganhID', $sv->NganhID)
            ->distinct('MonHocID')
            ->count('MonHocID');

        $daDat = $this->getPassedSubjects($sv)
            ->filter(fn($m) => $m->diemSo && $m->diemSo->DiemTongKet >= 4)
            ->count();

        $conLai = max(0, $tongMon - $daDat);
        $phanTram = $tongMon > 0 ? round(($daDat / $tongMon) * 100) : 0;

        return "🎓 TIẾN ĐỘ TỐT NGHIỆP\n\n✅ Đã đạt: {$daDat}/{$tongMon} môn\n📚 Còn lại: {$conLai} môn\n📈 Tiến độ: **{$phanTram}%**";
    }

    private function getDiemRenLuyen($sv)
    {
        $drl = DiemRenLuyen::where('SinhVienID', $sv->SinhVienID)
            ->latest('HocKyID')
            ->first();

        if (!$drl) return "📭 Chưa có dữ liệu điểm rèn luyện mới nhất.";

        return "🏆 ĐIỂM RÈN LUYỆN\n⭐ {$drl->TongDiem} điểm\n📊 Xếp loại: **{$drl->XepLoai}**";
    }
}