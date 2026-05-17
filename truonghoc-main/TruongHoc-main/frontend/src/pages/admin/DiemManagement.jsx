import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import axiosClient from "@/api/axios";
import toast from "react-hot-toast";
import {
  Star,
  Search,
  Save,
  Lock,
  Unlock,
  ArrowRight,
  BookOpen,
  GraduationCap,
  Calendar,
} from "lucide-react";

const DiemManagement = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("hocphan"); // 'hocphan' hoặc 'renluyen'
  const [lops, setLops] = useState([]);
  const [hocKys, setHocKys] = useState([]);
  const [lopsSH, setLopsSH] = useState([]);
  const [drlStudents, setDrlStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingDRL, setSavingDRL] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filtersDRL, setFiltersDRL] = useState({
    HocKyID: "",
    LopSinhHoatID: "",
  });

  // Helper để trích xuất mảng dữ liệu linh hoạt
  const getArray = (res) => {
    const payload = res?.data || res;
    if (Array.isArray(payload)) return payload;
    if (payload?.data && Array.isArray(payload.data)) return payload.data;
    return [];
  };

  const fetchLopHocPhan = async () => {
    setLoading(true);
    try {
      // Sử dụng API lấy danh sách lớp học phần để quản lý điểm
      const res = await axiosClient.post("/admin/diem-so/danh-sach-lop-hp");
      setLops(getArray(res));
    } catch (error) {
      console.error("Lỗi khi tải danh sách lớp:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDRLData = async () => {
    if (!filtersDRL.HocKyID) return;
    setLoading(true);
    try {
      const res = await axiosClient.post(
        "/admin/diem-so/danh-sach-ren-luyen",
        filtersDRL,
      );
      const data = getArray(res);
      // Debug: Xem cấu hình dữ liệu thực tế từ API
      console.log("Dữ liệu điểm rèn luyện nhận về:", data);
      setDrlStudents(data);
    } catch (error) {
      console.error("Lỗi khi tải điểm rèn luyện:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDropdowns = async () => {
    try {
      const [resHK, resLop] = await Promise.all([
        axiosClient.get("/admin/hoc-ky"),
        axiosClient.post("/admin/lop-sinh-hoat/danh-sach"),
      ]);
      const listHK = getArray(resHK);
      setHocKys(listHK);
      setLopsSH(getArray(resLop));

      if (listHK.length > 0 && !filtersDRL.HocKyID) {
        setFiltersDRL((prev) => ({ ...prev, HocKyID: listHK[0].HocKyID }));
      }
    } catch (error) {
      console.error("Lỗi tải dữ liệu dropdown:", error);
    }
  };

  useEffect(() => {
    if (activeTab === "hocphan") {
      fetchLopHocPhan();
    } else {
      fetchDropdowns();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === "renluyen" && filtersDRL.HocKyID) {
      fetchDRLData();
    }
  }, [filtersDRL, activeTab]);

  const getXepLoai = (diem) => {
    const d = parseFloat(diem);
    if (isNaN(d)) return "";
    if (d >= 90) return "XuatSac";
    if (d >= 80) return "Gioi";
    if (d >= 65) return "Kha";
    if (d >= 50) return "TrungBinh";
    if (d >= 35) return "Yeu";
    return "Kem";
  };

  const getXepLoaiLabel = (code) => {
    const map = {
      XuatSac: "Xuất sắc",
      Gioi: "Giỏi",
      Kha: "Khá",
      TrungBinh: "Trung bình",
      Yeu: "Yếu",
      Kem: "Kém",
      // Fallback cho dữ liệu tiếng Việt từ database của bạn
      Tốt: "Tốt",
      Khá: "Khá",
      Tot: "Tốt",
    };
    return map[code] || code || "Chưa xếp loại";
  };

  const handleDRLChange = (studentID, value) => {
    setDrlStudents((prev) =>
      prev.map((s) => {
        if (s.SinhVienID === studentID) {
          const val = value === "" ? "" : Math.min(100, Math.max(0, value));
          return { ...s, TongDiem: val, XepLoai: getXepLoai(val) };
        }
        return s;
      }),
    );
  };

  const handleSaveDRL = async () => {
    if (!filtersDRL.HocKyID) return;
    setSavingDRL(true);
    try {
      await axiosClient.post("/admin/diem-so/nhap-diem-ren-luyen", {
        HocKyID: filtersDRL.HocKyID,
        DanhSachDRL: drlStudents.map((s) => ({
          SinhVienID: s.SinhVienID,
          TongDiem: s.TongDiem || 0,
          XepLoai: s.XepLoai || "Kem",
        })),
      });
      toast.success("Cập nhật điểm rèn luyện thành công");
      fetchDRLData();
    } catch (error) {
      toast.error("Lỗi khi lưu điểm rèn luyện");
    } finally {
      setSavingDRL(false);
    }
  };

  const filteredLops = lops.filter(
    (l) =>
      l.MaLopHP?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.TenMon?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const uniqueLops = useMemo(() => {
    return Array.from(
      new Map(filteredLops.map((item) => [item.LopHocPhanID, item])).values(),
    );
  }, [filteredLops]);

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fadeIn pb-10">
      {/* Unified Header */}
      <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-50/40 rounded-full -mr-20 -mt-20 blur-3xl" />
        <div className="relative flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-6">
            <div className="p-4 bg-indigo-600 rounded-3xl text-white shadow-lg shadow-indigo-100">
              <Star size={32} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                Quản lý Điểm số
              </h2>
              <p className="text-gray-500 text-sm font-medium">
                Cập nhật kết quả học tập và đánh giá điểm rèn luyện định kỳ của
                sinh viên
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Switcher & Search Bar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="bg-white p-1.5 rounded-2xl border border-gray-100 flex gap-1 shadow-sm w-fit">
          <TabButton
            active={activeTab === "hocphan"}
            onClick={() => setActiveTab("hocphan")}
            icon={<BookOpen size={16} />}
            label="Điểm học phần"
          />
          <TabButton
            active={activeTab === "renluyen"}
            onClick={() => setActiveTab("renluyen")}
            icon={<GraduationCap size={16} />}
            label="Điểm rèn luyện"
          />
        </div>

        {activeTab === "hocphan" && (
          <div className="relative flex-1 w-full md:max-w-md">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Tìm mã lớp hoặc tên môn học..."
              className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        )}
      </div>

      {activeTab === "hocphan" ? (
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50/50 text-gray-400 text-[10px] uppercase font-bold tracking-[0.15em] border-b border-gray-100">
                <tr>
                  <th className="px-8 py-5">Định danh Lớp</th>
                  <th className="px-6 py-5">Học phần / Học kỳ</th>
                  <th className="px-6 py-5">Ràng buộc</th>
                  <th className="px-6 py-5">Giảng viên</th>
                  <th className="px-6 py-5 text-center">Trạng thái</th>
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
                ) : uniqueLops.length === 0 ? (
                  <tr>
                    <td
                      colSpan="6"
                      className="px-8 py-20 text-center text-gray-400 font-medium italic"
                    >
                      Không tìm thấy dữ liệu điểm lớp học phần phù hợp
                    </td>
                  </tr>
                ) : (
                  uniqueLops.map((lop) => (
                    <tr
                      key={lop.LopHocPhanID}
                      className="hover:bg-gray-50/50 transition-all group"
                    >
                      <td className="px-8 py-5">
                        <span className="text-sm font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
                          {lop.MaLopHP}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col">
                          <p className="text-sm font-black text-gray-900 leading-tight mb-1">
                            {lop.TenMon}
                          </p>
                          <div className="flex items-center gap-1 text-[10px] text-gray-400 font-bold uppercase tracking-tight">
                            <Calendar size={10} /> {lop.TenHocKy}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col gap-0.5">
                          <span
                            className="text-[10px] text-rose-500 font-black truncate max-w-[120px]"
                            title={lop.MonTienQuyet}
                          >
                            TQ: {lop.MonTienQuyet || "---"}
                          </span>
                          <span
                            className="text-[10px] text-gray-400 font-medium truncate max-w-[120px]"
                            title={lop.MonSongHanh}
                          >
                            SH: {lop.MonSongHanh || "---"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <p className="text-xs font-bold text-gray-600">
                          {lop.HoTenGV || "Chưa phân công"}
                        </p>
                      </td>
                      <td className="px-6 py-5 text-center">
                        {Number(lop.IsLocked) === 1 ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-600 border border-rose-100 text-[10px] font-black uppercase">
                            <Lock size={10} /> KHÓA
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 text-[10px] font-black uppercase">
                            <Unlock size={10} /> MỞ
                          </span>
                        )}
                      </td>
                      <td className="px-8 py-5 text-right">
                        <button
                          onClick={() =>
                            navigate(`/admin/diem-so/${lop.LopHocPhanID}`)
                          }
                          className="p-2.5 bg-white text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all shadow-sm border border-gray-100 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                        >
                          Vào điểm <ArrowRight size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="space-y-8 animate-fadeIn">
          {/* Filters for DRL */}
          <div className="flex flex-col md:flex-row gap-4 items-end justify-between bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1 w-full">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] ml-1">
                  Học kỳ đánh giá
                </label>
                <select
                  className="w-full px-5 py-3 bg-gray-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-gray-700 appearance-none shadow-inner"
                  value={filtersDRL.HocKyID}
                  onChange={(e) =>
                    setFiltersDRL({ ...filtersDRL, HocKyID: e.target.value })
                  }
                >
                  {hocKys.map((hk) => (
                    <option key={hk.HocKyID} value={hk.HocKyID}>
                      {hk.nam_hoc?.TenNamHoc} - {hk.TenHocKy}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] ml-1">
                  Lớp sinh hoạt
                </label>
                <select
                  className="w-full px-5 py-3 bg-gray-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-gray-700 appearance-none shadow-inner"
                  value={filtersDRL.LopSinhHoatID}
                  onChange={(e) =>
                    setFiltersDRL({
                      ...filtersDRL,
                      LopSinhHoatID: e.target.value,
                    })
                  }
                >
                  <option value="">-- Tất cả các lớp --</option>
                  {lopsSH.map((l) => (
                    <option key={l.LopSinhHoatID} value={l.LopSinhHoatID}>
                      {l.MaLop} - {l.TenLop}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <button
              onClick={handleSaveDRL}
              disabled={savingDRL || drlStudents.length === 0}
              className="flex items-center gap-2 bg-indigo-600 text-white px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 disabled:bg-gray-200 active:scale-95"
            >
              <Save size={18} /> {savingDRL ? "Đang lưu..." : "Lưu bảng điểm"}
            </button>
          </div>

          {/* Training Grades Table Area */}
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50/50 text-gray-400 text-[10px] uppercase font-bold tracking-[0.15em] border-b border-gray-100">
                  <tr>
                    <th className="px-8 py-5">Sinh viên</th>
                    <th className="px-6 py-5 text-center w-48">
                      Tổng điểm (0-100)
                    </th>
                    <th className="px-6 py-5 text-center">Xếp loại</th>
                    <th className="px-8 py-5 text-right">Ngày cập nhật</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr>
                      <td colSpan="4" className="px-8 py-24 text-center">
                        <div className="inline-block w-8 h-8 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
                      </td>
                    </tr>
                  ) : drlStudents.length === 0 ? (
                    <tr>
                      <td
                        colSpan="4"
                        className="px-8 py-20 text-center text-gray-400 font-medium italic"
                      >
                        Không tìm thấy dữ liệu rèn luyện trong học kỳ này
                      </td>
                    </tr>
                  ) : (
                    drlStudents.map((sv) => (
                      <tr
                        key={sv.SinhVienID}
                        className="hover:bg-gray-50/50 transition-all"
                      >
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 font-black text-xs">
                              {sv.HoTen?.charAt(0) || "S"}
                            </div>
                            <div>
                              <p className="text-sm font-black text-gray-900 leading-none mb-1">
                                {sv.HoTen}
                              </p>
                              <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-md uppercase tracking-tighter">
                                {sv.MaSV || sv.ma_sv}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <input
                            type="number"
                            className="w-full max-w-[100px] mx-auto px-4 py-2 bg-gray-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-black text-indigo-600 text-center shadow-inner block"
                            value={sv.TongDiem ?? ""}
                            onChange={(e) =>
                              handleDRLChange(sv.SinhVienID, e.target.value)
                            }
                          />
                        </td>
                        <td className="px-6 py-5 text-center">
                          <span
                            className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-sm ${
                              sv.XepLoai === "XuatSac"
                                ? "bg-purple-50 text-purple-600 border-purple-100"
                                : sv.XepLoai === "Gioi"
                                  ? "bg-indigo-50 text-indigo-600 border-indigo-100"
                                  : sv.XepLoai === "Kha"
                                    ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                    : "bg-gray-50 text-gray-400 border-gray-100"
                            }`}
                          >
                            {getXepLoaiLabel(sv.XepLoai)}
                          </span>
                        </td>
                        <td className="px-8 py-5 text-right">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                            {sv.NgayDanhGia
                              ? new Date(sv.NgayDanhGia).toLocaleDateString(
                                  "vi-VN",
                                )
                              : "---"}
                          </p>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const TabButton = ({ active, onClick, label, icon }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all
      ${active ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100" : "text-gray-400 hover:text-indigo-600 hover:bg-indigo-50"}`}
  >
    {icon}
    {label}
  </button>
);

export default DiemManagement;
