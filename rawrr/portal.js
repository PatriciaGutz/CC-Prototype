(function () {
    const STAFF_KEY = 'cc_staff_members';
    const CONFIG_KEY = 'cc_portal_config';
    const INVENTORY_KEY = 'cc_synced_inventory';
    const QUEUE_KEY = 'cc_synced_queue';
    const HISTORY_KEY = 'cc_completed_orders_history';
    const AUDIT_KEY = 'cc_audit_log';
    const DEFAULT_CONFIG = {
        passMin: 8,
        allowSelfRegister: true,
        sessionTimeout: 0,
        openTime: '07:00 AM',
        closeTime: '07:00 PM'
    };
    const DEFAULT_INVENTORY = [
        { id: 1, name: '1 pcs Chicken w/ Java Rice & Gravy', category: 'Chicken', price: 70, stock: 40, active: true, photo: 'images/1 pcs Chicken.png' },
        { id: 2, name: '2 pcs Chicken w/ Java Rice & Gravy', category: 'Chicken', price: 120, stock: 30, active: true, photo: 'images/2 pcs Chicken.png' },
        { id: 3, name: '1 pc Chicken BBQ w/ Java Rice', category: 'Chicken', price: 75, stock: 35, active: true, photo: 'images/BBQ.png' },
        { id: 4, name: '1 pc. Chicken Shiracha w/ Java Rice', category: 'Chicken', price: 75, stock: 25, active: true, photo: 'images/Shiracha.png' },
        { id: 5, name: '1 pc. Chicken Teriyaki w/ Java Rice', category: 'Chicken', price: 75, stock: 25, active: true, photo: 'images/Teriyaki.png' },
        { id: 6, name: '1 pc. Chicken Garlic Butter w/Java Rice', category: 'Chicken', price: 75, stock: 30, active: true, photo: 'images/Garlic Butter.png' },
        { id: 7, name: '1 pc. Hungarian Sousage w/ Java Rice', category: 'Meals', price: 70, stock: 20, active: true, photo: 'images/Hungarian Sousage.png' },
        { id: 8, name: 'Iced Tea (16oz)', category: 'Drinks', price: 35, stock: 100, active: true, photo: 'images/Iced Tea.png' },
        { id: 9, name: 'Bottled Water', category: 'Drinks', price: 20, stock: 150, active: true, photo: 'images/water.png' },
        { id: 10, name: 'Crispy Chicken Sandwich', category: 'Snacks', price: 85, stock: 0, active: false, photo: 'images/Sandwich.png' }
    ];
    const roles = {
        cashier: { label: 'Cashier', short: 'Cashier', desc: 'Point of sale and order queue', icon: 'fa-cash-register', page: 'cashier.html' },
        kitchen: { label: 'Kitchen Personnel', short: 'Kitchen', desc: 'Kitchen display and inventory', icon: 'fa-fire-burner', page: 'kitchen.html' },
        owner: { label: 'Stall Owner', short: 'Owner', desc: 'Menu, sales, and stall performance', icon: 'fa-store', page: 'owner.html' },
        sysadmin: { label: 'System Administrator', short: 'System Admin', desc: 'Staff access and system settings', icon: 'fa-user-shield', page: 'sysadmin.html' }
    };

    function readStoredValue(key, fallback) {
        const value = localStorage.getItem(key);
        if (value === null) return fallback;
        try {
            return JSON.parse(value);
        } catch (error) {
            console.error(`Unable to read ${key} from local storage.`, error);
            throw error;
        }
    }

    function readList(key) {
        const value = readStoredValue(key, []);
        if (!Array.isArray(value)) throw new TypeError(`The ${key} entry must contain a list.`);
        return value;
    }

    const storedStaff = readList(STAFF_KEY);
    window.ROLES = roles;
    window.staffMembers = storedStaff;
    window.getCfg = function () {
        const config = readStoredValue(CONFIG_KEY, {});
        if (!config || typeof config !== 'object' || Array.isArray(config)) {
            throw new TypeError(`The ${CONFIG_KEY} entry must contain a configuration object.`);
        }
        return { ...DEFAULT_CONFIG, ...config };
    };
    window.saveStaffShifts = function () {
        localStorage.setItem(STAFF_KEY, JSON.stringify(window.staffMembers));
    };

    function esc(value) {
        return String(value ?? '').replace(/[&<>"']/g, char => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        })[char]);
    }

    function readInventory() {
        const saved = readStoredValue(INVENTORY_KEY, null);
        if (saved === null) {
            localStorage.setItem(INVENTORY_KEY, JSON.stringify(DEFAULT_INVENTORY));
            return DEFAULT_INVENTORY.map(item => ({ ...item }));
        }
        if (!Array.isArray(saved)) throw new TypeError(`The ${INVENTORY_KEY} entry must contain a list.`);
        return saved;
    }

    function saveInventory(inventory) {
        localStorage.setItem(INVENTORY_KEY, JSON.stringify(inventory));
        window.dispatchEvent(new Event('cc-inventory-updated'));
    }

    function readQueue() { return readList(QUEUE_KEY); }
    function saveQueue(queue) {
        localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
        window.dispatchEvent(new Event('cc-orders-updated'));
    }

    function readHistory() { return readList(HISTORY_KEY); }
    function saveHistory(history) { localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); }
    function toast(message) { if (typeof appToast === 'function') appToast(message); else window.alert(message); }

    function getStaffIdentity() {
        return {
            name: sessionStorage.getItem('logged_employee_name') || 'Staff',
            id: sessionStorage.getItem('logged_employee_id') || 'EMP-2026-001'
        };
    }

    function renderWorkspaceHeader(roleKey) {
        const header = document.getElementById('portal-header');
        const side = document.getElementById('portal-side');
        if (!header || !side) throw new Error('Workspace header or navigation element is missing.');
        const role = roles[roleKey];
        const staff = getStaffIdentity();
        header.innerHTML = `
            <div class="flex items-center gap-3">
                <img src="images/logo.png" alt="" class="w-10 h-10 rounded-full object-cover border-2 border-amber-300">
                <div><strong class="block text-sm">Campus Chicken SmartStall</strong><span class="text-[10px] text-amber-100">${esc(role.label)} Workspace</span></div>
            </div>
            <div class="flex items-center gap-3 ml-auto">
                <span class="text-right hidden sm:block"><strong class="block text-xs">${esc(staff.name)}</strong><span class="text-[10px] text-amber-100">${esc(staff.id)}</span></span>
                <button type="button" onclick="Portal.signOut()" class="bg-white/15 hover:bg-white/25 px-3 py-2 rounded-lg text-xs font-bold"><i class="fa-solid fa-right-from-bracket mr-1"></i> Sign out</button>
            </div>`;
    }

    function renderWorkspaceNavigation(roleKey, tabs) {
        const side = document.getElementById('portal-side');
        const staff = getStaffIdentity();
        const groups = [...new Set(tabs.map(tab => tab.group || 'Workspace'))];
        side.innerHTML = `
            <div class="side-brand"><img src="images/logo.png" alt=""><strong class="text-xs text-slate-800">SmartStall</strong></div>
            ${groups.map(group => `<div class="side-label">${esc(group)}</div>${tabs.filter(tab => (tab.group || 'Workspace') === group).map(tab => `
                <button type="button" data-portal-tab="${esc(tab.id)}" onclick="Portal.openTab('${esc(tab.id)}')" class="w-full text-left px-3 py-2.5 text-xs font-semibold text-slate-700 hover:bg-orange-50">
                    <i class="fa-solid ${esc(tab.icon || 'fa-circle')} mr-2 text-orange-600"></i>${esc(tab.label)}${tab.live ? '<span class="ml-2 text-[9px] text-emerald-600">LIVE</span>' : ''}
                </button>`).join('')}`).join('')}
            <div class="side-user">
                <div class="side-avatar">${esc(staff.name.slice(0, 1).toUpperCase())}</div>
                <div class="min-w-0"><strong class="block text-xs truncate">${esc(staff.name)}</strong><span class="text-[9px] text-slate-500">${esc(roles[roleKey].label)}</span></div>
            </div>`;
    }

    let currentTabs = [];
    let currentTab = '';
    let currentRole = '';
    let tabCallbacks = {};

    function openTab(tabId) {
        const tab = currentTabs.find(item => item.id === tabId);
        if (!tab) throw new Error(`Unknown workspace tab: ${tabId}`);
        currentTab = tabId;
        document.querySelectorAll('[id^="tab-content-"]').forEach(panel => {
            panel.classList.toggle('hidden', panel.id !== `tab-content-${tabId}`);
        });
        document.querySelectorAll('[data-portal-tab]').forEach(button => {
            const active = button.dataset.portalTab === tabId;
            button.classList.toggle('bg-orange-500', active);
            button.classList.toggle('text-white', active);
            button.classList.toggle('text-slate-700', !active);
        });
        if (typeof tabCallbacks[tabId] === 'function') tabCallbacks[tabId]();
    }

    const Portal = {
        onTab: {},
        init(roleKey, tabs, initialTab) {
            if (!roles[roleKey]) throw new Error(`Unknown workspace role: ${roleKey}`);
            if (!Array.isArray(tabs) || tabs.length === 0) throw new Error('Workspace must define at least one tab.');
            currentRole = roleKey;
            currentTabs = tabs;
            tabCallbacks = this.onTab || {};
            renderWorkspaceHeader(roleKey);
            renderWorkspaceNavigation(roleKey, tabs);
            const selected = tabs.some(tab => tab.id === initialTab) ? initialTab : tabs[0].id;
            openTab(selected);
        },
        openTab,
        signOut() {
            sessionStorage.removeItem('logged_employee_name');
            sessionStorage.removeItem('logged_employee_id');
            sessionStorage.removeItem('logged_employee_role');
            window.location.href = 'admin_login.html';
        },
        get role() { return currentRole; }
    };
    window.Portal = Portal;

    let inventory = readInventory();
    let posCart = {};
    let posCategory = 'All';

    function formatMoney(value) { return `₱${Number(value || 0).toFixed(2)}`; }
    function orderTotal(order) { return Number(order.total || 0); }
    function getActiveOrders() { return readQueue(); }
    function isImagePath(path) {
        return typeof path === 'string' && (path.startsWith('data:image/') || path.startsWith('images/') || path.startsWith('http'));
    }
    function imageHtml(path, className) {
        return isImagePath(path)
            ? `<img src="${esc(path)}" alt="" class="${className}">`
            : `<span class="text-3xl">${esc(path || '🍗')}</span>`;
    }

    function renderPOS() {
        const cats = document.getElementById('pos-cats');
        const grid = document.getElementById('pos-grid');
        if (!cats || !grid) return;
        inventory = readInventory();
        const categories = ['All', ...new Set(inventory.map(item => item.category || 'Other'))];
        cats.innerHTML = categories.map(category => `<button type="button" onclick="setPosCategory('${encodeURIComponent(category)}')" class="category-pill ${category === posCategory ? 'active' : ''}">${esc(category)}</button>`).join('');
        const visible = inventory.filter(item => posCategory === 'All' || item.category === posCategory);
        grid.innerHTML = visible.length ? visible.map(item => {
            const index = inventory.findIndex(entry => entry.id === item.id);
            const qty = posCart[item.name]?.qty || 0;
            const disabled = item.active === false || Number(item.stock) <= qty;
            return `<button type="button" ${disabled ? 'disabled' : ''} onclick="posAdd(${index})" class="pos-tile">
                ${qty ? `<span class="pos-qty">${qty}</span>` : ''}${imageHtml(item.photo, 'pos-img')}
                <strong>${esc(item.name)}</strong><span class="text-orange-600 font-bold">${formatMoney(item.price)}</span>
                <small>${item.active === false ? 'Unavailable' : `${Math.max(0, Number(item.stock) - qty)} left`}</small>
            </button>`;
        }).join('') : '<p class="text-center text-slate-400 text-xs py-8">No menu items yet.</p>';
        renderPosCart();
        const eta = document.getElementById('pos-eta');
        if (eta) eta.textContent = `Estimated preparation: ${Math.max(3, Math.ceil(readQueue().filter(order => order.status !== 'ready').length * 2))} min`;
    }

    function setPosCategory(category) { posCategory = decodeURIComponent(category); renderPOS(); }
    function posAdd(index) {
        const item = readInventory()[index];
        if (!item || item.active === false) return;
        const line = posCart[item.name] || { price: Number(item.price), qty: 0 };
        if (line.qty >= Number(item.stock)) { toast(`Only ${item.stock} left in stock.`); return; }
        line.qty += 1;
        posCart[item.name] = line;
        renderPOS();
    }
    function posQty(encodedName, delta) {
        const name = decodeURIComponent(encodedName);
        const item = readInventory().find(entry => entry.name === name);
        const line = posCart[name];
        if (!line) return;
        if (delta > 0 && (!item || line.qty >= Number(item.stock))) { toast(`Only ${item?.stock || 0} left in stock.`); return; }
        line.qty += delta;
        if (line.qty <= 0) delete posCart[name];
        renderPOS();
    }
    function renderPosCart() {
        const list = document.getElementById('pos-cart-list');
        const totalElement = document.getElementById('pos-total');
        if (!list || !totalElement) return;
        const entries = Object.entries(posCart);
        let total = 0;
        list.innerHTML = entries.length ? entries.map(([name, line]) => {
            total += line.price * line.qty;
            return `<div class="bg-orange-50 rounded-xl p-2.5 text-xs flex items-center justify-between gap-2">
                <div class="min-w-0"><div class="font-bold truncate">${esc(name)}</div><div>${formatMoney(line.price * line.qty)}</div></div>
                <div class="flex items-center gap-1.5"><button type="button" class="pos-step" onclick="posQty('${encodeURIComponent(name)}',-1)">−</button><strong>${line.qty}</strong><button type="button" class="pos-step" onclick="posQty('${encodeURIComponent(name)}',1)">+</button></div>
            </div>`;
        }).join('') : '<p class="text-center text-slate-400 text-xs py-8">Tap a dish to start an order.</p>';
        totalElement.textContent = formatMoney(total);
    }
    function clearPosCart() { posCart = {}; renderPOS(); }
    function placePosOrder() {
        const entries = Object.entries(posCart);
        if (!entries.length) { toast('Add at least one item to the order.'); return; }
        inventory = readInventory();
        for (const [name, line] of entries) {
            const item = inventory.find(entry => entry.name === name);
            if (!item || item.active === false || Number(item.stock) < line.qty) {
                toast(`${name} no longer has enough stock. Please review the cart.`);
                renderPOS();
                return;
            }
        }
        const orderId = typeof nextOrderId === 'function' ? nextOrderId() : String(Date.now());
        const rawItems = entries.map(([name, line]) => ({ name, qty: line.qty }));
        const order = {
            id: orderId,
            customerName: document.getElementById('pos-customer')?.value.trim() || 'Walk-In Guest',
            customerEmail: '',
            source: 'POS',
            rawItems,
            items: rawItems.map(item => `${item.qty}x ${item.name}`).join(', '),
            type: document.querySelector('input[name="pos-type"]:checked')?.value || 'Dine-in',
            pay: document.querySelector('input[name="pos-pay"]:checked')?.value || 'Cash on Pickup',
            total: entries.reduce((sum, [, line]) => sum + line.price * line.qty, 0),
            createdAt: Date.now(),
            status: 'pending'
        };
        inventory.forEach(item => {
            const line = posCart[item.name];
            if (line) item.stock = Math.max(0, Number(item.stock) - line.qty);
        });
        saveInventory(inventory);
        saveQueue([order, ...readQueue()]);
        posCart = {};
        renderPOS();
        toast(`Order #${orderId} sent to the kitchen.`);
    }

    function renderKitchenKanban() {
        const columns = {
            pending: document.getElementById('kanban-pending'),
            prep: document.getElementById('kanban-prep'),
            ready: document.getElementById('kanban-ready')
        };
        if (!columns.pending || !columns.prep || !columns.ready) return;
        const search = (document.getElementById('kitchen-search')?.value || '').trim().toLowerCase();
        const statusFilter = document.getElementById('kitchen-status-filter')?.value || 'all';
        const queue = readQueue().filter(order => {
            const status = String(order.status || 'pending').toLowerCase();
            return status !== 'completed' && (statusFilter === 'all' || status === statusFilter) &&
                `${order.id} ${order.customerName} ${order.items}`.toLowerCase().includes(search);
        });
        for (const key of Object.keys(columns)) columns[key].innerHTML = '';
        const counts = { pending: 0, prep: 0, ready: 0 };
        queue.forEach(order => {
            const status = ['pending', 'prep', 'ready'].includes(order.status) ? order.status : 'pending';
            counts[status] += 1;
            const target = columns[status];
            const items = order.rawItems?.length
                ? order.rawItems.map(item => `${Number(item.qty)}x ${esc(item.name)}`).join('<br>')
                : esc(order.items || 'Order details unavailable');
            const next = status === 'pending' ? ['prep', 'Start preparing'] : status === 'prep' ? ['ready', 'Mark ready'] : ['completed', 'Complete pickup'];
            target.insertAdjacentHTML('beforeend', `<article class="bg-white rounded-xl p-3 text-xs space-y-2 shadow">
                <div class="flex justify-between gap-2"><strong>Order #${esc(order.id)}</strong><span class="text-slate-400">${new Date(order.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div>
                <p class="text-slate-500">${esc(order.customerName || 'Walk-In Guest')} · ${esc(order.type || 'Take-out')}</p>
                <div class="text-slate-700">${items}</div>
                <div class="flex justify-between items-center border-t pt-2"><strong>${formatMoney(order.total)}</strong><button type="button" onclick="updateOrderStatus('${esc(order.id)}','${next[0]}')" class="bg-orange-500 text-white px-2.5 py-1.5 rounded-lg font-bold">${next[1]}</button></div>
            </article>`);
        });
        Object.entries(counts).forEach(([status, count]) => {
            const element = document.getElementById(`count-${status}`);
            if (element) element.textContent = String(count);
        });
    }

    function updateOrderStatus(id, newStatus) {
        const queue = readQueue();
        const index = queue.findIndex(order => String(order.id) === String(id));
        if (index < 0) { toast('That order is no longer in the active queue.'); return; }
        queue[index].status = newStatus;
        if (newStatus === 'completed') {
            const completed = queue.splice(index, 1)[0];
            saveHistory([completed, ...readHistory()]);
        }
        saveQueue(queue);
        renderKitchenKanban();
        renderAvailability();
        toast(newStatus === 'completed' ? `Order #${id} completed.` : `Order #${id} updated.`);
    }

    function renderAvailability() {
        const grid = document.getElementById('availability-grid');
        if (!grid) return;
        inventory = readInventory();
        grid.innerHTML = inventory.map(item => `<article class="panel flex items-center gap-3 !p-3">
            ${imageHtml(item.photo, 'w-12 h-12 rounded-lg object-cover')}
            <div class="min-w-0 flex-grow"><strong class="block text-xs truncate">${esc(item.name)}</strong><span class="text-[10px] text-slate-500">${item.active === false || Number(item.stock) <= 0 ? 'Out of stock' : `${Number(item.stock)} available`}</span></div>
            <strong class="text-xs text-orange-600">${formatMoney(item.price)}</strong>
        </article>`).join('');
        const queueCount = document.getElementById('avail-queue');
        const eta = document.getElementById('avail-eta');
        if (queueCount) queueCount.textContent = String(readQueue().length);
        if (eta) eta.textContent = String(Math.max(3, readQueue().length * 2));
    }

    let staffFilter = 'all';
    function renderStaff() {
        const list = document.getElementById('staff-roles-list');
        if (!list) return;
        const filters = document.getElementById('staff-filters');
        const allRoles = ['all', ...Object.keys(roles)];
        if (filters) filters.innerHTML = allRoles.map(key => `<button type="button" onclick="setStaffFilter('${key}')" class="category-pill ${key === staffFilter ? 'active' : ''}">${key === 'all' ? 'All Staff' : esc(roles[key].short)}</button>`).join('');
        list.innerHTML = staffMembers.filter(member => staffFilter === 'all' || member.roleKey === staffFilter).map(member => {
            const index = staffMembers.indexOf(member);
            const role = roles[member.roleKey]?.label || 'Unknown role';
            return `<tr class="hover:bg-orange-50/50"><td class="p-2.5 text-slate-400">${esc(member.id)}</td>
                <td class="p-2.5 font-bold">${esc(member.name)}</td><td class="p-2.5"><span class="badge-role">${esc(role)}</span></td>
                <td class="p-2.5">${esc(member.shift || '07:00 AM - 07:00 PM')}</td>
                <td class="p-2.5"><select onchange="setStaffStatus(${index},this.value)" class="bg-white border rounded p-1 text-[10px] font-bold">
                    <option ${member.status !== 'Off Duty' ? 'selected' : ''}>On Duty</option><option ${member.status === 'Off Duty' ? 'selected' : ''}>Off Duty</option></select></td>
                <td class="p-2.5 text-right"><button type="button" onclick="removeStaff(${index})" class="text-red-500" aria-label="Remove ${esc(member.name)}"><i class="fa-solid fa-trash"></i></button></td></tr>`;
        }).join('') || '<tr><td colspan="6" class="p-4 text-center text-slate-400">No staff accounts yet.</td></tr>';
    }
    function setStaffFilter(filter) { staffFilter = filter; renderStaff(); }
    function setStaffStatus(index, status) {
        if (!staffMembers[index]) return;
        staffMembers[index].status = status;
        saveStaffShifts();
        logAudit('Updated staff status', `${staffMembers[index].name}: ${status}`);
    }
    async function addStaff() {
        const name = await appPrompt('Enter the staff member’s full name:');
        if (!name) return;
        const id = (await appPrompt('Enter employee ID (EMP-YYYY-NNN):')).toUpperCase();
        if (!/^EMP-\d{4}-\d{3}$/.test(id)) { toast('Employee ID must match EMP-YYYY-NNN.'); return; }
        if (staffMembers.some(member => member.id.toUpperCase() === id)) { toast('That employee ID already exists.'); return; }
        const role = await appPrompt(`Choose a role: ${Object.keys(roles).join(', ')}`, 'cashier');
        if (!roles[role?.trim().toLowerCase()]) { toast('Choose cashier, kitchen, owner, or sysadmin.'); return; }
        staffMembers.push({ id, name: name.trim(), roleKey: role.trim().toLowerCase(), shift: '07:00 AM - 07:00 PM', status: 'On Duty' });
        saveStaffShifts();
        renderStaff();
        logAudit('Added staff account', `${name} (${role})`);
    }
    function removeStaff(index) {
        const member = staffMembers[index];
        if (!member) return;
        if (member.id === sessionStorage.getItem('logged_employee_id')) { toast('You cannot remove the account currently signed in.'); return; }
        appConfirm(`Remove ${member.name} from staff accounts?`, 'Remove Staff').then(confirmed => {
            if (!confirmed) return;
            staffMembers.splice(index, 1);
            saveStaffShifts();
            renderStaff();
            logAudit('Removed staff account', member.name);
        });
    }
    function renderMatrix() {
        const target = document.getElementById('permission-matrix');
        if (!target) return;
        target.innerHTML = `<table class="w-full text-left text-xs"><thead><tr class="bg-orange-50"><th class="p-2">Workspace</th><th class="p-2">Main access</th></tr></thead><tbody>
            ${Object.entries(roles).map(([key, role]) => `<tr><td class="p-2 font-bold">${esc(role.label)}</td><td class="p-2">${esc({
                cashier: 'POS, live order queue, and menu availability',
                kitchen: 'Kitchen display, order status, and inventory stock',
                owner: 'Menu, sales, and stall performance',
                sysadmin: 'Staff roles, security configuration, and backups'
            }[key])}</td></tr>`).join('')}
        </tbody></table>`;
    }

    function loadConfigForm() {
        const config = getCfg();
        const values = {
            'cfg-session': config.sessionTimeout,
            'cfg-passmin': config.passMin,
            'cfg-open': config.openTime,
            'cfg-close': config.closeTime
        };
        Object.entries(values).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) element.value = value;
        });
        const selfRegister = document.getElementById('cfg-selfreg');
        if (selfRegister) selfRegister.checked = Boolean(config.allowSelfRegister);
    }
    function saveConfig() {
        const passMin = Number(document.getElementById('cfg-passmin').value);
        const sessionTimeout = Number(document.getElementById('cfg-session').value);
        const openTime = document.getElementById('cfg-open').value.trim();
        const closeTime = document.getElementById('cfg-close').value.trim();
        if (!Number.isInteger(passMin) || passMin < 4 || !Number.isFinite(sessionTimeout) || sessionTimeout < 0 || !openTime || !closeTime) {
            toast('Enter a password length of at least 4, a non-negative timeout, and both operating times.');
            return;
        }
        const config = { passMin, sessionTimeout, openTime, closeTime, allowSelfRegister: document.getElementById('cfg-selfreg').checked };
        localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
        toast('Configuration saved.');
        logAudit('Updated security configuration', 'Password policy, session timeout, and operating hours');
    }
    function syncSystemSettings() {
        window.dispatchEvent(new Event('storage'));
        toast('Settings are saved locally and available to other pages in this browser.');
    }
    function pairIot() { toast('IoT pairing is not configured in this browser-only prototype.'); }

    function logAudit(action, details) {
        const log = readList(AUDIT_KEY);
        const staff = getStaffIdentity();
        log.unshift({ t: Date.now(), user: staff.name, action, details: details || '' });
        localStorage.setItem(AUDIT_KEY, JSON.stringify(log.slice(0, 200)));
        renderAudit();
    }
    function renderAudit() {
        const body = document.getElementById('audit-body');
        if (!body) return;
        const query = (document.getElementById('audit-search')?.value || '').toLowerCase();
        body.innerHTML = readList(AUDIT_KEY).filter(entry => `${entry.user} ${entry.action} ${entry.details}`.toLowerCase().includes(query))
            .map(entry => `<tr><td class="p-2.5 text-slate-500">${new Date(entry.t).toLocaleString()}</td><td class="p-2.5">${esc(entry.user)}</td><td class="p-2.5 font-bold">${esc(entry.action)}</td><td class="p-2.5">${esc(entry.details)}</td></tr>`)
            .join('') || '<tr><td colspan="4" class="p-4 text-center text-slate-400">No audit entries yet.</td></tr>';
    }
    function doBackup() {
        const data = {};
        [STAFF_KEY, CONFIG_KEY, INVENTORY_KEY, QUEUE_KEY, HISTORY_KEY, AUDIT_KEY].forEach(key => {
            data[key] = readStoredValue(key, key === INVENTORY_KEY ? DEFAULT_INVENTORY : []);
        });
        const blob = new Blob([JSON.stringify({ createdAt: new Date().toISOString(), data }, null, 2)], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `smartstall-backup-${new Date().toISOString().slice(0, 10)}.json`;
        link.click();
        URL.revokeObjectURL(link.href);
        const lastBackup = document.getElementById('last-backup');
        if (lastBackup) lastBackup.textContent = new Date().toLocaleString();
        toast('Backup downloaded.');
    }
    async function restoreBackup(input) {
        const file = input.files?.[0];
        if (!file) return;
        try {
            const backup = JSON.parse(await file.text());
            const data = backup.data || backup;
            const keys = [STAFF_KEY, CONFIG_KEY, INVENTORY_KEY, QUEUE_KEY, HISTORY_KEY, AUDIT_KEY];
            for (const key of keys) {
                if (data[key] === undefined) continue;
                if (key === CONFIG_KEY ? (!data[key] || Array.isArray(data[key]) || typeof data[key] !== 'object') : !Array.isArray(data[key])) {
                    throw new TypeError(`Backup contains invalid data for ${key}.`);
                }
            }
            if (!await appConfirm('This replaces the saved staff, menu, orders, and settings. Continue?', 'Restore Backup')) return;
            keys.forEach(key => {
                if (data[key] !== undefined) localStorage.setItem(key, JSON.stringify(data[key]));
            });
            window.location.reload();
        } catch (error) {
            console.error('Unable to restore backup.', error);
            toast(`Backup restore failed: ${error.message}`);
        }
    }
    function showLastBackup() {
        const label = document.getElementById('last-backup');
        if (label && !label.textContent.trim()) label.textContent = 'Not recorded';
    }

    function renderOwnerDashboard() {
        inventory = readInventory();
        const orders = [...readQueue(), ...readHistory()];
        const today = new Date().toDateString();
        const todayOrders = orders.filter(order => new Date(order.createdAt || 0).toDateString() === today);
        const revenue = todayOrders.reduce((sum, order) => sum + orderTotal(order), 0);
        const stats = document.getElementById('owner-stats');
        if (stats) stats.innerHTML = [
            ['Today’s Sales', formatMoney(revenue), 'fa-peso-sign'],
            ['Orders Today', String(todayOrders.length), 'fa-receipt'],
            ['Active Orders', String(readQueue().length), 'fa-fire-burner'],
            ['Menu Items', String(inventory.length), 'fa-utensils']
        ].map(([label, value, icon]) => `<article class="panel"><div class="flex justify-between text-slate-500 text-xs"><span>${label}</span><i class="fa-solid ${icon} text-orange-500"></i></div><strong class="block mt-2 text-2xl text-slate-800">${value}</strong></article>`).join('');
        const recent = document.getElementById('owner-recent-orders');
        if (recent) recent.innerHTML = [...orders].sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0)).slice(0, 8).map(order =>
            `<tr><td class="p-2.5">#${esc(order.id)}</td><td class="p-2.5">${esc(order.customerName || 'Walk-In Guest')}</td><td class="p-2.5">${esc(order.status || 'completed')}</td><td class="p-2.5">${formatMoney(order.total)}</td></tr>`
        ).join('') || '<tr><td colspan="4" class="p-4 text-center text-slate-400">No orders have been placed yet.</td></tr>';
        renderOwnerMenu();
        renderOwnerForecast();
    }

    const FORECAST_PERIODS = {
        daily: { count: 7, step: 'day', label: 'Daily' },
        weekly: { count: 8, step: 'week', label: 'Weekly' },
        monthly: { count: 6, step: 'month', label: 'Monthly' },
        annually: { count: 5, step: 'year', label: 'Annually' }
    };
    let ownerForecastPeriod = 'daily';

    function startOfPeriod(date, step) {
        const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        if (step === 'day') return start;
        if (step === 'week') {
            start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
            return start;
        }
        if (step === 'month') return new Date(date.getFullYear(), date.getMonth(), 1);
        return new Date(date.getFullYear(), 0, 1);
    }
    function shiftPeriod(date, step, amount) {
        const shifted = new Date(date);
        if (step === 'day') shifted.setDate(shifted.getDate() + amount);
        if (step === 'week') shifted.setDate(shifted.getDate() + amount * 7);
        if (step === 'month') shifted.setMonth(shifted.getMonth() + amount);
        if (step === 'year') shifted.setFullYear(shifted.getFullYear() + amount);
        return shifted;
    }
    function periodLabel(date, step) {
        if (step === 'day') return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        if (step === 'week') return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        if (step === 'month') return date.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
        return String(date.getFullYear());
    }
    function bucketFor(date, step) {
        const start = startOfPeriod(date, step);
        if (step === 'day') return start.toDateString();
        if (step === 'week') return start.toDateString();
        if (step === 'month') return `${start.getFullYear()}-${start.getMonth()}`;
        return String(start.getFullYear());
    }
    function buildForecastSeries(metric, period) {
        const config = FORECAST_PERIODS[period];
        const currentPeriod = startOfPeriod(new Date(), config.step);
        const starts = Array.from({ length: config.count }, (_, index) =>
            shiftPeriod(currentPeriod, config.step, index - config.count + 1));
        const values = starts.map(() => 0);
        const indexByKey = new Map(starts.map((date, index) => [bucketFor(date, config.step), index]));
        const orders = [...readHistory(), ...readQueue()];
        orders.forEach(order => {
            const timestamp = Number(order.createdAt);
            if (!Number.isFinite(timestamp) || timestamp <= 0) return;
            const index = indexByKey.get(bucketFor(new Date(timestamp), config.step));
            if (index === undefined) return;
            values[index] += metric === 'revenue' ? orderTotal(order) : 1;
        });
        const observations = values.filter(value => value > 0).length;
        let prediction = null;
        if (observations >= 3) {
            const meanX = (values.length - 1) / 2;
            const meanY = values.reduce((sum, value) => sum + value, 0) / values.length;
            let numerator = 0;
            let denominator = 0;
            values.forEach((value, index) => {
                numerator += (index - meanX) * (value - meanY);
                denominator += (index - meanX) ** 2;
            });
            prediction = Math.max(0, meanY + (denominator ? numerator / denominator : 0) * (values.length - meanX));
        }
        return {
            labels: starts.map(date => periodLabel(date, config.step)),
            values,
            forecastLabel: periodLabel(shiftPeriod(currentPeriod, config.step, 1), config.step),
            prediction,
            observations
        };
    }
    function renderForecastChart(targetId, series, metric) {
        const target = document.getElementById(targetId);
        if (!target) return;
        if (series.observations === 0) {
            target.innerHTML = '<p class="py-12 text-center text-xs text-slate-400">No orders recorded for these periods yet.</p>';
            return;
        }
        const width = 560;
        const height = 220;
        const margin = { top: 14, right: 20, bottom: 42, left: 58 };
        const plotWidth = width - margin.left - margin.right;
        const plotHeight = height - margin.top - margin.bottom;
        const pointCount = series.values.length + (series.prediction === null ? 0 : 1);
        const chartValues = series.prediction === null ? series.values : [...series.values, series.prediction];
        const maxValue = Math.max(1, ...chartValues);
        const yMax = maxValue * 1.15;
        const x = index => margin.left + (pointCount > 1 ? (index / (pointCount - 1)) * plotWidth : plotWidth / 2);
        const y = value => margin.top + plotHeight - (value / yMax) * plotHeight;
        const actualPath = series.values.map((value, index) => `${index ? 'L' : 'M'}${x(index)},${y(value)}`).join(' ');
        const forecastPath = series.prediction === null ? '' :
            `M${x(series.values.length - 1)},${y(series.values[series.values.length - 1])} L${x(series.values.length)},${y(series.prediction)}`;
        const grid = Array.from({ length: 4 }, (_, index) => {
            const value = (yMax * index) / 3;
            const py = y(value);
            const label = metric === 'revenue' ? formatMoney(Math.round(value)) : String(Math.round(value));
            return `<line x1="${margin.left}" y1="${py}" x2="${width - margin.right}" y2="${py}" stroke="#e2e8f0"/>
                <text x="${margin.left - 8}" y="${py + 4}" text-anchor="end" fill="#64748b" font-size="10">${esc(label)}</text>`;
        }).join('');
        const labels = [...series.labels, ...(series.prediction === null ? [] : [series.forecastLabel])];
        target.innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${metric === 'revenue' ? 'Revenue' : 'Order volume'} ${esc(FORECAST_PERIODS[ownerForecastPeriod].label.toLowerCase())} trend chart" class="w-full min-w-[420px]">
            ${grid}
            <path d="${actualPath}" fill="none" stroke="#ea580c" stroke-width="3"/>
            ${series.values.map((value, index) => `<circle cx="${x(index)}" cy="${y(value)}" r="4" fill="#ea580c"><title>${esc(series.labels[index])}: ${metric === 'revenue' ? formatMoney(value) : `${value} orders`}</title></circle>`).join('')}
            ${series.prediction === null ? '' : `<path d="${forecastPath}" fill="none" stroke="#2563eb" stroke-width="3" stroke-dasharray="7 5"/><circle cx="${x(series.values.length)}" cy="${y(series.prediction)}" r="5" fill="#2563eb"><title>Forecast ${esc(series.forecastLabel)}: ${metric === 'revenue' ? formatMoney(series.prediction) : `${series.prediction.toFixed(1)} orders`}</title></circle>`}
            ${labels.map((label, index) => `<text x="${x(index)}" y="${height - 15}" text-anchor="middle" fill="${index === labels.length - 1 && series.prediction !== null ? '#2563eb' : '#64748b'}" font-size="10">${esc(label)}</text>`).join('')}
        </svg>
        <div class="flex gap-4 text-[10px] text-slate-500 mt-1"><span><i class="inline-block w-3 h-0.5 bg-orange-600 align-middle mr-1"></i>Actual</span>${series.prediction === null ? '' : '<span><i class="inline-block w-3 h-0.5 bg-blue-600 align-middle mr-1"></i>Forecast</span>'}</div>`;
    }
    function renderOwnerForecast() {
        const period = FORECAST_PERIODS[ownerForecastPeriod] ? ownerForecastPeriod : 'daily';
        const revenue = buildForecastSeries('revenue', period);
        const orders = buildForecastSeries('orders', period);
        renderForecastChart('owner-revenue-chart', revenue, 'revenue');
        renderForecastChart('owner-orders-chart', orders, 'orders');
        const summary = document.getElementById('owner-forecast-summary');
        if (summary) {
            const label = FORECAST_PERIODS[period].label.toLowerCase();
            summary.textContent = revenue.prediction === null
                ? `Not enough ${label} order history for a forecast yet. At least 3 periods with orders are needed.`
                : `Next ${label} estimate: ${formatMoney(revenue.prediction)} revenue and ${orders.prediction.toFixed(1)} orders, based on ${revenue.observations} ${label} periods with recorded sales.`;
        }
        document.querySelectorAll('[data-forecast-period]').forEach(button => {
            const active = button.dataset.forecastPeriod === period;
            button.classList.toggle('active', active);
        });
    }
    function setOwnerForecastPeriod(period) {
        if (!FORECAST_PERIODS[period]) return;
        ownerForecastPeriod = period;
        renderOwnerForecast();
    }

    function renderOwnerMenu() {
        const body = document.getElementById('owner-menu');
        if (!body) return;
        body.innerHTML = readInventory().map((item, index) => `<tr>
            <td class="p-2.5">${imageHtml(item.photo, 'inventory-photo')}</td><td class="p-2.5 font-bold">${esc(item.name)}</td><td class="p-2.5">${esc(item.category)}</td>
            <td class="p-2.5">${formatMoney(item.price)}</td><td class="p-2.5">${Number(item.stock)}</td>
            <td class="p-2.5">${item.active === false ? 'Unavailable' : 'Available'}</td>
            <td class="p-2.5 text-right"><button type="button" onclick="openOwnerMenuEditor(${index})" class="text-orange-600 font-bold"><i class="fa-solid fa-pen mr-1"></i>Edit</button></td>
        </tr>`).join('');
    }
    function renderOwnerOrders() {
        renderOwnerDashboard();
        const orders = [...readQueue(), ...readHistory()].sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
        const body = document.getElementById('owner-all-orders');
        if (body) body.innerHTML = orders.map(order => `<tr>
            <td class="p-2.5">#${esc(order.id)}</td><td class="p-2.5">${esc(order.customerName || 'Walk-In Guest')}</td>
            <td class="p-2.5">${esc(order.status || 'completed')}</td><td class="p-2.5">${formatMoney(order.total)}</td>
        </tr>`).join('') || '<tr><td colspan="4" class="p-4 text-center text-slate-400">No orders have been placed yet.</td></tr>';
        const stats = document.getElementById('owner-stats-orders');
        if (stats) {
            const history = readHistory();
            const active = readQueue();
            const totalSales = history.reduce((sum, order) => sum + orderTotal(order), 0);
            stats.innerHTML = [
                ['Completed Sales', formatMoney(totalSales)],
                ['Completed Orders', String(history.length)],
                ['Active Orders', String(active.length)]
            ].map(([label, value]) => `<article class="panel"><span class="text-xs text-slate-500">${label}</span><strong class="block mt-2 text-xl">${value}</strong></article>`).join('');
        }
    }
    let editingMenuIndex = null;
    let menuPhotoDraft = '';
    function openOwnerMenuEditor(index = null) {
        const editor = document.getElementById('owner-menu-editor');
        if (!editor) return;
        const item = index === null ? null : readInventory()[index];
        if (index !== null && !item) return;
        editingMenuIndex = index;
        menuPhotoDraft = item?.photo || '';
        document.getElementById('owner-menu-editor-title').textContent = item ? 'Edit Menu Item' : 'Add Menu Item';
        document.getElementById('owner-menu-name').value = item?.name || '';
        document.getElementById('owner-menu-category').value = item?.category || '';
        document.getElementById('owner-menu-price').value = item?.price ?? '';
        document.getElementById('owner-menu-stock').value = item?.stock ?? 0;
        document.getElementById('owner-menu-active').checked = item ? item.active !== false : true;
        document.getElementById('owner-menu-photo-file').value = '';
        const preview = document.getElementById('owner-menu-photo-preview');
        preview.src = isImagePath(menuPhotoDraft) ? menuPhotoDraft : '';
        preview.classList.toggle('hidden', !preview.src);
        editor.classList.remove('hidden');
        document.getElementById('owner-menu-name').focus();
    }
    function closeOwnerMenuEditor() {
        document.getElementById('owner-menu-editor')?.classList.add('hidden');
        editingMenuIndex = null;
        menuPhotoDraft = '';
    }
    function previewOwnerMenuPhoto(event) {
        const file = event.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            toast('Choose an image file.');
            event.target.value = '';
            return;
        }
        const reader = new FileReader();
        reader.onerror = () => toast('Could not read the selected image.');
        reader.onload = () => {
            const image = new Image();
            image.onerror = () => toast('The selected file is not a valid image.');
            image.onload = () => {
                const scale = Math.min(1, 800 / Math.max(image.naturalWidth, image.naturalHeight));
                const canvas = document.createElement('canvas');
                canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
                canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
                const context = canvas.getContext('2d');
                if (!context) {
                    toast('Could not prepare the selected image.');
                    return;
                }
                context.fillStyle = '#ffffff';
                context.fillRect(0, 0, canvas.width, canvas.height);
                context.drawImage(image, 0, 0, canvas.width, canvas.height);
                menuPhotoDraft = canvas.toDataURL('image/jpeg', 0.78);
                const preview = document.getElementById('owner-menu-photo-preview');
                preview.src = menuPhotoDraft;
                preview.classList.remove('hidden');
            };
            image.src = reader.result;
        };
        reader.readAsDataURL(file);
    }
    function saveOwnerMenuItem() {
        const name = document.getElementById('owner-menu-name').value.trim();
        const category = document.getElementById('owner-menu-category').value.trim();
        const price = Number(document.getElementById('owner-menu-price').value);
        const stock = Number(document.getElementById('owner-menu-stock').value);
        const active = document.getElementById('owner-menu-active').checked;
        if (!name || !category || !Number.isFinite(price) || price < 0 || !Number.isInteger(stock) || stock < 0) {
            toast('Enter a name, category, non-negative price, and non-negative whole-number stock.');
            return;
        }
        const items = readInventory();
        const duplicate = items.some((item, index) => item.name.toLowerCase() === name.toLowerCase() && index !== editingMenuIndex);
        if (duplicate) {
            toast('A menu item with that name already exists.');
            return;
        }
        const existing = editingMenuIndex === null ? null : items[editingMenuIndex];
        if (editingMenuIndex !== null && !existing) {
            toast('This menu item no longer exists. Refresh and try again.');
            closeOwnerMenuEditor();
            return;
        }
        const item = {
            ...(existing || {}),
            id: existing?.id ?? Math.max(0, ...items.map(entry => Number(entry.id) || 0)) + 1,
            name,
            category,
            price,
            stock,
            active,
            photo: menuPhotoDraft || existing?.photo || '🍗'
        };
        if (existing) items[editingMenuIndex] = item;
        else items.push(item);
        try {
            saveInventory(items);
        } catch (error) {
            console.error('Unable to save the menu item.', error);
            toast('The menu item could not be saved. Try a smaller image or free browser storage.');
            return;
        }
        closeOwnerMenuEditor();
        renderOwnerMenu();
        renderOwnerDashboard();
        renderAvailability();
        toast(existing ? 'Menu item updated.' : 'Menu item added.');
    }

    function expose(name, value) { window[name] = value; }
    [
        ['setPosCategory', setPosCategory], ['renderPOS', renderPOS], ['posAdd', posAdd], ['posQty', posQty],
        ['clearPosCart', clearPosCart], ['placePosOrder', placePosOrder], ['renderKitchenKanban', renderKitchenKanban],
        ['updateOrderStatus', updateOrderStatus], ['renderAvailability', renderAvailability],
        ['renderStaff', renderStaff], ['setStaffFilter', setStaffFilter],
        ['setStaffStatus', setStaffStatus], ['addStaff', addStaff], ['removeStaff', removeStaff],
        ['renderMatrix', renderMatrix], ['loadConfigForm', loadConfigForm], ['saveConfig', saveConfig],
        ['syncSystemSettings', syncSystemSettings], ['pairIot', pairIot], ['logAudit', logAudit],
        ['renderAudit', renderAudit], ['doBackup', doBackup], ['restoreBackup', restoreBackup],
        ['showLastBackup', showLastBackup], ['renderOwnerDashboard', renderOwnerDashboard],
        ['renderOwnerMenu', renderOwnerMenu], ['renderOwnerOrders', renderOwnerOrders],
        ['setOwnerForecastPeriod', setOwnerForecastPeriod], ['openOwnerMenuEditor', openOwnerMenuEditor],
        ['closeOwnerMenuEditor', closeOwnerMenuEditor], ['previewOwnerMenuPhoto', previewOwnerMenuPhoto],
        ['saveOwnerMenuItem', saveOwnerMenuItem]
    ].forEach(([name, value]) => expose(name, value));

    window.addEventListener('storage', event => {
        if (!event.key || [INVENTORY_KEY, QUEUE_KEY, HISTORY_KEY].includes(event.key)) {
            if (currentRole === 'cashier') {
                if (currentTab === 'pos') renderPOS();
                if (currentTab === 'queue') renderKitchenKanban();
                if (currentTab === 'availability') renderAvailability();
            }
            if (currentRole === 'kitchen') {
                if (currentTab === 'kds') renderKitchenKanban();
            }
            if (currentRole === 'owner') {
                if (currentTab === 'overview') renderOwnerDashboard();
                if (currentTab === 'menu') renderOwnerMenu();
                if (currentTab === 'orders') renderOwnerOrders();
            }
        }
    });
})();
