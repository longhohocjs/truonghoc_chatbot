import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

const ProtectedRoute = ({ allowedRoles }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Đang tải thông tin user từ token
  if (loading) {
    return (
      <div className="p-10 text-center font-bold">
        Đang kiểm tra quyền truy cập...
      </div>
    );
  }

  // Chưa đăng nhập -> Chuyển hướng về trang login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Nếu route yêu cầu role cụ thể
  if (allowedRoles) {
    const userRole = user.role?.toLowerCase();
    const isAllowed = allowedRoles.some(
      (role) => role.toLowerCase() === userRole,
    );

    if (!isAllowed) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  // Có quyền hoặc route không yêu cầu role -> Cho phép truy cập
  return <Outlet />;
};

export default ProtectedRoute;
