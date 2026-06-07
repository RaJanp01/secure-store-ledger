// js/ledger.js - Core Accounting, Tables, and Metrics Fetching Logic

async function fetchCustomers(filter = '') {
    let query = supabaseLocal.from('customers').select('*');
    
    // Check if currentDirectoryMode exists globally before using it
    if (typeof currentDirectoryMode !== 'undefined') {
        if (currentDirectoryMode === 'debtors') {
            query = query.gt('balance', 0);
        } else if (currentDirectoryMode === 'settled') {
            query = query.eq('balance', 0);
        }
    }

    if(filter) {
        query = query.or(`name.ilike.%${filter}%,phone.ilike.%${filter}%`);
    }
    
    const { data: customers, error } = await query.order('name');
    if (error) return console.error(error);

    const container = document.getElementById('customer-list');
    if (!container) return;
    container.innerHTML = '';

    if (customers.length === 0) {
        container.innerHTML = `<p class="p-6 text-center text-xs text-gray-400">No matching accounts found here</p>`;
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
                <span onclick="openDirectProfile('${c.phone}')" class="text-base font-black cursor-pointer ${c.balance > 0 ? 'text-red-600' : 'text-emerald-600'}">
                    $${c.balance.toFixed(2)}
                </span>
                <a href="tel:${c.phone}" class="bg-gray-100 active:bg-indigo-100 hover:bg-gray-200 p-2.5 rounded-full text-sm transition-all shadow-sm flex items-center justify-center">
                    📞
                </a>
            </div>
        `;
        container.appendChild(item);
    });
}

async function fetchGlobalHistory() {
    const container = document.getElementById('global-history-log');
    if (!container) return;
    container.innerHTML = `<p class="p-6 text-center text-xs text-gray-400">Loading history stream...</p>`;

    const { data: txs, error } = await supabaseLocal
        .from('transactions')
        .select(`
            id,
            amount,
            type,
            description,
            created_at,
            customer_phone,
            customers ( name )
        `)
        .order('created_at', { ascending: false })
        .limit(50);

    if (error) {
        console.error(error);
        container.innerHTML = `<p class="p-6 text-center text-xs text-red-500">Error reading logs</p>`;
        return;
    }

    if (!txs || txs.length === 0) {
        container.innerHTML = `<p class="p-6 text-center text-xs text-gray-400">No transactions recorded yet</p>`;
        return;
    }

    container.innerHTML = '';

    txs.forEach(t => {
        const dateObj = new Date(t.created_at);
        const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + 
            ', ' + dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

        const isPayment = t.type === 'payment';
        const clientName = t.customers?.name || 'Unknown Account';

        const entry = document.createElement('div');
        entry.className = "p-4 hover:bg-gray-50 active:bg-gray-100 transition flex justify-between items-center select-none border-b border-gray-50";
        
        entry.innerHTML = `
            <div onclick="openDirectProfile('${t.customer_phone}')" class="flex-1 min-w-0 cursor-pointer">
                <div class="flex items-center gap-2">
                    <span class="text-sm font-black text-gray-900 truncate">${clientName}</span>
                    <span class="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded font-bold ${isPayment ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}">
                        ${isPayment ? 'Paid' : 'Added'}
                    </span>
                </div>
                <div class="text-xs text-gray-500 truncate mt-0.5">${t.description || 'No notes'}</div>
                <div class="text-[10px] text-gray-400 mt-1 font-medium">${formattedDate}</div>
            </div>
            <div onclick="openDirectProfile('${t.customer_phone}')" class="text-right shrink-0 ml-2 cursor-pointer">
                <span class="text-base font-black ${isPayment ? 'text-emerald-600' : 'text-red-600'}">
                    ${isPayment ? '−' : '+'}$${t.amount.toFixed(2)}
                </span>
            </div>
        `;
        container.appendChild(entry);
    });
}
