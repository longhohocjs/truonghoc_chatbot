import React, { useEffect, useState } from "react";
import axiosClient from "@/api/axios";
import {
  Calendar,
  Search,
  MapPin,
  FileText,
  ClipboardCheck,
  Clock,
} from "lucide-react";

const LichThiManagementPage = () => {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axiosClient.get("/admin/lop-hoc-phan");
        const allSchedules = [];
        const lops = res.data?.data || res.data || [];

        lops.forEach((lop) => {
          // Tổng hợp lịch thi từ các lớp học phần (sử dụng lich_thi hoặc lich_thi_details)
          const exams = lop.lich_thi || lop.lich_thi_details || [];
          exams.forEach((exam) => {
            allSchedules.push({
              ...exam,
              MaLopHP: lop.MaLopHP,
              TenMon: lop.mon_hoc?.TenMon,
              GiangVien: lop.giang_vien?.HoTen || "Chưa phân công",
              HocKy: lop.hoc_ky?.TenHocKy,
            });
          });
        });
        setSchedules(allSchedules);
      } catch (error) {
        console.error("Lỗi tải lịch thi:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("vi-VN");
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
              <Calendar size={32} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                Tổng hợp Lịch thi
              </h2>
              <p className="text-gray-500 text-sm font-medium">
                Toàn bộ khung thời gian tổ chức khảo thí và điều phối phòng thi
                trên hệ thống
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
              {filteredSchedules.length} Buổi thi / đợt
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
                <th className="px-8 py-5">Ngày thi & Khung giờ</th>
                <th className="px-6 py-5">Lớp học phần</th>
                <th className="px-6 py-5">Giảng viên</th>
                <th className="px-6 py-5">Phòng thi</th>
                <th className="px-6 py-5 text-center">Hình thức</th>
                <th className="px-8 py-5 text-right">Học kỳ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-8 py-20 text-center">
                    <div className="inline-block w-8 h-8 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
                  </td>
                </tr>
              ) : filteredSchedules.length === 0 ? (
                <tr>
                  <td
                    colSpan="6"
                    className="px-8 py-20 text-center text-gray-400 font-medium italic"
                  >
                    Đang tổng hợp dữ liệu...
                  </td>
                </tr>
              ) : (
                filteredSchedules
                  .sort(
                    (a, b) =>
                      new Date(a.NgayThi || a.ngay_thi) -
                      new Date(b.NgayThi || b.ngay_thi),
                  )
                  .map((item, idx) => (
                    <tr
                      key={idx}
                      className="hover:bg-gray-50/50 transition-all group"
                    >
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-xs shadow-lg shadow-indigo-100">
                            {
                              formatDate(item.NgayThi || item.ngay_thi).split(
                                "/",
                              )[0]
                            }
                          </div>
                          <div>
                            <p className="text-sm font-black text-gray-900 leading-none mb-1">
                              {formatDate(item.NgayThi || item.ngay_thi)}
                            </p>
                            <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest flex items-center gap-1">
                              <Clock size={10} />
                              {item.GioBatDau?.substring(0, 5) ||
                                item.gio_bat_dau?.substring(0, 5)}{" "}
                              -{" "}
                              {item.GioKetThuc?.substring(0, 5) ||
                                item.gio_ket_thuc?.substring(0, 5)}
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
                            {item.PhongThi || item.phong_thi || "N/A"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span
                          className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            item.HinhThucThi === "Tự luận"
                              ? "bg-blue-50 text-blue-600 border border-blue-100"
                              : item.HinhThucThi === "Trắc nghiệm"
                                ? "bg-purple-50 text-purple-600 border border-purple-100"
                                : item.HinhThucThi === "Báo cáo"
                                  ? "bg-orange-50 text-orange-600 border border-orange-100"
                                  : "bg-gray-50 text-gray-500 border border-gray-100"
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            <FileText size={10} />
                            {item.HinhThucThi || "Tập trung"}
                          </div>
                        </span>
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

export default LichThiManagementPage;
