<?php

namespace App\Exports;

use App\Models\View\VSinhVienTrongLopHocPhan;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;

class DanhSachSinhVienLopExport implements FromCollection, WithHeadings, WithMapping, ShouldAutoSize
{
    protected $lopHocPhanID;

    public function __construct($lopHocPhanID)
    {
        $this->lopHocPhanID = $lopHocPhanID;
    }

    public function collection()
    {
        return VSinhVienTrongLopHocPhan::where('LopHocPhanID', $this->lopHocPhanID)
            ->orderBy('HoTenSinhVien')
            ->get();
    }

    public function headings(): array
    {
        return [
            'Mã SV',
            'Họ và tên',
            'Điểm chuyên cần (0-10)',
            'Điểm giữa kỳ (0-10)',
            'Điểm thi (0-10)',
            'Ghi chú',
        ];
    }

    public function map($sv): array
    {
        return [
            $sv->MaSV,
            $sv->HoTenSinhVien,
            '', // để trống cho GV điền
            '',
            '',
            '',
        ];
    }
}