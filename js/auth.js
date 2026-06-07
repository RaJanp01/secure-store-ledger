// --- SECURE USER AUTHENTICATION MODULE ---
async function handleLogin(e) {
    e.preventDefault();
    const btn = document.getElementById('login-btn');
    btn.innerText = "Authenticating...";
    btn.disabled = true;

    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    const { data, error } = await supabaseLocal.auth.signInWithPassword({ email, password });
    btn.disabled = false;
    btn.innerText = "Access Ledger";

    if (error) {
        alert("❌ Login Failed: " + error.message);
    } else {
        document.getElementById('screen-login').classList.add('hidden');
        document.getElementById('main-app').classList.remove('hidden');
        document.getElementById('main-app').classList.add('flex');
        changeTab('dashboard');
    }
}

async function handleLogout() {
    await supabaseLocal.auth.signOut();
    document.getElementById('main-app').classList.remove('flex');
    document.getElementById('main-app').classList.add('hidden');
    document.getElementById('screen-login').classList.remove('hidden');
    document.getElementById('login-form').reset();
}