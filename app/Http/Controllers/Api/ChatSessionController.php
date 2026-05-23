<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ChatSession;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ChatSessionController extends Controller
{
    /*  GET /api/chat-sessions  */

    public function index(Request $request): JsonResponse
    {
        $sessions = $request->user()
            ->chatSessions()
            ->orderByDesc('updated_at')
            ->get(['id', 'title', 'messages', 'updated_at']);

        return response()->json($sessions);
    }

    /*  POST /api/chat-sessions  */

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title'    => ['required', 'string', 'max:255'],
            'messages' => ['required', 'array'],
        ]);

        $session = $request->user()->chatSessions()->create($validated);

        return response()->json($session, 201);
    }

    /*  PUT /api/chat-sessions/{session}  */

    public function update(Request $request, ChatSession $chatSession): JsonResponse
    {
        abort_if($chatSession->user_id !== $request->user()->id, 403, 'Unauthorized.');

        $validated = $request->validate([
            'title'    => ['sometimes', 'string', 'max:255'],
            'messages' => ['sometimes', 'array'],
        ]);

        $chatSession->update($validated);

        return response()->json($chatSession);
    }

    /*  DELETE /api/chat-sessions/{session}  */

    public function destroy(Request $request, ChatSession $chatSession): JsonResponse
    {
        abort_if($chatSession->user_id !== $request->user()->id, 403, 'Unauthorized.');
        $chatSession->delete();

        return response()->json(['message' => 'Session deleted.']);
    }
}
