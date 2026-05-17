import React, { useState, useRef } from "react";
import axiosClient from "../../api/axios";
import toast from "react-hot-toast";
import { Download } from "lucide-react";

const ChuongTrinhImportModal = ({ isOpen, onClose, onSuccess, nganhs }) => {
  const [selectedNganh, setSelectedNganh] = useState("");
  const [file, setFile] = useState(null);
  const [clearExisting, setClearExisting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleImport = async () => {
    if (!selectedNganh) return toast.error("Vui lòng chọn ngành đào tạo");
    if (!file) return toast.error("Vui lòng chọn file Excel");

    const formData = new FormData();
    formData.append("NganhID", selectedNganh);
    formData.append("file", file);
    formData.append("clear_existing", clearExisting ? 1 : 0);

    setIsUploading(true);
    setImportResult(null);

    try {
      const response = await axiosClient.post(
        "/admin/chuong-trinh/import",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      );

      setImportResult(response);
      toast.success(`Import thành công ${response.success_count} môn học!`);

      if (response.errors.length === 0 && onSuccess) {
        onSuccess();
      }
    } catch (error) {
      // Lỗi đã được axios interceptor xử lý hiển thị toast
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadTemplate = () => {
    const headers = [
      "MaMon",
      "TenMon",
      "SoTinChi",
      "KhoaID",
      "TietLyThuyet",
      "TietThucHanh",
      "HocKyGoiY",
      "BatBuoc",
      "MonTienQuyet",
      "MonSongHanh",
    ];
    const sampleData = [
      ["CS101", "Lập trình C", "3", "1", "30", "15", "1", "1", "", ""],
      [
        "MATH01",
        "Toán cao cấp A1",
        "4",
        "2",
        "60",
        "0",
        "1",
        "1",
        "MATH00",
        "",
      ],
    ];

    const csvContent = [headers, ...sampleData]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob(["\ufeff" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "mau_chuong_trinh_dao_tao.csv");
    link.click();
  };

  const resetForm = () => {
    setFile(null);
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h3 className="text-xl font-bold text-gray-800">
            Import Chương trình đào tạo
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors text-2xl"
          >
            &times;
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Chọn ngành */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
              Chọn ngành đào tạo
            </label>
            <select
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              value={selectedNganh}
              onChange={(e) => setSelectedNganh(e.target.value)}
            >
              <option value="">-- Chọn ngành --</option>
              {nganhs.map((n) => (
                <option key={n.NganhID} value={n.NganhID}>
                  {n.TenNganh}
                </option>
              ))}
            </select>
          </div>

          {/* Nút tải file mẫu */}
          <div className="flex justify-between items-center bg-blue-50/50 p-3 rounded-xl border border-blue-100">
            <span className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">
              Cấu trúc dữ liệu chuẩn
            </span>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="flex items-center gap-2 text-xs font-black text-blue-700 hover:text-blue-900 transition-colors bg-white px-3 py-1.5 rounded-lg shadow-sm border border-blue-200"
            >
              <Download size={14} /> Tải file mẫu (.csv)
            </button>
          </div>

          {/* Tùy chọn xóa cũ */}
          <label className="flex items-center space-x-3 cursor-pointer p-3 bg-amber-50 rounded-lg border border-amber-100">
            <input
              type="checkbox"
              className="w-5 h-5 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
              checked={clearExisting}
              onChange={(e) => setClearExisting(e.target.checked)}
            />
            <span className="text-sm text-amber-800 font-medium">
              Xóa dữ liệu cũ của ngành này trước khi import
            </span>
          </label>

          {/* Upload File */}
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-blue-400 transition-colors">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".xlsx, .xls, .csv"
              className="hidden"
              id="excel-upload"
            />
            <label htmlFor="excel-upload" className="cursor-pointer">
              <div className="text-4xl mb-2">📊</div>
              <p className="text-sm font-medium text-gray-600">
                {file ? file.name : "Nhấn để chọn file Excel mẫu"}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Hỗ trợ .xlsx, .xls, .csv
              </p>
            </label>
          </div>

          {/* Kết quả Import */}
          {importResult && (
            <div className="mt-4 p-4 rounded-lg bg-gray-50 border border-gray-200 max-h-40 overflow-y-auto">
              <p className="text-sm font-bold text-green-600 mb-2">
                ✅ Thành công: {importResult.success_count} môn
              </p>
              {importResult.errors.length > 0 && (
                <div>
                  <p className="text-sm font-bold text-red-600 mb-1">
                    ❌ Lỗi chi tiết:
                  </p>
                  <ul className="text-xs text-red-500 list-disc pl-4 space-y-1">
                    {importResult.errors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end space-x-3">
          <button
            type="button"
            onClick={resetForm}
            className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700"
          >
            Làm mới
          </button>
          <button
            onClick={handleImport}
            disabled={isUploading || !file}
            className={`px-6 py-2 rounded-lg font-bold text-sm text-white transition-all ${
              isUploading || !file
                ? "bg-gray-300 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 active:scale-95"
            }`}
          >
            {isUploading ? (
              <span className="flex items-center">
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Đang xử lý...
              </span>
            ) : (
              "Bắt đầu Import"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChuongTrinhImportModal;
