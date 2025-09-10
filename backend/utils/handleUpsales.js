const shot = require('../utils/screenshotHelper');

function getExpectedUpsale({ upsales, profile, upsaleIndex, page }) {
    let url = page.url();
    let match = url.match(/upsale-(\d+)\.html/);
    let skuFromUrl = match ? match[1] : null;

    let foundBySku = skuFromUrl ? upsales.find(u => String(u.sku) === skuFromUrl) : null;

    const isUpgrade = foundBySku && foundBySku.name && foundBySku.name.includes('upgrade');

    if (isUpgrade && profile?.product?.quantity) {
        const upgradeNamePart = `upgrade-${profile.product.quantity}`;
        const upgradeByQuantity = upsales.find(u =>
            u.name && u.name.includes('upgrade') && u.name.endsWith(upgradeNamePart)
        );
        if (upgradeByQuantity) {
            return upgradeByQuantity;
        }
    }

    if (foundBySku) {
        return foundBySku;
    }

    return upsales[upsaleIndex - 1] || null;
}

async function compareTitle({ page, expectedUpsale, upsaleIndex, log }) {
    let expectedTitle = expectedUpsale?.templates?.title || '';
    let titleStripped = expectedTitle.replace(/Upsell|Upgrade/gi, '').trim().toLowerCase();
    let actualTitle = (await page.title() || '').replace(/Upsell|Upgrade/gi, '').trim().toLowerCase();

    const isUpgrade = expectedUpsale?.name && expectedUpsale.name.includes('upgrade');

    log(`--- [Сравнение апсейла #${upsaleIndex}] ---`);
    log(`Тип апсейла: ${isUpgrade ? 'UPGRADE' : 'ОБЫЧНЫЙ'}`);
    log(`Ожидаемый TITLE: "${titleStripped}"`);
    log(`Фактический TITLE (из страницы): "${actualTitle}"`);
    if (expectedUpsale && actualTitle !== titleStripped) {
        const expectedLower = titleStripped.toLowerCase();
        const actualLower = actualTitle.toLowerCase();

        const isDeliveryException = (
            expectedLower === 'expedited delivery' && actualLower === 'priority shipping'
        );

        if (isDeliveryException) {
            log(`✅ [Check][#${upsaleIndex}] Допустимое несовпадение: ожидали "expedited delivery", получили "priority shipping"`);
        } else {
            log(`❌ [Check][#${upsaleIndex}] Title не совпал! Ожидали: "${titleStripped}", Фактический: "${actualTitle}"`);
        }
    } else if (expectedUpsale) {
        log(`✅ [Check][#${upsaleIndex}] Title совпал`);
    } else {
        log(`❌ [Check][#${upsaleIndex}] Не нашли апсейл для сравнения!`);
    }
}

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

    if (typeof sendTestInfo === 'function') {
        const isYes = action === 1 || action === 2 || action === 3;
        const isDnaLike = (partner === 'dnav3' || partner === 'newdna');
        let url;
        if (isYes) {
            url = isDnaLike ? 'ajax/upsale' : 'ajax/add-upsale';
        } else {
            url = isDnaLike ? null : 'ajax/skip-upsells';
        }
        if (url) {
            sendTestInfo({
                _section: isYes ? 'YES' : 'NO',
                url,
                data: { 'upsale[]': actualSku }
            });
        }
    }
}

