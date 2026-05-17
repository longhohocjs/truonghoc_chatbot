import React, { useState, useEffect } from "react";
import axiosClient from "@/api/axios";
import toast from "react-hot-toast";
import {
  BookOpen,
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  Send,
  Layers,
  Info,
} from "lucide-react";

const DangKyHocPhan = () => {
  const [officialClasses, setOfficialClasses] = useState([]);
  const [tempClasses, setTempClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get("/sinh-vien/dang-ky-hoc-phan/lop-mo");
      // API trả về { lop_chinh_thuc: [], lop_tam: [] }
      setOfficialClasses(res.lop_chinh_thuc || []);
      setTempClasses(res.lop_tam || []);
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Không thể tải danh sách lớp",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRegister = async (lopId) => {
    setSubmitting(true);
    try {
      await axiosClient.post("/sinh-vien/dang-ky-hoc-phan", {
        LopHocPhanID: lopId,
      });
      toast.success("Đã gửi yêu cầu đăng ký vào hàng đợi xử lý.");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Lỗi đăng ký");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestOpen = async (monHocId) => {
    setSubmitting(true);
    try {
      // Vì lớp tạm hiển thị theo MonHocID, ta gửi yêu cầu mở môn đó
      await axiosClient.post("/sinh-vien/dang-ky-hoc-phan/gui-yeu-cau", {
        monHocID: monHocId,
        lyDo: "Lớp chính thức đã đầy",
      });
      toast.success("Gửi yêu cầu xin mở lớp thành công!");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Lỗi gửi yêu cầu");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
        <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">
          Đang tải danh sách học phần...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-10 animate-fadeIn pb-20">
      {/* Header */}
      <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/50 rounded-full -mr-20 -mt-20 blur-3xl" />
        <div className="relative flex items-center gap-6">
          <div className="p-4 bg-indigo-600 rounded-3xl text-white shadow-lg shadow-indigo-100">
            <BookOpen size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">
              Đăng ký học phần
            </h2>
            <p className="text-gray-500 text-sm font-medium">
              Lựa chọn các lớp học phần phù hợp với lộ trình của bạn
            </p>
          </div>
        </div>
      </div>

      {/* Official Classes Section */}
      <section className="space-y-6">
        <div className="flex items-center gap-3 ml-4">
          <CheckCircle2 className="text-emerald-500" size={20} />
          <h3 className="text-sm font-black uppercase tracking-[0.2em] text-gray-400">
            Lớp học phần chính thức
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {officialClasses.map((lop) => (
            <div
              key={lop.LopHocPhanID}
              className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm group hover:border-indigo-200 transition-all"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="text-[10px] font-black text-indigo-500 bg-indigo-50 px-2 py-1 rounded-lg uppercase tracking-wider mb-2 inline-block">
                    {lop.MaLopHP}
                  </span>
                  <h4 className="text-lg font-black text-gray-900 leading-tight">
                    {lop.mon_hoc?.TenMon}
                  </h4>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-gray-400 uppercase">
                    Tín chỉ
                  </p>
                  <p className="text-xl font-black text-gray-700">
                    {lop.mon_hoc?.SoTinChi}
                  </p>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3 text-gray-500 text-xs font-bold">
                  <Users size={14} className="text-indigo-400" />
                  <span>
                    Sĩ số: {lop.SoLuongHienTai} / {lop.SoLuongToiDa}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-gray-500 text-xs font-bold">
                  <Clock size={14} className="text-indigo-400" />
                  <span>
                    Giảng viên: {lop.giang_vien?.HoTen || "Đang cập nhật"}
                  </span>
                </div>
              </div>

              <button
                disabled={lop.IsFull || submitting}
                onClick={() => handleRegister(lop.LopHocPhanID)}
                className={`w-full py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
                  lop.IsFull
                    ? "bg-gray-50 text-gray-400 cursor-not-allowed"
                    : "bg-gray-900 text-white hover:bg-indigo-600 shadow-xl shadow-gray-100 active:scale-95"
                }`}
              >
                {lop.IsFull ? "Lớp đã đầy" : "Đăng ký ngay"}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Temporary Classes Section */}
      {tempClasses.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-center justify-between mx-4">
            <div className="flex items-center gap-3">
              <Layers className="text-amber-500" size={20} />
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-gray-400">
                Danh sách môn xin mở lớp
              </h3>
            </div>
            <div className="flex items-center gap-2 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-100">
              <Info size={14} className="text-amber-600" />
              <span className="text-[10px] font-bold text-amber-700 uppercase">
                Dành cho môn đã full chỗ
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {tempClasses.map((lop) => {
              const progress = Math.min(
                100,
                (lop.SoLuongHienTai / lop.SoLuongToiDa) * 100,
              );
              return (
                <div
                  key={lop.LopHocPhanID}
                  className="bg-white p-8 rounded-[2.5rem] border border-amber-100 shadow-sm relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 bg-amber-500 text-white px-4 py-1 rounded-bl-2xl text-[8px] font-black uppercase tracking-tighter">
                    Lớp tạm thời
                  </div>

                  <div className="mb-6">
                    <h4 className="text-lg font-black text-gray-900 leading-tight mb-1">
                      {lop.TenMon}
                    </h4>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Môn học đang chờ gom đủ sinh viên
                    </p>
                  </div>

                  {/* Progress Area */}
                  <div className="space-y-3 mb-8">
                    <div className="flex justify-between items-end">
                      <span className="text-xs font-black text-gray-600 uppercase flex items-center gap-2">
                        <Users size={14} className="text-amber-500" />
                        Tiến độ xin mở: {lop.SoLuongHienTai} /{" "}
                        {lop.SoLuongToiDa}
                      </span>
                      <span className="text-[10px] font-black text-amber-600">
                        {Math.round(progress)}%
                      </span>
                    </div>

                    <div className="w-full h-3 bg-gray-50 rounded-full overflow-hidden border border-gray-100 p-0.5">
                      <div
                        className="h-full bg-amber-500 rounded-full transition-all duration-1000 ease-out shadow-sm shadow-amber-200"
                        style={{ width: `${progress}%` }}
                      />
                    </div>

                    <p className="text-[9px] font-bold text-gray-400 italic">
                      * Khi đạt {lop.SoLuongToiDa} sinh viên, Admin sẽ xem xét
                      chuyển thành lớp chính thức.
                    </p>
                  </div>

                  <button
                    disabled={submitting}
                    onClick={() =>
                      handleRequestOpen(lop.LopHocPhanID.split("_")[1])
                    }
                    className="w-full py-4 bg-amber-50 text-amber-600 hover:bg-amber-600 hover:text-white border border-amber-200 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-amber-50 active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Send size={14} />
                    Tham gia nhóm xin mở lớp
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {officialClasses.length === 0 && tempClasses.length === 0 && (
        <div className="py-32 bg-white rounded-[3rem] border border-dashed border-gray-200 text-center">
          <AlertCircle size={48} className="mx-auto text-gray-200 mb-4" />
          <p className="text-gray-400 font-bold uppercase text-xs tracking-widest">
            Hiện tại không có học phần nào mở đăng ký
          </p>
        </div>
      )}
    </div>
  );
};

export default DangKyHocPhan;
