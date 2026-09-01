<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Task extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'course_id',
        'title',
        'type',
        'priority',
        'due_date',
        'is_completed',
        'attachment_path',
        'attachment_name',
    ];

    protected $casts = [
        'is_completed' => 'boolean',
    ];

    
    public function getDueDateAttribute($value): string
    {
        return $value ? substr($value, 0, 10) : '';
    }

    /*  Relationships  */

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function course()
    {
        return $this->belongsTo(Course::class);
    }
}
