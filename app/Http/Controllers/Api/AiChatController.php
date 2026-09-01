<?php

namespace App\Http\Controllers\Api;

use Anthropic\Client;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AiChatController extends Controller
{
    /*  GET /api/ai/status — tells the frontend whether real AI is available  */

    public function status(): JsonResponse
    {
        return response()->json([
            'enabled' => $this->configured(),
        ]);
    }

    // Both the API key and a model ID must be set in .env
    private function configured(): bool
    {
        return (bool) (config('services.anthropic.key') && config('services.anthropic.model'));
    }

    /*  POST /api/ai/chat  */

    public function chat(Request $request): JsonResponse
    {
        abort_unless($this->configured(), 503, 'AI is not configured.');

        $validated = $request->validate([
            'messages'                => ['required', 'array', 'max:40'],
            'messages.*.role'         => ['required', 'in:user,ai'],
            'messages.*.content'      => ['required', 'string', 'max:12000'], // roomy enough for attached file text
        ]);

        $user    = $request->user();
        $courses = $user->courses()->get(['id', 'name', 'code', 'semester']);
        $tasks   = $user->tasks()->orderBy('due_date')->get(['course_id', 'title', 'type', 'priority', 'due_date', 'is_completed']);

        $system = $this->buildSystemPrompt($user->full_name, $courses, $tasks);

        // The API expects role "assistant"; our frontend stores "ai"
        $messages = array_map(fn ($m) => [
            'role'    => $m['role'] === 'ai' ? 'assistant' : 'user',
            'content' => $m['content'],
        ], $validated['messages']);

        try {
            $client = new Client(apiKey: config('services.anthropic.key'));

            $response = $client->messages->create(
                model: config('services.anthropic.model'),
                maxTokens: 2048,
                system: $system,
                messages: $messages,
            );

            $reply = '';
            foreach ($response->content as $block) {
                if ($block->type === 'text') {
                    $reply .= $block->text;
                }
            }

            return response()->json(['reply' => $reply !== '' ? $reply : 'Sorry, I could not come up with a response.']);
        } catch (\Throwable $e) {
            report($e);

            return response()->json(['message' => 'The AI service is unavailable right now.'], 502);
        }
    }

    /*  Give the model the student's real data so answers are grounded  */

    private function buildSystemPrompt(string $name, $courses, $tasks): string
    {
        $courseLines = $courses->map(
            fn ($c) => "- [{$c->id}] {$c->code} {$c->name} ({$c->semester})"
        )->implode("\n") ?: '(none)';

        $taskLines = $tasks->map(function ($t) {
            $status = $t->is_completed ? 'completed' : 'pending';

            return "- {$t->title} | {$t->type} | priority {$t->priority} | due {$t->due_date} | {$status} | course [{$t->course_id}]";
        })->implode("\n") ?: '(none)';

        $today = now()->toDateString();

        return <<<PROMPT
You are the study assistant inside UniMate, a university productivity app. You are talking to {$name}, a university student. Today's date is {$today}.

Their courses:
{$courseLines}

Their tasks:
{$taskLines}

Help with study planning, prioritization, explanations of academic concepts, and questions about their courses and deadlines. Keep answers short and practical — a few sentences or a short list. Use plain text, no markdown headers. When referring to tasks, use their titles and course codes, never the internal ids in brackets.
PROMPT;
    }
}
