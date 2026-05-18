import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosClient from "@/api/axios";
import {
  ArrowLeft,
  Printer,
  Mail,
  Phone,
  Users,
  Search,
  GraduationCap,
  FileText,
} from "lucide-react";
import toast from "react-hot-toast";

const TeacherClassStudentList = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [classInfo, setClassInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Gọi API lấy dữ liệu in (chứa cả meta thông tin lớp và danh sách SV)
        // API: /giang-vien/lop-hoc-phan/{id}/print (Đã có trong api.php)
        const res = await axiosClient.get(
          `/giang-vien/lop-hoc-phan/${id}/print`,
        );

        // Đảm bảo bóc tách đúng cấu trúc { success, data: { meta, danh_sach } }
        const payload = res.data || res;
        setStudents(payload.danh_sach || []);
        setClassInfo(payload.meta || null);
      } catch (error) {
        toast.error("Không thể tải danh sách sinh viên");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const filteredStudents = students.filter(
    (sv) =>
      sv.ho_ten?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sv.ma_sv?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  if (loading)
    return (
      <div className="p-10 text-center font-medium text-gray-500">
        Đang tải danh sách sinh viên...
      </div>
    );

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fadeIn pb-10">
      {/* Navigation & Header Section */}
      <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-50/40 rounded-full -mr-20 -mt-20 blur-3xl" />
        <div className="absolute bottom-0 left-20 w-40 h-40 bg-blue-50/30 rounded-full -mb-10 blur-2xl" />

        <div className="relative flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-6">
            <button
              onClick={() => navigate("/giang-vien/lop-phan-cong")}
              className="p-3 bg-gray-50 text-gray-400 rounded-2xl hover:bg-indigo-50 hover:text-indigo-600 transition-all group"
            >
              <ArrowLeft
                size={24}
                className="group-hover:-translate-x-1 transition-transform"
              />
            </button>
            <div className="flex items-center gap-5">
              <Users size={42} className="text-indigo-600 shrink-0" />
              <div>
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                  Danh sách sinh viên
                </h2>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-[10px] font-black px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-lg uppercase tracking-wider border border-indigo-100">
                    {classInfo?.ma_lop_hp}
                  </span>
                  <span className="text-gray-400 text-sm font-medium">
                    {classInfo?.ten_mon}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 print:hidden">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-2xl text-xs font-bold hover:bg-indigo-600 transition-all shadow-lg shadow-gray-200 active:scale-95"
            >
              <Printer size={16} /> IN DANH SÁCH
            </button>
          </div>
        </div>
      </div>

      {/* Toolbar & Stats */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 print:hidden">
        <div className="relative w-full md:w-96 group">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors"
            size={18}
          />
          <input
            type="text"
            placeholder="Tìm theo tên hoặc MSSV..."
            className="w-full pl-12 pr-4 py-4 bg-white border border-gray-100 rounded-[1.5rem] outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm font-medium text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-4">
          <div className="px-6 py-3 bg-white rounded-[1.5rem] border border-gray-100 shadow-sm flex items-center gap-3">
            <GraduationCap size={18} className="text-indigo-400" />
            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">
              Sĩ số:
            </span>
            <span className="text-sm font-black text-indigo-600">
              {students.length}
            </span>
          </div>
        </div>
      </div>

      {/* Student Table Card */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden print:border-none print:shadow-none">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50/50 text-gray-400 text-[11px] uppercase font-bold tracking-[0.15em] border-b border-gray-100">
              <tr>
                <th className="px-8 py-5 w-20">STT</th>
                <th className="px-6 py-4">MSSV</th>
                <th className="px-6 py-4">Họ và tên</th>
                <th className="px-6 py-4 text-center">CC</th>
                <th className="px-6 py-4 text-center">GK</th>
                <th className="px-6 py-4 text-center">Thi</th>
                <th className="px-6 py-4 text-center">TK</th>
                <th className="px-8 py-4 text-right">Kết quả</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50/50">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td
                    colSpan="8"
                    className="px-6 py-24 text-center text-gray-400 italic"
                  >
                    {searchTerm
                      ? "Không tìm thấy sinh viên phù hợp."
                      : "Chưa có sinh viên nào đăng ký lớp học này."}
                  </td>
                </tr>
              ) : (
                filteredStudents.map((sv, index) => (
                  <tr
                    key={sv.sinh_vien_id || index}
                    className="hover:bg-gray-50/50 transition-all group"
                  >
                    <td className="px-8 py-5 text-gray-400 text-sm font-medium">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4 font-bold text-indigo-600 text-sm">
                      {sv.ma_sv}
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-800 text-sm">
                      {sv.ho_ten}
                    </td>
                    <td className="px-6 py-4 text-center text-sm font-bold text-gray-500">
                      {sv.diem_cc ?? "-"}
                    </td>
                    <td className="px-6 py-4 text-center text-sm font-bold text-gray-500">
                      {sv.diem_gk ?? "-"}
                    </td>
                    <td className="px-6 py-4 text-center text-sm font-black text-indigo-600 bg-indigo-50/30">
                      {sv.diem_thi ?? "-"}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`font-black text-sm ${parseFloat(sv.diem_tk) >= 5 ? "text-emerald-600" : "text-rose-600"}`}
                      >
                        {sv.diem_tk ?? "-"}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <span
                        className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-xl border shadow-sm ${
                          parseFloat(sv.diem_tk) >= 4
                            ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                            : "bg-rose-50 text-rose-600 border-rose-100"
                        }`}
                      >
                        {parseFloat(sv.diem_tk) >= 4 ? "Qua môn" : "Học lại"}
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

export default TeacherClassStudentList;
