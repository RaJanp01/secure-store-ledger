// js/ledger.js - Core Accounting, Tables, and Metrics Fetching Logic

// --- Refactored: Robust Data Fetching with Error Handling ---

async function fetchCustomers(filter = '') {
    // 1. Guard: Ensure Supabase client exists
    if (typeof supabaseLocal === 'undefined') {
        console.warn("Supabase not initialized, retrying in 500ms...");
        setTimeout(() => fetchCustomers(filter), 500);
        return;
    }

    const container = document.getElementById('customer-list');
    if (!container) return;

    try {
        let query = supabaseLocal.from('customers').select('*');
        
        if (typeof currentDirectoryMode !== 'undefined') {
            query = (currentDirectoryMode === 'debtors') ? query.gt('balance', 0) : query.eq('balance', 0);
        }

        if (filter) {
            query = query.or(`name.ilike.%${filter}%,phone.ilike.%${filter}%`);
        }
        
        const { data: customers, error } = await query.order('name');
        if (error) throw error;

        container.innerHTML = '';
        if (!customers || customers.length === 0) {
            container.innerHTML = `<p class="p-6 text-center text-xs text-gray-400">No accounts found.</p>`;
            return;
        }

        customers.forEach(c => {
            const item = document.createElement('div');
            item.className = "flex justify-between items-center p-4 hover:bg-gray-50 border-b border-gray-100 transition";
            item.innerHTML = `
                <div onclick="openDirectProfile('${c.phone}')" class="flex-1 cursor-pointer">
                    <div class="font-bold text-gray-900">${c.name}</div>
                    <div class="text-xs text-gray-400 font-mono">${c.phone}</div>
                </div>
                <div class="font-black ${c.balance > 0 ? 'text-red-600' : 'text-emerald-600'}">
                    $${(c.balance || 0).toFixed(2)}
                </div>
            `;
            container.appendChild(item);
        });
    } catch (err) {
        console.error("fetchCustomers failed:", err);
    }
}

async function fetchGlobalHistory() {
    const container = document.getElementById('global-history-log');
    if (!container || typeof supabaseLocal === 'undefined') return;

    try {
        const { data: txs, error } = await supabaseLocal
            .from('transactions')
            .select(`id, amount, type, description, created_at, customer_phone, customers(name)`)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) throw error;

        container.innerHTML = (txs.length === 0) ? `<p class="p-6 text-center text-xs text-gray-400">No logs yet.</p>` : '';

        txs.forEach(t => {
            const isPayment = t.type === 'payment';
            const entry = document.createElement('div');
            entry.className = "p-4 border-b border-gray-50 flex justify-between items-center";
            entry.innerHTML = `
                <div>
                    <div class="text-sm font-bold">${t.customers?.name || 'Unknown'}</div>
                    <div class="text-[10px] text-gray-400">${new Date(t.created_at).toLocaleString()}</div>
                </div>
                <div class="font-black ${isPayment ? 'text-emerald-600' : 'text-red-600'}">
                    ${isPayment ? '−' : '+'}$${t.amount.toFixed(2)}
                </div>
            `;
            container.appendChild(entry);
        });
    } catch (err) {
        console.error("fetchGlobalHistory failed:", err);
        container.innerHTML = `<p class="p-6 text-center text-xs text-red-500">Sync Error</p>`;
    }
}
