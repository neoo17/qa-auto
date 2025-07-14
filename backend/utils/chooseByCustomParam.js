/**
 * Выбирает нужный пакет по customParam и проверяет корректность отправленного SKU через POST /order.
 * @param {import('playwright').Page} page
 * @param {Function} log
 * @param {string|object} custom - кастомный параметр для выбора пакета
 * @param {Function} sendTestInfo - функция для передачи информации во фронт
 * @param {Array} products - список продуктов (пакетов) со state
 */
module.exports = async function chooseByCustomParam(page, log, custom, sendTestInfo, products) {
    // 1. Определяем какой пакет выбирать (customParam, по умолчанию "1")
    let selectSchema = "1";
    if (custom && typeof custom === 'string' && custom.trim().length > 0) {
        selectSchema = custom.trim();
    }
    if (custom && typeof custom === 'object' && custom.customParam) {
        selectSchema = custom.customParam;
    }
    const actions = selectSchema.split('-').map(x => Number(x));
    const orderType = actions[0] || 1;
    const selector = `.package[data-order-type="${orderType}"]`;
    const pkg = await page.$(selector);

    // 2. Получаем информацию о выбранном пакете
    let packageInfo;
    if (Array.isArray(products) && products[orderType - 1]) {
        packageInfo = products[orderType - 1];
    }

    // 3. Если не найден - пишем ошибку и выходим
    if (!pkg) {
        log(`❌ Не найден пакет с data-order-type="${orderType}" (customParam: ${selectSchema})`);
        if (sendTestInfo) {
            sendTestInfo({
                error: `❌ Не найден пакет с data-order-type="${orderType}" (customParam: ${selectSchema})`,
                package: packageInfo
            });
        }
        throw new Error(`Нет такого пакета (data-order-type=${orderType})`);
    }

    // 4. Выводим инфоблок о выбранном пакете
    log(`✔️ Кликнули по пакету с data-order-type="${orderType}"`);
    if (sendTestInfo) {
        sendTestInfo({
            message: `Выбран пакет: data-order-type="${orderType}" (customParam: ${selectSchema})`,
            package: packageInfo
        });
    }

    // 5. Ловим POST на /order, когда кликнули на пакет
    const [request] = await Promise.all([
        page.waitForRequest(req =>
                req.method() === 'POST' && req.url().includes('/order'),
            { timeout: 3000 }
        ),
        pkg.click()
    ]);

    // 6. Проверяем, что ушло на бекенд (SKU и весь body)
    if (request) {
        const postData = request.postData();
        let sentSku = null;
        let postDataParsed = {};
        if (postData) {
            try {
                const params = new URLSearchParams(postData);
                for (const [k, v] of params.entries()) postDataParsed[k] = v;
                sentSku = params.get('product');
            } catch (e) {
                postDataParsed = postData;
            }
        }

        // -- Только этот объект попадает во фронт для отображения POST-запроса! --
        if (sendTestInfo) {
            sendTestInfo({
                _section: 'POST ajax/order',
                data: postDataParsed
            });
        }

        // 7. Логируем результат сравнения SKU
        if (sentSku && packageInfo && sentSku === String(packageInfo.sku)) {
            log(`✅ SKU, отправленный при выборе пакета, совпадает: ${sentSku}`);
        } else {
            const errText = `❌ SKU, отправленный при выборе пакета, не совпадает! Ожидали: ${packageInfo?.sku}, отправили: ${sentSku}`;
            log(errText);
            if (sendTestInfo) sendTestInfo({ error: errText, _section: 'POST ajax/order', data: postDataParsed });
        }
    } else {
        log('❌ Не удалось отследить ajax-запрос на /order после выбора пакета!');
    }

    return actions;
};
