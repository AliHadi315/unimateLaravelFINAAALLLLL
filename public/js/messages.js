

/*  STATE  */

let groups         = []; // course group rooms
let contacts       = []; // direct-message classmates
let activeChat     = null; // {type:'group', code, title} | {type:'dm', id, title}
let conversation   = [];
let pollTimer      = null;
let sendingMessage = false;

/*  INIT  */

document.addEventListener('DOMContentLoaded', async () => {
    if (!requireAuth()) return;
    renderSidebar('messages.html');

    const input = document.getElementById('msg-input');
    input.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendChatMessage();
        }
    });
    input.addEventListener('input', function () {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 140) + 'px';
    });

    await loadPanel();

    // Light polling keeps rooms and the open conversation fresh
    pollTimer = setInterval(async () => {
        await loadPanel(true);
        if (activeChat) await loadConversation(true);
    }, 5000);
});

window.addEventListener('beforeunload', () => clearInterval(pollTimer));

function toggleContactsPanel() {
    document.getElementById('contacts-panel').classList.toggle('open');
}

/*  PANEL (groups + classmates)  */

async function loadPanel(silent) {
    try {
        const [g, c] = await Promise.all([GroupsAPI.list(), MessagesAPI.contacts()]);
        groups   = g;
        contacts = c;
        renderPanel();
    } catch (err) {
        if (!silent) showToast('Failed to load conversations.', 'error');
    }
}

function renderPanel() {
    const el = document.getElementById('contacts-list');
    let html = '';

    if (groups.length > 0) {
        html += `<div class="panel-section-label">Course groups</div>`;
        html += groups.map(g => {
            const active  = activeChat && activeChat.type === 'group' && activeChat.code === g.code ? ' active' : '';
            const preview = g.lastMessage
                ? escapeHtml(g.lastMessage.slice(0, 44))
                : `${g.members} member${g.members > 1 ? 's' : ''}`;
            return `
                <div class="session-item contact-item${active}" onclick="openGroup('${escapeHtml(g.code)}')">
                    <div class="avatar contact-avatar group-avatar">#</div>
                    <div class="contact-info">
                        <div class="session-item-title">${escapeHtml(g.code)} — ${escapeHtml(g.courseName)}</div>
                        <div class="session-item-preview">${preview}</div>
                    </div>
                    ${g.unread ? `<span class="unread-badge">${g.unread}</span>` : ''}
                </div>`;
        }).join('');
    }

    html += `<div class="panel-section-label">Classmates</div>`;

    if (contacts.length === 0) {
        html += `
            <div class="text-sm text-muted" style="padding:14px;text-align:center;line-height:1.6">
                No classmates yet.<br/>
                You'll see students here once someone at your university adds a course with the same code as yours.
            </div>`;
    } else {
        html += contacts.map(c => {
            const active  = activeChat && activeChat.type === 'dm' && c.id === activeChat.id ? ' active' : '';
            const avatar  = c.avatarUrl
                ? `<img src="${escapeHtml(c.avatarUrl)}" alt="" class="avatar-img"/>`
                : escapeHtml((c.fullName || 'S')[0].toUpperCase());
            const preview = c.lastMessage
                ? escapeHtml(c.lastMessage.slice(0, 44))
                : 'Shares ' + c.sharedCodes.map(escapeHtml).join(', ');
            return `
                <div class="session-item contact-item${active}" onclick="openConversation(${c.id})">
                    <div class="avatar contact-avatar">${avatar}</div>
                    <div class="contact-info">
                        <div class="session-item-title">${escapeHtml(c.fullName)}</div>
                        <div class="session-item-preview">${preview}</div>
                    </div>
                    ${c.unread ? `<span class="unread-badge">${c.unread}</span>` : ''}
                </div>`;
        }).join('');
    }

    el.innerHTML = html;
}

/*  OPENING CHATS  */

async function openGroup(code) {
    const g = groups.find(x => x.code === code);
    if (!g) return;

    activeChat   = { type: 'group', code: g.code, title: `${g.code} group` };
    conversation = [];
    document.getElementById('chat-with').textContent =
        `${g.code} — ${g.courseName} · ${g.members} member${g.members > 1 ? 's' : ''}`;
    startChat();
    await loadConversation();
    g.unread = 0;
    renderPanel();
}

async function openConversation(id) {
    const c = contacts.find(x => x.id === id);
    if (!c) return;

    activeChat   = { type: 'dm', id: c.id, title: c.fullName };
    conversation = [];
    document.getElementById('chat-with').textContent =
        `${c.fullName} · ${c.sharedCodes.join(', ')}`;
    startChat();
    await loadConversation();
    c.unread = 0;
    renderPanel();
}

function startChat() {
    document.getElementById('msg-input-bar').classList.remove('hidden');
    document.getElementById('contacts-panel').classList.remove('open');
    document.getElementById('msg-input').focus();
}

/*  CONVERSATION  */

async function loadConversation(silent) {
    if (!activeChat) return;
    const chat = activeChat;

    try {
        const fresh = chat.type === 'group'
            ? await GroupsAPI.messages(chat.code)
            : await MessagesAPI.conversation(chat.id);

        if (activeChat !== chat) return; // switched chats while loading

        const changed = fresh.length !== conversation.length;
        conversation  = fresh;
        if (!silent || changed) renderConversation(!silent || changed);
    } catch (err) {
        if (!silent) showToast('Failed to load conversation.', 'error');
    }
}

function renderConversation(scroll) {
    const container = document.getElementById('chat-messages');
    const emptyEl   = document.getElementById('chat-empty');
    const myId      = (getUser() || {}).id;
    const isGroup   = activeChat && activeChat.type === 'group';

    container.querySelectorAll('.bubble-row').forEach(el => el.remove());

    if (conversation.length === 0) {
        emptyEl.style.display = '';
        document.getElementById('chat-empty-hint').textContent = isGroup
            ? `No messages yet in the ${activeChat.code} group — start the conversation!`
            : `Say hi to ${activeChat.title}!`;
        return;
    }

    emptyEl.style.display = 'none';

    conversation.forEach(m => {
        const mine = m.sender_id === myId;
        const time = new Date(m.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        const name = isGroup && !mine
            ? `<div class="bubble-sender">${escapeHtml(m.senderName || 'Student')}</div>`
            : '';

        const row  = document.createElement('div');
        row.className = `bubble-row ${mine ? 'user' : 'ai'}`;
        row.innerHTML = `
            <div>
                ${name}
                <div class="bubble ${mine ? 'user' : 'ai'}">${escapeHtml(m.body)}</div>
                <div class="bubble-time">${time}</div>
            </div>`;
        container.appendChild(row);
    });

    if (scroll) container.scrollTop = container.scrollHeight;
}

/*  SEND  */

async function sendChatMessage() {
    const input = document.getElementById('msg-input');
    const text  = input.value.trim();
    if (!text || !activeChat || sendingMessage) return;

    sendingMessage = true;
    document.getElementById('msg-send-btn').disabled = true;

    try {
        const sent = activeChat.type === 'group'
            ? await GroupsAPI.send(activeChat.code, text)
            : await MessagesAPI.send(activeChat.id, text);
        conversation.push(sent);
        input.value = '';
        input.style.height = 'auto';
        renderConversation(true);
    } catch (err) {
        showToast(err.message || 'Failed to send message.', 'error');
    } finally {
        sendingMessage = false;
        document.getElementById('msg-send-btn').disabled = false;
        input.focus();
    }
}
