<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\SinhVien\ProfileController as SinhVienProfile;
use App\Http\Controllers\Api\SinhVien\ChuongTrinhDaoTaoController;
use App\Http\Controllers\Api\SinhVien\LichHocController;
use App\Http\Controllers\Api\SinhVien\LichThiController;
use App\Http\Controllers\Api\SinhVien\KetQuaHocTapController;
use App\Http\Controllers\Api\SinhVien\DangKyHocPhanController;
use App\Http\Controllers\Api\HocTap\LopHocPhanController;
use App\Http\Controllers\Api\GiangVien\ProfileController as GiangVienProfile;
use App\Http\Controllers\Api\GiangVien\LopHocPhanGiangVienController;
use App\Http\Controllers\Api\GiangVien\LichGiangDayController;
use App\Http\Controllers\Api\GiangVien\LichCoiThiController;
use App\Http\Controllers\Api\GiangVien\LopSinhHoatCoVanController;
use App\Http\Controllers\Api\Admin\NamHocController;
use App\Http\Controllers\Api\Admin\DotDangKyController as AdminDotDangKyController;
use App\Http\Controllers\Api\Admin\LopHocPhanController as AdminLopHocPhanController;
use App\Http\Controllers\Api\Admin\ChuongTrinhDaoTaoController as AdminChuongTrinhDaoTaoController;
use App\Http\Controllers\Api\Admin\MonHocController;
use App\Http\Controllers\Api\Admin\KhoaController;
use App\Http\Controllers\Api\Admin\LichHocController as AdminLichHocController;
use App\Http\Controllers\Api\Admin\LichThiController as AdminLichThiController;
use App\Http\Controllers\Api\Admin\LopSinhHoatController as AdminLopSinhHoatController;
use App\Http\Controllers\Api\Admin\UserController;
use App\Http\Controllers\Api\Admin\DiemSoController;
use App\Http\Controllers\Api\Admin\ThongKeController;
use App\Http\Controllers\Api\Admin\ThongBaoController;
use App\Http\Controllers\Api\SinhVien\HocPhiController;
use App\Http\Controllers\Api\Admin\AdminHocPhiController;
use App\Http\Controllers\Api\ChatController;

Route::post('/login', [AuthController::class, 'login']);

