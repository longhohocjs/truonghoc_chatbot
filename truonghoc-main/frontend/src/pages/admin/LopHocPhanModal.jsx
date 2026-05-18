import React, { useState, useEffect } from "react";
import {
  School,
  X,
  Calendar,
  Users,
  BookOpen,
  UserCheck,
  Timer,
} from "lucide-react";

const LopHocPhanModal = ({
  isOpen,
  onClose,
  onSave,
  editingLop,
  dropdownData,
}) => {
  const [formData, setFormData] = useState({
    MaLopHP: "",
    MonHocID: "",
    GiangVienID: "",
    HocKyID: "",
    SoLuongToiDa: 50,
    NgayBatDau: "",
    NgayKetThuc: "",
  });

  useEffect(() => {
    if (editingLop) {
      setFormData({
        LopHocPhanID: editingLop.LopHocPhanID,
        MaLopHP: editingLop.MaLopHP || "",
        MonHocID: editingLop.MonHocID || "",
        GiangVienID: editingLop.GiangVienID || "",
        HocKyID: editingLop.HocKyID || "",
        SoLuongToiDa: editingLop.SoLuongToiDa || 50,
        NgayBatDau: editingLop.NgayBatDau
          ? editingLop.NgayBatDau.substring(0, 10)
          : "",
        NgayKetThuc: editingLop.NgayKetThuc
          ? editingLop.NgayKetThuc.substring(0, 10)
          : "",
      });
    } else {
      setFormData({
        MaLopHP: "",
        MonHocID: "",
        GiangVienID: "",
        HocKyID: dropdownData.hocKys[0]?.HocKyID || "",
        SoLuongToiDa: 50,
        NgayBatDau: "",
        NgayKetThuc: "",
      });
    }
  }, [editingLop, isOpen, dropdownData]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.MonHocID || !formData.HocKyID) {
      alert("Vui lòng chọn Môn học và Học kỳ.");
      return;
    }

    // Ép kiểu dữ liệu sang Number cho các trường ID và số lượng để tránh lỗi 422
    const submitData = {
      ...formData,
      MonHocID: Number(formData.MonHocID) || null,
      GiangVienID: formData.GiangVienID ? Number(formData.GiangVienID) : null,
      HocKyID: Number(formData.HocKyID),
      SoLuongToiDa: Number(formData.SoLuongToiDa),
    };
    console.log("Dữ liệu mở lớp gửi lên:", submitData);
    onSave(submitData);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl border border-gray-50 overflow-hidden flex flex-col relative">
        {/* Decoration blobs */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-50/50 rounded-full -mr-10 -mt-10 blur-3xl pointer-events-none" />

        <div className="relative px-10 py-8 border-b border-gray-100 flex justify-between items-center bg-white">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600">
              <School size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-gray-900 tracking-tight">
                {editingLop ? "Cập nhật Lớp học" : "Thiết lập Mở lớp mới"}
              </h3>
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mt-0.5">
                Học phần đào tạo
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-all"
          >
            <X size={20} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="relative p-10 space-y-6 overflow-y-auto max-h-[75vh] custom-scrollbar"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] ml-1">
                Mã định danh Lớp
              </label>
              <div className="relative">
                <input
                  type="text"
                  disabled={!editingLop}
                  placeholder={
                    !editingLop ? "Hệ thống tự động tạo" : "VD: LHP001"
                  }
                  className="w-full px-5 py-3.5 bg-gray-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-gray-700 disabled:opacity-60 disabled:cursor-not-allowed"
                  value={formData.MaLopHP}
                  onChange={(e) =>
                    setFormData({ ...formData, MaLopHP: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] ml-1">
                Học kỳ áp dụng
              </label>
              <select
                className="w-full px-5 py-3.5 bg-gray-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-gray-700"
                value={formData.HocKyID}
                onChange={(e) => {
                  const hkId = e.target.value;
                  const selectedHk = dropdownData.hocKys.find(
                    (hk) => hk.HocKyID == hkId,
                  );
                  setFormData({
                    ...formData,
                    HocKyID: hkId,
                    NgayBatDau: selectedHk?.NgayBatDau?.split(" ")[0] || "",
                    NgayKetThuc: selectedHk?.NgayKetThuc?.split(" ")[0] || "",
                  });
                }}
              >
                <option value="">-- Chọn học kỳ --</option>
                {(dropdownData.hocKys || []).map((hk) => (
                  <option key={hk.HocKyID} value={hk.HocKyID}>
                    {hk.TenHocKy} - {hk.nam_hoc?.TenNamHoc}
                  </option>
                ))}
              </select>
              {formData.HocKyID && (
                <div className="flex items-center gap-2 mt-1 ml-1">
                  <div className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[9px] font-black rounded-md uppercase border border-indigo-100">
                    Năm học:{" "}
                    {
                      dropdownData.hocKys.find(
                        (hk) => hk.HocKyID == formData.HocKyID,
                      )?.nam_hoc?.TenNamHoc
                    }
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] ml-1 flex items-center gap-2">
              <BookOpen size={12} /> Chọn môn học đào tạo
            </label>
            <select
              required
              className="w-full px-5 py-3.5 bg-gray-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-gray-700"
              value={formData.MonHocID}
              onChange={(e) =>
                setFormData({ ...formData, MonHocID: e.target.value })
              }
            >
              <option value="">-- Chọn môn học --</option>
              {(dropdownData.monHocs || []).map((m) => (
                <option key={m.MonHocID} value={m.MonHocID}>
                  ({m.MaMon}) - {m.TenMon}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] ml-1 flex items-center gap-2">
              <UserCheck size={12} /> Giảng viên giảng dạy
            </label>
            <select
              required
              className="w-full px-5 py-3.5 bg-gray-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-gray-700"
              value={formData.GiangVienID}
              onChange={(e) =>
                setFormData({ ...formData, GiangVienID: e.target.value })
              }
            >
              <option value="">-- Chọn giảng viên --</option>
              {(dropdownData.giangViens || []).map((g) => (
                <option key={g.GiangVienID} value={g.GiangVienID}>
                  {g.HoTen}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] ml-1">
                Sĩ số tối đa
              </label>
              <input
                type="number"
                min="10"
                className="w-full px-5 py-3.5 bg-gray-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-gray-700"
                value={formData.SoLuongToiDa}
                onChange={(e) =>
                  setFormData({ ...formData, SoLuongToiDa: e.target.value })
                }
              />
            </div>
            <div className="flex items-center justify-center pt-4">
              <div className="bg-amber-50 text-amber-600 px-4 py-2 rounded-xl border border-amber-100 flex items-center gap-2">
                <Users size={16} />
                <span className="text-[10px] font-black uppercase">
                  Chỉ tiêu SV
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] ml-1 flex items-center gap-2">
                <Calendar size={12} /> Ngày bắt đầu
              </label>
              <input
                type="date"
                disabled
                className="w-full px-5 py-3.5 bg-gray-100 border-none rounded-2xl outline-none font-bold text-gray-500 cursor-not-allowed"
                value={formData.NgayBatDau}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] ml-1 flex items-center gap-2">
                <Timer size={12} /> Ngày kết thúc
              </label>
              <input
                type="date"
                disabled
                className="w-full px-5 py-3.5 bg-gray-100 border-none rounded-2xl outline-none font-bold text-gray-500 cursor-not-allowed"
                value={formData.NgayKetThuc}
              />
            </div>
          </div>
        </form>

        <div className="px-10 py-8 bg-gray-50 border-t border-gray-100 flex justify-end gap-4">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3.5 text-xs font-black text-gray-400 uppercase tracking-widest hover:text-gray-600"
          >
            Hủy bỏ
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            className="px-8 py-3.5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95"
          >
            {editingLop ? "Cập nhật thiết lập" : "Tiến hành mở lớp"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LopHocPhanModal;
