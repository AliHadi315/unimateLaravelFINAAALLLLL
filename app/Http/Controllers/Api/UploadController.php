<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UploadController extends Controller
{
    /*  POST /api/uploads — used for task attachments and course files  */

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'file' => [
                'required', 'file', 'max:10240', // 10 MB
                'mimes:pdf,doc,docx,ppt,pptx,xls,xlsx,txt,md,csv,zip,png,jpg,jpeg,gif,webp',
            ],
        ]);

        $file = $request->file('file');
        $path = $file->store('uploads/'.$request->user()->id, 'public');

        return response()->json([
            'url'  => '/storage/'.$path,
            'name' => $file->getClientOriginalName(),
        ], 201);
    }
}
