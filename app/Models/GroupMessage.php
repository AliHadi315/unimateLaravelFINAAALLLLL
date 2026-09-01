<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class GroupMessage extends Model
{
    use HasFactory;

    protected $fillable = [
        'course_code',
        'university_name',
        'sender_id',
        'body',
    ];

    /*  Relationships  */

    public function sender()
    {
        return $this->belongsTo(User::class, 'sender_id');
    }
}
