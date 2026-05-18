import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";

// Context & Auth
import { AuthProvider, useAuth } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Login from "@/pages/Login";

// Layout & Common
import MainLayout from "@/layouts/MainLayout";
import Dashboard from "@/pages/Dashboard";

// Admin Pages
import UserManagement from "@/pages/admin/UserManagement";
import NamHocHocKy from "@/pages/admin/NamHocHocKy";
import QuanLyKhoa from "./pages/admin/QuanLyKhoa";
import MonHocManagement from "@/pages/admin/MonHocManagement";
import QuanLyLopHocPhan from "@/pages/admin/QuanLyLopHocPhan";
import LichHocManagementPage from "./pages/admin/LichHocManagementPage";
import LichThiManagementPage from "./pages/admin/LichThiManagementPage";
import DotDangKyManager from "@/pages/admin/DotDangKyManager";
import ThongBaoManager from "@/pages/admin/ThongBaoManager";
import ChuongTrinhDaoTaoManager from "@/pages/admin/ChuongTrinhDaoTaoManager";
import LopSinhHoatManagement from "@/pages/admin/LopSinhHoatManagement";
import LopSinhHoatDetail from "@/pages/admin/LopSinhHoatDetail";
import DiemManagement from "@/pages/admin/DiemManagement";
import DiemDetail from "@/pages/admin/DiemDetail";
import ThongKeBaoCao from "@/pages/admin/ThongKeBaoCao";
import AdminManageClassRequests from "@/pages/admin/AdminManageClassRequests";
import HocPhiManagement from "@/pages/admin/HocPhiManagement";

// Giang Vien Pages
import GiangVienProfile from "@/pages/giangvien/GiangVienProfile";
import LopPhanCong from "@/pages/giangvien/LopPhanCong";
import LichGiangDay from "@/pages/giangvien/LichGiangDay";
import LichCoiThi from "@/pages/giangvien/LichCoiThi";
import LopSinhHoatList from "@/pages/giangvien/LopSinhHoatList";
import TeacherClassStudentList from "@/pages/giangvien/TeacherClassStudentList";
import AdvisorClass from "@/pages/giangvien/AdvisorClass";

// Sinh Vien Pages
import StudentProfile from "@/pages/sinhvien/StudentProfile";
import DangKyHocPhan from "@/pages/sinhvien/DangKyHocPhan";
import KetQuaHocTap from "@/pages/sinhvien/KetQuaHocTap";
import LichHoc from "@/pages/sinhvien/LichHoc";
import LichThi from "@/pages/sinhvien/LichThi";
import StudentRequestClass from "@/pages/sinhvien/StudentRequestClass";
import ChuongTrinhDaoTao from "@/pages/sinhvien/ChuongTrinhDaoTao";
import MonDaHoanThanh from "@/pages/sinhvien/MonDaHoanThanh";
import MonConThieu from "@/pages/sinhvien/MonConThieu";
import HocPhi from "@/pages/sinhvien/HocPhi";
import UserNotifications from "@/pages/UserNotifications";

const Unauthorized = () => (
  <div className="p-10 text-center text-red-500 font-bold text-2xl">
    403 - Bạn không có quyền truy cập trang này!
  </div>
);

const RoleBasedDashboard = () => {
  const { user } = useAuth();
  // Chuẩn hóa role về một kiểu duy nhất để dễ kiểm tra
  const rawRole = user?.role?.toLowerCase() || "";
  const isGiangVien = ["giangvien", "giang_vien", "giảng viên"].includes(
    rawRole,
  );

  if (rawRole === "sinhvien" || rawRole === "sinh_vien") {
    return <Navigate to="/sinh-vien/profile" replace />;
  }
  if (isGiangVien) {
    return <Navigate to="/giang-vien/profile" replace />;
  }
  return <Dashboard />;
};

