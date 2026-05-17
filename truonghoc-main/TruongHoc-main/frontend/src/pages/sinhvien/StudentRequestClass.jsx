import React, { useState, useEffect } from "react";
import axiosClient from "@/api/axios";
import toast from "react-hot-toast";
import {
  Send,
  History,
  PlusCircle,
  FileText,
  ChevronRight,
  Clock,
} from "lucide-react";

const StudentRequestClass = () => {
  const [monHocs, setMonHocs] = useState([]);
  const [requests, setRequests] = useState([]);
  const [formData, setFormData] = useState({ monHocID: "", lyDo: "" });
  const [loading, setLoading] = useState(false);

  // Helper bóc tách mảng an toàn
  const getArray = (res) => {
    const payload = res?.data || res;
    if (Array.isArray(payload)) return payload;
    if (payload?.data && Array.isArray(payload.data)) return payload.data;
    return [];
  };

  useEffect(() => {
    const fetchData = async () => {
      const [resMon, resReq] = await Promise.all([
        axiosClient.get("/sinh-vien/chuong-trinh"),
        axiosClient.get("/sinh-vien/yeu-cau-mo-lop"),
      ]);
      setMonHocs(resMon.data?.chuong_trinh || []);
      setRequests(getArray(resReq));
    };
    fetchData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.monHocID || !formData.lyDo)
      return toast.error("Vui lòng nhập đầy đủ thông tin");

    setLoading(true);
    try {
      await axiosClient.post("/sinh-vien/yeu-cau-mo-lop", formData);
      toast.success("Gửi yêu cầu thành công!");
      setFormData({ monHocID: "", lyDo: "" });
      // Refresh list
      const res = await axiosClient.get("/sinh-vien/yeu-cau-mo-lop");
      setRequests(getArray(res));
    } catch (error) {
      toast.error(error.response?.data?.message || "Lỗi gửi yêu cầu");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fadeIn pb-10">
      {/* Unified Header Section */}
      <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-50/40 rounded-full -mr-20 -mt-20 blur-3xl" />
        <div className="absolute bottom-0 left-20 w-40 h-40 bg-blue-50/30 rounded-full -mb-10 blur-2xl" />

        <div className="relative flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-6">
            <Send size={42} className="text-indigo-600 shrink-0" />
            <div>
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                Xin mở lớp học phần
              </h2>
              <p className="text-gray-500 text-sm font-medium">
                Gửi yêu cầu mở lớp cho các môn học chưa có lịch trong học kỳ
              </p>
            </div>
          </div>

          <div className="bg-indigo-600 px-6 py-3 rounded-2xl text-center shadow-lg shadow-indigo-100">
            <p className="text-[10px] font-bold text-indigo-100 uppercase tracking-widest mb-1">
              Yêu cầu đã gửi
            </p>
            <p className="text-2xl font-black text-white leading-none">
              {requests.length}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cột trái: Form gửi yêu cầu */}
        <div className="lg:col-span-1">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 sticky top-24">
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-widest mb-6 flex items-center">
              <PlusCircle size={18} className="mr-2 text-indigo-600" /> Gửi yêu
              cầu mới
            </h3>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-gray-400 uppercase ml-1">
                  Môn học cần mở
                </label>
                <select
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-sm"
                  value={formData.monHocID}
                  onChange={(e) =>
                    setFormData({ ...formData, monHocID: e.target.value })
                  }
                >
                  <option value="">-- Chọn môn học --</option>
                  {monHocs.map((m) => (
                    <option key={m.MonHocID} value={m.MonHocID}>
                      {m.mon_hoc?.TenMon}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-gray-400 uppercase ml-1">
                  Lý do / Nguyện vọng
                </label>
                <textarea
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-sm min-h-[120px] resize-none"
                  placeholder="Ví dụ: Em muốn học cải thiện để kịp xét tốt nghiệp..."
                  value={formData.lyDo}
                  onChange={(e) =>
                    setFormData({ ...formData, lyDo: e.target.value })
                  }
                />
              </div>
              <button
                disabled={loading}
                className="w-full bg-indigo-600 text-white font-black py-4 rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-[0.98] disabled:bg-gray-200 disabled:shadow-none"
              >
                {loading ? "ĐANG XỬ LÝ..." : "GỬI YÊU CẦU"}
              </button>
            </form>
          </div>
        </div>

        {/* Cột phải: Lịch sử yêu cầu */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gray-50/50 px-8 py-5 border-b border-gray-100 flex items-center gap-2">
              <History size={18} className="text-indigo-600" />
              <h3 className="font-black text-gray-800 tracking-tight">
                Lịch sử yêu cầu
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50/30 text-gray-400 uppercase text-[11px] font-bold tracking-widest border-b border-gray-100">
                  <tr>
                    <th className="px-8 py-4">Môn học</th>
                    <th className="px-6 py-4">Thời gian</th>
                    <th className="px-8 py-4 text-center">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {requests.length === 0 ? (
                    <tr>
                      <td
                        colSpan="3"
                        className="px-8 py-16 text-center text-gray-400 italic"
                      >
                        Chưa có yêu cầu nào được gửi.
                      </td>
                    </tr>
                  ) : (
                    requests.map((req) => (
                      <tr
                        key={req.YeuCauID}
                        className="hover:bg-gray-50/50 transition-all group"
                      >
                        <td className="px-8 py-5">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-bold text-gray-800 text-sm group-hover:text-indigo-600 transition-colors">
                              {req.mon_hoc?.TenMon}
                            </span>
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">
                              Mã yêu cầu: #{req.YeuCauID}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2 text-gray-500 text-xs font-medium">
                            <Clock size={12} className="text-gray-300" />
                            {new Date(req.created_at).toLocaleDateString(
                              "vi-VN",
                            )}
                          </div>
                        </td>
                        <td className="px-8 py-5 text-center">
                          <span
                            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase border shadow-sm ${
                              req.TrangThai === 1
                                ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                : req.TrangThai === 2
                                  ? "bg-rose-50 text-rose-600 border-rose-100"
                                  : "bg-amber-50 text-amber-600 border-amber-100"
                            }`}
                          >
                            {req.TrangThai === 1
                              ? "Đã duyệt"
                              : req.TrangThai === 2
                                ? "Từ chối"
                                : "Đang chờ"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentRequestClass;
