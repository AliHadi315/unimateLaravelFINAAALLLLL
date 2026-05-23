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
