<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class ProfileController extends Controller
{
    /*  PUT /api/auth/profile  */

    public function update(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'full_name'        => ['required', 'string', 'max:255'],
            'country'          => ['required', 'string', 'max:100'],
            'university_name'  => ['required', 'string', 'max:255'],
            'current_password' => ['nullable', 'string', 'required_with:password'],
            'password'         => ['nullable', 'string', 'min:6', 'confirmed'],
        ]);

        // Optional password change — requires the current password
        if (! empty($validated['password'])) {
            if (! Hash::check($validated['current_password'], $user->password)) {
                throw ValidationException::withMessages([
                    'current_password' => ['Current password is incorrect.'],
                ]);
            }
            $user->password = Hash::make($validated['password']);
        }

        $user->full_name       = $validated['full_name'];
        $user->country         = $validated['country'];
        $user->university_name = $validated['university_name'];
        $user->save();

        return response()->json(['user' => $user->profile()]);
    }

    /*  POST /api/auth/avatar  */

    public function avatar(Request $request): JsonResponse
    {
        $request->validate([
            'avatar' => ['required', 'image', 'mimes:jpg,jpeg,png,gif,webp', 'max:2048'],
        ]);

        $user = $request->user();

        if ($user->avatar_path) {
            Storage::disk('public')->delete($user->avatar_path);
        }

        $path = $request->file('avatar')->store('avatars', 'public');
        $user->update(['avatar_path' => $path]);

        return response()->json(['user' => $user->profile()]);
    }
}
