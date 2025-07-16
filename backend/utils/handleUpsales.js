const shot = require('../utils/screenshotHelper');

function getExpectedUpsale({ upsales, profile, upsaleIndex, page }) {
    if (upsaleIndex === 1 && profile?.product?.quantity) {
        const upgradeName = `-upgrade-${profile.product.quantity}`;
        const found = upsales.find(u => u.name && u.name.includes(upgradeName));
        if (found) return found;
    }
    let url = page.url();
    let match = url.match(/upsale-(\d+)\.html/);
    let skuFromUrl = match ? match[1] : null;
    if (skuFromUrl) {
        const foundBySku = upsales.find(u => String(u.sku) === skuFromUrl);
        if (foundBySku) return foundBySku;
    }
    return upsales[upsaleIndex - 1] || null;
}

async function compareTitle({ page, expectedUpsale, upsaleIndex, log }) {
    let expectedTitle = expectedUpsale?.templates?.title || '';
    let titleStripped = expectedTitle.replace(/Upsell|Upgrade/gi, '').trim().toLowerCase();
    let actualTitle = (await page.title() || '').replace(/Upsell|Upgrade/gi, '').trim().toLowerCase();
    log(`--- [Сравнение апсейла #${upsaleIndex}] ---`);
    log(`Тип апсейла: ${upsaleIndex === 1 ? 'UPGRADE' : 'ОБЫЧНЫЙ'}`);
    log(`Ожидаемый TITLE: "${titleStripped}"`);
    log(`Фактический TITLE (из страницы): "${actualTitle}"`);
    if (expectedUpsale && actualTitle !== titleStripped) {
        log(`❌ [Check][#${upsaleIndex}] Title не совпал! Ожидали: "${titleStripped}", Фактический: "${actualTitle}"`);
    } else if (expectedUpsale) {
        log(`✅ [Check][#${upsaleIndex}] Title совпал`);
    } else {
        log(`❌ [Check][#${upsaleIndex}] Не нашли апсейл для сравнения!`);
    }
}

// ВАЖНО: сюда теперь передаём partner
function compareSku({ expectedUpsale, postDataParsed, upsaleIndex, log, sendTestInfo, action, partner }) {
    let expectedSku = expectedUpsale?.sku;
    const actualSku = postDataParsed['upsale[]'] || null;
    log(`Ожидаемый SKU: ${String(expectedSku) === String(actualSku)
        ? `<span style="color:#33d033;font-weight:bold">${expectedSku}</span>`
        : `<span style="color:#c82d2d;font-weight:bold">${expectedSku}</span>`}`);
    log(`Фактический SKU (из ajax/add-upsale): ${String(expectedSku) === String(actualSku)
        ? `<span style="color:#33d033;font-weight:bold">${actualSku}</span>`
        : `<span style="color:#c82d2d;font-weight:bold">${actualSku}</span>`}`);
    if (String(expectedSku) === String(actualSku)) {
        log(`✅ [Check][#${upsaleIndex}] SKU совпал`);
    } else {
        log(`❌ [Check][#${upsaleIndex}] SKU не совпал! Ожидали: ${expectedSku}, Фактический (POST): ${actualSku}`);
    }
    // тут правим:
    if (typeof sendTestInfo === 'function') {
        let url;
        if (action === 1) {
            url = (partner === 'dnav3' || partner === 'newdna') ? 'ajax/upsale' : 'ajax/add-upsale';
        } else {
            url = (partner === 'dnav3' || partner === 'newdna') ? null : 'ajax/skip-upsells';
        }
        if (url) {
            sendTestInfo({
                _section: action === 1 ? 'YES' : 'NO',
                url,
                data: { 'upsale[]': actualSku }
            });
        }
    }
}

