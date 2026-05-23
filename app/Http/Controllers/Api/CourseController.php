<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCourseRequest;
use App\Models\Course;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CourseController extends Controller
{
    /*  GET /api/courses  */

    public function index(Request $request): JsonResponse
    {
        $courses = $request->user()
            ->courses()
            ->withCount(['tasks', 'tasks as pending_tasks_count' => function ($q) {
                $q->where('is_completed', false);
            }])
            ->orderBy('name')
            ->get();

        return response()->json($courses);
    }

    /*  POST /api/courses  */

    public function store(StoreCourseRequest $request): JsonResponse
    {
        $course = $request->user()->courses()->create($request->validated());

        return response()->json($course, 201);
    }

    /*  PUT /api/courses/{course}  */

    public function update(StoreCourseRequest $request, Course $course): JsonResponse
    {
        $this->authorizeOwner($request, $course);
        $course->update($request->validated());

        return response()->json($course);
    }

    /*  DELETE /api/courses/{course}  */

    public function destroy(Request $request, Course $course): JsonResponse
    {
        $this->authorizeOwner($request, $course);
        $course->delete();   // cascades to tasks & resources

        return response()->json(['message' => 'Course deleted.']);
    }

    /*  Helper  */

    private function authorizeOwner(Request $request, Course $course): void
    {
        abort_if($course->user_id !== $request->user()->id, 403, 'Unauthorized.');
    }
}
