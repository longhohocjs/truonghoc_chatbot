import React, { useEffect, useState } from "react";
import { X, BookOpen, Layers, Info } from "lucide-react";

const MonHocModal = ({
  isOpen,
  onClose,
  onSave,
  editingMonHoc,
  faculties = [],
}) => {
  const [formData, setFormData] = useState({
    TenMon: "",
    SoTinChi: 2,
    LoaiMonHoc: "Lý thuyết",
    TietLyThuyet: 30,
    TietThucHanh: 0,
    HinhThucHoc: "Trực tiếp",
    KhoaID: "",
  });

  // Logic tự động tính toán số tiết và tín chỉ dựa trên Loại môn học
  useEffect(() => {
    if (isOpen) {
      let newTinChi = formData.SoTinChi;
      let newLT = 0;
      let newTH = 0;

      switch (formData.LoaiMonHoc) {
        case "Lý thuyết":
          newTinChi = 2;
          newLT = 30; // 2 tín LT * 15
          newTH = 0;
          break;
        case "Tích hợp":
          newTinChi = 3;
          newLT = 30; // 2 tín LT * 15
          newTH = 30; // 1 tín TH * 30
          break;
        case "Đồ án":
        case "Thực tập":
          newTinChi = 5;
          newLT = 0;
          newTH = 150; // 5 tín TH * 30
          break;
        case "Thực hành":
          newLT = 0;
          newTH = formData.SoTinChi * 30;
          break;
        default:
          break;
      }

      // Chỉ cập nhật nếu có sự thay đổi để tránh vòng lặp re-render
      if (
        newTinChi !== formData.SoTinChi ||
        newLT !== formData.TietLyThuyet ||
        newTH !== formData.TietThucHanh
      ) {
        setFormData((prev) => ({
          ...prev,
          SoTinChi: newTinChi,
          TietLyThuyet: newLT,
          TietThucHanh: newTH,
        }));
      }
    }
  }, [formData.LoaiMonHoc, formData.SoTinChi, isOpen]);

  useEffect(() => {
    if (editingMonHoc) {
      setFormData(editingMonHoc);
    } else {
      setFormData({
        TenMon: "",
        SoTinChi: 2,
        LoaiMonHoc: "Lý thuyết",
        TietLyThuyet: 30,
        TietThucHanh: 0,
        HinhThucHoc: "Trực tiếp",
        KhoaID: faculties[0]?.KhoaID || "",
      });
    }
  }, [editingMonHoc, isOpen, faculties]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl animate-zoomIn">
        <div className="bg-indigo-600 p-6 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <BookOpen size={24} />
            <h3 className="text-xl font-black uppercase tracking-tight">
              {editingMonHoc ? "Cập nhật Môn học" : "Thêm Môn học mới"}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="hover:rotate-90 transition-transform"
          >
            <X size={24} />
          </button>
        </div>

        <form
          className="p-8 space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            onSave(formData);
          }}
        >
          <div>
            <label className="block text-[10px] font-black uppercase text-gray-400 mb-2 ml-1">
              Tên môn học
            </label>
            <input
              type="text"
              required
              className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 font-bold transition-all"
              value={formData.TenMon}
              onChange={(e) =>
                setFormData({ ...formData, TenMon: e.target.value })
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase text-gray-400 mb-2 ml-1">
                Loại môn học
              </label>
              <select
                className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 font-bold transition-all"
                value={formData.LoaiMonHoc}
                onChange={(e) =>
                  setFormData({ ...formData, LoaiMonHoc: e.target.value })
                }
              >
                <option value="Lý thuyết">Lý thuyết</option>
                <option value="Thực hành">Thực hành</option>
                <option value="Tích hợp">Tích hợp (LT+TH)</option>
                <option value="Đồ án">Đồ án</option>
                <option value="Thực tập">Thực tập</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-gray-400 mb-2 ml-1">
                Số tín chỉ
              </label>
              <input
                type="number"
                disabled={formData.LoaiMonHoc !== "Thực hành"}
                className="w-full px-5 py-3.5 bg-gray-100 border border-gray-100 rounded-2xl outline-none font-black text-indigo-600 disabled:opacity-70 transition-all"
                value={formData.SoTinChi}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    SoTinChi: parseInt(e.target.value),
                  })
                }
              />
            </div>
          </div>

          <div className="bg-indigo-50/50 p-5 rounded-[1.5rem] border border-indigo-100 flex justify-between items-center relative overflow-hidden">
            <div className="absolute right-0 top-0 opacity-10 -mr-4 -mt-4">
              <Layers size={80} />
            </div>
            <div className="flex-1 text-center border-r border-indigo-100">
              <p className="text-[9px] font-black text-indigo-400 uppercase">
                Tiết Lý thuyết
              </p>
              <p className="text-2xl font-black text-indigo-600">
                {formData.TietLyThuyet}
              </p>
            </div>
            <div className="flex-1 text-center">
              <p className="text-[9px] font-black text-indigo-400 uppercase">
                Tiết Thực hành
              </p>
              <p className="text-2xl font-black text-indigo-600">
                {formData.TietThucHanh}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase text-gray-400 mb-2 ml-1">
                Hình thức học
              </label>
              <select
                className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 font-bold transition-all"
                value={formData.HinhThucHoc}
                onChange={(e) =>
                  setFormData({ ...formData, HinhThucHoc: e.target.value })
                }
              >
                <option value="Trực tiếp">Trực tiếp</option>
                <option value="Trực tuyến">Trực tuyến</option>
                <option value="Tín chỉ">Tín chỉ</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-gray-400 mb-2 ml-1">
                Khoa quản lý
              </label>
              <select
                className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 font-bold transition-all"
                value={formData.KhoaID}
                onChange={(e) =>
                  setFormData({ ...formData, KhoaID: e.target.value })
                }
              >
                {faculties.map((k) => (
                  <option key={k.KhoaID} value={k.KhoaID}>
                    {k.TenKhoa}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-start gap-2 text-[10px] text-gray-400 font-bold italic bg-gray-50 p-3 rounded-xl">
            <Info size={14} className="mt-0.5 text-indigo-400" />
            <p>
              Hệ thống tự động tính số tiết dựa trên loại môn học (1 tín LT = 15
              tiết, 1 tín TH = 30 tiết). Tín chỉ bị khóa theo quy định cho loại
              Lý thuyết, Tích hợp và Đồ án.
            </p>
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest text-gray-500 bg-gray-100 hover:bg-gray-200 transition-all"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="flex-[2] px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all active:scale-95"
            >
              Lưu thông tin
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MonHocModal;
