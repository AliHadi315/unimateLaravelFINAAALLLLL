<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'full_name',
        'university_id',
        'university_name',
        'country',
        'password',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    /*  Relationships  */

    public function courses()
    {
        return $this->hasMany(Course::class);
    }

    public function tasks()
    {
        return $this->hasMany(Task::class);
    }

    public function resources()
    {
        return $this->hasMany(Resource::class);
    }

    public function chatSessions()
    {
        return $this->hasMany(ChatSession::class);
    }
}
