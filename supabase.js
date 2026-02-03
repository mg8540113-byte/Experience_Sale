/* ============================================
   WMS ליקוט חכם - חיבור Supabase
   עם caching לתאימות עם הקוד הקיים
   ============================================ */

// הגדרות Supabase
const SUPABASE_URL = 'https://qpkittxywpmlgvgvoecm.supabase.co';
const SUPABASE_KEY = 'sb_publishable_qmxnMPMUCc-y-ChZ-Rrn6w_WEsJ2BNa';

// בדיקה אם מחובר לאינטרנט ו-Supabase זמין
let supabaseClient = null;
let useSupabase = false;

try {
    if (window.supabase) {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        useSupabase = true;
        console.log('✅ מחובר ל-Supabase');
    }
} catch (e) {
    console.log('⚠️ לא ניתן להתחבר ל-Supabase, עובד במצב מקומי');
}

// Cache מקומי
const cache = {
    products: null,
    belts: null,
    cartonTypes: null,
    orders: null,
    orderCounter: 0
};

// ---------- פונקציות עזר ----------

function getLocalData(key) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    } catch (e) {
        return null;
    }
}

function setLocalData(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
        console.error('Error saving to localStorage:', e);
    }
}

// ---------- מנהל נתונים אוניברסלי ----------

