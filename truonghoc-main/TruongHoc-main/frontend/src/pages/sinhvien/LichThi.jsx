import React, { useState, useEffect } from "react";
import axiosClient from "@/api/axios";
import {
  CalendarCheck,
  Clock,
  MapPin,
  User,
  FileText,
  Info,
} from "lucide-react";

const LichThi = () => {
  const [lichThi, setLichThi] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLichThi = async () => {
      try {
        const response = await axiosClient.get("/sinh-vien/lich-thi");

        // Cấu trúc response từ axiosClient: { success: true, data: { data: [], hoc_ky: ... } }
        // Trích xuất payload (có thể là response.data hoặc chính response tùy interceptor)
        const payload = response?.data || response;

        // Tìm mảng dữ liệu thực sự (ưu tiên payload.data nếu là mảng, ngược lại dùng chính payload)
        const dataArray = Array.isArray(payload?.data)
          ? payload.data
          : Array.isArray(payload)
            ? payload
            : [];
        setLichThi(dataArray);
      } catch (error) {
        console.error("Lỗi khi tải lịch thi:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchLichThi();
  }, []);

  if (loading)
    return (
      <div className="p-10 text-center font-medium text-gray-500">
        Đang tải lịch thi...
      </div>
    );

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fadeIn pb-10">
      {/* Unified Header Section */}
      <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-50/40 rounded-full -mr-20 -mt-20 blur-3xl" />
        <div className="absolute bottom-0 left-20 w-40 h-40 bg-blue-50/30 rounded-full -mb-10 blur-2xl" />

        <div className="relative flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-6">
            <CalendarCheck size={42} className="text-indigo-600 shrink-0" />
            <div>
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                Lịch thi cá nhân
              </h2>
              <p className="text-gray-500 text-sm font-medium">
                Thông tin chi tiết các môn thi trong học kỳ hiện tại
              </p>
            </div>
          </div>

          <div className="px-5 py-2 bg-indigo-50 rounded-xl border border-indigo-100/50">
            <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest">
              Trạng thái
            </p>
            <p className="text-xs font-black text-indigo-600">Chính thức</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50/50 text-gray-400 uppercase text-[11px] font-bold tracking-widest border-b border-gray-100">
              <tr>
                <th className="px-8 py-4">STT</th>
                <th className="px-6 py-4">Môn thi</th>
                <th className="px-6 py-4">Thời gian</th>
                <th className="px-6 py-4 text-center whitespace-nowrap">
                  Giờ thi
                </th>
                <th className="px-6 py-4 text-center">Hình thức</th>
                <th className="px-8 py-4 text-center">SBD</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {lichThi.length === 0 ? (
                <tr>
                  <td
                    colSpan="6"
                    className="px-6 py-16 text-center text-gray-400 italic"
                  >
                    Hiện chưa có lịch thi nào được công bố.
                  </td>
                </tr>
              ) : (
                lichThi.map((item, index) => (
                  <tr
                    key={index}
                    className="hover:bg-gray-50/50 transition-all group border-b border-gray-50 last:border-0"
                  >
                    <td className="px-8 py-5 text-gray-400 text-sm font-medium">
                      {index + 1}
                    </td>
                    <td className="px-6 py-5">
                      <div className="space-y-1">
                        <div className="font-bold text-gray-900 text-sm group-hover:text-indigo-600 transition-colors">
                          {item.ten_mon || item.lop_hoc_phan?.mon_hoc?.TenMon}
                        </div>
                        <div className="text-[10px] text-indigo-500 font-bold tracking-tight">
                          {item.ma_mon || item.lop_hoc_phan?.mon_hoc?.MaMon}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col gap-1">
                        <div className="text-sm font-bold text-gray-700">
                          {item.ngay_thi || item.NgayThi}
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-bold uppercase">
                          <MapPin size={10} className="text-indigo-400" />
                          {item.phong_thi || item.PhongHoc || "Chưa rõ"}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-orange-50 text-orange-600 rounded-xl text-xs font-black border border-orange-100">
                        <Clock size={12} />
                        {item.gio_thi ||
                          `${item.gio_bat_dau} - ${item.gio_ket_thuc}`}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase border shadow-sm ${
                          item.hinh_thuc === "Tự luận" ||
                          item.HinhThucThi === "Tự luận"
                            ? "bg-indigo-50 text-indigo-600 border-indigo-100"
                            : item.hinh_thuc === "Trắc nghiệm" ||
                                item.HinhThucThi === "Trắc nghiệm"
                              ? "bg-purple-50 text-purple-600 border-purple-100"
                              : item.hinh_thuc === "Báo cáo" ||
                                  item.HinhThucThi === "Báo cáo"
                                ? "bg-amber-50 text-amber-600 border-amber-100"
                                : "bg-gray-50 text-gray-500 border-gray-100"
                        }`}
                      >
                        {item.hinh_thuc || item.HinhThucThi || "Tập trung"}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-center">
                      <div className="font-mono font-black text-indigo-600 bg-indigo-50/50 py-1 rounded-lg text-sm border border-indigo-100/30">
                        {item.sbd || item.SBD || "--"}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default LichThi;
