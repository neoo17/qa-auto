/**
 * Выбирает нужный пакет по customParam/param и проверяет корректность отправленного SKU через POST /order.
 * @param {import('playwright').Page} page
 * @param {Function} log
 * @param {string|object} custom
 * @param {Function} sendTestInfo
 * @param {Array} products
 */
module.exports = async function chooseByCustomParam(page, log, custom, sendTestInfo, products) {
    // --- отладка входа ---

    let selectSchema = "1";
    if (custom && typeof custom === 'object') {
        if (custom.param) selectSchema = String(custom.param);
        else if (custom.customParam) selectSchema = String(custom.customParam);
    } else if (typeof custom === 'string' && custom.trim()) {
        selectSchema = custom.trim();
    }

    selectSchema = selectSchema
        .replace(/[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/g, '-') // все виды тире
        .replace(/\s+/g, '')
        .replace(/[^0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') || "1";

    const actions = selectSchema.split('-')
        .map(n => Number(n))
        .filter(n => Number.isFinite(n));

    const orderType = actions[0] || 1;

    const selector = `.package[data-order-type="${orderType}"]`;
    const pkg = await page.$(selector);

    // 2) Информация о пакете
    const packageInfo = Array.isArray(products) ? products[orderType - 1] : undefined;

    // 3) Ошибка, если пакет не найден
    if (!pkg) {
        const err = `❌ Не найден пакет data-order-type="${orderType}" (schema: ${selectSchema})`;
        log(err);
        sendTestInfo && sendTestInfo({ error: err, package: packageInfo });
        throw new Error(`Нет такого пакета (data-order-type=${orderType})`);
    }

    // 4) Кликаем и ждём POST /order
    log(`✔️ Кликаем по пакету data-order-type="${orderType}"`);
    sendTestInfo && sendTestInfo({
        message: `Выбран пакет: data-order-type="${orderType}" (schema: ${selectSchema})`,
        package: packageInfo
    });

    const [request] = await Promise.all([
        page.waitForRequest(req => req.method() === 'POST' && req.url().includes('/order'), { timeout: 5000 }),
        pkg.click()
    ]);

    // 6) Проверяем отправку
    if (request) {
        const postData = request.postData();
        let sentSku = null;
        let postDataParsed = {};
        if (postData) {
            try {
                const params = new URLSearchParams(postData);
                for (const [k, v] of params.entries()) postDataParsed[k] = v;
                sentSku = params.get('product');
            } catch {
                postDataParsed = postData;
                try {
                    const obj = JSON.parse(postData);
                    if (obj && obj.product != null) sentSku = obj.product;
                } catch { /* noop */ }
            }
        }

        sendTestInfo && sendTestInfo({ _section: 'POST ajax/order', data: postDataParsed });

        if (sentSku && packageInfo && String(sentSku) === String(packageInfo.sku)) {
            log(`✅ SKU совпадает: ${sentSku}`);
        } else {
            const errText = `❌ SKU не совпадает! Ожидали: ${packageInfo?.sku}, отправили: ${sentSku}`;
            log(errText);
            sendTestInfo && sendTestInfo({ error: errText, _section: 'POST ajax/order', data: postDataParsed });
        }
    } else {
        log('❌ Не удалось отследить ajax-запрос на /order после выбора пакета!');
    }

    return actions;
};
