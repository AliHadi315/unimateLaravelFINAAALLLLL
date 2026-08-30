

/*  TOAST  */

function showToast(msg, type = 'default') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = 'toast' + (type !== 'default' ? ' ' + type : '');
    toast.textContent = msg;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

/*  SKELETON LOADERS  */

function skeletonStat() {
    return '<div class="skeleton skeleton-stat"></div>';
}

function skeletonRows(count = 3) {
    return Array.from({ length: count }, () =>
        '<div class="skeleton skeleton-row" style="margin-bottom:8px"></div>'
    ).join('');
}

function skeletonCards(count = 4) {
    return Array.from({ length: count }, () =>
        '<div class="skeleton skeleton-card"></div>'
    ).join('');
}

/*  MODAL  */

function openModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('open');
}

function closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('open');
}

/*  SIDEBAR TOGGLE  */

function initSidebar() {
    const ham     = document.getElementById('hamburger');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (!ham || !sidebar) return;

    ham.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        if (overlay) overlay.classList.toggle('open');
    });
    if (overlay) {
        overlay.addEventListener('click', () => {
            sidebar.classList.remove('open');
            overlay.classList.remove('open');
        });
    }
}

/*  TABS  */

function initTabs(containerSelector) {
    document.querySelectorAll(containerSelector || '.tab-container').forEach(container => {
        const buttons = container.querySelectorAll('.tab-btn');
        const panels  = container.querySelectorAll('.tab-panel');
        buttons.forEach((btn, i) => {
            btn.addEventListener('click', () => {
                buttons.forEach(b => b.classList.remove('active'));
                panels.forEach(p => p.classList.remove('active'));
                btn.classList.add('active');
                if (panels[i]) panels[i].classList.add('active');
            });
        });
    });
}

/*  FORM VALIDATION  */

function validateRequired(inputId, errorId) {
    const input = document.getElementById(inputId);
    const errEl = document.getElementById(errorId);
    const valid = input && input.value.trim() !== '';
    if (input) input.style.borderColor = valid ? '' : 'var(--red)';
    if (errEl) errEl.classList.toggle('show', !valid);
    return valid;
}

/*  ESCAPE HTML  */

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/*  DATE FORMAT  */

function formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/*  POPULATE SIDEBAR USER  */

function populateSidebarUser() {
    if (typeof getUser !== 'function') return;
    const user     = getUser();
    const nameEl   = document.getElementById('sidebar-user-name');
    const roleEl   = document.getElementById('sidebar-user-role');
    const avatarEl = document.getElementById('sidebar-avatar');
    if (!user) return;
    if (nameEl)   nameEl.textContent   = user.fullName || user.universityId;
    if (roleEl)   roleEl.textContent   = user.universityName || 'Student';
    if (avatarEl) avatarEl.textContent = (user.fullName || 'U')[0].toUpperCase();
}

/*  CLOSE MODAL ON OVERLAY / ESCAPE  */

document.addEventListener('click', e => {
    if (e.target.classList.contains('modal-overlay')) {
        e.target.classList.remove('open');
    }
});

document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.open')
            .forEach(m => m.classList.remove('open'));
    }
});

/*  INIT  */

document.addEventListener('DOMContentLoaded', () => {
    initSidebar();
    initTabs();
    populateSidebarUser();
});
