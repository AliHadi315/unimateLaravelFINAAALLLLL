<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\GroupMessage;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class GroupChatController extends Controller
{
    /*
     * Every course code a student has is a group room, shared with all
     * students at the same university who have a course with that code.
     */

    /*  GET /api/groups  */

    public function index(Request $request): JsonResponse
    {
        $me  = $request->user();
        $uni = strtolower($me->university_name);

        // My distinct course codes, keeping one course name each for display
        $myCourses = $me->courses()->get(['code', 'name'])
            ->groupBy(fn ($c) => strtoupper(trim($c->code)))
            ->map(fn ($group) => $group->first()->name);

        $rooms = $myCourses->map(function ($courseName, $code) use ($me, $uni) {
            $members = User::whereRaw('LOWER(university_name) = ?', [$uni])
                ->whereHas('courses', fn ($q) => $q->whereRaw('UPPER(TRIM(code)) = ?', [$code]))
                ->count();

            $last = GroupMessage::where('course_code', $code)
                ->where('university_name', $uni)
                ->latest('id')
                ->first();

            $lastRead = DB::table('group_reads')
                ->where('user_id', $me->id)
                ->where('course_code', $code)
                ->where('university_name', $uni)
                ->value('last_read_at');

            $unread = GroupMessage::where('course_code', $code)
                ->where('university_name', $uni)
                ->where('sender_id', '!=', $me->id)
                ->when($lastRead, fn ($q) => $q->where('created_at', '>', $lastRead))
                ->count();

            return [
                'code'        => $code,
                'courseName'  => $courseName,
                'members'     => $members,
                'lastMessage' => $last?->body,
                'lastAt'      => $last?->created_at,
                'unread'      => $unread,
            ];
        })->values()
        ->sortBy([['lastAt', 'desc'], ['code', 'asc']])
        ->values();

        return response()->json($rooms);
    }

    /*  GET /api/groups/{code}/messages  */

    public function show(Request $request, string $code): JsonResponse
    {
        $me   = $request->user();
        $code = strtoupper(trim($code));
        $uni  = strtolower($me->university_name);

        $this->authorizeMember($me, $code);

        // Mark the room as read
        DB::table('group_reads')->updateOrInsert(
            ['user_id' => $me->id, 'course_code' => $code, 'university_name' => $uni],
            ['last_read_at' => now(), 'updated_at' => now(), 'created_at' => now()]
        );

        $messages = GroupMessage::with('sender:id,full_name,avatar_path')
            ->where('course_code', $code)
            ->where('university_name', $uni)
            ->orderBy('id')
            ->limit(300)
            ->get()
            ->map(fn ($m) => $this->format($m));

        return response()->json($messages);
    }

    /*  POST /api/groups/{code}/messages  */

    public function store(Request $request, string $code): JsonResponse
    {
        $me   = $request->user();
        $code = strtoupper(trim($code));

        $this->authorizeMember($me, $code);

        $validated = $request->validate([
            'body' => ['required', 'string', 'max:2000'],
        ]);

        $message = GroupMessage::create([
            'course_code'     => $code,
            'university_name' => strtolower($me->university_name),
            'sender_id'       => $me->id,
            'body'            => $validated['body'],
        ]);

        $message->load('sender:id,full_name,avatar_path');

        return response()->json($this->format($message), 201);
    }

    /*  Helpers  */

    private function authorizeMember(User $me, string $code): void
    {
        $isMember = $me->courses()->whereRaw('UPPER(TRIM(code)) = ?', [$code])->exists();
        abort_unless($isMember, 403, 'You are not enrolled in a course with this code.');
    }

    private function format(GroupMessage $m): array
    {
        return [
            'id'           => $m->id,
            'sender_id'    => $m->sender_id,
            'senderName'   => $m->sender->full_name ?? 'Student',
            'senderAvatar' => $m->sender?->avatar_path ? '/storage/'.$m->sender->avatar_path : null,
            'body'         => $m->body,
            'created_at'   => $m->created_at,
        ];
    }
}
