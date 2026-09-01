<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreResourceRequest;
use App\Models\Resource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ResourceController extends Controller
{
    /*  GET /api/resources  */

    public function index(Request $request): JsonResponse
    {
        $resources = $request->user()
            ->resources()
            ->with('course:id,name,code')
            ->orderBy('title')
            ->get();

        return response()->json($resources);
    }

    /*  GET /api/shared-resources?course_id=N
        Resources classmates chose to share for the same course code  */

    public function shared(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'course_id' => ['required', 'integer', 'exists:courses,id'],
        ]);

        $me     = $request->user();
        $course = $me->courses()->findOrFail($validated['course_id']);

        $code = strtoupper(trim($course->code));
        $uni  = strtolower($me->university_name);

        $shared = Resource::query()
            ->where('is_shared', true)
            ->where('resources.user_id', '!=', $me->id)
            ->join('courses', 'courses.id', '=', 'resources.course_id')
            ->join('users', 'users.id', '=', 'resources.user_id')
            ->whereRaw('UPPER(TRIM(courses.code)) = ?', [$code])
            ->whereRaw('LOWER(users.university_name) = ?', [$uni])
            ->orderByDesc('resources.id')
            ->get([
                'resources.id', 'resources.title', 'resources.type', 'resources.value',
                'users.full_name as owner_name',
            ]);

        return response()->json($shared);
    }

    /*  POST /api/resources  */

    public function store(StoreResourceRequest $request): JsonResponse
    {
        $this->authorizeCourse($request, $request->course_id);

        $resource = $request->user()->resources()->create($request->validated());
        $resource->load('course:id,name,code');

        return response()->json($resource, 201);
    }

    /*  PUT /api/resources/{resource}  */

    public function update(StoreResourceRequest $request, Resource $resource): JsonResponse
    {
        $this->authorizeOwner($request, $resource);
        $this->authorizeCourse($request, $request->course_id);

        $resource->update($request->validated());
        $resource->load('course:id,name,code');

        return response()->json($resource);
    }

    /*  DELETE /api/resources/{resource}  */

    public function destroy(Request $request, Resource $resource): JsonResponse
    {
        $this->authorizeOwner($request, $resource);
        $resource->delete();

        return response()->json(['message' => 'Resource deleted.']);
    }

    /*  Helpers  */

    private function authorizeOwner(Request $request, Resource $resource): void
    {
        abort_if($resource->user_id !== $request->user()->id, 403, 'Unauthorized.');
    }

    private function authorizeCourse(Request $request, int $courseId): void
    {
        $owns = $request->user()->courses()->where('id', $courseId)->exists();
        abort_if(! $owns, 403, 'This course does not belong to you.');
    }
}
