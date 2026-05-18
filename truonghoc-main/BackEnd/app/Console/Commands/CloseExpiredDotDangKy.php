<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\DotDangKy;
use Carbon\Carbon;

class CloseExpiredDotDangKy extends Command
{
    protected $signature = 'dotdangky:close-expired';
    protected $description = 'Tự động đóng các đợt đăng ký học phần đã hết hạn';

    public function handle()
    {
        $now = Carbon::now();

        $closedCount = DotDangKy::where('TrangThai', 1)
            ->where('NgayKetThuc', '<', $now)
            ->update(['TrangThai' => 0]);

        if ($closedCount > 0) {
            $this->info("Đã tự động đóng {$closedCount} đợt đăng ký hết hạn.");
        } else {
            $this->info("Không có đợt đăng ký nào hết hạn để đóng.");
        }

        // (Tùy chọn) Ghi log hệ thống nếu bạn muốn
    }
}