const DataManager = {

    // מפתחות אחסון מקומי
    KEYS: {
        PRODUCTS: 'wms_products',
        ORDERS: 'wms_orders',
        CARTON_TYPES: 'wms_carton_types',
        BELTS: 'wms_belts',
        ORDER_COUNTER: 'wms_order_counter'
    },

    // ---------- מוצרים ----------

    getProducts() {
        if (cache.products !== null) return cache.products;
        return getLocalData(this.KEYS.PRODUCTS) || [];
    },

    getProductBySku(sku) {
        return this.getProducts().find(p => p.sku === sku);
    },

    addProduct(product) {
        const products = this.getProducts();
        product.id = Date.now().toString();
        product.createdAt = new Date().toISOString();
        products.push(product);
        cache.products = products;
        setLocalData(this.KEYS.PRODUCTS, products);
        this.syncProduct(product, 'add');
        return product;
    },

    updateProduct(id, updates) {
        const products = this.getProducts();
        const index = products.findIndex(p => p.id === id);
        if (index === -1) return null;
        products[index] = { ...products[index], ...updates };
        cache.products = products;
        setLocalData(this.KEYS.PRODUCTS, products);
        this.syncProduct(products[index], 'update');
        return products[index];
    },

    deleteProduct(id) {
        let products = this.getProducts();
        const product = products.find(p => p.id === id);
        products = products.filter(p => p.id !== id);
        cache.products = products;
        setLocalData(this.KEYS.PRODUCTS, products);
        if (product) this.syncProduct(product, 'delete');
        return true;
    },

    getProductsByBelt(beltNumber) {
        return this.getProducts()
            .filter(p => p.belt === beltNumber)
            .sort((a, b) => (a.position || 0) - (b.position || 0));
    },

    searchProducts(query, beltFilter) {
        let products = this.getProducts();

        if (beltFilter) {
            products = products.filter(p => p.belt === beltFilter);
        }

        if (query) {
            const lowerQuery = query.toLowerCase();
            products = products.filter(p =>
                (p.sku && p.sku.toLowerCase().includes(lowerQuery)) ||
                (p.name && p.name.toLowerCase().includes(lowerQuery))
            );
        }

        return products;
    },

    // סנכרון מוצר ל-Supabase
    async syncProduct(product, action) {
        if (!useSupabase) return;
        try {
            if (action === 'add') {
                await supabaseClient.from('products').insert({
                    sku: product.sku,
                    name: product.name,
                    volume: product.volume || 500,
                    belt: product.belt || 1,
                    position: product.position || 1
                });
            } else if (action === 'update') {
                await supabaseClient.from('products')
                    .update({
                        name: product.name,
                        volume: product.volume,
                        belt: product.belt,
                        position: product.position
                    })
                    .eq('sku', product.sku);
            } else if (action === 'delete') {
                await supabaseClient.from('products')
                    .delete()
                    .eq('sku', product.sku);
            }
        } catch (e) {
            console.error('Sync error:', e);
        }
    },

    // ---------- ליינים ----------

    getBelts() {
        if (cache.belts !== null) return cache.belts;
        return getLocalData(this.KEYS.BELTS) || [];
    },

    getBeltNumbers() {
        return this.getBelts().map(b => b.number).sort((a, b) => a - b);
    },

    addBelt(belt) {
        const belts = this.getBelts();
        belt.id = Date.now().toString();
        belts.push(belt);
        cache.belts = belts;
        setLocalData(this.KEYS.BELTS, belts);
        this.syncBelt(belt, 'add');
        return belt;
    },

    updateBelt(id, updates) {
        const belts = this.getBelts();
        const index = belts.findIndex(b => b.id === id);
        if (index === -1) return null;
        belts[index] = { ...belts[index], ...updates };
        cache.belts = belts;
        setLocalData(this.KEYS.BELTS, belts);
        this.syncBelt(belts[index], 'update');
        return belts[index];
    },

    deleteBelt(id) {
        let belts = this.getBelts();
        const belt = belts.find(b => b.id === id);
        belts = belts.filter(b => b.id !== id);
        cache.belts = belts;
        setLocalData(this.KEYS.BELTS, belts);
        if (belt) this.syncBelt(belt, 'delete');
        return true;
    },

    async syncBelt(belt, action) {
        if (!useSupabase) return;
        try {
            if (action === 'add') {
                await supabaseClient.from('belts').insert({
                    number: belt.number,
                    name: belt.name
                });
            } else if (action === 'update') {
                await supabaseClient.from('belts')
                    .update({ name: belt.name })
                    .eq('number', belt.number);
            } else if (action === 'delete') {
                await supabaseClient.from('belts')
                    .delete()
                    .eq('number', belt.number);
            }
        } catch (e) {
            console.error('Belt sync error:', e);
        }
    },

    // ---------- סוגי קרטונים ----------

    getCartonTypes() {
        if (cache.cartonTypes !== null) return cache.cartonTypes;
        return getLocalData(this.KEYS.CARTON_TYPES) || [];
    },

    addCartonType(cartonType) {
        const types = this.getCartonTypes();
        cartonType.id = Date.now().toString();
        types.push(cartonType);
        cache.cartonTypes = types;
        setLocalData(this.KEYS.CARTON_TYPES, types);
        this.syncCartonType(cartonType, 'add');
        return cartonType;
    },

    updateCartonType(id, updates) {
        const types = this.getCartonTypes();
        const index = types.findIndex(t => t.id === id);
        if (index === -1) return null;

        const oldName = types[index].name;
        types[index] = { ...types[index], ...updates };

        cache.cartonTypes = types;
        setLocalData(this.KEYS.CARTON_TYPES, types);
        this.syncCartonType(types[index], 'update', oldName);
        return types[index];
    },

    deleteCartonType(id) {
        let types = this.getCartonTypes();
        const type = types.find(t => t.id === id);
        types = types.filter(t => t.id !== id);
        cache.cartonTypes = types;
        setLocalData(this.KEYS.CARTON_TYPES, types);
        if (type) this.syncCartonType(type, 'delete');
        return true;
    },

    async syncCartonType(type, action, originalName = null) {
        if (!useSupabase) return;
        try {
            if (action === 'add') {
                await supabaseClient.from('carton_types').insert({
                    name: type.name,
                    max_volume: type.maxVolume,
                    max_weight: type.maxWeight
                });
            } else if (action === 'update') {
                const targetName = originalName || type.name;
                await supabaseClient.from('carton_types')
                    .update({
                        name: type.name,
                        max_volume: type.maxVolume,
                        max_weight: type.maxWeight
                    })
                    .eq('name', targetName);
            } else if (action === 'delete') {
                await supabaseClient.from('carton_types')
                    .delete()
                    .eq('name', type.name);
            }
        } catch (e) {
            console.error('Supabase sync carton type error:', e);
        }
    },

    // ---------- הזמנות ----------

    getOrders() {
        if (cache.orders !== null) return cache.orders;
        return getLocalData(this.KEYS.ORDERS) || [];
    },

    getOrderById(id) {
        return this.getOrders().find(o => o.id === id);
    },

    getProductById(id) {
        return this.getProducts().find(p => p.id === id);
    },

    getNextOrderNumber() {
        let counter = getLocalData(this.KEYS.ORDER_COUNTER) || 0;
        counter++;
        setLocalData(this.KEYS.ORDER_COUNTER, counter);
        return counter;
    },

    addOrder(order) {
        const orders = this.getOrders();
        order.id = Date.now().toString();
        order.orderNumber = this.getNextOrderNumber();
        order.createdAt = new Date().toISOString();
        order.status = 'חדשה';
        orders.push(order);
        cache.orders = orders;
        setLocalData(this.KEYS.ORDERS, orders);
        this.syncOrder(order, 'add');
        return order;
    },

    updateOrder(id, updates) {
        const orders = this.getOrders();
        const index = orders.findIndex(o => o.id === id);
        if (index === -1) return null;
        orders[index] = { ...orders[index], ...updates };
        cache.orders = orders;
        setLocalData(this.KEYS.ORDERS, orders);
        this.syncOrder(orders[index], 'update');
        return orders[index];
    },

    deleteOrder(id) {
        let orders = this.getOrders();
        const order = orders.find(o => o.id === id);
        orders = orders.filter(o => o.id !== id);
        cache.orders = orders;
        setLocalData(this.KEYS.ORDERS, orders);
        if (order) this.syncOrder(order, 'delete');
        return true;
    },

    async syncOrder(order, action) {
        if (!useSupabase) return;
        try {
            if (action === 'add') {
                await supabaseClient.from('orders').insert({
                    order_number: order.orderNumber,
                    customer_name: order.customerName,
                    address: order.address || '',
                    delivery_line: order.deliveryLine || '',
                    items: order.items || [],
                    cartons: order.cartons || [],
                    status: order.status
                });
            } else if (action === 'update') {
                await supabaseClient.from('orders')
                    .update({
                        status: order.status,
                        cartons: order.cartons,
                        items: order.items
                    })
                    .eq('order_number', order.orderNumber);
            } else if (action === 'delete') {
                await supabaseClient.from('orders')
                    .delete()
                    .eq('order_number', order.orderNumber);
            }
        } catch (e) {
            console.error('Order sync error:', e);
        }
    },

    // ---------- טעינת נתונים מהשרת ----------

    async loadFromServer() {
        if (!useSupabase) return;

        try {
            // טעינת מוצרים
            const { data: products } = await supabaseClient
                .from('products')
                .select('*')
                .order('belt')
                .order('position');
            if (products && products.length > 0) {
                cache.products = products.map(p => ({
                    id: p.id,
                    sku: p.sku,
                    name: p.name,
                    volume: p.volume,
                    belt: p.belt,
                    position: p.position
                }));
                setLocalData(this.KEYS.PRODUCTS, cache.products);
            }

            // טעינת ליינים
            const { data: belts } = await supabaseClient
                .from('belts')
                .select('*')
                .order('number');
            if (belts && belts.length > 0) {
                cache.belts = belts.map(b => ({
                    id: b.id,
                    number: b.number,
                    name: b.name
                }));
                setLocalData(this.KEYS.BELTS, cache.belts);
            }

            // טעינת סוגי קרטונים
            const { data: cartonTypes } = await supabaseClient
                .from('carton_types')
                .select('*');
            if (cartonTypes && cartonTypes.length > 0) {
                cache.cartonTypes = cartonTypes.map(c => ({
                    id: c.id,
                    name: c.name,
                    maxVolume: c.max_volume,
                    maxWeight: c.max_weight
                }));
                setLocalData(this.KEYS.CARTON_TYPES, cache.cartonTypes);
            }

            // טעינת הזמנות
            const { data: orders } = await supabaseClient
                .from('orders')
                .select('*')
                .order('created_at', { ascending: false });
            if (orders && orders.length > 0) {
                cache.orders = orders.map(o => ({
                    id: o.id,
                    orderNumber: o.order_number,
                    customerName: o.customer_name,
                    address: o.address,
                    deliveryLine: o.delivery_line,
                    items: o.items,
                    cartons: o.cartons,
                    status: o.status,
                    createdAt: o.created_at
                }));
                setLocalData(this.KEYS.ORDERS, cache.orders);
            }

            // טעינת מונה
            const { data: settings } = await supabaseClient
                .from('settings')
                .select('value')
                .eq('key', 'order_counter')
                .single();
            if (settings) {
                setLocalData(this.KEYS.ORDER_COUNTER, settings.value);
            }

            console.log('✅ נתונים נטענו מהשרת');

        } catch (e) {
            console.error('Error loading from server:', e);
        }
    },

    // ---------- ניקוי נתונים ----------

    async deleteAllData() {
        console.log('מבצע מחיקת נתונים מלאה...');

        // 1. נקה cache מקומי
        cache.products = [];
        cache.belts = [];
        cache.cartonTypes = [];
        cache.orders = [];
        cache.orderCounter = 0;

        // 2. נקה localStorage
        localStorage.removeItem(this.KEYS.PRODUCTS);
        localStorage.removeItem(this.KEYS.BELTS);
        localStorage.removeItem(this.KEYS.CARTON_TYPES);
        localStorage.removeItem(this.KEYS.ORDERS);
        localStorage.removeItem(this.KEYS.ORDER_COUNTER);

        // 3. נקה Supabase
        if (useSupabase && supabaseClient) {
            try {
                console.log('מוחק נתונים מ-Supabase...');

                // מחיקת הזמנות - שימוש בתנאי not.is.null שעובד עם כל סוג ID
                const { error: ordersError, count: ordersCount } = await supabaseClient
                    .from('orders')
                    .delete()
                    .not('id', 'is', null);
                if (ordersError) console.error('שגיאה במחיקת הזמנות:', ordersError.message);
                else console.log('✓ הזמנות נמחקו');

                // מחיקת מוצרים
                const { error: productsError } = await supabaseClient
                    .from('products')
                    .delete()
                    .not('id', 'is', null);
                if (productsError) console.error('שגיאה במחיקת מוצרים:', productsError.message);
                else console.log('✓ מוצרים נמחקו');

                // מחיקת ליינים
                const { error: beltsError } = await supabaseClient
                    .from('belts')
                    .delete()
                    .not('id', 'is', null);
                if (beltsError) console.error('שגיאה במחיקת ליינים:', beltsError.message);
                else console.log('✓ ליינים נמחקו');

                // מחיקת סוגי קרטונים
                const { error: cartonError } = await supabaseClient
                    .from('carton_types')
                    .delete()
                    .not('id', 'is', null);
                if (cartonError) console.error('שגיאה במחיקת סוגי קרטונים:', cartonError.message);
                else console.log('✓ סוגי קרטונים נמחקו');

                // איפוס מונה
                await supabaseClient.from('settings').upsert({ key: 'order_counter', value: 0 });

                console.log('✅ כל הנתונים נמחקו מ-Supabase');

                // בדיקת שהמחיקה הצליחה
                const { data: remainingOrders } = await supabaseClient.from('orders').select('id').limit(5);
                if (remainingOrders && remainingOrders.length > 0) {
                    console.error('⚠️ עדיין יש הזמנות ב-Supabase!', remainingOrders.length);
                    alert('עדיין יש הזמנות בשרת! בדוק את הרשאות (RLS) ב-Supabase.');
                }
            } catch (e) {
                console.error('Error clearing Supabase:', e);
                alert('שגיאה במחיקת נתונים מהענן: ' + e.message);
            }
        } else {
            console.warn('⚠️ Supabase לא מחובר - הנתונים נמחקו רק מקומית!');
            alert('⚠️ אזהרה: לא מחובר ל-Supabase!\nהנתונים נמחקו רק במחשב הזה.');
        }

        return true;
    },

    // ---------- טעינת נתונים מהשרת ----------

    loadSampleData() {
        // טעינה מהשרת (אסינכרונית)
        this.loadFromServer().then(() => {
            // רענון מסכים אחרי טעינה
            if (typeof refreshOrdersTable === 'function') refreshOrdersTable();
            if (typeof refreshProductsTable === 'function') refreshProductsTable();
        });

        // הערה: לא ניצור יותר מוצרי דוגמה אוטומטית
        // המשתמש יכול ליצור מוצרים דרך "הוספת פרטי פסח" או ידנית
    }
};

// הפוך לגלובלי
window.DataManager = DataManager;