module.exports = async function handleUpsales(
    page, log, custom, sendTestInfo, checkStateAjax, firstUpsaleState, screenshotDir, partner
) {
    // ---- Фикс: берём param / customParam / строку и нормализуем ----
    const norm = v => String(v || '')
        .replace(/[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/g, '-') // разные тире -> '-'
        .replace(/\s+/g, '')
        .replace(/[^0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

    let selectSchema = '1';
    if (custom && typeof custom === 'object') {
        if (custom.param) selectSchema = String(custom.param);
        else if (custom.customParam) selectSchema = String(custom.customParam);
    } else if (typeof custom === 'string' && custom.trim()) {
        selectSchema = custom.trim();
    }
    selectSchema = norm(selectSchema) || '1';

    const actions = selectSchema.split('-').map(n => Number(n)).filter(n => Number.isFinite(n));

    // buyAll — если указали только пакет (длина 1) или вообще пусто
    const buyAll = actions.length <= 1;

    let upsaleIndex = 1;
    const maxUpsales = 10;
    const compareUpsales = (firstUpsaleState && firstUpsaleState.upsales) ? firstUpsaleState.upsales : [];
    const compareProfile = (firstUpsaleState && firstUpsaleState.profile) ? firstUpsaleState.profile : {};
    const isDnaLike = partner === 'dnav3' || partner === 'newdna';
    let prevUrl;

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
            // действие для текущего апсейла:
            // если buyAll -> всегда 1 (YES), иначе берём из actions[upsaleIndex]
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

        // --- ДЕЙСТВИЕ ДЛЯ ТЕКУЩЕГО АПСЕЙЛА ---
        // actions[0] — пакет, поэтому берём actions[upsaleIndex]
        let action = buyAll ? 1 : (actions[upsaleIndex] ?? 0);

        // --- Выбираем нужную кнопку ---
        let btnHandle = null;
        try {
            if (action === 1) {
                const yesBtns = await page.$$('a.button__yes:not([style*="display:none"])');
                if (yesBtns.length) btnHandle = yesBtns[0];
            } else if (action === 2) {
                const yesDivs = await page.$$('div.button__yes:not([style*="display:none"])');
                if (yesDivs.length) btnHandle = yesDivs[yesDivs.length - 1];
            } else if (action === 3) {
                const yesBtns = await page.$$('a.button__yes:not([style*="display:none"])');
                if (yesBtns.length) btnHandle = yesBtns[yesBtns.length - 1];
            } else {
                // NO
                // На некоторых лендингах кнопка NO бывает <button> или <div>. Подстрахуемся.
                const noBtns =
                    (await page.$$('a.button__no:not([style*="display:none"])')).concat(
                        await page.$$('button.button__no:not([style*="display:none"])'),
                        await page.$$('div.button__no:not([style*="display:none"])')
                    );
                if (noBtns.length) btnHandle = noBtns[0];
            }
        } catch {
            btnHandle = null;
        }

        if (!btnHandle) {
            log(`❌ Нет видимой кнопки ${action === 0 ? 'NO' : 'YES'} для апсейла #${upsaleIndex}`);
            if (sendTestInfo) sendTestInfo({
                error: `Нет видимой кнопки ${action === 0 ? 'NO' : 'YES'} для апсейла #${upsaleIndex}`
            });
            break;
        }

        const hasBonusPopup = await page.$('.bonus-popup-wrapper');
        if (hasBonusPopup) {
            log('ℹ️ На апсейле обнаружена бонусная модалка — закрываем её');
            const closeBtn = await page.$('.bonus-popup-wrapper .close-popup');
            if (closeBtn) {
                await closeBtn.click();
                await page.waitForSelector('.bonus-popup-wrapper', { state: 'detached', timeout: 5000 }).catch(() => {});
                log('✅ Модалка закрыта');
            } else {
                log('⚠️ Не нашли .close-popup для закрытия модалки!');
            }
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

        let request = null, stateResponse = null;
        const isYes = action === 1 || action === 2 || action === 3;
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
                if (isYes) {
                    waitRequest = page.waitForRequest(
                        req => req.method() === 'POST' && req.url().includes('/upsale'),
                        { timeout: 5000 }
                    );
                }
            } else {
                if (isYes) {
                    waitRequest = page.waitForRequest(
                        req => req.method() === 'POST' && req.url().includes('/ajax/add-upsale'),
                        { timeout: 5000 }
                    );
                } else {
                    waitRequest = page.waitForRequest(
                        req => req.method() === 'POST' && req.url().includes('/ajax/skip-upsells'),
                        { timeout: 5000 }
                    );
                }
                statePromise = page.waitForResponse(
                    res => res.url().includes('/ajax/state') && res.status() === 200,
                    { timeout: 5000 }
                );
            }

            log(`🖱️ Кликаю по кнопке ${isYes ? 'YES' : 'NO'} на апсейле #${upsaleIndex}`);
            prevUrl = page.url();
            await btnHandle.click();

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

        let afterUrl = prevUrl;

        try {
            await page.waitForFunction(
                url => location.href !== url,
                prevUrl,
                { timeout: 3000 }
            );
            afterUrl = page.url();
        } catch {
            afterUrl = page.url();
        }

        if (/confirmation\.html/i.test(afterUrl)) {
            try {
                await page.waitForResponse(
                    res => res.url().includes('/ajax/state') && res.status() === 200,
                    { timeout: 3000 }
                );
                log('🟢 Пойман state на confirmation');
            } catch {
                log('⚠️ Не удалось поймать state на confirmation!');
            }
            log('➡️ Переход на confirmation');
        }

        upsaleIndex++;
    }
};
