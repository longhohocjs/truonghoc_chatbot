import React from "react";

const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  type = "danger",
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl transform transition-all scale-100">
        <div className="p-8 text-center">
          <div
            className={`w-16 h-16 ${type === "danger" ? "bg-red-50 text-red-500" : "bg-blue-50 text-blue-500"} rounded-full flex items-center justify-center mx-auto mb-4 text-2xl animate-bounce`}
          >
            {type === "danger" ? "🗑️" : "❓"}
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">
            {title || "Xác nhận hành động"}
          </h3>
          <p className="text-gray-500 text-sm leading-relaxed">
            {message ||
              "Hành động này không thể hoàn tác. Bạn có chắc chắn muốn tiếp tục?"}
          </p>
        </div>
        <div className="flex border-t border-gray-100 bg-gray-50/50">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-4 text-sm font-bold text-gray-400 hover:bg-gray-100 transition-colors"
          >
            Quay lại
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`flex-1 px-6 py-4 text-sm font-bold text-white transition-colors shadow-inner ${type === "danger" ? "bg-red-500 hover:bg-red-600" : "bg-blue-600 hover:bg-blue-700"}`}
          >
            Xác nhận
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
