<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Tracks when a user last opened a group room, for unread counts
        Schema::create('group_reads', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('course_code', 50);
            $table->string('university_name');
            $table->timestamp('last_read_at');
            $table->timestamps();

            $table->unique(['user_id', 'course_code', 'university_name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('group_reads');
    }
};
