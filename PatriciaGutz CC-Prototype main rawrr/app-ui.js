(function () {

    function showToast(message) {
        let toast = document.createElement('div');
        toast.className = 'app-toast';
        toast.setAttribute('role', 'status');
        toast.textContent = message;
        document.body.appendChild(toast);
        requestAnimationFrame(() => toast.classList.add('visible'));
        setTimeout(() => {
            toast.classList.remove('visible');
            setTimeout(() => toast.remove(), 200);
        }, 2800);
    }

    function showDialog({ title, message, input, value, confirmLabel }) {
        return new Promise(resolve => {
            let overlay = document.createElement('div');
            overlay.className = 'app-dialog-overlay';
            overlay.innerHTML = `
                <section class="app-dialog" role="dialog" aria-modal="true">
                    <h2 class="app-dialog-title"></h2>
                    <p class="app-dialog-message"></p>
                    ${input ? '<input class="app-dialog-input" type="text">' : ''}
                    <div class="app-dialog-actions">
                        <button type="button" class="app-dialog-cancel">Cancel</button>
                        <button type="button" class="app-dialog-confirm"></button>
                    </div>
                </section>`;
            overlay.querySelector('.app-dialog-title').textContent = title;
            overlay.querySelector('.app-dialog-message').textContent = message;
            let inputElement = overlay.querySelector('.app-dialog-input');
            if (inputElement) {
                inputElement.value = value || '';
                inputElement.placeholder = 'Enter a value';
            }

            function finish(confirmed) {
                let result = inputElement ? (confirmed ? inputElement.value.trim() : null) : confirmed;
                overlay.remove();
                resolve(result);
            }

            overlay.querySelector('.app-dialog-confirm').textContent = confirmLabel;
            overlay.querySelector('.app-dialog-confirm').addEventListener('click', () => finish(true));
            overlay.querySelector('.app-dialog-cancel').addEventListener('click', () => finish(false));
            overlay.addEventListener('click', event => {
                if (event.target === overlay) finish(false);
            });
            overlay.addEventListener('keydown', event => {
                if (event.key === 'Escape') finish(false);
                if (event.key === 'Enter' && inputElement) finish(true);
            });
            document.body.appendChild(overlay);
            if (inputElement) inputElement.focus();
            else overlay.querySelector('.app-dialog-confirm').focus();
        });
    }

    // Shared sequential order numbering (01, 02, 03 ...) used by web and walk-in orders
    window.nextOrderId = function () {
        const read = k => JSON.parse(localStorage.getItem(k) || '[]');
        const used = new Set([...read('cc_synced_queue'), ...read('cc_completed_orders_history')].map(o => Number(o.id)));
        let n = parseInt(localStorage.getItem('cc_order_counter') || '0', 10);
        do { n++; } while (used.has(n));
        localStorage.setItem('cc_order_counter', n);
        return String(n).padStart(2, '0');
    };

    window.logSystemAudit = function (category, message) {
        try {
            const logs = JSON.parse(localStorage.getItem('cc_audit_logs') || '[]');
            logs.unshift({
                t: Date.now(), category, message,
                user: sessionStorage.getItem('logged_employee_name') || localStorage.getItem('logged_customer_name') || 'System',
                role: sessionStorage.getItem('logged_employee_role') || (localStorage.getItem('logged_customer_name') ? 'customer' : 'system')
            });
            localStorage.setItem('cc_audit_logs', JSON.stringify(logs.slice(0, 500)));
            window.dispatchEvent(new Event('cc-audit-updated'));
        } catch (e) { console.error('Audit write failed', e); }
    };

    window.applyStockDeduction = function (order) {
        if (order.stockDeducted) return;
        const inv = JSON.parse(localStorage.getItem('cc_synced_inventory') || '[]');
        (order.rawItems || []).forEach(r => {
            const it = inv.find(i => i.name === r.name);
            if (it) it.stock = Math.max(0, Number(it.stock) - Number(r.qty));
        });
        order.stockDeducted = true;
        localStorage.setItem('cc_synced_inventory', JSON.stringify(inv));
        localStorage.setItem('cc_menu', JSON.stringify(inv));
    };

    window.returnStockDeduction = function (order) {
        if (!order.stockDeducted) return;
        const inv = JSON.parse(localStorage.getItem('cc_synced_inventory') || localStorage.getItem('cc_menu') || '[]');
        (order.rawItems || []).forEach(r => {
            const it = inv.find(i => i.name === r.name);
            if (it) {
                it.stock = Number(it.stock || 0) + Number(r.qty);
            }
        });
        order.stockDeducted = false;
        localStorage.setItem('cc_synced_inventory', JSON.stringify(inv));
        localStorage.setItem('cc_menu', JSON.stringify(inv));
        window.dispatchEvent(new Event('cc-inventory-updated'));
    };

    //Gives a "dynamic" AI-ETA time
    window.estimateEtaMinutes = function (order) {
        const q = JSON.parse(localStorage.getItem('cc_synced_queue') || '[]');
        const ahead = q.filter(o => ['pending', 'prep'].includes(o.status) && Number(o.createdAt) <= Number(order.createdAt)).length;
        const items = (order.rawItems || []).reduce((s, r) => s + Number(r.qty), 0);
        return Math.max(3, Math.round(2 + items * 0.5 + ahead * 1.5));
    };

    window.cancelOrder = function (orderId) {
        let queue = JSON.parse(localStorage.getItem('cc_synced_queue') || '[]');
        let index = queue.findIndex(o => String(o.id) === String(orderId));
        if (index < 0) {
            if (window.appToast) window.appToast("Order not found or already processed.");
            return;
        }
        let order = queue[index];
        if (order.status !== 'pending') {
            if (window.appToast) window.appToast("Only pending orders can be cancelled.");
            return;
        }

        if (typeof window.returnStockDeduction === 'function') {
            window.returnStockDeduction(order);
        }

        queue.splice(index, 1);
        localStorage.setItem('cc_synced_queue', JSON.stringify(queue));
        window.dispatchEvent(new Event('cc-orders-updated'));

        order.status = 'cancelled';
        let history = JSON.parse(localStorage.getItem('cc_completed_orders_history') || '[]');
        history.push(order);
        localStorage.setItem('cc_completed_orders_history', JSON.stringify(history));

        if (window.logSystemAudit) {
            window.logSystemAudit('ORDER', `Order #${orderId} was cancelled and stock returned.`);
        }
        if (window.appToast) {
            window.appToast(`Order #${orderId} cancelled successfully. Stock returned.`);
        }

        if (typeof renderKitchenKanban === 'function') renderKitchenKanban();
        if (typeof renderMyOrders === 'function') renderMyOrders();
        if (typeof updateTrackerStatus === 'function') updateTrackerStatus();
    };

    window.appToast = showToast;
    window.appConfirm = (message, title = 'Please Confirm') =>
        showDialog({ title, message, confirmLabel: 'Confirm' });
    window.appPrompt = (message, value = '', title = 'Enter Details') =>
        showDialog({ title, message, input: true, value, confirmLabel: 'Continue' });
    window.alert = showToast;
})();