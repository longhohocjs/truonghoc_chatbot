<?php

namespace App\Jobs;


use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Models\DangKyHocPhan;
use App\Models\LopHocPhan;
use App\Models\SinhVien;
use App\Services\DangKyHocPhanService;
use Throwable;
use Illuminate\Support\Facades\Cache;

class ProcessDangKyHocPhan implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $userId;
    public $sinhVienID;
    public $lopHocPhanID;
    public $tries = 3; 
    public $backoff = 5;

    public function __construct(int $userId, int $sinhVienID, int $lopHocPhanID)
    {
        $this->userId = $userId;
        $this->sinhVienID = $sinhVienID;
        $this->lopHocPhanID = $lopHocPhanID;
    }

    public function handle(DangKyHocPhanService $dangKyService): void
    {
        $statusKey = "registration_status:{$this->sinhVienID}:{$this->lopHocPhanID}";
        $slotsKey = "lophocphan:{$this->lopHocPhanID}:slots";

        try {
            DB::transaction(function () use ($dangKyService, $statusKey, $slotsKey) {
                
                $existingRecord = DangKyHocPhan::where('SinhVienID', $this->sinhVienID)
                    ->where('LopHocPhanID', $this->lopHocPhanID)
                    ->first();

                if ($existingRecord && $existingRecord->TrangThai === 'ThanhCong') {
                    Cache::put($statusKey, 'Bạn đã đăng ký môn học này rồi.', 300);
                    return;
                }

                $lop = LopHocPhan::where('LopHocPhanID', $this->lopHocPhanID)
                    ->lockForUpdate()
                    ->first();

                if (!$lop) {
                    throw new \Exception('Lớp học phần không tồn tại.');
                }

                $currentCount = DangKyHocPhan::where('LopHocPhanID', $this->lopHocPhanID)->where('TrangThai', 'ThanhCong')->count();
                if ($currentCount >= $lop->SoLuongToiDa) {
                    throw new \Exception('Lớp đã đầy sĩ số.');
                }

                $sinhVien = SinhVien::findOrFail($this->sinhVienID);
                $validation = $dangKyService->validateAll($sinhVien, $this->lopHocPhanID);
                
                if (!$validation['success']) {
                    throw new \Exception($validation['message']);
                }

                if ($existingRecord) {
                    // Nếu đã từng đăng ký và hủy, thì cập nhật lại trạng thái
                    $existingRecord->update([
                        'UserID'         => $this->userId,
                        'ThoiGianDangKy' => now(),
                        'TrangThai'      => 'ThanhCong',
                    ]);
                } else {
                    DangKyHocPhan::create([
                        'SinhVienID'     => $this->sinhVienID,
                        'LopHocPhanID'   => $this->lopHocPhanID,
                        'UserID'         => $this->userId,
                        'ThoiGianDangKy' => now(),
                        'TrangThai'      => 'ThanhCong',
                    ]);
                }

                if (Cache::has($slotsKey)) {
                    Cache::decrement($slotsKey);
                }

                Cache::put($statusKey, 'success', 600);
            }, 5);

        } catch (Throwable $e) {
            $this->handleJobError($e, $statusKey);
        }
    }

    protected function handleJobError(Throwable $e, string $statusKey): void
    {
        // Mở rộng các từ khóa nhận diện lỗi nghiệp vụ
        $userErrors = [
            'lớp đã đầy', 'trùng lịch', 'tiên quyết', 'không tồn tại', 
            'đã đăng ký', 'khóa', 'song hành', 'thời gian', 'thông tin'
        ];

        $isUserError = false;
        $message = mb_strtolower($e->getMessage());

        foreach ($userErrors as $errorPart) {
            if (str_contains($message, $errorPart)) {
                $isUserError = true;
                break;
            }
        }

        if ($isUserError) {
            Cache::put($statusKey, $e->getMessage(), 300);
            Log::warning("Registration logic error: " . $e->getMessage());
        } else {
            // Trong quá trình dev, cho phép hiển thị lỗi hệ thống để dễ debug
            $systemErrorMessage = "Lỗi hệ thống: " . $e->getMessage();
            Log::error($systemErrorMessage);
            Cache::put($statusKey, $systemErrorMessage, 60);
            // Không throw $e để tránh Queue tự động retry 3 lần gây chậm
        }
    }

    public function failed(Throwable $exception): void
    {
        $statusKey = "registration_status:{$this->sinhVienID}:{$this->lopHocPhanID}";
        Cache::put($statusKey, $exception->getMessage(), 3600);
        
    }
}