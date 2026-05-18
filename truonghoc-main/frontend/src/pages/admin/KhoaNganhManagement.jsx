import React, { useState, useEffect } from "react";
import axiosClient from "@/api/axios";

const KhoaNganhManagement = () => {
  const [khoas, setKhoas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newKhoa, setNewKhoa] = useState({ MaKhoa: "", TenKhoa: "" });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await axiosClient.post("/admin/khoa/list");

      const isSuccess =
        response?.success === true || response?.status === "success";
      const payload = isSuccess ? response.data : response;

      const dataArray = Array.isArray(payload)
        ? payload
        : payload?.data && Array.isArray(payload.data)
          ? payload.data
          : [];

      setKhoas(dataArray);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newKhoa.MaKhoa || !newKhoa.TenKhoa) return;
    try {
      await axiosClient.post("/admin/khoa", newKhoa);
      setIsAdding(false);
      setNewKhoa({ MaKhoa: "", TenKhoa: "" });
      fetchData();
    } catch (e) {
      alert("Lỗi khi thêm khoa!");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">
            Quản lý Khoa & Ngành
          </h2>
          <p className="text-gray-500 text-sm">Quản lý sơ đồ tổ chức đào tạo</p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-md"
        >
          + Thêm Khoa mới
        </button>
      </div>

      {isAdding && (
        <div className="bg-white p-6 rounded-xl border border-blue-200 shadow-sm flex gap-4 animate-fadeIn">
          <input
            placeholder="Mã khoa (VD: CNTT)"
            className="flex-1 p-2 border border-gray-300 rounded-lg outline-none"
            value={newKhoa.MaKhoa}
            onChange={(e) => setNewKhoa({ ...newKhoa, MaKhoa: e.target.value })}
          />
          <input
            placeholder="Tên khoa (VD: Công nghệ thông tin)"
            className="flex-1 p-2 border border-gray-300 rounded-lg outline-none"
            value={newKhoa.TenKhoa}
            onChange={(e) =>
              setNewKhoa({ ...newKhoa, TenKhoa: e.target.value })
            }
          />
          <button
            onClick={handleAdd}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold"
          >
            Lưu
          </button>
          <button
            onClick={() => setIsAdding(false)}
            className="text-gray-500 font-bold"
          >
            Hủy
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full text-center py-10">
            Đang tải dữ liệu...
          </div>
        ) : (
          khoas.map((khoa) => (
            <div
              key={khoa.KhoaID || khoa.id}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:border-blue-300 transition-all group"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="bg-blue-50 text-blue-600 font-black px-3 py-1 rounded text-sm uppercase">
                  {khoa.MaKhoa}
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="text-gray-400 hover:text-red-500 transition-colors">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">
                {khoa.TenKhoa || khoa.ten_khoa}
              </h3>
              <div className="space-y-2 mt-4">
                <div className="text-xs font-bold text-gray-400 uppercase">
                  Danh sách ngành:
                </div>
                {/* Hỗ trợ cả nganhs (Laravel relation) hoặc Nganh (PascalCase) */}
                {(khoa.nganhs || khoa.Nganh || []).length > 0 ? (
                  (khoa.nganhs || khoa.Nganh).map((n) => (
                    <div
                      key={n.NganhID || n.id}
                      className="flex justify-between items-center text-sm py-2 border-b border-gray-50 last:border-0"
                    >
                      <span className="text-gray-600">
                        {n.TenNganh || n.ten_nganh}
                      </span>
                      <span className="text-gray-400 font-mono text-xs">
                        {n.MaNganh || n.ma_nganh}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-xs italic text-gray-400">
                    Chưa có ngành nào
                  </div>
                )}
              </div>
              <button className="w-full mt-6 py-2 border border-blue-100 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-50 transition-all">
                + Quản lý ngành
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default KhoaNganhManagement;
