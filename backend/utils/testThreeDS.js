/**
 * @param {import('playwright').Page} page
 * @param {Function} log
 * @param {string} threeDS - 'pixxles-ga' | 'pixxles-dna' | 'paay-combined' | 'paay-old' | 'none'
 * @param {string} pageName - 'index' | 'checkout' | 'order' |  'qualify'
 */
module.exports = async function testThreeDS(page, log, threeDS, pageName) {
    // Нормализация флоу: пусто / null / undefined / 'none' => режим без 3DS
    const flow = (typeof threeDS === 'string' ? threeDS.trim().toLowerCase() : '');
    const isNo3DS = !flow || flow === 'none';
    const label = isNo3DS ? 'none 3ds' : (flow || 'unknown');

    // Унифицированная запись лога с меткой и страницей
    const ok = (msg) => log(`✅ [${label}] ${msg} на ${pageName}`);
    const bad = (msg) => log(`❌ [${label}] ${msg} на ${pageName}`);
    const info = (msg) => log(`ℹ️ [${label}] ${msg} на ${pageName}`);

    async function checkProcPopup(expect = true) {
        const exists = await page.$('#proc_popup') !== null;
        if (expect) exists ? ok('#proc_popup найден') : bad('#proc_popup НЕ найден');
        else !exists ? ok('#proc_popup отсутствует') : bad('#proc_popup найден, а не должен быть!');
    }

    async function checkOptionVar(keys = [], expectExist = true) {
        const scripts = await page.$$eval('head script', arr => arr.map(x => x.textContent || ''));
        const found = scripts.find(txt => txt.includes('var options=') || txt.includes('var options ='));
        if (!found) {
            for (const key of keys) {
                expectExist
                    ? bad(`options.${key} отсутствует или false (script с options не найден)`)
                    : ok(`options.${key} отсутствует (script с options не найден)`);
            }
            return;
        }
        let options = {};
        try { eval(found.replace(/^.*var options\s*=\s*/s, 'options = ')); }
        catch (e) { bad(`Не удалось распарсить options: ${e.message}`); return; }
        for (const key of keys) {
            const exists = Object.prototype.hasOwnProperty.call(options, key) && !!options[key];
            if (expectExist) {
                exists ? ok(`options.${key}: true`) : bad(`options.${key} отсутствует или false`);
            } else {
                !exists ? ok(`options.${key} отсутствует`) : bad(`options.${key} найден, а не должен!`);
            }
        }
    }

    async function checkPaayIframe(expect = true) {
        const exists = await page.$('iframe#paay-iframe') !== null;
        if (expect) exists ? ok('iframe#paay-iframe найден') : bad('iframe#paay-iframe НЕ найден');
        else !exists ? ok('iframe#paay-iframe отсутствует') : bad('iframe#paay-iframe найден, а не должен!');
    }

    async function checkPaayLib(expect = true) {
        const exists = await page.$('script[src*="threeds.2.2"]') !== null;
        if (expect) exists ? ok('Библиотека PAAY подключена') : bad('Библиотека PAAY НЕ подключена');
        else !exists ? ok('Библиотека PAAY отсутствует') : bad('Библиотека PAAY подключена, а не должна!');
    }

    async function check3dsBlockExists(shouldExist = true) {
        try {
            const exists = await page.evaluate(() => !!document.getElementById('3ds'));
            if (shouldExist) exists ? ok('3ds-iframe найден') : bad('3ds-iframe НЕ найден');
            else !exists ? ok('3ds-iframe отсутствует') : bad('3ds-iframe найден, а не должен!');
        } catch (err) {
            bad(`Ошибка при поиске 3ds-iframe: ${err}`);
        }
    }

    async function checkHiddenInputXtid(expect = true) {
        const exists = await page.$('input[type="hidden"][name="x_transaction_id"]') !== null;
        if (expect) exists ? ok('input[name="x_transaction_id"][type="hidden"] найден')
            : bad('input[name="x_transaction_id"][type="hidden"] НЕ найден');
        else !exists ? ok('input[name="x_transaction_id"][type="hidden"] отсутствует')
            : bad('input[name="x_transaction_id"][type="hidden"] найден, а не должен!');
    }


    if (isNo3DS) {
        if (pageName === 'index' || pageName === 'qualify') {
            await checkProcPopup(false);

        } else if (pageName === 'checkout' || pageName === 'order') {
            await checkPaayIframe(false);
            await checkPaayLib(false);
            await check3dsBlockExists(false);
            await checkHiddenInputXtid(false);
        }

        await checkOptionVar(['dnaThreeDS', 'browserData', 'combinedRequest', 'gontelPayy'], false);

        return;
    }

    // --- Pixxles GA ---
    if (flow === 'pixxles-ga') {
        if (pageName === 'index' || pageName === 'qualify') {
            await checkProcPopup(true);
            await checkOptionVar(['browserData', 'dnaThreeDS'], false);

        } else if (pageName === 'checkout' || pageName === 'order') {
            await checkProcPopup(true);
            await checkPaayIframe(false);
            await checkOptionVar(['browserData', 'dnaThreeDS'], false);
            await checkPaayLib(false);
            await check3dsBlockExists(true);
        } else {
            info(`Страница ${pageName} не требует проверки 3DS Pixxles GA`);
        }
    }

    // --- Pixxles DNA ---
    else if (flow === 'pixxles-dna') {
        if (pageName === 'index' || pageName === 'qualify') {
            await checkProcPopup(true);
            await checkOptionVar(['dnaThreeDS'], true);
        } else if (pageName === 'checkout' || pageName === 'order') {
            await checkProcPopup(true);
            await checkPaayIframe(false);
            await checkOptionVar(['dnaThreeDS'], true);
            await checkPaayLib(false);
            await check3dsBlockExists(true);
        } else {
            info(`Страница ${pageName} не требует проверки 3DS Pixxles DNA`);
        }
    }

    // --- PAAY combinedRequest ---
    else if (flow === 'paay-combined') {
        if (pageName === 'index' || pageName === 'qualify') {
            await checkProcPopup(false);
            await checkOptionVar(['dnaThreeDS', 'browserData'], false);
        } else if (pageName === 'checkout' || pageName === 'order') {
            await checkProcPopup(true);
            await checkPaayIframe(false);
            await checkOptionVar(['dnaThreeDS', 'browserData', 'combinedRequest', 'gontelPayy'], false);
            await checkPaayLib(true);
            await check3dsBlockExists(false);
            await checkHiddenInputXtid(false);
        } else {
            info(`Страница ${pageName} не требует проверки 3DS PAAY combinedRequest`);
        }
    }

    // --- PAAY old ---
    else if (flow === 'paay-old') {
        if (pageName === 'index' || pageName === 'qualify') {
            await checkProcPopup(false);
            await checkOptionVar(['dnaThreeDS', 'browserData'], false);
        } else if (pageName === 'checkout' || pageName === 'order') {
            await checkProcPopup(true);
            await checkPaayIframe(true);
            await checkOptionVar(['dnaThreeDS', 'browserData', 'combinedRequest'], false);
            await checkOptionVar(['gontelPayy'], true);
            await checkPaayLib(true);
            await check3dsBlockExists(false);
            await checkHiddenInputXtid(true);
        } else {
            info(`Страница ${pageName} не требует проверки 3DS PAAY old`);
        }
    }

    // --- Неподдерживаемый флоу (подстраховка) ---
    else {
        info('Неизвестный threeDS. Использую проверки "без 3DS".');
        await checkProcPopup(false);
        await checkPaayIframe(false);
        await checkPaayLib(false);
        await check3dsBlockExists(false);
        await checkHiddenInputXtid(false);
        await checkOptionVar(['dnaThreeDS', 'browserData', 'combinedRequest', 'gontelPayy'], false);
    }
};
