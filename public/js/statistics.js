

document.addEventListener('DOMContentLoaded', async () => {
    if (!requireAuth()) return;
    renderSidebar('statistics.html');

    // Show skeletons while loading
    ['s-total','s-completed','s-pending','s-overdue'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = skeletonStat();
    });
    document.getElementById('type-breakdown').innerHTML = skeletonRows(3);
    document.getElementById('course-progress').innerHTML = skeletonRows(4);

    await renderStats();
});

async function renderStats() {
    try {
        const [tasks, courses] = await Promise.all([
            TasksAPI.list(),
            CoursesAPI.list(),
        ]);

        const now       = new Date();
        const total     = tasks.length;
        const completed = tasks.filter(t => t.is_completed).length;
        const pending   = tasks.filter(t => !t.is_completed).length;
        const overdue   = tasks.filter(t => !t.is_completed && new Date(t.due_date) < now).length;
        const pct       = total ? Math.round(completed / total * 100) : 0;

        // Tiles
        document.getElementById('s-total').textContent     = total;
        document.getElementById('s-completed').textContent = completed;
        document.getElementById('s-pending').textContent   = pending;
        document.getElementById('s-overdue').textContent   = overdue;

        // Overall progress
        document.getElementById('overall-pct').textContent  = pct + '%';
        document.getElementById('overall-bar').style.width  = pct + '%';
        document.getElementById('overall-label').textContent = total
            ? `${completed} of ${total} tasks completed`
            : 'No tasks yet.';

        renderTypeBreakdown(tasks);
        renderCourseProgress(tasks, courses, now);

    } catch (err) {
        showToast('Failed to load statistics.', 'error');
    }
}

/*  BREAKDOWN BY TYPE  */

function renderTypeBreakdown(tasks) {
    const el     = document.getElementById('type-breakdown');
    const total  = tasks.length;

    if (total === 0) {
        el.innerHTML = `<p class="text-muted text-sm">No tasks yet.</p>`;
        return;
    }

    const types  = ['Assignment', 'Exam', 'Project'];
    const colors = { Assignment: 'var(--blue)', Exam: 'var(--red)', Project: 'var(--amber)' };

    el.innerHTML = types.map(type => {
        const typeTasks = tasks.filter(t => t.type === type);
        const done      = typeTasks.filter(t => t.is_completed).length;
        const tot       = typeTasks.length;
        const p         = tot ? Math.round(done / tot * 100) : 0;

        return `
            <div class="type-breakdown-row">
                <div class="flex-between mb-1">
                    <span class="type-label">${type}</span>
                    <span class="text-sm text-muted">${done}/${tot} · ${p}%</span>
                </div>
                <div class="progress-wrap">
                    <div class="progress-bar" style="width:${p}%;background:${colors[type]}"></div>
                </div>
            </div>`;
    }).join('');
}

/*  COURSE PROGRESS  */

function renderCourseProgress(tasks, courses, now) {
    const el = document.getElementById('course-progress');

    if (courses.length === 0) {
        el.innerHTML = `<p class="text-muted text-sm">No courses added yet.</p>`;
        return;
    }

    el.innerHTML = courses.map((c, i) => {
        const ctasks   = tasks.filter(t => t.course_id === c.id);
        const cdone    = ctasks.filter(t => t.is_completed).length;
        const ctotal   = ctasks.length;
        const cpct     = ctotal ? Math.round(cdone / ctotal * 100) : 0;
        const coverdue = ctasks.filter(t => !t.is_completed && new Date(t.due_date) < now).length;
        const isLast   = i === courses.length - 1;

        return `
            <div class="course-progress-row" style="${isLast ? '' : 'border-bottom:1px solid var(--border);'}">
                <div class="flex-between mb-1">
                    <div>
                        <span class="course-progress-code">${escapeHtml(c.code)}</span>
                        <span class="text-muted text-sm course-progress-name">${escapeHtml(c.name)}</span>
                    </div>
                    <div class="course-progress-meta">
                        ${coverdue ? `<span class="badge badge-red">${coverdue} overdue</span>` : ''}
                        <span class="text-sm text-muted">${cdone}/${ctotal}</span>
                        <span class="course-progress-pct">${cpct}%</span>
                    </div>
                </div>
                <div class="progress-wrap" style="height:10px">
                    <div class="progress-bar ${cpct === 100 ? 'green' : ''}" style="width:${cpct}%"></div>
                </div>
                <div class="flex-between mt-1">
                    <span class="text-sm text-muted">${escapeHtml(c.instructor)} · ${escapeHtml(c.semester)}</span>
                    <span class="text-sm text-muted">${ctotal - cdone} remaining</span>
                </div>
            </div>`;
    }).join('');
}
