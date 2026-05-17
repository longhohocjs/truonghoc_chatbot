<?php

namespace App\Jobs;

use App\Models\ThongBao;
use App\Models\SinhVien;
use App\Models\GiangVien;
use App\Mail\SystemNotificationMail;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Mail;

class SendNotificationEmailJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected $thongBao;

    public function __construct(ThongBao $thongBao)
    {
        $this->thongBao = $thongBao;
    }

    public function handle()
    {
        $emails = [];
        $target = $this->thongBao->DoiTuong; // SinhVien, GiangVien, ToanBo

        if ($target === 'SinhVien' || $target === 'ToanBo') {
            $emails = array_merge($emails, SinhVien::whereNotNull('email')->pluck('email')->toArray());
        }

        if ($target === 'GiangVien' || $target === 'ToanBo') {
            $emails = array_merge($emails, GiangVien::whereNotNull('email')->pluck('email')->toArray());
        }

        $emails = array_unique($emails);

        foreach ($emails as $email) {
            try {
                Mail::to($email)->send(new SystemNotificationMail($this->thongBao));
            } catch (\Exception $e) {
                // Ghi log nếu gửi lỗi cho 1 cá nhân nhưng vẫn tiếp tục vòng lặp
                \Illuminate\Support\Facades\Log::error("Lỗi gửi email đến $email: " . $e->getMessage());
            }
        }
    }
}