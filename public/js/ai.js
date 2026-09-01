

/*  STATE  */

let messages         = [];
let sessions         = [];
let isLoading        = false;
let activeSessionId  = null;
let cachedTasks      = [];
let cachedCourses    = [];

/*  INIT  */

document.addEventListener('DOMContentLoaded', async () => {
    if (!requireAuth()) return;
    renderSidebar('ai.html');

    document.getElementById('chat-input').addEventListener('keydown', handleKey);
    document.getElementById('chat-input').addEventListener('input', function () {
        autoResize(this);
    });

    // Load sessions and cache context data in parallel
    try {
        const [sessionList, tasks, courses] = await Promise.all([
            ChatAPI.list(),
            TasksAPI.list(),
            CoursesAPI.list(),
        ]);
        sessions       = sessionList;
        cachedTasks    = tasks;
        cachedCourses  = courses;
        renderSessionsList();
    } catch (err) {
        showToast('Failed to load data.', 'error');
    }
});

/*  SESSIONS  */

function renderSessionsList() {
    const el = document.getElementById('sessions-list');

    if (sessions.length === 0) {
        el.innerHTML = `<div class="text-sm text-muted" style="padding:12px;text-align:center">No saved sessions</div>`;
        return;
    }

    el.innerHTML = sessions.map(s => {
        const preview = (s.messages?.[0]?.content || '').slice(0, 60);
        const active  = s.id === activeSessionId ? ' active' : '';
        return `
            <div class="session-item${active}" onclick="loadSession(${s.id})">
                <div style="display:flex;align-items:center;justify-content:space-between">
                    <div class="session-item-title">${escapeHtml(s.title)}</div>
                    <button onclick="event.stopPropagation();deleteSession(${s.id})"
                        style="background:none;border:none;cursor:pointer;color:var(--text-3);padding:2px;line-height:1"
                        title="Delete">✕</button>
                </div>
                <div class="session-item-preview">${escapeHtml(preview)}${preview.length >= 60 ? '…' : ''}</div>
            </div>`;
    }).join('');
}

function newSession() {
    messages        = [];
    activeSessionId = null;
    document.getElementById('session-label').textContent = 'New conversation';
    clearChatUI();
    renderSessionsList();
}

async function loadSession(id) {
    const s = sessions.find(x => x.id === id);
    if (!s) return;

    messages        = s.messages || [];
    activeSessionId = id;
    document.getElementById('session-label').textContent = s.title;

    clearChatUI();
    renderMessages();
    scrollToBottom();
    renderSessionsList();

    // Close the drawer after picking a session on mobile
    document.querySelector('.sessions-panel').classList.remove('open');
}

function clearChatUI() {
    const container = document.getElementById('chat-messages');
    container.innerHTML = '';
    const emptyEl = document.getElementById('chat-empty');
    emptyEl.style.display = messages.length === 0 ? '' : 'none';
    container.appendChild(emptyEl);
}

/*  SEND MESSAGE  */

function askQuick(text) {
    document.getElementById('chat-input').value = text;
    sendMessage();
}

function toggleSessionsPanel() {
    document.querySelector('.sessions-panel').classList.toggle('open');
}

function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
}

function autoResize(el) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 140) + 'px';
}

function sendMessage() {
    const input = document.getElementById('chat-input');
    const text  = input.value.trim();
    if (!text || isLoading) return;

    messages.push({ role: 'user', content: text, time: new Date().toISOString() });
    input.value = '';
    input.style.height = 'auto';

    renderMessages();
    scrollToBottom();

    isLoading = true;
    document.getElementById('send-btn').disabled = true;
    showTypingIndicator();

    const delay = 700 + Math.random() * 1000;
    setTimeout(() => {
        const response = generateResponse(text);
        hideTypingIndicator();
        messages.push({ role: 'ai', content: response, time: new Date().toISOString() });
        isLoading = false;
        document.getElementById('send-btn').disabled = false;
        renderMessages();
        scrollToBottom();
    }, delay);
}

/*  AI RESPONSE  */

function courseCode(courseId) {
    const c = cachedCourses.find(x => x.id === courseId);
    return c ? c.code : null;
}

