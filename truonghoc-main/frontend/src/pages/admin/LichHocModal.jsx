import React, { useState, useEffect } from "react";
import { Clock, X, Plus, Trash2, MapPin, Activity, Layers } from "lucide-react";

const LichHocModal = ({ isOpen, onClose, lopHocPhan, onSave }) => {
  const [lichHoc, setLichHoc] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (lopHocPhan && isOpen) {
      // Đảm bảo dữ liệu lịch học là mảng từ dữ liệu lớp được chọn
      // Lấy duy nhất theo Thứ (Thu) để tránh hiển thị lặp lại các tuần trong Modal
      const rawLichHoc = Array.isArray(lopHocPhan.lich_hoc_details)
        ? lopHocPhan.lich_hoc_details
        : [];
      const uniqueLich = Array.from(
        new Map(
          rawLichHoc
            .filter((item) => item !== null)
            .map((item) => [
              item.Thu ||
                item.thu ||
                (item.NgayHoc ? new Date(item.NgayHoc).getDay() + 1 : 2),
              item,
            ]),
        ).values(),
      );

      const normalizedLich = uniqueLich.map((item) => ({
        NgayHoc: parseInt(item.Thu || item.thu || 2) || 2,
        TietBatDau: item.TietBatDau || item.tiet_bat_dau || 1,
        SoTiet: item.SoTiet || item.so_tiet || 3,
        PhongHoc: item.PhongHoc || item.phong_hoc || "",
      }));
      setLichHoc(normalizedLich);
    }
    setError("");
  }, [lopHocPhan, isOpen]);

  if (!isOpen) return null;

  const handleAddRow = () => {
    setLichHoc([
      ...lichHoc,
      { NgayHoc: 2, TietBatDau: 1, SoTiet: 3, PhongHoc: "" },
    ]);
  };

  const handleRemoveRow = (index) => {
    setLichHoc(lichHoc.filter((_, i) => i !== index));
  };

  const handleChange = (index, field, value) => {
    const updated = [...lichHoc];
    // Chuyển đổi sang số cho các trường định lượng
    if (field === "PhongHoc") updated[index][field] = value;
    else if (field === "NgayHoc") updated[index][field] = parseInt(value);
    else updated[index][field] = parseInt(value) || 0;

    setLichHoc(updated);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Kiểm tra tính hợp lệ của tiết học
    const isInvalid = lichHoc.some(
      (item) => item.TietBatDau + item.SoTiet - 1 > 12,
    );
    if (isInvalid) {
      setError(
        "Lỗi: Tổng tiết bắt đầu và số tiết không được vượt quá tiết 12.",
      );
      return;
    }

    if (lichHoc.some((item) => !item.PhongHoc)) {
      setError("Vui lòng nhập đầy đủ phòng học cho các buổi.");
      return;
    }

    const formattedLichHoc = lichHoc.map((item) => ({
      NgayHoc: Number(item.NgayHoc),
      TietBatDau: Number(item.TietBatDau),
      SoTiet: Number(item.SoTiet),
      PhongHoc: item.PhongHoc,
      BuoiHoc: Number(item.TietBatDau) <= 6 ? "Sáng" : "Chiều",
    }));

    console.log("Payload Lịch học:", formattedLichHoc);
    onSave(formattedLichHoc);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl border border-gray-50 overflow-hidden flex flex-col relative">
        {/* Decoration blobs */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-50/50 rounded-full -mr-10 -mt-10 blur-3xl pointer-events-none" />

        <div className="relative px-10 py-8 border-b border-gray-100 flex justify-between items-center bg-white">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600">
              <Clock size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-gray-900 tracking-tight">
                Phân lịch giảng dạy
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">
                  {lopHocPhan?.MaLopHP}
                </span>
                <span className="w-1 h-1 rounded-full bg-gray-300" />
                <span className="text-[10px] font-bold text-gray-400 uppercase">
                  {lopHocPhan?.mon_hoc?.TenMon}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="mx-10 mt-6 p-4 bg-rose-50 text-rose-600 text-[11px] font-black uppercase tracking-tight rounded-2xl border border-rose-100 flex items-center gap-2">
            <Activity size={14} />
            {error}
          </div>
        )}

        <div className="relative p-10 overflow-y-auto max-h-[65vh] custom-scrollbar">
          <div
            className={`mb-8 p-6 rounded-[2rem] border-2 border-dashed ${lichHoc.length > 0 ? "bg-emerald-50/30 border-emerald-100" : "bg-gray-50/50 border-gray-100"}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                  Trạng thái hiện tại
                </p>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${lichHoc.length > 0 ? "bg-emerald-500 animate-pulse" : "bg-gray-300"}`}
                  />
                  <h4
                    className={`text-sm font-black uppercase tracking-tight ${lichHoc.length > 0 ? "text-emerald-700" : "text-gray-400"}`}
                  >
                    {lichHoc.length > 0
                      ? "Đã thiết lập khung giờ dạy"
                      : "Chưa cấu hình lịch học"}
                  </h4>
                </div>
              </div>
              <div className="bg-white px-4 py-2 rounded-2xl shadow-sm border border-gray-100">
                <span className="text-xl font-black text-indigo-600">
                  {lichHoc.length}
                </span>
                <span className="ml-1 text-[10px] font-bold text-gray-400 uppercase">
                  buổi / tuần
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <table className="w-full text-left">
              <thead className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em]">
                <tr>
                  <th className="pb-4 px-2">Ngày học</th>
                  <th className="pb-4 px-2 text-center">Tiết BD</th>
                  <th className="pb-4 px-2 text-center">Số tiết</th>
                  <th className="pb-4 px-2">Phòng học</th>
                  <th className="pb-4 px-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {lichHoc.map((item, index) => (
                  <tr key={index} className="group">
                    <td className="py-3 px-1">
                      <select
                        className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-2xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer"
                        value={item.NgayHoc}
                        onChange={(e) =>
                          handleChange(index, "NgayHoc", e.target.value)
                        }
                      >
                        {[2, 3, 4, 5, 6, 7, 8].map((d) => (
                          <option key={d} value={d}>
                            {d === 8 ? "Chủ Nhật" : `Thứ ${d}`}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 px-1">
                      <input
                        type="number"
                        min="1"
                        max="12"
                        className="w-full px-2 py-2.5 bg-gray-50 border-none rounded-2xl text-xs font-black text-center outline-none focus:ring-2 focus:ring-indigo-500"
                        value={item.TietBatDau}
                        onChange={(e) =>
                          handleChange(index, "TietBatDau", e.target.value)
                        }
                      />
                    </td>
                    <td className="py-3 px-1">
                      <input
                        type="number"
                        min="1"
                        max="6"
                        className="w-full px-2 py-2.5 bg-gray-50 border-none rounded-2xl text-xs font-black text-center outline-none focus:ring-2 focus:ring-indigo-500"
                        value={item.SoTiet}
                        onChange={(e) =>
                          handleChange(index, "SoTiet", e.target.value)
                        }
                      />
                    </td>
                    <td className="py-3 px-1">
                      <div className="relative">
                        <MapPin
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300"
                          size={12}
                        />
                        <input
                          type="text"
                          placeholder="A1-102"
                          className="w-full pl-8 pr-4 py-2.5 bg-gray-50 border-none rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                          value={item.PhongHoc || ""}
                          onChange={(e) =>
                            handleChange(index, "PhongHoc", e.target.value)
                          }
                        />
                      </div>
                    </td>
                    <td className="py-3 px-1 text-right">
                      <button
                        onClick={() => handleRemoveRow(index)}
                        className="p-2 text-gray-300 hover:text-rose-500 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            onClick={handleAddRow}
            className="mt-6 w-full py-4 bg-gray-50 text-gray-400 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center gap-2 group"
          >
            <Plus
              size={14}
              className="group-hover:rotate-90 transition-transform"
            />{" "}
            Thêm buổi học mới
          </button>
        </div>

        <div className="px-10 py-8 bg-gray-50 border-t border-gray-100 flex justify-end gap-4">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3.5 text-xs font-black text-gray-400 uppercase tracking-widest hover:text-gray-600"
          >
            Hủy bỏ
          </button>
          <button
            onClick={handleSubmit}
            className="px-8 py-3.5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95"
          >
            Cập nhật lịch học
          </button>
        </div>
      </div>
    </div>
  );
};

export default LichHocModal;
