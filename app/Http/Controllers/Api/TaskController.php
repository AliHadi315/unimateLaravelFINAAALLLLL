<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreTaskRequest;
use App\Models\Task;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TaskController extends Controller
{
    /*  GET /api/tasks  */

    public function index(Request $request): JsonResponse
    {
        $tasks = $request->user()
            ->tasks()
            ->with('course:id,name,code')
            ->orderBy('due_date')
            ->get();

        return response()->json($tasks);
    }

    /*  POST /api/tasks  */

    public function store(StoreTaskRequest $request): JsonResponse
    {
        // Ensure the course belongs to this user
        $this->authorizeCourse($request, $request->course_id);

        $task = $request->user()->tasks()->create($request->validated());
        $task->load('course:id,name,code');

        return response()->json($task, 201);
    }

    /*  PUT /api/tasks/{task}  */

    public function update(StoreTaskRequest $request, Task $task): JsonResponse
    {
        $this->authorizeOwner($request, $task);
        $this->authorizeCourse($request, $request->course_id);

        $task->update($request->validated());
        $task->load('course:id,name,code');

        return response()->json($task);
    }

    /*  PATCH /api/tasks/{task}/toggle  */

    public function toggle(Request $request, Task $task): JsonResponse
    {
        $this->authorizeOwner($request, $task);

        $task->update(['is_completed' => ! $task->is_completed]);

        return response()->json($task);
    }

    /*  DELETE /api/tasks/{task}  */

    public function destroy(Request $request, Task $task): JsonResponse
    {
        $this->authorizeOwner($request, $task);
        $task->delete();

        return response()->json(['message' => 'Task deleted.']);
    }

    /*  Helpers  */

    private function authorizeOwner(Request $request, Task $task): void
    {
        abort_if($task->user_id !== $request->user()->id, 403, 'Unauthorized.');
    }

    private function authorizeCourse(Request $request, int $courseId): void
    {
        $owns = $request->user()->courses()->where('id', $courseId)->exists();
        abort_if(! $owns, 403, 'This course does not belong to you.');
    }
}
