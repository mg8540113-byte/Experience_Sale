/* ============================================
   WMS ליקוט חכם - לוגיקה ראשית
   ניווט, אירועים, וממשק משתמש
   ============================================ */

// ---------- סיסמה ----------
const APP_PASSWORD = 'mg9196';

// ---------- אתחול ----------

document.addEventListener('DOMContentLoaded', () => {
    // בדיקת התחברות קודמת
    if (sessionStorage.getItem('wms_logged_in') === 'true') {
        showApp();
    } else {
        showLogin();
    }

    // אתחול מסך כניסה
    initLogin();
});

function showLogin() {
    document.getElementById('loginScreen')?.classList.remove('hidden');
    document.getElementById('appContainer')?.classList.add('hidden');
}

function showApp() {
    document.getElementById('loginScreen')?.classList.add('hidden');
    document.getElementById('appContainer')?.classList.remove('hidden');

    // טעינת נתוני דוגמה (לפיתוח)
    DataManager.loadSampleData();

    // אתחול ממשק
    initNavigation();
    initOrdersScreen();
    initOrderForm();
    initManagementHub();
    initProductsManagement();
    initCartonTypesManagement();
    initVisualMap();
    initOrdersManagement();
    initBeltsManagement();
    initModal();
    initExcelImport();

    // טעינת מסך ראשי
    showScreen('orders-dashboard');
    refreshOrdersTable();
}

function initLogin() {
    const loginForm = document.getElementById('loginForm');
    const passwordInput = document.getElementById('passwordInput');
    const loginError = document.getElementById('loginError');
    const logoutBtn = document.getElementById('logoutBtn');

    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const password = passwordInput.value;

            if (password === APP_PASSWORD) {
                sessionStorage.setItem('wms_logged_in', 'true');
                loginError?.classList.add('hidden');
                showApp();
            } else {
                loginError?.classList.remove('hidden');
                passwordInput.value = '';
                passwordInput.focus();
            }
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            sessionStorage.removeItem('wms_logged_in');
            location.reload();
        });
    }
}


// ---------- ניווט ----------

let currentScreen = 'orders-dashboard';
let currentOrderId = null; // ID של הזמנה בעריכה

/**
 * מעבר בין מסכים
 */
function showScreen(screenId) {
    // הסתר את כל המסכים
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.add('hidden');
    });

    // הצג את המסך המבוקש
    const screen = document.getElementById(screenId);
    if (screen) {
        screen.classList.remove('hidden');
        currentScreen = screenId;
    }

    // עדכן את הניווט הפעיל
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.dataset.screen === screenId) {
            link.classList.add('active');
        }
    });

    // הצג/הסתר כפתור הדפסה
    const printBtn = document.getElementById('printCartonsBtn');
    if (printBtn) {
        printBtn.style.display = screenId === 'results-view' ? 'inline-flex' : 'none';
    }
}

/**
 * אתחול ניווט
 */
function initNavigation() {
    // לחיצה על קישורי ניווט
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const screenId = link.dataset.screen;
            if (screenId) {
                showScreen(screenId);
                if (screenId === 'orders-dashboard') {
                    refreshOrdersTable();
                }
            }
        });
    });

    // כפתור הדפסה
    const printBtn = document.getElementById('printCartonsBtn');
    if (printBtn) {
        printBtn.addEventListener('click', () => {
            window.print();
        });
    }
}

// ---------- לוח הזמנות ----------

function initOrdersScreen() {
    const newOrderBtn = document.getElementById('newOrderBtn');
    if (newOrderBtn) {
        newOrderBtn.addEventListener('click', () => {
            openOrderForm();
        });
    }
}

/**
 * רענון טבלת הזמנות
 */
