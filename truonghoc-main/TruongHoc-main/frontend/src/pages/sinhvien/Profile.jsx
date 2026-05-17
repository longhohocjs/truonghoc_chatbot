import React, { useState, useEffect } from "react";
import axiosClient from "@/api/axios";

const Profile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        // Giả định endpoint lấy thông tin chi tiết sinh viên
        const response = await axiosClient.get("/sinh-vien/profile");
        console.log("Dữ liệu Profile nhận được:", response);

        // Laravel thường bọc dữ liệu trong { success: true, data: { ... } }
        // axiosClient trả về response.data (object JSON)
        const isSuccess =
          response?.success === true || response?.status === "success";
        const payload = isSuccess ? response.data : response;

        if (payload && typeof payload === "object") {
          setProfile(payload);
        } else {
          setProfile(null);
        }
      } catch (error) {
        console.error("Lỗi khi lấy thông tin hồ sơ:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  if (loading) return <div className="p-8 text-center">Đang tải hồ sơ...</div>;
  if (!profile)
    return (
      <div className="p-8 text-center text-red-500">
        Không tìm thấy thông tin sinh viên.
      </div>
    );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header Profile */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-700"></div>
        <div className="px-8 pb-8">
          <div className="relative flex items-end -mt-12 mb-6">
            <div className="p-1 bg-white rounded-full shadow-md">
              <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center text-3xl font-bold text-blue-600 border-4 border-white">
                {(profile.ho_ten || profile.HoTen || "?").charAt(0)}
              </div>
            </div>
            <div className="ml-6 mb-2">
              <h2 className="text-2xl font-bold text-gray-900">
                {profile.ho_ten || profile.HoTen}
              </h2>
              <p className="text-gray-500 font-medium">
                Mã SV: {profile.ma_sv || profile.MaSV}
              </p>
            </div>
            <div className="ml-auto mb-2">
              <span className="px-4 py-1.5 bg-green-100 text-green-700 rounded-full text-sm font-bold">
                Đang học
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Cột trái: Thông tin học vấn */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
              <svg
                className="w-5 h-5 mr-2 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 14l9-5-9-5-9 5 9 5z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"
                />
              </svg>
              Thông tin học tập
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">
                  Ngành học
                </p>
                <p className="text-sm font-semibold text-gray-700">
                  {profile.nganh?.ten_nganh ||
                    profile.ten_nganh ||
                    profile.TenNganh}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">
                  Khoa
                </p>
                <p className="text-sm font-semibold text-gray-700">
                  {profile.nganh?.khoa || profile.ten_khoa || profile.TenKhoa}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">
                  Lớp sinh hoạt
                </p>
                <p className="text-sm font-semibold text-blue-600">
                  {profile.lop_sinh_hoat?.ten_lop ||
                    profile.ten_lop_sinh_hoat ||
                    profile.TenLop ||
                    profile.lop?.TenLop}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">
                  Khóa học
                </p>
                <p className="text-sm font-semibold text-gray-700">
                  {profile.lop_sinh_hoat?.nam_nhap_hoc ||
                    profile.khoa_hoc ||
                    "N/A"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Cột phải: Thông tin cá nhân */}
        <div className="md:col-span-2">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center">
              <svg
                className="w-5 h-5 mr-2 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              Thông tin cá nhân chi tiết
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              <InfoItem
                label="Ngày sinh"
                value={profile.ngay_sinh || profile.NgaySinh}
              />
              <InfoItem
                label="Giới tính"
                value={profile.gioi_tinh || profile.GioiTinh}
              />
              <InfoItem
                label="Số điện thoại"
                value={profile.so_dien_thoai || profile.sodienthoai}
              />
              <InfoItem label="Email" value={profile.email || profile.Email} />
              <InfoItem
                label="Dân tộc"
                value={profile.dan_toc || profile.DanToc}
              />
              <InfoItem
                label="Tôn giáo"
                value={profile.ton_giao || profile.TonGiao}
              />
              <div className="md:col-span-2">
                <InfoItem
                  label="Nơi sinh / Quê quán"
                  value={profile.que_quan || profile.QueQuan}
                />
              </div>
              <div className="md:col-span-2">
                <InfoItem
                  label="Địa chỉ thường trú"
                  value={profile.dia_chi || profile.DiaChi}
                />
              </div>
            </div>

            <div className="mt-10 pt-6 border-t border-gray-100 flex justify-end">
              <button className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200">
                Chỉnh sửa thông tin
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const InfoItem = ({ label, value }) => (
  <div className="border-b border-gray-50 pb-2">
    <p className="text-xs text-gray-400 mb-1 font-medium">{label}</p>
    <p className="text-sm font-semibold text-gray-800">
      {value || "Chưa cập nhật"}
    </p>
  </div>
);

export default Profile;
