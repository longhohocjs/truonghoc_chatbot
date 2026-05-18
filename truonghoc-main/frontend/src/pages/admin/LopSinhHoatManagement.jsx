import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axiosClient from "@/api/axios";
import toast from "react-hot-toast";
import {
  Users,
  Plus,
  Search,
  Building2,
  UserCog,
  GraduationCap,
  ArrowRight,
} from "lucide-react";

const LopSinhHoatManagement = () => {
  const navigate = useNavigate();
  const [lops, setLops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [khoas, setKhoas] = useState([]);
  const [giangViens, setGiangViens] = useState([]);

  const [formData, setFormData] = useState({
    MaLop: "",
    TenLop: "",
    KhoaID: "",
    NamNhapHoc: new Date().getFullYear(),
    GiangVienID: "",
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      // Helper để trích xuất mảng dữ liệu an toàn từ response đã qua axios interceptor
      const getArray = (res) => {
        const payload = res?.data || res;
        if (Array.isArray(payload)) return payload;
        if (payload?.data && Array.isArray(payload.data)) return payload.data;
        return [];
      };

      const [resLops, resKhoas, resGVs] = await Promise.all([
        axiosClient.post("/admin/lop-sinh-hoat/danh-sach"),
        axiosClient.post("/admin/khoa/list"),
        axiosClient.post("/admin/users/giang-vien/index"),
      ]);

      setLops(getArray(resLops));
      setKhoas(getArray(resKhoas));
      setGiangViens(getArray(resGVs));
    } catch (error) {
      console.error("Lỗi khi tải dữ liệu:", error);
      toast.error("Không thể tải danh sách lớp sinh hoạt");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axiosClient.post("/admin/lop-sinh-hoat/create", formData);
      toast.success("Tạo lớp sinh hoạt thành công");
      setShowModal(false);
      setFormData({
        MaLop: "",
        TenLop: "",
        KhoaID: "",
        NamNhapHoc: new Date().getFullYear(),
        GiangVienID: "",
      });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Lỗi khi tạo lớp");
    }
  };

  const handleAssignAdvisor = async (lopID, gvID) => {
    try {
      await axiosClient.post("/admin/lop-sinh-hoat/assign-advisor", {
        LopSinhHoatID: lopID,
        GiangVienID: gvID,
      });
      toast.success("Cập nhật cố vấn học tập thành công");
      fetchData();
    } catch (error) {
      toast.error("Không thể gán cố vấn học tập");
    }
  };

  const filteredLops = lops.filter(
    (lop) =>
      lop.MaLop?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lop.TenLop?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fadeIn pb-10">
      {/* Unified Header */}
      <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-50/40 rounded-full -mr-20 -mt-20 blur-3xl" />

        <div className="relative flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-6">
            <div className="p-4 bg-indigo-600 rounded-3xl text-white shadow-lg shadow-indigo-100">
              <Users size={32} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                Quản lý Lớp sinh hoạt
              </h2>
              <p className="text-gray-500 text-sm font-medium">
                Quản lý lớp hành chính, điều phối cố vấn học tập và theo dõi sĩ
                số sinh viên
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-gray-900 text-white px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-xl shadow-gray-200 active:scale-95"
          >
            <Plus size={18} /> Tạo lớp mới
          </button>
        </div>
      </div>

      {/* Search & Stats Bar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative flex-1 w-full md:w-auto">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
            size={18}
          />
          <input
            type="text"
            placeholder="Tìm theo mã lớp hoặc tên lớp..."
            className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-4">
          <div className="bg-white px-5 py-3 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              {filteredLops.length} Lớp hành chính
            </span>
          </div>
        </div>
      </div>

      {/* Table Area */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50/50 text-gray-400 text-[10px] uppercase font-bold tracking-[0.15em] border-b border-gray-100">
              <tr>
                <th className="px-8 py-5">Định danh Lớp</th>
                <th className="px-6 py-5">Tên lớp / Khoa</th>
                <th className="px-6 py-5 text-center">Khóa</th>
                <th className="px-6 py-5">Cố vấn học tập</th>
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
              ) : filteredLops.length === 0 ? (
                <tr>
                  <td
                    colSpan="5"
                    className="px-8 py-20 text-center text-gray-400 font-medium italic"
                  >
                    Không tìm thấy lớp sinh hoạt nào phù hợp
                  </td>
                </tr>
              ) : (
                filteredLops.map((lop) => (
                  <tr
                    key={lop.LopSinhHoatID}
                    className="hover:bg-gray-50/50 transition-all group"
                  >
                    <td className="px-8 py-5">
                      <span className="text-sm font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
                        {lop.MaLop}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <p className="text-sm font-black text-gray-900 leading-none mb-1">
                          {lop.TenLop}
                        </p>
                        <div className="flex items-center gap-1 text-[10px] text-gray-400 font-bold uppercase tracking-tight">
                          <Building2 size={10} />
                          {lop.khoa?.TenKhoa || "N/A"}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className="text-xs font-bold text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                        {lop.NamNhapHoc}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <UserCog size={14} className="text-indigo-400" />
                        <select
                          className="text-xs border-none bg-transparent focus:ring-0 font-bold text-gray-700 cursor-pointer hover:text-indigo-600 outline-none p-0"
                          value={lop.GiangVienID || ""}
                          onChange={(e) =>
                            handleAssignAdvisor(
                              lop.LopSinhHoatID,
                              e.target.value,
                            )
                          }
                        >
                          <option value="">Chưa phân công</option>
                          {giangViens.map((gv) => (
                            <option key={gv.GiangVienID} value={gv.GiangVienID}>
                              {gv.HoTen}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <button
                        onClick={() =>
                          navigate(`/admin/lop-sinh-hoat/${lop.LopSinhHoatID}`)
                        }
                        className="p-2.5 bg-white text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all shadow-sm border border-gray-100 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                      >
                        Chi tiết <ArrowRight size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tạo Lớp */}
      {showModal && (
        <div className="fixed inset-0 z-[100] bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden border border-gray-50 relative">
            <div className="px-10 py-8 border-b border-gray-100 flex justify-between items-center bg-white">
              <h3 className="text-xl font-black text-gray-900 tracking-tight">
                Mở Lớp sinh hoạt
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-all"
              >
                <Plus size={20} className="rotate-45" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-10 space-y-6">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] ml-1">
                  Mã lớp
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: CNTT20"
                  className="w-full mt-1 px-5 py-3.5 bg-gray-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-gray-700"
                  value={formData.MaLop}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      MaLop: e.target.value.toUpperCase(),
                    })
                  }
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] ml-1">
                  Tên lớp
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Công nghệ thông tin 20"
                  className="w-full mt-1 px-5 py-3.5 bg-gray-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-gray-700"
                  value={formData.TenLop}
                  onChange={(e) =>
                    setFormData({ ...formData, TenLop: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] ml-1">
                    Khoa
                  </label>
                  <select
                    required
                    className="w-full mt-1 px-4 py-3 bg-gray-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-gray-700 appearance-none"
                    value={formData.KhoaID}
                    onChange={(e) =>
                      setFormData({ ...formData, KhoaID: e.target.value })
                    }
                  >
                    <option value="">-- Chọn Khoa --</option>
                    {khoas.map((k) => (
                      <option key={k.KhoaID} value={k.KhoaID}>
                        {k.TenKhoa}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] ml-1">
                    Năm nhập học
                  </label>
                  <input
                    type="number"
                    required
                    className="w-full mt-1 px-4 py-3 bg-gray-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-gray-700"
                    value={formData.NamNhapHoc}
                    onChange={(e) =>
                      setFormData({ ...formData, NamNhapHoc: e.target.value })
                    }
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] ml-1">
                  Cố vấn học tập
                </label>
                <select
                  className="w-full mt-1 px-5 py-3.5 bg-gray-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-gray-700 appearance-none"
                  value={formData.GiangVienID}
                  onChange={(e) =>
                    setFormData({ ...formData, GiangVienID: e.target.value })
                  }
                >
                  <option value="">-- Chọn giảng viên --</option>
                  {giangViens.map((gv) => (
                    <option key={gv.GiangVienID} value={gv.GiangVienID}>
                      {gv.HoTen}
                    </option>
                  ))}
                </select>
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
                  Tiến hành tạo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LopSinhHoatManagement;
