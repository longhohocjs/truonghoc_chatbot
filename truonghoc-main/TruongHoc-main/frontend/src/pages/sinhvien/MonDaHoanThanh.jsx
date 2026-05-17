import React, { useState, useEffect } from "react";
import axiosClient from "@/api/axios";
import { Award, BookOpen, CheckCircle, ChevronRight } from "lucide-react";

const MonDaHoanThanh = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axiosClient.get("/sinh-vien/mon-da-hoan-thanh");
        if (res.success && res.data) {
          setData(res.data);
        }
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
      <div className="p-10 text-center font-medium text-gray-500">
        Đang tải dữ liệu môn học...
      </div>
    );

  const tongTinChi = data.reduce(
    (sum, item) =>
      sum + (item.SoTinChi || item.so_tin_chi || item.tin_chi || 0),
    0,
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fadeIn pb-10">
      {/* Unified Header Section */}
      <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50/40 rounded-full -mr-20 -mt-20 blur-3xl" />

        <div className="relative flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-5">
            <Award size={42} className="text-emerald-600 shrink-0" />
            <div>
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                Môn học đã hoàn thành
              </h2>
              <p className="text-gray-500 text-sm font-medium">
                Danh sách học phần tích lũy (Điểm ≥ 5.0)
              </p>
            </div>
          </div>

          <div className="bg-emerald-600 px-6 py-3 rounded-2xl text-center shadow-lg shadow-emerald-100">
            <p className="text-[10px] font-bold text-emerald-100 uppercase tracking-widest mb-1">
              Tín chỉ tích lũy
            </p>
            <p className="text-2xl font-black text-white leading-none">
              {tongTinChi}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50/50 text-gray-400 uppercase text-[11px] font-bold tracking-widest border-b border-gray-100">
              <tr>
                <th className="px-6 py-4">Mã môn</th>
                <th className="px-6 py-4">Tên môn học</th>
                <th className="px-6 py-4">Giảng viên</th>
                <th className="px-6 py-4 text-center">Tín chỉ</th>
                <th className="px-6 py-4 text-center">Điểm đạt</th>
                <th className="px-6 py-4 text-center">Số lần học</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.length === 0 ? (
                <tr>
                  <td
                    colSpan="5"
                    className="p-16 text-center text-gray-400 italic"
                  >
                    Bạn chưa hoàn thành môn học nào.
                  </td>
                </tr>
              ) : (
                data.map((item, index) => (
                  <tr
                    key={index}
                    className="hover:bg-gray-50/50 transition-all group border-b border-gray-50 last:border-0"
                  >
                    <td className="px-6 py-5 font-bold text-indigo-600 text-sm">
                      {item.MaMon || item.ma_mon}
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span className="font-bold text-gray-800 text-sm group-hover:text-indigo-600 transition-colors">
                          {item.TenMon || item.ten_mon}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-gray-500 font-bold text-xs">
                      {item.giang_vien || "N/A"}
                    </td>
                    <td className="px-6 py-5 text-center font-bold text-gray-600 text-sm">
                      {item.SoTinChi || item.so_tin_chi || item.tin_chi}
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className="inline-block min-w-[45px] font-black text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100 shadow-sm text-sm">
                        {item.Diem ||
                          item.DiemTongKet ||
                          item.DiemTK ||
                          item.diem_tong_ket ||
                          item.diem_tk ||
                          item.diem ||
                          "0.0"}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span
                        className={`text-[10px] font-black px-3 py-1 rounded-lg uppercase ${(item.SoLanHoc || item.so_lan_hoc) > 1 ? "bg-orange-50 text-orange-600 border border-orange-100" : "bg-gray-100 text-gray-500"}`}
                      >
                        {item.SoLanHoc || item.so_lan_hoc || 1} Lần học
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

export default MonDaHoanThanh;
