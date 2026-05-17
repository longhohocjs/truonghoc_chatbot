import React, { useState, useEffect } from "react";
import axiosClient from "@/api/axios";
import { BookOpen, Layers, Award, CheckCircle2 } from "lucide-react";

const ChuongTrinhDaoTao = () => {
  const [data, setData] = useState({ nganh: "", chuong_trinh: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCTDT = async () => {
      try {
        const res = await axiosClient.get("/sinh-vien/chuong-trinh");
        // axiosClient interceptor đã trả về thẳng response.data (là { success: ..., data: ... })
        // Ta cần lấy phần 'data' bên trong response.data của Laravel
        // (tức là res.data.data)
        if (res.success && res.data) {
          setData(res.data);
        }
      } catch (error) {
        console.error("Lỗi tải CTĐT:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCTDT();
  }, []);

  // Nhóm môn học theo học kỳ gợi ý
  const grouped = (data.chuong_trinh || []).reduce((acc, item) => {
    const hk = item.HocKyGoiY || "Khác";
    if (!acc[hk]) acc[hk] = [];
    acc[hk].push(item);
    return acc;
  }, {});

  if (loading)
    return (
      <div className="p-10 text-center">Đang tải chương trình đào tạo...</div>
    );

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fadeIn pb-10">
      {/* Unified Header Section */}
      <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-50/40 rounded-full -mr-20 -mt-20 blur-3xl" />
        <div className="absolute bottom-0 left-20 w-40 h-40 bg-blue-50/30 rounded-full -mb-10 blur-2xl" />

        <div className="relative flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-6">
            <BookOpen size={42} className="text-indigo-600 shrink-0" />
            <div>
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                Chương trình đào tạo
              </h2>
              <p className="text-gray-500 text-sm font-medium">
                Ngành:{" "}
                <span className="text-indigo-600 font-bold">{data.nganh}</span>
              </p>
            </div>
          </div>

          <div className="bg-indigo-600 px-6 py-3 rounded-2xl text-center shadow-lg shadow-indigo-100">
            <p className="text-[10px] font-bold text-indigo-100 uppercase tracking-widest mb-1">
              Tổng số môn học
            </p>
            <p className="text-2xl font-black text-white leading-none">
              {data.chuong_trinh.length}
            </p>
          </div>
        </div>
      </div>

      {Object.entries(grouped).map(([hk, dsMon]) => (
        <div
          key={hk}
          className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden"
        >
          <div className="bg-gray-50/50 px-8 py-5 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-black text-gray-800 tracking-tight flex items-center gap-2">
              <Layers size={18} className="text-indigo-400" />
              Học kỳ {hk}
            </h3>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">
              Lộ trình đào tạo chuẩn
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50/30 text-gray-400 uppercase text-[11px] font-bold tracking-widest border-b border-gray-100">
                <tr>
                  <th className="px-8 py-4">Mã môn</th>
                  <th className="px-8 py-4">Tên môn học</th>
                  <th className="px-6 py-4 text-center">Tín chỉ</th>
                  <th className="px-8 py-4 text-center">Loại môn</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {dsMon.map((item) => (
                  <tr
                    key={item.ChuongTrinhID}
                    className="hover:bg-gray-50/50 transition-all group border-b border-gray-50 last:border-0"
                  >
                    <td className="px-8 py-5 font-bold text-indigo-600 text-sm">
                      {item.mon_hoc?.MaMon}
                    </td>
                    <td className="px-8 py-5">
                      <span className="font-bold text-gray-800 text-sm group-hover:text-indigo-600 transition-colors">
                        {item.mon_hoc?.TenMon}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-center font-bold text-gray-600 text-sm">
                      {item.mon_hoc?.SoTinChi}
                    </td>
                    <td className="px-8 py-5 text-center">
                      <span
                        className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase border ${
                          item.LoaiMon === 1
                            ? "bg-amber-50 text-amber-600 border-amber-100"
                            : "bg-gray-100 text-gray-500 border-gray-200"
                        }`}
                      >
                        {item.LoaiMon === 1 ? "BẮT BUỘC" : "TỰ CHỌN"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ChuongTrinhDaoTao;
