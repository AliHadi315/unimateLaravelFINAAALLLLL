<?php

use Illuminate\Support\Facades\Route;

function servePage(string $file) {
    return response(file_get_contents(public_path($file)), 200, ['Content-Type' => 'text/html; charset=UTF-8']);
}

Route::get('/',          fn() => servePage('index.html'));
Route::get('/login',     fn() => servePage('pages/login.html'))->name('login');
Route::get('/register',  fn() => servePage('pages/register.html'));
Route::get('/dashboard', fn() => servePage('pages/dashboard.html'));
Route::get('/courses',   fn() => servePage('pages/courses.html'));
Route::get('/tasks',     fn() => servePage('pages/tasks.html'));
Route::get('/statistics',fn() => servePage('pages/statistics.html'));
Route::get('/ai',        fn() => servePage('pages/ai.html'));
