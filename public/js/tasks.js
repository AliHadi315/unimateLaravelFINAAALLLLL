/* ============================================================
   tasks.js
   ============================================================ */

let allTasks   = [];
let allCourses = [];

const PRIORITY_RANK  = { High: 0, Medium: 1, Low: 2 };
const PRIORITY_BADGE = { High: 'badge-red', Medium: 'badge-amber', Low: 'badge-green' };

/* ── INIT ────────────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', async () => {
    if (!requireAuth()) return;
    renderSidebar('tasks.html');
    await loadData();
});

async function loadData() {
    document.getElementById('tasks-list').innerHTML =
        `<div class="text-sm text-muted" style="padding:40px;text-align:center">Loading tasks…</div>`;

    try {
        const [tasks, courses] = await Promise.all([
            TasksAPI.list(),
            CoursesAPI.list(),
        ]);
        allTasks   = tasks;
        allCourses = courses;
        populateCourseDropdowns();
        renderTasks();
    } catch (err) {
        showToast('Failed to load tasks.', 'error');
    }
}

/* ── COURSE DROPDOWNS ────────────────────────────────────── */

function populateCourseDropdowns() {
    const filterSel = document.getElementById('filter-course');
    const taskSel   = document.getElementById('t-course');

    filterSel.innerHTML = '<option value="all">All Courses</option>' +
        allCourses.map(c => `<option value="${c.id}">${escapeHtml(c.code)} — ${escapeHtml(c.name)}</option>`).join('');

    taskSel.innerHTML = '<option value="">— Select a course —</option>' +
        allCourses.map(c => `<option value="${c.id}">${escapeHtml(c.code)} — ${escapeHtml(c.name)}</option>`).join('');
}

/* ── RESET FILTERS ───────────────────────────────────────── */

function resetFilters() {
    document.getElementById('search-input').value    = '';
    document.getElementById('filter-status').value   = 'all';
    document.getElementById('filter-type').value     = 'all';
    document.getElementById('filter-priority').value = 'all';
    document.getElementById('filter-course').value   = 'all';
    document.getElementById('sort-field').value      = 'due_date';
    renderTasks();
}

/* ── RENDER TASKS ────────────────────────────────────────── */

function renderTasks() {
    const q        = document.getElementById('search-input').value.trim().toLowerCase();
    const status   = document.getElementById('filter-status').value;
    const type     = document.getElementById('filter-type').value;
    const priority = document.getElementById('filter-priority').value;
    const courseId = document.getElementById('filter-course').value;
    const sortBy   = document.getElementById('sort-field').value;
    const now      = new Date();
    const weekEnd  = new Date(now.getTime() + 7 * 86400000);

    const courseMap = {};
    allCourses.forEach(c => { courseMap[c.id] = c; });

    let tasks = allTasks.filter(t => {
        const due = new Date(t.due_date);
        if (q && !t.title.toLowerCase().includes(q))                return false;
        if (type !== 'all'     && t.type !== type)                   return false;
        if (priority !== 'all' && t.priority !== priority)           return false;
        if (courseId !== 'all' && t.course_id !== parseInt(courseId)) return false;
        if (status === 'pending')   return !t.is_completed;
        if (status === 'completed') return t.is_completed;
        if (status === 'overdue')   return !t.is_completed && due < now;
        if (status === 'today')     return due.toDateString() === now.toDateString();
        if (status === 'thisWeek')  return due >= now && due <= weekEnd;
        return true;
    });

    tasks.sort((a, b) => {
        if (sortBy === 'due_date') return new Date(a.due_date) - new Date(b.due_date);
        if (sortBy === 'priority') return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
        if (sortBy === 'title')    return a.title.localeCompare(b.title);
        return 0;
    });

    const el = document.getElementById('tasks-list');

    if (tasks.length === 0) {
        el.innerHTML = `
            <div class="empty-state">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                <h4>No tasks found</h4>
                <p>Adjust your filters or add a task using the button above.</p>
            </div>`;
        return;
    }

    el.innerHTML = tasks.map((t, i) => {
        const due     = new Date(t.due_date);
        const overdue = !t.is_completed && due < now;
        const days    = Math.ceil((due - now) / 86400000);
        const pb      = PRIORITY_BADGE[t.priority] || 'badge-gray';
        const course  = courseMap[t.course_id];
        const isLast  = i === tasks.length - 1;

        let dueTxt;
        if (overdue)      dueTxt = `<span class="text-danger font-bold">${Math.abs(days)}d overdue</span>`;
        else if (days===0) dueTxt = `<span style="color:var(--amber);font-weight:600">Due today</span>`;
        else              dueTxt = `Due ${formatDate(t.due_date)}`;

        return `
            <div class="task-list-row" style="${isLast ? '' : 'border-bottom:1px solid var(--border);'}">
                <input type="checkbox" ${t.is_completed ? 'checked' : ''}
                    onchange="toggleTask(${t.id}, this.checked)"
                    class="task-checkbox"/>
                <div class="task-info">
                    <div class="task-title ${t.is_completed ? 'strike' : ''}">${escapeHtml(t.title)}</div>
                    <div class="task-meta">
                        <span class="text-sm text-muted">${t.type}</span>
                        <span class="text-sm text-muted">·</span>
                        <span class="text-sm">${dueTxt}</span>
                        ${course ? `<span class="badge badge-gray" style="font-size:.68rem">${escapeHtml(course.code)}</span>` : ''}
                    </div>
                </div>
                <span class="badge ${pb}">${t.priority}</span>
                <div class="task-actions">
                    <button class="btn btn-ghost btn-sm" onclick="openEditTask(${t.id})">Edit</button>
                    <button class="btn btn-ghost btn-sm text-danger" onclick="promptDeleteTask(${t.id})">Delete</button>
                </div>
            </div>`;
    }).join('');
}

