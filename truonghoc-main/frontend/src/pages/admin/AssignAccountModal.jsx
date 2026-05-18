import React, { useState, useEffect } from "react";

const AssignAccountModal = ({ isOpen, onClose, onConfirm, userData }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("123456");

  useEffect(() => {
    if (isOpen && userData) {
      // Gợi ý username mặc định là mã giảng viên hoặc mã sinh viên
      setUsername(userData.MaGV || userData.ma_gv || userData.MaSV || "");
      setPassword("123456"); // Mật khẩu mặc định
    }
  }, [isOpen, userData]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm(username, password);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <div>
            <h3 className="text-lg font-bold text-gray-800">
              Cấp tài khoản mới
            </h3>
            <p className="text-xs text-gray-500 font-medium">
              Nhân sự: {userData?.HoTen || userData?.ho_ten}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 mb-4">
            <p className="text-[11px] text-blue-700 leading-tight">
              <strong>Lưu ý:</strong> Tài khoản này sẽ được dùng để đăng nhập
              vào hệ thống. Tên đăng nhập không được trùng lặp.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
              Tên đăng nhập (Username)
            </label>
            <input
              type="text"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-semibold text-blue-600"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Nhập tên đăng nhập..."
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
              Mật khẩu khởi tạo
            </label>
            <input
              type="password"
              required
              minLength={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Tối thiểu 6 ký tự..."
            />
          </div>

          <div className="pt-4 flex flex-col gap-2">
            <button
              type="submit"
              className="w-full py-2.5 bg-green-600 text-white rounded-lg font-bold text-sm hover:bg-green-700 shadow-lg active:scale-95 transition-all"
            >
              Xác nhận cấp tài khoản
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2 text-sm font-bold text-gray-500 hover:text-gray-700"
            >
              Hủy bỏ
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AssignAccountModal;
