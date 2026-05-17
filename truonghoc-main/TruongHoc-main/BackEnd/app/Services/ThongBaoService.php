<?php

namespace App\Services;

use App\Models\ThongBao;
use App\Jobs\SendNotificationEmailJob;
use Illuminate\Support\Facades\Auth;

class ThongBaoService
{
    public function getAllThongBao()
    {
        return ThongBao::orderBy('created_at', 'desc')->get();
    }

    public function createThongBao(array $data)
    {
        $data['NguoiGuiID'] = Auth::id();
        return ThongBao::create($data);
    }

    public function sendEmailNotification(int $id)
    {
        $thongBao = ThongBao::findOrFail($id);
        SendNotificationEmailJob::dispatch($thongBao);
        return $thongBao;
    }

    public function updateThongBao(int $id, array $data)
    {
        $thongBao = ThongBao::findOrFail($id);
        $thongBao->update($data);
        return $thongBao;
    }

    public function deleteThongBao(int $id)
    {
        return ThongBao::destroy($id);
    }
}