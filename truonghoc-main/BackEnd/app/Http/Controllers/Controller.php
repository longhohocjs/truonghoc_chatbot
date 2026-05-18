<?php

namespace App\Http\Controllers;

use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Foundation\Validation\ValidatesRequests;
use Illuminate\Routing\Controller as BaseController;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

abstract class Controller extends BaseController
{
    use AuthorizesRequests, ValidatesRequests;

    /**
     * Trả về response JSON thành công chuẩn hóa
     */
    protected function success(
        mixed $data = null,
        string $message = 'Thành công',
        int $status = 200,
        array $meta = []
    ): JsonResponse {
        $response = [
            'success' => true,
            'message' => $message,
        ];

        // Xử lý dữ liệu trả về
        if ($data !== null) {
            if ($data instanceof JsonResource) {
                $response['data'] = $data;
            } elseif ($data instanceof LengthAwarePaginator) {
                $response['data'] = $data->items();
                $response['meta'] = array_merge([
                    'current_page' => $data->currentPage(),
                    'per_page'      => $data->perPage(),
                    'total'         => $data->total(),
                    'last_page'     => $data->lastPage(),
                ], $meta);
            } elseif ($data instanceof Collection || is_array($data)) {
                $response['data'] = $data;
            } else {
                $response['data'] = $data;
            }
        }

        if (!empty($meta)) {
            $response['meta'] = array_merge($response['meta'] ?? [], $meta);
        }

        return response()->json($response, $status);
    }

    /**
     * Trả về response JSON thất bại chuẩn hóa
     */
    protected function error(
        string $message = 'Có lỗi xảy ra',
        int $status = 400,
        array $errors = [],
        mixed $data = null
    ): JsonResponse {
        $response = [
            'success' => false,
            'message' => $message,
        ];

        if (!empty($errors)) {
            $response['errors'] = $errors;
        }

        if ($data !== null) {
            $response['data'] = $data;
        }

        return response()->json($response, $status);
    }

    /**
     * Trả về response 201 Created
     */
    protected function created($data = null, string $message = 'Tạo mới thành công'): JsonResponse
    {
        return $this->success($data, $message, 201);
    }

    /**
     * Trả về response 204 No Content
     */
    protected function noContent(): JsonResponse
    {
        return response()->json([], 204);
    }

    /**
     * Trả về response phân trang đơn giản (khi không dùng LengthAwarePaginator)
     */
    protected function paginated(
        $items,
        int $total,
        int $perPage,
        int $currentPage,
        string $message = 'Lấy danh sách thành công'
    ): JsonResponse {
        return $this->success($items, $message, 200, [
            'pagination' => [
                'current_page' => $currentPage,
                'per_page'     => $perPage,
                'total'        => $total,
                'last_page'    => ceil($total / $perPage),
            ]
        ]);
    }

    /**
     * Shortcut cho response 403 Forbidden
     */
    protected function forbidden(string $message = 'Bạn không có quyền truy cập'): JsonResponse
    {
        return $this->error($message, 403);
    }

    /**
     * Shortcut cho response 401 Unauthorized
     */
    protected function unauthorized(string $message = 'Vui lòng đăng nhập để tiếp tục'): JsonResponse
    {
        return $this->error($message, 401);
    }
}