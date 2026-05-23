/* ============================================================
   register.js
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
    if (getToken()) {
        window.location.href = 'dashboard.html';
        return;
    }

    initPasswordToggle();
    initStrengthMeter();

    document.getElementById('register-form').addEventListener('submit', handleRegister);
});

/* ── PASSWORD TOGGLE ─────────────────────────────────────── */

function initPasswordToggle() {
    const btn   = document.getElementById('toggle-pw');
    const input = document.getElementById('password');
    const icon  = document.getElementById('eye-icon');
    if (!btn) return;

    const eyeOpen = `
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
        <circle cx="12" cy="12" r="3"/>`;

    const eyeSlash = `
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
        <line x1="1" y1="1" x2="23" y2="23"/>`;

    btn.addEventListener('click', () => {
        const hidden   = input.type === 'password';
        input.type     = hidden ? 'text' : 'password';
        icon.innerHTML = hidden ? eyeSlash : eyeOpen;
    });
}

/* ── STRENGTH METER ──────────────────────────────────────── */

function initStrengthMeter() {
    const input = document.getElementById('password');
    const bar   = document.getElementById('pw-bar');
    if (!input || !bar) return;

    input.addEventListener('input', () => {
        const v = input.value;
        let s = 0;
        if (v.length >= 6)          s++;
        if (v.length >= 10)         s++;
        if (/[A-Z]/.test(v))        s++;
        if (/[0-9]/.test(v))        s++;
        if (/[^A-Za-z0-9]/.test(v)) s++;

        const colors = ['', '#ef4444', '#f59e0b', '#f59e0b', '#22c55e', '#16a34a'];
        const widths = ['0%', '20%', '40%', '60%', '80%', '100%'];
        bar.style.width      = widths[s];
        bar.style.background = colors[s];
    });
}

/* ── REGISTER HANDLER ────────────────────────────────────── */

async function handleRegister(e) {
    e.preventDefault();

    const alertEl = document.getElementById('alert-error');
    const btn     = document.getElementById('submit-btn');
    const pwInput = document.getElementById('password');
    const cpwInput= document.getElementById('confirm-pw');

    alertEl.classList.remove('show');

    // Frontend validation
    const fields = [
        ['full-name', 'err-name'],
        ['country',   'err-country'],
        ['uni-name',  'err-uni'],
        ['uni-id',    'err-uid'],
    ];

    let valid = fields.reduce((acc, [id, eid]) => validateRequired(id, eid) && acc, true);

    if (pwInput.value.length < 6) {
        document.getElementById('password').style.borderColor = 'var(--red)';
        document.getElementById('err-pw').classList.add('show');
        valid = false;
    } else {
        document.getElementById('err-pw').classList.remove('show');
        document.getElementById('password').style.borderColor = '';
    }

    if (pwInput.value !== cpwInput.value) {
        cpwInput.style.borderColor = 'var(--red)';
        document.getElementById('err-cpw').classList.add('show');
        valid = false;
    } else {
        cpwInput.style.borderColor = '';
        document.getElementById('err-cpw').classList.remove('show');
    }

    if (!valid) return;

    setLoading(btn, true, 'Creating account…');

    try {
        await Auth.register({
            full_name:              document.getElementById('full-name').value.trim(),
            country:                document.getElementById('country').value.trim(),
            university_name:        document.getElementById('uni-name').value.trim(),
            university_id:          document.getElementById('uni-id').value.trim(),
            password:               pwInput.value,
            password_confirmation:  cpwInput.value,
        });
        window.location.href = 'dashboard.html';

    } catch (err) {
        alertEl.textContent = err.message || 'Registration failed. Please try again.';
        alertEl.classList.add('show');
        setLoading(btn, false);
    }
}
