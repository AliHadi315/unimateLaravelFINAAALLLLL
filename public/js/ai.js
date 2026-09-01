

/*  STATE  */

let messages         = [];
let sessions         = [];
let isLoading        = false;
let activeSessionId  = null;
let cachedTasks      = [];
let cachedCourses    = [];
let aiEnabled        = false; // true when the server has an Anthropic API key configured
let attachedFile     = null;  // {name, content} — a text file to include with the next message

/*  INIT  */

document.addEventListener('DOMContentLoaded', async () => {
    if (!requireAuth()) return;
    renderSidebar('ai.html');

    document.getElementById('chat-input').addEventListener('keydown', handleKey);
    document.getElementById('chat-input').addEventListener('input', function () {
        autoResize(this);
    });
    document.getElementById('ai-file-input').addEventListener('change', handleAiFile);

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

    // Check whether the backend has a real AI configured
    try {
        const s = await AiAPI.status();
        aiEnabled = !!(s && s.enabled);
    } catch (e) { aiEnabled = false; }
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

/*  FILE ATTACHMENT  */

async function handleAiFile(e) {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;

    if (file.size > 200 * 1024) {
        showToast('File too large — 200 KB max.', 'error');
        return;
    }

    try {
        const content = await file.text();
        attachedFile = { name: file.name, content: content.slice(0, 8000) };
        document.getElementById('attach-name').textContent = file.name;
        document.getElementById('attach-bar').classList.remove('hidden');
    } catch (err) {
        showToast('Could not read that file.', 'error');
    }
}

function clearAiAttachment() {
    attachedFile = null;
    document.getElementById('attach-bar').classList.add('hidden');
}

// What the AI actually receives for a message (includes any attached file text)
function messageForModel(m) {
    if (!m.attachment) return m.content;
    return m.content + '\n\n[Attached file: ' + m.attachment.name + ']\n' + m.attachment.content;
}

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

async function sendMessage() {
    const input = document.getElementById('chat-input');
    const text  = input.value.trim();
    if ((!text && !attachedFile) || isLoading) return;

    messages.push({
        role:       'user',
        content:    text || 'Please take a look at the attached file.',
        time:       new Date().toISOString(),
        attachment: attachedFile || undefined,
    });
    clearAiAttachment();
    input.value = '';
    input.style.height = 'auto';

    renderMessages();
    scrollToBottom();

    isLoading = true;
    document.getElementById('send-btn').disabled = true;
    showTypingIndicator();

    let response = null;

    // Real AI when the server has an API key; otherwise the built-in responder
    if (aiEnabled) {
        try {
            const history = messages.slice(-20).map(m => ({ role: m.role, content: messageForModel(m) }));
            const r = await AiAPI.chat(history);
            response = r && r.reply;
        } catch (e) {
            response = null; // fall back below
        }
    }

    if (!response) {
        await new Promise(res => setTimeout(res, 700 + Math.random() * 1000));
        const lastMsg = messages[messages.length - 1];
        response = (lastMsg.attachment && !aiEnabled)
            ? `I can see you attached "${lastMsg.attachment.name}", but reading files needs the full AI, which isn't set up on this server yet. I can still help with your tasks, deadlines, and study planning!`
            : generateResponse(text);
    }

    hideTypingIndicator();
    messages.push({ role: 'ai', content: response, time: new Date().toISOString() });
    isLoading = false;
    document.getElementById('send-btn').disabled = false;
    renderMessages();
    scrollToBottom();
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

        const attachChip = m.attachment
            ? `<div class="bubble-attach"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>${escapeHtml(m.attachment.name)}</div>`
            : '';

        row.innerHTML = isUser
            ? `<div>
                <div class="bubble user">${attachChip}${escapeHtml(m.content).replace(/\n/g,'<br/>')}</div>
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
