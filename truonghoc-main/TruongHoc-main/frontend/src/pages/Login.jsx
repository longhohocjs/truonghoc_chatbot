import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import axiosClient from "@/api/axios";
import toast from "react-hot-toast";
import {
  User,
  Lock,
  LogIn,
  GraduationCap,
  ShieldCheck,
  Loader2,
} from "lucide-react";

const Login = () => {
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [error, setError] = useState(""); // Khai báo state error bị thiếu
  const [loading, setLoading] = useState(false);
  const { login, user } = useAuth(); // Lấy thêm biến user từ Context
  const navigate = useNavigate();

  // Nếu đã đăng nhập thì tự động chuyển hướng (Giống bản cũ)
  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // 1. Đảm bảo lấy đúng giá trị chuỗi, phòng trường hợp bị dính Object từ autofill
    let finalUsername = formData.username;
    if (typeof finalUsername === "object" && finalUsername !== null) {
      finalUsername = finalUsername.username || "";
    }

    const username = String(finalUsername || "").trim();
    const password = String(formData.password || "").trim();

    if (!username || !password) {
      return toast.error("Vui lòng nhập đầy đủ thông tin");
    }

    // Kiểm tra nếu password bị trình duyệt điền nhầm là Token (thường bắt đầu bằng eyJ)
    if (password.startsWith("eyJh") && password.includes(".")) {
      return toast.error(
        "Trình duyệt điền sai mật khẩu, vui lòng nhập lại manually.",
      );
    }

    setLoading(true);

    try {
      // 2. Sử dụng hàm login từ Context (giống bản cũ bạn bảo hoạt động bình thường)
      // Đảm bảo truyền 2 tham số riêng biệt là chuỗi
      const res = await login(username, password);
      console.log("Login Response:", res);

      // Tùy vào cấu hình AuthContext, res có thể là response.data
      if (res && (res.success || res.token)) {
        toast.success("Đăng nhập thành công!");
        navigate("/dashboard");
      } else {
        const msg =
          res?.message || "Tên đăng nhập hoặc mật khẩu không chính xác";
        setError(msg);
        toast.error(msg);
      }
    } catch (error) {
      console.error("Login Error:", error);
      const message =
        error.response?.data?.message ||
        error.message ||
        "Tài khoản hoặc mật khẩu không chính xác";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Decorative Background Blobs */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-100/50 rounded-full -mr-48 -mt-48 blur-3xl animate-pulse" />
      <div className="absolute bottom-0 left-20 w-[400px] h-[400px] bg-blue-100/40 rounded-full -mb-32 blur-3xl" />

      <div className="w-full max-w-[450px] relative z-10 animate-fadeIn">
        {/* Brand Identity */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-indigo-600 rounded-[2rem] text-white shadow-2xl shadow-indigo-200 mb-6 rotate-3">
            <GraduationCap size={40} />
          </div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">
            i<span className="text-indigo-600">Student</span>
          </h1>
          <p className="text-gray-400 text-sm font-bold uppercase tracking-[0.2em] mt-2">
            Hệ thống quản lý đào tạo
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-[2.5rem] p-10 shadow-xl shadow-indigo-100/50 border border-gray-100">
          <div className="mb-8">
            <h2 className="text-xl font-black text-gray-800 tracking-tight">
              Đăng nhập
            </h2>
            <p className="text-gray-400 text-xs font-medium mt-1">
              Truy cập vào tài khoản quản lý của bạn
            </p>
          </div>

          {/* Hiển thị lỗi nếu có (Giống bản cũ bạn thích) */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-xs font-bold animate-pulse">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username Input */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                Tên đăng nhập / Mã số
              </label>
              <div className="relative group">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-indigo-500 transition-colors">
                  <User size={18} />
                </div>
                <input
                  type="text"
                  autoComplete="username"
                  className="w-full pl-14 pr-6 py-4 bg-gray-50 border border-transparent rounded-2xl outline-none focus:bg-white focus:border-indigo-200 focus:ring-4 focus:ring-indigo-500/5 transition-all font-bold text-gray-700"
                  placeholder="Username"
                  value={formData.username}
                  onChange={(e) =>
                    setFormData({ ...formData, username: e.target.value })
                  }
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Mật khẩu
                </label>
                <button
                  type="button"
                  className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:text-indigo-700 transition-colors"
                >
                  Quên mật khẩu?
                </button>
              </div>
              <div className="relative group">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-indigo-500 transition-colors">
                  <Lock size={18} />
                </div>
                <input
                  type="password"
                  autoComplete="current-password"
                  className="w-full pl-14 pr-6 py-4 bg-gray-50 border border-transparent rounded-2xl outline-none focus:bg-white focus:border-indigo-200 focus:ring-4 focus:ring-indigo-500/5 transition-all font-bold text-gray-700"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                />
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center gap-2 px-1">
              <input
                type="checkbox"
                id="remember"
                className="w-4 h-4 rounded-lg border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label
                htmlFor="remember"
                className="text-xs font-bold text-gray-500 cursor-pointer"
              >
                Ghi nhớ phiên đăng nhập
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-100 transition-all active:scale-[0.98] disabled:bg-gray-200 disabled:shadow-none mt-4 flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  <LogIn size={18} />
                  <span>Xác nhận đăng nhập</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
