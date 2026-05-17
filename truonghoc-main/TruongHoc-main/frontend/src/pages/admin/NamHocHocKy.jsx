import React, { useState, useEffect } from "react";
import axiosClient from "@/api/axios";
import toast from "react-hot-toast";
import ConfirmModal from "@/components/ConfirmModal";
import {
  CalendarDays,
  Plus,
  Pencil,
  Trash2,
  Clock,
  Calendar as CalendarIcon,
  ArrowRight,
  CircleDot,
  CheckCircle2,
  Timer,
} from "lucide-react";

const NamHocHocKy = () => {
  const [hocKys, setHocKys] = useState([]);
  const [namHocs, setNamHocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddYear, setShowAddYear] = useState(false);
  const [editingYear, setEditingYear] = useState(null);
  const [showAddSemester, setShowAddSemester] = useState(false);
  const [editingSemester, setEditingSemester] = useState(null);
  const [confirmConfig, setConfirmConfig] = useState({
    isOpen: false,
    id: null,
    type: "", // 'year' hoặc 'semester'
  });

  const [newYear, setNewYear] = useState({
    TenNamHoc: "",
    NgayBatDau: "",
    NgayKetThuc: "",
  });
  const [newSemester, setNewSemester] = useState({
    TenHocKy: "",
    NamHocID: "",
    LoaiHocKy: "",
    NgayBatDau: "",
    NgayKetThuc: "",
  });

  const fetchHocKys = async () => {
    setLoading(true);
    try {
      const [resHk, resNh] = await Promise.all([
        axiosClient.get("/admin/hoc-ky"),
        axiosClient.get("/admin/nam-hoc"),
      ]);
      setHocKys(resHk.data || []);
      setNamHocs(resNh.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHocKys();
  }, []);

  const handleAddYear = async (e) => {
    e.preventDefault();
    try {
      console.log("Dữ liệu gửi đi (Năm học):", newYear);
      const apiCall = editingYear
        ? axiosClient.put(`/admin/nam-hoc/${editingYear.NamHocID}`, newYear)
        : axiosClient.post("/admin/nam-hoc", newYear);
      await apiCall;
      toast.success(
        editingYear ? "Cập nhật năm học thành công" : "Thêm năm học thành công",
      );
      setShowAddYear(false);
      // Reset editingYear và newYear sau khi thành công
      setEditingYear(null);
      setNewYear({ TenNamHoc: "", NgayBatDau: "", NgayKetThuc: "" });
      fetchHocKys();
    } catch (error) {
      // Bắt lỗi và hiển thị thông báo chi tiết từ backend
      toast.error(error.response?.data?.message || "Lỗi khi xử lý năm học");
    }
  };

  const handleAddSemester = async (e) => {
    e.preventDefault();
    try {
      // Logic kiểm tra ràng buộc thời gian mặc định
      const yearData = namHocs.find((y) => y.NamHocID == newSemester.NamHocID);
      if (yearData) {
        const yearNum =
          yearData.TenNamHoc.match(/\d{4}/)?.[0] || new Date().getFullYear();
        let minStart, maxEnd;

        if (newSemester.LoaiHocKy === "HK1") {
          [minStart, maxEnd] = [`${yearNum}-01-01`, `${yearNum}-03-31`];
        } else if (newSemester.LoaiHocKy === "HK2") {
          [minStart, maxEnd] = [`${yearNum}-05-01`, `${yearNum}-07-31`];
        } else if (newSemester.LoaiHocKy === "He") {
          [minStart, maxEnd] = [`${yearNum}-09-01`, `${yearNum}-12-31`];
        }

        if (minStart && maxEnd) {
          // Không cho phép bắt đầu muộn hơn mốc mặc định
          if (new Date(newSemester.NgayBatDau) > new Date(minStart)) {
            return toast.error(
              `Học kỳ này phải bắt đầu từ ${minStart} hoặc sớm hơn.`,
            );
          }
          // Không cho phép kết thúc sớm hơn mốc mặc định
          if (new Date(newSemester.NgayKetThuc) < new Date(maxEnd)) {
            return toast.error(
              `Học kỳ này phải kết thúc ít nhất vào ngày ${maxEnd}.`,
            );
          }
        }
      }

      console.log("Dữ liệu gửi đi (Học kỳ):", newSemester);
      const apiCall = editingSemester
        ? axiosClient.put(
            `/admin/hoc-ky/${editingSemester.HocKyID}`,
            newSemester,
          )
        : axiosClient.post("/admin/hoc-ky", newSemester);
      await apiCall;
      toast.success(
        editingSemester
          ? "Cập nhật học kỳ thành công"
          : "Thêm học kỳ thành công",
      );
      setShowAddSemester(false);
      setEditingSemester(null);
      setNewSemester({
        TenHocKy: "",
        NamHocID: "",
        LoaiHocKy: "",
        NgayBatDau: "",
        NgayKetThuc: "",
      });
      fetchHocKys();
    } catch (error) {
      // Bắt lỗi và hiển thị thông báo chi tiết từ backend
      toast.error(error.response?.data?.message || "Lỗi khi xử lý học kỳ");
    }
  };

  const handleDeleteYear = async (id) => {
    try {
      await axiosClient.delete(`/admin/nam-hoc/${id}`);
      toast.success("Xóa năm học thành công");
      fetchHocKys();
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể xóa năm học");
    }
  };

  const handleDeleteSemester = async (id) => {
    try {
      await axiosClient.delete(`/admin/hoc-ky/${id}`);
      toast.success("Xóa học kỳ thành công");
      fetchHocKys();
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể xóa học kỳ");
    }
  };

  const formatDateForInput = (dateStr) => {
    if (!dateStr) return "";
    // Xử lý cả định dạng "YYYY-MM-DD HH:mm:ss" và "YYYY-MM-DDTHH:mm:ss..."
    return dateStr.includes("T")
      ? dateStr.split("T")[0]
      : dateStr.split(" ")[0];
  };

  const handleEditYear = (year) => {
    setEditingYear(year);
    setNewYear({
      TenNamHoc: year.TenNamHoc || year.ten_nam_hoc,
      NgayBatDau: formatDateForInput(year.NgayBatDau || year.ngay_bat_dau),
      NgayKetThuc: formatDateForInput(year.NgayKetThuc || year.ngay_ket_thuc),
    });
    setShowAddYear(true);
  };

  const handleEditSemester = (semester) => {
    setEditingSemester(semester);
    setNewSemester({
      TenHocKy: semester.TenHocKy || semester.ten_hoc_ky,
      NamHocID: semester.NamHocID || semester.nam_hoc_id,
      LoaiHocKy: semester.LoaiHocKy || semester.loai_hoc_ky,
      NgayBatDau: formatDateForInput(
        semester.NgayBatDau || semester.ngay_bat_dau,
      ),
      NgayKetThuc: formatDateForInput(
        semester.NgayKetThuc || semester.ngay_ket_thuc,
      ),
    });
    setShowAddSemester(true);
  };

  const renderStatusBadge = (code, text) => {
    const styles = {
      CURRENT: "bg-emerald-50 text-emerald-600 border-emerald-100",
      PAST: "bg-gray-50 text-gray-400 border-gray-100",
      FUTURE: "bg-blue-50 text-blue-600 border-blue-100",
    };
    const icons = {
      CURRENT: <CircleDot size={12} className="animate-pulse" />,
      PAST: <CheckCircle2 size={12} />,
      FUTURE: <Timer size={12} />,
    };

    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-black uppercase tracking-tight ${styles[code] || styles.PAST}`}
      >
        {icons[code] || icons.PAST}
        {text}
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fadeIn pb-10">
      {/* Unified Header */}
      <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-50/40 rounded-full -mr-20 -mt-20 blur-3xl" />
        <div className="absolute bottom-0 left-20 w-40 h-40 bg-blue-50/30 rounded-full -mb-10 blur-2xl" />

        <div className="relative flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-6">
            <div className="p-4 bg-indigo-600 rounded-3xl text-white shadow-lg shadow-indigo-100">
              <CalendarDays size={32} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                Năm học & Học kỳ
              </h2>
              <p className="text-gray-500 text-sm font-medium">
                Thiết lập khung thời gian đào tạo và quản lý lộ trình học tập
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => {
                setEditingYear(null);
                setShowAddYear(true);
              }}
              className="flex items-center gap-2 bg-gray-900 text-white px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-lg active:scale-95"
            >
              <Plus size={16} /> Năm học
            </button>
            <button
              onClick={() => {
                setEditingSemester(null);
                setShowAddSemester(true);
              }}
              className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-95"
            >
              <Plus size={16} /> Học kỳ
            </button>
          </div>
        </div>
      </div>

      {/* Modal Thêm Năm Học */}
      {showAddYear && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-[100] animate-fadeIn">
          <form
            onSubmit={handleAddYear}
            className="bg-white p-8 rounded-[2.5rem] w-full max-w-md space-y-6 shadow-2xl border border-gray-100"
          >
            <h3 className="text-xl font-black text-gray-900">
              {editingYear
                ? "Cập nhật Năm học"
                : "Mở Năm học & Tự động tạo Học kỳ"}
            </h3>
            {!editingYear && (
              <p className="text-[10px] text-indigo-500 font-bold bg-indigo-50 p-2 rounded-lg">
                * Hệ thống sẽ tự động tạo 3 học kỳ: HK1 (T1-3), HK2 (T5-7), HK
                Hè (T9-12)
              </p>
            )}
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] ml-1">
                  Tên năm học
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: 2023-2024"
                  className="w-full mt-1 px-5 py-3 bg-gray-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-gray-700"
                  value={newYear.TenNamHoc}
                  onChange={(e) =>
                    setNewYear({ ...newYear, TenNamHoc: e.target.value })
                  }
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] ml-1">
                    Ngày bắt đầu
                  </label>
                  <input
                    type="date"
                    className="w-full mt-1 px-4 py-3 bg-gray-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-gray-700"
                    value={newYear.NgayBatDau}
                    onChange={(e) =>
                      setNewYear({ ...newYear, NgayBatDau: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] ml-1">
                    Ngày kết thúc
                  </label>
                  <input
                    type="date"
                    className="w-full mt-1 px-4 py-3 bg-gray-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-gray-700"
                    value={newYear.NgayKetThuc}
                    onChange={(e) =>
                      setNewYear({ ...newYear, NgayKetThuc: e.target.value })
                    }
                    required
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowAddYear(false)}
                className="flex-1 py-3 text-sm font-bold text-gray-400 hover:text-gray-600 transition-colors"
              >
                Hủy bỏ
              </button>
              <button className="flex-[2] bg-indigo-600 text-white py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all">
                {editingYear ? "Cập nhật ngay" : "Lưu năm học"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Thêm Học Kỳ */}
      {showAddSemester && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-[100] animate-fadeIn">
          <form
            onSubmit={handleAddSemester}
            className="bg-white p-8 rounded-[2.5rem] w-full max-w-md space-y-6 shadow-2xl border border-gray-100"
          >
            <h3 className="text-xl font-black text-gray-900">
              {editingSemester ? "Cập nhật Học kỳ" : "Thêm Học kỳ mới"}
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] ml-1">
                    Năm học
                  </label>
                  <select
                    className="w-full mt-1 px-4 py-3 bg-gray-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-gray-700"
                    value={newSemester.NamHocID}
                    onChange={(e) =>
                      setNewSemester({
                        ...newSemester,
                        NamHocID: e.target.value,
                      })
                    }
                    required
                  >
                    <option value="">Chọn năm...</option>
                    {namHocs.map((y) => (
                      <option key={y.NamHocID} value={y.NamHocID}>
                        {y.TenNamHoc}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] ml-1">
                    Loại HK
                  </label>
                  <select
                    className="w-full mt-1 px-4 py-3 bg-gray-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-gray-700"
                    value={newSemester.LoaiHocKy}
                    onChange={(e) =>
                      setNewSemester({
                        ...newSemester,
                        LoaiHocKy: e.target.value,
                      })
                    }
                    required
                  >
                    <option value="">Chọn...</option>
                    <option value="HK1">Học kỳ 1</option>
                    <option value="HK2">Học kỳ 2</option>
                    <option value="He">Học kỳ Hè</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] ml-1">
                  Tên hiển thị
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Học kỳ 1"
                  className="w-full mt-1 px-5 py-3 bg-gray-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-gray-700"
                  value={newSemester.TenHocKy}
                  onChange={(e) =>
                    setNewSemester({ ...newSemester, TenHocKy: e.target.value })
                  }
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="date"
                  className="px-4 py-3 bg-gray-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-gray-700 text-sm"
                  value={newSemester.NgayBatDau}
                  onChange={(e) =>
                    setNewSemester({
                      ...newSemester,
                      NgayBatDau: e.target.value,
                    })
                  }
                  required
                />
                <input
                  type="date"
                  className="px-4 py-3 bg-gray-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-gray-700 text-sm"
                  value={newSemester.NgayKetThuc}
                  onChange={(e) =>
                    setNewSemester({
                      ...newSemester,
                      NgayKetThuc: e.target.value,
                    })
                  }
                  required
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowAddSemester(false)}
                className="flex-1 py-3 text-sm font-bold text-gray-400 hover:text-gray-600 transition-colors"
              >
                Hủy bỏ
              </button>
              <button className="flex-[2] bg-indigo-600 text-white py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all">
                Lưu học kỳ
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Years Display Grid */}
      <div className="space-y-6">
        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center ml-2">
          <CalendarIcon size={14} className="mr-2 text-indigo-400" /> Danh sách
          năm học hệ thống
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {namHocs.map((y) => (
            <div
              key={y.NamHocID}
              className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm group hover:border-indigo-100 transition-all relative overflow-hidden"
            >
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                    <Clock size={20} />
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleEditYear(y)}
                      className="p-2 bg-gray-50 text-gray-400 hover:text-indigo-600 rounded-xl transition-all"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() =>
                        setConfirmConfig({
                          isOpen: true,
                          id: y.NamHocID,
                          type: "year",
                        })
                      }
                      className="p-2 bg-gray-50 text-gray-400 hover:text-rose-500 rounded-xl transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <h4 className="text-xl font-black text-gray-900 tracking-tight mb-2 uppercase">
                  {y.TenNamHoc}
                </h4>
                <div className="mb-3">
                  {renderStatusBadge(y.TrangThaiCode, y.TrangThaiHienTai)}
                </div>
                <div className="flex items-center gap-2 text-[10px] font-black text-indigo-400 uppercase tracking-tighter">
                  <span>
                    {formatDateForInput(y.NgayBatDau || y.ngay_bat_dau)}
                  </span>
                  <ArrowRight size={10} />
                  <span>
                    {formatDateForInput(y.NgayKetThuc || y.ngay_ket_thuc)}
                  </span>
                </div>
              </div>
              <div className="absolute -bottom-4 -right-4 w-16 h-16 bg-indigo-50/50 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          ))}
        </div>
      </div>

      {/* Semesters Table Section */}
      <div className="space-y-6 pt-4">
        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center ml-2">
          <Clock size={14} className="mr-2 text-indigo-400" /> Chi tiết các học
          kỳ
        </h3>
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50/50 text-gray-400 text-[11px] uppercase font-bold tracking-[0.15em] border-b border-gray-100">
                <tr>
                  <th className="px-8 py-5">Năm học</th>
                  <th className="px-6 py-5">Tên học kỳ</th>
                  <th className="px-6 py-5 text-center">Trạng thái</th>
                  <th className="px-6 py-5 text-center">Bắt đầu</th>
                  <th className="px-6 py-5 text-center">Kết thúc</th>
                  <th className="px-8 py-5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="px-8 py-20 text-center">
                      <div className="inline-block w-8 h-8 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
                    </td>
                  </tr>
                ) : hocKys.length === 0 ? (
                  <tr>
                    <td
                      colSpan="5"
                      className="px-8 py-20 text-center text-gray-400 italic"
                    >
                      Hệ thống chưa có dữ liệu học kỳ
                    </td>
                  </tr>
                ) : (
                  hocKys.map((hk) => (
                    <tr
                      key={hk.HocKyID}
                      className="hover:bg-gray-50/50 transition-all group"
                    >
                      <td className="px-8 py-5">
                        <span className="text-sm font-black text-gray-900 uppercase">
                          {hk.nam_hoc?.TenNamHoc}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <span
                            className={`w-2 h-2 rounded-full ${hk.LoaiHocKy === "He" ? "bg-amber-400" : "bg-indigo-400"}`}
                          />
                          <span className="text-sm font-bold text-gray-700">
                            {hk.TenHocKy}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-center">
                        {renderStatusBadge(
                          hk.TrangThaiCode,
                          hk.TrangThaiHienTai,
                        )}
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className="text-xs font-bold text-gray-500 bg-gray-100/50 px-3 py-1 rounded-lg">
                          {formatDateForInput(hk.NgayBatDau || hk.ngay_bat_dau)}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className="text-xs font-bold text-gray-500 bg-gray-100/50 px-3 py-1 rounded-lg">
                          {formatDateForInput(
                            hk.NgayKetThuc || hk.ngay_ket_thuc,
                          )}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleEditSemester(hk)}
                            className="p-2.5 bg-gray-50 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() =>
                              setConfirmConfig({
                                isOpen: true,
                                id: hk.HocKyID,
                                type: "semester",
                              })
                            }
                            className="p-2.5 bg-gray-50 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        onClose={() => setConfirmConfig({ isOpen: false, id: null, type: "" })}
        onConfirm={() =>
          confirmConfig.type === "year"
            ? handleDeleteYear(confirmConfig.id)
            : handleDeleteSemester(confirmConfig.id)
        }
        title={confirmConfig.type === "year" ? "Xóa năm học" : "Xóa học kỳ"}
        message={
          confirmConfig.type === "year"
            ? "Bạn có chắc chắn muốn xóa năm học này? Tất cả học kỳ thuộc năm học này phải được xóa trước."
            : "Bạn có chắc chắn muốn xóa học kỳ này? Hệ thống sẽ kiểm tra các dữ liệu liên quan trước khi xóa."
        }
      />
    </div>
  );
};

export default NamHocHocKy;
