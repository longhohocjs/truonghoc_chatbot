import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosClient from "@/api/axios";
import {
  BookOpen,
  Users,
  FileSpreadsheet,
  ClipboardPenLine,
  ListChecks,
  LayoutDashboard,
  Calendar,
  GraduationCap,
} from "lucide-react";
import NhapDiemModal from "./NhapDiemModal";

const LopPhanCong = () => {
  const [lops, setLops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLop, setSelectedLop] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchLops = async () => {
      try {
        const response = await axiosClient.get("/giang-vien/lop-phan-cong");
        if (response.success) {
          setLops(response.data);
        }
      } catch (error) {
        console.error("Lỗi khi lấy danh sách lớp:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchLops();
  }, []);

  const handleExportTemplate = async (lopId, maLop) => {
    try {
      const response = await axiosClient.get(
        `/giang-vien/lop-hoc-phan/${lopId}/export-diem`,
        {
          responseType: "blob",
        },
      );
      const url = window.URL.createObjectURL(new Blob([response]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `mau-nhap-diem-${maLop}.xlsx`);
      document.body.appendChild(link);
      link.click();
    } catch (err) {
      alert("Lỗi tải file mẫu!");
    }
  };

  if (loading)
    return (
      <div className="flex justify-center p-20 font-medium text-gray-500">
        Đang tải dữ liệu...
      </div>
    );

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
                Lớp học phần giảng dạy
              </h2>
              <p className="text-gray-500 text-sm font-medium">
                Quản lý điểm và danh sách sinh viên các lớp được phân công
              </p>
            </div>
          </div>
          <div className="bg-indigo-600 px-6 py-3 rounded-2xl text-center shadow-lg shadow-indigo-100">
            <p className="text-[10px] font-bold text-indigo-100 uppercase tracking-widest mb-1">
              Tổng số lớp
            </p>
            <p className="text-2xl font-black text-white leading-none">
              {lops.length}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50/50 text-gray-400 text-[11px] uppercase font-bold tracking-[0.15em] border-b border-gray-100">
              <tr>
                <th className="px-8 py-5">Mã Lớp HP</th>
                <th className="px-6 py-4">Tên Môn Học</th>
                <th className="px-6 py-4 text-center">Tín chỉ</th>
                <th className="px-6 py-4">Học kỳ</th>
                <th className="px-6 py-4 text-center">Sĩ số</th>
                <th className="px-8 py-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {lops.map((lop) => (
                <tr
                  key={lop.lop_hoc_phan_id}
                  className="hover:bg-gray-50/50 transition-all group"
                >
                  <td className="px-8 py-5 font-black text-indigo-600 text-sm">
                    {lop.ma_lop_hp}
                  </td>
                  <td className="px-6 py-4 font-bold text-gray-800 text-sm">
                    {lop.ten_mon}
                  </td>
                  <td className="px-6 py-4 text-center font-bold text-gray-500 text-sm">
                    {lop.so_tin_chi}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-bold text-gray-700">
                      {lop.ten_hoc_ky}
                    </div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase">
                      {lop.nam_hoc}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span
                      className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase border ${
                        lop.so_sinh_vien >= lop.so_luong_toi_da
                          ? "bg-rose-50 text-rose-600 border-rose-100"
                          : "bg-indigo-50 text-indigo-600 border-indigo-100"
                      }`}
                    >
                      {lop.si_so}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() =>
                          navigate(
                            `/giang-vien/lop/${lop.lop_hoc_phan_id}/sinh-vien`,
                          )
                        }
                        className="p-2.5 bg-gray-50 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                        title="Xem danh sách sinh viên"
                      >
                        <ListChecks size={18} />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedLop(lop);
                          setIsModalOpen(true);
                        }}
                        className="flex items-center bg-blue-700 hover:bg-indigo-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-lg shadow-gray-100 active:scale-95"
                      >
                        <ClipboardPenLine size={14} className="mr-1.5" /> NHẬP
                        ĐIỂM
                      </button>
                      <button
                        onClick={() =>
                          handleExportTemplate(
                            lop.lop_hoc_phan_id,
                            lop.ma_lop_hp,
                          )
                        }
                        className="p-2.5 bg-gray-50 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                        title="Tải mẫu Excel"
                      >
                        <FileSpreadsheet size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <NhapDiemModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        lop={selectedLop}
      />
    </div>
  );
};
export default LopPhanCong;
