

/*  STATE  */

let allCourses   = [];
let allTasks     = [];
let allResources = [];
let activeCourse = null;
let sortAsc      = true;

const PRIORITY_RANK  = { High: 0, Medium: 1, Low: 2 };
const PRIORITY_BADGE = { High: 'badge-red', Medium: 'badge-amber', Low: 'badge-green' };

/*  INIT  */

document.addEventListener('DOMContentLoaded', async () => {
    if (!requireAuth()) return;
    renderSidebar('courses.html');
    initDetailTabs();
    bindCourseModalReset();
    bindResTypeChange();
    await loadData();
});

async function loadData() {
    showGridSkeleton();
    try {
        const [courses, tasks, resources] = await Promise.all([
            CoursesAPI.list(),
            TasksAPI.list(),
            ResourcesAPI.list(),
        ]);
        allCourses   = courses;
        allTasks     = tasks;
        allResources = resources;
        populateSemesterFilter();
        renderCourses();
    } catch (err) {
        showToast('Failed to load courses.', 'error');
    }
}

/*  SEMESTER FILTER  */

// Build the filter options from the semesters actually in use
function populateSemesterFilter() {
    const sel      = document.getElementById('filter-semester');
    const current  = sel.value;
    const semesters = [...new Set(allCourses.map(c => c.semester))].sort();

    sel.innerHTML = '<option value="All">All Semesters</option>' +
        semesters.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('');

    if ([...sel.options].some(o => o.value === current)) sel.value = current;
}

/*  TABS  */

function initDetailTabs() {
    const buttons = document.querySelectorAll('#modal-details .tab-btn');
    const panels  = document.querySelectorAll('#modal-details .tab-panel');
    buttons.forEach((btn, i) => {
        btn.addEventListener('click', () => {
            buttons.forEach(b => b.classList.remove('active'));
            panels.forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            if (panels[i]) panels[i].classList.add('active');
        });
    });
}

/*  SORT TOGGLE  */

function toggleSortDir() {
    sortAsc = !sortAsc;
    const icon = document.getElementById('sort-dir-icon');
    icon.innerHTML = sortAsc
        ? `<line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>`
        : `<line x1="12" y1="5" x2="12" y2="19"/><polyline points="5 12 12 5 19 12"/>`;
    renderCourses();
}

function resetFilters() {
    document.getElementById('search-input').value    = '';
    document.getElementById('filter-semester').value = 'All';
    document.getElementById('sort-field').value      = 'name';
    sortAsc = true;
    renderCourses();
}

/*  RENDER COURSES  */

function renderCourses() {
    const q      = document.getElementById('search-input').value.trim().toLowerCase();
    const sem    = document.getElementById('filter-semester').value;
    const sortBy = document.getElementById('sort-field').value;

    let courses = allCourses.filter(c => {
        const matchQ = !q
            || c.name.toLowerCase().includes(q)
            || c.code.toLowerCase().includes(q)
            || c.instructor.toLowerCase().includes(q);
        const matchS = sem === 'All' || c.semester === sem;
        return matchQ && matchS;
    });

    courses.sort((a, b) => {
        const va = (a[sortBy] || '').toLowerCase();
        const vb = (b[sortBy] || '').toLowerCase();
        return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
    });

    const grid = document.getElementById('courses-grid');

    if (courses.length === 0) {
        grid.innerHTML = `
            <div class="empty-state" style="grid-column:1/-1">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                <h4>No courses found</h4>
                <p>Add your first course using the button above.</p>
            </div>`;
        return;
    }

    grid.innerHTML = courses.map(c => {
        const pending = allTasks.filter(t => t.course_id === c.id && !t.is_completed).length;
        return `
            <div class="card course-card" onclick="openCourseDetails(${c.id})">
                <div class="course-card-header">
                    <div>
                        <div class="course-card-name">${escapeHtml(c.name)}</div>
                        <div class="text-sm text-muted mt-1">${escapeHtml(c.code)}</div>
                    </div>
                    <span class="badge badge-blue">${pending} pending</span>
                </div>
                <div class="course-card-instructor">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    ${escapeHtml(c.instructor)}
                </div>
                <div class="course-card-footer">
                    <div class="flex-center gap-2">
                        <span class="badge badge-gray">${escapeHtml(c.semester)}</span>
                        ${c.grade ? `<span class="badge badge-blue">${escapeHtml(c.grade)}</span>` : ''}
                    </div>
                    <div class="course-card-actions" onclick="event.stopPropagation()">
                        <button class="btn btn-ghost btn-sm" onclick="editCourse(${c.id})">Edit</button>
                        <button class="btn btn-ghost btn-sm text-danger" onclick="promptDeleteCourse(${c.id}, '${escapeHtml(c.name).replace(/'/g,"\\'")}')">Delete</button>
                    </div>
                </div>
            </div>`;
    }).join('');
}

