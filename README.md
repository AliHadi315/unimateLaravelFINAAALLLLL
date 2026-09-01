# UniMate

A web app that helps university students keep their academic life in one place:
courses, assignments, exams, study resources, progress statistics, and a built-in
study assistant.

Built for **CSC 400 – Web Programming** at Al Maaref University.

## Stack

- **Backend:** Laravel 12 (PHP 8.2+), Sanctum token authentication, SQLite
- **Frontend:** plain HTML, CSS, and JavaScript (no framework) served from `public/`

The frontend talks to the backend through a JSON API under `/api`.

## Features

- Register / login with your university ID
- Profile page with picture upload and password change
- Manage courses (code, instructor, semester, optional credits and grade)
- Track assignments, exams, and projects with due dates, priorities, completion,
  and file attachments
- List and monthly calendar views for tasks
- Store notes, links, and uploaded files per course
- Message classmates — students at your university who share a course code
- Dashboard with overall progress, upcoming deadlines, and optional browser
  reminders for tasks due today
- Statistics page with per-course and per-type breakdowns plus a GPA calculator
- Study assistant that answers questions about your own tasks and deadlines,
  supports attaching text files, and saves chat sessions
- Light and dark themes

## Getting started

```bash
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan storage:link
php artisan serve
```

The `storage:link` step is needed for profile pictures and file uploads.

Then open http://localhost:8000 and create an account.

The default database is SQLite, so no database server is needed — the migrate
command creates `database/database.sqlite` automatically.

### Optional: real AI for the study assistant

The study assistant works offline out of the box with built-in answers about
your tasks and deadlines. To power it with Claude instead, add an Anthropic API
key to `.env`:

```
ANTHROPIC_API_KEY=sk-ant-...
```

The assistant automatically uses the real model when a key is present and falls
back to the built-in responses when it isn't (or when the API call fails).

## Project layout

| Path | What's there |
|------|--------------|
| `routes/api.php` | JSON API routes (auth, courses, tasks, resources, chat sessions) |
| `routes/web.php` | Serves the HTML pages on clean URLs |
| `app/Http/Controllers/Api/` | API controllers |
| `app/Models/` | Eloquent models |
| `public/pages/` | The frontend pages |
| `public/js/` | Frontend logic (one file per page + shared helpers) |
| `public/css/style.css` | All styling |
