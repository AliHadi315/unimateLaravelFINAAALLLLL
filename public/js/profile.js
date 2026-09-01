

document.addEventListener('DOMContentLoaded', async () => {
    if (!requireAuth()) return;
    renderSidebar('profile.html');

    fillForm(getUser());

    // Refresh from the server in case another device changed something
    try {
        const r = await Auth.me();
        if (r) fillForm(r.user);
    } catch (e) { /* cached copy already shown */ }

    document.getElementById('avatar-input').addEventListener('change', uploadAvatar);
});

function fillForm(user) {
    if (!user) return;
    document.getElementById('p-name').value    = user.fullName || '';
    document.getElementById('p-country').value = user.country || '';
    document.getElementById('p-uni').value     = user.universityName || '';
    document.getElementById('profile-uid').textContent = user.universityId || '—';
    setAvatar(document.getElementById('profile-avatar'), user);
}

/*  AVATAR UPLOAD  */

async function uploadAvatar(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
        showToast('Image must be under 2 MB.', 'error');
        return;
    }

    try {
        const r = await ProfileAPI.avatar(file);
        saveUser(r.user);
        fillForm(r.user);
        populateSidebarUser();
        showToast('Profile picture updated.', 'success');
    } catch (err) {
        showToast(err.message || 'Failed to upload picture.', 'error');
    } finally {
        e.target.value = '';
    }
}

/*  SAVE PROFILE  */

async function saveProfile() {
    const errBox = document.getElementById('profile-error');
    errBox.classList.remove('show');

    const v1 = validateRequired('p-name',    'err-p-name');
    const v2 = validateRequired('p-country', 'err-p-country');
    const v3 = validateRequired('p-uni',     'err-p-uni');
    if (!v1 || !v2 || !v3) return;

    const newPw     = document.getElementById('p-new-pw').value;
    const confirmPw = document.getElementById('p-confirm-pw').value;

    if (newPw && newPw.length < 6) {
        document.getElementById('err-p-pw').classList.add('show');
        return;
    }
    document.getElementById('err-p-pw').classList.remove('show');

    if (newPw !== confirmPw) {
        document.getElementById('err-p-cpw').classList.add('show');
        return;
    }
    document.getElementById('err-p-cpw').classList.remove('show');

    const data = {
        full_name:       document.getElementById('p-name').value.trim(),
        country:         document.getElementById('p-country').value.trim(),
        university_name: document.getElementById('p-uni').value.trim(),
    };

    if (newPw) {
        data.current_password      = document.getElementById('p-current-pw').value;
        data.password              = newPw;
        data.password_confirmation = confirmPw;
    }

    const btn = document.getElementById('save-profile-btn');
    setLoading(btn, true, 'Saving…');

    try {
        const r = await ProfileAPI.update(data);
        saveUser(r.user);
        fillForm(r.user);
        populateSidebarUser();
        ['p-current-pw', 'p-new-pw', 'p-confirm-pw'].forEach(id => document.getElementById(id).value = '');
        showToast('Profile saved.', 'success');
    } catch (err) {
        errBox.textContent = err.message || 'Failed to save profile.';
        errBox.classList.add('show');
    } finally {
        setLoading(btn, false);
    }
}
