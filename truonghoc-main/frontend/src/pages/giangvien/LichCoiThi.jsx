import React, { useState, useEffect } from "react";
import axiosClient from "@/api/axios";
import { Calendar, Clock, MapPin, Info, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";

const LichCoiThi = () => {
  const [lichThi, setLichThi] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLichThi = async () => {
      try {
        const response = await axiosClient.get("/giang-vien/lich-coi-thi");
        // Kiểm tra success và gán mảng data
        if (response.success) {
          setLichThi(response.data || []);
        }
      } catch (error) {
        toast.error("Không thể tải lịch coi thi");
        console.error("LichCoiThi Error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchLichThi();
  }, []);

  if (loading)
    return (
      <div className="p-10 text-center text-gray-500 font-medium">
        Đang tải lịch coi thi...
      </div>
    );

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Lịch coi thi</h2>
        <p className="text-gray-500 text-sm">
          Danh sách các ca thi được phân công giám thị
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50/50 text-gray-400 text-[10px] uppercase font-bold tracking-widest border-b border-gray-100">
              <tr>
                <th className="px-6 py-4">Môn học / Mã lớp</th>
                <th className="px-6 py-4">Học kỳ</th>
                <th className="px-6 py-4">Ngày thi</th>
                <th className="px-6 py-4">Giờ thi</th>
                <th className="px-6 py-4">Phòng thi</th>
                <th className="px-6 py-4 text-center">Hình thức</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {lichThi.length === 0 ? (
                <tr>
                  <td
                    colSpan="6"
                    className="px-6 py-10 text-center text-gray-400 italic"
                  >
                    Bạn chưa có lịch coi thi nào được phân công.
                  </td>
                </tr>
              ) : (
                lichThi.map((lop, index) => {
                  // Xử lý dữ liệu lồng nhau: lấy phần tử đầu tiên trong mảng lich_thi
                  const infoThi =
                    lop.lich_thi && lop.lich_thi.length > 0
                      ? lop.lich_thi[0]
                      : null;

                  return (
                    <tr
                      key={`${lop.ma_lop_hp}-${index}`}
                      className="hover:bg-indigo-50/20 transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <div className="font-bold text-gray-800 group-hover:text-indigo-600 transition-colors">
                          {lop.ten_mon}
                        </div>
                        <div className="text-[10px] font-black text-indigo-500 mt-1 uppercase tracking-tighter">
                          {lop.ma_lop_hp}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 font-medium">
                        {lop.ten_hoc_ky}
                      </td>
                      <td className="px-6 py-4">
                        {infoThi ? (
                          <div className="flex items-center text-sm font-bold text-gray-700">
                            <Calendar
                              size={14}
                              className="mr-2 text-indigo-400"
                            />
                            {new Date(infoThi.ngay_thi).toLocaleDateString(
                              "vi-VN",
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-300 italic text-xs">
                            Chưa cập nhật
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {infoThi ? (
                          <div className="flex items-center text-sm font-bold text-gray-700">
                            <Clock size={14} className="mr-2 text-indigo-400" />
                            {(infoThi.gio_bd || "").substring(0, 5)} -{" "}
                            {(infoThi.gio_kt || "").substring(0, 5)}
                          </div>
                        ) : (
                          <span className="text-gray-300 italic text-xs">
                            ---
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {infoThi ? (
                          <div className="flex items-center text-sm font-bold text-gray-700">
                            <MapPin
                              size={14}
                              className="mr-2 text-indigo-400"
                            />
                            Phòng {infoThi.phong_thi}
                          </div>
                        ) : (
                          <span className="text-gray-300 italic text-xs">
                            ---
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {infoThi ? (
                          <span
                            className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wide border ${
                              infoThi.hinh_thuc === "Tự luận"
                                ? "bg-blue-50 text-blue-600 border-blue-100"
                                : infoThi.hinh_thuc === "Trắc nghiệm"
                                  ? "bg-purple-50 text-purple-600 border-purple-100"
                                  : infoThi.hinh_thuc === "Báo cáo"
                                    ? "bg-orange-50 text-orange-600 border-orange-100"
                                    : "bg-indigo-50 text-indigo-600 border-indigo-100"
                            }`}
                          >
                            {infoThi.hinh_thuc}
                          </span>
                        ) : (
                          <div
                            className="flex items-center justify-center text-amber-500"
                            title="Lớp chưa có lịch thi"
                          >
                            <AlertCircle size={16} />
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default LichCoiThi;
