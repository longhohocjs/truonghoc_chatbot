import React, { useState, useEffect, useMemo } from "react";
import axiosClient from "@/api/axios";
import toast from "react-hot-toast";
import ChuongTrinhImportModal from "./ChuongTrinhImportModal";
import ChuongTrinhDaoTaoModal from "./ChuongTrinhDaoTaoModal";
import ConfirmModal from "@/components/ConfirmModal";
import {
  GraduationCap,
  Plus,
  Search,
  Filter,
  Layers,
  Pencil,
  Trash2,
  Building2,
  BookOpenCheck,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
} from "lucide-react";

const ChuongTrinhDaoTaoManager = () => {
  const [programs, setPrograms] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [allMajors, setAllMajors] = useState([]); // New state for all majors
  const [majors, setMajors] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState({
    isOpen: false,
    nganhId: null,
  });
  const [editingItem, setEditingItem] = useState(null);
  const [filters, setFilters] = useState({
    KhoaID: "",
    NganhID: "",
    HocKyGoiY: "",
    search: "",
    per_page: 10, // Thiết lập 10 môn/trang để thấy nút chuyển trang khi có 15 môn
    page: 1,
  });
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    total: 0,
  });

  const [formData, setFormData] = useState({
    NganhID: "",
    MonHocID: "",
    KhoaID: "", // Add KhoaID to formData for modal
    HocKyGoiY: 1,
    BatBuoc: true,
    KhoiKienThuc: "DaiCuong",
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchPrograms();
  }, [filters]);

  const fetchInitialData = async () => {
    try {
      const [resKhoa, resMon, resAllNganh] = await Promise.all([
        // Fetch all majors
        axiosClient.post("/admin/khoa/list"),
        axiosClient.post("/admin/mon-hoc/list"),
        axiosClient.get("/admin/nganh/list"), // Assuming this endpoint exists
      ]);
      setFaculties(resKhoa.data || resKhoa || []);
      setSubjects(resMon.data || resMon || []);
      setAllMajors(resAllNganh.data?.data || resAllNganh.data || []); // Store all majors, assuming res.data.data
    } catch (error) {
      console.error("Lỗi tải dữ liệu ban đầu:", error);
    }
  };

  const fetchPrograms = async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get("/admin/chuong-trinh-dao-tao", {
        params: filters,
      });

      // res.data là đối tượng Paginate từ Laravel (do Controller bọc trong key 'data')
      const result = res.data;

      if (result && result.data && Array.isArray(result.data)) {
        // Cấu trúc phân trang chuẩn của Laravel
        setPrograms(result.data);
        setPagination({
          current_page: result.current_page || 1,
          last_page: result.last_page || 1,
          total: result.total || 0,
        });
      } else {
        // Trường hợp fallback nếu API trả về mảng không phân trang
        const dataArray = Array.isArray(result) ? result : [];
        setPrograms(dataArray);
        setPagination({
          current_page: 1,
          last_page: 1,
          total: dataArray.length,
        });
      }
    } catch (error) {
      toast.error("Không thể tải danh sách chương trình đào tạo");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAllByNganh = async () => {
    const nganhId = confirmDeleteAll.nganhId;
    if (!nganhId) return;

    try {
      await axiosClient.delete(`/admin/chuong-trinh-dao-tao/nganh/${nganhId}`);
      toast.success("Đã xóa toàn bộ chương trình đào tạo của ngành thành công");
      setConfirmDeleteAll({ isOpen: false, nganhId: null });
      fetchPrograms();
    } catch (error) {
      toast.error(error.response?.data?.message || "Lỗi khi xóa dữ liệu");
    }
  };

  const handleFacultyChange = async (khoaId) => {
    // This function is for the filter dropdown, so it should filter `majors` based on `KhoaID`
    setFilters({ ...filters, KhoaID: khoaId, NganhID: "" }); // Reset NganhID when KhoaID changes
    if (khoaId) {
      setMajors(allMajors.filter((major) => major.KhoaID == khoaId));
    } else {
      setMajors(allMajors); // Show all majors if no faculty filter is selected
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      NganhID: item.NganhID,
      MonHocID: item.MonHocID,
      HocKyGoiY: item.HocKyGoiY,
      KhoaID: item.nganh_dao_tao?.KhoaID || "", // Set KhoaID for editing
      BatBuoc: item.BatBuoc,
      KhoiKienThuc: item.KhoiKienThuc || "DaiCuong",
    });
    setShowModal(true);
  };

  // Hàm tạo dải số trang hiển thị (Logic rút gọn số trang)
  const getPageNumbers = () => {
    const { current_page, last_page } = pagination;
    const pages = [];
    const delta = 2; // Số lượng trang hiển thị xung quanh trang hiện tại

    for (let i = 1; i <= last_page; i++) {
      if (
        i === 1 ||
        i === last_page ||
        (i >= current_page - delta && i <= current_page + delta)
      ) {
        pages.push(i);
      } else if (
        (i === current_page - delta - 1 && i > 1) ||
        (i === current_page + delta + 1 && i < last_page)
      ) {
        pages.push("...");
      }
    }
    // Loại bỏ các dấu ... trùng lặp nếu có
    return pages.filter((item, index) => pages.indexOf(item) === index);
  };

  // Phân tích và nhóm dữ liệu theo khối kiến thức
  const groupedPrograms = useMemo(() => {
    const groups = {
      DaiCuong: {
        label: "1. Khối Đại cương",
        items: [],
        credits: 0,
        color: "blue",
      },
      CoSoNganh: {
        label: "2. Khối Cơ sở ngành",
        items: [],
        credits: 0,
        color: "indigo",
      },
      ChuyenNganh: {
        label: "3. Khối Chuyên ngành",
        items: [],
        credits: 0,
        color: "purple",
      },
      TotNghiep: {
        label: "4. Khối Tốt nghiệp",
        items: [],
        credits: 0,
        color: "emerald",
      },
      ChuanDauRa: {
        label: "5. Chuẩn đầu ra",
        items: [],
        credits: 0,
        color: "amber",
      },
    };

    programs.forEach((item) => {
      // Đảm bảo nhận diện được cả PascalCase và snake_case từ API
      const key = item.KhoiKienThuc || item.khoi_kien_thuc || "DaiCuong";
      if (groups[key]) {
        groups[key].items.push(item);
        groups[key].credits += Number(item.mon_hoc?.SoTinChi || 0);
      }
    });
    return groups;
  }, [programs]);

  const handleSaveManual = async (formData) => {
    try {
      if (editingItem) {
        await axiosClient.patch("/admin/chuong-trinh-dao-tao", {
          ID: editingItem.ID,
          HocKyGoiY: formData.HocKyGoiY,
          BatBuoc: formData.BatBuoc,
          KhoiKienThuc: formData.KhoiKienThuc,
        });
        toast.success("Cập nhật thành công");
      } else {
        // Sử dụng endpoint gan-nhieu-mon để hỗ trợ chọn nhiều
        await axiosClient.post("/admin/chuong-trinh-dao-tao/gan-nhieu-mon", {
          NganhID: formData.NganhID,
          MonHocIDs: formData.MonHocIDs,
          HocKyGoiY: formData.HocKyGoiY,
          BatBuoc: formData.BatBuoc,
          KhoiKienThuc: formData.KhoiKienThuc,
        });
        toast.success(`Đã thêm thành công vào CTĐT`);
      }
      setShowModal(false);
      fetchPrograms();
    } catch (error) {
      toast.error(error.response?.data?.message || "Lỗi khi lưu dữ liệu");
    }
  };

  const handleDelete = async (id) => {
    if (
      !window.confirm(
        "Bạn có chắc chắn muốn xóa môn học này khỏi chương trình đào tạo?",
      )
    )
      return;
    try {
      await axiosClient.delete(`/admin/chuong-trinh-dao-tao/${id}`);
      toast.success("Xóa môn học khỏi chương trình thành công");
      fetchPrograms();
    } catch (error) {
      toast.error(error.response?.data?.message || "Lỗi khi xóa dữ liệu");
    }
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
              <GraduationCap size={32} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                Chương trình đào tạo
              </h2>
              <p className="text-gray-500 text-sm font-medium">
                Quản lý khung chương trình, lộ trình học tập và định hướng ngành
                nghề
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100 active:scale-95"
            >
              <FileSpreadsheet size={18} /> Import Excel
            </button>

            {filters.NganhID && (
              <button
                onClick={() =>
                  setConfirmDeleteAll({
                    isOpen: true,
                    nganhId: filters.NganhID,
                  })
                }
                className="flex items-center gap-2 bg-rose-600 text-white px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-rose-700 transition-all shadow-xl shadow-rose-100 active:scale-95"
              >
                <Trash2 size={18} /> Xóa sạch CTĐT
              </button>
            )}

            <button
              onClick={() => {
                setEditingItem(null);
                setShowModal(true);
              }}
              className="flex items-center gap-2 bg-gray-900 text-white px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-xl shadow-gray-200 active:scale-95"
            >
              <Plus size={18} /> Thêm môn vào CTĐT
            </button>
          </div>
        </div>
      </div>

      {/* Khung chương trình đào tạo - Tổng quan tín chỉ */}
      {filters.NganhID && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Object.entries(groupedPrograms).map(([key, group]) => (
            <div
              key={key}
              className={`bg-white p-4 rounded-3xl border border-${group.color}-100 shadow-sm`}
            >
              <p
                className={`text-[10px] font-black text-${group.color}-500 uppercase tracking-widest mb-1`}
              >
                {group.label.split(". ")[1]}
              </p>
              <div className="flex items-end gap-1">
                <span className="text-xl font-black text-gray-900">
                  {group.credits}
                </span>
                <span className="text-[10px] font-bold text-gray-400 pb-1 uppercase">
                  Tín chỉ
                </span>
              </div>
              <div className="w-full h-1 bg-gray-50 rounded-full mt-2 overflow-hidden">
                <div
                  className={`h-full bg-${group.color}-500`}
                  style={{ width: `${(group.credits / 150) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bộ lọc */}
      <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full lg:flex-1">
          <div className="relative">
            <Building2
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              size={16}
            />
            <select
              className="w-full pl-11 pr-4 py-3.5 bg-white border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm font-bold text-gray-600 appearance-none shadow-sm"
              value={filters.KhoaID}
              onChange={(e) => handleFacultyChange(e.target.value)}
            >
              <option value="">Tất cả Khoa</option>
              {faculties.map((f) => (
                <option key={f.KhoaID} value={f.KhoaID}>
                  {f.TenKhoa}
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <Filter
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              size={16}
            />
            <select
              className="w-full pl-11 pr-4 py-3.5 bg-white border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm font-bold text-gray-600 appearance-none shadow-sm"
              value={filters.NganhID}
              onChange={(e) =>
                setFilters({ ...filters, NganhID: e.target.value, page: 1 })
              }
            >
              <option value="">Tất cả Ngành</option>
              {majors.map((m) => (
                <option key={m.NganhID} value={m.NganhID}>
                  {m.TenNganh}
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <BookOpenCheck
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              size={16}
            />
            <select
              className="w-full pl-11 pr-4 py-3.5 bg-white border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm font-bold text-gray-600 appearance-none shadow-sm"
              value={filters.HocKyGoiY}
              onChange={(e) =>
                setFilters({ ...filters, HocKyGoiY: e.target.value, page: 1 })
              }
            >
              <option value="">Học kỳ gợi ý</option>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((hk) => (
                <option key={hk} value={hk}>
                  Học kỳ {hk}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="relative w-full lg:w-80">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
            size={18}
          />
          <input
            type="text"
            placeholder="Tìm tên, mã môn học..."
            className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium shadow-sm"
            value={filters.search}
            onChange={(e) =>
              setFilters({ ...filters, search: e.target.value, page: 1 })
            }
          />
        </div>
      </div>

      {/* Bảng dữ liệu */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50/50 text-gray-400 text-[10px] uppercase font-bold tracking-[0.15em] border-b border-gray-100">
              <tr>
                <th className="px-8 py-5">Ngành đào tạo</th>
                <th className="px-6 py-5">Môn học</th>
                <th className="px-6 py-5 text-center">Tín chỉ</th>
                <th className="px-6 py-5 text-center">HK Gợi ý</th>
                <th className="px-6 py-5 text-center">Tính chất</th>
                <th className="px-8 py-5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {Object.entries(groupedPrograms).map(([key, group]) => (
                <React.Fragment key={key}>
                  {group.items.length > 0 && (
                    <tr className={`bg-${group.color}-50/30`}>
                      <td colSpan="6" className="px-8 py-3">
                        <div className="flex items-center gap-2">
                          <Layers
                            size={14}
                            className={`text-${group.color}-500`}
                          />
                          <span
                            className={`text-[11px] font-black uppercase text-${group.color}-600 tracking-widest`}
                          >
                            {group.label} ({group.credits} tín chỉ)
                          </span>
                        </div>
                      </td>
                    </tr>
                  )}
                  {group.items.map((item) => (
                    <tr
                      key={item.ID}
                      className="hover:bg-gray-50/50 transition-all group"
                    >
                      {/* ... (giữ nguyên cấu trúc td của bạn) ... */}
                      <td className="px-8 py-5">
                        <p className="text-sm font-black text-gray-900">
                          {item.nganh_dao_tao?.TenNganh}
                        </p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">
                          {item.nganh_dao_tao?.khoa?.TenKhoa}
                        </p>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-indigo-600">
                            {item.mon_hoc?.TenMon}
                          </span>
                          <span className="text-[10px] text-gray-400 font-black">
                            {item.mon_hoc?.MaMon}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className="text-xs font-bold text-gray-600 bg-gray-100 px-2.5 py-1 rounded-lg">
                          {item.mon_hoc?.SoTinChi} TC
                        </span>
                      </td>
                      <td className="px-6 py-5 text-center font-black text-gray-700 text-sm">
                        {item.HocKyGoiY}
                      </td>
                      <td className="px-6 py-5 text-center">
                        <StatusBadge active={item.BatBuoc} />
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleEdit(item)}
                            className="p-2.5 bg-white text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all shadow-sm border border-gray-100"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(item.ID)}
                            className="p-2.5 bg-white text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all shadow-sm border border-gray-100"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* Phân trang UI */}
        {!loading && pagination.last_page > 1 && (
          <div className="px-8 py-6 bg-white border-t border-gray-100 flex flex-col sm:row justify-between items-center gap-4">
            <div className="text-xs font-black text-gray-400 uppercase tracking-widest">
              Trang{" "}
              <span className="text-indigo-600">{pagination.current_page}</span>{" "}
              / {pagination.last_page}
              <span className="ml-2 text-gray-300">
                ({pagination.total} môn học)
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {/* Nút Về trang đầu */}
              <button
                disabled={pagination.current_page === 1}
                onClick={() => setFilters({ ...filters, page: 1 })}
                className="p-2.5 rounded-xl border border-gray-100 bg-white text-gray-400 hover:text-indigo-600 disabled:opacity-30 transition-all"
                title="Trang đầu"
              >
                <span className="text-xs font-bold font-serif">«</span>
              </button>

              <button
                disabled={pagination.current_page === 1}
                onClick={() =>
                  setFilters({
                    ...filters,
                    page: pagination.current_page - 1,
                  })
                }
                className="px-4 py-2 rounded-xl border border-gray-100 bg-white text-xs font-black uppercase tracking-widest text-gray-400 hover:text-indigo-600 disabled:opacity-30 transition-all"
              >
                <ChevronLeft size={16} className="inline mr-1" /> Trước
              </button>

              {getPageNumbers().map((page, index) =>
                page === "..." ? (
                  <span
                    key={`dots-${index}`}
                    className="px-2 text-gray-300 font-bold"
                  >
                    ...
                  </span>
                ) : (
                  <button
                    key={`page-${page}`}
                    onClick={() => setFilters({ ...filters, page: page })}
                    className={`w-10 h-10 rounded-xl text-xs font-black transition-all ${
                      pagination.current_page === page
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100"
                        : "bg-white text-gray-400 border-gray-100 hover:bg-indigo-50 hover:text-indigo-600"
                    }`}
                  >
                    {page}
                  </button>
                ),
              )}

              <button
                disabled={pagination.current_page === pagination.last_page}
                onClick={() =>
                  setFilters({
                    ...filters,
                    page: pagination.current_page + 1,
                  })
                }
                className="px-4 py-2 rounded-xl border border-gray-100 bg-white text-xs font-black uppercase tracking-widest text-gray-400 hover:text-indigo-600 disabled:opacity-30 transition-all"
              >
                Sau <ChevronRight size={16} className="inline ml-1" />
              </button>

              {/* Nút Tới trang cuối */}
              <button
                disabled={pagination.current_page === pagination.last_page}
                onClick={() =>
                  setFilters({ ...filters, page: pagination.last_page })
                }
                className="p-2.5 rounded-xl border border-gray-100 bg-white text-gray-400 hover:text-indigo-600 disabled:opacity-30 transition-all"
                title="Trang cuối"
              >
                <span className="text-xs font-bold font-serif">»</span>
              </button>
            </div>
          </div>
        )}
      </div>

      <ChuongTrinhDaoTaoModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleSaveManual}
        editingItem={editingItem}
        faculties={faculties}
        allMajors={allMajors}
        subjects={subjects}
      />

      <ChuongTrinhImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={() => {
          setShowImportModal(false);
          fetchPrograms();
        }}
        nganhs={allMajors}
      />

      <ConfirmModal
        isOpen={confirmDeleteAll.isOpen}
        onClose={() => setConfirmDeleteAll({ isOpen: false, nganhId: null })}
        onConfirm={handleDeleteAllByNganh}
        title="Xóa toàn bộ chương trình đào tạo"
        message="Hành động này sẽ xóa sạch các môn học trong chương trình đào tạo của ngành này. Bạn có chắc chắn muốn tiếp tục?"
      />
    </div>
  );
};

const StatusBadge = ({ active }) => (
  <div
    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border ${
      active
        ? "bg-rose-50 text-rose-600 border-rose-100"
        : "bg-gray-50 text-gray-500 border-gray-100"
    }`}
  >
    <div
      className={`w-1.5 h-1.5 rounded-full ${active ? "bg-rose-500" : "bg-gray-400"}`}
    />
    <span className="text-[10px] font-black uppercase tracking-tight">
      {active ? "Bắt buộc" : "Tự chọn"}
    </span>
  </div>
);

export default ChuongTrinhDaoTaoManager;
