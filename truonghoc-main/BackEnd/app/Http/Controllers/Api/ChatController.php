<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ChatbotService;
use App\Services\ChatbotToolsService;
use Illuminate\Http\Request;

class ChatController extends Controller
{
    protected ChatbotService $chatbotService;
    protected ChatbotToolsService $chatbotToolsService;

    public function __construct(ChatbotService $chatbotService, ChatbotToolsService $chatbotToolsService)
    {
        $this->chatbotService = $chatbotService;
        $this->chatbotToolsService = $chatbotToolsService;
    }

    // Hàm kiểm tra xem bác bảo vệ có trả về câu chào mặc định không
    private function isDefaultChatbotReply(?string $reply): bool
    {
        if (!$reply) return true;
        $replyLower = mb_strtolower(trim($reply), 'UTF-8');

        if (str_contains($replyLower, 'xin chào') && str_contains($replyLower, 'bạn có thể')) return true;
        if (str_contains($replyLower, 'dữ liệu đang được cập nhật')) return true;
        if (str_contains($replyLower, 'hiện tại phần đó chưa có trong hệ thống')) return true;
        if (str_contains($replyLower, 'mình là trợ lý học tập sinh viên')) return true;
        if (str_contains($replyLower, 'bạn có thể hỏi mình về')) return true;
        if (str_contains($replyLower, 'tôi có thể hỗ trợ tra cứu')) return true;

        return false;
    }

    public function chat(Request $request)
    {
        $request->validate([
            'message' => 'required|string',
        ]);

        $user = $request->user();
        $message = $request->input('message');

        // ==============================================================
        // BƯỚC 1: ĐƯA QUA CHATBOT SERVICE ĐỂ LỌC TỪ KHÓA
        // ==============================================================
        $dbData = $this->chatbotService->handle($message, $user);

        // Nếu ChatbotService tìm thấy từ khóa khớp -> Trả lời ngay lập tức
        if (!$this->isDefaultChatbotReply($dbData)) {
            return response()->json([
                'success' => true,
                'reply' => $dbData,
            ]);
        }

        // ==============================================================
        // BƯỚC 2: XỬ LÝ RIÊNG NHỮNG TỪ KHÓA CẦN GỌI DATABASE PHỨC TẠP
        // ==============================================================
        $mLower = mb_strtolower($message, 'UTF-8');
        
        // --- XỬ LÝ CHO SINH VIÊN ---
        if ($user && $user->isSinhVien()) {
            return response()->json([
                'success' => true,
                'reply' => "Dạ, em chỉ là bot hỗ trợ theo từ khóa.\n👉 Bạn hãy thử nhập các từ như: lịch học, điểm, gpa, tín chỉ, học phí, môn nợ, đăng ký môn..."
            ]);
        }

        // --- XỬ LÝ CHO GIẢNG VIÊN ---
        if ($user && $user->isGiangVien()) {
            // Nếu Giảng viên hỏi linh tinh không nằm trong mảng từ khóa
            return response()->json([
                'success' => true,
                'reply' => "Dạ, hệ thống chỉ hỗ trợ tra cứu theo từ khóa.\n👉 Thầy/cô vui lòng nhập: lịch dạy, lịch coi thi, lớp cố vấn, nhập điểm..."
            ]);
        }

        // --- MẶC ĐỊNH ---
        return response()->json([
            'success' => true,
            'reply' => 'Hệ thống chỉ hỗ trợ tra cứu nghiệp vụ thông qua các từ khóa. Vui lòng nhập đúng từ khóa cần tìm!'
        ]);
    }
}