function refreshOrdersTable() {
    const tbody = document.getElementById('ordersTableBody');
    const emptyState = document.getElementById('ordersEmptyState');
    const orders = DataManager.getOrders();

    if (orders.length === 0) {
        tbody.innerHTML = '';
        if (emptyState) emptyState.style.display = 'block';
        return;
    }

    if (emptyState) emptyState.style.display = 'none';

    tbody.innerHTML = orders.map(order => {
        const itemsCount = order.items ? order.items.reduce((sum, i) => sum + i.quantity, 0) : 0;
        const cartonsCount = order.cartons ? order.cartons.length : 0;

        return `
            <tr data-id="${order.id}">
                <td><strong>${escapeHtml(order.orderNumber)}</strong></td>
                <td>${escapeHtml(order.customerName)}</td>
                <td>${escapeHtml(order.address || '-')}</td>
                <td>${escapeHtml(order.deliveryLine || '-')}</td>
                <td>${itemsCount} פריטים</td>
                <td>${cartonsCount} קרטונים</td>
                <td>
                    <button class="btn btn-primary btn-small" onclick="viewOrder('${order.id}')">
                        הצג/הדפס
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// ---------- טופס הזמנה ----------

function initOrderForm() {
    const form = document.getElementById('orderFormElement');
    const cancelBtn = document.getElementById('cancelOrderBtn');

    if (form) {
        form.addEventListener('submit', handleOrderSubmit);
    }

    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            showScreen('orders-dashboard');
            resetOrderForm();
        });
    }
}

/**
 * פתיחת טופס הזמנה (חדשה או לעריכה)
 */
function openOrderForm(orderId = null) {
    currentOrderId = orderId;
    const titleEl = document.getElementById('orderFormTitle');

    if (orderId) {
        // מצב עריכה
        const order = DataManager.getOrderById(orderId);
        if (!order) {
            alert('הזמנה לא נמצאה');
            return;
        }

        titleEl.textContent = `עריכת הזמנה: ${order.orderNumber}`;
        document.getElementById('editingOrderId').value = orderId;
        document.getElementById('customerName').value = order.customerName;
        document.getElementById('deliveryAddress').value = order.address || '';
        document.getElementById('deliveryLine').value = order.deliveryLine || '';

        // המרת פריטים לטקסט
        const itemsText = order.items.map(i => `${i.sku}, ${i.quantity}`).join('\n');
        document.getElementById('productsList').value = itemsText;
    } else {
        // מצב יצירה
        titleEl.textContent = 'יצירת הזמנה חדשה';
        resetOrderForm();
    }

    showScreen('order-form');
}

/**
 * איפוס טופס הזמנה
 */
function resetOrderForm() {
    document.getElementById('orderFormElement').reset();
    document.getElementById('editingOrderId').value = '';
    currentOrderId = null;
}

/**
 * טיפול בשליחת טופס הזמנה
 */
function handleOrderSubmit(e) {
    e.preventDefault();

    const customerName = document.getElementById('customerName').value.trim();
    const address = document.getElementById('deliveryAddress').value.trim();
    const deliveryLine = document.getElementById('deliveryLine').value.trim();
    const productsText = document.getElementById('productsList').value.trim();

    // פרסר רשימת מוצרים
    const items = parseProductsList(productsText);
    if (items.length === 0) {
        alert('יש להזין רשימת מוצרים תקינה');
        return;
    }

    // חישוב קרטונים
    const products = DataManager.getProducts();
    const cartonTypes = DataManager.getCartonTypes();
    const cartons = PackingAlgorithm.packOrder(items, products, cartonTypes);

    // יצירת/עדכון הזמנה (מספר הזמנה נוצר אוטומטית)
    const orderData = {
        customerName,
        address,
        deliveryLine,
        items,
        cartons
    };

    let order;
    if (currentOrderId) {
        order = DataManager.updateOrder(currentOrderId, orderData);
    } else {
        order = DataManager.addOrder(orderData);
    }

    if (order) {
        // מעבר למסך תוצאות
        showResultsScreen(order);
    } else {
        alert('שגיאה בשמירת ההזמנה');
    }
}

/**
 * פרסור רשימת מוצרים מטקסט
 */
function parseProductsList(text) {
    const lines = text.split('\n').filter(line => line.trim());
    const items = [];

    for (const line of lines) {
        // תומך בפורמטים: "מק"ט, כמות" או "מק"ט כמות" או "מק"ט"
        const parts = line.split(/[,\s]+/).filter(p => p.trim());

        if (parts.length >= 1) {
            const sku = parts[0].trim();
            const quantity = parts.length >= 2 ? parseInt(parts[1]) : 1;

            if (sku && !isNaN(quantity) && quantity > 0) {
                items.push({ sku, quantity });
            }
        }
    }

    return items;
}

// ---------- מסך תוצאות ----------

/**
 * הצגת מסך תוצאות עבור הזמנה
 */
function showResultsScreen(order) {
    const titleEl = document.getElementById('resultsTitle');
    const summaryEl = document.getElementById('resultsSummary');
    const gridEl = document.getElementById('cartonsGrid');

    titleEl.textContent = `תוצאות הזמנה: ${order.orderNumber}`;

    // סיכום
    const totalItems = order.items.reduce((sum, i) => sum + i.quantity, 0);
    summaryEl.innerHTML = `
        <div>
            <h2>📦 ${order.cartons.length} קרטונים</h2>
            <span>${order.customerName} | ${totalItems} פריטים</span>
        </div>
    `;

    // כרטיסי קרטון
    gridEl.innerHTML = order.cartons.map(carton => {
        const utilization = PackingAlgorithm.getUtilization(carton);
        const utilizationPercent = Math.round(utilization * 100);
        const utilizationClass = PackingAlgorithm.getUtilizationClass(utilization);
        const beltRange = PackingAlgorithm.getBeltRange(carton);

        return `
            <div class="carton-card">
                <!-- כותרת מודרנית ומינימליסטית - עיצוב v2 -->
                <div class="carton-header-clean">
                    
                    <!-- שורה עליונה: תאריך ולקוח -->
                    <div class="header-meta-row">
                        <div class="meta-left">
                            <span class="label">לקוח:</span>
                            <span class="value big-customer">${escapeHtml(order.customerName)}</span>
                        </div>
                        <div class="meta-right">
                           <span class="print-timestamp">${new Date().toLocaleDateString('he-IL')}</span>
                        </div>
                    </div>

                    <!-- מרכז: מספר הזמנה גדול -->
                    <div class="header-center-hero">
                        <div class="hero-label">הזמנה</div>
                        <div class="hero-value">${escapeHtml(order.orderNumber)}</div>
                    </div>

                    <!-- שורה תחתונה: פרטי קרטון ולוגיסטיקה -->
                    <div class="header-info-bar">
                        <div class="info-block">
                            <span class="block-label">קרטון</span>
                            <span class="block-value box-highlight">${carton.number} <span class="of-total">/ ${order.cartons.length}</span></span>
                        </div>
                        <div class="info-block">
                            <span class="block-label">סוג</span>
                            <span class="block-value">${carton.type}</span>
                        </div>
                         <div class="info-block">
                            <span class="block-label">ליין</span>
                            <span class="block-value">${beltRange}</span>
                        </div>
                        <div class="info-block">
                            <span class="block-label">קו חלוקה</span>
                            <span class="block-value">${escapeHtml(order.deliveryLine || '-')}</span>
                        </div>
                    </div>
                </div>

                <div class="carton-body clean-body">
                    <div class="carton-items">
                        <table class="clean-table">
                            <thead>
                                <tr>
                                    <th class="col-check">✔</th>
                                    <th class="col-sku">מק"ט</th>
                                    <th class="col-name">תיאור מוצר</th>
                                    <th class="col-qty">כמות</th>
                                    <th class="col-loc">מיקום</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${carton.items.map(item => `
                                    <tr>
                                        <td class="col-check"><div class="square-check"></div></td>
                                        <td class="col-sku">${escapeHtml(item.sku)}</td>
                                        <td class="col-name">${escapeHtml(item.name)}</td>
                                        <td class="col-qty">${item.quantity}</td>
                                        <td class="col-loc">ליין ${item.belt}-${item.position}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    showScreen('results-view');
}

/**
 * צפייה בהזמנה קיימת
 */
function viewOrder(orderId) {
    const order = DataManager.getOrderById(orderId);
    if (order) {
        // אם אין קרטונים, חשב אותם
        if (!order.cartons || order.cartons.length === 0) {
            const products = DataManager.getProducts();
            const cartonTypes = DataManager.getCartonTypes();
            order.cartons = PackingAlgorithm.packOrder(order.items, products, cartonTypes);
            DataManager.updateOrder(orderId, { cartons: order.cartons });
        }
        showResultsScreen(order);
    }
}

// כפתור חזרה ללוח ההזמנות
document.getElementById('backToOrdersBtn')?.addEventListener('click', () => {
    showScreen('orders-dashboard');
    refreshOrdersTable();
});

// ---------- מרכז ניהול ----------

function initManagementHub() {
    document.querySelectorAll('.hub-tile').forEach(tile => {
        tile.addEventListener('click', () => {
            const panelId = tile.dataset.panel;
            if (panelId) {
                showScreen(panelId);

                // רענון הפאנל המתאים
                if (panelId === 'products-management') refreshProductsTable();
                if (panelId === 'carton-types') refreshCartonTypesTable();
                if (panelId === 'visual-map') refreshVisualMap();
                if (panelId === 'orders-management') refreshOrdersManagementTable();
                if (panelId === 'belts-management') refreshBeltsTable();
            }
        });
    });
}

// ---------- ניהול מוצרים ----------

function initProductsManagement() {
    const addBtn = document.getElementById('addProductBtn');
    const searchInput = document.getElementById('productSearch');
    const beltFilter = document.getElementById('beltFilter');

    if (addBtn) {
        addBtn.addEventListener('click', () => openProductModal());
    }

    if (searchInput) {
        searchInput.addEventListener('input', debounce(() => {
            refreshProductsTable();
        }, 300));
    }

    if (beltFilter) {
        beltFilter.addEventListener('change', refreshProductsTable);
    }
}

function refreshProductsTable() {
    const tbody = document.getElementById('productsTableBody');
    const searchQuery = document.getElementById('productSearch')?.value || '';
    const beltValue = document.getElementById('beltFilter')?.value || '';

    const products = DataManager.searchProducts(searchQuery, beltValue ? parseInt(beltValue) : null);

    const belts = DataManager.getBelts();

    tbody.innerHTML = products.map(product => {
        const beltObj = belts.find(b => b.number === product.belt);
        // הצג את שם הליין אם קיים, אחרת הצג "סרט X"
        const beltDisplay = beltObj ? beltObj.name : (product.belt ? `ליין ${product.belt}` : '-');

        return `
        <tr data-id="${product.id}">
            <td><strong>${escapeHtml(product.sku)}</strong></td>
            <td>${escapeHtml(product.name)}</td>
            <td>${product.volume || '-'}</td>
            <td>${escapeHtml(beltDisplay)}</td>
            <td>מיקום ${product.position || '-'}</td>
            <td>
                <button class="btn btn-secondary btn-small" onclick="openProductModal('${product.id}')">
                    ערוך
                </button>
            </td>
        </tr>
    `;
    }).join('');

    // עדכון סינון סרטים
    refreshBeltFilter();
}

function refreshBeltFilter() {
    const select = document.getElementById('beltFilter');
    if (!select) return;

    const belts = DataManager.getBelts();
    const currentValue = select.value;

    select.innerHTML = '<option value="">כל הליינים</option>' +
        belts.map(belt => `<option value="${belt.number}">ליין ${belt.number}</option>`).join('');

    select.value = currentValue;
}

function openProductModal(productId = null) {
    const product = productId ? DataManager.getProducts().find(p => p.id === productId) : null;
    const isEdit = !!product;

    const content = `
        <form id="productForm">
            <input type="hidden" id="productId" value="${product?.id || ''}">
            
            <div class="form-group">
                <label for="productSku">מק"ט *</label>
                <input type="text" id="productSku" value="${product?.sku || ''}" required>
            </div>
            
            <div class="form-group">
                <label for="productName">שם מוצר *</label>
                <input type="text" id="productName" value="${product?.name || ''}" required>
            </div>
            
            <div class="form-group">
                <label for="productVolume">נפח (סמ"ק)</label>
                <input type="number" id="productVolume" value="${product?.volume || ''}" min="1">
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label for="productBelt">ליין</label>
                    <input type="number" id="productBelt" value="${product?.belt || ''}" min="1">
                </div>
                <div class="form-group">
                    <label for="productPosition">מיקום</label>
                    <input type="number" id="productPosition" value="${product?.position || ''}" min="1">
                </div>
            </div>
            
            <div class="form-actions" style="gap: 1rem;">
                <button type="submit" class="btn btn-primary">שמור</button>
                ${isEdit ? '<button type="button" class="btn btn-danger" onclick="deleteProduct(\'' + product.id + '\')">מחק</button>' : ''}
            </div>
        </form>
    `;

    openModal(isEdit ? 'עריכת מוצר' : 'הוספת מוצר חדש', content);

    document.getElementById('productForm').addEventListener('submit', handleProductSubmit);
}

function handleProductSubmit(e) {
    e.preventDefault();

    const id = document.getElementById('productId').value;
    const data = {
        sku: document.getElementById('productSku').value.trim(),
        name: document.getElementById('productName').value.trim(),
        volume: parseInt(document.getElementById('productVolume').value) || 500,
        belt: parseInt(document.getElementById('productBelt').value) || 1,
        position: parseInt(document.getElementById('productPosition').value) || 1
    };

    if (id) {
        DataManager.updateProduct(id, data);
    } else {
        DataManager.addProduct(data);
    }

    closeModal();
    refreshProductsTable();
}

function deleteProduct(id) {
    if (confirm('האם למחוק את המוצר?')) {
        DataManager.deleteProduct(id);
        closeModal();
        refreshProductsTable();
    }
}

// ---------- סוגי קרטונים ----------

function initCartonTypesManagement() {
    const addBtn = document.getElementById('addCartonTypeBtn');
    if (addBtn) {
        addBtn.addEventListener('click', () => openCartonTypeModal());
    }
}

function refreshCartonTypesTable() {
    const tbody = document.getElementById('cartonTypesTableBody');
    const types = DataManager.getCartonTypes();

    tbody.innerHTML = types.map(type => `
        <tr data-id="${type.id}">
            <td><strong>${escapeHtml(type.name)}</strong></td>
            <td>${type.maxVolume.toLocaleString()} סמ"ק</td>
            <td>${type.maxWeight} ק"ג</td>
            <td>
                <button class="btn btn-secondary btn-small" onclick="openCartonTypeModal('${type.id}')">
                    ערוך
                </button>
            </td>
        </tr>
    `).join('');
}

function openCartonTypeModal(typeId = null) {
    const type = typeId ? DataManager.getCartonTypes().find(t => t.id === typeId) : null;
    const isEdit = !!type;

    const content = `
        <form id="cartonTypeForm">
            <input type="hidden" id="cartonTypeId" value="${type?.id || ''}">
            
            <div class="form-group">
                <label for="cartonTypeName">שם הקרטון *</label>
                <input type="text" id="cartonTypeName" value="${type?.name || ''}" required placeholder="לדוגמה: S, M, L, XL">
            </div>
            
            <div class="form-group">
                <label for="cartonTypeVolume">נפח מקסימלי (סמ"ק) *</label>
                <input type="number" id="cartonTypeVolume" value="${type?.maxVolume || ''}" required min="1">
            </div>
            
            <div class="form-group">
                <label for="cartonTypeWeight">משקל מקסימלי (ק"ג) *</label>
                <input type="number" id="cartonTypeWeight" value="${type?.maxWeight || ''}" required min="1">
            </div>
            
            <div class="form-actions" style="gap: 1rem;">
                <button type="submit" class="btn btn-primary">שמור</button>
                ${isEdit ? '<button type="button" class="btn btn-danger" onclick="deleteCartonType(\'' + type.id + '\')">מחק</button>' : ''}
            </div>
        </form>
    `;

    openModal(isEdit ? 'עריכת סוג קרטון' : 'הוספת סוג קרטון', content);

    document.getElementById('cartonTypeForm').addEventListener('submit', handleCartonTypeSubmit);
}

function handleCartonTypeSubmit(e) {
    e.preventDefault();

    const id = document.getElementById('cartonTypeId').value;
    const data = {
        name: document.getElementById('cartonTypeName').value.trim(),
        maxVolume: parseInt(document.getElementById('cartonTypeVolume').value),
        maxWeight: parseInt(document.getElementById('cartonTypeWeight').value)
    };

    if (id) {
        DataManager.updateCartonType(id, data);
    } else {
        DataManager.addCartonType(data);
    }

    closeModal();
    refreshCartonTypesTable();
}

function deleteCartonType(id) {
    if (confirm('האם למחוק את סוג הקרטון?')) {
        DataManager.deleteCartonType(id);
        closeModal();
        refreshCartonTypesTable();
    }
}

// ---------- מפה ויזואלית ----------

function initVisualMap() {
    // אתחול בסיסי
}

function refreshVisualMap() {
    const container = document.getElementById('warehouseMap');
    const belts = DataManager.getBelts();

    // יצירת שני טורים של ליינים
    container.innerHTML = `
        <div class="warehouse-columns">
            ${belts.map(belt => {
        const products = DataManager.getProductsByBelt(belt.number);

        return `
                    <div class="lane-column">
                        <div class="lane-header">
                            <span class="lane-number">${belt.number}</span>
                            <span class="lane-title">${belt.name || 'ליין ' + belt.number}</span>
                            <span class="lane-count">${products.length} מוצרים</span>
                        </div>
                        <div class="lane-products">
                            ${products.length === 0 ? '<div class="lane-empty">אין מוצרים בליין זה</div>' : ''}
                            ${products.map(product => `
                                <div class="lane-product" onclick="openProductModal('${product.id}')">
                                    <div class="product-position">${product.position || '-'}</div>
                                    <div class="product-info">
                                        <div class="product-sku">${escapeHtml(product.sku)}</div>
                                        <div class="product-name">${escapeHtml(product.name)}</div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
    }).join('')}
        </div>
    `;
}



// ---------- ניהול הזמנות מתקדם ----------

function initOrdersManagement() {
    // אתחול בסיסי
}

function refreshOrdersManagementTable() {
    const tbody = document.getElementById('ordersManagementTableBody');
    const orders = DataManager.getOrders();

    tbody.innerHTML = orders.map(order => `
        <tr data-id="${order.id}">
            <td><strong>${escapeHtml(order.orderNumber)}</strong></td>
            <td>${escapeHtml(order.customerName)}</td>
            <td>${new Date(order.createdAt).toLocaleDateString('he-IL')}</td>
            <td>${order.status || 'חדשה'}</td>
            <td>
                <button class="btn btn-secondary btn-small" onclick="viewOrder('${order.id}')">הצג</button>
                <button class="btn btn-primary btn-small" onclick="editOrder('${order.id}')">ערוך</button>
                <button class="btn btn-danger btn-small" onclick="deleteOrder('${order.id}')">מחק</button>
            </td>
        </tr>
    `).join('');
}

function editOrder(orderId) {
    openOrderForm(orderId);
}

function deleteOrder(orderId) {
    if (confirm('האם למחוק את ההזמנה?')) {
        DataManager.deleteOrder(orderId);
        refreshOrdersManagementTable();
        refreshOrdersTable();
    }
}

// ---------- מודל/פופאפ ----------

function initModal() {
    const overlay = document.getElementById('modalOverlay');
    const closeBtn = document.getElementById('modalClose');

    if (overlay) {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeModal();
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', closeModal);
    }

    // סגירה עם ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });
}

function openModal(title, content) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').innerHTML = content;
    document.getElementById('modalOverlay').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('modalOverlay').classList.add('hidden');
}

// ---------- פונקציות עזר ----------

/**
 * הגנה מ-XSS
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * דיבאונס לחיפוש
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ייצוא פונקציות גלובליות
window.showScreen = showScreen;
window.openOrderForm = openOrderForm;
window.viewOrder = viewOrder;
window.editOrder = editOrder;
window.deleteOrder = deleteOrder;
window.openProductModal = openProductModal;
window.deleteProduct = deleteProduct;
window.openCartonTypeModal = openCartonTypeModal;
window.deleteCartonType = deleteCartonType;
window.showBeltDetail = showBeltDetail;
window.openBeltModal = openBeltModal;
window.deleteBelt = deleteBelt;

// ---------- ניהול ליינים ----------

function initBeltsManagement() {
    const addBtn = document.getElementById('addBeltBtn');
    if (addBtn) {
        addBtn.addEventListener('click', () => openBeltModal());
    }
}

function refreshBeltsTable() {
    const tbody = document.getElementById('beltsTableBody');
    const belts = DataManager.getBelts();

    tbody.innerHTML = belts.map(belt => {
        const productsCount = DataManager.getProductsByBelt(belt.number).length;

        return `
            <tr data-id="${belt.id}">
                <td><strong>${belt.number}</strong></td>
                <td>${escapeHtml(belt.name || 'ליין ' + belt.number)}</td>
                <td>${productsCount} מוצרים</td>
                <td>
                    <button class="btn btn-primary btn-small" onclick="viewBeltProducts(${belt.number})">
                        הצג
                    </button>
                    <button class="btn btn-secondary btn-small" onclick="openBeltModal('${belt.id}')">
                        ערוך
                    </button>
                    <button class="btn btn-danger btn-small" onclick="deleteBelt('${belt.id}')">
                        מחק
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function openBeltModal(beltId = null) {
    const belt = beltId ? DataManager.getBelts().find(b => b.id === beltId) : null;
    const isEdit = !!belt;

    // חשב את המספר הבא לליין חדש
    const belts = DataManager.getBelts();
    const nextNumber = belts.length > 0 ? Math.max(...belts.map(b => b.number)) + 1 : 1;

    const content = `
        <form id="beltForm">
            <input type="hidden" id="beltId" value="${belt?.id || ''}">
            
            <div class="form-group">
                <label for="beltNumber">מספר ליין *</label>
                <input type="number" id="beltNumber" value="${belt?.number || nextNumber}" required min="1">
            </div>
            
            <div class="form-group">
                <label for="beltName">שם הליין</label>
                <input type="text" id="beltName" value="${belt?.name || ''}" placeholder="לדוגמה: ליין ביגוד">
            </div>
            
            <div class="form-actions" style="gap: 1rem;">
                <button type="submit" class="btn btn-primary">שמור</button>
            </div>
        </form>
    `;

    openModal(isEdit ? 'עריכת ליין' : 'הוספת ליין חדש', content);

    document.getElementById('beltForm').addEventListener('submit', handleBeltSubmit);
}

function handleBeltSubmit(e) {
    e.preventDefault();

    const id = document.getElementById('beltId').value;
    const number = parseInt(document.getElementById('beltNumber').value);
    const name = document.getElementById('beltName').value.trim() || `ליין ${number}`;

    const data = { number, name };

    if (id) {
        DataManager.updateBelt(id, data);
    } else {
        DataManager.addBelt(data);
    }

    closeModal();
    refreshBeltsTable();
    refreshBeltFilter();
}

function deleteBelt(id) {
    const belt = DataManager.getBelts().find(b => b.id === id);
    const productsCount = DataManager.getProductsByBelt(belt.number).length;

    if (productsCount > 0) {
        alert(`לא ניתן למחוק ליין עם ${productsCount} מוצרים. יש להעביר או למחוק את המוצרים קודם.`);
        return;
    }

    if (confirm('האם למחוק את הליין?')) {
        DataManager.deleteBelt(id);
        refreshBeltsTable();
        refreshBeltFilter();
    }
}

function viewBeltProducts(beltNumber) {
    const belt = DataManager.getBelts().find(b => b.number === beltNumber);
    const products = DataManager.getProductsByBelt(beltNumber);

    const content = products.length === 0
        ? '<div style="text-align: center; color: var(--text-muted); padding: 2rem;">אין מוצרים בליין זה</div>'
        : `
            <table class="data-table" style="width: 100%;">
                <thead>
                    <tr>
                        <th>מיקום</th>
                        <th>מק"ט</th>
                        <th>שם מוצר</th>
                        <th>נפח</th>
                    </tr>
                </thead>
                <tbody>
                    ${products.map(p => `
                        <tr>
                            <td><strong>${p.position || '-'}</strong></td>
                            <td>${escapeHtml(p.sku)}</td>
                            <td>${escapeHtml(p.name)}</td>
                            <td>${p.volume || 0} סמ"ק</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

    openModal(`מוצרים ב${belt?.name || 'ליין ' + beltNumber} (${products.length})`, content);
}

window.viewBeltProducts = viewBeltProducts;

// ---------- ייבוא Excel ----------

function initExcelImport() {
    const importBtn = document.getElementById('importExcelBtn');
    const fileInput = document.getElementById('excelFileInput');

    if (importBtn && fileInput) {
        importBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', handleExcelFile);
    }
}

function handleExcelFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });

            // קח את הגיליון הראשון
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];

            // המר לאובייקטים
            const rows = XLSX.utils.sheet_to_json(sheet);

            if (rows.length === 0) {
                alert('הקובץ ריק או לא בפורמט תקין');
                return;
            }

            // הצג תצוגה מקדימה
            showExcelPreview(rows, file.name);

        } catch (error) {
            console.error('Error reading Excel:', error);
            alert('שגיאה בקריאת הקובץ: ' + error.message);
        }
    };
    reader.readAsArrayBuffer(file);
    event.target.value = ''; // איפוס
}

function showExcelPreview(rows, fileName) {
    // זהה עמודות
    const columns = Object.keys(rows[0]);

    const content = `
        <div style="margin-bottom: 1rem;">
            <strong>קובץ:</strong> ${escapeHtml(fileName)}<br>
            <strong>שורות:</strong> ${rows.length}
        </div>
        
        <div style="margin-bottom: 1rem; padding: 1rem; background: #fff3cd; border-radius: 8px; text-align: right;">
            <strong>📌 התאמת עמודות:</strong><br>
            בחר איזו עמודה מתאימה לכל שדה
        </div>
        
        <div class="excel-mapping" style="display: grid; gap: 0.75rem; margin-bottom: 1rem;">
            <div style="display: flex; align-items: center; gap: 1rem;">
                <label style="width: 100px;">מס' הזמנה:</label>
                <select id="mapOrderNumber" class="form-input" style="flex: 1;">
                    <option value="">-- בחר עמודה --</option>
                    ${columns.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('')}
                </select>
            </div>
            <div style="display: flex; align-items: center; gap: 1rem;">
                <label style="width: 100px;">שם לקוח:</label>
                <select id="mapCustomerName" class="form-input" style="flex: 1;">
                    <option value="">-- בחר עמודה --</option>
                    ${columns.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('')}
                </select>
            </div>
            <div style="display: flex; align-items: center; gap: 1rem;">
                <label style="width: 100px;">כתובת:</label>
                <select id="mapAddress" class="form-input" style="flex: 1;">
                    <option value="">-- לא חובה --</option>
                    ${columns.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('')}
                </select>
            </div>
            <div style="display: flex; align-items: center; gap: 1rem;">
                <label style="width: 100px;">מק"ט:</label>
                <select id="mapSku" class="form-input" style="flex: 1;">
                    <option value="">-- בחר עמודה --</option>
                    ${columns.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('')}
                </select>
            </div>
            <div style="display: flex; align-items: center; gap: 1rem;">
                <label style="width: 100px;">כמות:</label>
                <select id="mapQuantity" class="form-input" style="flex: 1;">
                    <option value="">-- לא חובה (ברירת מחדל: 1) --</option>
                    ${columns.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('')}
                </select>
            </div>
        </div>
        
        <div style="margin-bottom: 1rem;">
            <strong>תצוגה מקדימה (5 שורות ראשונות):</strong>
        </div>
        <div style="overflow-x: auto; max-height: 200px;">
            <table class="data-table" style="font-size: 0.75rem;">
                <thead>
                    <tr>${columns.map(c => `<th>${escapeHtml(c)}</th>`).join('')}</tr>
                </thead>
                <tbody>
                    ${rows.slice(0, 5).map(row => `
                        <tr>${columns.map(c => `<td>${escapeHtml(String(row[c] || ''))}</td>`).join('')}</tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        
        <div style="margin-top: 1.5rem; display: flex; gap: 1rem; justify-content: center;">
            <button class="btn btn-primary" onclick="importExcelOrders()">
                ייבא ${rows.length} הזמנות
            </button>
            <button class="btn btn-secondary" onclick="closeModal()">ביטול</button>
        </div>
    `;

    // שמור את הנתונים בזיכרון
    window._excelRows = rows;

    openModal('ייבוא הזמנות מ-Excel', content);

    // נסה לזהות עמודות אוטומטית
    autoDetectColumns(columns);
}

function autoDetectColumns(columns) {
    const patterns = {
        orderNumber: ['order', 'הזמנה', 'מספר', 'number', 'id', 'order_number', 'order_id'],
        customerName: ['customer', 'לקוח', 'שם', 'name', 'customer_name', 'client'],
        address: ['address', 'כתובת', 'shipping', 'delivery'],
        sku: ['sku', 'מקט', 'מק"ט', 'product', 'item', 'code', 'barcode', 'קוד'],
        quantity: ['quantity', 'כמות', 'qty', 'amount', 'count']
    };

    for (const [field, keywords] of Object.entries(patterns)) {
        const select = document.getElementById('map' + field.charAt(0).toUpperCase() + field.slice(1));
        if (!select) continue;

        for (const col of columns) {
            const colLower = col.toLowerCase();
            if (keywords.some(k => colLower.includes(k))) {
                select.value = col;
                break;
            }
        }
    }
}

function importExcelOrders() {
    const rows = window._excelRows;
    if (!rows) return;

    const mapping = {
        orderNumber: document.getElementById('mapOrderNumber')?.value,
        customerName: document.getElementById('mapCustomerName')?.value,
        address: document.getElementById('mapAddress')?.value,
        sku: document.getElementById('mapSku')?.value,
        quantity: document.getElementById('mapQuantity')?.value
    };

    if (!mapping.orderNumber || !mapping.customerName || !mapping.sku) {
        alert('חובה לבחור עמודות: מספר הזמנה, שם לקוח, ומק"ט');
        return;
    }

    // קבץ לפי מספר הזמנה
    const ordersMap = new Map();

    for (const row of rows) {
        const orderKey = String(row[mapping.orderNumber] || '');
        if (!orderKey) continue;

        if (!ordersMap.has(orderKey)) {
            ordersMap.set(orderKey, {
                customerName: String(row[mapping.customerName] || ''),
                address: String(row[mapping.address] || ''),
                items: []
            });
        }

        const sku = String(row[mapping.sku] || '');
        const quantity = parseInt(row[mapping.quantity]) || 1;

        if (sku) {
            ordersMap.get(orderKey).items.push({ sku, quantity });
        }
    }

    // צור הזמנות
    let created = 0;
    let skipped = 0;

    for (const [orderKey, orderData] of ordersMap) {
        if (orderData.items.length === 0) {
            skipped++;
            continue;
        }

        DataManager.addOrder({
            customerName: orderData.customerName,
            address: orderData.address,
            deliveryLine: '',
            items: orderData.items,
            cartons: []
        });
        created++;
    }

    closeModal();
    refreshOrdersTable();

    alert(`✅ יובאו ${created} הזמנות בהצלחה!${skipped > 0 ? `\n⚠️ ${skipped} הזמנות ללא פריטים נדלגו` : ''}`);

    delete window._excelRows;
}

window.importExcelOrders = importExcelOrders;

// ---------- מחיקת כל הנתונים ----------

async function confirmDeleteAllData() {
    if (!confirm('⚠️ אזהרה: פעולה זו תמחק את כל הנתונים (מוצרים, הזמנות, הגדרות)!\n\nהאם אתה בטוח שברצונך להמשיך?')) {
        return;
    }

    const password = prompt('אנא הזן את סיסמת המערכת לאישור המחיקה:');

    if (password === APP_PASSWORD) {
        const confirmDelete = confirm('אישור סופי: הנתונים יימחקו ולא ניתן יהיה לשחזר אותם.\nהאם לבצע מחיקה?');
        if (!confirmDelete) return;

        try {
            document.body.style.cursor = 'wait';
            await DataManager.deleteAllData();

            alert('✅ כל הנתונים נמחקו בהצלחה!\nהדף ירענן כעת.');
            location.reload();
        } catch (error) {
            console.error('Delete error:', error);
            alert('שגיאה במחיקת הנתונים: ' + error.message);
        } finally {
            document.body.style.cursor = 'default';
        }
    } else {
        alert('❌ סיסמה שגויה! הפעולה בוטלה.');
    }
}

window.confirmDeleteAllData = confirmDeleteAllData;


