import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axiosClient from "@/api/axios";
import {
  TrendingUp,
  Award,
  BookOpen,
  PieChart,
  Activity,
  Lock,
} from "lucide-react";

const KetQuaHocTap = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Hàm quy đổi điểm số sang điểm chữ (Hệ 4 chuẩn Việt Nam)
  const quyDoiDiemChu = (diem) => {
    if (diem === null || diem === undefined || diem === "") return "-";
    const d = parseFloat(diem);
    if (isNaN(d)) return "-";

    if (d >= 8.5) return "A";
    if (d >= 7.0) return "B";
    if (d >= 5.5) return "C";
    if (d >= 4.0) return "D";
    return "F";
  };

  useEffect(() => {
    const fetchKetQua = async () => {
      try {
        const response = await axiosClient.post("/sinh-vien/ket-qua-hoc-tap");
        if (response.success) {
          setData(response.data);
        }
      } catch (error) {
        console.error("Lỗi khi tải kết quả học tập:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchKetQua();
  }, []);

  if (loading)
    return (
      <div className="p-10 text-center font-medium">Đang tải bảng điểm...</div>
    );

  // Xử lý khi tài khoản bị khóa do nợ học phí
  if (data?.is_locked) {
    return (
      <div className="max-w-4xl mx-auto mt-20 p-12 bg-white rounded-[2.5rem] border border-rose-100 shadow-xl shadow-rose-50 text-center space-y-6 animate-fadeIn">
        <div className="w-24 h-24 bg-rose-50 rounded-full flex items-center justify-center mx-auto text-rose-500 animate-bounce">
          <Lock size={48} />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-gray-800">
            Truy cập bị hạn chế
          </h2>
          <p className="text-gray-500 font-medium leading-relaxed">
            Hệ thống ghi nhận bạn chưa hoàn thành học phí học kỳ hiện tại.
            <br />
            Quyền lợi xem kết quả học tập tạm thời bị khóa cho đến khi thanh
            toán hoàn tất.
          </p>
        </div>
        <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 w-fit mx-auto">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
            Hạn chót nộp phí
          </p>
          <p className="text-sm font-bold text-rose-600">
            {new Date(data.han_nop).toLocaleDateString("vi-VN")}
          </p>
        </div>
        <button
          onClick={() => navigate("/sinh-vien/hoc-phi")}
          className="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-95"
        >
          Đến trang thanh toán
        </button>
      </div>
    );
  }

  if (!data)
    return (
      <div className="p-10 text-center text-red-500">
        Không tìm thấy dữ liệu kết quả học tập.
      </div>
    );

  const diem_chi_tiet = data.diem_chi_tiet || data.DiemChiTiet || [];
  const gpa_hoc_ky = data.gpa_hoc_ky || data.GPAHocKy || null;

  // Tính toán GPA dự phòng nếu gpa_hoc_ky bị null nhưng có diem_chi_tiet
  const gpa_hệ_10 =
    gpa_hoc_ky?.gpa ||
    gpa_hoc_ky?.GPA ||
    (diem_chi_tiet.length > 0
      ? (
          diem_chi_tiet.reduce(
            (sum, i) =>
              sum +
              parseFloat(i.diem_tk || i.DiemTongKet || 0) *
                parseInt(i.so_tin_chi || i.SoTinChi || 0),
            0,
          ) /
          diem_chi_tiet.reduce(
            (sum, i) => sum + parseInt(i.so_tin_chi || i.SoTinChi || 0),
            0,
          )
        ).toFixed(2)
      : "0.0");

  const tong_tin_chi =
    gpa_hoc_ky?.tong_tin_chi ||
    gpa_hoc_ky?.TongTinChi ||
    diem_chi_tiet.reduce(
      (sum, i) => sum + parseInt(i.so_tin_chi || i.SoTinChi || 0),
      0,
    );

  // Nhóm điểm theo học kỳ để hiển thị theo từng block
  const groupedBySemester = diem_chi_tiet.reduce((acc, item) => {
    const hocKy = item.ten_hoc_ky || item.TenHocKy || "Học kỳ khác";
    if (!acc[hocKy]) {
      acc[hocKy] = [];
    }
    acc[hocKy].push(item);
    return acc;
  }, {});

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fadeIn pb-10">
      {/* Unified Header Section */}
      <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-50/40 rounded-full -mr-20 -mt-20 blur-3xl" />
        <div className="absolute bottom-0 left-20 w-40 h-40 bg-blue-50/30 rounded-full -mb-10 blur-2xl" />

        <div className="relative flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-6">
            <TrendingUp size={42} className="text-indigo-600 shrink-0" />
            <div>
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                Kết quả học tập
              </h2>
              <p className="text-gray-500 text-sm font-medium">
                Tra cứu điểm chi tiết và tiến độ học tập qua các học kỳ
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="px-5 py-2 bg-indigo-50 rounded-xl border border-indigo-100/50">
              <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest">
                Trạng thái
              </p>
              <p className="text-xs font-black text-indigo-600">Bình thường</p>
            </div>
          </div>
        </div>
      </div>

      {/* Hiển thị bảng điểm theo từng học kỳ */}
      {Object.keys(groupedBySemester).length === 0 ? (
        <div className="bg-white p-16 rounded-[2.5rem] text-center text-gray-400 border border-dashed border-gray-200 shadow-sm">
          Chưa có dữ liệu điểm học phần.
        </div>
      ) : (
        Object.entries(groupedBySemester).map(([tenHocKy, dsDiem]) => (
          <div
            key={tenHocKy}
            className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden"
          >
            <div className="bg-gray-50/50 px-8 py-5 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-black text-gray-800 tracking-tight">
                {tenHocKy}
              </h3>
              <span className="text-xs text-gray-500 font-medium italic">
                Bảng điểm chính thức
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50/30 text-gray-400 uppercase text-[11px] font-bold tracking-widest border-b border-gray-100">
                  <tr>
                    <th className="px-8 py-4">Mã môn</th>
                    <th className="px-8 py-4">Tên môn học</th>
                    <th className="px-4 py-4">Giảng viên</th>
                    <th className="px-4 py-4 text-center">Tín chỉ</th>
                    <th className="px-4 py-4 text-center">CC</th>
                    <th className="px-4 py-4 text-center">GK</th>
                    <th className="px-4 py-4 text-center">Thi</th>
                    <th className="px-4 py-4 text-center">TK (10)</th>
                    <th className="px-8 py-4 text-center">Điểm Chữ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {dsDiem.map((item, idx) => (
                    <tr
                      key={idx}
                      className="hover:bg-gray-50/50 transition-all group border-b border-gray-50 last:border-0"
                    >
                      <td className="px-8 py-5 font-bold text-indigo-600 text-sm">
                        {item.ma_mon || item.MaMon}
                      </td>
                      <td className="px-8 py-5">
                        <span className="font-bold text-gray-800 text-sm group-hover:text-indigo-600 transition-colors">
                          {item.ten_mon || item.TenMon}
                        </span>
                      </td>
                      <td className="px-4 py-5 text-gray-500 text-xs font-bold">
                        {item.giang_vien || "N/A"}
                      </td>
                      <td className="px-4 py-5 text-center font-bold text-gray-600 text-sm">
                        {item.so_tin_chi || item.SoTinChi}
                      </td>
                      <td className="px-4 py-5 text-center text-gray-500 font-medium text-sm">
                        {item.diem_cc || item.DiemChuyenCan || "-"}
                      </td>
                      <td className="px-4 py-5 text-center text-gray-500 font-medium text-sm">
                        {item.diem_gk || item.DiemGiuaKy || "-"}
                      </td>
                      <td className="px-4 py-5 text-center text-gray-500 font-medium text-sm">
                        {item.diem_thi || item.DiemThi || "-"}
                      </td>
                      <td className="px-4 py-5 text-center">
                        <span className="inline-block min-w-[40px] font-black text-gray-900 bg-gray-100 px-2 py-1 rounded-lg text-sm">
                          {item.diem_tk || item.DiemTongKet || "-"}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-center">
                        {(() => {
                          const diemChu =
                            item.diem_chu ||
                            item.DiemChu ||
                            quyDoiDiemChu(item.diem_tk || item.DiemTongKet);
                          return (
                            <span
                              className={`font-black px-3 py-1.5 rounded-xl text-xs shadow-sm border ${
                                diemChu === "F"
                                  ? "bg-rose-50 text-rose-600 border-rose-100"
                                  : "bg-indigo-50 text-indigo-600 border-indigo-100"
                              }`}
                            >
                              {diemChu}
                            </span>
                          );
                        })()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

const SummaryCard = ({ title, value, subValue, color, icon }) => (
  <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex justify-between items-start">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
        {title}
      </p>
      <div className={`${color} opacity-60`}>{icon}</div>
    </div>
    <div className={`text-2xl font-black mt-2 ${color}`}>{value}</div>
    <p className="text-[10px] text-gray-400 mt-1 font-bold uppercase tracking-tighter opacity-70">
      {subValue}
    </p>
  </div>
);

export default KetQuaHocTap;
