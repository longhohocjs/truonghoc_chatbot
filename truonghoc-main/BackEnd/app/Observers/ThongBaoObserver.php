<?php

namespace App\Observers;

use App\Models\ThongBao;
use App\Models\SinhVien;
use App\Mail\ThongBaoMoiMail;
use Illuminate\Support\Facades\Mail;

class ThongBaoObserver
{
    public function created(ThongBao $thongBao)
    {
        $emails = SinhVien::where('TinhTrang', 'DangHoc')
                          ->whereNotNull('email')
                          ->pluck('email');

        foreach ($emails as $email) {
            Mail::to($email)->send(new ThongBaoMoiMail($thongBao));
        }
    }
}