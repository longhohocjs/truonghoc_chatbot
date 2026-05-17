import React, { useState, useEffect } from "react";
import axiosClient from "@/api/axios";
import { BookOpen, AlertCircle, HelpCircle, GraduationCap } from "lucide-react";

const MonConThieu = () => {
  const [data, setData] = useState({ mon_no: [], mon_chua_hoc: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axiosClient.get("/sinh-vien/mon-con-thieu");
        // Giả định backend trả về object { success: true, data: { mon_no: [], mon_chua_hoc: [] } }
        setData(res.data || res || { mon_no: [], mon_chua_hoc: [] });
      } catch (error) {
        console.error("Lỗi tải danh sách môn học:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading)
    return (
      <div className="p-10 text-center">Đang phân tích lộ trình học tập...</div>
    );

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fadeIn pb-10">
      {/* Header Section */}
      <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-50/40 rounded-full -mr-20 -mt-20 blur-3xl" />
        <div className="relative flex items-center gap-6">
          <div className="p-4 bg-indigo-600 rounded-3xl text-white shadow-lg shadow-indigo-100">
            <GraduationCap size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">
              Kế hoạch học tập còn thiếu
            </h2>
            <p className="text-gray-500 text-sm font-medium">
              Theo dõi các môn học chưa hoàn thành để kịp thời tốt nghiệp
            </p>
          </div>
        </div>
      </div>

      {/* Môn Nợ Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 px-2 text-rose-600">
          <AlertCircle size={20} />
          <h3 className="font-black uppercase text-sm tracking-widest">
            Danh sách môn nợ (Cần học lại)
          </h3>
          <span className="ml-2 px-2 py-0.5 bg-rose-50 rounded-lg text-xs font-bold">
            {data.mon_no.length} môn
          </span>
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-rose-50/50 text-rose-500 text-[10px] uppercase font-bold tracking-widest border-b border-rose-50">
              <tr>
                <th className="px-8 py-4">Mã môn</th>
                <th className="px-6 py-4">Tên môn học</th>
                <th className="px-6 py-4">Giảng viên dạy</th>
                <th className="px-6 py-4 text-center">Tín chỉ</th>
                <th className="px-6 py-4 text-center">Điểm cao nhất</th>
                <th className="px-6 py-4 text-center">Số lần học</th>
                <th className="px-8 py-4">Học kỳ gợi ý</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.mon_no.length === 0 ? (
                <tr>
                  <td
                    colSpan="6"
                    className="px-8 py-10 text-center text-gray-400 italic"
                  >
                    Tuyệt vời! Bạn không có môn nợ nào.
                  </td>
                </tr>
              ) : (
                data.mon_no.map((m) => (
                  <tr
                    key={m.mon_hoc_id}
                    className="hover:bg-rose-50/20 transition-all"
                  >
                    <td className="px-8 py-4">
                      <span className="text-xs font-black text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg">
                        {m.ma_mon}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-700 text-sm">
                      {m.ten_mon}
                    </td>
                    <td className="px-6 py-4 text-gray-500 font-bold text-xs italic">
                      {m.giang_vien || "N/A"}
                    </td>
                    <td className="px-6 py-4 text-center text-sm font-bold text-gray-500">
                      {m.tin_chi}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-rose-600 font-black">
                        {m.diem_tot_nhat || "N/A"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center font-medium text-gray-400">
                      {m.so_lan_hoc}
                    </td>
                    <td className="px-8 py-4 font-bold text-gray-400 italic">
                      Học kỳ {m.hoc_ky_goi_y}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Môn Chưa Học Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 px-2 text-indigo-600">
          <HelpCircle size={20} />
          <h3 className="font-black uppercase text-sm tracking-widest">
            Môn học chưa đăng ký (Theo lộ trình)
          </h3>
          <span className="ml-2 px-2 py-0.5 bg-indigo-50 rounded-lg text-xs font-bold">
            {data.mon_chua_hoc.length} môn
          </span>
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-indigo-50/50 text-indigo-400 text-[10px] uppercase font-bold tracking-widest border-b border-indigo-50">
              <tr>
                <th className="px-8 py-4">Mã môn</th>
                <th className="px-6 py-4">Tên môn học</th>
                <th className="px-6 py-4 text-center">Tín chỉ</th>
                <th className="px-6 py-4">Học kỳ gợi ý</th>
                <th className="px-8 py-4 text-right">Tính chất</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.mon_chua_hoc.length === 0 ? (
                <tr>
                  <td
                    colSpan="5"
                    className="px-8 py-10 text-center text-gray-400 italic"
                  >
                    Bạn đã đăng ký hết tất cả các môn trong chương trình đào
                    tạo.
                  </td>
                </tr>
              ) : (
                data.mon_chua_hoc.map((m) => (
                  <tr
                    key={m.mon_hoc_id}
                    className="hover:bg-indigo-50/20 transition-all"
                  >
                    <td className="px-8 py-4">
                      <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
                        {m.ma_mon}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-700 text-sm">
                      {m.ten_mon}
                    </td>
                    <td className="px-6 py-4 text-center text-sm font-bold text-gray-500">
                      {m.tin_chi}
                    </td>
                    <td className="px-6 py-4 font-black text-gray-400">
                      Học kỳ {m.hoc_ky_goi_y}
                    </td>
                    <td className="px-8 py-4 text-right">
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-1 rounded ${m.bat_buoc ? "bg-amber-50 text-amber-600" : "bg-gray-50 text-gray-400"}`}
                      >
                        {m.bat_buoc ? "Bắt buộc" : "Tự chọn"}
                      </span>
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

export default MonConThieu;
