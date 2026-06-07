// --- GLOBAL CONFIGURATION AND BASE ENGINE ---
const SUPABASE_URL = "https://tokbeildnsylyvdumkln.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_GAsvoI7MCcjUOURbjlWqLg_5uJSOHpe";

window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
var supabaseLocal = window.supabaseClient;
let activeCustomerPhone = null;

// --- NAVIGATION MODULE ---
// Keep track of what subset of accounts we want to display
let currentDirectoryMode = 'debtors'; 

// Keep track of what subset of accounts we want to display
let currentDirectoryMode = 'debtors'; 

function changeTab(targetTab) {
    // Hide all view screens
    document.getElementById('view-dashboard').classList.add('hidden');
    document.getElementById('view-history').classList.add('hidden');
    document.getElementById('view-directory').classList.add('hidden');
    document.getElementById('view-profile').classList.add('hidden');
    
    // Reset all navigation highlights back to neutral grey
    document.getElementById('nav-dashboard').className = "flex flex-col items-center justify-center text-gray-400 font-medium transition-all";
    document.getElementById('nav-history').className = "flex flex-col items-center justify-center text-gray-400 font-medium transition-all";
    document.getElementById('nav-directory').className = "flex flex-col items-center justify-center text-gray-400 font-medium transition-all";
    document.getElementById('nav-settled').className = "flex flex-col items-center justify-center text-gray-400 font-medium transition-all";

    if (targetTab === 'dashboard') {
        document.getElementById('view-dashboard').classList.remove('hidden');
        document.getElementById('nav-dashboard').className = "flex flex-col items-center justify-center text-indigo-600 font-bold transition-all";
        calculateMetrics();
    } else if (targetTab === 'history') {
        document.getElementById('view-history').classList.remove('hidden');
        document.getElementById('nav-history').className = "flex flex-col items-center justify-center text-indigo-600 font-bold transition-all";
        fetchGlobalHistory(); // Fire off the database fetch for all records
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

// Handles searching customers live from the dashboard input
async function handleQuickSearch(val) {
    const dropdown = document.getElementById('quick-search-results');
    const debtBtn = document.getElementById('btn-quick-debt');
    const payBtn = document.getElementById('btn-quick-pay');
    
    // Clear selection state if they modify the text
    document.getElementById('quick-selected-phone').value = '';
    debtBtn.className = "bg-gray-100 text-gray-400 p-3 rounded-xl font-bold text-xs text-center transition-all";
    payBtn.className = "bg-gray-100 text-gray-400 p-3 rounded-xl font-bold text-xs text-center transition-all";
    debtBtn.disabled = true;
    payBtn.disabled = true;

    if (!val.trim()) {
        dropdown.innerHTML = '';
        dropdown.classList.add('hidden');
        return;
    }

    // Grab a subset of matching customers from your local state or db
    const { data: matches, error } = await supabaseLocal
        .from('customers')
        .select('name, phone, balance')
        .ilike('name', `%${val}%`)
        .order('name')
        .limit(4);

    if (error || !matches || matches.length === 0) {
        dropdown.innerHTML = `<div class="p-3 text-xs text-gray-400 text-center">No customers found</div>`;
        dropdown.classList.remove('hidden');
        return;
    }

    dropdown.innerHTML = '';
    dropdown.classList.remove('hidden');

    matches.forEach(customer => {
        const row = document.createElement('div');
        row.className = "p-3 hover:bg-indigo-50 active:bg-indigo-100 cursor-pointer flex justify-between items-center text-sm transition";
        row.innerHTML = `
            <div>
                <span class="font-bold text-gray-800">${customer.name}</span>
                <span class="text-[10px] text-gray-400 font-mono ml-1">(${customer.phone})</span>
            </div>
            <span class="text-xs font-black ${customer.balance > 0 ? 'text-red-600' : 'text-emerald-600'}">
                $${customer.balance.toFixed(2)}
            </span>
        `;
        
        // When clicked, lock them in as the selected target
        row.onclick = () => {
            document.getElementById('quick-search').value = customer.name;
            document.getElementById('quick-selected-phone').value = customer.phone;
            dropdown.classList.add('hidden');
            dropdown.innerHTML = '';

            // Activate transaction action buttons instantly
            debtBtn.disabled = false;
            payBtn.disabled = false;
            debtBtn.className = "bg-red-600 text-white p-3 rounded-xl font-bold text-xs text-center shadow-sm shadow-red-100 active:scale-[0.98] transition-all";
            payBtn.className = "bg-emerald-600 text-white p-3 rounded-xl font-bold text-xs text-center shadow-sm shadow-emerald-100 active:scale-[0.98] transition-all";
        };
        dropdown.appendChild(row);
    });
}

// Redirects the dashboard click to fire your existing app modal logic
function triggerQuickAction(type) {
    const targetPhone = document.getElementById('quick-selected-phone').value;
    if (!targetPhone) return;

    // 1. Pivot the background view to look up this specific user profiles context
    openDirectProfile(targetPhone);

    // 2. Clear out the quick panel inputs so it resets cleanly for next time
    document.getElementById('quick-search').value = '';
    document.getElementById('quick-selected-phone').value = '';
    document.getElementById('btn-quick-debt').disabled = true;
    document.getElementById('btn-quick-pay').disabled = true;
    document.getElementById('btn-quick-debt').className = "bg-gray-100 text-gray-400 p-3 rounded-xl font-bold text-xs text-center";
    document.getElementById('btn-quick-pay').className = "bg-gray-100 text-gray-400 p-3 rounded-xl font-bold text-xs text-center";

    // 3. Pop open your standard transaction processing overlay
    setTimeout(() => {
        openTransactionModal(type);
    }, 150); 
}
