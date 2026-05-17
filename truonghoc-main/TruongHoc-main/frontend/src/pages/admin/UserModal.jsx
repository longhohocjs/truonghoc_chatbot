import React, { useState, useEffect } from "react";
import axiosClient from "@/api/axios";

const UserModal = ({
  isOpen,
  onClose,
  onSave,
  editingUser,
  type,
  faculties,
}) => {
  const [formData, setFormData] = useState({
    MaSV: "",
    MaGV: "",
    HoTen: "",
    khoahoc: "",
    KhoaID: "",
    NganhID: "",
    email: "",
    sodienthoai: "",
    HocVi: "",
    ChuyenMon: "",
    LoaiGiangVien: "Cơ hữu",
  });

  const [majors, setMajors] = useState([]);

  useEffect(() => {
    if (editingUser) {
      setFormData({
        MaSV: editingUser.MaSV || editingUser.ma_sv || "",
        MaGV: editingUser.MaGV || editingUser.ma_gv || "",
        HoTen: editingUser.HoTen || editingUser.ho_ten || "",
        email: editingUser.email || editingUser.Email || "",
        sodienthoai:
          editingUser.sodienthoai ||
          editingUser.so_dien_thoai ||
          editingUser.SoDienThoai ||
          "",
        khoahoc:
          editingUser.khoahoc ||
          editingUser.KhoaHoc ||
          editingUser.khoa_hoc ||
          "",
        KhoaID:
          editingUser.KhoaID ||
          editingUser.khoa?.KhoaID ||
          editingUser.khoa_id ||
          "",
        NganhID:
          editingUser.NganhID ||
          editingUser.nganh?.NganhID ||
          editingUser.nganh_id ||
          "",
        HocVi: editingUser.HocVi || editingUser.hoc_vi || "",
        ChuyenMon: editingUser.ChuyenMon || editingUser.chuyen_mon || "",
        LoaiGiangVien:
          editingUser.LoaiGiangVien || editingUser.loai_giang_vien || "Cơ hữu",
      });

      if (editingUser.KhoaID || editingUser.khoa?.KhoaID) {
        fetchMajors(editingUser.KhoaID || editingUser.khoa?.KhoaID);
      }
    } else {
      setFormData({
        MaSV: "",
        MaGV: "",
        HoTen: "",
        khoahoc: new Date().getFullYear().toString(),
        KhoaID: "",
        NganhID: "",
        email: "",
        sodienthoai: "",
        HocVi: "",
        ChuyenMon: "",
        LoaiGiangVien: "Cơ hữu",
      });
    }
  }, [editingUser, isOpen]);

  const fetchMajors = async (khoaId) => {
    try {
      const res = await axiosClient.get(`/admin/khoa/${khoaId}/nganh`);
      setMajors(res.data || res || []);
    } catch (error) {
      setMajors([]);
    }
  };

  const handleKhoaChange = (e) => {
    const id = e.target.value;
    setFormData({ ...formData, KhoaID: id, NganhID: "" });
    if (id) fetchMajors(id);
    else setMajors([]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h3 className="text-xl font-bold text-gray-800">
            {editingUser ? "Cập nhật" : "Thêm mới"}{" "}
            {type === "sinhvien"
              ? "Sinh viên"
              : type === "giangvien"
                ? "Giảng viên"
                : "Admin"}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            &times;
          </button>
        </div>

        <form
          className="p-6 space-y-4 max-h-[70vh] overflow-y-auto"
          onSubmit={(e) => {
            e.preventDefault();
            onSave(formData);
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                {type === "sinhvien"
                  ? "Mã Sinh Viên"
                  : type === "giangvien"
                    ? "Mã Giảng Viên"
                    : "Mã định danh"}
              </label>
              <input
                type="text"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={type === "sinhvien" ? formData.MaSV : formData.MaGV}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    [type === "sinhvien" ? "MaSV" : "MaGV"]: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                Họ và Tên
              </label>
              <input
                type="text"
                required
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.HoTen}
                onChange={(e) =>
                  setFormData({ ...formData, HoTen: e.target.value })
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                Email
              </label>
              <input
                type="email"
                required
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                Số điện thoại
              </label>
              <input
                type="text"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.sodienthoai}
                onChange={(e) =>
                  setFormData({ ...formData, sodienthoai: e.target.value })
                }
              />
            </div>
          </div>

          {type !== "admin" && (
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                Khoa quản lý
              </label>
              <select
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                value={formData.KhoaID}
                onChange={handleKhoaChange}
              >
                <option value="">-- Chọn Khoa --</option>
                {faculties.map((f) => (
                  <option key={f.KhoaID} value={f.KhoaID}>
                    {f.TenKhoa}
                  </option>
                ))}
              </select>
            </div>
          )}

          {type === "giangvien" && (
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                Loại giảng viên
              </label>
              <select
                name="LoaiGiangVien"
                className="w-full px-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-bold text-gray-600 appearance-none"
                value={formData.LoaiGiangVien || "Cơ hữu"}
                onChange={(e) =>
                  setFormData({ ...formData, LoaiGiangVien: e.target.value })
                }
              >
                <option value="Cơ hữu">Giảng viên Cơ hữu</option>
                <option value="Thỉnh giảng">Giảng viên Thỉnh giảng</option>
              </select>
            </div>
          )}

          {type === "sinhvien" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                  Ngành đào tạo
                </label>
                <select
                  required
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  value={formData.NganhID}
                  onChange={(e) =>
                    setFormData({ ...formData, NganhID: e.target.value })
                  }
                >
                  <option value="">-- Chọn Ngành --</option>
                  {majors.map((m) => (
                    <option key={m.NganhID} value={m.NganhID}>
                      {m.TenNganh}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                  Khóa học
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: 2023"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.khoahoc}
                  onChange={(e) =>
                    setFormData({ ...formData, khoahoc: e.target.value })
                  }
                />
              </div>
            </div>
          ) : type === "giangvien" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                  Học vị
                </label>
                <select
                  className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  value={formData.HocVi}
                  onChange={(e) =>
                    setFormData({ ...formData, HocVi: e.target.value })
                  }
                >
                  <option value="">-- Chọn học vị --</option>
                  <option value="Thạc sĩ">Thạc sĩ</option>
                  <option value="Tiến sĩ">Tiến sĩ</option>
                  <option value="PGS.TS">PGS.TS</option>
                  <option value="GS.TS">GS.TS</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                  Chuyên môn
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.ChuyenMon}
                  onChange={(e) =>
                    setFormData({ ...formData, ChuyenMon: e.target.value })
                  }
                />
              </div>
            </div>
          ) : null}

          <div className="pt-4 flex justify-end space-x-3 bg-gray-50 -mx-6 -mb-6 p-6">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 text-sm font-bold text-gray-500 hover:text-gray-700"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-8 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 shadow-lg active:scale-95 transition-all"
            >
              Lưu dữ liệu
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserModal;