// Tất cả các đều yêu cầu Đăng nhập và Tài khoản phải đang Active
Route::middleware(['auth:api', \App\Http\Middleware\CheckActiveUser::class])->group(function () {

    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/change-password', [AuthController::class, 'changePassword']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::post('/chat', [ChatController::class, 'chat']);
   

    // --- SINH VIÊN ---
    Route::middleware(['check.sinhvien'])->prefix('sinh-vien')->group(function () {
        Route::get('profile', [SinhVienProfile::class, 'show']);
        Route::put('profile/contact', [SinhVienProfile::class, 'updateContact']);
        Route::get('study-info', [SinhVienProfile::class, 'studyInfo']);
        Route::get('chuong-trinh', [ChuongTrinhDaoTaoController::class, 'index']);
        Route::get('mon-da-hoan-thanh', [ChuongTrinhDaoTaoController::class, 'getMonDaHoanThanh']);
        Route::get('mon-con-thieu', [ChuongTrinhDaoTaoController::class, 'getMonConThieu']);
        Route::get('loc-hoc-ky', [LichHocController::class, 'getBoLocHocKy']);
        Route::get('lich-hoc', [LichHocController::class, 'xemLichHoc']);
        Route::get('lich-thi', [LichThiController::class, 'xemLichThi']);
        Route::post('ket-qua-hoc-tap', [KetQuaHocTapController::class, 'xemKetQua']);
        Route::get('hoc-phi', [HocPhiController::class, 'index']);
        Route::get('hoc-ky', [NamHocController::class, 'getDanhSachHocKy']);

        Route::post('/hoc-phi/confirm', [HocPhiController::class, 'studentConfirm']);

        // --- Nhóm các route Đăng ký học phần ---
        Route::prefix('dang-ky-hoc-phan')->group(function () {
            Route::get('lop-mo', [DangKyHocPhanController::class, 'getLopMo']);
            Route::get('da-dang-ky', [DangKyHocPhanController::class, 'getDaDangKy']);
            Route::post('huy-mon/{dangKyID}', [DangKyHocPhanController::class, 'huyMon']);

            // Các route yêu cầu đợt đăng ký phải đang mở
            Route::middleware(['check.dot_open'])->group(function () {
                Route::post('/', [DangKyHocPhanController::class, 'dangKy']);
                Route::get('check-status/{lhpID}', [DangKyHocPhanController::class, 'checkStatus']);
            });
        });

        // Chức năng Xin mở lớp
        Route::get('yeu-cau-mo-lop', [DangKyHocPhanController::class, 'getDanhSachYeuCau']);
        Route::post('yeu-cau-mo-lop', [DangKyHocPhanController::class, 'guiYeuCauMoLop']);
        Route::get('/notifications/my', [App\Http\Controllers\Api\Admin\ThongBaoController::class, 'getMyNotifications']);
        Route::get('/notifications/unread-count', [App\Http\Controllers\Api\Admin\ThongBaoController::class, 'getUnreadCount']);
        Route::post('/notifications/mark-read', [App\Http\Controllers\Api\Admin\ThongBaoController::class, 'markAllAsRead']);
    });

    // --- GIẢNG VIÊN ---
    Route::middleware(\App\Http\Middleware\CheckGiangVien::class)->prefix('giang-vien')->group(function () {
        // Profile & Account
        Route::get('profile', [GiangVienProfile::class, 'show']);
        Route::put('profile/update', [GiangVienProfile::class, 'update']);
        Route::post('profile/change-password', [GiangVienProfile::class, 'changePassword']);
        
        // Lớp học phần & Sinh viên
        Route::get('lop-hoc-phan', [LopHocPhanController::class, 'index']);
        Route::get('lop-hoc-phan/{id}/sinh-vien', [LopHocPhanGiangVienController::class, 'getSinhVienTrongLop']);
        Route::get('lop-hoc-phan/{id}/print', [LopHocPhanGiangVienController::class, 'getDanhSachIn']);
        
        // Phân công & Lịch dạy
        Route::get('lop-phan-cong', [LopHocPhanGiangVienController::class, 'getLopPhanCong']);
        Route::post('lop/sinh-vien', [LopHocPhanGiangVienController::class, 'getSinhVienTrongLop']);
        Route::get('lich-giang-day', [LichGiangDayController::class, 'getLichGiangDay']);
        Route::get('lich-coi-thi', [LichCoiThiController::class, 'getLichCoiThi']);

        Route::get('hoc-ky', [NamHocController::class, 'getDanhSachHocKy']);
        Route::post('nhap-diem', [LopHocPhanGiangVienController::class, 'updateDiem']);
        // Xuất Excel mẫu để nhập điểm
        Route::get('lop-hoc-phan/{id}/export-diem', [LopHocPhanGiangVienController::class, 'exportDiemTemplate']);
        // Import điểm từ Excel
        Route::post('lop-hoc-phan/{id}/import-diem', [LopHocPhanGiangVienController::class, 'importDiemFromExcel']);
    
        Route::patch('lich-thi/update', [LopHocPhanGiangVienController::class, 'updateLichThi']);
        Route::get('lop-sinh-hoat/phan-cong', [LopSinhHoatCoVanController::class, 'getLopPhanCong']);
        Route::post('lop-sinh-hoat/sinh-vien', [LopSinhHoatCoVanController::class, 'getSinhVienTrongLop']);
        Route::post('lop-sinh-hoat/diem-ren-luyen', [LopSinhHoatCoVanController::class, 'getDiemRenLuyen']);
        Route::post('lop-sinh-hoat/cap-nhat-diem-ren-luyen', [LopSinhHoatCoVanController::class, 'capNhatDiemRenLuyen']);
        Route::get('/notifications/my', [App\Http\Controllers\Api\Admin\ThongBaoController::class, 'getMyNotifications']);
        Route::get('/notifications/unread-count', [App\Http\Controllers\Api\Admin\ThongBaoController::class, 'getUnreadCount']);
        Route::post('/notifications/mark-read', [App\Http\Controllers\Api\Admin\ThongBaoController::class, 'markAllAsRead']);
    });

    // --- ADMIN ---
    Route::middleware(\App\Http\Middleware\CheckAdmin::class)->prefix('admin')->group(function () {
        Route::get('thong-bao', [ThongBaoController::class, 'index']);
        Route::post('thong-bao', [ThongBaoController::class, 'store']);
        Route::put('thong-bao/{id}', [ThongBaoController::class, 'update']);
        Route::post('thong-bao/{id}/send-email', [ThongBaoController::class, 'sendEmail']);
        Route::delete('thong-bao/{id}', [ThongBaoController::class, 'destroy']);

        Route::get('thong-ke', [ThongKeController::class, 'index']);

        Route::post('nam-hoc', [NamHocController::class, 'storeNamHoc']);
        Route::get('nam-hoc', [NamHocController::class, 'getDanhSachNamHoc']);
        Route::put('nam-hoc/{id}', [NamHocController::class, 'updateNamHoc']);
        Route::delete('nam-hoc/{id}', [NamHocController::class, 'destroyNamHoc']);
        Route::post('hoc-ky', [NamHocController::class, 'storeHocKy']);
        Route::get('hoc-ky', [NamHocController::class, 'getDanhSachHocKy']);
        Route::put('hoc-ky/{id}', [NamHocController::class, 'updateHocKy']);
        Route::delete('hoc-ky/{id}', [NamHocController::class, 'destroyHocKy']);

        // Quản lý Khoa
        Route::post('khoa/list', [KhoaController::class, 'index']);
        Route::post('khoa', [KhoaController::class, 'store']);
        Route::get('khoa/{id}/nganh', [KhoaController::class, 'getNganhByKhoa']);
        Route::get('nganh/list', [KhoaController::class, 'getAllNganh']);
        Route::delete('khoa/{id}', [KhoaController::class, 'destroy']);
        Route::patch('khoa/{id}', [KhoaController::class, 'update']);
        Route::post('nganh', [KhoaController::class, 'storeNganh']); // Thêm route cho việc tạo ngành
        Route::patch('nganh/{id}', [KhoaController::class, 'updateNganh']);
        Route::delete('nganh/{id}', [KhoaController::class, 'destroyNganh']);

        Route::post('dot-dang-ky/filter', [AdminDotDangKyController::class, 'filterDots']);
        Route::post('dot-dang-ky/lop-hoc-phan-list', [AdminDotDangKyController::class, 'getLopHocPhanByJson']);
        Route::post('dot-dang-ky', [AdminDotDangKyController::class, 'storeDotDangKy']);
        Route::put('dot-dang-ky/cap-nhat', [AdminDotDangKyController::class, 'updateDotDangKy']);
        Route::put('dot-dang-ky/doi-trang-thai', [AdminDotDangKyController::class, 'changeStatusDotDangKy']);
        Route::delete('dot-dang-ky/{id}', [AdminDotDangKyController::class, 'destroy']);
        
        Route::get('lop-hoc-phan', [AdminLopHocPhanController::class, 'index']);
        Route::post('lop-hoc-phan', [AdminLopHocPhanController::class, 'store']);
        Route::patch('lop-hoc-phan/update', [AdminLopHocPhanController::class, 'update']);
        Route::delete('lop-hoc-phan/{id}', [AdminLopHocPhanController::class, 'destroy']);
        Route::patch('lop-hoc-phan/giang-vien', [AdminLopHocPhanController::class, 'assignGiangVien']);
        Route::patch('lop-hoc-phan/si-so', [AdminLopHocPhanController::class, 'setSiSo']);
        
        Route::post('lich-hoc/list', [AdminLichHocController::class, 'index']);
        Route::post('lich-hoc/create', [AdminLichHocController::class, 'store']);
        Route::post('lich-hoc/update', [AdminLichHocController::class, 'update']);

        Route::post('lich-thi/create', [AdminLichThiController::class, 'store']);
        Route::post('lich-thi/update', [AdminLichThiController::class, 'update']);

        Route::get('chuong-trinh-dao-tao', [AdminChuongTrinhDaoTaoController::class, 'index']);
        Route::post('chuong-trinh-dao-tao', [AdminChuongTrinhDaoTaoController::class, 'store']);
        Route::patch('chuong-trinh-dao-tao', [AdminChuongTrinhDaoTaoController::class, 'update']);
        Route::delete('chuong-trinh-dao-tao/{id}', [AdminChuongTrinhDaoTaoController::class, 'destroy']);
        Route::delete('chuong-trinh-dao-tao/nganh/{nganhId}', [AdminChuongTrinhDaoTaoController::class, 'destroyByNganh']);
        Route::post('chuong-trinh-dao-tao/gan-nhieu-mon', [AdminChuongTrinhDaoTaoController::class, 'ganNhieuMon']);
        Route::post('chuong-trinh/import', [AdminChuongTrinhDaoTaoController::class, 'import']);
        
        Route::post('mon-hoc/list', [MonHocController::class, 'index']);
        Route::post('mon-hoc', [MonHocController::class, 'store']); 
        Route::patch('mon-hoc', [MonHocController::class, 'update']); // Đổi sang patch cho đồng bộ frontend
        Route::delete('mon-hoc/{id}', [MonHocController::class, 'destroy']); // Thêm route xóa
        Route::post('mon-hoc/tien-quyet', [MonHocController::class, 'addTienQuyet']);
        Route::post('mon-hoc/song-hanh', [MonHocController::class, 'addSongHanh']);

        Route::post('lop-sinh-hoat/danh-sach', [AdminLopSinhHoatController::class, 'index']);
        Route::post('lop-sinh-hoat/create', [AdminLopSinhHoatController::class, 'store']);
        Route::post('lop-sinh-hoat/assign-advisor', [AdminLopSinhHoatController::class, 'assignAdvisor']);
        Route::post('lop-sinh-hoat/add-students', [AdminLopSinhHoatController::class, 'addStudents']);
        Route::post('lop-sinh-hoat/list-students', [AdminLopSinhHoatController::class, 'listStudents']);
        Route::post('lop-sinh-hoat/remove-student', [AdminLopSinhHoatController::class, 'removeStudent']);

        Route::post('users/sinh-vien', [UserController::class, 'storeSinhVien']);
        Route::post('users/giang-vien-with-account', [UserController::class, 'storeGiangVienWithAccount']);
        Route::post('users/staff-profile', [UserController::class, 'storeStaffProfile']);
        Route::post('users/assign-account', [UserController::class, 'assignAccount']);
        Route::post('users/toggle-status', [UserController::class, 'toggleStatus']);
        Route::post('users/reset-password', [UserController::class, 'resetPassword']);
        Route::patch('users/sinh-vien', [UserController::class, 'updateSinhVien']);
        Route::patch('users/staff', [UserController::class, 'updateStaff']);
        Route::delete('users/{id}', [UserController::class, 'destroy']);
        Route::delete('users/profile/{id}/{roleId}', [UserController::class, 'destroyStaffProfile']);

        Route::post('users/sinh-vien/index', [UserController::class, 'indexSinhVien']);
        Route::post('users/sinh-vien/search', [UserController::class, 'indexSinhVien']);
        Route::post('users/staff/index', [UserController::class, 'indexStaff']);
        Route::post('users/staff/search', [UserController::class, 'indexStaff']);

        Route::post('users/giang-vien/index', [UserController::class, 'indexStaff']);
        Route::post('users/admin-list/index', [UserController::class, 'indexStaff']);


        Route::post('diem-so/danh-sach-lop-hp', [DiemSoController::class, 'indexLopHP']);
        Route::post('diem-so/danh-sach-ren-luyen', [DiemSoController::class, 'indexRenLuyen']);
        Route::post('diem-so/nhap-diem', [DiemSoController::class, 'updateDiem']);
        Route::post('diem-so/nhap-diem-ren-luyen', [DiemSoController::class, 'updateRenLuyen']);
        Route::post('diem-so/khoa-diem', [DiemSoController::class, 'lockDiem']);
        Route::post('diem-so/mo-khoa-diem', [DiemSoController::class, 'unlockDiem']);

        // Quản lý học phí
        Route::get('hoc-phi', [AdminHocPhiController::class, 'index']);
        Route::post('hoc-phi/confirm', [AdminHocPhiController::class, 'confirmPayment']);

        Route::post('thong-ke/sinh-vien-khoa', [ThongKeController::class, 'sinhVienTheoKhoa']);
        Route::post('thong-ke/si-so-lop', [ThongKeController::class, 'thongKeSiSoLop']);
        Route::post('thong-ke/ty-le-dau-rot', [ThongKeController::class, 'tyLeDauRot']);
        Route::post('thong-ke/gpa-hoc-ky', [ThongKeController::class, 'gpaTrungBinh']);
        
        // Thêm route tổng hợp cho dashboard thống kê
        Route::post('thong-ke-dang-ky', [ThongKeController::class, 'index']);

        // Quản lý yêu cầu mở lớp
        Route::get('yeu-cau-mo-lop', [AdminLopHocPhanController::class, 'getDanhSachYeuCau']);
        Route::patch('yeu-cau-mo-lop/{id}/status', [AdminLopHocPhanController::class, 'updateStatusYeuCau']);
        Route::delete('yeu-cau-mo-lop/{id}', [AdminLopHocPhanController::class, 'xoaYeuCau']);
    });
});