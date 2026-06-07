// --- GLOBAL CONFIGURATION AND BASE ENGINE ---
const SUPABASE_URL = "https://tokbeildnsylyvdumkln.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_GAsvoI7MCcjUOURbjlWqLg_5uJSOHpe";

window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
var supabaseLocal = window.supabaseClient;
let activeCustomerPhone = null;

// --- NAVIGATION MODULE ---
// Keep track of what subset of accounts we want to display
let currentDirectoryMode = 'debtors'; 

function changeTab(targetTab) {
    document.getElementById('view-dashboard').classList.add('hidden');
    document.getElementById('view-directory').classList.add('hidden');
    document.getElementById('view-profile').classList.add('hidden');
    
    document.getElementById('nav-dashboard').className = "flex flex-col items-center justify-center text-gray-400 font-medium transition-all";
    document.getElementById('nav-directory').className = "flex flex-col items-center justify-center text-gray-400 font-medium transition-all";
    document.getElementById('nav-settled').className = "flex flex-col items-center justify-center text-gray-400 font-medium transition-all";

    if (targetTab === 'dashboard') {
        document.getElementById('view-dashboard').classList.remove('hidden');
        document.getElementById('nav-dashboard').className = "flex flex-col items-center justify-center text-indigo-600 font-bold transition-all";
        calculateMetrics();
    } else if (targetTab === 'directory') {
        currentDirectoryMode = 'debtors';
        document.getElementById('view-directory').classList.remove('hidden');
        document.getElementById('nav-directory').className = "flex flex-col items-center justify-center text-indigo-600 font-bold transition-all";
        fetchCustomers();
    } else if (targetTab === 'settled') {
        currentDirectoryMode = 'settled';
        document.getElementById('view-directory').classList.remove('hidden');
        document.getElementById('nav-settled').className = "flex flex-col items-center justify-center text-indigo-600 font-bold transition-all";
        fetchCustomers();
    } else if (targetTab === 'profile') {
        document.getElementById('view-profile').classList.remove('hidden');
    }
}
// --- MODAL AND OVERLAY TOGGLES ---
function toggleModal(id, show) {
    const el = document.getElementById(id);
    if (show) { 
        el.classList.remove('hidden'); 
        el.classList.add('flex'); 
    } else { 
        el.classList.add('hidden'); 
        el.classList.remove('flex'); 
    }
}

// --- GLOBAL iOS EDGE SWIPE ENGINE ---
let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
let touchEndY = 0;

window.addEventListener('touchstart', function(e) {
    const profileView = document.getElementById('view-profile');
    if (profileView && !profileView.classList.contains('hidden')) {
        touchStartX = e.touches.clientX;
        touchStartY = e.touches.clientY;
        touchEndX = touchStartX;
        touchEndY = touchStartY;
    }
}, { passive: true });

window.addEventListener('touchmove', function(e) {
    if (touchStartX === 0) return;
    touchEndX = e.touches.clientX;
    touchEndY = e.touches.clientY;

    const currentDistanceX = touchEndX - touchStartX;
    const currentDistanceY = Math.abs(touchEndY - touchStartY);

    if (touchStartX < 50 && currentDistanceX > 15 && currentDistanceX > currentDistanceY) {
        if (e.cancelable) e.preventDefault();
    }
}, { passive: false });

window.addEventListener('touchend', function(e) {
    if (touchStartX === 0) return;
    const swipeDistanceX = touchEndX - touchStartX;
    const swipeDistanceY = Math.abs(touchEndY - touchStartY);

    if (touchStartX < 50 && swipeDistanceX > 60 && swipeDistanceX > swipeDistanceY) {
        changeTab('directory');
    }
    touchStartX = 0; touchStartY = 0; touchEndX = 0; touchEndY = 0;
}, { passive: true });
