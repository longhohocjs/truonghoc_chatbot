import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axiosClient from "@/api/axios";
import { Users, GraduationCap, ArrowRight } from "lucide-react";
import toast from "react-hot-toast";

const LopSinhHoatList = () => {
  const [lops, setLops] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchLops = async () => {
      try {
        const res = await axiosClient.get(
          "/giang-vien/lop-sinh-hoat/phan-cong",
        );
        // Laravel trả về { success: true, data: [...] }
        const data = res.data || res;
        setLops(Array.isArray(data) ? data : data.data || []);
      } catch (error) {
        toast.error("Không thể tải danh sách lớp cố vấn");
      } finally {
        setLoading(false);
      }
    };
    fetchLops();
  }, []);

  if (loading)
    return (
      <div className="p-10 text-center text-gray-500">
        Đang tải danh sách lớp cố vấn...
      </div>
    );

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fadeIn pb-10">
      {/* Unified Header Section */}
      <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-50/40 rounded-full -mr-20 -mt-20 blur-3xl" />
        <div className="absolute bottom-0 left-20 w-40 h-40 bg-blue-50/30 rounded-full -mb-10 blur-2xl" />

        <div className="relative flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-6">
            <Users size={42} className="text-indigo-600 shrink-0" />
            <div>
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                Lớp sinh hoạt chủ nhiệm
              </h2>
              <p className="text-gray-500 text-sm font-medium">
                Danh sách các lớp bạn đang đảm nhận vai trò Cố vấn học tập
              </p>
            </div>
          </div>
          <div className="bg-indigo-600 px-6 py-3 rounded-2xl text-center shadow-lg shadow-indigo-100">
            <p className="text-[10px] font-bold text-indigo-100 uppercase tracking-widest mb-1">
              Đang quản lý
            </p>
            <p className="text-2xl font-black text-white leading-none">
              {lops.length} Lớp
            </p>
          </div>
        </div>
      </div>

      {lops.length === 0 ? (
        <div className="bg-white p-20 text-center rounded-3xl border border-dashed border-gray-200">
          <div className="text-4xl mb-4 text-gray-300">👥</div>
          <p className="text-gray-400 italic">
            Bạn hiện không có lớp sinh hoạt nào được phân công cố vấn.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {lops.map((lop) => (
            <div
              key={lop.LopSinhHoatID || lop.lop_sinh_hoat_id}
              className="group bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-blue-100/50 transition-all duration-300 overflow-hidden flex flex-col"
            >
              <div className="p-6 flex-1">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-blue-50 rounded-2xl text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <GraduationCap size={20} />
                  </div>
                  <span className="text-[10px] font-black px-2 py-1 bg-gray-100 text-gray-500 rounded-lg uppercase tracking-wider">
                    {lop.MaLop || lop.ma_lop}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-gray-900 mb-1 leading-tight group-hover:text-blue-600 transition-colors">
                  Lớp {lop.TenLop || lop.ten_lop}
                </h3>
                <p className="text-gray-400 text-xs mb-4">
                  Khoa: {lop.TenKhoa || "N/A"}
                </p>

                <div className="space-y-3">
                  <div className="flex items-center text-sm text-gray-600">
                    <Users size={16} className="mr-3 text-gray-400" />
                    <span className="font-medium">Năm nhập học:</span>
                    <span className="ml-auto font-bold text-gray-900">
                      {lop.NamNhapHoc || lop.nam_nhap_hoc}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-gray-50 border-t border-gray-100">
                <button
                  onClick={() =>
                    navigate(
                      `/giang-vien/lop-sinh-hoat/${lop.LopSinhHoatID || lop.lop_sinh_hoat_id}`,
                    )
                  }
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white border border-gray-200 text-blue-600 text-xs font-bold hover:bg-blue-600 hover:text-white transition-all shadow-sm group-hover:shadow-md"
                >
                  XEM DANH SÁCH <ArrowRight size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LopSinhHoatList;
