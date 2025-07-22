module.exports = async function chooseProductByCustomParam(page, log, custom, sendTestInfo, products) {
    let selectSchema = "1";
    if (custom && typeof custom === 'string' && custom.trim().length > 0) {
        selectSchema = custom.trim();
    }
    if (custom && typeof custom === 'object' && custom.customParam) {
        selectSchema = custom.customParam;
    }

    let mainIndex = selectSchema;
    if (typeof selectSchema === 'string' && selectSchema.includes('-')) {
        mainIndex = selectSchema.split('-')[0].trim();
    }

    let index = 1;
    if (/^\d+$/.test(mainIndex)) {
        index = Number(mainIndex);
    } else {
        const match = String(mainIndex).match(/product(\d+)/);
        if (match) index = Number(match[1]);
    }
    const selector = `.product.product${index}`;
    const product = await page.$(selector);

    let productInfo = Array.isArray(products) && products[index - 1] ? products[index - 1] : null;

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

    // Скроллим к элементу
    await product.scrollIntoViewIfNeeded();

    // Кликаем только по .product.productN
    let isActive = await product.evaluate(node => node.classList.contains('active'));
    if (!isActive) {
        try {
            await product.click({ force: true, timeout: 1000 });
            // Ждём, что класс появится (максимум 1 сек)
            await page.waitForFunction(
                el => el.classList.contains('active'),
                product,
                { timeout: 1000 }
            );
        } catch (e) {
            // Если не получилось обычным способом — диспатчим клик вручную
            await page.evaluate(el => {
                el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
            }, product);
            await page.waitForTimeout(300);
        }
        log(`✔️ Кликнули по продукту ".product${index}" (customParam: ${selectSchema})`);
    } else {
        log(`✔️ Продукт ".product${index}" уже активен (customParam: ${selectSchema})`);
    }

    // Проверяем реально ли стал active
    isActive = await product.evaluate(node => node.classList.contains('active'));
    if (!isActive) {
        log(`❌ После клика продукт ".product${index}" не стал active!`);
        if (sendTestInfo) sendTestInfo({ error: 'Не стал active после клика!' });
    }

    const activeCount = await page.$$eval('.product.active', els => els.length);
    if (activeCount !== 1) {
        const warnMsg = `⚠️ Найдено ${activeCount} активных продуктов после выбора (ожидалось: 1)`;
        log(warnMsg);
        if (sendTestInfo) sendTestInfo({ warning: warnMsg });
    }

    if (sendTestInfo) {
        sendTestInfo({
            message: `Выбран продукт: class="product${index}" (customParam: ${selectSchema})`,
            package: productInfo,
            activeCount,
        });
    }

    return { index, selector, isActiveBefore: isActive, activeCount };
};
