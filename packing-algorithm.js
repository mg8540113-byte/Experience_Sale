/* ============================================
   WMS ליקוט חכם - אלגוריתם חלוקה לקרטונים
   ממזער סיבובים בין ליינים
   ============================================ */

const PackingAlgorithm = {
    // סף ניצולת לסגירת קרטון
    UTILIZATION_THRESHOLD: 0.75, // 75%

    // סף ניצולת למיזוג עם ליין קרוב
    MERGE_THRESHOLD: 0.10, // 10%

    /**
     * חלוקת מוצרים לקרטונים
     * @param {Array} orderItems - רשימת פריטים בהזמנה [{sku, quantity}]
     * @param {Array} products - רשימת כל המוצרים עם פרטי מיקום
     * @param {Array} cartonTypes - סוגי הקרטונים הזמינים
     * @returns {Array} רשימת קרטונים ממולאים
     */
    packOrder(orderItems, products, cartonTypes) {
        // 1. הרחב את הפריטים לפי כמות ומיין לפי ליין
        const expandedItems = this.expandAndSortByBelt(orderItems, products);

        if (expandedItems.length === 0) {
            return [];
        }

        // 2. קבץ לפי ליין
        const itemsByBelt = this.groupByBelt(expandedItems);

        // 3. מיין קרטונים לפי נפח (מהגדול לקטן)
        const sortedCartonTypes = [...cartonTypes].sort((a, b) => b.maxVolume - a.maxVolume);

        // 4. חלק לקרטונים לפי ליין
        let cartons = [];
        let cartonNumber = 1;

        // עבור על כל ליין בנפרד
        const belts = Object.keys(itemsByBelt).sort((a, b) => parseInt(a) - parseInt(b));

        for (let i = 0; i < belts.length; i++) {
            const belt = belts[i];
            const beltItems = itemsByBelt[belt];

            // חשב את הנפח הכולל של הליין
            const beltVolume = beltItems.reduce((sum, item) => sum + item.volume, 0);

            // בחר קרטון מתאים לליין
            const cartonType = this.selectCartonType(beltVolume, sortedCartonTypes);

            // ארוז את הפריטים מהליין
            const beltCartons = this.packBeltItems(beltItems, cartonType, sortedCartonTypes, cartonNumber, belt);

            // בדוק אם הקרטון האחרון מתחת לסף
            if (beltCartons.length > 0) {
                const lastCarton = beltCartons[beltCartons.length - 1];
                const utilization = lastCarton.usedVolume / lastCarton.maxVolume;

                // אם הניצולת נמוכה מהסף, נסה למזג עם ליין הבא
                if (utilization < this.UTILIZATION_THRESHOLD && i < belts.length - 1) {
                    // סמן את הקרטון כ"פתוח" למיזוג
                    lastCarton.openForMerge = true;
                    lastCarton.originBelt = belt;
                }
            }

            cartons = cartons.concat(beltCartons);
            cartonNumber = cartons.length + 1;
        }

        // 5. נסה למזג קרטונים "פתוחים" עם ליינים קרובים
        cartons = this.mergeOpenCartons(cartons, sortedCartonTypes);

        // 6. מספר מחדש את הקרטונים
        cartons.forEach((carton, index) => {
            carton.number = index + 1;
        });

        return cartons;
    },

    /**
     * הרחבת פריטים לפי כמות ומיון לפי ליין
     */
    expandAndSortByBelt(orderItems, products) {
        const expanded = [];

        for (const item of orderItems) {
            const product = products.find(p => p.sku === item.sku);
            if (!product) {
                console.warn(`מוצר לא נמצא: ${item.sku}`);
                continue;
            }

            for (let i = 0; i < item.quantity; i++) {
                expanded.push({
                    sku: product.sku,
                    name: product.name,
                    volume: product.volume || 500, // ברירת מחדל
                    belt: product.belt || 1,
                    position: product.position || 1
                });
            }
        }

        // מיין לפי ליין, ואז לפי מיקום בליין
        return expanded.sort((a, b) => {
            if (a.belt !== b.belt) return a.belt - b.belt;
            return a.position - b.position;
        });
    },

    /**
     * קיבוץ פריטים לפי ליין
     */
    groupByBelt(items) {
        const groups = {};
        for (const item of items) {
            const belt = item.belt.toString();
            if (!groups[belt]) groups[belt] = [];
            groups[belt].push(item);
        }
        return groups;
    },

    /**
     * בחירת סוג קרטון מתאים לנפח
     */
    selectCartonType(volume, cartonTypes) {
        // מצא את הקרטון הקטן ביותר שמכיל את הנפח
        for (let i = cartonTypes.length - 1; i >= 0; i--) {
            if (cartonTypes[i].maxVolume >= volume) {
                return cartonTypes[i];
            }
        }
        // אם אין מתאים, החזר את הגדול ביותר
        return cartonTypes[0];
    },

    /**
     * אריזת פריטים מליין לקרטונים
     */
    packBeltItems(items, preferredCartonType, allCartonTypes, startNumber, belt) {
        const cartons = [];
        let currentCarton = this.createNewCarton(preferredCartonType, startNumber, belt);

        for (const item of items) {
            // בדוק אם נכנס לקרטון הנוכחי
            if (currentCarton.usedVolume + item.volume <= currentCarton.maxVolume) {
                this.addItemToCarton(currentCarton, item);
            } else {
                // סגור את הקרטון הנוכחי ופתח חדש
                if (currentCarton.items.length > 0) {
                    cartons.push(currentCarton);
                }

                // בחר קרטון חדש (אולי בגודל אחר)
                const remainingVolume = items.slice(items.indexOf(item)).reduce((sum, i) => sum + i.volume, 0);
                const newCartonType = this.selectCartonType(remainingVolume, allCartonTypes);

                currentCarton = this.createNewCarton(newCartonType, cartons.length + startNumber, belt);
                this.addItemToCarton(currentCarton, item);
            }
        }

        // הוסף את הקרטון האחרון
        if (currentCarton.items.length > 0) {
            cartons.push(currentCarton);
        }

        return cartons;
    },

    /**
     * יצירת קרטון חדש
     */
    createNewCarton(cartonType, number, belt) {
        return {
            number: number,
            type: cartonType.name,
            maxVolume: cartonType.maxVolume,
            maxWeight: cartonType.maxWeight,
            usedVolume: 0,
            items: [],
            belts: [belt], // ליינים שהקרטון עובר בהם
            openForMerge: false,
            createdAt: new Date().toISOString()
        };
    },

    /**
     * הוספת פריט לקרטון
     */
    addItemToCarton(carton, item) {
        // בדוק אם הפריט כבר קיים בקרטון
        const existingItem = carton.items.find(i => i.sku === item.sku);

        if (existingItem) {
            existingItem.quantity++;
        } else {
            carton.items.push({
                sku: item.sku,
                name: item.name,
                volume: item.volume,
                belt: item.belt,
                position: item.position,
                quantity: 1
            });
        }

        carton.usedVolume += item.volume;

        // עדכן את טווח הליינים
        if (!carton.belts.includes(item.belt.toString())) {
            carton.belts.push(item.belt.toString());
            carton.belts.sort((a, b) => parseInt(a) - parseInt(b));
        }
    },

    /**
     * מיזוג קרטונים פתוחים עם ליינים קרובים
     */
    mergeOpenCartons(cartons, cartonTypes) {
        const result = [];
        let skipNext = false;

        for (let i = 0; i < cartons.length; i++) {
            if (skipNext) {
                skipNext = false;
                continue;
            }

            const carton = cartons[i];

            // אם הקרטון פתוח למיזוג והבא קיים
            if (carton.openForMerge && i < cartons.length - 1) {
                const nextCarton = cartons[i + 1];

                // בדוק אם אפשר למזג
                const combinedVolume = carton.usedVolume + nextCarton.usedVolume;

                // מצא קרטון שיכיל את שניהם
                const mergedCartonType = this.selectCartonType(combinedVolume, cartonTypes);

                if (mergedCartonType.maxVolume >= combinedVolume) {
                    // מיזוג אפשרי
                    const mergedCarton = this.createNewCarton(mergedCartonType, carton.number, carton.belts[0]);

                    // העבר פריטים משני הקרטונים
                    for (const item of carton.items) {
                        for (let q = 0; q < item.quantity; q++) {
                            this.addItemToCarton(mergedCarton, item);
                        }
                    }
                    for (const item of nextCarton.items) {
                        for (let q = 0; q < item.quantity; q++) {
                            this.addItemToCarton(mergedCarton, item);
                        }
                    }

                    // תקן את הכמות (כי הוספנו כפול)
                    mergedCarton.items.forEach(item => {
                        item.quantity = item.quantity / 2;
                    });
                    mergedCarton.usedVolume = carton.usedVolume + nextCarton.usedVolume;

                    result.push(mergedCarton);
                    skipNext = true;
                    continue;
                }
            }

            // הסר את דגל המיזוג והוסף
            carton.openForMerge = undefined;
            result.push(carton);
        }

        return result;
    },

    /**
     * חישוב ניצולת קרטון
     */
    getUtilization(carton) {
        return carton.usedVolume / carton.maxVolume;
    },

    /**
     * קבלת צבע לבר ניצולת
     */
    getUtilizationClass(utilization) {
        if (utilization >= 0.75) return 'high';
        if (utilization >= 0.50) return 'medium';
        return 'low';
    },

    /**
     * קבלת טווח ליינים לתצוגה
     */
    getBeltRange(carton) {
        if (!carton.belts || carton.belts.length === 0) return '-';
        if (carton.belts.length === 1) return `ליין ${carton.belts[0]}`;
        return `ליינים ${carton.belts[0]}-${carton.belts[carton.belts.length - 1]}`;
    }
};

// ייצוא לשימוש גלובלי
window.PackingAlgorithm = PackingAlgorithm;
