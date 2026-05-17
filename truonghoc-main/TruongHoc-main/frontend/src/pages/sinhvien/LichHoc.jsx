import React, { useState, useEffect } from "react";
import axiosClient from "@/api/axios";
import { CalendarDays, ChevronLeft, ChevronRight, Printer } from "lucide-react";

const LichHoc = () => {
  const [schedule, setSchedule] = useState({});
  const [loading, setLoading] = useState(true);
  const [hocKy, setHocKy] = useState("");
  const [semesters, setSemesters] = useState([]);
  const [selectedSemester, setSelectedSemester] = useState("");

  // Hàm lấy ngày Thứ 2 của tuần chứa ngày được chọn
  const getStartOfWeek = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  };

  const [currentWeekStart, setCurrentWeekStart] = useState(
    getStartOfWeek(new Date()),
  );

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

  const fetchLichHoc = async (hkId = null, date = null) => {
    setLoading(true);
    try {
      const params = {};
      // Nếu hkId không được truyền (null), sử dụng selectedSemester hiện tại
      const activeHkId = hkId !== null ? hkId : selectedSemester;
      if (activeHkId) params.hocKyId = activeHkId;

      if (date) {
        // Tránh lệch múi giờ khi gửi lên Backend
        const targetDate = date instanceof Date ? date : new Date(date);
        const y = targetDate.getFullYear();
        const m = String(targetDate.getMonth() + 1).padStart(2, "0");
        const d = String(targetDate.getDate()).padStart(2, "0");
        params.date = `${y}-${m}-${d}`;
      }

      const res = await axiosClient.get("/sinh-vien/lich-hoc", { params });

      // Laravel trả về: { success: true, data: { hoc_ky, range, data: [] } }
      // Trích xuất payload chứa các metadata
      const response = res?.data || res;
      // Mảng lịch học thực sự nằm trong response.data
      const scheduleItems = Array.isArray(response?.data) ? response.data : [];

      if (res.success || response.success) {
        setHocKy(response.hoc_ky || res.hoc_ky);
        // Đồng bộ ngày hiển thị trên lịch với range mà Backend trả về
        if (response.range?.start) {
          // Tách chuỗi YYYY-MM-DD để tạo Date local, tránh lỗi UTC jump ngày
          const [y, m, d] = response.range.start.split("-");
          setCurrentWeekStart(new Date(y, m - 1, d));
        }

        // Map dữ liệu vào grid: { "thu-tiet": { data } }
        const mapped = {};
        scheduleItems.forEach((item) => {
          // Chuyển đổi tên Thứ sang số (2-8) - Normalize chữ thường để tránh lỗi so khớp
          const dayMap = {
            "thứ hai": 2,
            "thứ ba": 3,
            "thứ tư": 4,
            "thứ năm": 5,
            "thứ sáu": 6,
            "thứ bảy": 7,
            "chủ nhật": 8,
          };
          const thuLabel = item.thu?.toLowerCase();
          const thuVal = dayMap[thuLabel] || 2;
          const key = `${thuVal}-${item.tiet_bd}`;
          mapped[key] = {
            tenMon: item.ten_mon,
            maLop: item.ma_lop_hp,
            phong: item.phong,
            giangVien: item.giang_vien,
            soTiet: item.so_tiet,
          };
        });
        setSchedule(mapped);
      }
    } catch (error) {
      console.error("Lỗi khi tải lịch học:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        const resHk = await axiosClient.get("/sinh-vien/hoc-ky");
        if (resHk.data && Array.isArray(resHk.data)) {
          setSemesters(resHk.data);
        }
        // Gọi lần đầu để lấy lịch tuần hiện tại
        await fetchLichHoc();
      } catch (e) {}
    };
    init();
  }, []);

  const handleSemesterChange = async (e) => {
    const hkId = e.target.value;
    setSelectedSemester(hkId);
    // Truyền date = null để Backend tự nhảy về ngày bắt đầu học kỳ đó
    await fetchLichHoc(hkId, null);
  };

  const changeWeek = async (offset) => {
    const nextDate = new Date(currentWeekStart);
    nextDate.setDate(nextDate.getDate() + offset * 7);

    // Phải fetch trước hoặc dùng giá trị nextDate trực tiếp để tránh dùng state cũ
    await fetchLichHoc(selectedSemester, nextDate);
    setCurrentWeekStart(nextDate);
  };

  const handleGoToToday = () => {
    const today = getStartOfWeek(new Date());
    setCurrentWeekStart(today);
    fetchLichHoc(selectedSemester, today);
  };

  const weekEnd = new Date(currentWeekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  if (loading)
    return <div className="p-10 text-center">Đang tải thời khóa biểu...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fadeIn pb-10">
      {/* Unified Header Section */}
      <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-50/40 rounded-full -mr-20 -mt-20 blur-3xl" />
        <div className="absolute bottom-0 left-20 w-40 h-40 bg-blue-50/30 rounded-full -mb-10 blur-2xl" />

        <div className="relative flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-6">
            <CalendarDays size={42} className="text-indigo-600 shrink-0" />
            <div>
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                Thời khóa biểu cá nhân
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <select
                  className="text-indigo-600 font-bold bg-indigo-50 border-none rounded-lg py-1 px-2 outline-none text-sm cursor-pointer"
                  value={selectedSemester}
                  onChange={handleSemesterChange}
                >
                  <option value="">Học kỳ hiện tại</option>
                  {semesters.map((s) => (
                    <option key={s.HocKyID} value={s.HocKyID}>
                      {s.TenHocKy}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <button
                onClick={() => changeWeek(-1)}
                className="px-3 py-2 hover:bg-gray-50 text-gray-600 border-r border-gray-200 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <div className="px-4 py-2 text-sm font-bold text-indigo-600 bg-indigo-50/50">
                {currentWeekStart.toLocaleDateString("vi-VN")} -{" "}
                {weekEnd.toLocaleDateString("vi-VN")}
              </div>
              <button
                onClick={() => changeWeek(1)}
                className="px-3 py-2 hover:bg-gray-50 text-gray-600 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
            <button
              onClick={handleGoToToday}
              className="px-4 py-2 bg-gray-50 text-gray-600 rounded-xl text-xs font-bold hover:bg-gray-100 transition-all border border-gray-100"
            >
              Tuần này
            </button>
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 shadow-md shadow-blue-100 transition-all flex items-center gap-2"
            >
              <Printer size={14} /> In lịch
            </button>
          </div>
        </div>
      </div>

      {Object.keys(schedule).length === 0 && !loading && (
        <div className="bg-white p-16 rounded-[2.5rem] text-center text-gray-400 border border-dashed border-gray-200 shadow-sm">
          Bạn không có lịch học trong tuần này.
        </div>
      )}

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse table-fixed min-w-[800px]">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="w-20 py-4 border-b border-r border-gray-100 text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                  Tiết
                </th>
                {daysOfWeek.map((day, index) => {
                  const dateLabel = new Date(currentWeekStart);
                  dateLabel.setDate(dateLabel.getDate() + index);
                  const isToday =
                    dateLabel.toDateString() === new Date().toDateString();
                  return (
                    <th
                      key={day.value}
                      className={`py-4 border-b border-r border-gray-100 text-sm font-bold ${isToday ? "bg-indigo-50 text-indigo-700" : "text-gray-700"}`}
                    >
                      <div>{day.label}</div>
                      <div
                        className={`text-[10px] ${isToday ? "text-indigo-500" : "text-gray-400"} font-normal mt-1`}
                      >
                        {dateLabel.getDate()}/{dateLabel.getMonth() + 1}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {timeSlots.map((slot) => (
                <tr key={slot} className="h-20">
                  <td className="text-center border-b border-r border-gray-100 bg-gray-50/30">
                    <span className="text-xs font-black text-gray-500">
                      Tiết {slot}
                    </span>
                    <div className="text-[10px] text-gray-400 mt-1">
                      {slot === 1
                        ? "07:00"
                        : slot === 5
                          ? "10:30"
                          : slot === 7
                            ? "13:00"
                            : ""}
                    </div>
                  </td>
                  {daysOfWeek.map((day) => {
                    const cellData = schedule[`${day.value}-${slot}`];

                    // Logic để gộp ô nếu môn học kéo dài nhiều tiết
                    // Kiểm tra xem tiết hiện tại có thuộc khoảng thời gian của môn học đã bắt đầu ở tiết trước
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
                        className={`p-1.5 border-b border-r border-gray-100 align-top transition-all duration-200 ${
                          cellData ? "bg-indigo-50/50" : "hover:bg-gray-50/30"
                        }`}
                      >
                        {cellData && (
                          <div className="h-full bg-indigo-100/50 border-l-4 border-indigo-500 p-2 rounded-r-lg shadow-sm">
                            <div className="text-xs font-black text-indigo-800 leading-tight mb-1">
                              {cellData.tenMon}
                            </div>
                            <div className="text-[10px] text-indigo-600 font-medium">
                              📍 {cellData.phong}
                            </div>
                            <div className="text-[10px] text-gray-500 mt-1 truncate">
                              👤 {cellData.giangVien}
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
    </div>
  );
};

export default LichHoc;