function taskLine(t) {
    const code = courseCode(t.course_id);
    const days = daysUntil(t.due_date);
    let when;
    if (days < 0)       when = `${Math.abs(days)} day(s) overdue`;
    else if (days === 0) when = 'due today';
    else if (days === 1) when = 'due tomorrow';
    else                when = `due ${formatDate(t.due_date)}`;
    return `• ${t.title}${code ? ' — ' + code : ''} (${when})`;
}

function generateResponse(text) {
    const q       = text.toLowerCase();
    const tasks   = cachedTasks;
    const courses = cachedCourses;
    const pending = tasks.filter(t => !t.is_completed);

    if (q.includes('overdue') || q.includes('late')) {
        const overdue = pending.filter(isOverdue);
        if (overdue.length === 0) return 'Great news — you have no overdue tasks! Keep it up.';
        return `You have ${overdue.length} overdue task(s):\n\n` +
            overdue.slice(0, 5).map(taskLine).join('\n') +
            '\n\nI recommend addressing these first.';
    }

    if (q.includes('today')) {
        const today = pending.filter(t => daysUntil(t.due_date) === 0);
        if (today.length === 0) return 'Nothing is due today. Good time to get ahead on upcoming work!';
        return `Due today:\n\n${today.map(taskLine).join('\n')}`;
    }

    if (q.includes('this week') || q.includes('week')) {
        const week = pending.filter(t => { const d = daysUntil(t.due_date); return d >= 0 && d <= 7; })
            .sort((a, b) => parseDate(a.due_date) - parseDate(b.due_date));
        if (week.length === 0) return 'You have nothing due in the next 7 days. Nice!';
        return `Coming up in the next 7 days:\n\n${week.slice(0, 7).map(taskLine).join('\n')}`;
    }

    if (q.includes('next') || q.includes('what should i') || q.includes('prioritize') || q.includes('priority')) {
        if (pending.length === 0) return 'Nothing pending — you\'re all caught up! 🎉';
        const rank = { High: 0, Medium: 1, Low: 2 };
        const next = [...pending].sort((a, b) =>
            (parseDate(a.due_date) - parseDate(b.due_date)) || (rank[a.priority] - rank[b.priority]))[0];
        return `I'd start with:\n\n${taskLine(next)}\n\nIt's your nearest deadline` +
            (next.priority === 'High' ? ' and marked High priority.' : '.');
    }

    if (q.includes('exam')) {
        const exams = pending.filter(t => t.type === 'Exam')
            .sort((a, b) => parseDate(a.due_date) - parseDate(b.due_date));
        if (exams.length === 0) return 'No upcoming exams on your list. If one is coming, add it from the Tasks page.';
        return `You have ${exams.length} exam(s) ahead:\n\n${exams.slice(0, 5).map(taskLine).join('\n')}` +
            '\n\nTip: start reviewing at least a week early with active recall.';
    }

    if (q.includes('progress') || q.includes('how am i doing')) {
        const done  = tasks.filter(t => t.is_completed).length;
        const total = tasks.length;
        const pct   = total ? Math.round(done / total * 100) : 0;
        if (total === 0) return "You haven't added any tasks yet. Start from the Courses page!";
        return `You've completed ${done} of ${total} tasks — ${pct}%. ${
            pct >= 70 ? 'Excellent work! 🎉' : pct >= 40 ? 'Good progress! Keep going.' : "Let's keep the momentum going!"
        }`;
    }

    if (q.includes('course')) {
        if (courses.length === 0) return "You haven't added any courses yet. Head to the Courses page!";
        const lines = courses.map(c => {
            const p = pending.filter(t => t.course_id === c.id).length;
            return `• ${c.code} — ${c.name} (${p} pending)`;
        });
        return `You have ${courses.length} course(s):\n\n${lines.join('\n')}`;
    }

    if (q.includes('task') || q.includes('assignment')) {
        return `You have ${tasks.length} task(s) total, with ${pending.length} still pending.`;
    }

    if (q.includes('study tip') || q.includes('how to study') || q.includes('focus')) {
        return 'Here are some effective study strategies:\n\n' +
            '• Pomodoro: 25 min focus, 5 min break.\n' +
            '• Active Recall: Test yourself instead of re-reading.\n' +
            '• Spaced Repetition: Review at increasing intervals.\n' +
            '• Teach it: Explain topics aloud to solidify understanding.';
    }

    if (q.includes('hello') || q.includes('hi') || q.includes('hey')) {
        const user = getUser();
        return `Hello, ${(user?.fullName || 'there').split(' ')[0]}! I'm your UniMate AI assistant. How can I help you today?`;
    }

    const defaults = [
        'Could you give me more context so I can help better?',
        "I'd be happy to help. What course or topic is this about?",
        'Try asking things like "what\'s due this week", "any overdue tasks", "what should I do next", or "study tips".',
    ];
    return defaults[Math.floor(Math.random() * defaults.length)];
}

