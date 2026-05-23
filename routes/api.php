<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ChatSessionController;
use App\Http\Controllers\Api\CourseController;
use App\Http\Controllers\Api\ResourceController;
use App\Http\Controllers\Api\TaskController;
use Illuminate\Support\Facades\Route;

Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login',    [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me',      [AuthController::class, 'me']);
    Route::apiResource('courses',        CourseController::class);
    Route::apiResource('tasks',          TaskController::class);
    Route::apiResource('resources',      ResourceController::class);
    Route::apiResource('chat-sessions',  ChatSessionController::class);
    Route::patch('tasks/{task}/toggle',  [TaskController::class, 'toggle']);
});