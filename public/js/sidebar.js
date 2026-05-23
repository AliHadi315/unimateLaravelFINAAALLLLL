/* ============================================================
   sidebar.js — Renders the shared sidebar navigation
   ============================================================ */

function renderSidebar(activePage) {
    const navItems = [
        { href: '/dashboard',  label: 'Dashboard',     icon: iconGrid() },
        { href: '/courses',    label: 'My Courses',    icon: iconBook() },
        { href: '/tasks',      label: 'Tasks & Exams', icon: iconTask() },
        { href: '/statistics', label: 'Statistics',    icon: iconChart() },
        { href: '/ai',         label: 'AI Assistant',  icon: iconAI() },
    ];

    const navHTML = navItems.map(item => {
        const isActive = window.location.pathname === item.href ? ' active' : '';
        return `<a href="${item.href}" class="nav-item${isActive}">${item.icon}<span>${item.label}</span></a>`;
    }).join('');

    const html = `
        <div class="sidebar-logo">
            <div class="logo-icon">UM</div>
            <span class="logo-text">UniMate</span>
        </div>
        <nav class="sidebar-nav">
            <div class="nav-section-label">Menu</div>
            ${navHTML}
        </nav>
        <div class="sidebar-footer">
            <div class="sidebar-user" onclick="logout()">
                <div class="avatar" id="sidebar-avatar">U</div>
                <div class="avatar-info">
                    <div class="avatar-name" id="sidebar-user-name">Student</div>
                    <div class="avatar-role" id="sidebar-user-role">University</div>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
                    fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                    stroke-linejoin="round" style="color:var(--text-3);flex-shrink:0">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                    <polyline points="16 17 21 12 16 7"/>
                    <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
            </div>
        </div>`;

    const el = document.getElementById('sidebar');
    if (el) { el.innerHTML = html; populateSidebarUser(); }
}

function iconGrid() {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`;
}
function iconBook() {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`;
}
function iconTask() {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`;
}
function iconChart() {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`;
}
function iconAI() {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;
}
