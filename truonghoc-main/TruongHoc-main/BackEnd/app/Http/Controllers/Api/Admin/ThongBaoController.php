<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Services\ThongBaoService;
use App\Models\ThongBao;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class ThongBaoController extends Controller
{
    protected $thongBaoService;

    public function __construct(ThongBaoService $thongBaoService)
    {
        $this->thongBaoService = $thongBaoService;
    }

    public function index(): JsonResponse
    {
        $result = $this->thongBaoService->getAllThongBao();
        return response()->json([
            'success' => true,
            'data' => $result
        ]);
    }

    /**
     * API dành cho Sinh viên và Giảng viên xem thông báo của họ
     */
    public function getMyNotifications(Request $request): JsonResponse
    {
        $user = $request->user();
        
        // Xác định đối tượng nhận dựa trên RoleID (1: Admin, 2: GiangVien, 3: SinhVien)
        $target = 'ToanBo';
        if ($user->RoleID == 3) {
            $target = 'SinhVien';
        } elseif ($user->RoleID == 2) {
            $target = 'GiangVien';
        } elseif ($user->RoleID == 1) {
            $target = 'Admin';
        }

        $query = ThongBao::where('NgayBatDauHienThi', '<=', now())
            ->where('NgayKetThucHienThi', '>=', now());

        $pk = (new ThongBao())->getKeyName();

        // Lọc: Người dùng chỉ thấy thông báo gửi đích danh nhóm mình HOẶC gửi cho Toàn bộ
        $results = ThongBao::where('NgayBatDauHienThi', '<=', now())
            ->where('NgayKetThucHienThi', '>=', now())
            ->whereIn('DoiTuong', [$target, 'ToanBo'])
            ->select('thongbao.*')
            // Thêm cột is_read bằng subquery
            ->addSelect(DB::raw("(SELECT 1 FROM thong_bao_da_doc WHERE thong_bao_da_doc.ThongBaoID = thongbao.$pk AND thong_bao_da_doc.UserID = " . $user->UserID . " LIMIT 1) as is_read"))
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $results
        ]);
    }

    /**
     * API lấy số lượng thông báo chưa đọc cho Badge
     */
    public function getUnreadCount(Request $request): JsonResponse
    {
        $user = $request->user();
        $target = 'ToanBo';
        if ($user->RoleID == 3) $target = 'SinhVien';
        elseif ($user->RoleID == 2) $target = 'GiangVien';
        elseif ($user->RoleID == 1) $target = 'Admin';

        $pk = (new ThongBao())->getKeyName(); // Lấy đúng tên cột khóa chính (ThongBaoID)

        $count = ThongBao::where('NgayBatDauHienThi', '<=', now())
            ->where('NgayKetThucHienThi', '>=', now())
            ->whereIn('DoiTuong', [$target, 'ToanBo'])
            // Chỉ đếm những thông báo chưa có trong bảng thong_bao_da_doc đối với user này
            ->whereNotExists(function ($query) use ($user, $pk) {
                $query->select(DB::raw(1))
                    ->from('thong_bao_da_doc')
                    ->whereColumn('thong_bao_da_doc.ThongBaoID', "thongbao.$pk")
                    ->where('thong_bao_da_doc.UserID', $user->UserID);
            })
            ->count();

        return response()->json([
            'success' => true,
            'unread_count' => $count
        ]);
    }

    /**
     * Đánh dấu tất cả thông báo thuộc đối tượng người dùng là đã đọc
     */
    public function markAllAsRead(Request $request): JsonResponse
    {
        $user = $request->user();
        $target = 'ToanBo';
        if ($user->RoleID == 3) $target = 'SinhVien';
        elseif ($user->RoleID == 2) $target = 'GiangVien';

        $pk = (new ThongBao())->getKeyName();

        // Lấy toàn bộ ID thông báo đang hiển thị dành cho user
        $notificationIds = ThongBao::where('NgayBatDauHienThi', '<=', now())
            ->where('NgayKetThucHienThi', '>=', now())
            ->whereIn('DoiTuong', [$target, 'ToanBo'])
            ->pluck($pk);

        foreach ($notificationIds as $id) {
            DB::table('thong_bao_da_doc')->updateOrInsert(
                ['UserID' => $user->UserID, 'ThongBaoID' => $id],
                ['created_at' => now()]
            );
        }

        return response()->json(['success' => true]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'TieuDe' => 'required|string|max:255',
            'NoiDung' => 'required|string',
            'LoaiThongBao' => 'required|string',
            'DoiTuong' => 'required|string',
            'NgayBatDauHienThi' => 'required|date',
            'NgayKetThucHienThi' => 'required|date|after_or_equal:NgayBatDauHienThi',
        ]);

        $thongBao = $this->thongBaoService->createThongBao($data);

        return response()->json([
            'success' => true,
            'message' => 'Thông báo đã được tạo thành công.',
            'data' => $thongBao
        ], 201);
    }

    public function sendEmail($id): JsonResponse
    {
        $this->thongBaoService->sendEmailNotification((int)$id);

        return response()->json([
            'success' => true,
            'message' => 'Danh sách gửi email đã được xếp hàng.'
        ]);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $data = $request->validate([
            'TieuDe' => 'sometimes|required|string|max:255',
            'NoiDung' => 'sometimes|required|string',
            'LoaiThongBao' => 'sometimes|required|string',
            'DoiTuong' => 'sometimes|required|string',
            'NgayBatDauHienThi' => 'sometimes|required|date',
            'NgayKetThucHienThi' => 'sometimes|required|date|after_or_equal:NgayBatDauHienThi',
        ]);

        $thongBao = $this->thongBaoService->updateThongBao((int)$id, $data);

        return response()->json([
            'success' => true,
            'message' => 'Cập nhật thông báo thành công',
            'data' => $thongBao
        ]);
    }

    public function destroy($id): JsonResponse
    {
        $this->thongBaoService->deleteThongBao((int)$id);

        return response()->json([
            'success' => true,
            'message' => 'Xóa thông báo thành công'
        ]);
    }
}