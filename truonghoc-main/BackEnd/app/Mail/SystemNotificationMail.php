<?php

namespace App\Mail;

use App\Models\ThongBao;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class SystemNotificationMail extends Mailable
{
    use Queueable, SerializesModels;

    public $thongBao;

    public function __construct(ThongBao $thongBao)
    {
        $this->thongBao = $thongBao;
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: '[' . $this->thongBao->LoaiThongBao . '] ' . $this->thongBao->TieuDe,
        );
    }

    public function content(): Content
    {
        return new Content(
            htmlString: "
                <h2>Chào bạn,</h2>
                <p>Hệ thống giáo dục iStudent có thông báo mới dành cho bạn:</p>
                <div style='padding: 15px; background-color: #f3f4f6; border-radius: 8px;'>
                    <h3>{$this->thongBao->TieuDe}</h3>
                    <p>{$this->thongBao->NoiDung}</p>
                </div>
                <p>Vui lòng đăng nhập vào hệ thống để xem chi tiết.</p>
                <hr>
                <p><small>Đây là email tự động, vui lòng không phản hồi.</small></p>
            ",
        );
    }
}