/*  COURSE MODAL RESET  */

function bindCourseModalReset() {
    document.getElementById('add-course-btn').addEventListener('click', () => {
        document.getElementById('course-modal-title').textContent = 'Add Course';
        ['c-name', 'c-code', 'c-inst'].forEach(id => {
            document.getElementById(id).value = '';
            document.getElementById(id).style.borderColor = '';
        });
        document.getElementById('c-semester').value = 'Spring 2026';
        document.getElementById('c-credits').value  = '';
        document.getElementById('c-grade').value    = '';
        document.getElementById('c-edit-id').value  = '';
        document.querySelectorAll('#modal-course .form-error').forEach(e => e.classList.remove('show'));
        openModal('modal-course');
    });
}

/*  COURSE CRUD  */

async function saveCourse() {
    const v1 = validateRequired('c-name', 'err-c-name');
    const v2 = validateRequired('c-code', 'err-c-code');
    const v3 = validateRequired('c-inst', 'err-c-inst');
    if (!v1 || !v2 || !v3) return;

    const credits = document.getElementById('c-credits').value;
    const data = {
        name:       document.getElementById('c-name').value.trim(),
        code:       document.getElementById('c-code').value.trim(),
        instructor: document.getElementById('c-inst').value.trim(),
        semester:   document.getElementById('c-semester').value,
        grade:      document.getElementById('c-grade').value || null,
        credits:    credits ? parseInt(credits) : null,
    };

    const editId = document.getElementById('c-edit-id').value;
    const btn    = document.querySelector('#modal-course .btn-primary');

    setLoading(btn, true, 'Saving…');

    try {
        if (editId) {
            const updated = await CoursesAPI.update(editId, data);
            allCourses = allCourses.map(c => c.id === parseInt(editId) ? updated : c);
            showToast('Course updated.', 'success');
        } else {
            const created = await CoursesAPI.create(data);
            allCourses.push(created);
            showToast('Course added.', 'success');
        }
        closeModal('modal-course');
        populateSemesterFilter();
        renderCourses();
    } catch (err) {
        showToast(err.message || 'Failed to save course.', 'error');
    } finally {
        setLoading(btn, false);
    }
}

function editCourse(id) {
    const c = allCourses.find(x => x.id === id);
    if (!c) return;
    document.getElementById('course-modal-title').textContent = 'Edit Course';
    document.getElementById('c-name').value     = c.name;
    document.getElementById('c-code').value     = c.code;
    document.getElementById('c-inst').value     = c.instructor;
    document.getElementById('c-semester').value = c.semester;
    document.getElementById('c-credits').value  = c.credits || '';
    document.getElementById('c-grade').value    = c.grade || '';
    document.getElementById('c-edit-id').value  = c.id;
    openModal('modal-course');
}

function promptDeleteCourse(id, name) {
    document.getElementById('delete-course-name').textContent = name;
    document.getElementById('delete-course-id').value         = id;
    openModal('modal-delete-course');
}

async function confirmDeleteCourse() {
    const id  = parseInt(document.getElementById('delete-course-id').value);
    const btn = document.querySelector('#modal-delete-course .btn-danger');
    setLoading(btn, true, 'Deleting…');
    try {
        await CoursesAPI.remove(id);
        allCourses   = allCourses.filter(c => c.id !== id);
        allTasks     = allTasks.filter(t => t.course_id !== id);
        allResources = allResources.filter(r => r.course_id !== id);
        closeModal('modal-delete-course');
        populateSemesterFilter();
        renderCourses();
        showToast('Course deleted.', 'success');
    } catch (err) {
        showToast(err.message || 'Failed to delete course.', 'error');
    } finally {
        setLoading(btn, false);
    }
}