module.exports = async function handleUpsales(
    page, log, custom, sendTestInfo, checkStateAjax, firstUpsaleState, screenshotDir, partner
) {
    let selectSchema = "1";
    if (custom && typeof custom === 'string' && custom.trim().length > 0) selectSchema = custom.trim();
    if (custom && typeof custom === 'object' && custom.customParam) selectSchema = custom.customParam;
    let actions = selectSchema.split('-').map(x => Number(x));
    const buyAll = !actions || actions.length <= 1;
    let upsaleIndex = 1;
    const maxUpsales = 10;
    const compareUpsales = (firstUpsaleState && firstUpsaleState.upsales) ? firstUpsaleState.upsales : [];
    const compareProfile = (firstUpsaleState && firstUpsaleState.profile) ? firstUpsaleState.profile : {};
    const isDnaLike = partner === 'dnav3' || partner === 'newdna';

    while (upsaleIndex < maxUpsales) {
        let currentUrl = page.url();
        if (/confirmation\.html/i.test(currentUrl)) {
            log('✅ Достигли страницы подтверждения (confirmation.html), обработка апсейлов завершена');
            break;
        }
        if (compareUpsales.length < upsaleIndex) break;

        if (upsaleIndex === 1) {
            log(`🧪 Пробуем вернуться назад с первого апсейла на чекаут...`);
            const urlBefore = page.url();
            await page.goBack();
            await page.waitForTimeout(1000);
            const urlAfter = page.url();
            if (urlAfter === urlBefore) {
                log(`✅ [Check] После возврата назад всё еще остались на апсейле #1 (ОК)`);
            } else {
                log(`❌ [Check] После возврата назад URL изменился! Было: ${urlBefore}, стало: ${urlAfter}`);
            }
            await page.goForward();
            await page.waitForTimeout(350);
        }
        if (upsaleIndex > 1 && typeof checkStateAjax === 'function') {
            // Тут тоже не ждём state если DNA-партнёр и действие NO
            let action = buyAll ? 1 : (actions[upsaleIndex] ?? 0);
            if (!(isDnaLike && action !== 1)) {
                await checkStateAjax(page, log);
            } else {
                log('🟡 [DNA] Отказ (NO) — не ждём /ajax/state и не ждём стейта');
            }
            const urlAfterState = page.url();
            if (/confirmation\.html/i.test(urlAfterState)) {
                log('➡️ Переход на confirmation');
                break;
            }
            log(`🧪 Пробуем вернуться назад со второго и последующего апсейла на предыдущий...`);
            const urlBefore = page.url();
            await page.goBack();
            await page.waitForTimeout(1000);
            const urlAfter = page.url();
            if (urlAfter === urlBefore) {
                log(`✅ [Check] После возврата назад всё еще остались на апсейле #${upsaleIndex} (ОК)`);
            } else {
                log(`❌ [Check] После возврата назад URL изменился! Было: ${urlBefore}, стало: ${urlAfter}`);
            }
            await page.goForward();
            await page.waitForTimeout(350);
        }

        let action = 1;
        if (!buyAll) action = actions[upsaleIndex] ?? 0;
        let btnSelector = action === 1
            ? '.button_fixed .button__yes.u-button, .button__yes:not([style*="display:none"])'
            : '.button__no:not([style*="display:none"])';

        let btnHandle;
        try {
            btnHandle = await page.waitForSelector(btnSelector, { timeout: 6000, state: 'visible' });
        } catch {
            btnHandle = null;
        }
        if (!btnHandle) {
            log(`❌ Нет видимой кнопки ${action === 1 ? 'YES' : 'NO'} для апсейла #${upsaleIndex}`);
            if (sendTestInfo) sendTestInfo({
                error: `Нет видимой кнопки ${action === 1 ? 'YES' : 'NO'} для апсейла #${upsaleIndex}`
            });
            break;
        }

        if (screenshotDir) {
            log(`🟡 [DEBUG] Делаю скриншот upsale-${upsaleIndex}`);
            await shot(page, screenshotDir, `upsale-${upsaleIndex}`, log);
        }

        if (compareUpsales && compareUpsales.length) {
            const expectedUpsale = getExpectedUpsale({
                upsales: compareUpsales,
                profile: compareProfile,
                upsaleIndex,
                page
            });
            await compareTitle({ page, expectedUpsale, upsaleIndex, log });
        } else {
            log(`⚠️ Нет данных state для сравнения upsale #${upsaleIndex}`);
        }

        let postDataParsed = null;
        let expectedUpsale = null;

        // --- ОЖИДАНИЕ ajax + ОЖИДАНИЕ state + КЛИК ---
        let request = null, stateResponse = null;
        const isYes = action === 1;
        let requestUrlPart = null;
        if (isYes) {
            requestUrlPart = isDnaLike ? '/upsale' : '/ajax/add-upsale';
        } else {
            requestUrlPart = isDnaLike ? null : '/ajax/skip-upsells';
        }

        try {
            let waitRequest = null;
            let statePromise = null;
            if (isDnaLike) {
                // DNA-партнёры: на апсейле state не ловим (всё равно не поймаем)
                if (isYes) {
                    waitRequest = page.waitForRequest(req =>
                            req.method() === 'POST' && req.url().includes('/upsale'),
                        { timeout: 5000 }
                    );
                }
                // NO — вообще ничего не ждём!
            } else {
                // Обычные партнёры — ловим и request, и state, оба до клика
                if (isYes) {
                    waitRequest = page.waitForRequest(req =>
                            req.method() === 'POST' && req.url().includes('/ajax/add-upsale'),
                        { timeout: 5000 }
                    );
                } else {
                    waitRequest = page.waitForRequest(req =>
                            req.method() === 'POST' && req.url().includes('/ajax/skip-upsells'),
                        { timeout: 5000 }
                    );
                }
                statePromise = page.waitForResponse(res =>
                        res.url().includes('/ajax/state') && res.status() === 200,
                    { timeout: 5000 }
                );
            }

            await btnHandle.click();

            // Если DNA и NO — сразу идём дальше, не ждём стейтов, не ловим request!
            if (isDnaLike && !isYes) {
                log('🟡 [DNA] Отказ (NO) — не ждём /ajax/state, идём дальше');
                log(`✔️ Upsale #${upsaleIndex}: Отклонили`);
                log('--------------------------');
                upsaleIndex++;
                continue;
            }

            request = waitRequest ? await waitRequest : null;
            stateResponse = statePromise ? await statePromise : null;

        } catch (e) {
            log(`❌ Ошибка: не удалось обработать апсейл #${upsaleIndex} (${isYes ? 'YES' : 'NO'})`);
            log(`ℹ️ Детали: ${e && e.message ? e.message : e}`);
            if (sendTestInfo) sendTestInfo({
                error: `Ошибка: не удалось обработать апсейл #${upsaleIndex} (${isYes ? 'YES' : 'NO'})`,
                details: e && e.message ? e.message : e
            });
            log(`ℹ️ Текущий url: ${page.url()}`);
            break;
        }

        postDataParsed = {};
        if (request) {
            const postData = request.postData();
            try {
                const params = new URLSearchParams(postData);
                for (const [k, v] of params.entries()) postDataParsed[k] = v;
            } catch {
                postDataParsed = postData;
            }
        }

        if (compareUpsales && compareUpsales.length) {
            expectedUpsale = getExpectedUpsale({ upsales: compareUpsales, profile: compareProfile, upsaleIndex, page });
            compareSku({ expectedUpsale, postDataParsed, upsaleIndex, log, sendTestInfo, action, partner });
        } else if (isDnaLike && !isYes) {
            log('🟡 [DNA] Нет skip-запроса для NO, сравнение не требуется');
        }

        log(`✔️ Upsale #${upsaleIndex}: ${isYes ? 'Купили' : 'Отклонили'}`);
        log(`--------------------------`);

        await page.waitForTimeout(350);
        const afterUrl = page.url();

        if (/confirmation\.html/i.test(afterUrl)) {
            try {
                await page.waitForResponse(res =>
                        res.url().includes('/ajax/state') && res.status() === 200,
                    { timeout: 3000 }
                );
                log('🟢 Пойман state на confirmation');
            } catch {
                log('⚠️ Не удалось поймать state на confirmation!');
            }
            log('➡️ Переход на confirmation');
            break;
        }

        upsaleIndex++;
    }
};
