<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Message;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MessageController extends Controller
{
    /*
     * Students can message classmates: users at the same university who
     * share at least one course code with them.
     */

    /*  GET /api/chat/contacts  */

    public function contacts(Request $request): JsonResponse
    {
        $me         = $request->user();
        $classmates = $this->classmates($me);

        $myCodes = $this->courseCodes($me);

        $contacts = $classmates->map(function (User $u) use ($me, $myCodes) {
            $shared = $this->courseCodes($u)->intersect($myCodes)->values();

            $unread = Message::where('sender_id', $u->id)
                ->where('recipient_id', $me->id)
                ->whereNull('read_at')
                ->count();

            $last = Message::where(function ($q) use ($me, $u) {
                    $q->where('sender_id', $me->id)->where('recipient_id', $u->id);
                })
                ->orWhere(function ($q) use ($me, $u) {
                    $q->where('sender_id', $u->id)->where('recipient_id', $me->id);
                })
                ->latest('id')
                ->first();

            return [
                'id'           => $u->id,
                'fullName'     => $u->full_name,
                'avatarUrl'    => $u->avatar_path ? '/storage/'.$u->avatar_path : null,
                'sharedCodes'  => $shared,
                'unread'       => $unread,
                'lastMessage'  => $last?->body,
                'lastAt'       => $last?->created_at,
            ];
        })
        // Recent conversations first, then alphabetical
        ->sortBy([['lastAt', 'desc'], ['fullName', 'asc']])
        ->values();

        return response()->json($contacts);
    }

    /*  GET /api/chat/messages/{user}  */

    public function conversation(Request $request, User $user): JsonResponse
    {
        $me = $request->user();
        $this->authorizeClassmate($me, $user);

        // Mark their messages to me as read
        Message::where('sender_id', $user->id)
            ->where('recipient_id', $me->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        $messages = Message::where(function ($q) use ($me, $user) {
                $q->where('sender_id', $me->id)->where('recipient_id', $user->id);
            })
            ->orWhere(function ($q) use ($me, $user) {
                $q->where('sender_id', $user->id)->where('recipient_id', $me->id);
            })
            ->orderBy('id')
            ->limit(500)
            ->get(['id', 'sender_id', 'recipient_id', 'body', 'created_at']);

        return response()->json($messages);
    }

    /*  POST /api/chat/messages/{user}  */

    public function send(Request $request, User $user): JsonResponse
    {
        $me = $request->user();
        $this->authorizeClassmate($me, $user);

        $validated = $request->validate([
            'body' => ['required', 'string', 'max:2000'],
        ]);

        $message = Message::create([
            'sender_id'    => $me->id,
            'recipient_id' => $user->id,
            'body'         => $validated['body'],
        ]);

        return response()->json($message, 201);
    }

    /*  Helpers  */

    private function courseCodes(User $user)
    {
        return $user->courses()->pluck('code')
            ->map(fn ($c) => strtoupper(trim($c)))
            ->unique()
            ->values();
    }

    private function classmates(User $me)
    {
        $myCodes = $this->courseCodes($me);
        if ($myCodes->isEmpty()) {
            return collect();
        }

        return User::where('id', '!=', $me->id)
            ->whereRaw('LOWER(university_name) = ?', [strtolower($me->university_name)])
            ->whereHas('courses', function ($q) use ($myCodes) {
                $q->whereIn(DB::raw('UPPER(TRIM(code))'), $myCodes->all());
            })
            ->get();
    }

    private function authorizeClassmate(User $me, User $other): void
    {
        $isClassmate = $this->classmates($me)->contains('id', $other->id);
        abort_unless($isClassmate, 403, 'You can only message students who share a course with you.');
    }
}
