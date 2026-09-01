

/*  THEME  */

// Runs at script load so the page doesn't flash white before DOMContentLoaded
(function () {
    if (localStorage.getItem('um_theme') === 'dark') {
        document.documentElement.dataset.theme = 'dark';
    }
})();

function toggleTheme() {
    const dark = document.documentElement.dataset.theme === 'dark';
    if (dark) {
        delete document.documentElement.dataset.theme;
        localStorage.setItem('um_theme', 'light');
    } else {
        document.documentElement.dataset.theme = 'dark';
        localStorage.setItem('um_theme', 'dark');
    }
    document.querySelectorAll('.theme-toggle').forEach(updateThemeIcon);
}

function updateThemeIcon(btn) {
    const dark = document.documentElement.dataset.theme === 'dark';
    const moon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
    const sun  = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';
    const iconEl = btn.querySelector('.theme-toggle-icon');
    if (iconEl) iconEl.innerHTML = dark ? sun : moon;
    const labelEl = btn.querySelector('.theme-toggle-label');
    if (labelEl) labelEl.textContent = dark ? 'Light mode' : 'Dark mode';
}

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

/*  DATES  */

// Parse "YYYY-MM-DD" as *local* midnight. new Date("YYYY-MM-DD") would parse
// as UTC, which makes tasks due today look overdue in the afternoon.
function parseDate(dateStr) {
    if (!dateStr) return null;
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
}

function startOfToday() {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}

// Whole days between today and the due date (negative = overdue)
function daysUntil(dateStr) {
    const due = parseDate(dateStr);
    if (!due) return 0;
    return Math.round((due - startOfToday()) / 86400000);
}

function isOverdue(task) {
    return !task.is_completed && daysUntil(task.due_date) < 0;
}

function formatDate(dateStr) {
    const d = parseDate(dateStr);
    if (!d) return '—';
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
    document.querySelectorAll('.theme-toggle').forEach(updateThemeIcon);
});
