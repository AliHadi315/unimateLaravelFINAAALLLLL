

document.addEventListener('DOMContentLoaded', () => {
    // Redirect if already logged in
    if (getToken()) {
        window.location.replace('/dashboard');
        return;
    }

    initPasswordToggle('toggle-pw', 'password', 'eye-icon');

    document.getElementById('login-form').addEventListener('submit', handleLogin);
});

/* ] PASSWORD TOGGLE  */

function initPasswordToggle(btnId, inputId, iconId) {
    const btn   = document.getElementById(btnId);
    const input = document.getElementById(inputId);
    const icon  = document.getElementById(iconId);

    if (!btn || !input) return;

    const eyeOpen = `
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
        <circle cx="12" cy="12" r="3"/>`;

    const eyeSlash = `
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
        <line x1="1" y1="1" x2="23" y2="23"/>`;

    btn.addEventListener('click', () => {
        const hidden    = input.type === 'password';
        input.type      = hidden ? 'text' : 'password';
        icon.innerHTML  = hidden ? eyeSlash : eyeOpen;
    });
}

/*  LOGIN HANDLER  */

async function handleLogin(e) {
    e.preventDefault();

    const alertEl  = document.getElementById('alert-error');
    const btn      = document.getElementById('submit-btn');
    const uidInput = document.getElementById('university-id');
    const pwInput  = document.getElementById('password');

    // Clear previous errors
    alertEl.classList.remove('show');

    // Frontend validation
    const v1 = validateRequired('university-id', 'err-uid');
    const v2 = validateRequired('password',      'err-pw');
    if (!v1 || !v2) return;

    setLoading(btn, true, 'Signing in…');

    try {
        await Auth.login(uidInput.value.trim(), pwInput.value);
        window.location.replace('/dashboard');

    } catch (err) {
        alertEl.textContent = err.message || 'Login failed. Please try again.';
        alertEl.classList.add('show');
        setLoading(btn, false);
    }
}
