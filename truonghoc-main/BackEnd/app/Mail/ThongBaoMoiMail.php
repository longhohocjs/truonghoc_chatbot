<?php

namespace App\Mail;

use App\Models\ThongBao;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class ThongBaoMoiMail extends Mailable
{
    use Queueable, SerializesModels;

    public $thongBao;

    public function __construct(ThongBao $thongBao)
    {
        $this->thongBao = $thongBao;
    }

    public function build()
    {
        return $this->subject('[Trường Học] ' . $this->thongBao->TieuDe)
                    ->view('emails.thong_bao_moi');
    }
}