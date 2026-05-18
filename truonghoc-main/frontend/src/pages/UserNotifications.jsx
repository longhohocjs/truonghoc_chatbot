import React, { useState, useEffect } from "react";
import axiosClient from "@/api/axios";
import { useAuth } from "@/context/AuthContext";
import {
  Bell,
  CalendarDays,
  Calendar,
  Tag,
  Info,
  AlertTriangle,
  CheckCircle,
  Clock,
} from "lucide-react";
import moment from "moment";
import "moment/dist/locale/vi";

const UserNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  // Xác định tiền tố API dựa trên vai trò
  const rolePath =
    user?.role?.toLowerCase() === "giangvien" ||
    user?.role?.toLowerCase() === "giảng viên" ||
    user?.role?.toLowerCase() === "giang_vien"
      ? "giang-vien"
      : "sinh-vien";

  useEffect(() => {
    fetchNotifications();
    markAsRead(); // Đánh dấu đã đọc khi vào trang
    moment.locale("vi");
  }, [rolePath]);

  const markAsRead = async () => {
    try {
      // Gọi API xóa trạng thái chưa đọc
      await axiosClient.post(`/${rolePath}/notifications/mark-read`);
      // Nếu có dùng global state quản lý unreadCount, hãy reset nó ở đây
    } catch (error) {
      console.error("Lỗi đánh dấu đã đọc:", error);
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await axiosClient.get(`/${rolePath}/notifications/my`);
      if (response.success) {
        setNotifications(response.data);
      }
    } catch (error) {
      console.error("Lỗi tải thông báo:", error);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case "Khan":
      case "KhanCap":
        return <AlertTriangle className="text-rose-500" />;
      case "NhacNo":
      case "HocTap":
        return <Info className="text-amber-500" />;
      default:
        return <Bell className="text-indigo-500" />;
    }
  };

  if (loading)
    return (
      <div className="p-10 text-center font-bold text-gray-500">
        Đang tải thông báo...
      </div>
    );

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6 animate-fadeIn pb-20">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-4 bg-indigo-600 rounded-3xl text-white shadow-xl shadow-indigo-100">
          <Bell size={28} />
        </div>
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight leading-none">
            Trung tâm thông báo
          </h2>
          <p className="text-gray-400 text-sm font-medium mt-1">
            Cập nhật tin tức và các thông báo quan trọng dành cho bạn
          </p>
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="bg-white rounded-[2.5rem] p-20 text-center border border-gray-100 shadow-sm">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} className="text-gray-200" />
          </div>
          <h3 className="text-xl font-bold text-gray-800">
            Bạn đã đọc hết thông báo
          </h3>
          <p className="text-gray-400 mt-2">
            Hiện tại không có thông báo mới nào dành cho bạn.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {notifications.map((item) => (
            <div
              key={item.ThongBaoID || item.id}
              className={`bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden ${
                item.is_read ? "opacity-60 grayscale-[0.4]" : "opacity-100"
              }`}
            >
              {(item.LoaiThongBao === "Khan" ||
                item.LoaiThongBao === "KhanCap") && (
                <div className="absolute top-0 left-0 w-1.5 h-full bg-rose-500" />
              )}
              <div className="flex gap-5">
                <div className="mt-1 p-3 bg-gray-50 rounded-2xl group-hover:bg-indigo-50 transition-colors">
                  {getIcon(item.LoaiThongBao)}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-black text-gray-800 text-lg leading-tight group-hover:text-indigo-600 transition-colors">
                      {item.TieuDe}
                    </h3>
                    <div className="flex items-center gap-3">
                      {item.is_read ? (
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest bg-gray-100 px-2 py-0.5 rounded">
                          Đã xem
                        </span>
                      ) : null}
                      <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500 bg-indigo-50 px-3 py-1 rounded-full">
                        {item.LoaiThongBao}
                      </span>
                    </div>
                  </div>
                  <p className="text-gray-600 text-sm leading-relaxed mb-5 whitespace-pre-wrap">
                    {item.NoiDung}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[10px] font-black text-gray-400 uppercase tracking-tighter">
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-gray-300" />
                      {moment(item.created_at).fromNow()}
                    </div>
                    <div className="flex items-center gap-2">
                      <CalendarDays size={14} className="text-gray-300" />
                      Hết hạn:{" "}
                      {moment(item.NgayKetThucHienThi).format("DD/MM/YYYY")}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UserNotifications;
