<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ChatSessionController;
use App\Http\Controllers\Api\CourseController;
use App\Http\Controllers\Api\ResourceController;
use App\Http\Controllers\Api\TaskController;
use Illuminate\Support\Facades\Route;



Route::prefix('auth')->group(function () {
    Route::post('register', [AuthController::class, 'register']);
    Route::post('login',    [AuthController::class, 'login']);
});

/*  Protected: Auth  */

Route::middleware('auth:sanctum')->group(function () {

    Route::post('/auth/register', [AuthController::class, 'register']);
    Route::post('/auth/login', [AuthController::class, 'login']);
    Route::post('auth/logout', [AuthController::class, 'logout']);
    Route::get('auth/me',      [AuthController::class, 'me']);

    /*  Courses  */
    Route::apiResource('courses', CourseController::class);

    /*  Tasks  */
    Route::apiResource('tasks', TaskController::class);
    Route::patch('tasks/{task}/toggle', [TaskController::class, 'toggle']);

    /*  Resources  */
    Route::apiResource('resources', ResourceController::class);

    /*  Chat Sessions  */
    Route::apiResource('chat-sessions', ChatSessionController::class);

});
