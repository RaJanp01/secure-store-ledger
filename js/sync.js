// --- MUTATION RECORD AND ADJUSTMENT MATRIX ---
async function showProfilePage(phone) {
    activeCustomerPhone = phone;
    const { data: customer, error: cErr } = await supabaseLocal.from('customers').select('*').eq('phone', phone).single();
    const { data: history, error: hErr } = await supabaseLocal.from('transactions').select('*').eq('customer_phone', phone).order('created_at', { ascending: false });

    if (cErr || hErr) return alert("Error processing transaction files.");

    document.getElementById('profile-name').innerText = customer.name;
    
    const phoneLink = document.getElementById('profile-phone-link');
    phoneLink.innerText = `📞 ${customer.phone}`;
    phoneLink.href = `tel:${customer.phone}`;

    const balanceEl = document.getElementById('profile-balance');
    balanceEl.innerText = `$${customer.balance.toFixed(2)}`;
    balanceEl.className = `text-2xl font-black ${customer.balance > 0 ? 'text-red-600' : 'text-emerald-600'}`;

    const tbody = document.getElementById('history-table-body');
    tbody.innerHTML = '';
    
    if (history.length === 0) {
        tbody.innerHTML = `<tr><td class="p-4 text-center text-xs text-gray-400">No logs on account file.</td></tr>`;
        return;
    }

    window.currentProfileHistory = history;

    history.forEach(tx => {
        const d = new Date(tx.created_at);
        const timeStr = d.toLocaleDateString([], {month:'short', day:'numeric'}) + ' • ' + d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
        const row = document.createElement('tr');
        const isVoided = tx.voided === true;
        
        row.innerHTML = `
            <td class="p-3 ${isVoided ? 'bg-gray-100/70 opacity-50' : ''}">
                <div class="flex justify-between items-center gap-2">
                    <div class="min-w-0 flex-1">
                        <span class="inline-block px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider ${isVoided ? 'bg-gray-300 text-gray-700' : tx.type === 'purchase' ? 'bg-red-50 text-red-700':'bg-emerald-50 text-emerald-700'}">
                            ${isVoided ? 'VOIDED' : tx.type === 'purchase' ? 'Debt' : 'Paid'}
                        </span>
                        <div class="font-semibold text-gray-800 text-sm mt-0.5 ${isVoided ? 'line-through text-gray-400' : ''}">${tx.description}</div>
                        <div class="text-[10px] text-gray-400 mt-0.5">${timeStr}</div>
                    </div>
                    <div class="flex items-center gap-3 shrink-0">
                        <div class="font-bold text-sm ${isVoided ? 'text-gray-400 line-through' : tx.type === 'purchase'?'text-red-600':'text-emerald-600'}">
                            ${tx.type === 'purchase'?'+':'-'}$${tx.amount.toFixed(2)}
                        </div>
                        ${!isVoided ? `
                            <button onclick="voidTransaction(${tx.id})" class="text-xs bg-gray-100 active:bg-red-100 p-2 rounded-lg font-bold transition-all">
                                🚫
                            </button>
                        ` : '<span class="text-xs p-1.5 select-none">↩️</span>'}
                    </div>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function openTransactionModal(type) {
    document.getElementById('tx-type').value = type;
    document.getElementById('tx-modal-title').innerText = type === 'purchase' ? 'Log Outstanding Debt' : 'Collect Cash Payment';
    toggleModal('transaction-modal', true);
}

async function submitTransaction(e) {
    e.preventDefault();
    const form = e.target;
    const confirmBtn = form.querySelector('button[type="submit"]');
    confirmBtn.disabled = true;

    const type = document.getElementById('tx-type').value;
    const amount = parseFloat(document.getElementById('tx-amount').value);
    const description = document.getElementById('tx-desc').value.trim();

    try {
        const { data: customer } = await supabaseLocal.from('customers').select('balance').eq('phone', activeCustomerPhone).single();
        let newBalance = type === 'purchase' ? customer.balance + amount : customer.balance - amount;

        await supabaseLocal.from('transactions').insert([{ customer_phone: activeCustomerPhone, type, amount, description }]);
        await supabaseLocal.from('customers').update({ balance: newBalance }).eq('phone', activeCustomerPhone);

        document.getElementById('transaction-form').reset();
        toggleModal('transaction-modal', false);
        await showProfilePage(activeCustomerPhone);
    } catch (err) {
        alert("Transaction Failed: " + err.message);
    } finally {
        confirmBtn.disabled = false;
    }
}

async function voidTransaction(txId) {
    const targetTx = window.currentProfileHistory ? window.currentProfileHistory.find(item => item.id === txId) : null;
    if (!targetTx) return alert("System tracking reference lost. Please refresh.");

    const confirmation = confirm(`Are you sure you want to void this transaction: "${targetTx.description}"? This will automatically reverse the balance effect.`);
    if (!confirmation) return;

    try {
        const { data: customer, error: fErr } = await supabaseLocal.from('customers').select('balance').eq('phone', activeCustomerPhone).single();
        if (fErr) throw fErr;

        const type = targetTx.type;
        const amount = targetTx.amount;
        const originalDesc = targetTx.description;

        let adjustedBalance = type === 'purchase' ? customer.balance - amount : customer.balance + amount;

        const { error: voidErr } = await supabaseLocal.from('transactions').update({ voided: true }).eq('id', txId);
        if (voidErr) throw voidErr;

        const adjustmentDescription = `Correction: [VOID] ${originalDesc}`;
        const adjustmentType = type === 'purchase' ? 'payment' : 'purchase';

        const { error: logErr } = await supabaseLocal.from('transactions').insert([
            { customer_phone: activeCustomerPhone, type: adjustmentType, amount, description: adjustmentDescription, voided: true }
        ]);
        if (logErr) throw logErr;

        const { error: upErr } = await supabaseLocal.from('customers').update({ balance: adjustedBalance }).eq('phone', activeCustomerPhone);
        if (upErr) throw upErr;

        await showProfilePage(activeCustomerPhone);
    } catch (err) {
        alert("Failed to void mistake: " + err.message);
    }
}