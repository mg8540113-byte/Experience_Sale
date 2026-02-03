/* ============================================
   WMS ליקוט חכם - ניהול נתונים (LocalStorage)
   מוכן למעבר לשרת בעתיד
   ============================================ */

const DataManager = {
    // מפתחות אחסון
    KEYS: {
        PRODUCTS: 'wms_products',
        ORDERS: 'wms_orders',
        CARTON_TYPES: 'wms_carton_types',
        BELTS: 'wms_belts',
        ORDER_COUNTER: 'wms_order_counter'
    },

    // ---------- פעולות כלליות ----------

    /**
     * קריאת נתונים מהאחסון
     */
    get(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error(`שגיאה בקריאת ${key}:`, error);
            return null;
        }
    },

    /**
     * שמירת נתונים לאחסון
     */
    set(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error(`שגיאה בשמירת ${key}:`, error);
            return false;
        }
    },

    // ---------- מוצרים ----------

    /**
     * קבלת כל המוצרים
     */
    getProducts() {
        return this.get(this.KEYS.PRODUCTS) || [];
    },

    /**
     * קבלת מוצר לפי מק"ט
     */
    getProductBySku(sku) {
        const products = this.getProducts();
        return products.find(p => p.sku === sku);
    },

    /**
     * הוספת מוצר חדש
     */
    addProduct(product) {
        const products = this.getProducts();
        product.id = Date.now().toString();
        product.createdAt = new Date().toISOString();
        products.push(product);
        return this.set(this.KEYS.PRODUCTS, products) ? product : null;
    },

    /**
     * עדכון מוצר
     */
    updateProduct(id, updates) {
        const products = this.getProducts();
        const index = products.findIndex(p => p.id === id);
        if (index === -1) return null;

        products[index] = { ...products[index], ...updates, updatedAt: new Date().toISOString() };
        return this.set(this.KEYS.PRODUCTS, products) ? products[index] : null;
    },

    /**
     * מחיקת מוצר
     */
    deleteProduct(id) {
        const products = this.getProducts();
        const filtered = products.filter(p => p.id !== id);
        return this.set(this.KEYS.PRODUCTS, filtered);
    },

    /**
     * חיפוש מוצרים
     */
    searchProducts(query, beltFilter = null) {
        let products = this.getProducts();

        if (query) {
            const lowerQuery = query.toLowerCase();
            products = products.filter(p =>
                p.sku.toLowerCase().includes(lowerQuery) ||
                p.name.toLowerCase().includes(lowerQuery)
            );
        }

        if (beltFilter) {
            products = products.filter(p => p.belt === beltFilter);
        }

        return products;
    },

    // ---------- הזמנות ----------

    /**
     * קבלת כל ההזמנות
     */
    getOrders() {
        return this.get(this.KEYS.ORDERS) || [];
    },

    /**
     * קבלת הזמנה לפי מזהה
     */
    getOrderById(id) {
        const orders = this.getOrders();
        return orders.find(o => o.id === id);
    },

    /**
     * קבלת מספר הזמנה הבא (עוקב)
     */
    getNextOrderNumber() {
        let counter = parseInt(this.get(this.KEYS.ORDER_COUNTER)) || 0;
        counter++;
        this.set(this.KEYS.ORDER_COUNTER, counter);
        return counter;
    },

    /**
     * הוספת הזמנה חדשה
     */
    addOrder(order) {
        const orders = this.getOrders();
        order.id = Date.now().toString();
        // מספר הזמנה עוקב אוטומטי
        order.orderNumber = this.getNextOrderNumber();
        order.createdAt = new Date().toISOString();
        order.status = 'חדשה';
        orders.push(order);
        return this.set(this.KEYS.ORDERS, orders) ? order : null;
    },

    /**
     * עדכון הזמנה
     */
    updateOrder(id, updates) {
        const orders = this.getOrders();
        const index = orders.findIndex(o => o.id === id);
        if (index === -1) return null;

        orders[index] = { ...orders[index], ...updates, updatedAt: new Date().toISOString() };
        return this.set(this.KEYS.ORDERS, orders) ? orders[index] : null;
    },

    /**
     * מחיקת הזמנה
     */
    deleteOrder(id) {
        const orders = this.getOrders();
        const filtered = orders.filter(o => o.id !== id);
        return this.set(this.KEYS.ORDERS, filtered);
    },

    // ---------- סוגי קרטונים ----------

    /**
     * קבלת כל סוגי הקרטונים
     */
    getCartonTypes() {
        const types = this.get(this.KEYS.CARTON_TYPES);
        if (types && types.length > 0) return types;

        // ברירת מחדל
        const defaultTypes = [
            { id: '1', name: 'S', maxVolume: 15000, maxWeight: 5 },
            { id: '2', name: 'M', maxVolume: 35000, maxWeight: 10 },
            { id: '3', name: 'L', maxVolume: 60000, maxWeight: 15 },
            { id: '4', name: 'XL', maxVolume: 100000, maxWeight: 25 }
        ];
        this.set(this.KEYS.CARTON_TYPES, defaultTypes);
        return defaultTypes;
    },

    /**
     * הוספת סוג קרטון
     */
    addCartonType(cartonType) {
        const types = this.getCartonTypes();
        cartonType.id = Date.now().toString();
        types.push(cartonType);
        return this.set(this.KEYS.CARTON_TYPES, types) ? cartonType : null;
    },

    /**
     * עדכון סוג קרטון
     */
    updateCartonType(id, updates) {
        const types = this.getCartonTypes();
        const index = types.findIndex(t => t.id === id);
        if (index === -1) return null;

        types[index] = { ...types[index], ...updates };
        return this.set(this.KEYS.CARTON_TYPES, types) ? types[index] : null;
    },

    /**
     * מחיקת סוג קרטון
     */
    deleteCartonType(id) {
        const types = this.getCartonTypes();
        const filtered = types.filter(t => t.id !== id);
        return this.set(this.KEYS.CARTON_TYPES, filtered);
    },

    // ---------- ליינים (Belts) ----------

    /**
     * קבלת רשימת הליינים
     */
    getBelts() {
        // קודם בדוק אם יש ליינים שמורים
        let belts = this.get(this.KEYS.BELTS);
        if (belts && belts.length > 0) {
            return belts.sort((a, b) => a.number - b.number);
        }

        // אם אין, צור ברירת מחדל מהמוצרים הקיימים
        const products = this.getProducts();
        const beltNumbers = [...new Set(products.map(p => p.belt).filter(Boolean))];
        belts = beltNumbers.map(num => ({
            id: Date.now().toString() + num,
            number: num,
            name: `ליין ${num}`
        }));

        if (belts.length > 0) {
            this.set(this.KEYS.BELTS, belts);
        }
        return belts.sort((a, b) => a.number - b.number);
    },

    /**
     * קבלת מספרי הליינים בלבד
     */
    getBeltNumbers() {
        return this.getBelts().map(b => b.number);
    },

    /**
     * הוספת ליין חדש
     */
    addBelt(belt) {
        const belts = this.getBelts();
        belt.id = Date.now().toString();
        belts.push(belt);
        return this.set(this.KEYS.BELTS, belts) ? belt : null;
    },

    /**
     * עדכון ליין
     */
    updateBelt(id, updates) {
        const belts = this.getBelts();
        const index = belts.findIndex(b => b.id === id);
        if (index === -1) return null;

        belts[index] = { ...belts[index], ...updates };
        return this.set(this.KEYS.BELTS, belts) ? belts[index] : null;
    },

    /**
     * מחיקת ליין
     */
    deleteBelt(id) {
        const belts = this.getBelts();
        const filtered = belts.filter(b => b.id !== id);
        return this.set(this.KEYS.BELTS, filtered);
    },

    /**
     * קבלת מוצרים לפי ליין
     */
    getProductsByBelt(beltNumber) {
        const products = this.getProducts();
        return products.filter(p => p.belt === beltNumber).sort((a, b) => a.position - b.position);
    },

    // ---------- אתחול עם נתוני דוגמה ----------

    /**
     * טעינת נתוני דוגמה (לפיתוח)
     */
    loadSampleData() {
        // מוצרי דוגמה
        const sampleProducts = [
            { id: '1', sku: 'SKU001', name: 'חולצה לבנה', volume: 500, belt: 1, position: 1 },
            { id: '2', sku: 'SKU002', name: 'מכנסיים כחולים', volume: 800, belt: 1, position: 2 },
            { id: '3', sku: 'SKU003', name: 'שמלה אדומה', volume: 600, belt: 1, position: 3 },
            { id: '4', sku: 'SKU004', name: 'ז׳קט שחור', volume: 1200, belt: 2, position: 1 },
            { id: '5', sku: 'SKU005', name: 'חצאית ירוקה', volume: 400, belt: 2, position: 2 },
            { id: '6', sku: 'SKU006', name: 'סוודר אפור', volume: 900, belt: 2, position: 3 },
            { id: '7', sku: 'SKU007', name: 'מעיל חורף', volume: 2000, belt: 3, position: 1 },
            { id: '8', sku: 'SKU008', name: 'טישרט צבעונית', volume: 350, belt: 3, position: 2 },
            { id: '9', sku: 'SKU009', name: 'ג׳ינס קלאסי', volume: 750, belt: 3, position: 3 },
            { id: '10', sku: 'SKU010', name: 'קפוצ׳ון', volume: 1100, belt: 4, position: 1 }
        ];

        // ליינים דוגמה
        const sampleBelts = [
            { id: '1', number: 1, name: 'ליין 1' },
            { id: '2', number: 2, name: 'ליין 2' },
            { id: '3', number: 3, name: 'ליין 3' },
            { id: '4', number: 4, name: 'ליין 4' }
        ];

        // הזמנת דוגמה
        const sampleOrders = [
            {
                id: '1',
                orderNumber: 1,
                customerName: 'ישראל ישראלי',
                address: 'רחוב הרצל 1, תל אביב',
                deliveryLine: 'קו צפון',
                items: [
                    { sku: 'SKU001', quantity: 3 },
                    { sku: 'SKU002', quantity: 2 },
                    { sku: 'SKU004', quantity: 1 }
                ],
                cartons: [],
                status: 'ממתינה',
                createdAt: new Date().toISOString()
            }
        ];

        // שמירה רק אם אין נתונים
        if (this.getProducts().length === 0) {
            this.set(this.KEYS.PRODUCTS, sampleProducts);
        }
        if (this.getOrders().length === 0) {
            this.set(this.KEYS.ORDERS, sampleOrders);
            this.set(this.KEYS.ORDER_COUNTER, 1); // מונה התחלתי
        }
        if (!this.get(this.KEYS.BELTS) || this.get(this.KEYS.BELTS).length === 0) {
            this.set(this.KEYS.BELTS, sampleBelts);
        }
    },

    /**
     * ניקוי כל הנתונים
     */
    clearAll() {
        Object.values(this.KEYS).forEach(key => localStorage.removeItem(key));
    }
};

// ייצוא לשימוש גלובלי
window.DataManager = DataManager;
