

/*  STATE  */

let contacts       = [];
let activeContact  = null;
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

    await loadContacts();

    // Light polling keeps the conversation fresh without websockets
    pollTimer = setInterval(async () => {
        await loadContacts(true);
        if (activeContact) await loadConversation(activeContact.id, true);
    }, 5000);
});

window.addEventListener('beforeunload', () => clearInterval(pollTimer));

function toggleContactsPanel() {
    document.getElementById('contacts-panel').classList.toggle('open');
}

/*  CONTACTS  */

async function loadContacts(silent) {
    try {
        contacts = await MessagesAPI.contacts();
        renderContacts();
    } catch (err) {
        if (!silent) showToast('Failed to load classmates.', 'error');
    }
}

function renderContacts() {
    const el = document.getElementById('contacts-list');

    if (contacts.length === 0) {
        el.innerHTML = `
            <div class="text-sm text-muted" style="padding:14px;text-align:center;line-height:1.6">
                No classmates yet.<br/>
                You'll see students here once someone at your university adds a course with the same code as yours.
            </div>`;
        return;
    }

    el.innerHTML = contacts.map(c => {
        const active  = activeContact && c.id === activeContact.id ? ' active' : '';
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

/*  CONVERSATION  */

async function openConversation(id) {
    activeContact = contacts.find(c => c.id === id);
    if (!activeContact) return;

    document.getElementById('chat-with').textContent =
        `${activeContact.fullName} · ${activeContact.sharedCodes.join(', ')}`;
    document.getElementById('msg-input-bar').classList.remove('hidden');
    document.getElementById('contacts-panel').classList.remove('open');

    await loadConversation(id);
    renderContacts(); // clears the unread badge
    document.getElementById('msg-input').focus();
}

async function loadConversation(id, silent) {
    try {
        const fresh   = await MessagesAPI.conversation(id);
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

    container.querySelectorAll('.bubble-row').forEach(el => el.remove());

    if (conversation.length === 0) {
        emptyEl.style.display = '';
        document.getElementById('chat-empty-hint').textContent =
            `Say hi to ${activeContact.fullName} — you both take ${activeContact.sharedCodes.join(', ')}.`;
        return;
    }

    emptyEl.style.display = 'none';

    conversation.forEach(m => {
        const mine = m.sender_id === myId;
        const time = new Date(m.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        const row  = document.createElement('div');
        row.className = `bubble-row ${mine ? 'user' : 'ai'}`;
        row.innerHTML = `
            <div>
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
    if (!text || !activeContact || sendingMessage) return;

    sendingMessage = true;
    document.getElementById('msg-send-btn').disabled = true;

    try {
        const sent = await MessagesAPI.send(activeContact.id, text);
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
