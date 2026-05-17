import React, { useState, useEffect } from "react";
import axiosClient from "@/api/axios";
import {
  Calendar,
  Printer,
  MapPin,
  Clock,
  Info,
  LayoutDashboard,
} from "lucide-react";

const LichGiangDay = () => {
  const [schedule, setSchedule] = useState({});
  const [unscheduledClasses, setUnscheduledClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hocKy, setHocKy] = useState(""); // Giả định backend có thể cung cấp thông tin học kỳ hiện tại

  const daysOfWeek = [
    { label: "Thứ 2", value: 2 },
    { label: "Thứ 3", value: 3 },
    { label: "Thứ 4", value: 4 },
    { label: "Thứ 5", value: 5 },
    { label: "Thứ 6", value: 6 },
    { label: "Thứ 7", value: 7 },
    { label: "Chủ Nhật", value: 8 },
  ];

  const timeSlots = Array.from({ length: 12 }, (_, i) => i + 1); // Tiết 1 đến tiết 12

  useEffect(() => {
    const fetchLichGiangDay = async () => {
      try {
        const response = await axiosClient.get("/giang-vien/lich-giang-day");

        console.log("Dữ liệu lịch dạy nhận được:", response);

        // Trích xuất dữ liệu linh hoạt
        const isSuccess =
          response?.success === true || response?.status === "success";
        const payload = isSuccess ? response.data : response;
        const dataArray = Array.isArray(payload)
          ? payload
          : payload?.data || [];

        if (dataArray.length > 0) {
          processSchedule(dataArray);
          setHocKy(payload.hoc_ky || "Học kỳ hiện tại");
        } else {
          setSchedule({});
          setHocKy("Chưa có dữ liệu học kỳ");
        }
      } catch (error) {
        console.error("Lỗi khi tải lịch giảng dạy:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchLichGiangDay();
  }, []);

  const processSchedule = (data) => {
    const mappedSchedule = {};
    const noLich = [];

    data.forEach((item) => {
      // Trường hợp 1: Dữ liệu trả về là danh sách Lớp, mỗi lớp có mảng lich_hoc (Giống Sinh viên)
      const lichHocArray = item.lich_hoc || item.LichHoc;

      if (Array.isArray(lichHocArray) && lichHocArray.length > 0) {
        lichHocArray.forEach((lich) => {
          addEntryToMap(mappedSchedule, lich, item);
        });
      }
      // Trường hợp 2: Dữ liệu trả về là danh sách các buổi học riêng lẻ (Flat array)
      else if (item.Thu || item.thu) {
        const lopInfo = item.lop_hoc_phan || item.LopHocPhan || item;
        addEntryToMap(mappedSchedule, item, lopInfo);
      } else {
        // Nếu lớp có dữ liệu nhưng mảng lịch học rỗng
        noLich.push(item);
      }
    });

    setSchedule(mappedSchedule);
    setUnscheduledClasses(noLich);
  };

  const addEntryToMap = (map, lich, lop) => {
    const thu = lich.Thu || lich.thu;
    const tietBD = lich.TietBatDau || lich.tiet_bat_dau;
    const soTiet = lich.SoTiet || lich.so_tiet || 1;

    if (thu === undefined || tietBD === undefined) return;

    const key = `${Number(thu)}-${Number(tietBD)}`;
    map[key] = {
      tenMon: lop?.mon_hoc?.TenMon || lop?.TenMon || "N/A",
      maLop: lop?.MaLopHP || lop?.MaLop || "N/A",
      phong: lich.PhongHoc || lich.phong_hoc || "Đang cập nhật",
      soTiet: Number(soTiet),
    };
  };

  if (loading)
    return <div className="p-10 text-center">Đang tải lịch giảng dạy...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">
            Lịch giảng dạy cá nhân
          </h2>
          <p className="text-gray-500 text-sm">Học kỳ: {hocKy}</p>
        </div>
        <button
          onClick={() => window.print()}
          className="bg-white border border-gray-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-all shadow-sm flex items-center"
        >
          <svg
            className="w-4 h-4 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
            />
          </svg>
          In lịch giảng dạy
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse table-fixed min-w-[800px]">
            <thead>
              <tr className="bg-gray-50">
                <th className="w-20 py-4 border-b border-r border-gray-100 text-xs font-bold text-gray-400 uppercase">
                  Tiết
                </th>
                {daysOfWeek.map((day) => (
                  <th
                    key={day.value}
                    className="py-4 border-b border-r border-gray-100 text-sm font-bold text-gray-700"
                  >
                    {day.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {timeSlots.map((slot) => (
                <tr key={slot} className="h-20">
                  <td className="text-center border-b border-r border-gray-50 bg-gray-50/30">
                    <span className="text-[10px] font-black text-gray-400">
                      Tiết {slot}
                    </span>
                    <div className="text-[9px] font-bold text-indigo-300 mt-1 uppercase">
                      {slot <= 5 ? "Sáng" : slot <= 10 ? "Chiều" : "Tối"}
                    </div>
                  </td>
                  {daysOfWeek.map((day) => {
                    const cellData = schedule[`${day.value}-${slot}`];

                    // Logic để gộp ô nếu môn học kéo dài nhiều tiết
                    let isInsideGroup = false;
                    for (let s = 1; s < slot; s++) {
                      const prevData = schedule[`${day.value}-${s}`];
                      if (prevData && s + prevData.soTiet > slot) {
                        isInsideGroup = true;
                        break;
                      }
                    }

                    if (isInsideGroup) return null;

                    return (
                      <td
                        key={`${day.value}-${slot}`}
                        rowSpan={cellData?.soTiet || 1}
                        className={`p-2 border-b border-r border-gray-50 align-top transition-colors ${
                          cellData ? "bg-indigo-50/20" : "hover:bg-gray-50/50"
                        }`}
                      >
                        {cellData && (
                          <div className="h-full bg-indigo-50/50 border-l-4 border-indigo-500 p-3 rounded-r-2xl shadow-sm transition-all hover:bg-indigo-100/50 group">
                            <div className="text-xs font-black text-indigo-900 leading-tight mb-2 uppercase tracking-tight group-hover:text-indigo-600 transition-colors">
                              {cellData.tenMon}
                            </div>
                            <div className="flex items-center text-[10px] text-indigo-600 font-bold mb-1">
                              <MapPin size={12} className="mr-1" />{" "}
                              {cellData.phong}
                            </div>
                            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">
                              Mã: {cellData.maLop}
                            </div>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Hiển thị các lớp đã nhận được nhưng chưa có thông tin lịch cụ thể */}
      {unscheduledClasses.length > 0 && (
        <div className="bg-amber-50 rounded-[2rem] border border-amber-100 p-8 shadow-sm">
          <div className="flex items-center mb-4">
            <Info size={24} className="text-amber-500 mr-3" />
            <h3 className="text-xs font-black text-amber-800 uppercase tracking-[0.2em]">
              Lớp học phần chưa có thông tin xếp lịch
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {unscheduledClasses.map((lop, idx) => (
              <div
                key={idx}
                className="bg-white p-4 rounded-2xl border border-amber-100 shadow-sm"
              >
                <p className="text-[10px] font-black text-amber-600 uppercase mb-1">
                  {lop.MaLopHP}
                </p>
                <p className="text-sm font-bold text-gray-800 truncate">
                  {lop.mon_hoc?.TenMon || lop.TenMon || "N/A"}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LichGiangDay;
