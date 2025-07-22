/**
 * Выбирает нужный продукт по customParam и логирует результат.
 * @param {import('playwright').Page} page
 * @param {Function} log
 * @param {string|object} custom - кастомный параметр для выбора продукта (по умолчанию "1" -> .product1)
 * @param {Function} sendTestInfo - функция для передачи информации во фронт
 * @param {Array} products - список продуктов (опционально)
 */
module.exports = async function chooseProductByCustomParam(page, log, custom, sendTestInfo, products) {
    // 1. Определяем какой продукт выбирать (customParam, по умолчанию "1")
    let selectSchema = "1";
    if (custom && typeof custom === 'string' && custom.trim().length > 0) {
        selectSchema = custom.trim();
    }
    if (custom && typeof custom === 'object' && custom.customParam) {
        selectSchema = custom.customParam;
    }

    // Если пришло "3-1-0-1" или "2-5" — берем только первую часть
    let mainIndex = selectSchema;
    if (typeof selectSchema === 'string' && selectSchema.includes('-')) {
        mainIndex = selectSchema.split('-')[0].trim();
    }

    // Можно передать "2" или "product2" — поддержим оба варианта
    let index = 1;
    if (/^\d+$/.test(mainIndex)) {
        index = Number(mainIndex);
    } else {
        const match = String(mainIndex).match(/product(\d+)/);
        if (match) index = Number(match[1]);
    }
    const selector = `.product.product${index}`;
    const product = await page.$(selector);

    // 2. Получаем инфу о выбранном продукте (если передан массив products)
    let productInfo = Array.isArray(products) && products[index - 1] ? products[index - 1] : null;

    // 3. Проверка: найден ли нужный блок?
    if (!product) {
        const errorMsg = `❌ Не найден продукт с классом ".product${index}" (customParam: ${selectSchema})`;
        log(errorMsg);
        if (sendTestInfo) {
            sendTestInfo({
                error: errorMsg,
                product: productInfo,
            });
        }
        throw new Error(errorMsg);
    }

    // 4. Кликаем по выбранному продукту (если не активен)
    const isActive = await product.evaluate(node => node.classList.contains('active'));
    if (!isActive) {
        await product.click();
        log(`✔️ Кликнули по продукту ".product${index}" (customParam: ${selectSchema})`);
    } else {
        log(`✔️ Продукт ".product${index}" уже активен (customParam: ${selectSchema})`);
    }

    // 5. Проверяем, что только один .product.active на странице
    const activeCount = await page.$$eval('.product.active', els => els.length);
    if (activeCount !== 1) {
        const warnMsg = `⚠️ Найдено ${activeCount} активных продуктов после выбора (ожидалось: 1)`;
        log(warnMsg);
        if (sendTestInfo) sendTestInfo({ warning: warnMsg });
    }

    // 6. Выводим инфоблок о выбранном продукте
    if (sendTestInfo) {
        sendTestInfo({
            message: `Выбран продукт: ".product${index}" (customParam: ${selectSchema})`,
            product: productInfo,
            activeCount,
        });
    }

    return { index, selector, isActiveBefore: isActive, activeCount };
};
