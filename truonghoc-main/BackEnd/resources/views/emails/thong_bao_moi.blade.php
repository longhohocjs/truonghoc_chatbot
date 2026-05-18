<!DOCTYPE html>
<html>
<head>
    <title>Thông báo mới</title>
</head>
<body>
    <h1>{{ $thongBao->TieuDe }}</h1>
    <p><strong>Loại thông báo:</strong> {{ $thongBao->LoaiThongBao }}</p>
    <div>
        {!! $thongBao->NoiDung !!}
    </div>
    <br>
    <p>Đây là email tự động từ hệ thống quản lý trường học.</p>
</body>
</html>