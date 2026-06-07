// --- GLOBAL CONFIGURATION AND BASE ENGINE ---
const SUPABASE_URL = "https://tokbeildnsylyvdumkln.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_GAsvoI7MCcjUOURbjlWqLg_5uJSOHpe";

window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
var supabaseLocal = window.supabaseClient;
let activeCustomerPhone = null;


// js/app.js - Global App Routing and View State Management
window.currentDirectoryMode = 'debtors'; 

function changeTab(targetTab) {
    const viewDashboard = document.getElementById('view-dashboard');
    const viewHistory = document.getElementById('view-history');
    const viewDirectory = document.getElementById('view-directory');
    const viewProfile = document.getElementById('view-profile');

    if (viewDashboard) viewDashboard.classList.add('hidden');
    if (viewHistory) viewHistory.classList.add('hidden');
    if (viewDirectory) viewDirectory.classList.add('hidden');
    if (viewProfile) viewProfile.classList.add('hidden');
    
    const navDashboard = document.getElementById('nav-dashboard');
    const navHistory = document.getElementById('nav-history');
    const navDirectory = document.getElementById('nav-directory');
    const navSettled = document.getElementById('nav-settled');

    if (navDashboard) navDashboard.className = "flex flex-col items-center justify-center text-gray-400 font-medium transition-all";
    if (navHistory) navHistory.className = "flex flex-col items-center justify-center text-gray-400 font-medium transition-all";
    if (navDirectory) navDirectory.className = "flex flex-col items-center justify-center text-gray-400 font-medium transition-all";
    if (navSettled) navSettled.className = "flex flex-col items-center justify-center text-gray-400 font-medium transition-all";

    if (targetTab === 'dashboard') {
        if (viewDashboard) viewDashboard.classList.remove('hidden');
        if (navDashboard) navDashboard.className = "flex flex-col items-center justify-center text-indigo-600 font-bold transition-all";
        if (typeof calculateMetrics === 'function') calculateMetrics();
    } else if (targetTab === 'history') {
        if (viewHistory) viewHistory.classList.remove('hidden');
        if (navHistory) navHistory.className = "flex flex-col items-center justify-center text-indigo-600 font-bold transition-all";
        if (typeof fetchGlobalHistory === 'function') fetchGlobalHistory();
    } else if (targetTab === 'directory') {
        window.currentDirectoryMode = 'debtors';
        if (viewDirectory) viewDirectory.classList.remove('hidden');
        if (navDirectory) navDirectory.className = "flex flex-col items-center justify-center text-indigo-600 font-bold transition-all";
        if (typeof fetchCustomers === 'function') fetchCustomers();
    } else if (targetTab === 'settled') {
        window.currentDirectoryMode = 'settled';
        if (viewDirectory) viewDirectory.classList.remove('hidden');
        if (navSettled) navSettled.className = "flex flex-col items-center justify-center text-indigo-600 font-bold transition-all";
        if (typeof fetchCustomers === 'function') fetchCustomers();
    } else if (targetTab === 'profile') {
        if (viewProfile) viewProfile.classList.remove('hidden');
    }
}

// Quick Dashboard Search Logic
async function handleQuickSearch(val) {
    const dropdown = document.getElementById('quick-search-results');
    const debtBtn = document.getElementById('btn-quick-debt');
    const payBtn = document.getElementById('btn-quick-pay');
    
    if (!dropdown || !debtBtn || !payBtn) return;

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
        
        row.onclick = () => {
            document.getElementById('quick-search').value = customer.name;
            document.getElementById('quick-selected-phone').value = customer.phone;
            dropdown.classList.add('hidden');
            dropdown.innerHTML = '';

            debtBtn.disabled = false;
            payBtn.disabled = false;
            debtBtn.className = "bg-red-600 text-white p-3 rounded-xl font-bold text-xs text-center shadow-sm shadow-red-100 active:scale-[0.98] transition-all";
            payBtn.className = "bg-emerald-600 text-white p-3 rounded-xl font-bold text-xs text-center shadow-sm shadow-emerald-100 active:scale-[0.98] transition-all";
        };
        dropdown.appendChild(row);
    });
}

function triggerQuickAction(type) {
    const targetPhone = document.getElementById('quick-selected-phone').value;
    if (!targetPhone) return;

    if (typeof openDirectProfile === 'function') {
        openDirectProfile(targetPhone);
    }

    document.getElementById('quick-search').value = '';
    document.getElementById('quick-selected-phone').value = '';
    
    const debtBtn = document.getElementById('btn-quick-debt');
    const payBtn = document.getElementById('btn-quick-pay');
    if (debtBtn && payBtn) {
        debtBtn.disabled = true;
        payBtn.disabled = true;
        debtBtn.className = "bg-gray-100 text-gray-400 p-3 rounded-xl font-bold text-xs text-center";
        payBtn.className = "bg-gray-100 text-gray-400 p-3 rounded-xl font-bold text-xs text-center";
    }

    setTimeout(() => {
        if (typeof openTransactionModal === 'function') {
            openTransactionModal(type);
        }
    }, 150); 
}
