import React, { useState, useEffect } from "react";
import axiosClient from "@/api/axios";
import toast from "react-hot-toast";
import ConfirmModal from "@/components/ConfirmModal";
import {
  Timer,
  Filter,
  Plus,
  Calendar,
  BookOpen,
  Pencil,
  Trash2,
  ShieldCheck,
  ShieldAlert,
  ArrowLeft,
  School,
  GraduationCap,
  Users,
} from "lucide-react";

const DotDangKyManager = () => {
  const [dots, setDots] = useState([]);
  const [hocKys, setHocKys] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState({ HocKyID: "" }); // Filter cho danh sách đợt đăng ký

  const [showModal, setShowModal] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({
    isOpen: false,
    id: null,
  });
  const [formData, setFormData] = useState({
    TenDot: "",
    HocKyID: "",
    NgayBatDau: "",
    NgayKetThuc: "",
    TrangThai: 1,
  });

  // States cho phần xem danh sách lớp học phần theo đợt
  const [selectedDot, setSelectedDot] = useState(null); // Đợt đăng ký đang được chọn để xem học phần
  const [lopHocPhans, setLopHocPhans] = useState([]);
  const [khoas, setKhoas] = useState([]);
  const [nganhs, setNganhs] = useState([]);
  const [selectedKhoaId, setSelectedKhoaId] = useState("");
  const [selectedNganhId, setSelectedNganhId] = useState("");
  const [loadingLopHocPhans, setLoadingLopHocPhans] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const [resHk, resKhoa, resNganh] = await Promise.all([
          axiosClient.get("/admin/hoc-ky"),
          axiosClient.post("/admin/khoa/list"), // Lấy tất cả khoa
          axiosClient.get("/admin/nganh/list"), // Lấy tất cả ngành
        ]);
        setHocKys(resHk.data || []);
        setKhoas(resKhoa.data || []);
        setNganhs(resNganh.data || []);
      } catch (error) {
        toast.error("Lỗi khi tải dữ liệu ban đầu.");
        console.error(error);
      }
    };
    init();
  }, []);

  const fetchDots = async () => {
    setLoading(true);
    try {
      const res = await axiosClient.post("/admin/dot-dang-ky/filter", filter);
      setDots(res.data || []);
    } catch (error) {
      toast.error("Lỗi khi tải danh sách đợt đăng ký");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDots();
  }, [filter.HocKyID]);

  // Hàm lấy danh sách lớp học phần của đợt đã chọn
  const fetchLopHocPhans = async () => {
    if (!selectedDot) return;
    setLoadingLopHocPhans(true);
    try {
      const res = await axiosClient.post(
        "/admin/dot-dang-ky/lop-hoc-phan-list",
        {
          DotDangKyID: selectedDot.DotDangKyID,
          KhoaID: selectedKhoaId || null,
          NganhID: selectedNganhId || null,
        },
      );
      setLopHocPhans(res.data || []);
    } catch (error) {
      toast.error("Lỗi khi tải danh sách lớp học phần.");
    } finally {
      setLoadingLopHocPhans(false);
    }
  };

  useEffect(() => {
    if (selectedDot) {
      fetchLopHocPhans();
    } else {
      setLopHocPhans([]); // Xóa danh sách khi không có đợt nào được chọn
    }
  }, [selectedDot, selectedKhoaId, selectedNganhId]);

  const handleToggleStatus = async (dot) => {
    try {
      await axiosClient.put("/admin/dot-dang-ky/doi-trang-thai", {
        DotDangKyID: dot.DotDangKyID,
        TrangThai: dot.TrangThai === 1 ? 0 : 1,
      });
      toast.success("Cập nhật trạng thái thành công");
      fetchDots();
    } catch (error) {
      toast.error("Không thể thay đổi trạng thái");
    }
  };

  const handleDelete = async (id) => {
    try {
      await axiosClient.delete(`/admin/dot-dang-ky/${id}`);
      toast.success("Xóa đợt đăng ký thành công");
      fetchDots();
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể xóa đợt đăng ký");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (formData.DotDangKyID) {
        await axiosClient.put("/admin/dot-dang-ky/cap-nhat", formData);
        toast.success("Cập nhật thành công");
      } else {
        await axiosClient.post("/admin/dot-dang-ky", formData);
        toast.success("Tạo đợt đăng ký mới thành công");
      }
      setShowModal(false);
      fetchDots();
    } catch (error) {
      toast.error(error.response?.data?.message || "Lỗi xử lý dữ liệu");
    }
  };

  if (selectedDot) {
    // Hiển thị giao diện xem lớp học phần
    return (
      <div className="max-w-6xl mx-auto space-y-8 animate-fadeIn pb-10">
        {/* Sub-Header for Course View */}
        <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-50/40 rounded-full -mr-20 -mt-20 blur-3xl" />
          <div className="relative flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-6">
              <div className="p-4 bg-emerald-500 rounded-3xl text-white shadow-lg shadow-emerald-100">
                <BookOpen size={32} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                  Danh sách Lớp học phần
                </h2>
                <p className="text-gray-500 text-sm font-medium">
                  Đợt:{" "}
                  <span className="text-emerald-600 font-bold">
                    {selectedDot.TenDot}
                  </span>
                </p>
              </div>
            </div>
            <button
              onClick={() => setSelectedDot(null)}
              className="flex items-center gap-2 bg-gray-900 text-white px-6 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-gray-800 transition-all active:scale-95"
            >
              <ArrowLeft size={16} /> Quay lại danh sách
            </button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 text-gray-400">
            <Filter size={18} />
            <span className="text-[10px] font-black uppercase tracking-widest">
              Bộ lọc học phần
            </span>
          </div>

          <button className="bg-white border border-gray-100 px-4 py-3.5 rounded-2xl outline-none text-sm font-bold text-gray-600 focus:ring-2 focus:ring-indigo-500/20 cursor-pointer">
            Xuất danh sách đợt
          </button>
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex gap-4">
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 w-full bg-gray-50/50 border-b border-gray-100">
              <select
                className="bg-white border border-gray-100 px-4 py-3 rounded-xl outline-none text-sm font-bold text-gray-600 focus:ring-2 focus:ring-indigo-500/20"
                value={selectedKhoaId}
                onChange={(e) => setSelectedKhoaId(e.target.value)}
              >
                <option value="">Tất cả Khoa quản lý</option>
                {khoas.map((khoa) => (
                  <option key={khoa.KhoaID} value={khoa.KhoaID}>
                    {khoa.TenKhoa}
                  </option>
                ))}
              </select>
              <select
                className="bg-white border border-gray-100 px-4 py-3 rounded-xl outline-none text-sm font-bold text-gray-600 focus:ring-2 focus:ring-indigo-500/20"
                value={selectedNganhId}
                onChange={(e) => setSelectedNganhId(e.target.value)}
              >
                <option value="">Tất cả Ngành đào tạo</option>
                {nganhs
                  .filter(
                    (nganh) =>
                      !selectedKhoaId || nganh.KhoaID == selectedKhoaId,
                  )
                  .map((nganh) => (
                    <option key={nganh.NganhID} value={nganh.NganhID}>
                      {nganh.TenNganh}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50/50 text-gray-400 text-[10px] uppercase font-bold tracking-[0.15em] border-b border-gray-100">
                <tr>
                  <th className="px-8 py-5">Mã Lớp HP</th>
                  <th className="px-6 py-5">Môn học</th>
                  <th className="px-6 py-5">Giảng viên</th>
                  <th className="px-6 py-5 text-center">Sĩ số</th>
                  <th className="px-8 py-5 text-right">Lịch trình</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loadingLopHocPhans ? (
                  <tr>
                    <td colSpan="5" className="px-8 py-20 text-center">
                      <div className="inline-block w-8 h-8 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
                    </td>
                  </tr>
                ) : lopHocPhans.length === 0 ? (
                  <tr>
                    <td
                      colSpan="5"
                      className="px-8 py-20 text-center text-gray-400 font-medium italic"
                    >
                      Không tìm thấy lớp học phần nào
                    </td>
                  </tr>
                ) : (
                  lopHocPhans.map((lop) => (
                    <tr
                      key={lop.LopHocPhanID}
                      className="hover:bg-gray-50/50 transition-all group"
                    >
                      <td className="px-8 py-5">
                        <div className="flex flex-col gap-1">
                          <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg w-fit">
                            {lop.MaLopHP}
                          </span>
                          {new Date() > new Date(selectedDot.NgayKetThuc) &&
                            (lop.dang_ky_hoc_phan_count || 0) <
                              lop.SoLuongToiDa * 0.5 && (
                              <span
                                title="Không thể mở lớp học phần vì không đủ số lượng sinh viên (Dưới 50%)"
                                className="flex items-center gap-1 text-[8px] font-black text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100 uppercase w-fit animate-pulse"
                              >
                                <ShieldAlert size={8} /> Không đủ SL mở lớp
                              </span>
                            )}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <p className="text-sm font-black text-gray-900">
                          {lop.mon_hoc?.TenMon || "N/A"}
                        </p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase">
                          {lop.mon_hoc?.SoTinChi} tín chỉ
                        </p>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-[10px] text-gray-500 font-black">
                            {lop.giang_vien?.HoTen?.charAt(0) || "?"}
                          </div>
                          <span className="text-xs font-bold text-gray-600">
                            {lop.giang_vien?.HoTen || "Chưa phân công"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span
                            className={`text-xs font-black ${
                              new Date() > new Date(selectedDot.NgayKetThuc) &&
                              (lop.dang_ky_hoc_phan_count || 0) <
                                lop.SoLuongToiDa * 0.5
                                ? "text-rose-600"
                                : "text-gray-800"
                            }`}
                          >
                            {lop.dang_ky_hoc_phan_count || 0}/{lop.SoLuongToiDa}
                          </span>
                          <div className="w-16 h-1 bg-gray-100 rounded-full mt-1 overflow-hidden">
                            <div
                              className={`h-full ${
                                new Date() >
                                  new Date(selectedDot.NgayKetThuc) &&
                                (lop.dang_ky_hoc_phan_count || 0) <
                                  lop.SoLuongToiDa * 0.5
                                  ? "bg-rose-500"
                                  : "bg-indigo-500"
                              }`}
                              style={{
                                width: `${Math.min(100, ((lop.dang_ky_hoc_phan_count || 0) / lop.SoLuongToiDa) * 100)}%`,
                              }}
                            />
                          </div>
                          {new Date() > new Date(selectedDot.NgayKetThuc) &&
                            (lop.dang_ky_hoc_phan_count || 0) <
                              lop.SoLuongToiDa * 0.5 && (
                              <span className="text-[7px] font-black text-rose-500 uppercase mt-1 text-center leading-tight">
                                Dưới 50%
                              </span>
                            )}
                        </div>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">
                          Bắt đầu: {lop.NgayBatDau?.substring(0, 10)}
                        </p>
                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-tighter">
                          Kết thúc: {lop.NgayKetThuc?.substring(0, 10)}
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
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fadeIn pb-10">
      {/* Unified Header */}
      <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-50/40 rounded-full -mr-20 -mt-20 blur-3xl" />
        <div className="absolute bottom-0 left-20 w-40 h-40 bg-blue-50/30 rounded-full -mb-10 blur-2xl" />

        <div className="relative flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-6">
            <div className="p-4 bg-indigo-600 rounded-3xl text-white shadow-lg shadow-indigo-100">
              <Timer size={32} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                Quản lý Đợt đăng ký
              </h2>
              <p className="text-gray-500 text-sm font-medium">
                Cấu hình thời gian và điều kiện đăng ký học phần cho sinh viên
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setFormData({
                TenDot: "",
                HocKyID: filter.HocKyID,
                NgayBatDau: "",
                NgayKetThuc: "",
                TrangThai: 1,
              });
              setShowModal(true);
            }}
            className="flex items-center gap-2 bg-gray-900 text-white px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-xl shadow-gray-200 active:scale-95"
          >
            <Plus size={18} /> Tạo Đợt đăng ký
          </button>
        </div>
      </div>

      {/* Filters Area */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-4 px-4 py-2 w-full md:w-auto">
          <Filter size={18} className="text-gray-400" />
          <select
            className="bg-transparent outline-none text-sm font-bold text-gray-600 cursor-pointer"
            onChange={(e) => setFilter({ ...filter, HocKyID: e.target.value })}
          >
            <option value="">Tất cả Học kỳ</option>
            {hocKys.map((hk) => (
              <option key={hk.HocKyID} value={hk.HocKyID}>
                {hk.nam_hoc?.TenNamHoc} - {hk.TenHocKy}
              </option>
            ))}
          </select>
        </div>
        <div className="hidden md:block text-[10px] font-black text-gray-300 uppercase tracking-widest px-6">
          {dots.length} đợt được tìm thấy
        </div>
      </div>

      {/* Grid of Registration Rounds */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {loading ? (
          <div className="col-span-full py-20 text-center text-gray-400 font-medium italic animate-pulse">
            Đang đồng bộ dữ liệu đợt đăng ký...
          </div>
        ) : dots.length === 0 ? (
          <div className="col-span-full py-32 bg-white rounded-[2.5rem] border border-dashed border-gray-200 text-center">
            <Timer size={48} className="mx-auto text-gray-100 mb-4" />
            <p className="text-gray-400 font-bold uppercase text-xs tracking-widest">
              Không tìm thấy đợt đăng ký nào
            </p>
          </div>
        ) : (
          dots.map((dot) => (
            <div
              key={dot.DotDangKyID}
              className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 group hover:border-indigo-100 transition-all relative overflow-hidden"
            >
              <div className="relative z-10 space-y-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">
                      {dot.hoc_ky?.TenHocKy}
                    </span>
                    <h3 className="text-xl font-black text-gray-900 tracking-tight leading-none">
                      {dot.TenDot}
                    </h3>
                  </div>
                  <StatusBadge
                    active={dot.TrangThai === 1}
                    expired={new Date() > new Date(dot.NgayKetThuc)}
                  />
                </div>

                <div className="flex items-center gap-4 py-4 border-y border-gray-50">
                  <div className="flex-1 space-y-1">
                    <p className="text-[9px] font-black text-gray-400 uppercase">
                      Ngày bắt đầu
                    </p>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700">
                      <Calendar size={14} className="text-indigo-400" />{" "}
                      {dot.NgayBatDau?.substring(0, 10)}
                    </div>
                  </div>
                  <div className="w-px h-8 bg-gray-100" />
                  <div className="flex-1 space-y-1">
                    <p className="text-[9px] font-black text-gray-400 uppercase">
                      Ngày kết thúc
                    </p>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700">
                      <Calendar size={14} className="text-rose-400" />{" "}
                      {dot.NgayKetThuc?.substring(0, 10)}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  {/* Chỉ cho phép đóng/mở thủ công nếu chưa hết thời gian quy định */}
                  {!(new Date() > new Date(dot.NgayKetThuc)) && (
                    <ActionButton
                      icon={
                        dot.TrangThai === 1 ? (
                          <ShieldAlert size={16} />
                        ) : (
                          <ShieldCheck size={16} />
                        )
                      }
                      label={dot.TrangThai === 1 ? "Đóng đợt" : "Mở đợt"}
                      onClick={() => handleToggleStatus(dot)}
                      variant={dot.TrangThai === 1 ? "danger" : "success"}
                    />
                  )}
                  <ActionButton
                    icon={<BookOpen size={16} />}
                    label="Học phần"
                    onClick={() => setSelectedDot(dot)}
                    variant="default"
                  />
                  <div className="flex-1" />
                  <button
                    onClick={() => {
                      setFormData(dot);
                      setShowModal(true);
                    }}
                    className="p-3 bg-gray-50 text-gray-400 hover:text-indigo-600 rounded-2xl transition-all"
                  >
                    <Pencil size={18} />
                  </button>
                  <button
                    onClick={() =>
                      setConfirmConfig({ isOpen: true, id: dot.DotDangKyID })
                    }
                    className="p-3 bg-gray-50 text-gray-400 hover:text-rose-500 rounded-2xl transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              {/* Decorative background blob */}
              <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-indigo-50/50 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] bg-gray-900/40 backdrop-blur-sm flex items-center justify-center animate-fadeIn p-4">
          <form
            onSubmit={handleSubmit}
            className="bg-white p-10 rounded-[2.5rem] w-full max-w-lg space-y-8 shadow-2xl border border-gray-50"
          >
            <h3 className="text-2xl font-black text-gray-900 tracking-tight">
              {formData.DotDangKyID ? "Cập nhật đợt" : "Mở đợt đăng ký mới"}
            </h3>
            <div className="space-y-5">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] ml-1">
                  Tên gọi đợt đăng ký
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Đợt 1 - Học kỳ 2"
                  className="w-full mt-1 px-5 py-3.5 bg-gray-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-gray-700"
                  value={formData.TenDot}
                  onChange={(e) =>
                    setFormData({ ...formData, TenDot: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] ml-1">
                  Áp dụng cho Học kỳ
                </label>
                <select
                  className="w-full mt-1 px-5 py-3.5 bg-gray-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-gray-700"
                  value={formData.HocKyID}
                  onChange={(e) =>
                    setFormData({ ...formData, HocKyID: e.target.value })
                  }
                  required
                >
                  <option value="">-- Chọn học kỳ áp dụng --</option>
                  {hocKys.map((hk) => (
                    <option key={hk.HocKyID} value={hk.HocKyID}>
                      {hk.nam_hoc?.TenNamHoc} - {hk.TenHocKy}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] ml-1">
                    Ngày bắt đầu
                  </label>
                  <input
                    type="datetime-local"
                    required
                    className="w-full mt-1 px-4 py-3 bg-gray-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-gray-700 text-xs"
                    value={formData.NgayBatDau.replace(" ", "T")}
                    onChange={(e) =>
                      setFormData({ ...formData, NgayBatDau: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] ml-1">
                    Ngày kết thúc
                  </label>
                  <input
                    type="datetime-local"
                    required
                    className="w-full mt-1 px-4 py-3 bg-gray-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-gray-700 text-xs"
                    value={formData.NgayKetThuc.replace(" ", "T")}
                    onChange={(e) =>
                      setFormData({ ...formData, NgayKetThuc: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="flex-1 py-4 text-sm font-bold text-gray-400 hover:text-gray-600 transition-colors uppercase tracking-widest"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="flex-[2] bg-indigo-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all"
              >
                Lưu thiết lập
              </button>
            </div>
          </form>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        onClose={() => setConfirmConfig({ isOpen: false, id: null })}
        onConfirm={() => handleDelete(confirmConfig.id)}
        title="Xóa đợt đăng ký"
        message="Bạn có chắc chắn muốn xóa đợt đăng ký này? Dữ liệu về các lớp đang mở trong đợt này có thể bị ảnh hưởng."
      />
    </div>
  );
};

const StatusBadge = ({ active, expired }) => {
  const isTrulyActive = active && !expired;

  let colorClass = "bg-rose-50 text-rose-600 border-rose-100";
  let label = "Đã đóng";

  if (expired) {
    colorClass = "bg-gray-100 text-gray-500 border-gray-200";
    label = "Hết hạn";
  } else if (active) {
    colorClass = "bg-emerald-50 text-emerald-600 border-emerald-100";
    label = "Đang mở";
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border ${colorClass}`}
    >
      <div
        className={`w-1.5 h-1.5 rounded-full ${
          isTrulyActive
            ? "bg-emerald-500 animate-pulse"
            : expired
              ? "bg-gray-400"
              : "bg-rose-500"
        }`}
      />
      <span className="text-[10px] font-black uppercase tracking-tight">
        {label}
      </span>
    </div>
  );
};

const ActionButton = ({ icon, label, onClick, variant = "default" }) => {
  const variants = {
    default: "bg-gray-50 text-gray-600 hover:bg-indigo-600 hover:text-white",
    danger: "bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white",
    success:
      "bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white",
  };

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${variants[variant]}`}
    >
      {icon}
      {label}
    </button>
  );
};

export default DotDangKyManager;
