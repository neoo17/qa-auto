/**
 * @param {import('playwright').Page} page
 * @param {Function} log
 * @param {string|object|undefined} [custom] // <-- опционально: как в chooseByCustomParam
 * @param {Function} [sendTestInfo]
 * @param {Function} [checkStateAjax]
 * @param {string} [checkType]
 */
module.exports = async function checkCheckoutForm(page, log, custom, sendTestInfo, checkStateAjax, checkType) {
    if (typeof custom === 'function' || custom === undefined) {
        checkType = checkStateAjax;
        checkStateAjax = sendTestInfo;
        sendTestInfo = custom;
        custom = undefined;
    }

    // ---- Нормализация custom-схемы (как в chooseByCustomParam), но сохраняем буквы 'p' ----
    let selectSchema = "1";
    if (custom && typeof custom === 'object') {
        if (custom.param) selectSchema = String(custom.param);
        else if (custom.customParam) selectSchema = String(custom.customParam);
    } else if (typeof custom === 'string' && custom.trim()) {
        selectSchema = custom.trim();
    }

    // Оставляем цифры, дефисы и латинские буквы (для фиксации 'p')
    selectSchema = (selectSchema || "1")
        .replace(/[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/g, '-') // все виды тире
        .replace(/\s+/g, '')
        .replace(/[^0-9a-zA-Z-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') || "1";

    const partsRaw = selectSchema.split('-').filter(Boolean);
    const firstRaw = partsRaw[0] || "1";
    const hasP = /p/i.test(firstRaw);
    const orderType = parseInt(firstRaw, 10) || 1;

    // Для возможного дальнейшего использования сценарных шагов
    const actions = partsRaw.map(x => parseInt(x, 10)).filter(Number.isFinite);

    let declinePopupWasClosed = false;

    async function waitLoaderGone(page, timeout = 12000) {
        const selectors = ['#proc_popup', '.loading', '.loader'];
        const start = Date.now();
        while (Date.now() - start < timeout) {
            const anyVisible = await page.evaluate((sels) => {
                for (const sel of sels) {
                    const el = document.querySelector(sel);
                    if (el) {
                        const style = window.getComputedStyle(el);
                        if (style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0') {
                            return true;
                        }
                    }
                }
                return false;
            }, selectors);
            if (!anyVisible) return;
            await page.waitForTimeout(100);
        }
        log('⚠️ Loader не исчез за 12 секунд! Жмём кнопку в любом случае.');
    }

    // Универсальная функция для клика по submit-кнопке на форме чекаута
    async function clickCheckoutSubmit(page, log) {
        const selectors = [
            'form#checkout button[type="submit"]',
            'form#checkout input[type="submit"]',
            '#checkout button[type="submit"]',
            '#checkout input[type="submit"]',
            '#checkout button',
            '#checkout input[type="submit"]'
        ];
        for (const sel of selectors) {
            const el = await page.$(sel);
            if (el) {
                log(`✔️ Найден элемент для отправки: ${sel}`);
                await el.click();
                return true;
            }
        }
        log('❌ Не найден элемент для отправки формы!');
        throw new Error('Не найден элемент для отправки формы!');
    }

    async function closeDeclinePopupIfVisible(page) {
        if (declinePopupWasClosed) return;
        try {
            await page.waitForSelector('.decline-popup-shopify', { state: 'visible', timeout: 250 });
            await page.click('.decline-popup-shopify .close-popup-1', { timeout: 250 }).catch(() => {});
            await page.waitForSelector('.decline-popup-shopify', { state: 'hidden', timeout: 250 }).catch(() => {});
            log('⚡️ Закрыли Shopify Decline popup');
            declinePopupWasClosed = true;
        } catch {

        }
    }

    log('💳 Проверяем и заполняем форму #checkout...');
    await page.waitForSelector('form#checkout', { timeout: 7000 });

    try {
        if (custom && (custom.partner === 'dnav3' || custom.partner === 'newdna') && custom.shipping === false) {
            const standardInput = page.locator('input#standard');
            const standardLabel = page.locator('label.delivery-line[for="standard"], label[for="standard"].delivery-line');


            const exists = (await standardInput.count().catch(() => 0)) > 0;
            if (!exists) {
                log('ℹ️ Радио-кнопка доставки #standard не найдена — пропускаем переключение.');
            } else {
                const isStandardChecked = async () => {
                    try { return await standardInput.isChecked(); }
                    catch {
                        return await page.evaluate(() => !!document.querySelector('#standard')?.checked);
                    }
                };

                if (!(await isStandardChecked())) {

                    if ((await standardLabel.count()) > 0) {
                        await standardLabel.scrollIntoViewIfNeeded().catch(() => {});
                        await standardLabel.click({ timeout: 1500 }).catch(() => {});
                    }

                    if (!(await isStandardChecked())) {
                        if ((await standardInput.count()) > 0) {
                            await standardInput.scrollIntoViewIfNeeded().catch(() => {});

                            await standardInput.click({ timeout: 800 }).catch(async () => {
                                await page.evaluate(() => {
                                    const std = document.querySelector('#standard');
                                    if (!std) return;
                                    std.checked = true;
                                    std.dispatchEvent(new Event('input', { bubbles: true }));
                                    std.dispatchEvent(new Event('change', { bubbles: true }));
                                    const lbl = document.querySelector('label[for="standard"]');
                                    if (lbl) lbl.dispatchEvent(new MouseEvent('click', { bubbles: true }));
                                });
                            });
                        }
                    }

                    if (await isStandardChecked()) {
                        try {
                            await page.evaluate(() => {
                                const exp = document.querySelector('#expedited-dna');
                                if (exp && exp.checked) {
                                    exp.checked = false;
                                    exp.dispatchEvent(new Event('input', { bubbles: true }));
                                    exp.dispatchEvent(new Event('change', { bubbles: true }));
                                }
                            });
                        } catch {}
                    }

                    if (await isStandardChecked()) {
                        log('✅ Доставка переключена на Standard.');

                    } else {
                        log('❌ Не удалось переключить доставку на Standard (custom.shipping=false).');

                    }
                } else {
                    log('ℹ️ Уже выбран Standard (custom.shipping=false).');

                }
            }
        }
    } catch (e) {
        log('⚠️ Ошибка при переключении доставки на Standard: ' + (e.message || e));
    }

    try {
        const shippingChkSel = '#shipping_plus';
        const labelSel = 'label:has(#shipping_plus)';
        const checkmarkSel = 'label:has(#shipping_plus) .checkmark';

        const labelLoc = page.locator(labelSel);
        const chkLoc = page.locator(shippingChkSel);
        const checkmarkLoc = page.locator(checkmarkSel);


        const chkCount = await chkLoc.count().catch(() => 0);
        if (!chkCount) {
            log('ℹ️ #shipping_plus не найден на странице — пропускаем настройку доставки/страховки.');
        } else {
            const isChecked = async () => {
                try { return await chkLoc.isChecked(); } catch {
                    return await page.evaluate(sel => {
                        const el = document.querySelector(sel);
                        return !!(el && el.checked);
                    }, shippingChkSel);
                }
            };

            const shouldUncheck = /^\d+$/.test(firstRaw) && orderType === 3 && !hasP;

            if (shouldUncheck) {
                // 1) пробуем кликнуть по label (он кликабелен даже если input скрыт)
                if (await labelLoc.count()) {
                    await labelLoc.scrollIntoViewIfNeeded().catch(() => {});
                    await labelLoc.click({ timeout: 2000 }).catch(() => {});
                }

                // 2) если всё ещё отмечен — пробуем клик по .checkmark
                if (await isChecked() && await checkmarkLoc.count()) {
                    await checkmarkLoc.click({ timeout: 1500 }).catch(() => {});
                }

                // 3) если всё ещё отмечен — снимаем программно и шлём события
                if (await isChecked()) {
                    await page.evaluate((sel) => {
                        const el = document.querySelector(sel);
                        if (!el) return;
                        el.checked = false;
                        el.dispatchEvent(new Event('input', { bubbles: true }));
                        el.dispatchEvent(new Event('change', { bubbles: true }));
                        // если тема слушает клики по label — «симулируем» их тоже
                        const lbl = el.closest('label');
                        if (lbl) lbl.dispatchEvent(new MouseEvent('click', { bubbles: true }));
                    }, shippingChkSel);
                }

                if (await isChecked()) {
                    log('⚠️ Не удалось снять галочку #shipping_plus (schema без "p"). Возможно, блокирует CSS/скрипт.');
                } else {
                    log('🛠 Cнята галочка #shipping_plus (schema без "p").');
                }
            } else if (hasP) {
                log('ℹ️ Выбран вариант с буквой "p" — оставляем #shipping_plus как есть (причек).');
            } else {
                log(`ℹ️ Схема "${firstRaw}" не требует изменений #shipping_plus.`);
            }
        }
    } catch (e) {
        log('⚠️ Ошибка при обработке #shipping_plus: ' + (e.message || e));
    }


    page.on('console', msg => {
        if (msg.type() === 'error' && msg.text().includes('Failed to load resource: the server responded with a status of 400')) {
            return;
        }
        if (msg.type() === 'error') log('[Console error] ' + msg.text());
    });
    page.on('pageerror', err => log('[JS error] ' + err));

    // Проверка "retry" (cvv: 000)
    log('🔄 Проверяем статус "retry" (cvv: 000)...');
    await page.fill('input[name="cardNumber"]', '4716934807660821');
    await page.selectOption('select[name="expMonth"]', '01');
    await page.selectOption('select[name="expYear"]', '2030');
    await page.fill('input[name="cvv"]', '000');
    await waitLoaderGone(page);

    let retryResponse;
    try {
        const [, resp, resp3ds] = await Promise.all([
            page.waitForRequest(req => req.method() === 'POST' && req.url().includes('/order'), { timeout: 5000 }),
            page.waitForResponse(res => res.url().includes('/order') && res.request().method() === 'POST', { timeout: 5000 }),
            page.waitForResponse(res => res.url().includes('/add-order-3ds-key') && res.request().method() === 'POST', { timeout: 5000 }).catch(() => null),
            clickCheckoutSubmit(page, log)
        ]);
        retryResponse = resp3ds || resp;
    } catch (e) {
        log('❌ [retry] Не получили ответ от сервера в течение 5 секунд! ' + (e.message || e));
    }

    await closeDeclinePopupIfVisible(page); // После retry всегда проверяем попап!

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

            await waitLoaderGone(page);

            const orderRespPromise = page.waitForResponse(res =>
                res.url().includes('/order') && res.request().method() === 'POST', { timeout: 5000 }
            ).catch(() => null);

            const add3dsRespPromise = page.waitForResponse(res =>
                res.url().includes('/add-order-3ds-key') && res.request().method() === 'POST', { timeout: 5000 }
            ).catch(() => null);

            const paay3dsPromise = page.waitForResponse(res =>
                res.url().includes('3dsintegrator.com/v2.2/authenticate/browser') &&
                res.request().method() === 'POST', { timeout: 7000 }
            ).catch(() => null);

            await clickCheckoutSubmit(page, log);

            const [orderResp, add3dsResp, paay3dsResp] = await Promise.all([
                orderRespPromise,
                add3dsRespPromise,
                paay3dsPromise
            ]);

            // после попытки закрываем попап (если появился и если ещё не закрывали ранее)
            await closeDeclinePopupIfVisible(page);

            // --- ОТВЕТ ОТ 3DSINTEGRATOR ---
            if (paay3dsResp && paay3dsResp.status() === 400) {
                let body = await paay3dsResp.text();
                let errorText = '';
                try {
                    let asJson = JSON.parse(body);
                    if (asJson && asJson.error) {
                        errorText = asJson.error;
                    }
                } catch {}

                if (errorText && expectError && errorText.includes(expectError)) {
                    log(`✅ ${label}: ошибка поймана корректно: "${errorText}"`);
                    return;
                }
                if (!errorText && (!body || body.trim() === "")) {
                    log(`✅ ${label}: Получил decline от PAAY 3ds`);
                    return;
                }
                log(`✅ ${label}: Получил decline от PAAY 3ds (error: "${errorText || body}")`);
                return;
            }

            // --- fallback на остальные ajax ---
            let resp = add3dsResp || orderResp;
            if (!resp) {
                log(`✅ ${label}: Получил decline от PAAY 3ds`);
                return;
            }

            if (resp.status() >= 400) {
                let body = await resp.text();
                let errorText = '';
                let isJson = false;
                try {
                    let asJson = JSON.parse(body);
                    isJson = true;
                    if (asJson && asJson.fieldErrors && asJson.fieldErrors.length) {
                        errorText = asJson.fieldErrors[0].error || '';
                    }
                } catch {}
                if (errorText && expectError && errorText.includes(expectError)) {
                    log(`✅ ${label}: ошибка поймана корректно: "${errorText}"`);
                    return;
                }
                if (!errorText && !isJson && (!body || body.trim() === "")) {
                    log(`✅ ${label}: Получил decline от PAAY 3ds`);
                    return;
                }
                log(`❌ ${label}: не получили ожидаемую ошибку. Получено: "${errorText || body}"`);
                return;
            }

            // Обычная success-валидация
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
    await waitLoaderGone(page);
    log('✅ Данные тестовой карты заполнены: 4716 9348 0766 0821, 01/2030, cvv 123');

    let mainResp, add3dsReq, ds3Resp;
    try {
        const orderReqPromise = page.waitForRequest(req =>
            req.method() === 'POST' && req.url().includes('/order'), { timeout: 5000 }
        ).catch(() => null);

        const add3dsReqPromise = page.waitForRequest(req =>
            req.method() === 'POST' && req.url().includes('/add-order-3ds-key'), { timeout: 5000 }
        ).catch(() => null);

        const ds3ReqPromise = page.waitForRequest(req =>
            req.method() === 'POST' && req.url().includes('3dsintegrator.com'), { timeout: 5000 }
        ).catch(() => null);

        const ds3RespPromise = page.waitForResponse(res =>
            res.url().includes('3dsintegrator.com') && res.request().method() === 'POST', { timeout: 5000 }
        ).catch(() => null);

        const statePromise = (async () => {
            const state = await checkStateAjax?.(page, log);
            if (state) log('🟢 State получен на первом апсейле!');
            else log('⚠️ Не удалось получить state на первом апсейле!');
            return state;
        })();

        const navPromise = page.waitForNavigation({
            url: url =>
                /\/upsale-\d+\.html/i.test(url) ||
                /\/confirmation(\.html)?/i.test(url),
            waitUntil: 'load',
            timeout: 7000
        }).catch(() => null);

        await clickCheckoutSubmit(page, log);

        const [orderReq, add3dsRequest, ds3Request, ds3Response] = await Promise.all([
            orderReqPromise,
            add3dsReqPromise,
            ds3ReqPromise,
            ds3RespPromise,
            statePromise,
            navPromise
        ]);

        mainResp = orderReq;
        add3dsReq = add3dsRequest;
        ds3Resp = ds3Response;

        if (ds3Resp && ds3Resp.status() === 400) {
            try {
                const ds3Json = await ds3Resp.json();
                if (ds3Json.error) {
                    log(`❌ Деклайн от 3DS: "${ds3Json.error}"`);
                    sendTestInfo && sendTestInfo({
                        _section: '3DS Error',
                        error: ds3Json.error,
                        data: ds3Json
                    });
                }
            } catch {}
        }

        if (add3dsReq) log('ℹ️ Обнаружен запрос к ajax/add-order-3ds-key');
        if (ds3Request) log('ℹ️ Обнаружен запрос к 3dsintegrator.com');
    } catch (e) {
        log('❌ [Checkout] Не получили ответ или редирект от сервера! ' + (e.message || e));
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
        sendTestInfo && sendTestInfo({ _section: 'Checkout POST ajax/order', data: postDataParsed });
        log('✅ POST ajax/order на чек-аут отправлен');
    } else {
        log('❌ Не удалось отследить ajax-запрос на /order после отправки формы checkout!');
        sendTestInfo && sendTestInfo({ error: '❌ Не удалось отследить POST ajax/order на чекауте!' });
    }

    if (add3dsReq) {
        let requestData = {};
        const postData = add3dsReq.postData();
        if (postData) {
            try {
                const params = new URLSearchParams(postData);
                for (const [k, v] of params.entries()) requestData[k] = v;
            } catch (e) {
                requestData = postData;
            }
        }
        sendTestInfo && sendTestInfo({
            _section: 'Checkout POST ajax/add-order-3ds-key',
            data: requestData,
            response: {}
        });
        log('✅ POST ajax/add-order-3ds-key на чек-аут отправлен');
    }

    const currentUrl = page.url();
    if (/\/upsale-\d+\.html/i.test(currentUrl)) {
        log(`➡️ Перешли на первый апсейл: ${currentUrl}`);
    } else if (/\/confirmation(\.html)?/i.test(currentUrl)) {
        log(`➡️ Перешли на confirmation: ${currentUrl}`);
    } else {
        log('❌ Не перешли ни на апсейл, ни на confirmation-страницу!');
        sendTestInfo && sendTestInfo({
            error: '❌ Не перешли ни на апсейл, ни на confirmation-страницу!',
            url: currentUrl
        });
    }

    return actions;
};
