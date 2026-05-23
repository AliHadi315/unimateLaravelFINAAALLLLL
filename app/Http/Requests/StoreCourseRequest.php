<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreCourseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name'       => ['required', 'string', 'max:255'],
            'code'       => ['required', 'string', 'max:50'],
            'instructor' => ['required', 'string', 'max:255'],
            'semester'   => ['required', 'string', 'max:50'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required'       => 'Course name is required.',
            'code.required'       => 'Course code is required.',
            'instructor.required' => 'Instructor name is required.',
            'semester.required'   => 'Semester is required.',
        ];
    }
}
