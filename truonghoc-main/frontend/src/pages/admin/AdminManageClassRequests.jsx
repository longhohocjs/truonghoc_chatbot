import React, { useState, useEffect } from "react";
import axiosClient from "@/api/axios";
import toast from "react-hot-toast";
import {
  Check,
  X,
  Trash2,
  Clock,
  Inbox,
  Filter,
  User,
  BookOpen,
  AlertCircle,
} from "lucide-react";

const AdminManageClassRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");

  // Helper bóc tách mảng an toàn từ response API (Đồng bộ với style của project)
  const getArray = (res) => {
    const payload = res?.data || res;
    if (Array.isArray(payload)) return payload;
    if (payload?.data && Array.isArray(payload.data)) return payload.data;
    return [];
  };

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get("/admin/yeu-cau-mo-lop");
      setRequests(getArray(res));
    } catch (error) {
      toast.error("Không thể tải danh sách yêu cầu mở lớp");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleUpdateStatus = async (id, status) => {
    try {
      await axiosClient.patch(`/admin/yeu-cau-mo-lop/${id}/status`, { status });
      toast.success(
        status === 1 ? "Đã phê duyệt yêu cầu" : "Đã từ chối yêu cầu",
      );
      fetchRequests();
    } catch (error) {
      toast.error("Lỗi cập nhật trạng thái");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa yêu cầu này?")) return;
    try {
      await axiosClient.delete(`/admin/yeu-cau-mo-lop/${id}`);
      toast.success("Đã xóa yêu cầu");
      fetchRequests();
    } catch (error) {
      toast.error("Lỗi khi xóa yêu cầu");
    }
  };

  const filteredRequests = requests.filter((req) => {
    if (filterStatus === "all") return true;
    return req.TrangThai === parseInt(filterStatus);
  });

  if (loading)
    return (
      <div className="p-10 text-center text-gray-500">
        Đang tải danh sách yêu cầu...
      </div>
    );

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">
            Quản lý yêu cầu mở lớp
          </h2>
          <p className="text-gray-500 text-sm">
            Xem và xử lý nguyện vọng mở lớp học phần từ sinh viên
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-gray-100 shadow-sm">
          <Filter size={16} className="text-gray-400" />
          <select
            className="text-sm font-bold text-gray-700 outline-none bg-transparent"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="0">Đang chờ xử lý</option>
            <option value="1">Đã phê duyệt</option>
            <option value="2">Đã từ chối</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50/50 text-gray-400 text-[10px] uppercase font-bold tracking-widest border-b border-gray-100">
            <tr>
              <th className="px-6 py-4">Sinh viên</th>
              <th className="px-6 py-4">Môn học</th>
              <th className="px-6 py-4">Lý do / Nguyện vọng</th>
              <th className="px-6 py-4">Ngày gửi</th>
              <th className="px-6 py-4 text-center">Trạng thái</th>
              <th className="px-6 py-4 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filteredRequests.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center text-gray-300">
                    <Inbox size={48} className="mb-2 opacity-20" />
                    <p className="italic text-sm">
                      Không có yêu cầu nào phù hợp
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredRequests.map((req) => (
                <tr
                  key={req.YeuCauID}
                  className="hover:bg-gray-50/50 transition-all group"
                >
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-xs border border-indigo-100">
                        {req.sinh_vien?.HoTen?.charAt(0) || "S"}
                      </div>
                      <div>
                        <div className="text-sm font-black text-gray-900 leading-tight">
                          {req.sinh_vien?.HoTen}
                        </div>
                        <div className="text-[10px] text-indigo-500 font-bold uppercase tracking-tighter">
                          {req.sinh_vien?.MaSV}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-bold text-gray-700 leading-tight">
                      {req.mon_hoc?.TenMon}
                    </div>
                    <div className="text-[10px] text-gray-400 font-black uppercase">
                      {req.mon_hoc?.MaMon}
                    </div>
                  </td>
                  <td className="px-6 py-4 max-w-xs">
                    <p
                      className="text-xs text-gray-500 line-clamp-2 italic leading-relaxed"
                      title={req.LyDo}
                    >
                      {req.LyDo}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-400">
                      <Clock size={14} className="text-gray-300" />
                      {new Date(req.created_at).toLocaleDateString("vi-VN")}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <StatusBadge status={req.TrangThai} />
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex justify-end gap-2">
                      {req.TrangThai === 0 && (
                        <>
                          <ActionButton
                            icon={<Check size={16} />}
                            onClick={() => handleUpdateStatus(req.YeuCauID, 1)}
                            variant="success"
                            tooltip="Phê duyệt"
                          />
                          <ActionButton
                            icon={<X size={16} />}
                            onClick={() => handleUpdateStatus(req.YeuCauID, 2)}
                            variant="danger"
                            tooltip="Từ chối"
                          />
                        </>
                      )}
                      <ActionButton
                        icon={<Trash2 size={16} />}
                        onClick={() => handleDelete(req.YeuCauID)}
                        variant="default"
                        tooltip="Xóa vĩnh viễn"
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
  );
};

const StatBadge = ({ label, count, color }) => {
  const colors = {
    amber: "bg-amber-50 text-amber-600 border-amber-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    rose: "bg-rose-50 text-rose-600 border-rose-100",
  };
  return (
    <div
      className={`flex items-center justify-between p-6 rounded-[2rem] border shadow-sm ${colors[color]}`}
    >
      <span className="text-[10px] font-black uppercase tracking-widest">
        {label}
      </span>
      <span className="text-2xl font-black">{count}</span>
    </div>
  );
};

const StatusBadge = ({ status }) => {
  const configs = {
    0: {
      label: "Đang chờ",
      class: "bg-amber-50 text-amber-600 border-amber-100",
    },
    1: {
      label: "Đã duyệt",
      class: "bg-emerald-50 text-emerald-600 border-emerald-100",
    },
    2: { label: "Từ chối", class: "bg-rose-50 text-rose-600 border-rose-100" },
  };
  const config = configs[status] || configs[0];
  return (
    <span
      className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-sm ${config.class}`}
    >
      {config.label}
    </span>
  );
};

const ActionButton = ({ icon, onClick, variant, tooltip }) => {
  const variants = {
    success:
      "bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white border-emerald-100",
    danger:
      "bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white border-rose-100",
    default:
      "bg-gray-50 text-gray-400 hover:bg-gray-900 hover:text-white border-gray-100",
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

export default AdminManageClassRequests;
