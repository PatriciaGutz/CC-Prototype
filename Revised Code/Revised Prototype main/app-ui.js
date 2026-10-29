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

    function showDialog({ title, message, input, value, placeholder, confirmLabel }) {
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
                inputElement.placeholder = placeholder || 'Enter a value';
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

/*    //Gives a "dynamic" AI-ETA time
    window.estimateEtaMinutes = function (order) {
        const q = JSON.parse(localStorage.getItem('cc_synced_queue') || '[]');
        const ahead = q.filter(o => ['pending', 'prep'].includes(o.status) && Number(o.createdAt) <= Number(order.createdAt)).length;
        const items = (order.rawItems || []).reduce((s, r) => s + Number(r.qty), 0);
        return Math.max(3, Math.round(2 + items * 0.5 + ahead * 1.5));
    };*/

    // ===== DSS prep-time estimator: order volume + item complexity + historical prep speed =====
    const DEFAULT_COMPLEXITY = { Chicken: 4, Meals: 3, Snacks: 2, Drinks: 1 };
    const readJSON = k => JSON.parse(localStorage.getItem(k) || '[]');

    window.defaultComplexity = category => DEFAULT_COMPLEXITY[category] || 2;
    window.itemComplexity = function (name) {                       // 1 = pour & serve ... 5 = multi-step cook
        const it = readJSON('cc_synced_inventory').find(i => i.name === name);
        return it ? (Number(it.complexity) || window.defaultComplexity(it.category)) : 2;
    };
    window.orderComplexity = o =>
        (o.rawItems || []).reduce((s, r) => s + window.itemComplexity(r.name) * Number(r.qty || 1), 0);

    window.prepSpeedFactor = function () {                          // 1 = kitchen matches the model
        const done = readJSON('cc_completed_orders_history')
            .filter(o => o.startedAt && o.readyAt && o.readyAt - o.startedAt >= 30000)   // ignore sub-30s demo clicks
            .slice(-15);
        if (done.length < 3) return 1;
        const ratio = done.reduce((s, o) =>
            s + ((o.readyAt - o.startedAt) / 60000) / (1 + 0.6 * Math.max(1, window.orderComplexity(o))), 0) / done.length;
        return Math.min(1.6, Math.max(0.6, ratio));
    };

    window.etaBreakdown = function (order) {
        const ahead = readJSON('cc_synced_queue').filter(o =>
            ['pending', 'prep'].includes(o.status) && String(o.id) !== String(order.id) &&
            Number(o.createdAt) < Number(order.createdAt)).length;
        const complexity = window.orderComplexity(order);
        const speed = window.prepSpeedFactor();
        const minutes = Math.max(3, Math.round((1 + 0.6 * complexity + 1.2 * ahead) * speed));
        return { minutes, complexity, ahead, speed: Math.round(speed * 100) / 100 };
    };
    window.estimateEtaMinutes = order => window.etaBreakdown(order).minutes;

// Running mm:ss for every <span class="prep-timer" data-start data-eta>; turns red when overdue
    window.tickPrepTimers = function () {
        document.querySelectorAll('.prep-timer').forEach(el => {
            const start = Number(el.dataset.start);
            if (!start) { el.textContent = '--:--'; return; }
            const s = Math.max(0, Math.floor((Date.now() - start) / 1000));
            el.textContent = String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
            el.classList.toggle('text-red-600', s / 60 > Number(el.dataset.eta));
        });
    };
    setInterval(window.tickPrepTimers, 1000);

    window.cancelOrder = function (orderId) {
        let queue = JSON.parse(localStorage.getItem('cc_synced_queue') || '[]');
        let index = queue.findIndex(o => String(o.id) === String(orderId));
        if (index < 0) {
            if (window.appToast) window.appToast("Order not found or already processed.");
            return;
        }
        let order = queue[index];
        const customerEmail = localStorage.getItem('logged_customer_email') || '';
        const customerName = localStorage.getItem('logged_customer_name') || '';
        if (order.source !== 'Web' || (order.customerEmail
            ? order.customerEmail !== customerEmail
            : order.customerName !== customerName)) {
            if (window.appToast) window.appToast("You can only cancel your own web orders.");
            return;
        }
        if (String(order.status).toLowerCase() !== 'pending') {
            if (window.appToast) window.appToast("Accepted orders cannot be cancelled.");
            return;
        }

        if (typeof window.returnStockDeduction === 'function') {
            window.returnStockDeduction(order);
        }

        queue.splice(index, 1);
        localStorage.setItem('cc_synced_queue', JSON.stringify(queue));
        window.dispatchEvent(new Event('cc-orders-updated'));

        order.status = 'cancelled';
        order.cancelledAt = Date.now();
        let history = JSON.parse(localStorage.getItem('cc_cancelled_orders_history') || '[]');
        history.push(order);
        localStorage.setItem('cc_cancelled_orders_history', JSON.stringify(history));

        if (window.logSystemAudit) {
            window.logSystemAudit('ORDER', `Order #${orderId} was cancelled and stock returned.`);
        }
        if (window.appToast) {
            window.appToast('order cancelled successfully.');
        }

        if (typeof renderKitchenKanban === 'function') renderKitchenKanban();
        if (typeof renderMyOrders === 'function') renderMyOrders();
        if (typeof updateTrackerStatus === 'function') updateTrackerStatus();
    };

    window.appToast = showToast;
    window.appConfirm = (message, title = 'Please Confirm') =>
        showDialog({ title, message, confirmLabel: 'Confirm' });
    window.appPrompt = (message, value = '', title = 'Enter Details', placeholder = 'Enter a value') =>
        showDialog({ title, message, input: true, value, placeholder, confirmLabel: 'Continue' });
    window.resetCustomerPassword = async function () {
        const email = (await window.appPrompt('Enter the email address registered to your account:', '', 'Reset Customer Password', 'Enter email'))?.trim().toLowerCase();
        if (!email) return;
        const users = JSON.parse(localStorage.getItem('cc_registered_users') || '[]');
        const user = users.find(account => String(account.email).toLowerCase() === email);
        if (!user) {
            window.appToast('No customer account was found for that email address.');
            return;
        }
        const fullName = (await window.appPrompt('Enter the first and last name on the account:', '', 'Verify Customer Account'))?.trim();
        if (!fullName || fullName.toLowerCase() !== `${user.fname} ${user.lname}`.trim().toLowerCase()) {
            window.appToast('The account details could not be verified.');
            return;
        }
        const password = await window.appPrompt('Enter a new password (>8 characters and containing a number):', '', 'New Password');
        if (!password) return;
        if (password.length <= 8 || !/\d/.test(password)) {
            window.appToast('Password must be more than 8 characters and contain a number.');
            return;
        }
        user.pass = password;
        localStorage.setItem('cc_registered_users', JSON.stringify(users));
        window.appToast('Password reset successfully. You can now log in.');
    };
    window.alert = showToast;
})();