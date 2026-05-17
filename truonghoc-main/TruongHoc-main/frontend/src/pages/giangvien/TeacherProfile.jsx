import React, { useState, useEffect } from "react";
import axiosClient from "@/api/axios";
import toast from "react-hot-toast";

const TeacherProfile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ email: "", sodienthoai: "" });

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get("/giang-vien/profile");
      const payload = res.data?.data || res.data || res;

      if (payload) {
        setProfile(payload);
        // Map dữ liệu vào form chỉnh sửa
        setEditData({
          email: payload.email || "",
          sodienthoai: payload.sodienthoai || "",
        });
      }
    } catch (error) {
      toast.error("Không thể tải thông tin hồ sơ giảng viên");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const toggleEditing = () => setIsEditing(!isEditing);

  const handleUpdateContact = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await axiosClient.put("/giang-vien/profile/update", editData);
      toast.success("Cập nhật thông tin liên lạc thành công");
      setIsEditing(false);
      // Cập nhật lại state local từ dữ liệu trả về của Backend
      if (res.data?.data) {
        setProfile(res.data.data);
      } else {
        fetchProfile();
      }
    } catch (error) {
      const errorMsg =
        error.response?.data?.errors?.email?.[0] || "Cập nhật thất bại";
      toast.error(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="p-10 text-center text-gray-500 font-medium">
        Đang tải hồ sơ giảng viên...
      </div>
    );

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Banner */}
        <div className="h-32 bg-gradient-to-r from-indigo-600 to-blue-700"></div>

        <div className="px-8 pb-8">
          <div className="relative flex items-end -mt-12 mb-6">
            <div className="p-1 bg-white rounded-full shadow-lg">
              <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center text-3xl font-black text-indigo-600 border-4 border-white uppercase">
                {profile?.HoTen?.charAt(0) || "G"}
              </div>
            </div>
            <div className="ml-6 mb-2 flex-1 flex justify-between items-end">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {profile?.HoTen}
                </h2>
                <p className="text-indigo-600 font-bold text-sm uppercase tracking-wider">
                  {profile?.HocVi || "Giảng viên"} • {profile?.MaGV}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Cột 1: Thông tin cơ bản */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b pb-2">
                Thông tin công tác
              </h3>
              <InfoRow label="Khoa" value={profile?.khoa?.TenKhoa} />
              <InfoRow label="Chuyên môn" value={profile?.ChuyenMon} />
              <InfoRow label="Tài khoản" value={profile?.user?.Username} />
            </div>

            {/* Cột 2: Thông tin liên lạc - CÓ NÚT CHỈNH SỬA Ở ĐÂY */}
            <div className="space-y-4 bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
              <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                  Liên lạc
                </h3>
                <button
                  type="button"
                  onClick={toggleEditing}
                  className="text-indigo-600 text-xs font-black hover:bg-indigo-600 hover:text-white px-2 py-1 rounded-md transition-all uppercase cursor-pointer"
                >
                  {isEditing ? "Hủy bỏ" : "Chỉnh sửa"}
                </button>
              </div>

              {isEditing ? (
                <form onSubmit={handleUpdateContact} className="space-y-3 pt-2">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
                      Email cá nhân
                    </label>
                    <input
                      type="email"
                      required
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                      value={editData.email}
                      onChange={(e) =>
                        setEditData({ ...editData, email: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
                      Số điện thoại
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                      value={editData.sodienthoai}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          sodienthoai: e.target.value,
                        })
                      }
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full bg-indigo-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all"
                  >
                    {saving ? "Đang xử lý..." : "LƯU THÔNG TIN"}
                  </button>
                </form>
              ) : (
                <div className="space-y-3 pt-2">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-gray-400 font-bold uppercase">
                      Email
                    </span>
                    <span className="text-sm font-semibold text-gray-700">
                      {profile?.email || "Chưa cập nhật"}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-gray-400 font-bold uppercase">
                      Điện thoại
                    </span>
                    <span className="text-sm font-semibold text-gray-700">
                      {profile?.sodienthoai || "Chưa cập nhật"}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Cột 3: Trạng thái tài khoản */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b pb-2">
                Hệ thống
              </h3>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-xs">Trạng thái:</span>
                <span
                  className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${profile?.user?.is_active ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}`}
                >
                  {profile?.user?.is_active ? "Đang hoạt động" : "Bị khóa"}
                </span>
              </div>
              <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                <p className="text-[10px] text-indigo-400 font-bold uppercase mb-2 text-center">
                  Bảo mật
                </p>
                <button className="w-full text-indigo-600 text-xs font-bold hover:underline">
                  Đổi mật khẩu tài khoản
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const InfoRow = ({ label, value }) => (
  <div className="flex justify-between items-center py-1">
    <span className="text-gray-400 text-xs">{label}:</span>
    <span className="text-gray-800 font-semibold text-sm">
      {value || "N/A"}
    </span>
  </div>
);

export default TeacherProfile;
