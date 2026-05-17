import React, { useState, useEffect } from "react";
import axiosClient from "@/api/axios";
import toast from "react-hot-toast";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Shield,
  Book,
  GraduationCap,
  Edit3,
  X,
  Check,
  CalendarDays,
  UserCircle,
  CheckCircle2,
} from "lucide-react";

const StudentProfile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ email: "", sodienthoai: "" });

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get("/sinh-vien/profile");

      // Laravel Controller trả về wrapper { success: true, data: { ... } }
      // Ta cần lấy đúng phần tử 'data' chứa thông tin sinh viên
      const payload = res.data || res;
      const studentData = payload.data || payload;

      if (studentData) {
        setProfile(studentData);
        setEditData({
          email: studentData.email || "",
          sodienthoai:
            studentData.sodienthoai || studentData.so_dien_thoai || "",
        });
      }
    } catch (error) {
      toast.error("Không thể tải thông tin hồ sơ");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const toggleEditing = () => {
    setIsEditing(!isEditing);
  };

  const handleUpdateContact = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Đảm bảo chỉ gửi các trường mà Backend yêu cầu cho tính năng update contact
      const payload = {
        email: editData.email,
        sodienthoai: editData.sodienthoai,
      };
      await axiosClient.put("/sinh-vien/profile/contact", payload);
      toast.success("Cập nhật thông tin thành công");
      setIsEditing(false);
      fetchProfile();
    } catch (error) {
      toast.error("Cập nhật thất bại. Vui lòng kiểm tra lại dữ liệu.");
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="p-10 text-center text-gray-500 font-medium">
        Đang tải hồ sơ...
      </div>
    );

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fadeIn pb-10">
      {/* Unified Modern Header Section */}
      <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm relative overflow-hidden">
        {/* Subtle Decorative Backgrounds */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-50/40 rounded-full -mr-20 -mt-20 blur-3xl" />
        <div className="absolute bottom-0 left-20 w-40 h-40 bg-blue-50/30 rounded-full -mb-10 blur-2xl" />

        <div className="relative flex flex-col md:flex-row items-center gap-8">
          {/* Avatar Area: Using a modern Squircle design */}
          <div className="relative shrink-0">
            <div className="w-24 h-24 bg-gradient-to-tr from-indigo-600 to-blue-500 rounded-[1.5rem] flex items-center justify-center text-2xl font-black text-white shadow-xl transition-transform duration-500 hover:scale-105 hover:rotate-2 shadow-indigo-200/50">
              <span className="drop-shadow-md">
                {profile?.ho_ten?.charAt(0) || "S"}
              </span>
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-lg shadow-lg flex items-center justify-center border border-gray-50">
              <div
                className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-sm shadow-emerald-200"
                title="Đang hoạt động"
              />
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 text-center md:text-left space-y-3">
            <div className="space-y-1">
              <div className="flex flex-col md:flex-row md:items-center gap-3">
                <h2 className="text-2xl font-black text-gray-900 tracking-tight leading-none">
                  {profile?.ho_ten}
                </h2>
                <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[11px] font-extrabold border border-indigo-100/50 w-fit mx-auto md:mx-0">
                  {profile?.ma_sv}
                </span>
              </div>
              <div className="flex items-center justify-center md:justify-start gap-4 text-gray-500 font-medium">
                <span className="flex items-center gap-1.5 text-sm">
                  <GraduationCap size={18} className="text-indigo-400" />
                  Hệ chính quy
                </span>
                <span className="w-1 h-1 bg-gray-300 rounded-full hidden md:block" />
                <span className="text-sm">{profile?.nganh?.ten_nganh}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cột trái: Thông tin học tập & Cố vấn */}
        <div className="lg:col-span-1 space-y-8">
          {/* Học tập */}
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-widest mb-6 flex items-center">
              <Book size={18} className="mr-2 text-indigo-600" /> Học tập
            </h3>
            <div className="space-y-5">
              <InfoItem
                label="Lớp sinh hoạt"
                value={profile?.lop_sinh_hoat?.ten_lop}
              />
              <InfoItem
                label="Năm nhập học"
                value={profile?.lop_sinh_hoat?.nam_nhap_hoc}
              />
            </div>
          </div>

          {/* Cố vấn học tập - Re-styled as Minimal Card */}
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-widest mb-6 flex items-center">
              <Shield size={18} className="mr-2 text-indigo-600" /> Cố vấn học
              tập
            </h3>
            {profile?.co_van_hoc_tap ? (
              <div className="space-y-5">
                <InfoItem
                  label="Họ tên cố vấn"
                  value={profile.co_van_hoc_tap.ho_ten}
                />
                <InfoItem
                  label="Học vị"
                  value={profile.co_van_hoc_tap.hoc_vi || "Giảng viên"}
                />
                <div className="pt-2 space-y-4 border-t border-gray-50">
                  <div className="flex items-start gap-3">
                    <Mail size={16} className="mt-1 text-indigo-400 shrink-0" />
                    <InfoItem
                      label="Email"
                      value={profile.co_van_hoc_tap.email}
                    />
                  </div>
                  <div className="flex items-start gap-3">
                    <Phone
                      size={16}
                      className="mt-1 text-indigo-400 shrink-0"
                    />
                    <InfoItem
                      label="Số điện thoại"
                      value={profile.co_van_hoc_tap.so_dien_thoai}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm italic text-gray-400">
                Chưa phân công cố vấn
              </p>
            )}
          </div>
        </div>

        {/* Cột phải: Thông tin chi tiết & Liên lạc */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white p-8 md:p-10 rounded-[2rem] shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-sm font-bold text-gray-800 uppercase tracking-widest flex items-center">
                <User size={18} className="mr-2 text-indigo-600" /> Hồ sơ cá
                nhân
              </h3>
              {!isEditing && (
                <button
                  onClick={toggleEditing}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-100"
                >
                  <Edit3 size={14} /> Chỉnh sửa
                </button>
              )}
            </div>

            {isEditing ? (
              <form
                onSubmit={handleUpdateContact}
                className="space-y-6 animate-fadeIn"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-gray-400 uppercase ml-1">
                      Email cá nhân
                    </label>
                    <input
                      type="email"
                      className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
                      value={editData.email}
                      onChange={(e) =>
                        setEditData({ ...editData, email: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-gray-400 uppercase ml-1">
                      Số điện thoại
                    </label>
                    <input
                      type="text"
                      className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
                      value={editData.sodienthoai}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          sodienthoai: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={toggleEditing}
                    className="px-6 py-3 border border-gray-100 rounded-xl text-xs font-bold text-gray-400 hover:bg-gray-50 transition-all flex items-center gap-2"
                  >
                    <X size={14} /> Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-8 py-3 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all flex items-center gap-2"
                  >
                    {saving ? (
                      "Đang lưu..."
                    ) : (
                      <>
                        <Check size={14} /> Lưu thay đổi
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-8 gap-x-12">
                <DetailItem
                  icon={<CalendarDays size={16} />}
                  label="Ngày sinh"
                  value={profile?.ngay_sinh}
                />
                <DetailItem
                  icon={<UserCircle size={16} />}
                  label="Giới tính"
                  value={profile?.gioi_tinh}
                />
                <DetailItem
                  icon={<Mail size={16} />}
                  label="Email liên lạc"
                  value={profile?.email}
                />
                <DetailItem
                  icon={<Phone size={16} />}
                  label="Số điện thoại"
                  value={profile?.sodienthoai || profile?.so_dien_thoai}
                />
                <DetailItem
                  icon={<CheckCircle2 size={16} />}
                  label="Dân tộc / Tôn giáo"
                  value={`${profile?.dan_toc || "N/A"} / ${profile?.ton_giao || "N/A"}`}
                />
                <DetailItem
                  icon={<MapPin size={16} />}
                  label="Quê quán"
                  value={profile?.que_quan}
                />
                <div className="md:col-span-2">
                  <DetailItem
                    icon={<MapPin size={16} />}
                    label="Địa chỉ thường trú"
                    value={profile?.dia_chi}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const InfoItem = ({ label, value }) => (
  <div>
    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
      {label}
    </p>
    <p className="text-sm font-semibold text-gray-700">
      {value || "Chưa cập nhật"}
    </p>
  </div>
);

const DetailItem = ({ icon, label, value }) => (
  <div className="flex items-start gap-4">
    <div className="mt-1 text-indigo-400">{icon}</div>
    <div>
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
        {label}
      </p>
      <p className="text-[13px] font-semibold text-gray-800">
        {value || "Chưa cập nhật"}
      </p>
    </div>
  </div>
);

export default StudentProfile;
