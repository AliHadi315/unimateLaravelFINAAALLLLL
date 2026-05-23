<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreResourceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'course_id' => ['required', 'integer', 'exists:courses,id'],
            'title'     => ['required', 'string', 'max:255'],
            'type'      => ['required', 'in:Note,Link,File'],
            'value'     => ['required', 'string'],
        ];
    }

    public function messages(): array
    {
        return [
            'course_id.required' => 'Please select a course.',
            'course_id.exists'   => 'Selected course does not exist.',
            'title.required'     => 'Resource title is required.',
            'type.in'            => 'Type must be Note, Link, or File.',
            'value.required'     => 'Resource content is required.',
        ];
    }
}
