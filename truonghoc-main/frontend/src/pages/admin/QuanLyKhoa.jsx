import React, { useState, useEffect } from "react";
import axiosClient from "@/api/axios";
import toast from "react-hot-toast";
import ConfirmModal from "@/components/ConfirmModal";
import {
  Building2,
  Plus,
  Pencil,
  Trash2,
  GraduationCap,
  ArrowRight,
  LayoutGrid,
} from "lucide-react";

const QuanLyKhoa = () => {
  const [khoas, setKhoas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingKhoa, setEditingKhoa] = useState(null); // Lưu thông tin khoa đang sửa
  const [editingNganh, setEditingNganh] = useState(null); // Lưu thông tin ngành đang sửa
  const [isAddNganhModalOpen, setIsAddNganhModalOpen] = useState(false);
  const [selectedKhoaForNganh, setSelectedKhoaForNganh] = useState(null); // Khoa được chọn để thêm ngành
  const [newKhoa, setNewKhoa] = useState({ MaKhoa: "", TenKhoa: "" });
  const [confirmConfig, setConfirmConfig] = useState({
    isOpen: false,
    id: null,
    type: null, // 'khoa' hoặc 'nganh'
  });

  // Hàm lấy danh sách khoa và ngành
  const fetchData = async () => {
    console.log("Đang gọi API lấy danh sách khoa...");
    setLoading(true);
    try {
      // Gọi API POST /admin/khoa/list theo định nghĩa trong api.php
      const res = await axiosClient.post("/admin/khoa/list");
      // Đảm bảo lấy đúng mảng dữ liệu từ { status: 'success', data: [...] }
      setKhoas(res?.data || res || []);
    } catch (error) {
      console.error("Lỗi khi tải danh sách khoa:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Mở modal sửa khoa
  const handleOpenEditKhoa = (khoa) => {
    setEditingKhoa(khoa);
    setNewKhoa({ MaKhoa: khoa.MaKhoa, TenKhoa: khoa.TenKhoa });
    setIsAddModalOpen(true);
  };

  // Logic Lưu Khoa (Thêm/Sửa)
  const handleSubmitKhoa = async (e) => {
    e.preventDefault();
    try {
      if (editingKhoa) {
        await axiosClient.patch(`/admin/khoa/${editingKhoa.KhoaID}`, newKhoa);
        toast.success("Cập nhật Khoa thành công");
      } else {
        await axiosClient.post("/admin/khoa", newKhoa);
        toast.success("Thêm Khoa mới thành công");
      }
      setIsAddModalOpen(false);
      setEditingKhoa(null);
      setNewKhoa({ MaKhoa: "", TenKhoa: "" });
      fetchData();
    } catch (error) {
      console.error("Lỗi khi thêm khoa:", error);
    }
  };

  // Mở modal sửa ngành
  const handleOpenEditNganh = (nganh) => {
    setEditingNganh(nganh);
    setSelectedKhoaForNganh({
      KhoaID: nganh.KhoaID,
      MaNganh: nganh.MaNganh,
      TenNganh: nganh.TenNganh,
    });
    setIsAddNganhModalOpen(true);
  };

  // Logic Lưu Ngành (Thêm/Sửa)
  const handleSubmitNganh = async (e) => {
    e.preventDefault();
    try {
      if (editingNganh) {
        await axiosClient.patch(
          `/admin/nganh/${editingNganh.NganhID}`,
          selectedKhoaForNganh,
        );
        toast.success("Cập nhật Ngành thành công");
      } else {
        await axiosClient.post("/admin/nganh", selectedKhoaForNganh);
        toast.success("Thêm Ngành mới thành công");
      }
      setIsAddNganhModalOpen(false);
      setEditingNganh(null);
      setSelectedKhoaForNganh(null); // Reset
      fetchData();
    } catch (error) {
      console.error("Lỗi khi thêm ngành:", error);
    }
  };

  // Hàm thực thi xóa Khoa sau khi đã xác nhận qua Modal
  const executeDeleteKhoa = async (khoaId) => {
    try {
      const response = await axiosClient.delete(`/admin/khoa/${khoaId}`);
      toast.success(response.message || "Xóa Khoa thành công");
      fetchData(); // Tải lại danh sách
    } catch (error) {
      // Lỗi 400 (còn ràng buộc) sẽ được axios interceptor hiển thị tự động
      console.error("Lỗi xóa khoa:", error);
    }
  };

  // Hàm thực thi xóa Ngành sau khi đã xác nhận qua Modal
  const executeDeleteNganh = async (nganhId) => {
    try {
      const response = await axiosClient.delete(`/admin/nganh/${nganhId}`);
      toast.success(response.message || "Xóa Ngành thành công");
      fetchData(); // Tải lại danh sách
    } catch (error) {
      console.error("Lỗi xóa ngành:", error);
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
              <Building2 size={32} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                Quản lý Khoa & Ngành
              </h2>
              <p className="text-gray-500 text-sm font-medium">
                Cấu hình tổ chức các đơn vị đào tạo và danh mục ngành học
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setEditingKhoa(null);
              setNewKhoa({ MaKhoa: "", TenKhoa: "" });
              setIsAddModalOpen(true);
            }}
            className="flex items-center gap-2 bg-gray-900 text-white px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-xl shadow-gray-200 active:scale-95"
          >
            <Plus size={18} /> Thêm Khoa mới
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-32 text-gray-400 font-medium">
          <div className="w-8 h-8 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mr-3" />
          Đang tải cấu trúc sơ đồ đơn vị...
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8">
          {khoas.map((khoa) => (
            <div
              key={khoa.KhoaID}
              className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden group hover:border-indigo-100 transition-all"
            >
              {/* Header của Khoa */}
              <div className="px-10 py-6 bg-gray-50/50 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div>
                  <span className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] block mb-2">
                    Khoa đào tạo
                  </span>
                  <h3 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                    {khoa.TenKhoa}{" "}
                    <span className="text-[11px] bg-white border border-gray-200 text-gray-400 px-3 py-1 rounded-xl font-black">
                      {khoa.MaKhoa}
                    </span>
                  </h3>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenEditKhoa(khoa);
                    }}
                    className="p-2.5 bg-white text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all shadow-sm"
                    title="Sửa thông tin khoa"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmConfig({
                        isOpen: true,
                        id: khoa.KhoaID,
                        type: "khoa",
                      });
                    }}
                    className="p-2.5 bg-white text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all shadow-sm"
                    title="Xóa khoa"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="px-10 py-6">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[11px] font-black text-gray-400 uppercase tracking-[0.15em]">
                      <th className="pb-4 px-2 w-32">Mã ngành</th>
                      <th className="pb-4 px-2">Ngành đào tạo</th>
                      <th className="pb-4 px-2 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedKhoaForNganh({
                              KhoaID: khoa.KhoaID,
                              MaNganh: "",
                              TenNganh: "",
                            });
                            setIsAddNganhModalOpen(true);
                          }}
                          className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-xl hover:bg-indigo-600 hover:text-white transition-all uppercase tracking-wider shadow-sm"
                        >
                          + THÊM NGÀNH
                        </button>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50/50">
                    {khoa.nganhs && khoa.nganhs.length > 0 ? (
                      khoa.nganhs.map((nganh) => (
                        <tr
                          key={nganh.NganhID}
                          className="hover:bg-gray-50/30 transition-all group/row"
                        >
                          <td className="py-4 px-2">
                            <span className="text-xs font-black text-indigo-500 bg-indigo-50 px-2.5 py-1 rounded-lg">
                              {nganh.MaNganh}
                            </span>
                          </td>
                          <td className="py-4 px-2 text-sm font-bold text-gray-700 group-hover/row:text-indigo-600 transition-colors">
                            {nganh.TenNganh}
                          </td>
                          <td className="py-4 px-2 text-right">
                            <div className="flex justify-end gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenEditNganh(nganh);
                                }}
                                className="p-2 text-gray-400 hover:text-indigo-600 rounded-lg hover:bg-white transition-all"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirmConfig({
                                    isOpen: true,
                                    id: nganh.NganhID,
                                    type: "nganh",
                                  });
                                }}
                                className="p-2 text-gray-400 hover:text-rose-500 rounded-lg hover:bg-white transition-all"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="3" className="py-10 text-center">
                          <LayoutGrid
                            size={24}
                            className="mx-auto text-gray-100 mb-2"
                          />
                          <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">
                            Khoa chưa có ngành đào tạo
                          </p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          {khoas.length === 0 && !loading && (
            <div className="text-center py-32 bg-white rounded-[2.5rem] border border-dashed border-gray-200">
              <Building2 size={48} className="mx-auto text-gray-100 mb-4" />
              <p className="text-gray-400 font-bold uppercase text-xs tracking-widest">
                Hệ thống chưa có dữ liệu khoa
              </p>
            </div>
          )}
        </div>
      )}

      {/* Modal Thêm/Sửa Khoa */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] bg-gray-900/40 backdrop-blur-sm flex items-center justify-center animate-fadeIn">
          <form
            onSubmit={handleSubmitKhoa}
            className="bg-white p-10 rounded-[2.5rem] w-full max-w-md space-y-8 shadow-2xl border border-gray-50"
          >
            <h3 className="text-2xl font-black text-gray-900 tracking-tight">
              {editingKhoa ? "Cập nhật Khoa" : "Thêm Khoa mới"}
            </h3>
            <div className="space-y-5">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] ml-1">
                  Mã định danh khoa
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: CNTT"
                  className="w-full mt-1 px-5 py-3.5 bg-gray-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-gray-700"
                  value={newKhoa.MaKhoa}
                  onChange={(e) =>
                    setNewKhoa({
                      ...newKhoa,
                      MaKhoa: e.target.value.toUpperCase(),
                    })
                  }
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] ml-1">
                  Tên Khoa đào tạo
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Công nghệ thông tin"
                  className="w-full mt-1 px-5 py-3.5 bg-gray-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-gray-700"
                  value={newKhoa.TenKhoa}
                  onChange={(e) =>
                    setNewKhoa({ ...newKhoa, TenKhoa: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
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

      {/* Modal Thêm/Sửa Ngành */}
      {isAddNganhModalOpen && (
        <div className="fixed inset-0 z-[100] bg-gray-900/40 backdrop-blur-sm flex items-center justify-center animate-fadeIn">
          <form
            onSubmit={handleSubmitNganh}
            className="bg-white p-10 rounded-[2.5rem] w-full max-w-md space-y-8 shadow-2xl border border-gray-50"
          >
            <h3 className="text-2xl font-black text-gray-900 tracking-tight">
              {editingNganh ? "Cập nhật Ngành" : "Thêm Ngành học"}
            </h3>
            <div className="space-y-5">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] ml-1">
                  Mã ngành đào tạo
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: KTPM"
                  className="w-full mt-1 px-5 py-3.5 bg-gray-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-gray-700"
                  value={selectedKhoaForNganh?.MaNganh || ""}
                  onChange={(e) =>
                    setSelectedKhoaForNganh({
                      ...selectedKhoaForNganh,
                      MaNganh: e.target.value.toUpperCase(),
                    })
                  }
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] ml-1">
                  Tên Ngành học
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Kỹ thuật phần mềm"
                  className="w-full mt-1 px-5 py-3.5 bg-gray-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-gray-700"
                  value={selectedKhoaForNganh?.TenNganh || ""}
                  onChange={(e) =>
                    setSelectedKhoaForNganh({
                      ...selectedKhoaForNganh,
                      TenNganh: e.target.value,
                    })
                  }
                />
              </div>
            </div>
            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={() => setIsAddNganhModalOpen(false)}
                className="flex-1 py-4 text-sm font-bold text-gray-400 hover:text-gray-600 transition-colors uppercase tracking-widest"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="flex-[2] bg-indigo-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all"
              >
                Lưu ngành học
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal xác nhận xóa dùng chung cho cả Khoa và Ngành */}
      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        onClose={() =>
          setConfirmConfig({ isOpen: false, id: null, type: null })
        }
        onConfirm={() => {
          if (confirmConfig.type === "khoa") {
            executeDeleteKhoa(confirmConfig.id);
          } else {
            executeDeleteNganh(confirmConfig.id);
          }
          setConfirmConfig({ isOpen: false, id: null, type: null });
        }}
        title={
          confirmConfig.type === "khoa"
            ? "Xóa đơn vị Khoa"
            : "Xóa Ngành đào tạo"
        }
        message={
          confirmConfig.type === "khoa"
            ? "Bạn có chắc chắn muốn xóa Khoa này? Hệ thống sẽ kiểm tra các ràng buộc về Ngành, Môn học và Giảng viên trước khi thực hiện."
            : "Bạn có chắc chắn muốn xóa Ngành này? Dữ liệu về sinh viên và chương trình đào tạo liên quan có thể bị ảnh hưởng."
        }
      />
    </div>
  );
};

export default QuanLyKhoa;
