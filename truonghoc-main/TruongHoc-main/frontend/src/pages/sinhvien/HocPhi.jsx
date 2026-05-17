import React, { useState, useEffect } from "react";
import axiosClient from "@/api/axios";
import {
  CreditCard,
  Receipt,
  Info,
  CheckCircle2,
  AlertCircle,
  QrCode,
  Wallet,
  Lock,
  ArrowRight,
  Loader2,
} from "lucide-react";

const SummaryCard = ({ label, value, sub, color, highlight }) => (
  <div
    className={`bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm ${highlight ? "ring-2 ring-rose-500/10" : ""}`}
  >
    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
      {label}
    </p>
    <div className={`text-2xl font-black ${color} tracking-tight`}>{value}</div>
    <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase opacity-60 italic">
      {sub}
    </p>
  </div>
);

const HocPhi = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchHocPhi = async () => {
      try {
        const res = await axiosClient.get("/sinh-vien/hoc-phi");
        // Linh hoạt xử lý response dựa trên cấu trúc trả về
        const payload = res?.data || res;
        setData(payload?.success === false ? null : payload?.data || payload);
      } catch (error) {
        console.error("Lỗi tải thông tin học phí:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchHocPhi();
  }, []);

  const handleStudentConfirm = async () => {
    setSubmitting(true);
    try {
      const res = await axiosClient.post("/sinh-vien/hoc-phi/confirm");
      // Sử dụng toast để hiển thị thông báo
      if (res.success) {
        toast.success(res.message);
        window.location.reload(); // Tải lại để cập nhật trạng thái giao diện
      }
    } catch (error) {
      toast.error("Gửi xác nhận thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading)
    return (
      <div className="p-10 text-center font-medium text-gray-500">
        Đang tính toán học phí học kỳ...
      </div>
    );

  if (!data || !data.chi_tiet || data.chi_tiet.length === 0)
    return (
      <div className="max-w-4xl mx-auto mt-20 text-center space-y-4">
        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto text-gray-300">
          <Receipt size={40} />
        </div>
        <h2 className="text-xl font-bold text-gray-700">
          Chưa có thông tin học phí
        </h2>
        <p className="text-gray-400">
          Bạn chưa đăng ký học phần nào trong học kỳ hiện tại hoặc dữ liệu chưa
          được cập nhật.
        </p>
      </div>
    );

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fadeIn pb-10">
      {/* Header Section */}
      <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-50/40 rounded-full -mr-20 -mt-20 blur-3xl" />
        <div className="relative flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-6">
            <div className="p-4 bg-blue-600 rounded-3xl text-white shadow-lg shadow-blue-100">
              <Wallet size={32} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                Học phí & Lệ phí
              </h2>
              <p className="text-gray-500 text-sm font-medium">
                Theo dõi và hoàn thành nghĩa vụ tài chính học kỳ {data.hoc_ky}
              </p>
            </div>
          </div>
          <div
            className={`px-6 py-3 rounded-2xl border flex items-center gap-2 ${data.trang_thai_thanh_toan ? "bg-emerald-50 border-emerald-100 text-emerald-600" : "bg-rose-50 border-rose-100 text-rose-600"}`}
          >
            {data.trang_thai_thanh_toan ? (
              <CheckCircle2 size={18} />
            ) : (
              <AlertCircle size={18} />
            )}
            <span className="text-xs font-black uppercase tracking-widest">
              {data.trang_thai_thanh_toan ? "Đã hoàn thành" : "Chưa thanh toán"}
            </span>
          </div>
        </div>
      </div>

      {/* Overdue Warning */}
      {data?.is_locked && (
        <div className="bg-rose-600 p-6 rounded-[2rem] text-white flex items-center gap-6 animate-pulse">
          <div className="p-3 bg-white/20 rounded-2xl">
            <Lock size={24} />
          </div>
          <div>
            <h3 className="font-black text-lg">
              Tài khoản học tập đang bị tạm khóa
            </h3>
            <p className="text-rose-100 text-sm">
              Đã quá hạn nộp học phí (
              {new Date(data.han_nop).toLocaleDateString("vi-VN")}). Vui lòng
              hoàn thành để tiếp tục học tập và xem điểm.
            </p>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <SummaryCard
          label="Tổng tín chỉ"
          value={data?.tong_tin_chi || 0}
          sub="Đã đăng ký thành công"
          color="text-indigo-600"
        />
        <SummaryCard
          label="Đơn giá / Tín chỉ"
          value={(data?.don_gia || 0).toLocaleString() + " đ"}
          sub="Theo quy định nhà trường"
          color="text-gray-600"
        />
        <SummaryCard
          label="Tổng tiền cần nộp"
          value={(data?.tong_tien || 0).toLocaleString() + " đ"}
          sub={`Hạn nộp: ${data?.han_nop ? new Date(data.han_nop).toLocaleDateString("vi-VN") : "Chưa có"}`}
          color="text-rose-600"
          highlight
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Breakdown Table */}
        <div className="lg:col-span-2 bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-8 py-5 border-b border-gray-50 bg-gray-50/30 flex justify-between items-center">
            <h3 className="font-black text-gray-800 text-sm uppercase tracking-widest">
              Chi tiết học phần
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">
                <tr>
                  <th className="px-8 py-4">Môn học</th>
                  <th className="px-4 py-4 text-center">Tín chỉ</th>
                  <th className="px-8 py-4 text-right">Thành tiền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data?.chi_tiet?.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/50 transition-all">
                    <td className="px-8 py-5">
                      <p className="text-sm font-bold text-gray-700">
                        {item.ten_mon}
                      </p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase">
                        {item.ma_mon}
                      </p>
                    </td>
                    <td className="px-4 py-5 text-center font-black text-gray-500 text-xs">
                      {item.so_tin_chi}
                    </td>
                    <td className="px-8 py-5 text-right font-black text-gray-900 text-sm">
                      {(item.thanh_tien || 0).toLocaleString()} đ
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Payment Guide Area */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-gray-900 rounded-[2.5rem] p-8 text-white shadow-xl shadow-gray-200 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl" />
            <h3 className="text-sm font-black uppercase tracking-widest mb-6 flex items-center gap-2">
              <QrCode size={18} className="text-blue-400" /> Thanh toán nhanh
            </h3>

            <div className="bg-white p-4 rounded-3xl mb-6 aspect-square flex items-center justify-center">
              {/* Demo VietQR link - Trong thực tế sẽ dùng API VietQR để gen mã động */}
              <img
                src={`https://img.vietqr.io/image/vbb-123456789-compact.png?amount=${data?.tong_tien || 0}&addInfo=HP%20${encodeURIComponent(data?.hoc_ky || "")}%20SV%20${data?.ma_sv || "STUDENT"}`}
                alt="VietQR"
                className="w-full h-full object-contain"
              />
            </div>

            <div className="space-y-3">
              <p className="text-[10px] text-gray-400 font-bold uppercase text-center tracking-tighter">
                Quét mã bằng ứng dụng Ngân hàng hoặc Ví điện tử
              </p>
              {!data.trang_thai_thanh_toan && (
                <button
                  onClick={handleStudentConfirm}
                  disabled={submitting}
                  className="w-full bg-blue-600 hover:bg-blue-500 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 disabled:bg-gray-700"
                >
                  {submitting ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={16} />
                  )}
                  {data.chi_tiet?.some(
                    (i) =>
                      i.sinh_vien_xac_nhan === 1 || i.SinhVienXacNhan === 1,
                  )
                    ? "ĐÃ GỬI BÁO CÁO"
                    : "XÁC NHẬN ĐÃ NỘP"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HocPhi;
