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

    window.appToast = showToast;
    window.appConfirm = (message, title = 'Please Confirm') =>
        showDialog({ title, message, confirmLabel: 'Confirm' });
    window.appPrompt = (message, value = '', title = 'Enter Details') =>
        showDialog({ title, message, input: true, value, confirmLabel: 'Continue' });
    window.alert = showToast;
})();