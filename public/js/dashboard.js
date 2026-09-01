

document.addEventListener('DOMContentLoaded', async () => {
    if (!requireAuth()) return;

    renderSidebar('dashboard.html');
    setWelcomeMessage();
    await refreshDashboard();
});

/*  WELCOME MESSAGE  */

function setWelcomeMessage() {
    const user      = getUser();
    const welcomeEl = document.getElementById('welcome-msg');
    if (!welcomeEl || !user) return;

    const hour      = new Date().getHours();
    const greeting  = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    const firstName = (user.fullName || 'Student').split(' ')[0];
    welcomeEl.textContent = `${greeting}, ${firstName}!`;
}

/*  REFRESH DASHBOARD  */

async function refreshDashboard() {
    showSkeletons();

    try {
        const [courses, tasks] = await Promise.all([
            CoursesAPI.list(),
            TasksAPI.list(),
        ]);

        renderStats(courses, tasks);
        renderProgress(tasks);
        renderUpcomingTasks(tasks, courses);

    } catch (err) {
        showToast('Failed to load dashboard data.', 'error');
    }
}

/*  STATS  */

function renderStats(courses, tasks) {
    const completed = tasks.filter(t => t.is_completed).length;
    const pending   = tasks.filter(t => !t.is_completed).length;
    const overdue   = tasks.filter(isOverdue).length;

    document.getElementById('stat-courses').textContent   = courses.length;
    document.getElementById('stat-total').textContent     = tasks.length;
    document.getElementById('stat-completed').textContent = completed;
    document.getElementById('stat-pending').textContent   = pending;
    document.getElementById('stat-overdue').textContent   = overdue;
}

/*  PROGRESS  */

function renderProgress(tasks) {
    const total     = tasks.length;
    const completed = tasks.filter(t => t.is_completed).length;
    const pct       = total ? Math.round(completed / total * 100) : 0;

    document.getElementById('progress-pct').textContent  = pct + '%';
    document.getElementById('main-progress').style.width = pct + '%';
    document.getElementById('progress-label').textContent = total === 0
        ? 'No tasks yet.'
        : `${completed} of ${total} tasks completed`;
}

/*  UPCOMING TASKS  */

function renderUpcomingTasks(tasks, courses) {
    const courseMap = {};
    courses.forEach(c => { courseMap[c.id] = c; });

    const upcoming = tasks
        .filter(t => !t.is_completed)
        .sort((a, b) => parseDate(a.due_date) - parseDate(b.due_date))
        .slice(0, 5);

    const listEl = document.getElementById('upcoming-list');
    const BADGE  = { High: 'badge-red', Medium: 'badge-amber', Low: 'badge-green' };

    if (upcoming.length === 0) {
        listEl.innerHTML = `
            <div class="empty-state">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M9 11l3 3L22 4"/>
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                </svg>
                <h4>No upcoming tasks</h4>
                <p>Add tasks from your courses to see them here.</p>
            </div>`;
        return;
    }

    listEl.innerHTML = upcoming.map((t, i) => {
        const days   = daysUntil(t.due_date);
        const course = courseMap[t.course_id];
        const pb     = BADGE[t.priority] || 'badge-gray';
        const isLast = i === upcoming.length - 1;

        let dueTxt;
        if (days < 0)      dueTxt = `<span class="text-danger">${Math.abs(days)}d overdue</span>`;
        else if (days === 0) dueTxt = `<span style="color:var(--amber)">Due today</span>`;
        else               dueTxt = `Due in ${days}d`;

        return `
            <div class="upcoming-row" style="${isLast ? '' : 'border-bottom:1px solid var(--border);'} padding:12px 0; display:flex; align-items:center; gap:12px">
                <div style="flex:1;min-width:0">
                    <div style="font-weight:600;font-size:.875rem;color:var(--text)">${escapeHtml(t.title)}</div>
                    <div class="text-sm text-muted mt-1">
                        ${t.type}${course ? ' · ' + escapeHtml(course.code) : ''} · ${dueTxt}
                    </div>
                </div>
                <span class="badge ${pb}">${t.priority}</span>
            </div>`;
    }).join('');
}

/*  SKELETONS  */

function showSkeletons() {
    ['stat-courses','stat-total','stat-completed','stat-pending','stat-overdue']
        .forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = skeletonStat();
        });
    document.getElementById('upcoming-list').innerHTML = skeletonRows(4);
}
