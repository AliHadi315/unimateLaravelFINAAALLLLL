<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreTaskRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'course_id'    => ['required', 'integer', 'exists:courses,id'],
            'title'        => ['required', 'string', 'max:255'],
            'type'         => ['required', 'in:Assignment,Exam,Project'],
            'priority'     => ['required', 'in:Low,Medium,High'],
            'due_date'     => ['required', 'date'],
            'is_completed' => ['sometimes', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'course_id.required' => 'Please select a course.',
            'course_id.exists'   => 'Selected course does not exist.',
            'title.required'     => 'Task title is required.',
            'due_date.required'  => 'Due date is required.',
            'due_date.date'      => 'Due date must be a valid date.',
            'type.in'            => 'Type must be Assignment, Exam, or Project.',
            'priority.in'        => 'Priority must be Low, Medium, or High.',
        ];
    }
}
