<?php

namespace App\Services;

use App\Models\User;
use App\Models\SinhVien;
use App\Models\GiangVien;
use App\Models\Admin;
use App\Services\LogService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class UserService
{
    protected $logService;

    public function __construct(LogService $logService) {
        $this->logService = $logService;
    }

    public function getSinhVienList(array $filters)
    {
        $query = SinhVien::with(['user', 'khoa', 'nganh']);

        if (!empty($filters['KhoaID'])) {
            $query->where('KhoaID', $filters['KhoaID']);
        }

        if (!empty($filters['NganhID'])) {
            $query->where('NganhID', $filters['NganhID']);
        }

        if (!empty($filters['khoahoc'])) {
            $query->where('khoahoc', 'LIKE', '%' . $filters['khoahoc'] . '%');
        }

        if (!empty($filters['search'])) {
            $query->where(function ($q) use ($filters) {
                $q->where('HoTen', 'LIKE', '%' . $filters['search'] . '%')
                  ->orWhere('MaSV', 'LIKE', '%' . $filters['search'] . '%');
            });
        }

        return $query->orderBy('SinhVienID', 'desc')->paginate($filters['per_page'] ?? 15);
    }

    public function getStaffList(array $filters)
    {
        $roleId = $filters['RoleID'];

        if ($roleId == 2) {
            $query = GiangVien::with(['user', 'khoa']);
        } else {
            $query = Admin::with(['user']);
        }

        if (!empty($filters['KhoaID']) && $roleId == 2) {
            $query->where('KhoaID', $filters['KhoaID']);
        }

        if (!empty($filters['search'])) {
            $query->where('HoTen', 'LIKE', '%' . $filters['search'] . '%');
        }

        return $query->orderBy('created_at', 'desc')->paginate($filters['per_page'] ?? 15);
    }

    public function createSinhVienWithAccount(array $data)
    {
        return DB::transaction(function () use ($data) {
            // 1. Tự động tạo mã sinh viên nếu không nhập
            if (empty($data['MaSV'])) {
                $year = date('y'); // Lấy 2 số cuối của năm hiện tại (VD: 24)
                $lastId = SinhVien::max('SinhVienID') ?? 0;
                $data['MaSV'] = 'SV' . $year . str_pad($lastId + 1, 5, '0', STR_PAD_LEFT);
            }

            $password = !empty($data['sodienthoai']) ? $data['sodienthoai'] : '123456';

            $user = User::create([
                'Username'     => $data['MaSV'],
                'PasswordHash' => Hash::make($password),
                'RoleID'       => 3,
                'is_active'    => true
            ]);

            $sinhVien = SinhVien::create([
                'UserID'        => $user->UserID,
                'MaSV'          => $data['MaSV'],
                'HoTen'         => $data['HoTen'],
                'khoahoc'       => $data['khoahoc'],
                'KhoaID'        => $data['KhoaID'],
                'NganhID'       => $data['NganhID'],
                'email'         => $data['email'] ?? null,
                'sodienthoai'   => $data['sodienthoai'] ?? null,
                'TinhTrang'     => 'DangHoc',
                'LopSinhHoatID' => $data['LopSinhHoatID'] ?? null
            ]);
            $this->logService->write(
                'CREATE_USER', 
                "Tạo tài khoản và profile cho SV: {$sinhVien->HoTen} (MSV: {$sinhVien->MaSV})", 
                'sinhvien', 
                $sinhVien->SinhVienID
            );

            return $sinhVien;
        });
    }

    public function createGiangVienWithAccount(array $data)
    {
        return DB::transaction(function () use ($data) {
            // 1. Tự động tạo mã giảng viên nếu không nhập
            if (empty($data['MaGV'])) {
                $lastId = GiangVien::max('GiangVienID') ?? 0;
                $data['MaGV'] = 'GV' . str_pad($lastId + 1, 4, '0', STR_PAD_LEFT);
            }

            // 2. Tạo tài khoản User (Username = MaGV)
            $password = !empty($data['sodienthoai']) ? $data['sodienthoai'] : '123456';

            $user = User::create([
                'Username'     => $data['MaGV'],
                'PasswordHash' => Hash::make($password),
                'RoleID'       => 2, // 2: Giảng viên
                'is_active'    => true
            ]);

            // 3. Tạo hồ sơ Giảng viên
            $giangVien = GiangVien::create([
                'UserID'        => $user->UserID,
                'MaGV'          => $data['MaGV'],
                'HoTen'         => $data['HoTen'],
                'KhoaID'        => $data['KhoaID'],
                'email'         => $data['email'] ?? null,
                'sodienthoai'   => $data['sodienthoai'] ?? null,
                'HocVi'         => $data['HocVi'] ?? null,
                'ChuyenMon'     => $data['ChuyenMon'] ?? null,
                // Đảm bảo lấy đúng giá trị từ data gửi lên
                'LoaiGiangVien' => (!empty($data['LoaiGiangVien'])) ? $data['LoaiGiangVien'] : 'Cơ hữu',
            ]);

            $this->logService->write(
                'CREATE_USER', 
                "Tạo tài khoản và hồ sơ cho GV: {$giangVien->HoTen} ({$giangVien->MaGV})", 
                'giangvien', 
                $giangVien->GiangVienID
            );

            return $giangVien->load('user');
        });
    }

    public function createStaffProfile(array $data, $roleId)
    {
        $insertData = $data;

        // Chuẩn hóa casing cho Admin (Email, SoDienThoai)
        if ($roleId == 1) {
            if (isset($insertData['email'])) {
                $insertData['Email'] = $insertData['email'];
            }
            if (isset($insertData['sodienthoai'])) {
                $insertData['SoDienThoai'] = $insertData['sodienthoai'];
            }
        }

        // Tự động tạo mã giảng viên nếu là GV và mã bị trống
        if ($roleId == 2 && empty($insertData['MaGV'])) {
            $lastId = GiangVien::max('GiangVienID') ?? 0;
            $insertData['MaGV'] = 'GV' . str_pad($lastId + 1, 4, '0', STR_PAD_LEFT);
        }

        // Chuyển chuỗi rỗng thành null cho các trường có thể để trống
        foreach (['email', 'sodienthoai', 'Email', 'SoDienThoai', 'HocVi', 'ChuyenMon', 'MaGV', 'LoaiGiangVien'] as $field) {
            if (isset($insertData[$field]) && $insertData[$field] === '') {
                $insertData[$field] = null;
            }
        }

        if ($roleId == 2) {
            // Lọc chỉ lấy các trường có trong fillable của model
            $profile = GiangVien::create(array_intersect_key($insertData, array_flip((new GiangVien)->getFillable())));
            $this->logService->write('CREATE_STAFF', "Tạo hồ sơ giảng viên: {$profile->HoTen}", 'giangvien', $profile->GiangVienID);
            return $profile;
        } elseif ($roleId == 1) {
            $profile = Admin::create(array_intersect_key($insertData, array_flip((new Admin)->getFillable())));
            $this->logService->write('CREATE_STAFF', "Tạo hồ sơ Admin: {$profile->HoTen}", 'admin', $profile->AdminID);
            return $profile;
        }
        throw new \Exception("INVALID_ROLE");
    }

    public function createAccountForExistingStaff(array $data)
    {
        return DB::transaction(function () use ($data) {
            // Kiểm tra hồ sơ tồn tại trước khi tạo User
            if ($data['RoleID'] == 2) {
                $profile = GiangVien::findOrFail($data['StaffID']);
            } else {
                $profile = Admin::findOrFail($data['StaffID']);
            }

            $user = User::create([
                'Username'     => $data['username'],
                'PasswordHash' => Hash::make($data['password']),
                'RoleID'       => $data['RoleID'],
                'is_active'    => true
            ]);

            // Cập nhật UserID vào hồ sơ đã tìm thấy
            $profile->UserID = $user->UserID;
            $profile->save();

            return $user;
        });
    }

    public function resetPassword($userId)
    {
        $user = User::findOrFail($userId);
        $user->PasswordHash = Hash::make('123456');
        $user->save();
        return $user;
    }

    public function updateUserStatus($userId)
    {
        $user = User::findOrFail($userId);
        $user->is_active = !$user->is_active;
        $user->save();
        return $user;
    }

    public function updateSinhVien($id, array $data)
    {
        return DB::transaction(function () use ($id, $data) {
            $sv = SinhVien::findOrFail($id);
            
            // Bảo mật: Nếu có thay đổi MaSV, cập nhật luôn Username trong bảng users (Chỉ Admin mới làm việc này)
            if (!empty($data['MaSV']) && $data['MaSV'] !== $sv->MaSV) {
                User::where('UserID', $sv->UserID)->update([
                    'Username' => $data['MaSV']
                ]);
            }

            // Xử lý các trường rỗng sang null để tránh lỗi Database
            $fieldsToNull = ['email', 'sodienthoai', 'NgaySinh', 'QueQuan', 'DiaChi'];
            foreach ($fieldsToNull as $field) {
                if (isset($data[$field]) && $data[$field] === '') {
                    $data[$field] = null;
                }
            }

            // Loại bỏ các trường ID không được phép thay đổi trực tiếp qua update()
            $updateData = array_diff_key($data, array_flip(['SinhVienID', 'UserID']));

            $this->logService->write('UPDATE_USER', "Cập nhật hồ sơ SV: {$sv->MaSV}", 'sinhvien', $sv->SinhVienID);            
            
            // Chỉ lấy các trường có trong fillable của model để tránh gửi thừa dữ liệu gây lỗi trigger
            $sv->update(array_intersect_key($updateData, array_flip($sv->getFillable())));
            
            return $sv->fresh();
        });
    }

    public function updateStaff($id, array $data, $roleId)
    {
        if ($roleId == 2) {
            $profile = GiangVien::findOrFail($id);
        } else {
            $profile = Admin::findOrFail($id);
        }

        // Chuẩn bị dữ liệu để cập nhật, chuyển chuỗi rỗng thành null cho các trường nullable
        $updateData = $data;

        // Xử lý casing cho Admin (Email, SoDienThoai) để khớp với Model Admin.php
        if ($roleId == 1) {
            if (isset($updateData['email'])) {
                $updateData['Email'] = ($updateData['email'] === '') ? null : $updateData['email'];
            }
            if (isset($updateData['sodienthoai'])) {
                $updateData['SoDienThoai'] = ($updateData['sodienthoai'] === '') ? null : $updateData['sodienthoai'];
            }
        } else {
            if (isset($updateData['email']) && $updateData['email'] === '') {
                $updateData['email'] = null;
            }
            if (isset($updateData['sodienthoai']) && $updateData['sodienthoai'] === '') {
                $updateData['sodienthoai'] = null;
            }
        }

        if (isset($updateData['HocVi']) && $updateData['HocVi'] === '') {
            $updateData['HocVi'] = null;
        }
        if (isset($updateData['ChuyenMon']) && $updateData['ChuyenMon'] === '') {
            $updateData['ChuyenMon'] = null;
        }

        // Đảm bảo LoaiGiangVien luôn có giá trị hợp lệ nếu được gửi lên
        if (isset($updateData['LoaiGiangVien'])) {
            $updateData['LoaiGiangVien'] = ($updateData['LoaiGiangVien'] === '') ? 'Cơ hữu' : $updateData['LoaiGiangVien'];
        }

        $this->logService->write('UPDATE_USER', "Cập nhật hồ sơ nhân sự ID: {$id}", 'staff', $id);        
        
        // Lọc chỉ lấy các trường hợp lệ trong fillable
        $profile->update(array_intersect_key($updateData, array_flip($profile->getFillable())));
        return $profile;
    }

    public function deleteUser($userId)
    {
        return DB::transaction(function () use ($userId) {
            $user = User::findOrFail($userId);
            
            // Kiểm tra ràng buộc nếu là giảng viên trước khi xóa bất kỳ dữ liệu nào
            if ($user->RoleID == 2) {
                $gv = GiangVien::where('UserID', $userId)->first();
                if ($gv) {
                    $this->checkGiangVienConstraints($gv->GiangVienID);
                }
            }

            // Tìm và xóa các hồ sơ liên quan trước khi xóa User
            if ($user->RoleID == 3) {
                SinhVien::where('UserID', $userId)->delete();
            } elseif ($user->RoleID == 2) {
                GiangVien::where('UserID', $userId)->delete();
            } elseif ($user->RoleID == 1) {
                Admin::where('UserID', $userId)->delete();
            }

            $this->logService->write(
                'DELETE_USER', 
                "Xóa tài khoản và hồ sơ liên quan của: {$user->Username} (ID: {$userId})", 
                'users', 
                $userId
            );
            
            return $user->delete();
        });
    }

    public function deleteStaffProfile($id, $roleId)
    {
        if ($roleId == 2) {
            $this->checkGiangVienConstraints($id);
            $profile = GiangVien::findOrFail($id);
            $this->logService->write('DELETE_STAFF', "Xóa hồ sơ giảng viên: {$profile->HoTen}", 'giangvien', $id);
        } else {
            $profile = Admin::findOrFail($id);
            $this->logService->write('DELETE_STAFF', "Xóa hồ sơ Admin: {$profile->HoTen}", 'admin', $id);
        }
        return $profile->delete();
    }

    /**
     * Kiểm tra các ràng buộc dữ liệu của Giảng viên trước khi thực hiện xóa
     */
    private function checkGiangVienConstraints($giangVienId)
    {
        $gv = GiangVien::findOrFail($giangVienId);
        $errors = [];

        // 1. Kiểm tra lớp học phần đang giảng dạy
        $countLop = DB::table('lophocphan')->where('GiangVienID', $giangVienId)->count();
        if ($countLop > 0) {
            $errors[] = "đang giảng dạy {$countLop} lớp học phần";
        }

        // 2. Kiểm tra lớp sinh hoạt (Cố vấn học tập)
        $countLopSH = DB::table('lopsinhhoat')->where('GiangVienID', $giangVienId)->count();
        if ($countLopSH > 0) {
            $errors[] = "đang là cố vấn học tập của {$countLopSH} lớp sinh hoạt";
        }

        // 3. Kiểm tra lịch dạy hiện có
        $countLichHoc = DB::table('lichhoc')
            ->join('lophocphan', 'lichhoc.LopHocPhanID', '=', 'lophocphan.LopHocPhanID')
            ->where('lophocphan.GiangVienID', $giangVienId)->count();
        if ($countLichHoc > 0) $errors[] = "có {$countLichHoc} buổi dạy trên thời khóa biểu";

        // 4. Kiểm tra lịch thi được phân công
        $countLichThi = DB::table('lichthi')
            ->join('lophocphan', 'lichthi.LopHocPhanID', '=', 'lophocphan.LopHocPhanID')
            ->where('lophocphan.GiangVienID', $giangVienId)->count();
        if ($countLichThi > 0) $errors[] = "có {$countLichThi} lịch thi/coi thi";

        if (!empty($errors)) {
            $detail = implode(', ', $errors);
            throw new \Exception("Không thể xóa giảng viên {$gv->HoTen} vì: {$detail}. Vui lòng gỡ bỏ phân công hoặc xóa dữ liệu liên quan trước khi thực hiện.");
        }
    }
}