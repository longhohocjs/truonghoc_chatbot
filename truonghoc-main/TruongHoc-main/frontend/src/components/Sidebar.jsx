import React, { useState } from "react";
import { NavLink } from "react-router-dom";

const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Phân nhóm các chức năng để tạo đường kẻ ngăn cách
  const menuGroups = [
    {
      id: "personal",
      items: [
        { path: "/sinh-vien/profile", label: "Hồ sơ cá nhân" },
        { path: "/sinh-vien/dang-ky", label: "Đăng ký học phần" },
        { path: "/sinh-vien/lich-hoc", label: "Thời khóa biểu" },
        { path: "/sinh-vien/lich-thi", label: "Lịch thi học kỳ" },
      ],
    },
    {
      id: "academic",
      items: [
        { path: "/sinh-vien/ket-qua", label: "Kết quả học tập" },
        { path: "/sinh-vien/chuong-trinh", label: "Chương trình đào tạo" },
      ],
    },
    {
      id: "support",
      items: [{ path: "/sinh-vien/xin-mo-lop", label: "Yêu cầu mở lớp" }],
    },
  ];

  return (
    <aside
      className={`relative h-screen bg-white border-r border-gray-100 transition-all duration-500 ease-in-out z-30 ${
        isCollapsed ? "w-16" : "w-64"
      }`}
    >
      {/* Button thu gọn: Hình tròn nhỏ tinh tế nằm trên đường border */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-12 z-40 flex h-6 w-6 items-center justify-center rounded-full border border-gray-100 bg-white text-gray-400 shadow-sm hover:text-indigo-600 hover:border-indigo-200 transition-all"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          className={`h-3 w-3 transition-transform duration-500 ${isCollapsed ? "rotate-180" : ""}`}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="3"
            d="M15 19l-7-7 7-7"
          />
        </svg>
      </button>

      <div className="flex flex-col h-full py-8">
        {/* Logo hoặc Tên hệ thống */}
        <div
          className={`px-8 mb-12 transition-all duration-300 ${isCollapsed ? "opacity-0 invisible" : "opacity-100"}`}
        >
          <span className="text-sm font-bold tracking-[0.15em] text-gray-800 uppercase">
            i<span className="text-indigo-600">Student</span>
          </span>
        </div>

        <nav className="flex-1 px-3 space-y-6">
          {menuGroups.map((group, gIdx) => (
            <div key={group.id} className="flex flex-col gap-1">
              {/* Đường mờ ngăn cách giữa các nhóm (trừ nhóm đầu tiên) */}
              {gIdx !== 0 && (
                <div className="mx-4 my-4 h-px bg-gradient-to-r from-transparent via-gray-100 to-transparent" />
              )}

              {group.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `relative flex items-center px-5 py-3 rounded-xl text-[13.5px] transition-all duration-300 group
                    ${
                      isActive
                        ? "bg-indigo-50/60 text-indigo-700 font-medium"
                        : "text-gray-500 hover:text-indigo-600 hover:bg-indigo-50/50"
                    }
                  `
                  }
                >
                  {/* Thanh chỉ thị màu xanh khi Active */}
                  <div
                    className={`absolute left-0 w-1 h-5 bg-indigo-600 rounded-r-full scale-y-0 transition-transform duration-300 group-[.active]:scale-y-100`}
                  />

                  <span
                    className={`truncate whitespace-nowrap transition-all duration-300 ${
                      isCollapsed
                        ? "opacity-0 -translate-x-4"
                        : "opacity-100 translate-x-0"
                    }`}
                  >
                    {item.label}
                  </span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;
