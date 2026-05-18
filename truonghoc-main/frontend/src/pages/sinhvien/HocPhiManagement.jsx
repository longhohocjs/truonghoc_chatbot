import React, { useState, useEffect } from "react";
import axiosClient from "@/api/axios";
import toast from "react-hot-toast";
import {
  Wallet,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  ChevronRight,
  Loader2,
} from "lucide-react";

const DON_GIA_TIN_CHI = 500000;

const HocPhiManagement = () => {
  const [studentFeeData, setStudentFeeData] = useState(null); // Data for the current student
  const [semesters, setSemesters] = useState([]);
  const [selectedSemester, setSelectedSemester] = useState("");
  const [loading, setLoading] = useState(true);
  // No 'confirming' state needed for student view

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resStudentFee, resSemesters] = await Promise.all([
        axiosClient.get("/sinh-vien/hoc-phi", {
          params: selectedSemester ? { hoc_ky_id: selectedSemester } : {},
        }),
        axiosClient.get("/sinh-vien/hoc-ky"),
      ]);

      setStudentFeeData(resStudentFee.data?.data || null);

      const semesterData = resSemesters.data?.data || resSemesters.data || [];
      setSemesters(semesterData);

      // Mặc định chọn học kỳ mới nhất nếu chưa chọn
      if (!selectedSemester && semesterData.length > 0) {
        setSelectedSemester(semesterData[0].HocKyID);
      }
    } catch (error) {
      console.error("Lỗi tải dữ liệu học phí:", error);
      toast.error("Không thể tải thông tin học phí của bạn");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedSemester]); // Only re-fetch when semester changes

  // No need for calculateStudentFee as backend service returns aggregated data

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fadeIn pb-10">
      {/* Header */}
      <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-50/40 rounded-full -mr-20 -mt-20 blur-3xl" />
        <div className="relative flex items-center gap-6">
          <div className="p-4 bg-blue-600 rounded-3xl text-white shadow-lg shadow-blue-100">
            <CreditCard size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">
              Quản lý Học phí
            </h2>
            <p className="text-gray-500 text-sm font-medium">
              Theo dõi tình trạng đóng phí và xác nhận quyền lợi học tập của
              sinh viên
            </p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex justify-end">
        <div className="flex items-center gap-2 bg-white px-4 py-3 rounded-2xl border border-gray-100 shadow-sm w-full md:w-auto">
          <Filter size={16} className="text-gray-400" />
          <select
            className="outline-none text-sm font-bold text-gray-600 cursor-pointer bg-transparent w-full"
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(e.target.value)}
          >
            <option value="">Chọn học kỳ kiểm tra</option>
            {semesters.map((s) => (
              <option key={s.HocKyID} value={s.HocKyID}>
                {s.TenHocKy} - {s.nam_hoc?.TenNamHoc}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table Area */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50/50 text-gray-400 text-[10px] uppercase font-bold tracking-[0.15em] border-b border-gray-100">
              <tr>
                <th className="px-8 py-5">Môn học</th>
                <th className="px-6 py-5 text-center">Số tín chỉ</th>
                <th className="px-6 py-5 text-right">Thành tiền</th>
                <th className="px-6 py-5 text-center">Trạng thái thanh toán</th>
                <th className="px-8 py-5 text-right">Ngày đăng ký</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-8 py-20 text-center">
                    <div className="inline-block w-8 h-8 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td
                    colSpan="5"
                    className="px-8 py-20 text-center text-gray-400 italic"
                  >
                    Không có dữ liệu học phí cho học kỳ này
                  </td>
                </tr>
              ) : studentFeeData && studentFeeData.chi_tiet.length > 0 ? (
                studentFeeData.chi_tiet.map((mon, index) => (
                  <tr
                    key={index}
                    className="hover:bg-gray-50/50 transition-all group"
                  >
                    <td className="px-8 py-5">
                      <p className="text-sm font-black text-gray-900">
                        {mon.ten_mon}
                      </p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">
                        {mon.ma_mon}
                      </p>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className="text-xs font-black text-gray-600 bg-gray-100 px-2.5 py-1 rounded-lg">
                        {mon.so_tin_chi} TC
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <p className="text-sm font-black text-gray-900">
                        {mon.thanh_tien.toLocaleString()} đ
                      </p>
                    </td>
                    <td className="px-6 py-5 text-center">
                      {mon.da_thanh_toan ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-500 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100 uppercase">
                          <CheckCircle2 size={12} /> Đã thanh toán
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-rose-500 bg-rose-50 px-2 py-1 rounded-md border border-rose-100 uppercase">
                          <AlertCircle size={12} /> Chưa thanh toán
                        </span>
                      )}
                    </td>
                    <td className="px-8 py-5 text-right">
                      <p className="text-sm font-black text-gray-900">
                        {new Date(mon.ngay_dang_ky).toLocaleDateString("vi-VN")}
                      </p>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="5"
                    className="px-8 py-20 text-center text-gray-400 italic"
                  >
                    Không có môn học nào được đăng ký trong học kỳ này.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {studentFeeData && studentFeeData.tong_tin_chi > 0 && (
        <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Wallet size={24} className="text-blue-600" />
            <div>
              <p className="text-sm font-black text-gray-900">
                Tổng số tín chỉ: {studentFeeData.tong_tin_chi}
              </p>
              <p className="text-lg font-black text-blue-600">
                Tổng học phí: {studentFeeData.tong_tien.toLocaleString()} đ
              </p>
            </div>
          </div>
          <div>
            {studentFeeData.trang_thai_thanh_toan ? (
              <span className="inline-flex items-center gap-1 text-sm font-black text-emerald-500 bg-emerald-50 px-3 py-2 rounded-md border border-emerald-100 uppercase">
                <CheckCircle2 size={16} /> Đã hoàn thành thanh toán
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-sm font-black text-rose-500 bg-rose-50 px-3 py-2 rounded-md border border-rose-100 uppercase">
                <AlertCircle size={16} /> Còn nợ phí
              </span>
            )}
            {studentFeeData.is_locked && (
              <p className="text-xs text-red-500 mt-1">
                Tài khoản bị khóa chức năng do quá hạn nộp học phí (Hạn:{" "}
                {new Date(studentFeeData.han_nop).toLocaleDateString("vi-VN")})
              </p>
            )}
          </div>
        </div>
      )}

      <div className="bg-blue-600 p-6 rounded-[2.5rem] text-white flex flex-col md:row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white/20 rounded-2xl">
            <AlertCircle size={20} />
          </div>
          <p className="text-sm font-medium">
            Lưu ý: Vui lòng thanh toán học phí đúng hạn để tránh bị khóa các
            chức năng học tập.
          </p>
        </div>
      </div>
    </div>
  );
};

export default HocPhiManagement;
