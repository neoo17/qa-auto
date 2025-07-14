const shot = require('../utils/screenshotHelper');

function getExpectedUpsale({ upsales, profile, upsaleIndex, page }) {
    // Спецлогика только для первого апсейла и upgrade
    if (upsaleIndex === 1 && profile?.product?.quantity) {
        // Находим upgrade для нужного количества пакетов
        const upgradeName = `-upgrade-${profile.product.quantity}`;
        const found = upsales.find(u => u.name && u.name.includes(upgradeName));
        if (found) return found;
    }

    // Дальше пробуем по sku из URL
    let url = page.url();
    let match = url.match(/upsale-(\d+)\.html/);
    let skuFromUrl = match ? match[1] : null;
    if (skuFromUrl) {
        const foundBySku = upsales.find(u => String(u.sku) === skuFromUrl);
        if (foundBySku) return foundBySku;
    }

    // Строго по индексу (апсейлы идут строго по порядку после upgrade)
    // (индекс в массиве upsales: если был upgrade, то 1 => 1-й after upgrade)
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

function compareSku({ expectedUpsale, postDataParsed, upsaleIndex, log, sendTestInfo }) {
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
    if (typeof sendTestInfo === 'function') {
        sendTestInfo({
            _section: 'Upsales POST ajax/order',
            sku: expectedSku,
            data: { 'upsale[]': actualSku }
        });
    }
}

module.exports = async function handleUpsales(
    page, log, custom, sendTestInfo, checkStateAjax, firstUpsaleState, screenshotDir
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

    while (upsaleIndex < maxUpsales) {
        let currentUrl = page.url();
        if (/confirmation\.html/i.test(currentUrl)) {
            log('✅ Достигли страницы подтверждения (confirmation.html), обработка апсейлов завершена');
            break;
        }
        // Нет нужного апсейла в массиве — выходим (чтобы не ловить NO-кнопку на несуществующем апсейле)
        if (compareUpsales.length < upsaleIndex) break;

        // --- На первом апсейле тестим "назад" сразу ---
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

        // --- На последующих апсейлах перед кнопками ждём стейт и смотрим URL ---
        if (upsaleIndex > 1 && typeof checkStateAjax === 'function') {
            await checkStateAjax(page, log);
            const urlAfterState = page.url();
            if (/confirmation\.html/i.test(urlAfterState)) {
                log('➡️ Переход на confirmation');
                break;
            }
            // тест "назад" на втором и последующих апсейлах
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

        // ----- Дальше обычный flow с покупкой/отказом -----
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

        // --- Сравнение TITLE до клика ---
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

        if (action === 1) {
            // YES: ждем ajax/add-upsale, для SKU
            let request;
            try {
                [request] = await Promise.all([
                    page.waitForRequest(req =>
                            req.method() === 'POST' && req.url().includes('/ajax/add-upsale'),
                        { timeout: 5000 }
                    ),
                    btnHandle.click()
                ]);
            } catch (e) {
                log(`❌ Ошибка: не удалось обработать апсейл #${upsaleIndex} (YES)`);
                if (sendTestInfo) sendTestInfo({
                    error: `Ошибка: не удалось обработать апсейл #${upsaleIndex} (YES)`
                });
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
                compareSku({ expectedUpsale, postDataParsed, upsaleIndex, log, sendTestInfo });
            }
            log(`✔️ Upsale #${upsaleIndex}: Купили`);
            log(`--------------------------`);
        } else {
            // NO
            try {
                await btnHandle.click();
                log(`✔️ Upsale #${upsaleIndex}: Отклонили`);
                log(`--------------------------`);
            } catch (e) {
                log(`❌ Ошибка: не удалось отклонить апсейл #${upsaleIndex} (NO)`);
                if (sendTestInfo) sendTestInfo({
                    error: `Ошибка: не удалось отклонить апсейл #${upsaleIndex} (NO)`
                });
                break;
            }
        }

        await page.waitForTimeout(350);
        // после каждого клика проверяем URL (confirmation? — больше не идём дальше)
        const afterUrl = page.url();
        if (/confirmation\.html/i.test(afterUrl)) {
            log('➡️ Переход на confirmation');
            break;
        }
        upsaleIndex++;
    }
};