/*  COURSE DETAILS  */

function openCourseDetails(id) {
    activeCourse = allCourses.find(x => x.id === id);
    if (!activeCourse) return;

    // textContent is safe on its own — escaping here would show "&amp;" literally
    document.getElementById('detail-course-name').textContent = activeCourse.name;
    document.getElementById('detail-course-code').textContent =
        `${activeCourse.code} · ${activeCourse.instructor} · ${activeCourse.semester}`;

    // Reset tabs
    const buttons = document.querySelectorAll('#modal-details .tab-btn');
    const panels  = document.querySelectorAll('#modal-details .tab-panel');
    buttons.forEach((b, i) => b.classList.toggle('active', i === 0));
    panels.forEach((p, i)  => p.classList.toggle('active', i === 0));

    document.getElementById('detail-task-filter').value = 'all';
    document.getElementById('detail-task-sort').value   = 'due_date';
    document.getElementById('detail-res-filter').value  = 'all';

    renderDetailTasks();
    renderDetailResources();
    openModal('modal-details');
}

/*  TASKS IN DETAIL  */

function renderDetailTasks() {
    if (!activeCourse) return;

    const filter = document.getElementById('detail-task-filter').value;
    const sort   = document.getElementById('detail-task-sort').value;

    let tasks = allTasks.filter(t => t.course_id === activeCourse.id);

    tasks = tasks.filter(t => {
        if (filter === 'pending')   return !t.is_completed;
        if (filter === 'completed') return t.is_completed;
        if (filter === 'overdue')   return isOverdue(t);
        if (filter === 'today')     return daysUntil(t.due_date) === 0;
        return true;
    });

    tasks.sort((a, b) => {
        if (sort === 'due_date') return parseDate(a.due_date) - parseDate(b.due_date);
        if (sort === 'priority') return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
        if (sort === 'title')    return a.title.localeCompare(b.title);
        return 0;
    });

    const el = document.getElementById('detail-tasks-list');

    if (tasks.length === 0) {
        el.innerHTML = `<div class="empty-state" style="padding:40px 20px"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:36px;height:36px"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg><h4>No tasks match</h4></div>`;
        return;
    }

    el.innerHTML = tasks.map((t, i) => {
        const overdue = isOverdue(t);
        const pb      = PRIORITY_BADGE[t.priority] || 'badge-gray';
        const isLast  = i === tasks.length - 1;

        return `
            <div class="task-row" style="${isLast ? '' : 'border-bottom:1px solid var(--border);'}">
                <input type="checkbox" ${t.is_completed ? 'checked' : ''}
                    onchange="toggleDetailTask(${t.id}, this.checked)"
                    class="task-checkbox"/>
                <div class="task-info">
                    <div class="task-title ${t.is_completed ? 'strike' : ''}">${escapeHtml(t.title)}</div>
                    <div class="task-meta text-sm text-muted">
                        ${t.type} · Due ${formatDate(t.due_date)}
                        ${overdue ? '<span class="text-danger"> (Overdue)</span>' : ''}
                        ${attachmentLink(t)}
                    </div>
                </div>
                <span class="badge ${pb}">${t.priority}</span>
                <button class="btn btn-ghost btn-sm" onclick="openEditTaskModal(${t.id})">Edit</button>
                <button class="btn btn-ghost btn-sm text-danger" onclick="deleteDetailTask(${t.id})">✕</button>
            </div>`;
    }).join('');
}

async function toggleDetailTask(id, checked) {
    try {
        const updated = await TasksAPI.toggle(id);
        allTasks = allTasks.map(t => t.id === id ? updated : t);
        renderDetailTasks();
        renderCourses();
    } catch (err) {
        showToast('Failed to update task.', 'error');
    }
}

async function deleteDetailTask(id) {
    try {
        await TasksAPI.remove(id);
        allTasks = allTasks.filter(t => t.id !== id);
        renderDetailTasks();
        renderCourses();
        showToast('Task deleted.');
    } catch (err) {
        showToast('Failed to delete task.', 'error');
    }
}

/*  TASK FORM  */

