import React, { useState, useEffect } from "react";
import axiosClient from "@/api/axios";
import toast from "react-hot-toast";
import {
  Wallet,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  ChevronRight,
  Loader2,
} from "lucide-react";

const DON_GIA_TIN_CHI = 500000;

const HocPhiManagement = () => {
  const [students, setStudents] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [selectedSemester, setSelectedSemester] = useState("");
  const [khoas, setKhoas] = useState([]);
  const [nganhs, setNganhs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(null);

  const [filters, setFilters] = useState({
    KhoaID: "",
    NganhID: "",
    search: "",
    per_page: 20,
    page: 1,
  });

  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    total: 0,
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      // Chuẩn hóa tham số: Loại bỏ các filter rỗng để tránh lỗi 500 ở phía Server
      // và bổ sung selectedSemester vào params để Backend lọc dữ liệu tối ưu hơn
      const queryParams = { ...filters };
      Object.keys(queryParams).forEach((key) => {
        if (queryParams[key] === "" || queryParams[key] === null)
          delete queryParams[key];
      });

      if (selectedSemester) queryParams.HocKyID = selectedSemester;

      const [resStudents, resSemesters, resKhoas, resNganhs] =
        await Promise.all([
          axiosClient.get("/admin/hoc-phi", {
            params: {
              ...queryParams,
              per_page: filters.per_page,
              page: filters.page,
            },
          }),
          axiosClient.get("/admin/hoc-ky"),
          axiosClient.post("/admin/khoa/list"),
          axiosClient.get("/admin/nganh/list"),
        ]);

      const studentPayload = resStudents.data?.data
        ? resStudents.data
        : resStudents;
      setStudents(studentPayload.data || []);
      setPagination({
        current_page: studentPayload.current_page || 1,
        last_page: studentPayload.last_page || 1,
        total: studentPayload.total || 0,
      });

      const semesterData = resSemesters.data?.data || resSemesters.data || [];
      setSemesters(semesterData);
      setKhoas(resKhoas.data || []);
      setNganhs(resNganhs.data?.data || resNganhs.data || []);

      // Mặc định chọn học kỳ mới nhất nếu chưa chọn
      if (!selectedSemester && semesterData.length > 0) {
        setSelectedSemester(semesterData[0].HocKyID);
      }
    } catch (error) {
      console.error("Lỗi tải dữ liệu học phí:", error);
      toast.error("Không thể tải danh sách học phí");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filters, selectedSemester]);

  const handleConfirmPayment = async (sinhVienID) => {
    if (!selectedSemester) return toast.error("Vui lòng chọn học kỳ");

    setConfirming(sinhVienID);
    try {
      const res = await axiosClient.post("/admin/hoc-phi/confirm", {
        SinhVienID: sinhVienID,
        HocKyID: selectedSemester,
      });

      if (res.success) {
        toast.success(res.message || "Đã xác nhận thanh toán thành công");
        fetchData(); // Tải lại dữ liệu
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Lỗi khi xác nhận thanh toán",
      );
    } finally {
      setConfirming(null);
    }
  };

  // Tính toán tóm tắt cho từng sinh viên trong học kỳ đã chọn
  const calculateStudentFee = (student) => {
    const registrationsInSemester =
      student.dang_ky_hoc_phan?.filter(
        (dk) => dk.lop_hoc_phan?.HocKyID === parseInt(selectedSemester),
      ) || [];

    const tongTinChi = registrationsInSemester.reduce(
      (sum, dk) =>
        sum +
        (dk.lop_hoc_phan?.mon_hoc?.SoTinChi ||
          dk.lop_hoc_phan?.monHoc?.SoTinChi ||
          0),
      0,
    );
    const allPaid =
      registrationsInSemester.length > 0 &&
      registrationsInSemester.every((dk) => dk.TrangThaiThanhToan === 1);

    const hasStudentSignal = registrationsInSemester.some(
      (dk) => dk.SinhVienXacNhan === 1,
    );

    return {
      tongTinChi,
      tongTien: tongTinChi * DON_GIA_TIN_CHI,
      allPaid,
      hasStudentSignal,
      hasData: registrationsInSemester.length > 0,
    };
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fadeIn pb-10">
      {/* Header */}
      <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-50/40 rounded-full -mr-20 -mt-20 blur-3xl" />
        <div className="relative flex items-center gap-6">
          <div className="p-4 bg-blue-600 rounded-3xl text-white shadow-lg shadow-blue-100">
            <CreditCard size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">
              Quản lý Học phí
            </h2>
            <p className="text-gray-500 text-sm font-medium">
              Theo dõi tình trạng đóng phí và xác nhận quyền lợi học tập của
              sinh viên
            </p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative flex-1 w-full">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
            size={18}
          />
          <input
            type="text"
            placeholder="Tìm theo Mã SV hoặc Họ tên..."
            className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-medium shadow-sm"
            value={filters.search}
            onChange={(e) =>
              setFilters({ ...filters, search: e.target.value, page: 1 })
            }
          />
        </div>
        <div className="flex items-center gap-2 bg-white px-4 py-3 rounded-2xl border border-gray-100 shadow-sm w-full md:w-auto">
          <Filter size={16} className="text-gray-400" />
          <select
            className="outline-none text-sm font-bold text-gray-600 cursor-pointer bg-transparent w-full"
            value={filters.KhoaID}
            onChange={(e) =>
              setFilters({
                ...filters,
                KhoaID: e.target.value,
                NganhID: "",
                page: 1,
              })
            }
          >
            <option value="">Tất cả Khoa</option>
            {khoas.map((k) => (
              <option key={k.KhoaID} value={k.KhoaID}>
                {k.TenKhoa}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2 bg-white px-4 py-3 rounded-2xl border border-gray-100 shadow-sm w-full md:w-auto">
          <Filter size={16} className="text-gray-400" />
          <select
            className="outline-none text-sm font-bold text-gray-600 cursor-pointer bg-transparent w-full"
            value={filters.NganhID}
            onChange={(e) =>
              setFilters({ ...filters, NganhID: e.target.value, page: 1 })
            }
          >
            <option value="">Tất cả Ngành</option>
            {nganhs
              .filter((n) => !filters.KhoaID || n.KhoaID == filters.KhoaID)
              .map((n) => (
                <option key={n.NganhID} value={n.NganhID}>
                  {n.TenNganh}
                </option>
              ))}
          </select>
        </div>
        <div className="flex items-center gap-2 bg-white px-4 py-3 rounded-2xl border border-gray-100 shadow-sm w-full md:w-auto">
          <Filter size={16} className="text-gray-400" />
          <select
            className="outline-none text-sm font-bold text-gray-600 cursor-pointer bg-transparent w-full"
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(e.target.value)}
          >
            <option value="">Chọn học kỳ kiểm tra</option>
            {semesters.map((s) => (
              <option key={s.HocKyID} value={s.HocKyID}>
                {s.TenHocKy} - {s.nam_hoc?.TenNamHoc}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table Area */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50/50 text-gray-400 text-[10px] uppercase font-bold tracking-[0.15em] border-b border-gray-100">
              <tr>
                <th className="px-8 py-5">Sinh viên</th>
                <th className="px-6 py-5 text-center">Tín chỉ</th>
                <th className="px-6 py-5 text-right">Tổng học phí</th>
                <th className="px-6 py-5 text-center">Trạng thái</th>
                <th className="px-8 py-5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-8 py-20 text-center">
                    <div className="inline-block w-8 h-8 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td
                    colSpan="5"
                    className="px-8 py-20 text-center text-gray-400 italic"
                  >
                    Không tìm thấy sinh viên nào
                  </td>
                </tr>
              ) : (
                students.map((student) => {
                  const feeInfo = calculateStudentFee(student);
                  return (
                    <tr
                      key={student.SinhVienID}
                      className="hover:bg-gray-50/50 transition-all group"
                    >
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-xs">
                            {student.HoTen?.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-black text-gray-900">
                              {student.HoTen}
                            </p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">
                              {student.MaSV}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className="text-xs font-black text-gray-600 bg-gray-100 px-2.5 py-1 rounded-lg">
                          {feeInfo.tongTinChi} TC
                        </span>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <p className="text-sm font-black text-gray-900">
                          {feeInfo.tongTien.toLocaleString()} đ
                        </p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase">
                          Học kỳ {selectedSemester}
                        </p>
                      </td>
                      <td className="px-6 py-5 text-center">
                        {!feeInfo.hasData ? (
                          <span className="text-[10px] font-bold text-gray-300 uppercase">
                            Trống đăng ký
                          </span>
                        ) : feeInfo.allPaid ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-500 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100 uppercase">
                            <CheckCircle2 size={12} /> Đã hoàn thành
                          </span>
                        ) : (
                          <div className="flex flex-col items-center gap-1">
                            <span className="inline-flex items-center gap-1 text-[10px] font-black text-rose-500 bg-rose-50 px-2 py-1 rounded-md border border-rose-100 uppercase">
                              <AlertCircle size={12} /> Còn nợ phí
                            </span>
                            {feeInfo.hasStudentSignal && (
                              <span className="text-[8px] font-black text-blue-600 bg-blue-50 px-1.5 rounded animate-bounce">
                                SV BÁO ĐÃ NỘP
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-8 py-5 text-right">
                        {feeInfo.hasData && !feeInfo.allPaid && (
                          <button
                            onClick={() =>
                              handleConfirmPayment(student.SinhVienID)
                            }
                            disabled={confirming === student.SinhVienID}
                            className="bg-gray-900 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-md shadow-gray-200 active:scale-95 flex items-center gap-2 ml-auto"
                          >
                            {confirming === student.SinhVienID ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <Wallet size={14} />
                            )}
                            Xác nhận nộp
                          </button>
                        )}
                        {feeInfo.allPaid && (
                          <div className="flex justify-end">
                            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
                              <CheckCircle2 size={16} />
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-blue-600 p-6 rounded-[2.5rem] text-white flex flex-col md:row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white/20 rounded-2xl">
            <AlertCircle size={20} />
          </div>
          <p className="text-sm font-medium">
            Lưu ý: Sau khi xác nhận, sinh viên sẽ được mở khóa các chức năng học
            tập nếu đang trong trạng thái bị khóa do nợ phí.
          </p>
        </div>
      </div>
    </div>
  );
};

const ActionButton = ({
  icon,
  onClick,
  variant = "default",
  tooltip,
  disabled,
}) => {
  const variants = {
    default:
      "bg-white text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 border-gray-100",
    danger:
      "bg-white text-gray-400 hover:text-rose-600 hover:bg-rose-50 border-gray-100",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={tooltip}
      className={`p-2.5 rounded-xl border transition-all shadow-sm active:scale-90 disabled:opacity-50 ${variants[variant]}`}
    >
      {icon}
    </button>
  );
};

export default HocPhiManagement;