/* ── TASK CRUD ───────────────────────────────────────────── */

async function toggleTask(id, checked) {
    try {
        const updated = await TasksAPI.toggle(id);
        allTasks = allTasks.map(t => t.id === id ? updated : t);
        renderTasks();
    } catch (err) {
        showToast('Failed to update task.', 'error');
    }
}

function openAddTask() {
    document.getElementById('task-modal-title').textContent = 'Add Task';
    document.getElementById('t-edit-id').value              = '';
    document.getElementById('t-title').value                = '';
    document.getElementById('t-course').value               = '';
    document.getElementById('t-type').value                 = 'Assignment';
    document.getElementById('t-priority').value             = 'Medium';
    document.getElementById('t-due').value                  = new Date().toISOString().split('T')[0];
    document.getElementById('t-completed').checked          = false;
    document.querySelectorAll('#modal-task .form-error').forEach(e => e.classList.remove('show'));
    document.querySelectorAll('#modal-task .form-control').forEach(e => e.style.borderColor = '');
    openModal('modal-task');
}

function openEditTask(id) {
    const t = allTasks.find(x => x.id === id);
    if (!t) return;
    document.getElementById('task-modal-title').textContent = 'Edit Task';
    document.getElementById('t-edit-id').value              = t.id;
    document.getElementById('t-title').value                = t.title;
    document.getElementById('t-course').value               = t.course_id;
    document.getElementById('t-type').value                 = t.type;
    document.getElementById('t-priority').value             = t.priority;
    document.getElementById('t-due').value                  = t.due_date;
    document.getElementById('t-completed').checked          = t.is_completed;
    openModal('modal-task');
}

async function saveTask() {
    const v1 = validateRequired('t-course', 'err-t-course');
    const v2 = validateRequired('t-title',  'err-t-title');
    const v3 = validateRequired('t-due',    'err-t-due');
    if (!v1 || !v2 || !v3) return;

    const data = {
        course_id:    parseInt(document.getElementById('t-course').value),
        title:        document.getElementById('t-title').value.trim(),
        type:         document.getElementById('t-type').value,
        priority:     document.getElementById('t-priority').value,
        due_date:     document.getElementById('t-due').value,
        is_completed: document.getElementById('t-completed').checked,
    };

    const editId = document.getElementById('t-edit-id').value;
    const btn    = document.querySelector('#modal-task .btn-primary');
    setLoading(btn, true, 'Saving…');

    try {
        if (editId) {
            const updated = await TasksAPI.update(editId, data);
            allTasks = allTasks.map(t => t.id === parseInt(editId) ? updated : t);
            showToast('Task updated.', 'success');
        } else {
            const created = await TasksAPI.create(data);
            allTasks.push(created);
            showToast('Task added.', 'success');
        }
        closeModal('modal-task');
        renderTasks();
    } catch (err) {
        showToast(err.message || 'Failed to save task.', 'error');
    } finally {
        setLoading(btn, false);
    }
}

function promptDeleteTask(id) {
    document.getElementById('delete-task-id').value = id;
    openModal('modal-delete');
}

async function confirmDeleteTask() {
    const id  = parseInt(document.getElementById('delete-task-id').value);
    const btn = document.querySelector('#modal-delete .btn-danger');
    setLoading(btn, true, 'Deleting…');
    try {
        await TasksAPI.remove(id);
        allTasks = allTasks.filter(t => t.id !== id);
        closeModal('modal-delete');
        renderTasks();
        showToast('Task deleted.');
    } catch (err) {
        showToast('Failed to delete task.', 'error');
    } finally {
        setLoading(btn, false);
    }
}
