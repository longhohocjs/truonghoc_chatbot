import React, { useState, useEffect } from "react";
import axiosClient from "@/api/axios";
import toast from "react-hot-toast";
import {
  X,
  FileDown,
  FileUp,
  ClipboardPenLine,
  AlertCircle, // Thêm AlertCircle vào đây
  Save,
  Search,
  UserCheck,
} from "lucide-react";

const NhapDiemModal = ({ isOpen, onClose, lop }) => {
  const [sinhViens, setSinhViens] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (isOpen && lop) {
      fetchSinhVien();
    }
  }, [isOpen, lop]);

  const fetchSinhVien = async () => {
    setLoading(true);
    try {
      const res = await axiosClient.post("/giang-vien/lop/sinh-vien", {
        lopHocPhanID: lop.lop_hoc_phan_id,
      });

      // Laravel success helper trả về { success: true, data: [...] }
      // Axios client của bạn bóc tách lớp đầu nên res chính là object chứa { success, data }
      setSinhViens(res.data || []);
    } catch (error) {
      console.error("Lỗi lấy danh sách SV:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateDiem = async (svId, field, value) => {
    try {
      const sv = sinhViens.find((s) => s.sinh_vien_id === svId);
      const payload = {
        lop_hoc_phan_id: lop.lop_hoc_phan_id,
        sinh_vien_id: svId,
        diem_chuyen_can: field === "diem_cc" ? value : sv.diem_cc,
        diem_giua_ky: field === "diem_gk" ? value : sv.diem_gk,
        diem_thi: field === "diem_thi" ? value : sv.diem_thi,
      };

      const res = await axiosClient.post("/giang-vien/nhap-diem", payload);
      toast.success(`Đã lưu điểm cho SV ${sv.ho_ten}`);

      // Cập nhật state local
      setSinhViens((prev) =>
        prev.map((s) =>
          s.sinh_vien_id === svId
            ? { ...s, [field]: value, diem_tk: res.diem_tk || s.diem_tk }
            : s,
        ),
      );
    } catch (error) {
      toast.error("Lỗi khi cập nhật điểm!");
    }
  };

  const handleImportExcel = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      setLoading(true);
      const res = await axiosClient.post(
        `/giang-vien/lop-hoc-phan/${lop.lop_hoc_phan_id}/import-diem`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      );
      alert(res.message);
      fetchSinhVien();
    } catch (error) {
      alert("Lỗi import Excel!");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-md animate-fadeIn">
      <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-indigo-100 w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden border border-gray-50">
        {/* Styled Header */}
        <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/50 rounded-full -mr-32 -mt-32 blur-3xl" />

          <div className="relative z-10 flex items-center gap-5">
            <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600">
              <ClipboardPenLine size={24} />
            </div>
            <div>
              <h3 className="text-2xl font-black text-gray-900 tracking-tight leading-none">
                Quản lý điểm lớp học phần
              </h3>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-[10px] font-black px-2 py-0.5 bg-indigo-600 text-white rounded-lg uppercase tracking-wider">
                  {lop?.ma_lop_hp}
                </span>
                <p className="text-sm font-bold text-gray-400">
                  {lop?.ten_mon}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 relative z-10">
            <label className="cursor-pointer flex items-center gap-2 bg-emerald-500 text-white px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-wider hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-100 active:scale-95">
              <FileUp size={16} /> IMPORT
              <input
                type="file"
                className="hidden"
                onChange={handleImportExcel}
                accept=".xlsx,.xls"
              />
            </label>
            <button
              onClick={onClose}
              className="p-3 bg-gray-50 text-gray-400 rounded-2xl hover:bg-rose-50 hover:text-rose-500 transition-all"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="p-8 overflow-y-auto flex-1 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
              <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">
                Đang xử lý dữ liệu...
              </p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead className="text-[11px] font-black text-gray-400 uppercase tracking-[0.15em] border-b border-gray-100">
                <tr>
                  <th className="pb-6 px-4">Thông tin sinh viên</th>
                  <th className="pb-6 px-2 text-center w-32">Chuyên cần</th>
                  <th className="pb-6 px-2 text-center w-32">Giữa kỳ</th>
                  <th className="pb-6 px-2 text-center w-32">Điểm thi</th>
                  <th className="pb-6 px-4 text-center w-32">Tổng kết</th>
                  <th className="pb-6 px-4 text-center w-32">Học phí</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sinhViens.map((sv) => (
                  <tr
                    key={sv.sinh_vien_id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-5 px-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-gray-800">
                          {sv.ho_ten}
                        </span>
                        <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">
                          {sv.ma_sv}
                        </span>
                      </div>
                    </td>
                    <td className="py-5 px-2">
                      <input
                        type="number"
                        min="0"
                        max="10"
                        step="0.1"
                        className="w-24 mx-auto block px-3 py-3 bg-gray-50 border border-transparent rounded-xl text-center font-black text-gray-700 focus:bg-white focus:border-indigo-200 focus:ring-4 focus:ring-indigo-500/5 transition-all outline-none"
                        value={sv.diem_cc ?? ""}
                        onBlur={(e) =>
                          handleUpdateDiem(
                            sv.sinh_vien_id,
                            "diem_cc",
                            e.target.value,
                          )
                        }
                        onChange={(e) =>
                          setSinhViens((prev) =>
                            prev.map((s) =>
                              s.sinh_vien_id === sv.sinh_vien_id
                                ? { ...s, diem_cc: e.target.value }
                                : s,
                            ),
                          )
                        }
                      />
                    </td>
                    <td className="py-5 px-2">
                      <input
                        type="number"
                        min="0"
                        max="10"
                        step="0.1"
                        className="w-24 mx-auto block px-3 py-3 bg-gray-50 border border-transparent rounded-xl text-center font-black text-gray-700 focus:bg-white focus:border-indigo-200 focus:ring-4 focus:ring-indigo-500/5 transition-all outline-none"
                        value={sv.diem_gk ?? ""}
                        onBlur={(e) =>
                          handleUpdateDiem(
                            sv.sinh_vien_id,
                            "diem_gk",
                            e.target.value,
                          )
                        }
                        onChange={(e) =>
                          setSinhViens((prev) =>
                            prev.map((s) =>
                              s.sinh_vien_id === sv.sinh_vien_id
                                ? { ...s, diem_gk: e.target.value }
                                : s,
                            ),
                          )
                        }
                      />
                    </td>
                    <td className="py-5 px-2">
                      <input
                        type="number"
                        min="0"
                        max="10"
                        step="0.1"
                        className="w-24 mx-auto block px-3 py-3 bg-indigo-50/50 border border-indigo-100 rounded-xl text-center font-black text-indigo-600 focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none"
                        value={sv.diem_thi ?? ""}
                        onBlur={(e) =>
                          handleUpdateDiem(
                            sv.sinh_vien_id,
                            "diem_thi",
                            e.target.value,
                          )
                        }
                        onChange={(e) =>
                          setSinhViens((prev) =>
                            prev.map((s) =>
                              s.sinh_vien_id === sv.sinh_vien_id
                                ? { ...s, diem_thi: e.target.value }
                                : s,
                            ),
                          )
                        }
                      />
                    </td>
                    <td className="py-5 px-4 text-center">
                      <span
                        className={`text-base font-black px-4 py-2 rounded-2xl ${
                          parseFloat(sv.diem_tk) >= 5
                            ? "text-emerald-600 bg-emerald-50"
                            : "text-rose-600 bg-rose-50"
                        }`}
                      >
                        {sv.diem_tk || "-"}
                      </span>
                    </td>
                    <td className="py-5 px-4 text-center">
                      {sv.da_thanh_toan_hoc_phi ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wide bg-emerald-50 text-emerald-600">
                          <UserCheck size={12} className="mr-1" /> Đã TT
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wide bg-rose-50 text-rose-600">
                          <AlertCircle size={12} className="mr-1" /> Chưa TT
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="px-8 py-5 border-t border-gray-100 bg-gray-50/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-10 py-4 bg-gray-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-xl shadow-gray-200 active:scale-95"
          >
            Hoàn tất nhập điểm
          </button>
        </div>
      </div>
    </div>
  );
};

export default NhapDiemModal;
