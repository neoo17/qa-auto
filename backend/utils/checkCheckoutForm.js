/**
 * @param {import('playwright').Page} page
 * @param {Function} log
 * @param {Function} [sendTestInfo]
 * @param {Function} [checkStateAjax]
 * @param {string} checkType
 */
module.exports = async function checkCheckoutForm(page, log, sendTestInfo, checkStateAjax, checkType) {
    log('💳 Проверяем и заполняем форму #checkout...');
    await page.waitForSelector('form#checkout', { timeout: 7000 });

    // 1. Проверка "retry" (cvv: 000)
    log('🔄 Проверяем статус "retry" (cvv: 000)...');
    await page.fill('input[name="cardNumber"]', '4716934807660821');
    await page.selectOption('select[name="expMonth"]', '01');
    await page.selectOption('select[name="expYear"]', '2030');
    await page.fill('input[name="cvv"]', '000');

    const [retryRequest, retryResponse] = await Promise.all([
        page.waitForRequest(req =>
            req.method() === 'POST' && req.url().includes('/order'), { timeout: 4000 }
        ),
        page.waitForResponse(res =>
            res.url().includes('/order') && res.request().method() === 'POST', { timeout: 4000 }
        ),
        page.click('form#checkout button[type="submit"]')
    ]);
    let retryJson = {};
    try { retryJson = await retryResponse.json(); } catch {}
    if (retryJson.data?.processing === "retry") {
        log('✅ Статус processing: "retry" получен корректно');
    } else {
        log(`❌ Ожидали processing: "retry", получили: "${retryJson.data?.processing}"`);
    }

    if (checkType === 'full'){
        // AmEx
        log('💳 Проверяем AmEx...');
        await page.fill('input[name="cardNumber"]', '378282246310005');
        await page.selectOption('select[name="expMonth"]', '01');
        await page.selectOption('select[name="expYear"]', '2030');
        await page.fill('input[name="cvv"]', '123');
        const [amexResp] = await Promise.all([
            page.waitForResponse(res =>
                res.url().includes('/order') && res.request().method() === 'POST', { timeout: 4000 }
            ),
            page.click('form#checkout button[type="submit"]')
        ]);
        let amexJson = {};
        try { amexJson = await amexResp.json(); } catch {}
        const amexErr = amexJson.fieldErrors?.[0]?.error || '';
        if (amexErr.includes('amex credit card is not allowed')) {
            log(`✅ AmEx не разрешён — ошибка поймана корректно: "${amexErr}"`);
        } else {
            log(`❌ Не получили ожидаемую ошибку для AmEx: "${amexErr}"`);
        }

        // Diners Club
        log('💳 Проверяем Diners Club...');
        await page.fill('input[name="cardNumber"]', '30569309025904');
        await page.selectOption('select[name="expMonth"]', '01');
        await page.selectOption('select[name="expYear"]', '2030');
        await page.fill('input[name="cvv"]', '123');
        const [dinersResp] = await Promise.all([
            page.waitForResponse(res =>
                res.url().includes('/order') && res.request().method() === 'POST', { timeout: 4000 }
            ),
            page.click('form#checkout button[type="submit"]')
        ]);
        let dinersJson = {};
        try { dinersJson = await dinersResp.json(); } catch {}
        const dinersErr = dinersJson.fieldErrors?.[0]?.error || '';
        if (dinersErr.includes('diners club carte blanche credit card is not supported')) {
            log(`✅ Diners Club не поддерживается — ошибка поймана корректно: "${dinersErr}"`);
        } else {
            log(`❌ Не получили ожидаемую ошибку для Diners Club: "${dinersErr}"`);
        }

        // Discover
        log('💳 Проверяем Discover...');
        await page.fill('input[name="cardNumber"]', '6011111111111117');
        await page.selectOption('select[name="expMonth"]', '01');
        await page.selectOption('select[name="expYear"]', '2030');
        await page.fill('input[name="cvv"]', '123');
        const [discoverResp] = await Promise.all([
            page.waitForResponse(res =>
                res.url().includes('/order') && res.request().method() === 'POST', { timeout: 4000 }
            ),
            page.click('form#checkout button[type="submit"]')
        ]);
        let discoverJson = {};
        try { discoverJson = await discoverResp.json(); } catch {}
        const discoverErr = discoverJson.fieldErrors?.[0]?.error || '';
        if (discoverErr.includes('discover credit card is not allowed')) {
            log(`✅ Discover не разрешён — ошибка поймана корректно: "${discoverErr}"`);
        } else {
            log(`❌ Не получили ожидаемую ошибку для Discover: "${discoverErr}"`);
        }

        // JCB
        log('💳 Проверяем JCB...');
        await page.fill('input[name="cardNumber"]', '3530111333300000');
        await page.selectOption('select[name="expMonth"]', '01');
        await page.selectOption('select[name="expYear"]', '2030');
        await page.fill('input[name="cvv"]', '123');
        const [jcbResp] = await Promise.all([
            page.waitForResponse(res =>
                res.url().includes('/order') && res.request().method() === 'POST', { timeout: 4000 }
            ),
            page.click('form#checkout button[type="submit"]')
        ]);
        let jcbJson = {};
        try { jcbJson = await jcbResp.json(); } catch {}
        const jcbErr = jcbJson.fieldErrors?.[0]?.error || '';
        if (jcbErr.includes('jcb credit card is not supported')) {
            log(`✅ JCB не поддерживается — ошибка поймана корректно: "${jcbErr}"`);
        } else {
            log(`❌ Не получили ожидаемую ошибку для JCB: "${jcbErr}"`);
        }
    }


    log('✅ Заполняем тестовую карту на успешную покупку...');
    await page.fill('input[name="cardNumber"]', '4716934807660821');
    await page.selectOption('select[name="expMonth"]', '01');
    await page.selectOption('select[name="expYear"]', '2030');
    await page.fill('input[name="cvv"]', '123');
    log('✅ Данные тестовой карты заполнены: 4716 9348 0766 0821, 01/2030, cvv 123');

    const [request, upsaleState] = await Promise.all([
        page.waitForRequest(req =>
            req.method() === 'POST' && req.url().includes('/order'), { timeout: 4000 }
        ),
        (async () => {
            const state = await checkStateAjax(page, log);
            if (state) log('🟢 State получен на первом апсейле!');
            else log('⚠️ Не удалось получить state на первом апсейле!');
            return state;
        })(),
        page.click('form#checkout button[type="submit"]'),
        page.waitForNavigation({
            url: url => /\/upsale-\d+\.html/i.test(url),
            waitUntil: 'load',
            timeout: 12000
        })
    ]);

    if (request) {
        let postDataParsed = {};
        const postData = request.postData();
        if (postData) {
            try {
                const params = new URLSearchParams(postData);
                for (const [k, v] of params.entries()) postDataParsed[k] = v;
            } catch (e) {
                postDataParsed = postData;
            }
        }
        if (sendTestInfo) {
            sendTestInfo({
                _section: 'Checkout POST ajax/order',
                data: postDataParsed
            });
        }
        log('✅ POST ajax/order на чек-аут отправлен');
    } else {
        log('❌ Не удалось отследить ajax-запрос на /order после отправки формы checkout!');
        if (sendTestInfo) {
            sendTestInfo({
                error: '❌ Не удалось отследить POST ajax/order на чекауте!'
            });
        }
        return;
    }

    const currentUrl = page.url();
    if (/\/upsale-\d+\.html/i.test(currentUrl)) {
        log(`➡️ Перешли на первый апсейл: ${currentUrl}`);
    } else {
        log('❌ Не перешли на апсейл-страницу!');
        if (sendTestInfo) {
            sendTestInfo({
                error: '❌ Не перешли на апсейл-страницу!'
            });
        }
    }
};
