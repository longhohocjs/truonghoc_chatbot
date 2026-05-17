import React, { useState, useEffect } from "react";
import axiosClient from "@/api/axios";
import toast from "react-hot-toast";
import ConfirmModal from "@/components/ConfirmModal";
import {
  Bell,
  Plus,
  Pencil,
  Trash2,
  Megaphone,
  Users,
  Calendar,
  Clock,
  Mail,
  Filter,
  Search,
} from "lucide-react";

const ThongBaoManager = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    TieuDe: "",
    NoiDung: "",
    LoaiThongBao: "Chung",
    DoiTuong: "TatCa",
    NgayBatDauHienThi: new Date().toISOString().split("T")[0],
    NgayKetThucHienThi: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [confirmConfig, setConfirmConfig] = useState({
    isOpen: false,
    id: null,
  });
  const [sendingMailId, setSendingMailId] = useState(null);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get("/admin/thong-bao");
      const data = res.data?.data || res.data || [];
      setAnnouncements(data);
    } catch (error) {
      console.error("Lỗi tải thông báo:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await axiosClient.put(`/admin/thong-bao/${editingId}`, formData);
        toast.success("Cập nhật thông báo thành công");
      } else {
        await axiosClient.post("/admin/thong-bao", formData);
        toast.success("Đã gửi thông báo mới");
      }
      setShowModal(false);
      setFormData({
        TieuDe: "",
        NoiDung: "",
        LoaiThongBao: "Chung",
        DoiTuong: "TatCa",
        NgayBatDauHienThi: new Date().toISOString().split("T")[0],
        NgayKetThucHienThi: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
      });
      setEditingId(null);
      fetchAnnouncements();
    } catch (error) {
      toast.error(error.response?.data?.message || "Thao tác thất bại");
    }
  };

  const handleSendEmail = async (id) => {
    setSendingMailId(id);
    try {
      await axiosClient.post(`/admin/thong-bao/${id}/send-email`);
      toast.success("Đã đưa yêu cầu gửi email vào hàng đợi thành công");
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Không thể thực hiện gửi email",
      );
    } finally {
      setSendingMailId(null);
    }
  };

  const handleDelete = async (id) => {
    try {
      await axiosClient.delete(`/admin/thong-bao/${id}`);
      toast.success("Xóa thông báo thành công");
      fetchAnnouncements();
    } catch (error) {
      toast.error("Không thể xóa thông báo");
    }
  };

  const openEditModal = (item) => {
    setEditingId(item.ThongBaoID);
    setFormData({
      TieuDe: item.TieuDe,
      NoiDung: item.NoiDung,
      LoaiThongBao: item.LoaiThongBao || "Chung",
      DoiTuong: item.DoiTuong || "TatCa",
      NgayBatDauHienThi: item.NgayBatDauHienThi?.split(" ")[0] || "",
      NgayKetThucHienThi: item.NgayKetThucHienThi?.split(" ")[0] || "",
    });
    setShowModal(true);
  };

  const filteredAnnouncements = announcements.filter((item) =>
    item.TieuDe?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fadeIn pb-10">
      {/* Unified Header */}
      <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-50/40 rounded-full -mr-20 -mt-20 blur-3xl" />

        <div className="relative flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-6">
            <div className="p-4 bg-indigo-600 rounded-3xl text-white shadow-lg shadow-indigo-100">
              <Bell size={32} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                Quản lý Thông báo
              </h2>
              <p className="text-gray-500 text-sm font-medium">
                Soạn thảo và điều phối tin tức, thông báo quan trọng đến sinh
                viên và giảng viên
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setEditingId(null);
              setFormData({
                TieuDe: "",
                NoiDung: "",
                LoaiThongBao: "Chung",
                DoiTuong: "TatCa",
                NgayBatDauHienThi: new Date().toISOString().split("T")[0],
                NgayKetThucHienThi: new Date(
                  Date.now() + 7 * 24 * 60 * 60 * 1000,
                )
                  .toISOString()
                  .split("T")[0],
              });
              setShowModal(true);
            }}
            className="flex items-center gap-2 bg-gray-900 text-white px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-xl shadow-gray-200 active:scale-95"
          >
            <Plus size={18} /> Gửi thông báo
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search
          className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
          size={18}
        />
        <input
          type="text"
          placeholder="Tìm kiếm tiêu đề thông báo..."
          className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium shadow-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Table Area */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50/50 text-gray-400 text-[10px] uppercase font-bold tracking-[0.15em] border-b border-gray-100">
            <tr>
              <th className="px-8 py-5">Nội dung thông báo</th>
              <th className="px-6 py-5">Đối tượng / Loại</th>
              <th className="px-6 py-5">Thời gian hiển thị</th>
              <th className="px-8 py-5 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan="4" className="px-8 py-20 text-center">
                  <div className="inline-block w-8 h-8 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
                </td>
              </tr>
            ) : filteredAnnouncements.length === 0 ? (
              <tr>
                <td
                  colSpan="4"
                  className="px-8 py-20 text-center text-gray-400 font-medium italic"
                >
                  Hiện tại không có thông báo nào được tìm thấy
                </td>
              </tr>
            ) : (
              filteredAnnouncements.map((item) => (
                <tr
                  key={item.ThongBaoID}
                  className="hover:bg-gray-50/50 transition-all group"
                >
                  <td className="px-8 py-5">
                    <div className="flex flex-col gap-1">
                      <p className="text-sm font-black text-gray-900 leading-tight">
                        {item.TieuDe}
                      </p>
                      <p className="text-xs text-gray-400 line-clamp-1 max-w-xs">
                        {item.NoiDung}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex flex-col gap-1.5">
                      <span className="flex items-center gap-1.5 text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md w-fit uppercase">
                        <Users size={10} />{" "}
                        {item.DoiTuong === "TatCa" ? "Tất cả" : item.DoiTuong}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md w-fit uppercase ${item.LoaiThongBao === "Khan" ? "bg-rose-50 text-rose-600" : "bg-gray-100 text-gray-500"}`}
                      >
                        {item.LoaiThongBao}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex flex-col text-[11px] font-bold text-gray-500 gap-1">
                      <span className="flex items-center gap-1">
                        <Clock size={12} className="text-emerald-500" />{" "}
                        {new Date(item.NgayBatDauHienThi).toLocaleDateString(
                          "vi-VN",
                        )}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={12} className="text-rose-500" />{" "}
                        {new Date(item.NgayKetThucHienThi).toLocaleDateString(
                          "vi-VN",
                        )}
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                      <button
                        onClick={() => handleSendEmail(item.ThongBaoID)}
                        disabled={sendingMailId === item.ThongBaoID}
                        className={`p-2.5 bg-white rounded-xl transition-all shadow-sm border border-gray-100 ${
                          sendingMailId === item.ThongBaoID
                            ? "text-indigo-300 animate-pulse"
                            : "text-gray-400 hover:text-emerald-600 hover:bg-emerald-50"
                        }`}
                        title="Kích hoạt gửi Email cho toàn bộ đối tượng"
                      >
                        <Mail size={16} />
                      </button>
                      <button
                        onClick={() => openEditModal(item)}
                        className="p-2.5 bg-white text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all shadow-sm border border-gray-100"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() =>
                          setConfirmConfig({
                            isOpen: true,
                            id: item.ThongBaoID,
                          })
                        }
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

      {showModal && (
        <div className="fixed inset-0 z-[100] bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-50">
            <div className="px-10 py-8 border-b border-gray-100 flex justify-between items-center bg-white">
              <h3 className="text-xl font-black text-gray-900 tracking-tight">
                {editingId ? "Cập nhật thông báo" : "Soạn thông báo"}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-all"
              >
                <Plus size={20} className="rotate-45" />
              </button>
            </div>
            <form
              onSubmit={handleSubmit}
              className="p-10 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar"
            >
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] ml-1">
                  Tiêu đề
                </label>
                <input
                  type="text"
                  required
                  className="w-full mt-1 px-5 py-3.5 bg-gray-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-gray-700 shadow-inner"
                  value={formData.TieuDe}
                  onChange={(e) =>
                    setFormData({ ...formData, TieuDe: e.target.value })
                  }
                  placeholder="Tiêu đề thông báo..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] ml-1">
                    Loại tin
                  </label>
                  <select
                    className="w-full mt-1 px-4 py-3 bg-gray-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-gray-700 appearance-none"
                    value={formData.LoaiThongBao}
                    onChange={(e) =>
                      setFormData({ ...formData, LoaiThongBao: e.target.value })
                    }
                  >
                    <option value="Chung">Thông báo chung</option>
                    <option value="Khan">Khẩn cấp</option>
                    <option value="HocTap">Học tập</option>
                    <option value="SuKien">Sự kiện</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] ml-1">
                    Đối tượng
                  </label>
                  <select
                    className="w-full mt-1 px-4 py-3 bg-gray-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-gray-700 appearance-none"
                    value={formData.DoiTuong}
                    onChange={(e) =>
                      setFormData({ ...formData, DoiTuong: e.target.value })
                    }
                  >
                    <option value="TatCa">Tất cả</option>
                    <option value="SinhVien">Sinh viên</option>
                    <option value="GiangVien">Giảng viên</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] ml-1">
                    Bắt đầu hiển thị
                  </label>
                  <input
                    type="date"
                    required
                    className="w-full mt-1 px-4 py-3 bg-gray-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-gray-700"
                    value={formData.NgayBatDauHienThi}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        NgayBatDauHienThi: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] ml-1">
                    Kết thúc hiển thị
                  </label>
                  <input
                    type="date"
                    required
                    className="w-full mt-1 px-4 py-3 bg-gray-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-gray-700"
                    value={formData.NgayKetThucHienThi}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        NgayKetThucHienThi: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] ml-1">
                  Nội dung chi tiết
                </label>
                <textarea
                  required
                  rows="6"
                  className="w-full mt-1 px-5 py-3.5 bg-gray-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-gray-700 shadow-inner resize-none"
                  value={formData.NoiDung}
                  onChange={(e) =>
                    setFormData({ ...formData, NoiDung: e.target.value })
                  }
                  placeholder="Nhập nội dung thông báo chi tiết tại đây..."
                />
              </div>
              <div className="pt-4 flex gap-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-4 text-sm font-bold text-gray-400 hover:text-gray-600 transition-colors uppercase tracking-widest"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-[2] bg-indigo-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95"
                >
                  {editingId ? "Lưu thay đổi" : "Phát hành thông báo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        onClose={() => setConfirmConfig({ isOpen: false, id: null })}
        onConfirm={() => handleDelete(confirmConfig.id)}
        title="Xóa thông báo"
        message="Thông báo này sẽ biến mất vĩnh viễn khỏi hệ thống. Bạn có chắc chắn?"
      />
    </div>
  );
};

export default ThongBaoManager;
