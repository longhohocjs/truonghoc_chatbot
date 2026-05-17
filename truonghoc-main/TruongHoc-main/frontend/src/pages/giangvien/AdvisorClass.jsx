import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosClient from "@/api/axios";
import { Users, Save, ArrowLeft, Award, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";

const AdvisorClass = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lops, setLops] = useState([]);
  const [selectedLop, setSelectedLop] = useState("");
  const [students, setStudents] = useState([]);
  const [hocKys, setHocKys] = useState([]);
  const [selectedHK, setSelectedHK] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const [resLops, resHKs] = await Promise.all([
          axiosClient.get("/giang-vien/lop-sinh-hoat/phan-cong"),
          axiosClient.get("/giang-vien/hoc-ky"),
        ]);

        // Trích xuất mảng từ resLops.data
        const lopsData = resLops?.data || resLops || [];
        setLops(Array.isArray(lopsData) ? lopsData : []);

        const hksData = resHKs.data || resHKs || [];
        setHocKys(Array.isArray(hksData) ? hksData : []);

        // Lấy ID của lớp đầu tiên một cách an toàn
        const defaultId =
          id || lopsData[0]?.LopSinhHoatID || lopsData[0]?.lop_sinh_hoat_id;
        if (defaultId) setSelectedLop(defaultId);

        if (hksData.length > 0) setSelectedHK(hksData[0].HocKyID);
      } catch (error) {
        toast.error("Không thể tải thông tin lớp cố vấn");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    const fetchStudents = async () => {
      if (!selectedLop || !selectedHK) return;
      try {
        const res = await axiosClient.post(
          "/giang-vien/lop-sinh-hoat/diem-ren-luyen",
          {
            lopSinhHoatID: selectedLop,
            hocKyID: selectedHK,
          },
        );
        // Chuẩn hóa dữ liệu: Đảm bảo lấy đúng mảng và xử lý null cho điểm
        const data = res.data || res || [];
        const formattedData = Array.isArray(data)
          ? data.map((sv) => ({
              ...sv,
              tong_diem: sv.tong_diem ?? sv.TongDiem ?? null,
              xep_loai: sv.xep_loai ?? sv.XepLoai ?? null,
            }))
          : [];
        setStudents(formattedData);
      } catch (error) {
        toast.error("Lỗi tải danh sách sinh viên");
      }
    };
    fetchStudents();
  }, [selectedLop, selectedHK]);

  const getXepLoai = (score) => {
    if (score >= 90) return "XuatSac";
    if (score >= 80) return "Gioi";
    if (score >= 65) return "Kha";
    if (score >= 50) return "TrungBinh";
    if (score >= 35) return "Yeu";
    return "Kem";
  };

  const handleScoreChange = (svId, value) => {
    // Nếu xóa trắng thì để null để hiện ô trống, không ép về 0
    const score =
      value === "" ? null : Math.min(100, Math.max(0, parseInt(value) || 0));
    setStudents((prev) =>
      prev.map((sv) =>
        (sv.sinh_vien_id || sv.SinhVienID) === svId
          ? {
              ...sv,
              tong_diem: score,
              TongDiem: score, // Đồng bộ cả 2 để tránh lỗi binding
              xep_loai: score !== null ? getXepLoai(score) : null,
            }
          : sv,
      ),
    );
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      await axiosClient.post(
        "/giang-vien/lop-sinh-hoat/cap-nhat-diem-ren-luyen",
        {
          lopSinhHoatID: selectedLop,
          hocKyID: selectedHK,
          danhSachDRL: students.map((sv) => ({
            sinhVienID: sv.sinh_vien_id || sv.SinhVienID,
            tongDiem: sv.tong_diem ?? 0,
            xepLoai: sv.xep_loai || "Kem",
          })),
        },
      );
      toast.success("Đã lưu điểm rèn luyện cho cả lớp!");
    } catch (error) {
      toast.error("Lỗi khi lưu điểm rèn luyện");
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return <div className="p-10 text-center">Đang tải dữ liệu...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fadeIn pb-10">
      {/* Navigation & Header Section */}
      <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-50/40 rounded-full -mr-20 -mt-20 blur-3xl" />
        <div className="absolute bottom-0 left-20 w-40 h-40 bg-blue-50/30 rounded-full -mb-10 blur-2xl" />

        <div className="relative flex flex-col lg:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-6">
            <button
              onClick={() => navigate("/giang-vien/lop-sinh-hoat")}
              className="p-3 bg-gray-50 text-gray-400 rounded-2xl hover:bg-indigo-50 hover:text-indigo-600 transition-all group"
            >
              <ArrowLeft
                size={24}
                className="group-hover:-translate-x-1 transition-transform"
              />
            </button>
            <div className="flex items-center gap-5">
              <Users size={42} className="text-indigo-600 shrink-0" />
              <div>
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                  Chi tiết lớp cố vấn
                </h2>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-[10px] font-black px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-lg uppercase tracking-wider border border-indigo-100">
                    {lops.find(
                      (l) =>
                        (l.LopSinhHoatID || l.lop_sinh_hoat_id) == selectedLop,
                    )?.TenLop ||
                      lops.find(
                        (l) =>
                          (l.LopSinhHoatID || l.lop_sinh_hoat_id) ==
                          selectedLop,
                      )?.ten_lop ||
                      "Lớp"}
                  </span>
                  <p className="text-gray-400 text-sm font-medium">
                    Quản lý sinh viên lớp chủ nhiệm
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 relative z-10">
            <select
              className="bg-gray-50 border-none p-3 rounded-2xl text-xs font-black text-gray-700 outline-none focus:ring-2 focus:ring-indigo-500 transition-all uppercase tracking-wider cursor-pointer shadow-sm"
              value={selectedHK}
              onChange={(e) => setSelectedHK(e.target.value)}
            >
              {hocKys.map((hk) => (
                <option key={hk.HocKyID} value={hk.HocKyID}>
                  {hk.TenHocKy}
                </option>
              ))}
            </select>
            <select
              className="bg-gray-50 border-none p-3 rounded-2xl text-xs font-black text-gray-700 outline-none focus:ring-2 focus:ring-indigo-500 transition-all uppercase tracking-wider cursor-pointer shadow-sm"
              value={selectedLop}
              onChange={(e) => setSelectedLop(e.target.value)}
            >
              <option value="">-- Chọn lớp --</option>
              {lops.map((l, index) => (
                <option
                  key={l.LopSinhHoatID || l.lop_sinh_hoat_id || index}
                  value={l.LopSinhHoatID || l.lop_sinh_hoat_id}
                >
                  {l.TenLop || l.ten_lop}
                </option>
              ))}
            </select>
            <button
              onClick={handleSaveAll}
              disabled={saving || students.length === 0}
              className="bg-gray-900 hover:bg-indigo-600 disabled:bg-gray-200 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-wider flex items-center gap-2 transition-all shadow-lg shadow-gray-200 active:scale-95"
            >
              {saving ? "ĐANG LƯU..." : <Save size={16} />}
              LƯU ĐIỂM
            </button>
          </div>
        </div>
      </div>

      {/* Student List Table */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50/50 text-gray-400 text-[11px] uppercase font-bold tracking-[0.15em] border-b border-gray-100">
              <tr>
                <th className="px-8 py-5 w-20">STT</th>
                <th className="px-6 py-4">MSSV</th>
                <th className="px-6 py-4">Họ và tên</th>
                <th className="px-6 py-4 text-center w-60">Điểm (0-100)</th>
                <th className="px-6 py-4 text-center">Xếp loại</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50/50">
              {students.length === 0 ? (
                <tr>
                  <td
                    colSpan="6"
                    className="p-24 text-center text-gray-400 italic"
                  >
                    Không có dữ liệu
                  </td>
                </tr>
              ) : (
                students.map((sv, index) => (
                  <tr
                    key={sv.sinh_vien_id || sv.SinhVienID || index}
                    className="hover:bg-gray-50/50 transition-all group"
                  >
                    <td className="px-8 py-5 text-gray-400 text-sm font-medium">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4 font-black text-indigo-600 text-sm">
                      {sv.ma_sv}
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-800 text-sm">
                      {sv.ho_ten}
                    </td>
                    <td className="px-6 py-4">
                      <input
                        type="number"
                        className="w-full p-2.5 bg-gray-50/50 border border-transparent rounded-xl text-center font-black text-indigo-600 focus:bg-white focus:border-indigo-200 focus:ring-4 focus:ring-indigo-500/5 transition-all outline-none"
                        value={sv.tong_diem ?? sv.TongDiem ?? ""}
                        onChange={(e) =>
                          handleScoreChange(
                            sv.sinh_vien_id || sv.SinhVienID,
                            e.target.value,
                          )
                        }
                      />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase border shadow-sm ${
                          (sv.xep_loai || sv.XepLoai) === "XuatSac"
                            ? "bg-purple-100 text-purple-600"
                            : (sv.xep_loai || sv.XepLoai) === "Gioi"
                              ? "bg-green-100 text-green-600"
                              : (sv.xep_loai || sv.XepLoai) === "Kha"
                                ? "bg-blue-100 text-blue-600"
                                : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {sv.xep_loai || sv.XepLoai || "Chưa chấm"}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">
                        {sv.email}
                      </div>
                      <div className="text-[10px] text-indigo-500 font-black mt-0.5">
                        {sv.so_dien_thoai}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdvisorClass;
