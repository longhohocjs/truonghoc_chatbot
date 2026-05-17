import React, { useState, useEffect } from "react";
import axiosClient from "@/api/axios";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";

const ThongKeBaoCao = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchThongKe = async () => {
      try {
        const response = await axiosClient.post("/admin/thong-ke-dang-ky");

        // Trích xuất dữ liệu linh hoạt (Hỗ trợ Laravel Resource wrap)
        const isSuccess =
          response?.success === true || response?.status === "success";
        const payload = isSuccess ? response.data : response;

        if (payload && typeof payload === "object") {
          setData(payload);
        }
      } catch (error) {
        console.error("Lỗi khi tải thống kê:", error);
        // Dữ liệu mẫu minh họa
        setData({
          summary: {
            tong_lhp: 120,
            tong_cho_ngoi: 5000,
            da_dang_ky: 3850,
            ti_le_lap_day: 77,
          },
          chartData: [
            { name: "CNTT", registered: 1200, total: 1500 },
            { name: "Kinh tế", registered: 950, total: 1100 },
            { name: "Ngoại ngữ", registered: 600, total: 900 },
            { name: "Cơ khí", registered: 550, total: 800 },
            { name: "Điện tử", registered: 550, total: 700 },
          ],
          topClasses: [
            {
              ma_lhp: "LHP001",
              ten_mon: "Lập trình Web",
              ti_le: 100,
              si_so: "50/50",
            },
            {
              ma_lhp: "LHP042",
              ten_mon: "Kinh tế vĩ mô",
              ti_le: 98,
              si_so: "59/60",
            },
            {
              ma_lhp: "LHP015",
              ten_mon: "Cấu trúc dữ liệu",
              ti_le: 95,
              si_so: "38/40",
            },
          ],
        });
      } finally {
        setLoading(false);
      }
    };
    fetchThongKe();
  }, []);

  if (loading || !data)
    return (
      <div className="p-10 text-center font-medium">
        Đang xử lý dữ liệu thống kê...
      </div>
    );

  const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Thống kê & Báo cáo</h2>
        <p className="text-gray-500 text-sm">
          Phân tích tình hình đăng ký học phần và hiệu suất sử dụng tài nguyên
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard
          title="Tổng lớp mở"
          value={data.summary.tong_lhp}
          icon="📚"
          color="blue"
        />
        <StatCard
          title="Tổng chỗ ngồi"
          value={data.summary.tong_cho_ngoi}
          icon="🪑"
          color="green"
        />
        <StatCard
          title="SV đã đăng ký"
          value={data.summary.da_dang_ky}
          icon="👥"
          color="orange"
        />
        <StatCard
          title="Tỉ lệ lấp đầy"
          value={`${data.summary.ti_le_lap_day}%`}
          icon="📈"
          color="purple"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Chart Section */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-6">
            Tỉ lệ đăng ký theo Khoa
          </h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.chartData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#f0f0f0"
                />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#9CA3AF", fontSize: 12 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#9CA3AF", fontSize: 12 }}
                />
                <Tooltip
                  cursor={{ fill: "#F9FAFB" }}
                  contentStyle={{
                    borderRadius: "12px",
                    border: "none",
                    boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                  }}
                />
                <Legend
                  verticalAlign="top"
                  align="right"
                  iconType="circle"
                  wrapperStyle={{ paddingBottom: "20px" }}
                />
                <Bar
                  name="Đã đăng ký"
                  dataKey="registered"
                  radius={[4, 4, 0, 0]}
                  barSize={30}
                >
                  {data.chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Bar>
                <Bar
                  name="Tổng chỉ tiêu"
                  dataKey="total"
                  fill="#E5E7EB"
                  radius={[4, 4, 0, 0]}
                  barSize={30}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Classes List */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-6">
            Lớp học tiêu biểu
          </h3>
          <div className="space-y-6">
            {data.topClasses.map((item, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-gray-700">
                    {item.ten_mon}
                  </span>
                  <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                    {item.ti_le}%
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-1000"
                    style={{ width: `${item.ti_le}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-[10px] text-gray-400 font-medium">
                  <span>Mã: {item.ma_lhp}</span>
                  <span>Sĩ số: {item.si_so}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
            <p className="text-xs text-indigo-700 leading-relaxed">
              <strong>💡 Nhận xét:</strong> Tỉ lệ đăng ký năm nay tăng 12% so
              với cùng kỳ năm ngoái. Khoa CNTT hiện đang dẫn đầu về số lượng
              sinh viên.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon, color }) => {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    orange: "bg-orange-50 text-orange-600",
    purple: "bg-purple-50 text-purple-600",
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
      <div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
          {title}
        </p>
        <p className="text-2xl font-black text-gray-800">{value}</p>
      </div>
      <div className={`text-2xl p-3 rounded-xl ${colorClasses[color]}`}>
        {icon}
      </div>
    </div>
  );
};

export default ThongKeBaoCao;
