<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\AuthService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class AuthController extends Controller
{
    protected $authService;

    public function __construct(AuthService $authService)
    {
        $this->authService = $authService;
    }

    public function login(Request $request): JsonResponse
    {
        $result = $this->authService->login($request);
        return response()->json($result, $result['status'] ?? 200);
    }

    public function me(Request $request): JsonResponse
    {
        $result = $this->authService->me($request);
        return response()->json($result);
    }

    public function changePasswordHash(Request $request): JsonResponse
    {
        $result = $this->authService->changePassword($request);
        return response()->json($result);
    }

    public function logout(Request $request): JsonResponse
    {
        $result = $this->authService->logout($request);
        return response()->json($result);
    }
}