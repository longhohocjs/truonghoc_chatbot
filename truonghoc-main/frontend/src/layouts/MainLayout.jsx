import React, { useState, Fragment, useEffect } from "react";
import {
  Outlet,
  Link,
  useNavigate,
  useLocation,
  NavLink,
} from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import axiosClient from "@/api/axios";
import ChatBox from "@/components/ChatBox";
import {
  LayoutDashboard,
  Users,
  Megaphone,
  CalendarDays,
  Building2,
  Timer,
  BookOpen,
  FileText,
  School,
  Calendar,
  PenTool,
  ClipboardList,
  Inbox,
  UserCircle,
  CheckCircle2,
  Flag,
  Send,
  ChevronDown,
  User,
  LogOut,
  Bell,
  Wallet,
} from "lucide-react";

const MainLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Hàm lấy số lượng thông báo chưa đọc
  const fetchUnreadCount = async () => {
    try {
      const rawRole = user?.role?.toLowerCase() || "";
      let endpoint = "";

      // Xác định endpoint dựa trên vai trò
      if (rawRole === "sinhvien" || rawRole === "sinh_vien") {
        endpoint = "/sinh-vien/notifications/unread-count";
      } else if (rawRole.includes("giang") || rawRole.includes("giảng")) {
        endpoint = "/giang-vien/notifications/unread-count";
      }

      if (endpoint) {
        const res = await axiosClient.get(endpoint);
        setUnreadCount(res.unread_count || 0);
      }
    } catch (error) {
      console.error("Lỗi lấy số thông báo chưa đọc:", error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchUnreadCount();
    }
  }, [user, location.pathname]); // Cập nhật lại khi đổi trang (ví dụ vừa xem xong quay ra)

  // Định nghĩa danh sách menu theo vai trò
  const menuItems = {
    admin: [
      {
        path: "/dashboard",
        label: "Tổng quan",
        icon: <LayoutDashboard size={18} />,
      },
      {
        path: "/admin/users",
        label: "Quản lý Người dùng",
        icon: <Users size={18} />,
      },
      {
        path: "/admin/thong-bao",
        label: "Thông báo",
        icon: <Megaphone size={18} />,
      },
      {
        path: "/admin/nam-hoc",
        label: "Năm học & Học kỳ",
        icon: <CalendarDays size={18} />,
      },
      {
        path: "/admin/khoa-nganh",
        label: "Khoa & Ngành",
        icon: <Building2 size={18} />,
      },
      {
        path: "/admin/dot-dang-ky",
        label: "Quản lý Đợt đăng ký",
        icon: <Timer size={18} />,
      },
      {
        path: "/admin/mon-hoc",
        label: "Môn học",
        icon: <BookOpen size={18} />,
      },
      {
        path: "/admin/chuong-trinh-dao-tao",
        label: "Chương trình đào tạo",
        icon: <FileText size={18} />,
      },
      {
        path: "/admin/lop-hoc-phan",
        label: "Lớp học phần",
        icon: <School size={18} />,
      },
      {
        path: "/admin/lich-hoc",
        label: "Phân lịch học",
        icon: <Calendar size={18} />,
      },
      {
        path: "/admin/lich-thi",
        label: "Phân lịch thi",
        icon: <PenTool size={18} />,
      },
      {
        path: "/admin/lop-sinh-hoat",
        label: "Lớp sinh hoạt",
        icon: <Users size={18} />,
      },
      {
        path: "/admin/diem-so",
        label: "Quản lý Điểm",
        icon: <ClipboardList size={18} />,
      },
      {
        path: "/admin/hoc-phi",
        label: "Quản lý Học phí",
        icon: <Wallet size={18} />,
      },
      {
        path: "/admin/yeu-cau-mo-lop",
        label: "Yêu cầu mở lớp",
        icon: <Inbox size={18} />,
      },
    ],
    giangvien: [
      {
        path: "/giang-vien/profile",
        label: "Hồ sơ cá nhân",
        icon: <UserCircle size={18} />,
      },
      {
        path: "/giang-vien/lop-phan-cong",
        label: "Lớp giảng dạy",
        icon: <ClipboardList size={18} />,
      },
      {
        path: "/giang-vien/lop-sinh-hoat",
        label: "Lớp sinh hoạt",
        icon: <Users size={18} />,
      },
      {
        path: "/giang-vien/lich-giang-day",
        label: "Lịch giảng dạy",
        icon: <Calendar size={18} />,
      },
      {
        path: "/giang-vien/lich-coi-thi",
        label: "Lịch coi thi",
        icon: <PenTool size={18} />,
      },
    ],
    sinhvien: [
      {
        path: "/sinh-vien/profile",
        label: "Thông tin cá nhân",
        icon: <UserCircle size={18} />,
      },
      {
        path: "/sinh-vien/chuong-trinh",
        label: "Chương trình đào tạo",
        icon: <BookOpen size={18} />,
      },
      {
        path: "/sinh-vien/mon-da-dat",
        label: "Môn đã hoàn thành",
        icon: <CheckCircle2 size={18} />,
      },
      {
        path: "/sinh-vien/mon-con-thieu",
        label: "Môn còn thiếu",
        icon: <Flag size={18} />,
      },
      {
        path: "/sinh-vien/dang-ky",
        label: "Đăng ký học phần",
        icon: <ClipboardList size={18} />,
      },
      {
        path: "/sinh-vien/ket-qua",
        label: "Kết quả học tập",
        icon: <FileText size={18} />,
      },
      {
        path: "/sinh-vien/lich-hoc",
        label: "Lịch học",
        icon: <Calendar size={18} />,
      },
      {
        path: "/sinh-vien/lich-thi",
        label: "Lịch thi",
        icon: <PenTool size={18} />,
      },
      {
        path: "/sinh-vien/hoc-phi",
        label: "Học phí & Lệ phí",
        icon: <Wallet size={18} />,
      },
      {
        path: "/sinh-vien/xin-mo-lop",
        label: "Xin mở lớp",
        icon: <Send size={18} />,
      },
    ],
  };

  // Chuẩn hóa role để khớp với key trong menuItems (xử lý cả giangvien và giang_vien)
  const getMenu = () => {
    const role = user?.role?.toLowerCase() || "";
    if (role.includes("giang") || role.includes("giảng"))
      return menuItems.giangvien;
    return menuItems[role] || [];
  };

  const currentMenu = getMenu();

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside
        className={`relative h-screen bg-white border-r border-gray-100 transition-all duration-500 ease-in-out z-30 ${
          isSidebarOpen ? "w-64" : "w-16"
        } flex flex-col`}
      >
        {/* Toggle Button */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="absolute -right-3 top-12 z-40 flex h-6 w-6 items-center justify-center rounded-full border border-gray-100 bg-white text-gray-400 shadow-sm hover:text-indigo-600 hover:border-indigo-200 transition-all"
        >
          <ChevronDown
            size={12}
            className={`transition-transform duration-500 ${isSidebarOpen ? "rotate-90" : "-rotate-90"}`}
          />
        </button>

        <div className="p-8 mb-4">
          <span
            className={`text-sm font-bold tracking-[0.15em] text-gray-800 uppercase transition-opacity duration-300 ${isSidebarOpen ? "opacity-100" : "opacity-0 invisible"}`}
          >
            Edu<span className="text-indigo-600 font-black">sys</span>
          </span>
        </div>

        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {currentMenu.map((item, index) => {
            const isActive = location.pathname === item.path;
            return (
              <Fragment key={item.path}>
                {user?.role === "sinhvien" &&
                  (index === 1 || index === 4 || index === 8) && (
                    <div className="mx-4 my-4 h-px bg-gradient-to-r from-transparent via-gray-100 to-transparent" />
                  )}
                <Link
                  to={item.path}
                  className={`relative flex items-center px-5 py-3 rounded-xl text-[13.5px] transition-all duration-300 group overflow-hidden
                    ${
                      isActive
                        ? "bg-indigo-50/80 text-indigo-700 font-semibold shadow-sm shadow-indigo-100/50"
                        : "text-gray-500 hover:text-indigo-600 hover:bg-indigo-50/30 font-medium"
                    }`}
                >
                  <div
                    className={`absolute left-0 w-1 h-5 bg-indigo-600 rounded-r-full transition-transform duration-300 ${isActive ? "scale-y-100" : "scale-y-0"}`}
                  />
                  <div
                    className={`flex items-center transition-transform duration-300 group-hover:translate-x-1.5 ${!isSidebarOpen ? "w-full justify-center" : ""}`}
                  >
                    <span
                      className={`flex-shrink-0 transition-colors ${isSidebarOpen ? "mr-3" : "mr-0"}`}
                    >
                      {item.icon}
                    </span>
                    <span
                      className={`truncate transition-all duration-300 ${isSidebarOpen ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4 invisible"}`}
                    >
                      {item.label}
                    </span>
                  </div>
                </Link>
              </Fragment>
            );
          })}
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-20 bg-gradient-to-r from-indigo-700 via-indigo-600 to-blue-600 flex items-center justify-between px-8 shadow-md z-20">
          <h1 className="text-2xl font-bold text-white tracking-tight">
            {currentMenu.find(
              (m) =>
                location.pathname === m.path ||
                location.pathname.startsWith(m.path + "/"),
            )?.label || "Bảng điều khiển"}
          </h1>

          <div className="flex items-center space-x-6">
            <Link
              to={
                user?.role?.toLowerCase().includes("admin")
                  ? "/admin/thong-bao"
                  : user?.role?.toLowerCase().includes("giang") ||
                      user?.role?.toLowerCase().includes("giảng")
                    ? "/giang-vien/thong-bao"
                    : "/sinh-vien/thong-bao"
              }
              className="p-2 text-indigo-100 hover:text-white hover:bg-white/10 rounded-full transition-all relative"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 flex h-4 min-w-[1rem] px-1 items-center justify-center bg-rose-500 text-[10px] font-black text-white rounded-full border-2 border-indigo-600 animate-bounce">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>

            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center space-x-3 p-1 pr-3 rounded-full hover:bg-white/10 transition-all border border-transparent hover:border-white/20 text-white"
              >
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-indigo-600 shadow-inner border-2 border-indigo-300 overflow-hidden text-sm font-bold">
                  {user?.name?.charAt(0) || "U"}
                </div>
                <ChevronDown
                  size={14}
                  className={`transition-transform duration-300 ${isUserMenuOpen ? "rotate-180" : ""}`}
                />
              </button>

              {isUserMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setIsUserMenuOpen(false)}
                  ></div>
                  <div className="absolute right-0 mt-3 w-56 bg-white rounded-2xl shadow-2xl z-20 py-2 border border-gray-100">
                    <div className="px-4 py-3 border-b border-gray-50 mb-1">
                      <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">
                        Tài khoản
                      </p>
                      <p className="text-sm font-bold text-gray-800 truncate">
                        {user?.name}
                      </p>
                    </div>
                    <Link
                      to={
                        user?.role?.toLowerCase().includes("giang") ||
                        user?.role?.toLowerCase().includes("giảng")
                          ? "/giang-vien/profile"
                          : "/sinh-vien/profile"
                      }
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center space-x-3 px-4 py-3 text-sm text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                    >
                      <User size={16} />
                      <span className="font-medium">Hồ sơ của tôi</span>
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center space-x-3 px-4 py-3 text-sm text-red-500 hover:bg-red-50 transition-colors border-t border-gray-50 mt-1"
                    >
                      <LogOut size={16} />
                      <span className="font-bold">Đăng xuất</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-8 bg-gray-50/50">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
      {/* Ẩn ChatBox trên trang ADMIN (chỉ SV & GV) */}
      {user && !user?.role?.toLowerCase().includes("admin") && <ChatBox />}
    </div>
  );
};

export default MainLayout;
