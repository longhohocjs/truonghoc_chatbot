import React, { useState, useEffect } from "react";
import {
  Calendar,
  X,
  Plus,
  Trash2,
  MapPin,
  Activity,
  FileText,
} from "lucide-react";

const LichThiModal = ({ isOpen, onClose, lopHocPhan, onSave }) => {
  const [lichThi, setLichThi] = useState([]);
  const [errors, setErrors] = useState("");

  useEffect(() => {
    // Sử dụng lich_thi_details từ Backend
    if (lopHocPhan && isOpen) {
      // Lấy dữ liệu lịch thi hiện có hoặc khởi tạo mảng rỗng
      // Chuẩn hóa key từ backend (nếu là snake_case) sang PascalCase để frontend xử lý và backend nhận lại đúng
      const normalizedLich = (lopHocPhan.lich_thi || []).map((item) => ({
        NgayThi: item.NgayThi || item.ngay_thi || "",
        GioBatDau: item.GioBatDau || item.gio_bat_dau || "07:30",
        GioKetThuc: item.GioKetThuc || item.gio_ket_thuc || "09:00",
        PhongThi: item.PhongThi || item.phong_thi || "",
        HinhThucThi: item.HinhThucThi || item.hinh_thuc || "Tự luận",
      }));
      setLichThi(normalizedLich);
    }
    setErrors("");
  }, [lopHocPhan, isOpen]);

  if (!isOpen) return null;

  const handleAddRow = () => {
    setLichThi([
      ...lichThi,
      {
        NgayThi: "",
        GioBatDau: "07:30",
        GioKetThuc: "09:00",
        PhongThi: "",
        HinhThucThi: "Tự luận",
      },
    ]);
  };

  const handleRemoveRow = (index) => {
    setLichThi(lichThi.filter((_, i) => i !== index));
  };

  const handleChange = (index, field, value) => {
    const updated = [...lichThi];
    updated[index][field] = value;
    setLichThi(updated);
  };

  const validateLocal = () => {
    for (let i = 0; i < lichThi.length; i++) {
      for (let j = i + 1; j < lichThi.length; j++) {
        const row1 = lichThi[i];
        const row2 = lichThi[j];

        if (row1.NgayThi && row2.NgayThi && row1.NgayThi === row2.NgayThi) {
          const isOverlapping = !(
            row1.GioKetThuc <= row2.GioBatDau ||
            row2.GioKetThuc <= row1.GioBatDau
          );
          if (
            isOverlapping &&
            row1.PhongThi === row2.PhongThi &&
            row1.PhongThi !== ""
          ) {
            return `Xung đột: Buổi ${i + 1} và buổi ${j + 1} đang trùng phòng ${row1.PhongThi} vào cùng khoảng thời gian.`;
          }
        }
      }
    }
    return null;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (lichThi.some((item) => !item.NgayThi || !item.PhongThi)) {
      setErrors(
        "Vui lòng nhập đầy đủ ngày thi và phòng thi cho tất cả các buổi.",
      );
      return;
    }

    const errorMsg = validateLocal();
    if (errorMsg) {
      setErrors(errorMsg);
      return;
    }

    // Đảm bảo định dạng giờ gửi lên có giây (:00) để tránh lỗi 422
    const formattedLichThi = lichThi.map((item) => ({
      NgayThi: item.NgayThi,
      PhongThi: item.PhongThi || item.PhongHoc, // Đảm bảo không bị null
      HinhThucThi: item.HinhThucThi,
      GioBatDau:
        item.GioBatDau?.length === 5 ? `${item.GioBatDau}:00` : item.GioBatDau,
      GioKetThuc:
        item.GioKetThuc?.length === 5
          ? `${item.GioKetThuc}:00`
          : item.GioKetThuc,
    }));

    console.log("Payload Lịch thi:", formattedLichThi);
    onSave(formattedLichThi);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col border border-gray-100">
        <div className="px-8 py-5 border-b border-gray-50 flex justify-between items-center bg-white">
          <div>
            <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">
              Phân lịch thi
            </h3>
            <p className="text-xs font-bold text-blue-600">
              LỚP: {lopHocPhan?.MaLopHP} | MÔN: {lopHocPhan?.mon_hoc?.TenMon}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition-all"
          >
            &times;
          </button>
        </div>

        {errors && ( // Hiển thị lỗi cục bộ
          <div className="mx-8 mt-4 p-3 bg-red-50 text-red-600 text-xs font-bold rounded-xl border border-red-100">
            {errors}
          </div>
        )}

        <div className="p-8 overflow-y-auto max-h-[60vh] custom-scrollbar">
          {/* Khung trạng thái đơn giản */}
          <div
            className={`mb-8 p-5 rounded-2xl border-2 border-dashed ${lichThi.length > 0 ? "bg-green-50/50 border-green-200" : "bg-gray-50 border-gray-200"}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                  Trạng thái hiện tại
                </p>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${lichThi.length > 0 ? "bg-purple-500 animate-pulse" : "bg-gray-300"}`}
                  />
                  <h4
                    className={`text-sm font-black uppercase tracking-tight ${lichThi.length > 0 ? "text-purple-700" : "text-gray-400"}`}
                  >
                    {lichThi.length > 0
                      ? "Đã lập kế hoạch khảo thí"
                      : "Đang trống lịch thi"}
                  </h4>
                </div>
              </div>
              <div className="bg-white px-4 py-2 rounded-2xl shadow-sm border border-gray-100">
                <span className="text-xl font-black text-purple-600">
                  {lichThi.length}
                </span>
                <span className="ml-1 text-[10px] font-bold text-gray-400 uppercase">
                  buổi thi
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <table className="w-full text-left border-separate border-spacing-y-2">
              <thead className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em]">
                <tr>
                  <th className="pb-2 px-2">Ngày tổ chức</th>
                  <th className="pb-2 px-2">Khung giờ</th>
                  <th className="pb-2 px-2">Phòng / Hình thức</th>
                  <th className="pb-2 px-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50/50">
                {lichThi.map((item, index) => (
                  <tr key={index} className="group bg-gray-50/30 rounded-2xl">
                    <td className="py-4 px-2 align-top">
                      <input
                        type="date"
                        className="w-full px-4 py-2.5 bg-white border-none rounded-2xl text-xs font-bold focus:ring-2 focus:ring-purple-500 outline-none shadow-sm"
                        value={item.NgayThi || ""}
                        onChange={(e) =>
                          handleChange(index, "NgayThi", e.target.value)
                        }
                      />
                    </td>
                    <td className="py-4 px-2 align-top">
                      <div className="flex items-center gap-1">
                        <input
                          type="time"
                          className="w-full px-2 py-2.5 bg-white border-none rounded-2xl text-xs font-black text-center outline-none focus:ring-2 focus:ring-purple-500 shadow-sm"
                          value={item.GioBatDau || ""}
                          onChange={(e) =>
                            handleChange(index, "GioBatDau", e.target.value)
                          }
                        />
                        <span className="text-gray-300">-</span>
                        <input
                          type="time"
                          className="w-full px-2 py-2.5 bg-white border-none rounded-2xl text-xs font-black text-center outline-none focus:ring-2 focus:ring-purple-500 shadow-sm"
                          value={item.GioKetThuc || ""}
                          onChange={(e) =>
                            handleChange(index, "GioKetThuc", e.target.value)
                          }
                        />
                      </div>
                    </td>
                    <td className="py-4 px-2 align-top space-y-2">
                      <div className="relative">
                        <MapPin
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300"
                          size={12}
                        />
                        <input
                          type="text"
                          placeholder="Phòng thi"
                          className="w-full pl-8 pr-4 py-2.5 bg-white border-none rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-purple-500 shadow-sm"
                          value={item.PhongThi || ""}
                          onChange={(e) =>
                            handleChange(index, "PhongThi", e.target.value)
                          }
                        />
                      </div>
                      <div className="relative">
                        <FileText
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300"
                          size={12}
                        />
                        <select
                          className="w-full pl-8 pr-4 py-2.5 bg-white border-none rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-purple-500 shadow-sm appearance-none"
                          value={item.HinhThucThi || "Tự luận"}
                          onChange={(e) =>
                            handleChange(index, "HinhThucThi", e.target.value)
                          }
                        >
                          <option value="Tự luận">Tự luận</option>
                          <option value="Trắc nghiệm">Trắc nghiệm</option>
                          <option value="Báo cáo">Báo cáo</option>
                        </select>
                      </div>
                    </td>
                    <td className="py-4 px-1 text-right align-middle">
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
            className="mt-6 w-full py-4 bg-gray-50 text-gray-400 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest hover:bg-purple-600 hover:text-white transition-all flex items-center justify-center gap-2 group"
          >
            <Plus
              size={14}
              className="group-hover:rotate-90 transition-transform"
            />{" "}
            Thêm buổi thi mới
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
            className="px-8 py-3.5 bg-purple-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-purple-100 hover:bg-purple-700 transition-all active:scale-95"
          >
            Cập nhật lịch thi
          </button>
        </div>
      </div>
    </div>
  );
};

export default LichThiModal;