function openAddTaskModal() {
    document.getElementById('task-modal-title').textContent = 'Add Task';
    document.getElementById('t-edit-id').value              = '';
    document.getElementById('t-title').value                = '';
    document.getElementById('t-type').value                 = 'Assignment';
    document.getElementById('t-priority').value             = 'Medium';
    document.getElementById('t-due').value                  = new Date().toISOString().split('T')[0];
    document.getElementById('t-completed').checked          = false;
    resetTaskFileField();
    document.querySelectorAll('#modal-task .form-error').forEach(e => e.classList.remove('show'));
    document.querySelectorAll('#modal-task .form-control').forEach(e => e.style.borderColor = '');
    openModal('modal-task');
}

function openEditTaskModal(id) {
    const t = allTasks.find(x => x.id === id);
    if (!t) return;
    document.getElementById('task-modal-title').textContent = 'Edit Task';
    document.getElementById('t-edit-id').value              = t.id;
    document.getElementById('t-title').value                = t.title;
    document.getElementById('t-type').value                 = t.type;
    document.getElementById('t-priority').value             = t.priority;
    document.getElementById('t-due').value                  = t.due_date;
    document.getElementById('t-completed').checked          = t.is_completed;
    resetTaskFileField(t);
    openModal('modal-task');
}

async function saveTask() {
    const v1 = validateRequired('t-title', 'err-t-title');
    const v2 = validateRequired('t-due',   'err-t-due');
    if (!v1 || !v2) return;

    const data = {
        course_id:    activeCourse.id,
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
        Object.assign(data, await uploadTaskFileIfAny());
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
        renderDetailTasks();
        renderCourses();
    } catch (err) {
        showToast(err.message || 'Failed to save task.', 'error');
    } finally {
        setLoading(btn, false);
    }
}

/*  RESOURCES  */

function bindResTypeChange() {
    const sel = document.getElementById('r-type');
    if (sel) sel.addEventListener('change', updateResValueLabel);
}

function updateResValueLabel() {
    const type   = document.getElementById('r-type').value;
    const isFile = type === 'File';

    document.getElementById('r-value-group').classList.toggle('hidden', isFile);
    document.getElementById('r-file-group').classList.toggle('hidden', !isFile);

    if (!isFile) {
        const labels       = { Note: 'Note Content *',  Link: 'URL *' };
        const placeholders = { Note: 'Write your note…', Link: 'https://…' };
        document.getElementById('r-value-label').textContent = labels[type];
        document.getElementById('r-value').placeholder       = placeholders[type];
        document.getElementById('r-value').rows              = type === 'Note' ? 4 : 1;
    }
}

const RES_ICONS = {
    Note: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
    Link: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
    File: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>`,
};

function renderDetailResources() {
    if (!activeCourse) return;
    const filter    = document.getElementById('detail-res-filter').value;
    let resources   = allResources.filter(r => r.course_id === activeCourse.id);
    if (filter !== 'all') resources = resources.filter(r => r.type === filter);

    const el = document.getElementById('detail-resources-list');

    if (resources.length === 0) {
        el.innerHTML = `<div class="empty-state" style="padding:40px 20px"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:36px;height:36px"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg><h4>No resources match</h4></div>`;
        return;
    }

    el.innerHTML = resources.map((r, i) => {
        const icon     = RES_ICONS[r.type] || RES_ICONS.File;
        const isLast   = i === resources.length - 1;
        const isUpload = r.type === 'File' && (r.value.startsWith('/storage/') || r.value.startsWith('http'));
        let valDisp;
        if (r.type === 'Link') {
            valDisp = `<a href="${escapeHtml(r.value)}" target="_blank" class="text-sm" style="color:var(--blue)">${escapeHtml(r.value)}</a>`;
        } else if (isUpload) {
            valDisp = `<a href="${escapeHtml(r.value)}" target="_blank" class="text-sm" style="color:var(--blue)">Open file — ${escapeHtml(r.value.split('/').pop())}</a>`;
        } else {
            valDisp = `<span class="text-sm text-muted">${escapeHtml(r.value.length > 80 ? r.value.slice(0,80)+'…' : r.value)}</span>`;
        }

        return `
            <div class="resource-row" style="${isLast ? '' : 'border-bottom:1px solid var(--border);'}">
                <div class="resource-icon">${icon}</div>
                <div class="resource-info">
                    <div class="resource-title">${escapeHtml(r.title)}</div>
                    <div class="mt-1">${valDisp}</div>
                </div>
                <span class="badge badge-gray">${r.type}</span>
                <button class="btn btn-ghost btn-sm" onclick="openEditResourceModal(${r.id})">Edit</button>
                <button class="btn btn-ghost btn-sm text-danger" onclick="deleteResource(${r.id})">✕</button>
            </div>`;
    }).join('');
}