function App() {
  return (
    <AuthProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: { background: "#333", color: "#fff" },
        }}
      />
      <BrowserRouter>
        <Routes>
          {/* Tuyến đường công khai */}
          <Route path="/login" element={<Login />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* Tuyến đường yêu cầu Đăng nhập (Dùng chung cho tất cả role) */}
          <Route element={<ProtectedRoute />}>
            <Route element={<MainLayout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<RoleBasedDashboard />} />

              {/* Nhóm chức năng cho ADMIN */}
              <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
                <Route path="/admin/users" element={<UserManagement />} />
                <Route path="/admin/nam-hoc" element={<NamHocHocKy />} />
                {/* Hỗ trợ cả 2 đường dẫn để tránh lỗi điều hướng từ Sidebar cũ */}
                <Route path="/admin/khoa-nganh" element={<QuanLyKhoa />} />
                <Route path="/admin/khoa" element={<QuanLyKhoa />} />
                <Route
                  path="/admin/dot-dang-ky"
                  element={<DotDangKyManager />}
                />
                <Route path="/admin/thong-bao" element={<ThongBaoManager />} />
                <Route
                  path="/admin/lich-hoc"
                  element={<LichHocManagementPage />}
                />
                <Route
                  path="/admin/lich-thi"
                  element={<LichThiManagementPage />}
                />
                <Route path="/admin/mon-hoc" element={<MonHocManagement />} />
                <Route
                  path="/admin/chuong-trinh-dao-tao"
                  element={<ChuongTrinhDaoTaoManager />}
                />
                <Route
                  path="/admin/lop-sinh-hoat"
                  element={<LopSinhHoatManagement />}
                />
                <Route
                  path="/admin/lop-sinh-hoat/:id"
                  element={<LopSinhHoatDetail />}
                />
                <Route path="/admin/diem-so" element={<DiemManagement />} />
                <Route path="/admin/diem-so/:id" element={<DiemDetail />} />
                <Route
                  path="/admin/lop-hoc-phan"
                  element={<QuanLyLopHocPhan />}
                />
                <Route
                  path="/admin/yeu-cau-mo-lop"
                  element={<AdminManageClassRequests />}
                />
                <Route path="/admin/hoc-phi" element={<HocPhiManagement />} />
                <Route path="/admin/thong-ke" element={<ThongKeBaoCao />} />
              </Route>

              {/* Nhóm chức năng cho GIẢNG VIÊN */}
              <Route
                element={
                  <ProtectedRoute
                    allowedRoles={["giangvien", "giang_vien", "giảng viên"]}
                  />
                }
              >
                <Route
                  path="/giang-vien/thong-bao"
                  element={<UserNotifications />}
                />
                <Route
                  path="/giang-vien/profile"
                  element={<GiangVienProfile />}
                />
                <Route
                  path="/giang-vien/lop-phan-cong"
                  element={<LopPhanCong />}
                />
                <Route
                  path="/giang-vien/lich-giang-day"
                  element={<LichGiangDay />}
                />
                <Route
                  path="/giang-vien/lich-coi-thi"
                  element={<LichCoiThi />}
                />
                <Route
                  path="/giang-vien/lop/:id/sinh-vien"
                  element={<TeacherClassStudentList />}
                />
                <Route
                  path="/giang-vien/lop-sinh-hoat"
                  element={<LopSinhHoatList />}
                />
                <Route
                  path="/giang-vien/lop-sinh-hoat/:id"
                  element={<AdvisorClass />}
                />
              </Route>

              {/* Nhóm chức năng cho SINH VIÊN */}
              <Route element={<ProtectedRoute allowedRoles={["sinhvien"]} />}>
                <Route
                  path="/sinh-vien/thong-bao"
                  element={<UserNotifications />}
                />
                <Route path="/sinh-vien/profile" element={<StudentProfile />} />
                <Route path="/sinh-vien/dang-ky" element={<DangKyHocPhan />} />
                <Route
                  path="/sinh-vien/xin-mo-lop"
                  element={<StudentRequestClass />}
                />
                <Route
                  path="/sinh-vien/chuong-trinh"
                  element={<ChuongTrinhDaoTao />}
                />
                <Route path="/sinh-vien/ket-qua" element={<KetQuaHocTap />} />
                <Route
                  path="/sinh-vien/mon-da-dat"
                  element={<MonDaHoanThanh />}
                />
                <Route
                  path="/sinh-vien/mon-con-thieu"
                  element={<MonConThieu />}
                />
                <Route path="/sinh-vien/lich-hoc" element={<LichHoc />} />
                <Route path="/sinh-vien/lich-thi" element={<LichThi />} />
                <Route path="/sinh-vien/hoc-phi" element={<HocPhi />} />
              </Route>
            </Route>
          </Route>

          {/* Điều hướng mặc định nếu không khớp route nào */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
