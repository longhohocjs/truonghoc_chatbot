import React, { useState, useEffect } from "react";
import { X, GraduationCap, BookOpen, Layers, CheckCircle2 } from "lucide-react";

const ChuongTrinhDaoTaoModal = ({
  isOpen,
  onClose,
  onSave,
  editingItem,
  faculties = [],
  allMajors = [],
  subjects = [],
}) => {
  const [formData, setFormData] = useState({
    KhoaID: "",
    NganhID: "",
    MonHocIDs: [], // Dùng cho thêm nhiều
    MonHocID: "", // Dùng cho sửa
    HocKyGoiY: 1,
    KhoiKienThuc: "DaiCuong",
    BatBuoc: true,
  });

  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (editingItem) {
      setFormData({
        KhoaID: editingItem.nganh_dao_tao?.KhoaID || "",
        NganhID: editingItem.NganhID || "",
        MonHocID: editingItem.MonHocID || "",
        MonHocIDs: [editingItem.MonHocID],
        HocKyGoiY: editingItem.HocKyGoiY || 1,
        // Kiểm tra cả hai trường hợp đặt tên thuộc tính
        KhoiKienThuc:
          editingItem.KhoiKienThuc || editingItem.khoi_kien_thuc || "DaiCuong",
        BatBuoc: editingItem.BatBuoc ?? true,
      });
    } else {
      setFormData({
        KhoaID: faculties[0]?.KhoaID || "",
        NganhID: "",
        MonHocIDs: [],
        MonHocID: "",
        HocKyGoiY: 1,
        KhoiKienThuc: "DaiCuong",
        BatBuoc: true,
      });
    }
    setSearchTerm("");
  }, [editingItem, isOpen, faculties]);

  if (!isOpen) return null;

  const filteredMajors = allMajors.filter((m) => m.KhoaID == formData.KhoaID);

  const filteredSubjects = subjects.filter(
    (s) =>
      s.TenMon.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.MaMon.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const toggleSubject = (id) => {
    if (editingItem) return; // Không cho đổi môn khi đang sửa
    setFormData((prev) => ({
      ...prev,
      MonHocIDs: prev.MonHocIDs.includes(id)
        ? prev.MonHocIDs.filter((item) => item !== id)
        : [...prev.MonHocIDs, id],
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col border border-gray-50 relative">
        <div className="px-10 py-8 border-b border-gray-100 flex justify-between items-center bg-white">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600">
              <GraduationCap size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-gray-900 tracking-tight">
                {editingItem
                  ? "Chỉnh sửa học phần CTĐT"
                  : "Thiết lập khung chương trình"}
              </h3>
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mt-0.5">
                Quản lý lộ trình đào tạo
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
          className="p-10 space-y-6 overflow-y-auto max-h-[70vh] custom-scrollbar"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                Khoa quản lý
              </label>
              <select
                className="w-full px-5 py-3.5 bg-gray-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-gray-700"
                value={formData.KhoaID}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    KhoaID: e.target.value,
                    NganhID: "",
                  })
                }
                disabled={!!editingItem}
              >
                <option value="">-- Chọn Khoa --</option>
                {faculties.map((f) => (
                  <option key={f.KhoaID} value={f.KhoaID}>
                    {f.TenKhoa}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                Ngành đào tạo
              </label>
              <select
                required
                className="w-full px-5 py-3.5 bg-gray-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-gray-700"
                value={formData.NganhID}
                onChange={(e) =>
                  setFormData({ ...formData, NganhID: e.target.value })
                }
                disabled={!!editingItem}
              >
                <option value="">-- Chọn ngành --</option>
                {filteredMajors.map((m) => (
                  <option key={m.NganhID} value={m.NganhID}>
                    {m.TenNganh}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                Học kỳ gợi ý
              </label>
              <input
                type="number"
                min="1"
                max="12"
                required
                className="w-full px-5 py-3.5 bg-gray-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-gray-700"
                value={formData.HocKyGoiY}
                onChange={(e) =>
                  setFormData({ ...formData, HocKyGoiY: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                Khung chương trình
              </label>
              <select
                className="w-full px-5 py-3.5 bg-gray-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-gray-700"
                value={formData.KhoiKienThuc}
                onChange={(e) =>
                  setFormData({ ...formData, KhoiKienThuc: e.target.value })
                }
              >
                <option value="DaiCuong">1. Đại cương</option>
                <option value="CoSoNganh">2. Cơ sở ngành</option>
                <option value="ChuyenNganh">3. Chuyên ngành</option>
                <option value="TotNghiep">4. Tốt nghiệp</option>
                <option value="ChuanDauRa">5. Chuẩn đầu ra</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                Tính chất môn học
              </label>
              <select
                className="w-full px-5 py-3.5 bg-gray-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-gray-700"
                value={formData.BatBuoc}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    BatBuoc: e.target.value === "true",
                  })
                }
              >
                <option value="true">Bắt buộc</option>
                <option value="false">Tự chọn</option>
              </select>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-end">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                <BookOpen size={12} />{" "}
                {editingItem
                  ? "Môn học đã chọn"
                  : "Chọn các môn học gán vào CTĐT"}
              </label>
              {!editingItem && (
                <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg uppercase">
                  Đã chọn: {formData.MonHocIDs.length} môn
                </span>
              )}
            </div>

            {!editingItem && (
              <input
                type="text"
                placeholder="Tìm nhanh môn học..."
                className="w-full px-4 py-2 text-xs bg-white border border-gray-100 rounded-xl outline-none focus:border-indigo-300"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            )}

            <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto p-2 bg-gray-50 rounded-2xl border border-gray-100 custom-scrollbar">
              {editingItem ? (
                <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-indigo-100">
                  <CheckCircle2 size={18} className="text-indigo-500" />
                  <span className="text-sm font-bold text-gray-700">
                    {editingItem.mon_hoc?.TenMon}
                  </span>
                </div>
              ) : (
                filteredSubjects.map((s) => (
                  <div
                    key={s.MonHocID}
                    onClick={() => toggleSubject(s.MonHocID)}
                    className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border ${
                      formData.MonHocIDs.includes(s.MonHocID)
                        ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100"
                        : "bg-white border-transparent hover:border-indigo-200 text-gray-600"
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className="text-xs font-bold leading-tight">
                        {s.TenMon}
                      </span>
                      <span
                        className={`text-[10px] font-black uppercase ${formData.MonHocIDs.includes(s.MonHocID) ? "text-indigo-200" : "text-gray-300"}`}
                      >
                        {s.MaMon} - {s.SoTinChi} TC
                      </span>
                    </div>
                    {formData.MonHocIDs.includes(s.MonHocID) && (
                      <CheckCircle2 size={16} />
                    )}
                  </div>
                ))
              )}
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
            {editingItem
              ? "Cập nhật thay đổi"
              : `Gán ${formData.MonHocIDs.length} môn vào CTĐT`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChuongTrinhDaoTaoModal;
