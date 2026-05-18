import React, { useState, useEffect } from "react";
import axiosClient from "@/api/axios";
import {
  LayoutDashboard,
  Users,
  School,
  CheckCircle2,
  TrendingUp,
  BarChart3,
  ArrowUpRight,
  BookOpen,
} from "lucide-react";

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await axiosClient.get("/admin/thong-ke");
        if (res.status === "success" || res.success) {
          setData(res.data);
        }
      } catch (error) {
        console.error("Lỗi lấy dữ liệu thống kê:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading)
    return (
      <div className="flex items-center justify-center p-20 text-gray-400 font-medium">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
            <LayoutDashboard
              className="text-indigo-600 animate-spin"
              size={24}
            />
          </div>
          <p className="text-xs font-black uppercase tracking-widest">
            Đang khởi tạo Dashboard...
          </p>
        </div>
      </div>
    );

  const { summary, chartData, topClasses } = data || {};

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fadeIn pb-10">
      {/* Unified Header */}
      <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-50/40 rounded-full -mr-20 -mt-20 blur-3xl" />
        <div className="absolute bottom-0 left-20 w-40 h-40 bg-blue-50/30 rounded-full -mb-10 blur-2xl" />

        <div className="relative flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-6">
            <LayoutDashboard size={42} className="text-indigo-600 shrink-0" />
            <div>
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                Tổng quan hệ thống
              </h2>
              <p className="text-gray-500 text-sm font-medium">
                Theo dõi số liệu và hiệu suất đăng ký học tập thời gian thực
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Stat Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          label="Tổng Lớp Học Phần"
          value={summary?.tong_lhp}
          icon={<School className="text-indigo-600" size={20} />}
        />
        <StatCard
          label="Tổng Chỗ Ngồi"
          value={summary?.tong_cho_ngoi}
          icon={<Users className="text-indigo-600" size={20} />}
        />
        <StatCard
          label="Số SV Đã Đăng Ký"
          value={summary?.da_dang_ky}
          icon={<CheckCircle2 className="text-emerald-500" size={20} />}
        />
        <StatCard
          label="Tỉ Lệ Lấp Đầy"
          value={`${summary?.ti_le_lap_day}%`}
          icon={<TrendingUp className="text-blue-500" size={20} />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Faculty Chart Area */}
        <div className="lg:col-span-2 bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center">
              <BarChart3 size={14} className="mr-2 text-indigo-400" /> Thống kê
              đăng ký theo Khoa
            </h3>
          </div>
          <div className="space-y-6">
            {chartData?.map((khoa, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex justify-between items-end">
                  <span className="text-sm font-bold text-gray-700">
                    {khoa.name}
                  </span>
                  <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100">
                    {khoa.registered} / {khoa.total} SV
                  </span>
                </div>
                <div className="h-2 w-full bg-gray-50 rounded-full overflow-hidden border border-gray-50">
                  <div
                    className="h-full bg-indigo-600 rounded-full transition-all duration-1000 ease-out"
                    style={{
                      width: `${Math.min(100, (khoa.registered / khoa.total) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Classes List */}
        <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm">
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-8 flex items-center">
            <ArrowUpRight size={14} className="mr-2 text-emerald-400" /> Lớp học
            tiêu biểu
          </h3>
          <div className="space-y-4">
            {topClasses?.map((lop, idx) => (
              <div
                key={idx}
                className="p-4 bg-gray-50/50 rounded-2xl border border-gray-50 group hover:bg-white hover:border-indigo-100 transition-all"
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] font-black text-indigo-500 uppercase">
                    {lop.ma_lhp}
                  </span>
                  <span className="text-[10px] font-black text-emerald-600">
                    {lop.ti_le}%
                  </span>
                </div>
                <p className="text-sm font-bold text-gray-800 line-clamp-1 mb-2">
                  {lop.ten_mon}
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${lop.ti_le}%` }}
                    />
                  </div>
                  <span className="text-[9px] font-bold text-gray-400">
                    {lop.si_so} SV
                  </span>
                </div>
              </div>
            ))}
          </div>

          <button className="w-full mt-6 py-4 bg-gray-50 text-gray-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all">
            Xem tất cả báo cáo
          </button>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, icon }) => (
  <div className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm group hover:border-indigo-100 transition-all relative overflow-hidden">
    <div className="relative z-10 flex flex-col items-center text-center gap-3">
      <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center group-hover:bg-indigo-50 transition-colors">
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
          {label}
        </p>
        <p className="text-2xl font-black text-gray-900 tracking-tight group-hover:text-indigo-600 transition-colors">
          {value || 0}
        </p>
      </div>
    </div>
    {/* Decorative blur blob for card hover */}
    <div className="absolute -bottom-4 -right-4 w-16 h-16 bg-indigo-50/40 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
  </div>
);

export default Dashboard;