/*  RENDER MESSAGES  */

function renderMessages() {
    const container = document.getElementById('chat-messages');
    const emptyEl   = document.getElementById('chat-empty');

    if (messages.length === 0) {
        emptyEl.style.display = '';
        return;
    }

    emptyEl.style.display = 'none';
    container.querySelectorAll('.bubble-row:not(#typing-row)').forEach(el => el.remove());

    const typingRow = document.getElementById('typing-row');

    messages.forEach((m, i) => {
        if (document.getElementById('msg-' + i)) return;

        const isUser  = m.role === 'user';
        const row     = document.createElement('div');
        row.id        = 'msg-' + i;
        row.className = `bubble-row ${isUser ? 'user' : 'ai'}`;

        const timeStr = m.time
            ? new Date(m.time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
            : '';

        row.innerHTML = isUser
            ? `<div>
                <div class="bubble user">${escapeHtml(m.content).replace(/\n/g,'<br/>')}</div>
                <div class="bubble-time">${timeStr}</div>
               </div>`
            : `<div class="ai-avatar">AI</div>
               <div>
                <div class="bubble ai">${escapeHtml(m.content).replace(/\n/g,'<br/>')}</div>
                <div class="bubble-time">${timeStr}</div>
               </div>`;

        if (typingRow) container.insertBefore(row, typingRow);
        else container.appendChild(row);
    });
}

function showTypingIndicator() {
    const container = document.getElementById('chat-messages');
    const row = document.createElement('div');
    row.id    = 'typing-row';
    row.className = 'bubble-row ai';
    row.innerHTML = `
        <div class="ai-avatar">AI</div>
        <div class="typing-indicator">
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
        </div>`;
    container.appendChild(row);
    scrollToBottom();
}

function hideTypingIndicator() {
    const t = document.getElementById('typing-row');
    if (t) t.remove();
}

function scrollToBottom() {
    const el = document.getElementById('chat-messages');
    setTimeout(() => { el.scrollTop = el.scrollHeight; }, 50);
}

/*  SAVE / DELETE SESSIONS  */

function saveSession() {
    if (messages.length === 0) { showToast('No messages to save.', 'error'); return; }
    openModal('modal-save');
    document.getElementById('session-title-input').value = '';
}

async function confirmSave() {
    const title = document.getElementById('session-title-input').value.trim()
        || `Chat ${sessions.length + 1}`;

    const btn = document.querySelector('#modal-save .btn-primary');
    setLoading(btn, true, 'Saving…');

    try {
        if (activeSessionId) {
            const updated = await ChatAPI.update(activeSessionId, { title, messages });
            sessions = sessions.map(s => s.id === activeSessionId ? updated : s);
        } else {
            const created = await ChatAPI.create({ title, messages });
            sessions.unshift(created);
            activeSessionId = created.id;
        }
        document.getElementById('session-label').textContent = title;
        closeModal('modal-save');
        renderSessionsList();
        showToast('Session saved.', 'success');
    } catch (err) {
        showToast('Failed to save session.', 'error');
    } finally {
        setLoading(btn, false);
    }
}

async function deleteSession(id) {
    try {
        await ChatAPI.remove(id);
        sessions = sessions.filter(s => s.id !== id);
        if (activeSessionId === id) newSession();
        renderSessionsList();
        showToast('Session deleted.');
    } catch (err) {
        showToast('Failed to delete session.', 'error');
    }
}

function confirmClear() {
    if (messages.length === 0) return;
    if (confirm('Clear all messages in the current chat?')) {
        newSession();
    }
}
