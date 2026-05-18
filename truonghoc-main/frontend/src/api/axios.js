import axios from "axios";
import toast from "react-hot-toast";

const axiosClient = axios.create({
  // Sử dụng biến môi trường giúp linh hoạt khi triển khai (Production/Development)
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000/api",
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// Interceptor cho Request: Tự động đính kèm JWT Token vào mọi yêu cầu gửi đi
axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Interceptor cho Response: Xử lý dữ liệu trả về và bắt lỗi tập trung
axiosClient.interceptors.response.use(
  (response) => {
    // Trả về trực tiếp phần data để rút ngắn cú pháp ở phía Component
    return response.data;
  },
  (error) => {
    const { response } = error;

    if (!response) {
      toast.error(
        "Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại Backend!",
      );
      return Promise.reject(error);
    }

    if (response) {
      const message = response.data?.message || "Đã có lỗi xảy ra";

      switch (response.status) {
        case 401: // Unauthorized: Token hết hạn hoặc không hợp lệ
          if (!window.location.pathname.includes("/login")) {
            toast.error(
              response.data?.message ||
                "Phiên làm việc hết hạn. Vui lòng đăng nhập lại.",
            );
          }
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          // Tránh lặp lại redirect nếu đang ở trang login
          if (!window.location.pathname.includes("/login")) {
            window.location.href = "/login";
          }
          break;
        case 403: // Forbidden: Không có quyền truy cập
          toast.error("Bạn không có quyền thực hiện hành động này.");
          break;
        case 422: // Validation Error: Lỗi dữ liệu đầu vào (thường từ Laravel)
          toast.error(message);
          break;
        case 500: // Server Error
          toast.error("Lỗi hệ thống phía Server. Vui lòng thử lại sau.");
          break;
        default:
          toast.error(message);
          break;
      }
    }

    return Promise.reject(error);
  },
);

export default axiosClient;
