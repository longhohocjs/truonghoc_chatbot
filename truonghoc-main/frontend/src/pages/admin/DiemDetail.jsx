import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosClient from "@/api/axios";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Save,
  Lock,
  Unlock,
  GraduationCap,
  BookOpen,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

const DiemDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Helper để trích xuất mảng dữ liệu linh hoạt
  const getArray = (res) => {
    const payload = res?.data || res;
    if (Array.isArray(payload)) return payload;
    if (payload?.data && Array.isArray(payload.data)) return payload.data;
    return [];
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      if (!id) throw new Error("ID không hợp lệ");

      console.log("Gửi yêu cầu lấy điểm cho ID:", id);

      // Sử dụng đúng API bảng điểm lớp học phần
      const res = await axiosClient.post("/admin/diem-so/danh-sach-lop-hp", {
        LopHocPhanID: id,
      });
      const data = getArray(res);

      // Log để kiểm tra xem Backend có trả về IsLocked không
      if (data.length > 0) {
        console.log("Dữ liệu bản ghi đầu tiên từ Backend:", data[0]);
      }

      // CẬP NHẬT: Thêm dòng này để đưa dữ liệu vào state students
      setStudents(data);

      // Lấy thông tin lớp từ bản ghi đầu tiên
      if (data.length > 0) {
        // Map đầy đủ các trường từ View (PascalCase)
        setInfo({
          MaLopHP: data[0].MaLopHP,
          TenMon: data[0].TenMon,
          HoTenGV: data[0].HoTenGV || "Chưa phân công",
          TenHocKy: data[0].TenHocKy,
          IsLocked: Number(data[0].IsLocked ?? data[0].is_locked ?? 0),
          MonTienQuyet: data[0].MonTienQuyet,
          MonSongHanh: data[0].MonSongHanh,
        });
      }
    } catch (error) {
      console.error("Lỗi fetchData:", error);
      toast.error(error.message || "Không thể tải bảng điểm");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleGradeChange = (studentId, field, value) => {
    setStudents((prev) =>
      prev.map((s) => {
        if (s.SinhVienID === studentId) {
          return { ...s, [field]: value };
        }
        return s;
      }),
    );
  };

  const saveGrade = async (student) => {
    setSaving(true);
    try {
      // Đồng bộ cấu trúc gửi lên với DiemSoService.php
      await axiosClient.post("/admin/diem-so/nhap-diem", {
        LopHocPhanID: id,
        DanhSachDiem: [
          {
            DangKyID: student.DangKyID,
            DiemChuyenCan: student.DiemChuyenCan,
            DiemGiuaKy: student.DiemGiuaKy,
            DiemThi: student.DiemThi,
          },
        ],
      });
      toast.success(`Đã cập nhật điểm cho ${student.HoTen}`);
    } catch (error) {
      toast.error("Lỗi khi lưu điểm");
    } finally {
      setSaving(false);
    }
  };

  const toggleLock = async (isLock) => {
    const endpoint = isLock
      ? "/admin/diem-so/khoa-diem"
      : "/admin/diem-so/mo-khoa-diem";
    try {
      const res = await axiosClient.post(endpoint, { LopHocPhanID: id });
      toast.success(isLock ? "Đã khóa bảng điểm" : "Đã mở khóa bảng điểm");

      // Cập nhật state local ngay lập tức
      setInfo((prev) => (prev ? { ...prev, IsLocked: isLock ? 1 : 0 } : null));

      // Tùy chọn: Đợi 500ms trước khi fetch để DB kịp cập nhật nếu là View
      setTimeout(() => fetchData(), 500);
    } catch (error) {
      toast.error("Thao tác thất bại");
    }
  };

  const calculateTotal = (cc, gk, thi) => {
    const nCC = parseFloat(cc) || 0;
    const nGK = parseFloat(gk) || 0;
    const nThi = parseFloat(thi) || 0;

    if (cc === null && gk === null && thi === null) return "0.0";
    const totalScore = nCC * 0.1 + nGK * 0.3 + nThi * 0.6;
    return totalScore.toFixed(1);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fadeIn pb-10">
      {/* Unified Header */}
      <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-50/40 rounded-full -mr-20 -mt-20 blur-3xl" />

        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-6">
            <button
              onClick={() => navigate("/admin/diem-so")}
              className="p-4 bg-gray-50 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-3xl transition-all active:scale-90"
            >
              <ArrowLeft size={24} />
            </button>
            <div>
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                Bảng điểm chi tiết
              </h2>
              <div className="flex flex-wrap items-center gap-y-1 gap-x-3 mt-1">
                <span className="text-sm font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                  {info?.MaLopHP}
                </span>
                <span className="text-gray-500 text-sm font-medium">
                  {info?.TenMon}
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-gray-200 hidden md:block" />
                <span className="text-gray-400 text-xs font-bold uppercase">
                  GV: {info?.HoTenGV}
                </span>
              </div>
            </div>
          </div>

          {/* Gạt khóa nhập điểm (Toggle Switch) */}
          <div className="flex items-center gap-4 bg-gray-50/50 p-2 pl-5 rounded-[1.5rem] border border-gray-100">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">
                Trạng thái
              </span>
              <span
                className={`text-xs font-bold mt-1 ${info?.IsLocked == 1 ? "text-rose-500" : "text-emerald-500"}`}
              >
                {info?.IsLocked == 1 ? "Đang khóa" : "Đang mở"}
              </span>
            </div>
            <button
              onClick={() => toggleLock(info?.IsLocked != 1)}
              className={`relative inline-flex h-10 w-20 items-center rounded-full transition-all duration-300 outline-none
                ${info?.IsLocked == 1 ? "bg-rose-500 shadow-lg shadow-rose-100" : "bg-emerald-500 shadow-lg shadow-emerald-100"}`}
            >
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full bg-white transition-all duration-300 shadow-sm
                ${info?.IsLocked == 1 ? "translate-x-11" : "translate-x-1"}`}
              >
                {info?.IsLocked == 1 ? (
                  <Lock size={14} className="text-rose-500" />
                ) : (
                  <Unlock size={14} className="text-emerald-500" />
                )}
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Table Area */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50/50 text-gray-400 text-[10px] uppercase font-bold tracking-[0.15em] border-b border-gray-100">
              <tr>
                <th className="px-8 py-5">Sinh viên</th>
                <th className="px-4 py-5 text-center">C.Cần (10%)</th>
                <th className="px-4 py-5 text-center">G.Kỳ (30%)</th>
                <th className="px-4 py-5 text-center">C.Kỳ (60%)</th>
                <th className="px-4 py-5 text-center">Tổng kết</th>
                <th className="px-8 py-5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-8 py-24 text-center">
                    <div className="inline-block w-8 h-8 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
                  </td>
                </tr>
              ) : students.length > 0 ? (
                students.map((sv) => (
                  <tr
                    key={sv.DangKyID || sv.SinhVienID}
                    className="hover:bg-gray-50/50 transition-all group"
                  >
                    <td className="px-8 py-5">
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-gray-900 mb-0.5">
                          {sv.HoTen || sv.ho_ten}
                        </span>
                        <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-tighter">
                          {sv.MaSV || sv.ma_sv}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-5">
                      <input
                        type="number"
                        disabled={info?.IsLocked == 1}
                        step="0.1"
                        min="0"
                        max="10"
                        className={`w-20 mx-auto px-3 py-2 bg-gray-50 border-none rounded-xl text-center font-bold outline-none focus:ring-2 focus:ring-indigo-500 block shadow-inner
                          ${info?.IsLocked == 1 ? "opacity-50 grayscale cursor-not-allowed" : "text-gray-700"}`}
                        value={sv.DiemChuyenCan ?? ""}
                        onChange={(e) =>
                          handleGradeChange(
                            sv.SinhVienID,
                            "DiemChuyenCan",
                            e.target.value,
                          )
                        }
                      />
                    </td>
                    <td className="px-4 py-5">
                      <input
                        type="number"
                        disabled={info?.IsLocked == 1}
                        step="0.1"
                        min="0"
                        max="10"
                        className={`w-20 mx-auto px-3 py-2 bg-gray-50 border-none rounded-xl text-center font-bold outline-none focus:ring-2 focus:ring-indigo-500 block shadow-inner
                          ${info?.IsLocked == 1 ? "opacity-50 grayscale cursor-not-allowed" : "text-gray-700"}`}
                        value={sv.DiemGiuaKy ?? ""}
                        onChange={(e) =>
                          handleGradeChange(
                            sv.SinhVienID,
                            "DiemGiuaKy",
                            e.target.value,
                          )
                        }
                      />
                    </td>
                    <td className="px-4 py-5">
                      <input
                        type="number"
                        disabled={info?.IsLocked == 1}
                        step="0.1"
                        min="0"
                        max="10"
                        className={`w-20 mx-auto px-3 py-2 bg-gray-50 border-none rounded-xl text-center font-bold outline-none focus:ring-2 focus:ring-indigo-500 block shadow-inner
                          ${info?.IsLocked == 1 ? "opacity-50 grayscale cursor-not-allowed" : "text-gray-700"}`}
                        value={sv.DiemThi ?? ""}
                        onChange={(e) =>
                          handleGradeChange(
                            sv.SinhVienID,
                            "DiemThi",
                            e.target.value,
                          )
                        }
                      />
                    </td>
                    <td className="px-4 py-5 text-center">
                      <div className="inline-block bg-indigo-50 text-indigo-700 px-4 py-1.5 rounded-xl font-black text-sm border border-indigo-100 shadow-sm">
                        {calculateTotal(
                          sv.DiemChuyenCan,
                          sv.DiemGiuaKy,
                          sv.DiemThi,
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                      {info?.IsLocked != 1 && (
                        <button
                          onClick={() => saveGrade(sv)}
                          disabled={saving}
                          className="p-2.5 bg-white text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all shadow-sm border border-gray-100 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                        >
                          <Save size={14} /> Lưu
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="6"
                    className="px-8 py-20 text-center text-gray-400 font-medium italic"
                  >
                    Chưa có sinh viên nào đăng ký lớp học phần này
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-indigo-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-indigo-100 flex items-start gap-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl" />
        <AlertCircle size={28} className="shrink-0 mt-1 opacity-80" />
        <div className="space-y-2 relative z-10">
          <p className="text-sm font-black uppercase tracking-[0.15em] opacity-80">
            Quy tắc quản lý điểm
          </p>
          <p className="text-sm font-medium leading-relaxed max-w-3xl">
            Admin có đặc quyền điều chỉnh điểm số bất cứ lúc nào. Khi bảng điểm
            ở trạng thái{" "}
            <span className="underline decoration-indigo-300 underline-offset-4">
              ĐANG KHÓA
            </span>
            , giảng viên bộ môn và sinh viên sẽ không thể thực hiện bất kỳ thay
            đổi nào. Sinh viên chỉ có quyền xem kết quả sau khi điểm đã được phê
            duyệt.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DiemDetail;
