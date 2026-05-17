import React, { useState, useEffect } from "react";
import axiosClient from "@/api/axios";
import UserModal from "./UserModal";
import {
  Users,
  UserPlus,
  Search,
  Filter,
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  Trash2,
  MoreVertical,
  GraduationCap,
  UserCog,
  Briefcase,
  Pencil,
} from "lucide-react";
import toast from "react-hot-toast";

const UserManagement = () => {
  const [activeTab, setActiveTab] = useState("sinhvien"); // sinhvien, giangvien, admin
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [khoas, setKhoas] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [filters, setFilters] = useState({
    KhoaID: "",
    search: "",
    per_page: 15, // Mặc định 15 người dùng mỗi trang
    page: 1,
  });

  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    total: 0,
  });

  useEffect(() => {
    fetchKhoas();
  }, []);

  useEffect(() => {
    fetchUsers(filters);
  }, [activeTab, filters]);

  const fetchKhoas = async () => {
    try {
      const res = await axiosClient.post("/admin/khoa/list");
      setKhoas(res.data || []);
    } catch (error) {
      console.error("Lỗi lấy danh sách khoa");
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setFilters((prev) => ({ ...prev, page: 1, KhoaID: "" })); // Reset về trang 1 và xóa lọc khoa khi đổi tab
  };

  const fetchUsers = async (currentFilters) => {
    setLoading(true);
    try {
      let endpoint = "";
      let payload = { ...currentFilters, page: currentFilters.page || 1 };

      if (activeTab === "sinhvien") {
        endpoint = "/admin/users/sinh-vien/index";
        payload.KhoaID = currentFilters.KhoaID; // Đảm bảo KhoaID được truyền đúng
      } else {
        endpoint = "/admin/users/staff/index";
        payload.RoleID = activeTab === "giangvien" ? 2 : 1;
        payload.KhoaID = currentFilters.KhoaID; // Đảm bảo KhoaID được truyền đúng
      }

      const res = await axiosClient.post(endpoint, payload);
      // Laravel Controller bọc kết quả vào res.data (với phân trang)
      const payloadData = res.data || res;

      if (payloadData && payloadData.data && Array.isArray(payloadData.data)) {
        setUsers(payloadData.data);
        setPagination({
          current_page: payloadData.current_page || 1,
          last_page: payloadData.last_page || 1,
          total: payloadData.total || 0,
        });
      } else {
        const dataArray = Array.isArray(payloadData) ? payloadData : [];
        setUsers(dataArray);
        setPagination({
          current_page: 1,
          last_page: 1,
          total: dataArray.length,
        });
      }
    } catch (error) {
      toast.error("Không thể tải danh sách người dùng");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (userId) => {
    try {
      const res = await axiosClient.post("/admin/users/toggle-status", {
        UserID: userId,
      });
      toast.success(
        res.is_active ? "Đã kích hoạt tài khoản" : "Đã khóa tài khoản",
      );
      fetchUsers(filters); // Truyền filters để giữ nguyên trang hiện tại
    } catch (error) {
      toast.error("Thao tác thất bại");
    }
  };

  const handleResetPassword = async (userId) => {
    if (!window.confirm("Đặt lại mật khẩu về mặc định (123456)?")) return;
    try {
      await axiosClient.post("/admin/users/reset-password", { UserID: userId });
      toast.success("Mật khẩu đã được đặt lại");
    } catch (error) {
      toast.error("Lỗi khi đặt lại mật khẩu");
    }
  };

  const handleDelete = async (u) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa người dùng này vĩnh viễn?"))
      return;

    try {
      let endpoint = "";
      if (u.UserID) {
        // Xóa thông qua UserID (Sẽ xóa cả account và profile liên quan)
        endpoint = `/admin/users/${u.UserID}`;
      } else {
        // Trường hợp Staff/Giảng viên mới tạo hồ sơ (profile) nhưng chưa cấp account
        const staffId = u.GiangVienID || u.AdminID;
        const roleId = activeTab === "giangvien" ? 2 : 1;
        endpoint = `/admin/users/profile/${staffId}/${roleId}`;
      }

      const res = await axiosClient.delete(endpoint);
      toast.success(res.message || "Xóa người dùng thành công");
      fetchUsers(filters);
    } catch (error) {
      console.error("Lỗi khi xóa người dùng:", error);
      const errorMsg =
        error.response?.data?.message || "Không thể xóa người dùng vào lúc này";
      toast.error(errorMsg);
    }
  };

  const handleSaveUser = async (data) => {
    try {
      let endpoint = "";
      let method = "post";

      // Xác định endpoint và method dựa trên tab và hành động (Thêm/Sửa)
      if (activeTab === "sinhvien") {
        endpoint = "/admin/users/sinh-vien";
        method = editingUser ? "patch" : "post";
      } else if (activeTab === "giangvien") {
        endpoint = editingUser
          ? "/admin/users/staff"
          : "/admin/users/giang-vien-with-account";
        method = editingUser ? "patch" : "post";
      } else {
        endpoint = editingUser
          ? "/admin/users/staff"
          : "/admin/users/staff-profile";
        method = editingUser ? "patch" : "post";
      }

      const payload = { ...data };
      if (editingUser) {
        if (activeTab === "sinhvien") {
          payload.SinhVienID = editingUser.SinhVienID;
        } else {
          payload.StaffID = editingUser.GiangVienID || editingUser.AdminID;
          payload.RoleID = activeTab === "giangvien" ? 2 : 1;
        }
      } else if (activeTab !== "sinhvien") {
        payload.RoleID = activeTab === "giangvien" ? 2 : 1;
      }

      const res = await axiosClient[method](endpoint, payload);
      toast.success(res.message || "Thao tác thành công");
      setIsModalOpen(false);
      setFilters((prev) => ({
        ...prev,
        page: 1, // Reset về trang 1 sau khi thêm/sửa
      }));
    } catch (error) {
      // Lỗi validation đã được axios interceptor hiển thị qua toast
    }
  };

  // Hàm tạo dải số trang hiển thị (Logic rút gọn số trang)
  const getPageNumbers = () => {
    const { current_page, last_page } = pagination;
    const pages = [];
    const delta = 2; // Số lượng trang hiển thị xung quanh trang hiện tại

    for (let i = 1; i <= last_page; i++) {
      if (
        i === 1 ||
        i === last_page ||
        (i >= current_page - delta && i <= current_page + delta)
      ) {
        pages.push(i);
      } else if (
        (i === current_page - delta - 1 && i > 1) ||
        (i === current_page + delta + 1 && i < last_page)
      ) {
        pages.push("...");
      }
    }
    return pages.filter((item, index) => pages.indexOf(item) === index);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fadeIn pb-10">
      {/* Header Section */}
      <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-50/40 rounded-full -mr-20 -mt-20 blur-3xl" />

        <div className="relative flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-6">
            <div className="p-4 bg-indigo-600 rounded-3xl text-white shadow-lg shadow-indigo-100">
              <Users size={32} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                Quản lý Người dùng
              </h2>
              <p className="text-gray-500 text-sm font-medium">
                Phân quyền, cấp tài khoản và quản lý trạng thái nhân sự/sinh
                viên
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setEditingUser(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 bg-gray-900 text-white px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-xl shadow-gray-200 active:scale-95"
          >
            <UserPlus size={18} /> Thêm người dùng
          </button>
        </div>
      </div>

      {/* Tabs & Filters */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="bg-white p-1.5 rounded-2xl border border-gray-100 flex gap-1 shadow-sm">
          <TabButton
            active={activeTab === "sinhvien"}
            onClick={() => handleTabChange("sinhvien")}
            icon={<GraduationCap size={16} />}
            label="Sinh viên"
          />
          <TabButton
            active={activeTab === "giangvien"}
            onClick={() => handleTabChange("giangvien")}
            icon={<Briefcase size={16} />}
            label="Giảng viên"
          />
          <TabButton
            active={activeTab === "admin"}
            onClick={() => handleTabChange("admin")}
            icon={<UserCog size={16} />}
            label="Quản trị"
          />
        </div>

        <div className="flex gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Tìm tên, mã số..."
              className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium"
              value={filters.search}
              onChange={(e) =>
                setFilters({ ...filters, search: e.target.value, page: 1 })
              }
              onKeyPress={(e) => e.key === "Enter" && fetchUsers(filters)}
            />
          </div>
          <select
            className="bg-white border border-gray-100 px-4 py-3.5 rounded-2xl outline-none text-sm font-bold text-gray-600 focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
            value={filters.KhoaID}
            onChange={(e) =>
              setFilters({ ...filters, KhoaID: e.target.value, page: 1 })
            }
          >
            <option value="">
              {activeTab === "sinhvien" ? "Tất cả Khoa" : "Tất cả Khoa/Phòng"}
            </option>

            {khoas.map((k) => (
              <option key={k.KhoaID} value={k.KhoaID}>
                {k.TenKhoa}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50/50 text-gray-400 text-[11px] uppercase font-bold tracking-[0.15em] border-b border-gray-100">
              <tr>
                <th className="px-8 py-5">Người dùng</th>
                <th className="px-6 py-5">Mã định danh</th>
                <th className="px-6 py-5">Khoa / Phòng</th>
                <th className="px-6 py-5">Trạng thái</th>
                <th className="px-8 py-5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-8 py-20 text-center">
                    <div className="inline-block w-8 h-8 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td
                    colSpan="5"
                    className="px-8 py-20 text-center text-gray-400 font-medium italic"
                  >
                    Không tìm thấy người dùng nào
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr
                    key={u.UserID || u.SinhVienID || u.GiangVienID}
                    className="hover:bg-gray-50/50 transition-all group"
                  >
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 font-black text-xs border-2 border-white shadow-sm">
                          {u.HoTen?.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-black text-gray-900">
                            {u.HoTen}
                          </p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">
                            {u.email || u.Email || "Chưa có email"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
                        {u.MaSV || u.MaGV || u.Username || "N/A"}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <p className="text-xs font-bold text-gray-600">
                        {u.khoa?.TenKhoa || u.TenKhoa || "Hệ thống"}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-[10px] text-gray-400 font-medium uppercase">
                          {u.nganh?.TenNganh || u.hoc_vi || ""}
                        </p>
                        {u.LoaiGiangVien && (
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase ${u.LoaiGiangVien === "Thỉnh giảng" ? "bg-orange-50 text-orange-600" : "bg-blue-50 text-blue-600"}`}
                          >
                            {u.LoaiGiangVien}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <StatusBadge active={u.user?.is_active ?? u.is_active} />
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex justify-end items-center gap-2">
                        <ActionButton
                          icon={<Pencil size={16} />}
                          onClick={() => {
                            setEditingUser(u);
                            setIsModalOpen(true);
                          }}
                          tooltip="Chỉnh sửa hồ sơ"
                        />
                        <ActionButton
                          icon={<KeyRound size={16} />}
                          onClick={() => handleResetPassword(u.UserID)}
                          tooltip="Reset Password"
                        />
                        <ActionButton
                          icon={
                            (u.user?.is_active ?? u.is_active) ? (
                              <ShieldAlert size={16} />
                            ) : (
                              <ShieldCheck size={16} />
                            )
                          }
                          onClick={() => handleToggleStatus(u.UserID)}
                          variant={
                            (u.user?.is_active ?? u.is_active)
                              ? "danger"
                              : "success"
                          }
                          tooltip={
                            (u.user?.is_active ?? u.is_active)
                              ? "Khóa tài khoản"
                              : "Kích hoạt"
                          }
                        />
                        <ActionButton
                          icon={<Trash2 size={16} />}
                          onClick={() => handleDelete(u)}
                          variant="danger"
                          tooltip="Xóa vĩnh viễn"
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination UI */}
      {!loading && pagination.last_page > 1 && (
        <div className="px-8 py-6 bg-white rounded-[2rem] border border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4 shadow-sm">
          <div className="text-xs font-black text-gray-400 uppercase tracking-widest">
            Trang{" "}
            <span className="text-indigo-600">{pagination.current_page}</span> /{" "}
            {pagination.last_page}
            <span className="ml-2 text-gray-300">
              ({pagination.total} người dùng)
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              disabled={pagination.current_page === 1}
              onClick={() => setFilters({ ...filters, page: 1 })}
              className="p-2.5 rounded-xl border border-gray-100 bg-white text-gray-400 hover:text-indigo-600 disabled:opacity-30 transition-all"
            >
              «
            </button>

            <button
              disabled={pagination.current_page === 1}
              onClick={() =>
                setFilters({ ...filters, page: pagination.current_page - 1 })
              }
              className="px-4 py-2 rounded-xl border border-gray-100 bg-white text-xs font-black uppercase tracking-widest text-gray-400 hover:text-indigo-600 disabled:opacity-30 transition-all"
            >
              Trước
            </button>

            {getPageNumbers().map((page, index) =>
              page === "..." ? (
                <span key={index} className="px-2 text-gray-400">
                  ...
                </span>
              ) : (
                <button
                  key={index}
                  onClick={() => setFilters({ ...filters, page: page })}
                  className={`w-10 h-10 rounded-xl text-xs font-black transition-all ${
                    pagination.current_page === page
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100"
                      : "bg-white text-gray-400 border border-gray-100 hover:bg-indigo-50"
                  }`}
                >
                  {page}
                </button>
              ),
            )}

            <button
              disabled={pagination.current_page === pagination.last_page}
              onClick={() =>
                setFilters({ ...filters, page: pagination.current_page + 1 })
              }
              className="px-4 py-2 rounded-xl border border-gray-100 bg-white text-xs font-black uppercase tracking-widest text-gray-400 hover:text-indigo-600 disabled:opacity-30 transition-all"
            >
              Sau
            </button>

            <button
              disabled={pagination.current_page === pagination.last_page}
              onClick={() =>
                setFilters({ ...filters, page: pagination.last_page })
              }
              className="p-2.5 rounded-xl border border-gray-100 bg-white text-gray-400 hover:text-indigo-600 disabled:opacity-30 transition-all"
            >
              »
            </button>
          </div>
        </div>
      )}

      {/* Modal Thêm/Sửa */}
      <UserModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveUser}
        editingUser={editingUser}
        type={activeTab}
        faculties={khoas}
      />
    </div>
  );
};

const TabButton = ({ active, onClick, label, icon }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all
      ${
        active
          ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100"
          : "text-gray-400 hover:text-indigo-600 hover:bg-indigo-50"
      }`}
  >
    {icon}
    {label}
  </button>
);

const StatusBadge = ({ active }) => (
  <div
    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border ${
      active
        ? "bg-emerald-50 text-emerald-600 border-emerald-100"
        : "bg-rose-50 text-rose-600 border-rose-100"
    }`}
  >
    <div
      className={`w-1.5 h-1.5 rounded-full ${active ? "bg-emerald-500" : "bg-rose-500"}`}
    />
    <span className="text-[10px] font-black uppercase tracking-tight">
      {active ? "Đang hoạt động" : "Đã khóa"}
    </span>
  </div>
);

const ActionButton = ({ icon, onClick, variant = "default", tooltip }) => {
  const variants = {
    default: "text-gray-400 hover:text-indigo-600 hover:bg-indigo-50",
    danger: "text-gray-400 hover:text-rose-600 hover:bg-rose-50",
    success: "text-gray-400 hover:text-emerald-600 hover:bg-emerald-50",
  };

  return (
    <button
      onClick={onClick}
      title={tooltip}
      className={`p-2.5 rounded-xl transition-all ${variants[variant]}`}
    >
      {icon}
    </button>
  );
};

export default UserManagement;