function openAddResourceModal() {
    document.getElementById('res-modal-title').textContent = 'Add Resource';
    document.getElementById('r-edit-id').value             = '';
    document.getElementById('r-title').value               = '';
    document.getElementById('r-type').value                = 'Note';
    document.getElementById('r-value').value               = '';
    document.getElementById('r-file').value                = '';
    document.getElementById('r-file-current').textContent  = '';
    document.querySelectorAll('#modal-resource .form-error').forEach(e => e.classList.remove('show'));
    document.querySelectorAll('#modal-resource .form-control').forEach(e => e.style.borderColor = '');
    updateResValueLabel();
    openModal('modal-resource');
}

function openEditResourceModal(id) {
    const r = allResources.find(x => x.id === id);
    if (!r) return;
    document.getElementById('res-modal-title').textContent = 'Edit Resource';
    document.getElementById('r-edit-id').value             = r.id;
    document.getElementById('r-title').value               = r.title;
    document.getElementById('r-type').value                = r.type;
    document.getElementById('r-value').value               = r.value;
    document.getElementById('r-file').value                = '';
    document.getElementById('r-file-current').textContent  = r.type === 'File'
        ? 'Current: ' + r.value.split('/').pop() : '';
    updateResValueLabel();
    openModal('modal-resource');
}

async function saveResource() {
    const type = document.getElementById('r-type').value;

    const v1 = validateRequired('r-title', 'err-r-title');
    if (!v1) return;

    const btn = document.querySelector('#modal-resource .btn-primary');
    let value;

    if (type === 'File') {
        const fileInput = document.getElementById('r-file');
        const existing  = document.getElementById('r-value').value.trim();

        if (!fileInput.files[0] && !existing) {
            document.getElementById('err-r-file').classList.add('show');
            return;
        }
        document.getElementById('err-r-file').classList.remove('show');

        if (fileInput.files[0]) {
            setLoading(btn, true, 'Uploading…');
            try {
                const up = await UploadsAPI.send(fileInput.files[0]);
                value = up.url;
            } catch (err) {
                showToast(err.message || 'Upload failed.', 'error');
                setLoading(btn, false);
                return;
            }
        } else {
            value = existing; // editing without replacing the file
        }
    } else {
        const v2 = validateRequired('r-value', 'err-r-value');
        if (!v2) return;
        value = document.getElementById('r-value').value.trim();
    }

    const data = {
        course_id: activeCourse.id,
        title:     document.getElementById('r-title').value.trim(),
        type:      type,
        value:     value,
    };

    const editId = document.getElementById('r-edit-id').value;
    setLoading(btn, true, 'Saving…');

    try {
        if (editId) {
            const updated = await ResourcesAPI.update(editId, data);
            allResources = allResources.map(r => r.id === parseInt(editId) ? updated : r);
            showToast('Resource updated.', 'success');
        } else {
            const created = await ResourcesAPI.create(data);
            allResources.push(created);
            showToast('Resource added.', 'success');
        }
        closeModal('modal-resource');
        renderDetailResources();
    } catch (err) {
        showToast(err.message || 'Failed to save resource.', 'error');
    } finally {
        setLoading(btn, false);
    }
}

async function deleteResource(id) {
    try {
        await ResourcesAPI.remove(id);
        allResources = allResources.filter(r => r.id !== id);
        renderDetailResources();
        showToast('Resource deleted.');
    } catch (err) {
        showToast('Failed to delete resource.', 'error');
    }
}

/*  SKELETON  */

function showGridSkeleton() {
    document.getElementById('courses-grid').innerHTML = skeletonCards(6);
}
