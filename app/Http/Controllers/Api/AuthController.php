<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /*  Register  */

    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'full_name'             => ['required', 'string', 'max:255'],
            'university_id'         => ['required', 'string', 'max:100', 'unique:users,university_id'],
            'university_name'       => ['required', 'string', 'max:255'],
            'country'               => ['required', 'string', 'max:100'],
            'password'              => ['required', 'string', 'min:6', 'confirmed'],
            'password_confirmation' => ['required', 'string'],
        ], [
            'university_id.unique'    => 'An account with this University ID already exists.',
            'password.confirmed'      => 'Passwords do not match.',
            'password.min'            => 'Password must be at least 6 characters.',
        ]);

        $user = User::create([
            'full_name'       => $validated['full_name'],
            'university_id'   => $validated['university_id'],
            'university_name' => $validated['university_name'],
            'country'         => $validated['country'],
            'password'        => Hash::make($validated['password']),
        ]);

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'user'  => $this->formatUser($user),
            'token' => $token,
        ], 201);
    }

    /*  Login  */

    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'university_id' => ['required', 'string'],
            'password'      => ['required', 'string'],
        ]);

        $user = User::where('university_id', $request->university_id)->first();

        if (! $user || ! Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'university_id' => ['Invalid University ID or password.'],
            ]);
        }

        // Revoke all previous tokens so only one active session exists per user
        $user->tokens()->delete();

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'user'  => $this->formatUser($user),
            'token' => $token,
        ]);
    }

    /*  Logout  */

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out successfully.']);
    }

    /*  Get current user  */

    public function me(Request $request): JsonResponse
    {
        return response()->json(['user' => $this->formatUser($request->user())]);
    }

    /*  Helper  */

    private function formatUser(User $user): array
    {
        return $user->profile();
    }
}
