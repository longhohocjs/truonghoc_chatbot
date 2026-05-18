import React, { useState, useEffect } from "react";
import axiosClient from "@/api/axios";
import toast from "react-hot-toast";
import {
  Mail,
  Phone,
  ShieldCheck,
  Briefcase,
  Award,
  MapPin,
  Lock,
  Globe,
  ChevronRight,
} from "lucide-react";

const GiangVienProfile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState({ email: "", sodienthoai: "" });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    old_password: "",
    new_password: "",
    new_password_confirmation: "",
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        // Endpoint giả định dựa trên cấu trúc auth
        const response = await axiosClient.get("/giang-vien/profile");

        // Trích xuất dữ liệu linh hoạt (Hỗ trợ nhiều định dạng trả về từ Laravel)
        const isSuccess =
          response?.success === true || response?.status === "success";
        const payload = isSuccess ? response.data : response;

        if (payload && typeof payload === "object") {
          setProfile(payload);
          setEditData({
            email: payload.email || payload.Email || "",
            sodienthoai: payload.sodienthoai || payload.SoDienThoai || "",
          });
        }
      } catch (error) {
        console.error("Lỗi khi lấy thông tin hồ sơ:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleUpdateContact = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Gọi API cập nhật đã chuẩn hóa key ở Backend
      const res = await axiosClient.put("/giang-vien/profile/update", editData);
      toast.success("Cập nhật thông tin liên lạc thành công");
      setIsEditing(false);

      // Cập nhật lại state hiển thị từ dữ liệu mới nhất
      if (res.data?.data) {
        setProfile(res.data.data);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Cập nhật thất bại");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await axiosClient.post(
        "/giang-vien/profile/change-password",
        passwordData,
      );
      toast.success("Đổi mật khẩu thành công");
      setIsChangingPassword(false);
      setPasswordData({
        old_password: "",
        new_password: "",
        new_password_confirmation: "",
      });
    } catch (error) {
      const errorMsg = error.response?.data?.message || "Đổi mật khẩu thất bại";
      toast.error(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return <div className="p-8 text-center">Đang tải hồ sơ giảng viên...</div>;
  if (!profile)
    return (
      <div className="p-8 text-center text-red-500">
        Không tìm thấy thông tin giảng viên.
      </div>
    );

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fadeIn pb-10">
      {/* Main Identity Card */}
      <div className="bg-white rounded-[2.5rem] p-6 border border-gray-100 shadow-sm relative overflow-hidden group">
        <div className="flex flex-col md:flex-row gap-6 items-center relative z-10">
          <div className="relative">
            <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center text-2xl font-black text-indigo-600 border-4 border-white shadow-xl shadow-indigo-100/50 uppercase">
              {(profile.HoTen || profile.ho_ten || "?").charAt(0)}
            </div>
            <div
              className="absolute -bottom-2 -right-2 bg-emerald-500 w-8 h-8 rounded-full border-4 border-white"
              title="Đang hoạt động"
            ></div>
          </div>
          <div className="flex-1 text-center md:text-left space-y-4">
            <h2 className="text-2xl font-black text-gray-900 tracking-tight leading-none">
              {profile.HoTen || profile.ho_ten}
            </h2>
            <div className="flex flex-wrap justify-center md:justify-start gap-3">
              <span className="px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-black uppercase tracking-wider border border-indigo-100">
                {profile.HocVi || profile.hoc_vi || "Giảng viên"}
              </span>
              <span
                className={`px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider border ${
                  (profile.loai_giang_vien || profile.LoaiGiangVien) ===
                  "Thỉnh giảng"
                    ? "bg-orange-50 text-orange-600 border-orange-100"
                    : "bg-blue-50 text-blue-600 border-blue-100"
                }`}
              >
                {profile.loai_giang_vien || profile.LoaiGiangVien || "Cơ hữu"}
              </span>
              <span className="px-4 py-1.5 bg-gray-50 text-gray-500 rounded-xl text-xs font-black uppercase tracking-wider border border-gray-100">
                Mã GV: {profile.MaGV || profile.ma_gv}
              </span>
            </div>
          </div>
        </div>
        <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-indigo-50/30 rounded-full blur-2xl group-hover:bg-indigo-100/40 transition-colors"></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Work Info */}
        <div className="bg-white rounded-[2.5rem] p-6 border border-gray-100 shadow-sm space-y-6">
          <div>
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6 flex items-center">
              <Briefcase size={14} className="mr-2 text-indigo-400" /> Thông tin
              công tác
            </h3>
            <div className="space-y-4">
              <DetailRow
                label="Khoa / Phòng"
                value={
                  profile.ten_khoa ||
                  profile.khoa?.TenKhoa ||
                  profile.Khoa?.TenKhoa ||
                  "N/A"
                }
                icon={<Globe size={16} className="text-indigo-400" />}
              />
              <DetailRow
                label="Loại giảng viên"
                value={
                  profile.loai_giang_vien || profile.LoaiGiangVien || "Cơ hữu"
                }
                icon={<ShieldCheck size={16} className="text-indigo-400" />}
              />
              <DetailRow
                label="Trình độ đào tạo"
                value={profile.HocVi || profile.hoc_vi}
                icon={<Award size={16} className="text-indigo-400" />}
              />
              <DetailRow
                label="Chuyên môn"
                value={profile.ChuyenMon || profile.chuyen_mon}
                icon={<ChevronRight size={16} className="text-indigo-400" />}
              />
              <DetailRow
                label="Văn phòng làm việc"
                value={profile.VanPhong || profile.van_phong}
                icon={<MapPin size={16} className="text-indigo-400" />}
              />
            </div>
          </div>
        </div>

        {/* Right Column: Interaction Cards */}
        <div className="space-y-8">
          {/* Contact Edit Card */}
          <div className="bg-white rounded-[2.5rem] p-6 border border-gray-100 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center">
                <Mail size={14} className="mr-2 text-indigo-400" /> Liên hệ cá
                nhân
              </h3>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="text-[10px] font-black uppercase text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg hover:bg-indigo-600 hover:text-white transition-all"
              >
                {isEditing ? "Hủy" : "Chỉnh sửa"}
              </button>
            </div>

            {isEditing ? (
              <form onSubmit={handleUpdateContact} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">
                    Email
                  </label>
                  <input
                    type="email"
                    className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-sm"
                    value={editData.email}
                    onChange={(e) =>
                      setEditData({ ...editData, email: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">
                    Số điện thoại
                  </label>
                  <input
                    type="text"
                    className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-sm"
                    value={editData.sodienthoai}
                    onChange={(e) =>
                      setEditData({ ...editData, sodienthoai: e.target.value })
                    }
                  />
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-[0.98] disabled:bg-gray-200"
                >
                  {saving ? "ĐANG LƯU..." : "CẬP NHẬT THÔNG TIN"}
                </button>
              </form>
            ) : (
              <div className="space-y-5">
                <div className="flex items-center gap-4 p-4 bg-gray-50/50 rounded-2xl border border-gray-50">
                  <Mail size={18} className="text-gray-400" />
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                      Email
                    </p>
                    <p className="text-sm font-bold text-gray-700">
                      {profile.email || profile.Email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 bg-gray-50/50 rounded-2xl border border-gray-50">
                  <Phone size={18} className="text-gray-400" />
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                      Số điện thoại
                    </p>
                    <p className="text-sm font-bold text-gray-700">
                      {profile.sodienthoai ||
                        profile.SoDienThoai ||
                        "Chưa cập nhật"}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-indigo-600 rounded-[2.5rem] p-6 shadow-lg shadow-indigo-100 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>

            <div className="relative z-10">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-[10px] font-black text-indigo-100 uppercase tracking-[0.2em] flex items-center">
                  <ShieldCheck size={14} className="mr-2 text-indigo-200" /> Bảo
                  mật tài khoản
                </h3>
                {!isChangingPassword && (
                  <button
                    onClick={() => setIsChangingPassword(true)}
                    className="text-[10px] font-black uppercase text-white bg-white/20 px-3 py-1 rounded-lg hover:bg-white/30 transition-all"
                  >
                    Thay đổi
                  </button>
                )}
              </div>

              {isChangingPassword ? (
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <input
                    type="password"
                    className="w-full px-5 py-3 bg-white/10 border border-white/20 rounded-2xl outline-none focus:ring-2 focus:ring-white text-white placeholder-indigo-200 text-sm"
                    placeholder="Mật khẩu hiện tại"
                    value={passwordData.old_password}
                    onChange={(e) =>
                      setPasswordData({
                        ...passwordData,
                        old_password: e.target.value,
                      })
                    }
                    required
                  />
                  <input
                    type="password"
                    className="w-full px-5 py-3 bg-white/10 border border-white/20 rounded-2xl outline-none focus:ring-2 focus:ring-white text-white placeholder-indigo-200 text-sm"
                    placeholder="Mật khẩu mới"
                    value={passwordData.new_password}
                    onChange={(e) =>
                      setPasswordData({
                        ...passwordData,
                        new_password: e.target.value,
                      })
                    }
                    required
                  />
                  <input
                    type="password"
                    className="w-full px-5 py-3 bg-white/10 border border-white/20 rounded-2xl outline-none focus:ring-2 focus:ring-white text-white placeholder-indigo-200 text-sm"
                    placeholder="Xác nhận mật khẩu"
                    value={passwordData.new_password_confirmation}
                    onChange={(e) =>
                      setPasswordData({
                        ...passwordData,
                        new_password_confirmation: e.target.value,
                      })
                    }
                    required
                  />
                  <div className="flex gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex-1 bg-white text-indigo-600 font-black py-3 rounded-xl hover:bg-indigo-50 transition-all text-xs"
                    >
                      XÁC NHẬN
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsChangingPassword(false)}
                      className="px-5 py-3 bg-white/10 text-white font-black rounded-xl hover:bg-white/20 transition-all text-xs"
                    >
                      HỦY
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex items-center gap-4 py-2">
                  <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-white">
                    <Lock size={20} />
                  </div>
                  <div>
                    <p className="text-white font-bold text-sm">
                      Mật khẩu hệ thống
                    </p>
                    <p className="text-indigo-200 text-[10px] font-medium uppercase tracking-wider">
                      Bảo vệ tài khoản
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const DetailRow = ({ label, value, icon }) => (
  <div className="flex items-center justify-between p-3 bg-gray-50/30 rounded-2xl border border-gray-50">
    <div className="flex items-center gap-4">
      <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center">
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
          {label}
        </p>
        <p className="text-sm font-black text-gray-700">
          {value || "Chưa cập nhật"}
        </p>
      </div>
    </div>
  </div>
);
export default GiangVienProfile;
