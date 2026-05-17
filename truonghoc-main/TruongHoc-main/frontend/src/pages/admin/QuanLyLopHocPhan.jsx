import React, { useState, useEffect } from "react";
import axiosClient from "@/api/axios";
import toast from "react-hot-toast";
import LopHocPhanModal from "./LopHocPhanModal";
import LichHocModal from "./LichHocModal";
import LichThiModal from "./LichThiModal";
import ConfirmModal from "@/components/ConfirmModal";
import {
  School,
  Plus,
  Search,
  Calendar,
  Clock,
  Pencil,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
} from "lucide-react";

const QuanLyLopHocPhan = () => {
  const [lops, setLops] = useState([]);
  const [activeTab, setActiveTab] = useState("opening"); // opening, closed, cancelled
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLichModalOpen, setIsLichModalOpen] = useState(false);
  const [isThiModalOpen, setIsThiModalOpen] = useState(false);
  const [editingLop, setEditingLop] = useState(null);
  const [selectedLopForLich, setSelectedLopForLich] = useState(null);
  const [selectedLopForThi, setSelectedLopForThi] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [confirmConfig, setConfirmConfig] = useState({
    isOpen: false,
    id: null,
  });
  const [dropdownData, setDropdownData] = useState({
    monHocs: [],
    giangViens: [],
    hocKys: [],
    dots: [],
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      // Helper để trích xuất mảng dữ liệu an toàn (Chống trang trắng)
      const getArray = (res) => {
        const payload = res?.data || res;
        if (Array.isArray(payload)) return payload;
        if (payload?.data && Array.isArray(payload.data)) return payload.data;
        return [];
      };

      const [resLops, resMons, resGVs, resHKs, resDots] = await Promise.all([
        axiosClient.get("/admin/lop-hoc-phan"),
        axiosClient.post("/admin/mon-hoc/list"),
        axiosClient.post("/admin/users/giang-vien/index"),
        axiosClient.get("/admin/hoc-ky"),
        axiosClient.post("/admin/dot-dang-ky/filter", { HocKyID: "" }),
      ]);

      setLops(getArray(resLops));
      setDropdownData({
        monHocs: getArray(resMons),
        giangViens: getArray(resGVs),
        hocKys: getArray(resHKs),
        dots: getArray(resDots),
      });
    } catch (error) {
      console.error("Lỗi khi tải dữ liệu lớp học phần:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSave = async (data) => {
    try {
      if (editingLop) {
        await axiosClient.patch("/admin/lop-hoc-phan/update", data);
      } else {
        await axiosClient.post("/admin/lop-hoc-phan", data);
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      const msg =
        error.response?.data?.error ||
        error.response?.data?.message ||
        "Lỗi khi lưu lớp học phần";
      console.error("Chi tiết lỗi:", error.response?.data);
      alert(msg);
    }
  };

  const handleSaveLich = async (lichHoc) => {
    try {
      const res = await axiosClient.post("/admin/lich-hoc/create", {
        LopHocPhanID: selectedLopForLich.LopHocPhanID, // Backend yêu cầu ID lớp để gắn lịch
        lich_hoc: lichHoc,
      });
      toast.success(res.message || "Cập nhật lịch học thành công");
      setIsLichModalOpen(false);
      fetchData();
    } catch (error) {
      console.error("Lỗi lịch học:", error.response?.data);
      alert(error.response?.data?.error || "Lỗi khi lưu lịch học.");
    }
  };

  const handleSaveThi = async (lichThi) => {
    try {
      const res = await axiosClient.post("/admin/lich-thi/create", {
        LopHocPhanID: selectedLopForThi.LopHocPhanID, // Backend yêu cầu ID lớp để gắn lịch thi
        lich_thi: lichThi,
      });
      toast.success(res.message || "Cập nhật lịch thi thành công");
      setIsThiModalOpen(false);
      fetchData();
    } catch (error) {
      const errorMsg =
        error.response?.data?.message ||
        "Lỗi khi lưu lịch thi. Có thể do trùng lịch phòng hoặc giảng viên.";
      alert(errorMsg);
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await axiosClient.delete(`/admin/lop-hoc-phan/${id}`);
      toast.success(res.message || "Xóa lớp học phần thành công");
      fetchData();
    } catch (error) {
      console.error("Lỗi khi xóa lớp:", error);
    }
  };

  // Hàm kiểm tra logic lớp có đủ điều kiện mở hay không (dựa trên 50% sĩ số sau khi hết hạn đăng ký)
  const isFailedQuota = (lop) => {
    const now = new Date();
    // Tìm các đợt đăng ký thuộc học kỳ của lớp này
    const relevantDots =
      dropdownData.dots?.filter((d) => d.HocKyID === lop.HocKyID) || [];
    if (relevantDots.length === 0) return false;

    // Kiểm tra xem tất cả các đợt đăng ký của học kỳ này đã kết thúc chưa
    const allDotsEnded = relevantDots.every(
      (d) => now > new Date(d.NgayKetThuc),
    );

    // Nếu đã hết hạn đăng ký mà sĩ số hiện tại < 50% sĩ số tối đa
    return allDotsEnded && (lop.SoLuongHienTai || 0) < lop.SoLuongToiDa * 0.5;
  };

  const getLopStatus = (lop) => {
    if (lop.TrangThai === 0 || isFailedQuota(lop)) return "cancelled";

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const ngayKetThuc = new Date(lop.NgayKetThuc);

    return ngayKetThuc < now ? "closed" : "opening";
  };

  const filteredLops = lops.filter((l) => {
    const matchesSearch =
      l.MaLopHP?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.mon_hoc?.TenMon?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesTab = getLopStatus(l) === activeTab;

    return matchesSearch && matchesTab;
  });

  const counts = {
    opening: lops.filter((l) => getLopStatus(l) === "opening").length,
    closed: lops.filter((l) => getLopStatus(l) === "closed").length,
    cancelled: lops.filter((l) => getLopStatus(l) === "cancelled").length,
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fadeIn pb-10">
      {/* Unified Header */}
      <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-50/40 rounded-full -mr-20 -mt-20 blur-3xl" />

        <div className="relative flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-6">
            <div className="p-4 bg-indigo-600 rounded-3xl text-white shadow-lg shadow-indigo-100">
              <School size={32} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                Quản lý Lớp học phần
              </h2>
              <p className="text-gray-500 text-sm font-medium">
                Điều phối kế hoạch giảng dạy, phân công nhân sự và quản lý sĩ số
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setEditingLop(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 bg-gray-900 text-white px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-xl shadow-gray-200 active:scale-95"
          >
            <Plus size={18} /> Mở Lớp học phần
          </button>
        </div>
      </div>

      {/* Tabs & Search Bar */}
      <div className="flex flex-col lg:flex-row gap-6 justify-between items-end lg:items-center">
        <div className="bg-white p-1.5 rounded-2xl border border-gray-100 flex gap-1 shadow-sm overflow-x-auto w-full lg:w-auto">
          <TabButton
            active={activeTab === "opening"}
            onClick={() => setActiveTab("opening")}
            label="Đang mở"
            count={counts.opening}
            color="indigo"
          />
          <TabButton
            active={activeTab === "closed"}
            onClick={() => setActiveTab("closed")}
            label="Đã đóng"
            count={counts.closed}
            color="gray"
          />
          <TabButton
            active={activeTab === "cancelled"}
            onClick={() => setActiveTab("cancelled")}
            label="Đã hủy"
            count={counts.cancelled}
            color="rose"
          />
        </div>

        <div className="relative flex-1 w-full md:w-auto">
          <Search
            className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400"
            size={18}
          />
          <input
            type="text"
            placeholder="Tìm kiếm trong danh sách này..."
            className="w-full pl-14 pr-6 py-4 bg-white border border-gray-100 rounded-[1.5rem] outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm font-bold shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Table Area */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50/50 text-gray-400 text-[10px] uppercase font-bold tracking-[0.15em] border-b border-gray-100">
              <tr>
                <th className="px-8 py-5">Định danh Lớp</th>
                <th className="px-6 py-5">Học phần / Giảng viên</th>
                <th className="px-6 py-5">Học kỳ / Thời gian</th>
                <th className="px-6 py-5 text-center">Tình trạng Sĩ số</th>
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
                    className="px-8 py-20 text-center text-gray-400 italic"
                  >
                    Không tìm thấy lớp học phần nào phù hợp
                  </td>
                </tr>
              ) : (
                filteredLops.map((item) => (
                  <tr
                    key={item.LopHocPhanID}
                    className="hover:bg-gray-50/50 transition-all group"
                  >
                    <td className="px-8 py-5">
                      <div className="flex flex-col gap-1.5">
                        <span className="text-sm font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg w-fit">
                          {item.MaLopHP}
                        </span>
                        <div className="flex gap-2">
                          {item.lich_hoc?.length > 0 ? (
                            <span className="flex items-center gap-1 text-[9px] font-black text-emerald-500 uppercase tracking-tighter">
                              <CheckCircle2 size={10} /> Đã có lịch
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-[9px] font-bold text-gray-300 uppercase tracking-tighter">
                              <Clock size={10} /> Trống lịch
                            </span>
                          )}
                          {item.lich_thi_details?.length > 0 ? (
                            <span className="flex items-center gap-1 text-[9px] font-black text-purple-500 uppercase tracking-tighter">
                              <CheckCircle2 size={10} /> Đã có thi
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-[9px] font-bold text-gray-300 uppercase tracking-tighter">
                              <Calendar size={10} /> Trống thi
                            </span>
                          )}
                          {/* Hiển thị cảnh báo không đủ số lượng tương tự như bên Quản lý đợt đăng ký */}
                          {isFailedQuota(item) && (
                            <span
                              title="Lớp học phần không đủ số lượng sinh viên tối thiểu (50%) sau khi kết thúc đợt đăng ký"
                              className="flex items-center gap-1 text-[9px] font-black text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100 uppercase w-fit animate-pulse"
                            >
                              <ShieldAlert size={10} /> Không đủ SL mở lớp
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="space-y-1">
                        <p className="text-sm font-black text-gray-900 leading-none">
                          {item.mon_hoc?.TenMon}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-black text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded uppercase">
                            {item.mon_hoc?.SoTinChi} Tín chỉ
                          </span>
                          <span className="text-[10px] font-black text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                            LT: {item.mon_hoc?.TietLyThuyet}
                          </span>
                          <span className="text-[10px] font-black text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                            TH: {item.mon_hoc?.TietThucHanh}
                          </span>
                          <span className="text-[10px] font-bold text-gray-400 border-l border-gray-200 pl-2 uppercase">
                            {item.mon_hoc?.HinhThucHoc || "Trực tiếp"}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-gray-500 mt-1">
                          {item.giang_vien?.HoTen ||
                            "Chưa phân công giảng viên"}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col gap-0.5">
                        <p className="text-sm font-black text-gray-900 leading-none mb-1">
                          {item.hoc_ky?.TenHocKy}
                        </p>
                        <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-tighter">
                          {item.hoc_ky?.nam_hoc?.TenNamHoc}
                        </p>
                        <p className="text-[9px] text-gray-400 font-bold mt-1">
                          {item.NgayBatDau?.substring(0, 10)} →{" "}
                          {item.NgayKetThuc?.substring(0, 10)}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <div className="inline-flex flex-col items-center gap-1">
                        <span className="text-xs font-black text-gray-700">
                          {item.SoLuongHienTai || 0} / {item.SoLuongToiDa} SV
                        </span>
                        <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden border border-gray-50">
                          <div
                            className={`h-full transition-all duration-500 ${item.SoLuongHienTai / item.SoLuongToiDa > 0.9 ? "bg-rose-500" : "bg-indigo-500"}`}
                            style={{
                              width: `${Math.min(((item.SoLuongHienTai || 0) / item.SoLuongToiDa) * 100, 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex justify-end items-center gap-1 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                        <ActionButton
                          icon={<Calendar size={14} />}
                          onClick={() => {
                            setSelectedLopForThi(item);
                            setIsThiModalOpen(true);
                          }}
                          tooltip="Xếp lịch thi"
                          variant="warning"
                        />
                        <ActionButton
                          icon={<Clock size={14} />}
                          onClick={() => {
                            setSelectedLopForLich(item);
                            setIsLichModalOpen(true);
                          }}
                          tooltip="Xếp lịch học"
                          variant="warning"
                        />
                        <ActionButton
                          icon={<Pencil size={14} />}
                          onClick={() => {
                            setEditingLop(item);
                            setIsModalOpen(true);
                          }}
                          tooltip="Chỉnh sửa"
                        />
                        <ActionButton
                          icon={<Trash2 size={14} />}
                          onClick={() =>
                            setConfirmConfig({
                              isOpen: true,
                              id: item.LopHocPhanID,
                            })
                          }
                          tooltip="Xóa lớp"
                          variant="danger"
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <LopHocPhanModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        editingLop={editingLop}
        dropdownData={dropdownData}
      />

      <LichHocModal
        isOpen={isLichModalOpen}
        onClose={() => setIsLichModalOpen(false)}
        onSave={handleSaveLich}
        lopHocPhan={selectedLopForLich}
      />

      <LichThiModal
        isOpen={isThiModalOpen}
        onClose={() => setIsThiModalOpen(false)}
        onSave={handleSaveThi}
        lopHocPhan={selectedLopForThi}
      />

      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        onClose={() => setConfirmConfig({ isOpen: false, id: null })}
        onConfirm={() => handleDelete(confirmConfig.id)}
        title="Xóa lớp học phần"
        message="Bạn có chắc chắn muốn xóa lớp học phần này? Hệ thống sẽ ngăn chặn việc xóa nếu đã có sinh viên đăng ký học."
      />
    </div>
  );
};

const TabButton = ({ active, onClick, label, count, color }) => {
  const colors = {
    indigo: active
      ? "bg-indigo-600 text-white shadow-indigo-100"
      : "text-gray-400 hover:text-indigo-600",
    gray: active
      ? "bg-gray-600 text-white shadow-gray-100"
      : "text-gray-400 hover:text-gray-600",
    rose: active
      ? "bg-rose-600 text-white shadow-rose-100"
      : "text-gray-400 hover:text-rose-600",
  };

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-transparent
        ${colors[color]}`}
    >
      {label}
      <span
        className={`px-2 py-0.5 rounded-lg text-[10px] ${active ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"}`}
      >
        {count}
      </span>
    </button>
  );
};

const ActionButton = ({ icon, onClick, variant = "default", tooltip }) => {
  const variants = {
    default:
      "bg-white text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 border-gray-100",
    danger:
      "bg-white text-gray-400 hover:text-rose-600 hover:bg-rose-50 border-gray-100",
    warning:
      "bg-white text-gray-400 hover:text-amber-600 hover:bg-amber-50 border-gray-100",
  };

  return (
    <button
      onClick={onClick}
      title={tooltip}
      className={`p-2.5 rounded-xl border transition-all shadow-sm active:scale-90 ${variants[variant]}`}
    >
      {icon}
    </button>
  );
};

export default QuanLyLopHocPhan;
