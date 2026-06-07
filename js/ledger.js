// --- BUSINESS LOGIC AND ANALYTICS ENGINE ---

async function createNewCustomer(e) {
    e.preventDefault();
    console.log("Form submitted!"); // Debug 1
    
    const name = document.getElementById('new-cust-name').value.trim();
    const phone = document.getElementById('new-cust-phone').value.trim();

    const { data, error } = await supabaseLocal.from('customers').insert([{ name, phone, balance: 0 }]);
    
    if (error) {
        console.error("Supabase Error:", error); // Debug 2 - This will tell you if RLS is blocking you
        alert("Error: " + error.message);
    } else {
        console.log("Success!"); // Debug 3
        // ... rest of your code
    }
}


async function calculateMetrics() {
    const { data: customers, error } = await supabaseLocal.from('customers').select('*');
    if (error) return console.error(error);

    let totalCollect = 0;
    let debtorCount = 0;
    let cleanCount = 0;

    customers.forEach(c => {
        if (c.balance > 0) {
            totalCollect += c.balance;
            debtorCount++;
        } else {
            cleanCount++;
        }
    });

    document.getElementById('kpi-total-collect').innerText = `$${totalCollect.toFixed(2)}`;
    document.getElementById('metric-debtors-count').innerText = debtorCount;
    document.getElementById('metric-clean-count').innerText = cleanCount;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: recentTransactions } = await supabaseLocal
        .from('transactions')
        .select('customer_phone, created_at')
        .gt('created_at', thirtyDaysAgo.toISOString());

    const activePhonesInThirtyDays = new Set(recentTransactions?.map(tx => tx.customer_phone));
    const dormantContainer = document.getElementById('list-dormant');
    dormantContainer.innerHTML = '';
    let dormantCount = 0;

    customers.forEach(c => {
        if (c.balance > 0 && !activePhonesInThirtyDays.has(c.phone)) {
            dormantCount++;
            const row = document.createElement('div');
            row.className = "flex justify-between items-center py-3 select-none active:bg-gray-50";
            row.innerHTML = `
                <div onclick="openDirectProfile('${c.phone}')" class="flex-1 cursor-pointer">
                    <div class="font-bold text-sm text-gray-900">${c.name}</div>
                    <div class="text-[11px] text-gray-400 font-mono">${c.phone}</div>
                </div>
                <div class="flex items-center gap-3">
                    <span class="text-sm font-black text-red-600">$${c.balance.toFixed(2)}</span>
                    <a href="tel:${c.phone}" class="bg-gray-100 active:bg-indigo-100 p-2 rounded-full text-xs">📞</a>
                </div>
            `;
            dormantContainer.appendChild(row);
        }
    });

    document.getElementById('badge-dormant-count').innerText = dormantCount;
    if (dormantCount === 0) {
        dormantContainer.innerHTML = `<p class="text-center py-6 text-xs text-gray-400">All accounts have logged recent activity.</p>`;
    }
}

function openDirectProfile(phone) {
    changeTab('profile');
    showProfilePage(phone);
}

async function fetchCustomers(filter = '') {
    let query = supabaseLocal.from('customers').select('*');
    
    // Maintain state consistency
    if (typeof window.currentDirectoryMode !== 'undefined') {
        if (window.currentDirectoryMode === 'debtors') query = query.gt('balance', 0);
        else if (window.currentDirectoryMode === 'settled') query = query.eq('balance', 0);
    }

    if(filter) query = query.or(`name.ilike.%${filter}%,phone.ilike.%${filter}%`);
    
    const { data: customers, error } = await query.order('name');
    if (error) return console.error(error);

    const container = document.getElementById('customer-list');
    container.innerHTML = '';

    if (customers.length === 0) {
        container.innerHTML = `<p class="p-6 text-center text-xs text-gray-400">No matching accounts found</p>`;
        return;
    }

    customers.forEach(c => {
        const item = document.createElement('div');
        item.className = "flex justify-between items-center p-4 hover:bg-gray-50 active:bg-gray-100 border-b border-gray-100 transition select-none";
        item.innerHTML = `
            <div onclick="openDirectProfile('${c.phone}')" class="flex-1 min-w-0 cursor-pointer">
                <div class="font-bold text-gray-900 text-base truncate">${c.name}</div>
                <div class="text-xs text-gray-400 font-mono mt-0.5">${c.phone}</div>
            </div>
            <div class="flex items-center gap-3 shrink-0 ml-2">
                <span class="text-base font-black ${c.balance > 0 ? 'text-red-600' : 'text-emerald-600'}">
                    $${c.balance.toFixed(2)}
                </span>
                <a href="tel:${c.phone}" class="bg-gray-100 p-2.5 rounded-full text-sm">📞</a>
            </div>
        `;
        container.appendChild(item);
    });
}

async function fetchGlobalHistory() {
    const container = document.getElementById('global-history-log');
    if (!container) return;
    
    const { data: txs, error } = await supabaseLocal
        .from('transactions')
        .select(`id, amount, type, description, created_at, customer_phone, customers ( name )`)
        .order('created_at', { ascending: false })
        .limit(50);

    if (error || !txs || txs.length === 0) {
        container.innerHTML = `<p class="p-6 text-center text-xs text-gray-400">No transactions recorded yet</p>`;
        return;
    }

    container.innerHTML = '';
    txs.forEach(t => {
        const d = new Date(t.created_at);
        const dateStr = d.toLocaleDateString('en-US', {month: 'short', day: 'numeric'}) + ', ' + d.toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit'});
        const entry = document.createElement('div');
        entry.className = "p-4 border-b border-gray-50 flex justify-between items-center";
        entry.innerHTML = `
            <div onclick="openDirectProfile('${t.customer_phone}')" class="cursor-pointer">
                <div class="text-sm font-black text-gray-900">${t.customers?.name || 'Unknown'}</div>
                <div class="text-[10px] text-gray-400">${dateStr}</div>
            </div>
            <div class="font-black ${t.type === 'payment' ? 'text-emerald-600' : 'text-red-600'}">
                ${t.type === 'payment' ? '−' : '+'}$${t.amount.toFixed(2)}
            </div>
        `;
        container.appendChild(entry);
    });
}

// Event Listeners
const searchInput = document.getElementById('search-input');
if (searchInput) searchInput.addEventListener('input', (e) => fetchCustomers(e.target.value));

async function createNewCustomer(e) {
    e.preventDefault();
    const saveBtn = e.target.querySelector('button[type="submit"]');
    saveBtn.disabled = true;

    const name = document.getElementById('new-cust-name').value.trim();
    const phone = document.getElementById('new-cust-phone').value.trim();

    const { error } = await supabaseLocal.from('customers').insert([{ name, phone, balance: 0 }]);
    saveBtn.disabled = false;
    
    if (error) {
        alert("Error: " + error.message);
    } else {
        document.getElementById('add-customer-form').reset();
        toggleModal('add-customer-modal', false);
        openDirectProfile(phone);
    }
}
