<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // One chat room per course code per university (e.g. CSC400 at AMU)
        Schema::create('group_messages', function (Blueprint $table) {
            $table->id();
            $table->string('course_code', 50);      // stored uppercase
            $table->string('university_name');      // stored lowercase
            $table->foreignId('sender_id')->constrained('users')->onDelete('cascade');
            $table->text('body');
            $table->timestamps();

            $table->index(['course_code', 'university_name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('group_messages');
    }
};
