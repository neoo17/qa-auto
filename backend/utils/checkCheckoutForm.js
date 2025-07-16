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

    page.on('pageerror', err => log('[JS error] ' + err));
    page.on('console', msg => {
        if (msg.type() === 'error') log('[Console error] ' + msg.text());
    });

    // 1. Проверка "retry" (cvv: 000)
    log('🔄 Проверяем статус "retry" (cvv: 000)...');
    await page.fill('input[name="cardNumber"]', '4716934807660821');
    await page.selectOption('select[name="expMonth"]', '01');
    await page.selectOption('select[name="expYear"]', '2030');
    await page.fill('input[name="cvv"]', '000');

    let retryResponse;
    try {
        const [, resp] = await Promise.all([
            page.waitForRequest(req =>
                req.method() === 'POST' && req.url().includes('/order'), { timeout: 15000 }
            ),
            page.waitForResponse(res =>
                res.url().includes('/order') && res.request().method() === 'POST', { timeout: 15000 }
            ),
            page.click('form#checkout button[type="submit"]')
        ]);
        retryResponse = resp;
    } catch (e) {
        log('❌ [retry] Не получили ответ от сервера в течение 15 секунд! ' + (e.message || e));
    }

    if (retryResponse) {
        if (retryResponse.status() >= 400) {
            log(`❌ [retry] Сервер вернул ошибку: ${retryResponse.status()} ${retryResponse.statusText()}`);
            try {
                const body = await retryResponse.text();
                log('Ответ сервера:', body);
            } catch {}
        } else {
            let retryJson = {};
            try { retryJson = await retryResponse.json(); } catch {}
            if (retryJson.data?.processing === "retry") {
                log('✅ Статус processing: "retry" получен корректно');
            } else {
                log(`❌ Ожидали processing: "retry", получили: "${retryJson.data?.processing}"`);
            }
        }
    }

    // --- Проверка негативных сценариев по картам ---
    async function checkCardNegative({ number, expMonth = '01', expYear = '2030', cvv = '123', expectError, label }) {
        try {
            log(`💳 Проверяем ${label}...`);
            await page.fill('input[name="cardNumber"]', number);
            await page.selectOption('select[name="expMonth"]', expMonth);
            await page.selectOption('select[name="expYear"]', expYear);
            await page.fill('input[name="cvv"]', cvv);

            let resp;
            try {
                [resp] = await Promise.all([
                    page.waitForResponse(res =>
                        res.url().includes('/order') && res.request().method() === 'POST', { timeout: 15000 }
                    ),
                    page.click('form#checkout button[type="submit"]')
                ]);
            } catch (e) {
                log(`❌ [${label}] Не получили ответ от сервера! ${e.message || e}`);
                return;
            }

            if (resp.status() >= 400) {
                log(`❌ [${label}] Сервер вернул ошибку: ${resp.status()} ${resp.statusText()}`);
                try { log('Ответ сервера:', await resp.text()); } catch {}
                return;
            }

            let json = {};
            try { json = await resp.json(); } catch {}
            const err = json.fieldErrors?.[0]?.error || '';
            if (err.includes(expectError)) {
                log(`✅ ${label}: ошибка поймана корректно: "${err}"`);
            } else {
                log(`❌ ${label}: не получили ожидаемую ошибку. Получено: "${err}"`);
            }
        } catch (err) {
            log(`❌ [${label}] Ловим ошибку вне запроса: ${err.message || err}`);
        }
    }

    if (checkType === 'full'){
        await checkCardNegative({
            number: '378282246310005',
            expectError: 'amex credit card is not allowed',
            label: 'AmEx'
        });

        await checkCardNegative({
            number: '30569309025904',
            expectError: 'diners club carte blanche credit card is not supported',
            label: 'Diners Club'
        });

        await checkCardNegative({
            number: '6011111111111117',
            expectError: 'discover credit card is not allowed',
            label: 'Discover'
        });

        await checkCardNegative({
            number: '3530111333300000',
            expectError: 'jcb credit card is not supported',
            label: 'JCB'
        });
    }

    // --- Успешная тестовая карта ---
    log('✅ Заполняем тестовую карту на успешную покупку...');
    await page.fill('input[name="cardNumber"]', '4716934807660821');
    await page.selectOption('select[name="expMonth"]', '01');
    await page.selectOption('select[name="expYear"]', '2030');
    await page.fill('input[name="cvv"]', '123');
    log('✅ Данные тестовой карты заполнены: 4716 9348 0766 0821, 01/2030, cvv 123');

    let mainResp;
    try {
        const [request, upsaleState, nav] = await Promise.all([
            page.waitForRequest(req =>
                req.method() === 'POST' && req.url().includes('/order'), { timeout: 15000 }
            ),
            (async () => {
                const state = await checkStateAjax(page, log);
                if (state) log('🟢 State получен на первом апсейле!');
                else log('⚠️ Не удалось получить state на первом апсейле!');
                return state;
            })(),
            page.click('form#checkout button[type="submit"]'),
            page.waitForNavigation({
                url: url =>
                    /\/upsale-\d+\.html/i.test(url) ||
                    /\/confirmation(\.html)?/i.test(url),
                waitUntil: 'load',
                timeout: 15000
            })
        ]);
        mainResp = request;
    } catch (e) {
        log('❌ [Checkout] Не получили ответ или редирект от сервера! ' + (e.message || e));
        // НЕ дропаем тест, идём дальше если надо
    }

    if (mainResp) {
        let postDataParsed = {};
        const postData = mainResp.postData();
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
    }

    const currentUrl = page.url();

    if (/\/upsale-\d+\.html/i.test(currentUrl)) {
        log(`➡️ Перешли на первый апсейл: ${currentUrl}`);
    } else if (/\/confirmation(\.html)?/i.test(currentUrl)) {
        log(`➡️ Перешли на confirmation: ${currentUrl}`);
    } else {
        log('❌ Не перешли ни на апсейл, ни на confirmation-страницу!');
        if (sendTestInfo) {
            sendTestInfo({
                error: '❌ Не перешли ни на апсейл, ни на confirmation-страницу!',
                url: currentUrl
            });
        }
    }
};
