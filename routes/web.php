<?php

use Illuminate\Support\Facades\Route;

Route::get('/',          fn() => file_get_contents(public_path('index.html')));
Route::get('/login',     fn() => file_get_contents(public_path('pages/login.html')))->name('login');
Route::get('/register',  fn() => file_get_contents(public_path('pages/register.html')));
Route::get('/dashboard', fn() => file_get_contents(public_path('pages/dashboard.html')));
Route::get('/courses',   fn() => file_get_contents(public_path('pages/courses.html')));
Route::get('/tasks',     fn() => file_get_contents(public_path('pages/tasks.html')));
Route::get('/statistics',fn() => file_get_contents(public_path('pages/statistics.html')));
Route::get('/ai',        fn() => file_get_contents(public_path('pages/ai.html')));
