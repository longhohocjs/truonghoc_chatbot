import React, { useEffect, useState } from "react";
import axiosClient from "@/api/axios";
import { Clock, Search, MapPin, Calendar, School, Users } from "lucide-react";

const LichHocManagementPage = () => {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axiosClient.get("/admin/lop-hoc-phan");
        // Phẳng hóa dữ liệu: Mỗi buổi học của mỗi lớp thành 1 dòng trong bảng tổng quát
        const allSchedules = [];
        const lops = res.data?.data || res.data || [];

        lops.forEach((lop) => {
          if (lop.lich_hoc_details && lop.lich_hoc_details.length > 0) {
            // Lọc unique theo Thứ để hiển thị cấu hình gốc
            const uniqueLich = Array.from(
              new Map( // Sử dụng String() để đảm bảo key của Map là duy nhất và không bị null/undefined
                lop.lich_hoc_details.map((l) => [
                  String(l.Thu || l.thu || l.NgayHoc),
                  l,
                ]),
              ).values(),
            );

            uniqueLich.forEach((lich) => {
              allSchedules.push({
                ...lich,
                MaLopHP: lop.MaLopHP,
                Thu: parseInt(lich.Thu || lich.thu || 0), // Đảm bảo Thu luôn là một số, mặc định là 0 nếu không hợp lệ
                TenMon: lop.mon_hoc?.TenMon,
                GiangVien: lop.giang_vien?.HoTen || "Chưa phân công",
                HocKy: lop.hoc_ky?.TenHocKy,
              });
            });
          }
        });
        setSchedules(allSchedules);
      } catch (error) {
        console.error("Lỗi tải lịch học:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getThuLabel = (thu) => {
    const val = parseInt(thu, 10); // Luôn chỉ định radix 10
    if (isNaN(val) || val < 2 || val > 8) {
      return "Không xác định"; // Trả về giá trị mặc định nếu không phải số hoặc ngoài khoảng
    }
    return val === 8 ? "Chủ Nhật" : `Thứ ${val}`;
  };

  const filteredSchedules = schedules.filter(
    (item) =>
      item.TenMon?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.MaLopHP?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.GiangVien?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fadeIn pb-10">
      {/* Unified Header */}
      <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-50/40 rounded-full -mr-20 -mt-20 blur-3xl" />

        <div className="relative flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-6">
            <div className="p-4 bg-indigo-600 rounded-3xl text-white shadow-lg shadow-indigo-100">
              <Clock size={32} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                Tổng hợp Lịch giảng dạy
              </h2>
              <p className="text-gray-500 text-sm font-medium">
                Toàn bộ khung thời gian đào tạo và điều phối phòng học trên toàn
                hệ thống
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Stats Bar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative flex-1 w-full md:w-auto">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
            size={18}
          />
          <input
            type="text"
            placeholder="Tìm theo môn học, mã lớp hoặc giảng viên..."
            className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-4">
          <div className="bg-white px-5 py-3 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              {filteredSchedules.length} Buổi học / tuần
            </span>
          </div>
        </div>
      </div>

      {/* Table Area */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50/50 text-gray-400 text-[10px] uppercase font-bold tracking-[0.15em] border-b border-gray-100">
              <tr>
                <th className="px-8 py-5">Thời gian & Tiết học</th>
                <th className="px-6 py-5">Lớp học phần</th>
                <th className="px-6 py-5">Giảng viên</th>
                <th className="px-6 py-5">Phòng học</th>
                <th className="px-8 py-5 text-right">Học kỳ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-8 py-20 text-center">
                    <div className="inline-block w-8 h-8 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
                  </td>
                </tr>
              ) : filteredSchedules.length === 0 ? (
                <tr>
                  <td
                    colSpan="5"
                    className="px-8 py-20 text-center text-gray-400 font-medium italic"
                  >
                    Đang tổng hợp dữ liệu...
                  </td>
                </tr>
              ) : (
                filteredSchedules
                  .sort((a, b) => (a.Thu || a.thu) - (b.Thu || b.thu))
                  .map((item, idx) => (
                    <tr
                      key={idx}
                      className="hover:bg-gray-50/50 transition-all group"
                    >
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-xs shadow-lg shadow-indigo-100">
                            {getThuLabel(item.Thu).charAt(0)}{" "}
                          </div>
                          <div>
                            <p className="text-sm font-black text-gray-900 leading-none mb-1">
                              {getThuLabel(item.Thu || item.thu)}
                            </p>
                            <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">
                              Tiết {item.TietBatDau} -{" "}
                              {parseInt(item.TietBatDau) +
                                parseInt(item.SoTiet) -
                                1}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col gap-1">
                          <p className="text-sm font-black text-gray-900 leading-none">
                            {item.TenMon}
                          </p>
                          <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md w-fit uppercase">
                            {item.MaLopHP}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <p className="text-xs font-bold text-gray-600">
                          {item.GiangVien}
                        </p>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-1.5 text-gray-500">
                          <MapPin size={12} className="text-indigo-400" />
                          <span className="text-xs font-black uppercase tracking-tight">
                            {item.PhongHoc || item.phong_hoc || "N/A"}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.1em]">
                          {item.HocKy}
                        </p>
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

export default LichHocManagementPage;
