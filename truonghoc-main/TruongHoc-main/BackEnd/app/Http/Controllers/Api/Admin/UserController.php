<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Services\UserService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    protected $userService;

    public function __construct(UserService $userService)
    {
        $this->userService = $userService;
    }

    public function storeSinhVien(Request $request)
    {
        $data = $request->validate([
            'MaSV'        => 'nullable|string|max:50|unique:sinhvien,MaSV|unique:users,Username',
            'HoTen'       => 'required|string',
            'khoahoc'     => 'required|string',
            'KhoaID'      => 'required|exists:khoa,KhoaID',
            'NganhID'     => 'required|exists:nganhdaotao,NganhID',
            'sodienthoai' => 'nullable|string',
            'email'       => 'nullable|email|unique:sinhvien,email',
            'LopSinhHoatID' => 'nullable|exists:lopsinhhoat,LopSinhHoatID'
        ]);

        try {
            $result = $this->userService->createSinhVienWithAccount($data);
            return response()->json([
                'status' => 'success',
                'message' => 'Thêm sinh viên và tạo tài khoản thành công',
                'data' => $result
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function storeGiangVienWithAccount(Request $request)
    {
        $data = $request->validate([
            'MaGV'        => 'nullable|string|max:20|unique:giangvien,MaGV|unique:users,Username',
            'HoTen'       => 'required|string',
            'KhoaID'      => 'required|exists:khoa,KhoaID',
            'email'       => 'nullable|email|unique:giangvien,email',
            'sodienthoai' => 'nullable|string|max:20',
            'HocVi'       => 'nullable|string',
            'ChuyenMon'   => 'nullable|string',
            'LoaiGiangVien' => 'nullable|string|in:Cơ hữu,Thỉnh giảng'
        ]);

        try {
            $result = $this->userService->createGiangVienWithAccount($data);
            return response()->json([
                'status' => 'success',
                'message' => 'Tạo tài khoản giảng viên thành công',
                'data' => $result
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function storeStaffProfile(Request $request)
    {
        $request->validate([
            'MaGV' => 'nullable|string|max:20|unique:giangvien,MaGV',
            'RoleID' => 'required|in:1,2',
            'HoTen' => 'required',
            'email' => 'required|email',
            'sodienthoai' => 'nullable',
            'KhoaID' => 'required_if:RoleID,2|exists:khoa,KhoaID',
            'HocVi' => 'nullable',
            'ChuyenMon' => 'nullable',
            'LoaiGiangVien' => 'nullable|string'
        ]);

        try {
            $profile = $this->userService->createStaffProfile($request->except('RoleID'), $request->RoleID);
            return response()->json([
                'status' => 'success',
                'message' => 'Tạo hồ sơ nhân sự thành công',
                'data' => $profile
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function indexSinhVien(Request $request)
    {
        $filters = $request->only(['KhoaID', 'NganhID', 'khoahoc', 'search', 'page', 'per_page']);

        try {
            $data = $this->userService->getSinhVienList($filters);
            
            // Nạp thêm các quan hệ cần thiết để hiển thị thông tin đầy đủ ở Frontend
            $data->getCollection()->load(['user', 'khoa', 'nganh', 'lopSinhHoat']);

            return response()->json([
                'status' => 'success',
                'count'  => $data->total(),
                'data'   => $data
            ]);
        } catch (\Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    public function indexStaff(Request $request)
    {
        $roleId = $request->input('RoleID');
        
        if (!$roleId) {
            $roleId = $request->is('*giang-vien*') ? 2 : 1;
        }

        $filters = [
            'RoleID' => $roleId,
            'search'   => $request->input('search'),
            'KhoaID'   => $request->input('KhoaID'),
            'page'     => $request->input('page'),
            'per_page' => $request->input('per_page'),
        ];

        try {
            $data = $this->userService->getStaffList($filters);
            
            return response()->json([
                'status' => 'success',
                'type'   => $roleId == 2 ? 'GIANG_VIEN' : 'ADMIN',
                'count'  => $data->total(),
                'data'   => $data
            ]);
        } catch (\Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    public function assignAccount(Request $request)
    {
        $request->validate([
            'StaffID' => 'required',
            'RoleID' => 'required|in:1,2',
            'username' => 'required|unique:users,username',
            'password' => 'required|min:6'
        ]);

        try {
            $user = $this->userService->createAccountForExistingStaff($request->all());
            return response()->json([
                'status' => 'success',
                'message' => 'Cấp tài khoản thành công',
                'data' => $user
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function toggleStatus(Request $request)
    {
        try {
            $user = $this->userService->updateUserStatus($request->UserID);
            return response()->json([
                'status' => 'success',
                'is_active' => $user->is_active,
                'message' => $user->is_active ? 'Đã kích hoạt tài khoản' : 'Đã khóa tài khoản'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function resetPassword(Request $request)
    {
        try {
            $this->userService->resetPassword($request->UserID);
            return response()->json([
                'status' => 'success',
                'message' => 'PASSWORD_RESET_DEFAULT'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function updateSinhVien(Request $request)
    {
        $data = $request->validate([
            'SinhVienID'  => 'required|exists:sinhvien,SinhVienID',
            'MaSV'        => [
                'sometimes',
                'required',
                Rule::unique('sinhvien', 'MaSV')->ignore($request->SinhVienID, 'SinhVienID')
            ],
            'HoTen'       => 'sometimes|required',
            'NgaySinh'    => 'sometimes|nullable|date',
            'KhoaID'      => 'sometimes|required|exists:khoa,KhoaID',
            'NganhID'     => 'sometimes|required|exists:nganhdaotao,NganhID',
            'email'       => ['sometimes', 'nullable', 'email', Rule::unique('sinhvien', 'email')->ignore($request->SinhVienID, 'SinhVienID')],
            'sodienthoai' => 'sometimes|nullable',
            'TinhTrang'   => 'sometimes|required',
            'khoahoc'     => 'sometimes|nullable'
        ]);

        try {
            $id = $data['SinhVienID'];
            unset($data['SinhVienID']); // Xóa ID khỏi mảng dữ liệu update để tránh lỗi SQL

            $result = $this->userService->updateSinhVien($id, $data);
            return response()->json([
                'status' => 'success', 
                'message' => 'Cập nhật thông tin sinh viên thành công',
                'data' => $result
            ]);
        } catch (\Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    public function updateStaff(Request $request)
    {
        $data = $request->validate([
            'StaffID'     => 'required',
            'MaGV'        => 'sometimes|nullable|string|max:20',
            'RoleID'      => 'required|in:1,2',
            'HoTen'       => 'sometimes|required',
            'email'       => 'sometimes|nullable|email',
            'sodienthoai' => 'sometimes|nullable',
            'KhoaID'      => 'sometimes|required_if:RoleID,2|exists:khoa,KhoaID',
            'HocVi'       => 'sometimes|nullable',
            'ChuyenMon'   => 'sometimes|nullable',
            'LoaiGiangVien' => 'sometimes|nullable|string'
        ]);

        try {
            $id = $data['StaffID'];
            $roleId = $data['RoleID'];
            unset($data['StaffID'], $data['RoleID']); // Xóa các trường định danh và Role

            $result = $this->userService->updateStaff($id, $data, $roleId);
            return response()->json(['status' => 'success', 'data' => $result]);
        } catch (\Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }

    public function destroy($id)
    {
        try {
            $this->userService->deleteUser($id);
            return response()->json(['status' => 'success', 'message' => 'Xóa tài khoản thành công']);
        } catch (\Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }

    public function destroyStaffProfile($id, $roleId)
    {
        try {
            $this->userService->deleteStaffProfile($id, $roleId);
            return response()->json(['status' => 'success', 'message' => 'Xóa hồ sơ thành công']);
        } catch (\Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }
}