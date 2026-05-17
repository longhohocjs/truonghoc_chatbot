import React, { useState, useEffect } from "react";
import axiosClient from "@/api/axios";
import toast from "react-hot-toast";
import MonHocModal from "./MonHocModal";
import {
  BookOpen,
  Plus,
  Search,
  Filter,
  Pencil,
  Trash2,
  Building2,
  Layers,
} from "lucide-react";

const MonHocManagement = () => {
  const [monHocs, setMonHocs] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMonHoc, setSelectedMonHoc] = useState(null);

  const [filters, setFilters] = useState({
    KhoaID: "",
    search: "",
    per_page: 10,
    page: 1,
  });

  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    total: 0,
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchData();
  }, [filters]);

  const fetchInitialData = async () => {
    try {
      const resKhoa = await axiosClient.post("/admin/khoa/list");
      setFaculties(resKhoa.data || resKhoa || []);
    } catch (error) {
      console.error("Lỗi tải danh sách khoa:", error);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await axiosClient.post("/admin/mon-hoc/list", filters);
      // response lúc này chính là object { status: 'success', data: ... }
      // do interceptor trong axios.js đã bóc tách response.data
      const result = response.data || response;

      if (result && result.data && Array.isArray(result.data)) {
        setMonHocs(result.data);
        setPagination({
          current_page: result.current_page || 1,
          last_page: result.last_page || 1,
          total: result.total || 0,
        });
      } else {
        const dataArray = Array.isArray(result) ? result : [];
        setMonHocs(dataArray);
        setPagination({
          current_page: 1,
          last_page: 1,
          total: dataArray.length,
        });
      }
    } catch (error) {
      console.error("Lỗi khi tải danh sách môn học:", error);
      toast.error("Không thể tải danh sách môn học");
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setSelectedMonHoc(null);
    setIsModalOpen(true);
  };

  const handleEdit = (monHoc) => {
    setSelectedMonHoc(monHoc);
    setIsModalOpen(true);
  };

  const handleSave = async (data) => {
    try {
      if (selectedMonHoc) {
        await axiosClient.patch("/admin/mon-hoc", {
          ...data,
          MonHocID: selectedMonHoc.MonHocID,
        });
        toast.success("Cập nhật môn học thành công");
      } else {
        await axiosClient.post("/admin/mon-hoc", data);
        toast.success("Thêm môn học thành công");
      }

      setIsModalOpen(false);
      // Reset bộ lọc về trang 1 và xóa tìm kiếm để thấy ngay môn vừa thêm (vì sắp xếp DESC)
      setFilters({
        ...filters,
        KhoaID: "",
        search: "",
        page: 1,
      });
    } catch (error) {
      toast.error(error.response?.data?.message || "Lỗi khi lưu môn học");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa môn học này?")) return;
    try {
      await axiosClient.delete(`/admin/mon-hoc/${id}`);
      toast.success("Xóa môn học thành công");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Lỗi khi xóa môn học");
    }
  };

  const getPageNumbers = () => {
    const { current_page, last_page } = pagination;
    const pages = [];
    const delta = 2;

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
    return pages.filter((item, index) => pages.indexOf(item) === index);
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
              <BookOpen size={32} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                Quản lý Môn học
              </h2>
              <p className="text-gray-500 text-sm font-medium">
                Thiết lập danh mục môn học, tín chỉ và các điều kiện ràng buộc
                đào tạo
              </p>
            </div>
          </div>
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 bg-gray-900 text-white px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-xl shadow-gray-200 active:scale-95"
          >
            <Plus size={18} /> Thêm Môn học mới
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-1 gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Tìm theo mã hoặc tên môn..."
              className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium shadow-sm"
              value={filters.search}
              onChange={(e) =>
                setFilters({ ...filters, search: e.target.value, page: 1 })
              }
            />
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 bg-white px-4 py-3 rounded-2xl border border-gray-100 shadow-sm">
            <Filter size={16} className="text-gray-400" />
            <select
              className="outline-none text-sm font-bold text-gray-600 cursor-pointer bg-transparent"
              value={filters.KhoaID}
              onChange={(e) =>
                setFilters({ ...filters, KhoaID: e.target.value, page: 1 })
              }
            >
              <option value="">Tất cả Khoa quản lý</option>
              {faculties.map((f) => (
                <option key={f.KhoaID} value={f.KhoaID}>
                  {f.TenKhoa}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table Area */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50/50 text-gray-400 text-[10px] uppercase font-bold tracking-[0.15em] border-b border-gray-100">
              <tr>
                <th className="px-8 py-5">Định danh môn</th>
                <th className="px-6 py-5">Tên môn học</th>
                <th className="px-8 py-5 text-center">Tín chỉ</th>
                <th className="px-6 py-5 text-center">Tiết (LT/TH)</th>
                <th className="px-8 py-5">Hình thức</th>
                <th className="px-6 py-5">Khoa quản lý</th>
                <th className="px-6 py-5">Ràng buộc (TQ/SH)</th>
                <th className="px-8 py-5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-8 py-20 text-center">
                    <div className="inline-block w-8 h-8 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
                  </td>
                </tr>
              ) : monHocs.length === 0 ? (
                <tr>
                  <td
                    colSpan="6"
                    className="px-8 py-20 text-center text-gray-400 font-medium italic"
                  >
                    Không tìm thấy môn học nào phù hợp
                  </td>
                </tr>
              ) : (
                monHocs.map((item) => (
                  <tr
                    key={item.MonHocID}
                    className="hover:bg-gray-50/50 transition-all group"
                  >
                    <td className="px-8 py-5">
                      <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
                        {item.MaMon}
                      </span>
                    </td>
                    <td className="px-6 py-5 font-black text-gray-900 text-sm">
                      {item.TenMon}
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className="text-xs font-bold text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                        {item.SoTinChi} TC
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <span className="text-[10px] font-bold text-gray-500 bg-gray-50 px-2 py-1 rounded border border-gray-100">
                        {item.TietLyThuyet} / {item.TietThucHanh}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-1 rounded-md border ${
                          item.HinhThucHoc === "Trực tuyến"
                            ? "bg-orange-50 text-orange-600 border-orange-100"
                            : "bg-blue-50 text-blue-600 border-blue-100"
                        }`}
                      >
                        {item.HinhThucHoc || "Trực tiếp"}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <p className="text-xs font-bold text-gray-600">
                        {item.khoa?.TenKhoa || "N/A"}
                      </p>
                      <p className="text-[10px] text-gray-400 font-medium uppercase">
                        {item.khoa?.MaKhoa || "Hệ thống"}
                      </p>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col gap-1.5">
                        {item.mon_tien_quyet?.length > 0
                          ? item.mon_tien_quyet.map((tq) => (
                              <span
                                key={tq.MaMon}
                                className="bg-red-50 text-red-600 px-2 py-0.5 rounded text-[10px] font-bold border border-red-100"
                                title={tq.TenMon}
                              >
                                {tq.MaMon}
                              </span>
                            ))
                          : null}
                        {item.mon_song_hanh?.length > 0
                          ? item.mon_song_hanh.map((sh) => (
                              <span
                                key={sh.MaMon}
                                className="w-fit bg-purple-50 text-purple-600 px-2 py-0.5 rounded text-[9px] font-black border border-purple-100"
                                title={sh.TenMon}
                              >
                                {sh.MaMon}
                              </span>
                            ))
                          : null}
                        {!(item.mon_tien_quyet?.length > 0) &&
                          !(item.mon_song_hanh?.length > 0) && (
                            <span className="text-[10px] text-gray-300 italic font-medium">
                              Không ràng buộc
                            </span>
                          )}
                      </div>
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
                          onClick={() => handleDelete(item.MonHocID)}
                          className="p-2.5 bg-white text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all shadow-sm border border-gray-100"
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

      {/* Pagination UI */}
      {!loading && pagination.last_page > 1 && (
        <div className="px-8 py-6 bg-white rounded-[2rem] border border-gray-100 flex flex-col sm:row justify-between items-center gap-4 shadow-sm">
          <div className="text-xs font-black text-gray-400 uppercase tracking-widest">
            Trang{" "}
            <span className="text-indigo-600">{pagination.current_page}</span> /{" "}
            {pagination.last_page}
            <span className="ml-2 text-gray-300">
              ({pagination.total} môn học)
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              disabled={pagination.current_page === 1}
              onClick={() => setFilters({ ...filters, page: 1 })}
              className="p-2.5 rounded-xl border border-gray-100 bg-white text-gray-400 hover:text-indigo-600 disabled:opacity-30 transition-all"
            >
              «
            </button>

            <button
              disabled={pagination.current_page === 1}
              onClick={() =>
                setFilters({ ...filters, page: pagination.current_page - 1 })
              }
              className="px-4 py-2 rounded-xl border border-gray-100 bg-white text-xs font-black uppercase tracking-widest text-gray-400 hover:text-indigo-600 disabled:opacity-30 transition-all"
            >
              Trước
            </button>

            {getPageNumbers().map((page, index) =>
              page === "..." ? (
                <span key={index} className="px-2">
                  ...
                </span>
              ) : (
                <button
                  key={index}
                  onClick={() => setFilters({ ...filters, page: page })}
                  className={`px-3 py-1 rounded border font-bold ${
                    pagination.current_page === page
                      ? "bg-blue-600 text-white"
                      : "bg-white text-gray-600"
                  }`}
                >
                  {page}
                </button>
              ),
            )}

            <button
              disabled={pagination.current_page === pagination.last_page}
              onClick={() =>
                setFilters({ ...filters, page: pagination.current_page + 1 })
              }
              className="px-4 py-2 rounded-xl border border-gray-100 bg-white text-xs font-black uppercase tracking-widest text-gray-400 hover:text-indigo-600 disabled:opacity-30 transition-all"
            >
              Sau
            </button>

            <button
              disabled={pagination.current_page === pagination.last_page}
              onClick={() =>
                setFilters({ ...filters, page: pagination.last_page })
              }
              className="p-2.5 rounded-xl border border-gray-100 bg-white text-gray-400 hover:text-indigo-600 disabled:opacity-30 transition-all"
            >
              »
            </button>
          </div>
        </div>
      )}

      <MonHocModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        editingMonHoc={selectedMonHoc}
        faculties={faculties}
        allMonHocs={monHocs} // Lưu ý: Ở trang 1 thì allMonHocs chỉ có 10 môn, nếu cần chọn môn tiên quyết từ tất cả, bạn nên fetch một list riêng không phân trang.
      />
    </div>
  );
};

export default MonHocManagement;
