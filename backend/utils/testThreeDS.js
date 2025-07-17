/**
 * @param {import('playwright').Page} page
 * @param {Function} log
 * @param {string} threeDS - 'pixxles-ga' | 'pixxles-dna' | 'paay-combined' | 'paay-old'
 * @param {string} pageName - 'index' | 'checkout' | 'order' |  'qualify'
 */
module.exports = async function testThreeDS(page, log, threeDS, pageName) {
    async function checkProcPopup(expect = true) {
        const exists = await page.$('#proc_popup') !== null;
        log(expect
            ? (exists
                ? `✅ [${threeDS}] #proc_popup найден на ${pageName}`
                : `❌ [${threeDS}] #proc_popup НЕ найден на ${pageName}`)
            : (!exists
                ? `✅ [${threeDS}] #proc_popup отсутствует  на ${pageName}`
                : `❌ [${threeDS}] #proc_popup найден, а не должен быть!`)
        );
    }

    async function checkOptionVar(keys = [], expectExist = true) {
        const scripts = await page.$$eval('head script', arr => arr.map(x => x.textContent || ''));
        const found = scripts.find(txt => txt.includes('var options=') || txt.includes('var options ='));
        if (!found) {
            for (const key of keys) {
                log(expectExist
                    ? `❌ [${threeDS}] options.${key} отсутствует или false (script с options не найден)`
                    : `✅ [${threeDS}] options.${key} отсутствует (script с options не найден)`);
            }
            return;
        }
        let options = {};
        try { eval(found.replace(/^.*var options\s*=\s*/s, 'options = ')); }
        catch (e) { log(`❌ [${threeDS}] Не удалось распарсить options: ${e.message}`); return; }
        for (const key of keys) {
            const exists = Object.prototype.hasOwnProperty.call(options, key) && !!options[key];
            if (expectExist) {
                log(exists
                    ? `✅ [${threeDS}] options.${key}: true`
                    : `❌ [${threeDS}] options.${key} отсутствует или false`);
            } else {
                log(!exists
                    ? `✅ [${threeDS}] options.${key} отсутствует `
                    : `❌ [${threeDS}] options.${key} найден, а не должен!`);
            }
        }
    }

    async function checkPaayIframe(expect = true) {
        const exists = await page.$('iframe#paay-iframe') !== null;
        log(expect
            ? (exists
                ? `✅ [${threeDS}] iframe#paay-iframe найден на ${pageName}`
                : `❌ [${threeDS}] iframe#paay-iframe НЕ найден на ${pageName}`)
            : (!exists
                ? `✅ [${threeDS}] iframe#paay-iframe отсутствует  на ${pageName}`
                : `❌ [${threeDS}] iframe#paay-iframe найден, а не должен!`)
        );
    }

    async function checkPaayLib(expect = true) {
        const exists = await page.$('script[src*="threeds.2.2"]') !== null;
        log(expect
            ? (exists
                ? `✅ [${threeDS}] Библиотека PAAY подключена на ${pageName}`
                : `❌ [${threeDS}] Библиотека PAAY НЕ подключена на ${pageName}`)
            : (!exists
                ? `✅ [${threeDS}] Библиотека PAAY отсутствует на ${pageName} `
                : `❌ [${threeDS}] Библиотека PAAY подключена, а не должна!`)
        );
    }

    async function check3dsBlockExists(shouldExist = true) {
        try {
            const exists = await page.evaluate(() => !!document.getElementById('3ds'));
            if (shouldExist) {
                if (exists) {
                    log(`✅ [${threeDS}] 3ds-iframe найден на ${pageName}`);
                } else {
                    log(`❌ [${threeDS}] 3ds-iframe НЕ найден на ${pageName}`);
                }
            } else {
                if (!exists) {
                    log(`✅ [${threeDS}] 3ds-iframe отсутствует на ${pageName}`);
                } else {
                    log(`❌ [${threeDS}] 3ds-iframe найден, а не должен! на ${pageName}`);
                }
            }
        } catch (err) {
            log(`❌ [${threeDS}] Ошибка при поиске 3ds-iframe на ${pageName}: ${err}`);
        }
    }

    async function checkHiddenInputXtid(expect = true) {
        const exists = await page.$('input[type="hidden"][name="x_transaction_id"]') !== null;
        log(expect
            ? (exists
                ? `✅ [${threeDS}] input[name="x_transaction_id"][type="hidden"] найден на ${pageName}`
                : `❌ [${threeDS}] input[name="x_transaction_id"][type="hidden"] НЕ найден на ${pageName}`)
            : (!exists
                ? `✅ [${threeDS}] input[name="x_transaction_id"][type="hidden"] отсутствует  на ${pageName}`
                : `❌ [${threeDS}] input[name="x_transaction_id"][type="hidden"] найден, а не должен!`)
        );
    }

    // --- Pixxles GA ---
    if (threeDS === 'pixxles-ga') {
        if (pageName === 'index' || pageName === 'qualify') {
            await checkProcPopup();
            await checkOptionVar(['browserData', 'dnaThreeDS'], false);
        }
        else if (pageName === 'checkout' || pageName === 'order') {
            await checkProcPopup();
            await checkPaayIframe(false);
            await checkOptionVar(['browserData', 'dnaThreeDS'], false);
            await checkPaayLib(false);
            await check3dsBlockExists(true);
        }
        else {
            log(`ℹ️ [${threeDS}] Страница ${pageName} не требует проверки 3DS Pixxles GA`);
        }
    }

    // --- Pixxles DNA ---
    else if (threeDS === 'pixxles-dna') {
        if (pageName === 'index' || pageName === 'qualify') {
            await checkProcPopup();
            await checkOptionVar(['dnaThreeDS'], true);
        }
        else if (pageName === 'checkout' || pageName === 'order') {
            await checkProcPopup();
            await checkPaayIframe(false);
            await checkOptionVar(['dnaThreeDS'], true);
            await checkPaayLib(false);
            await check3dsBlockExists(true);
        }
        else {
            log(`ℹ️ [${threeDS}] Страница ${pageName} не требует проверки 3DS Pixxles DNA`);
        }
    }

    // --- PAAY combinedRequest ---
    else if (threeDS === 'paay-combined') {
        if (pageName === 'index' || pageName === 'qualify') {
            await checkProcPopup(false);
            await checkOptionVar(['dnaThreeDS', 'browserData'], false);
        }
        else if (pageName === 'checkout' || pageName === 'order') {
            await checkProcPopup();
            await checkPaayIframe(false);
            await checkOptionVar(['dnaThreeDS', 'browserData', 'combinedRequest', 'gontelPayy'], false);
            await checkPaayLib(true);
            await check3dsBlockExists(false);
            await checkHiddenInputXtid(false);
        }
        else {
            log(`ℹ️ [${threeDS}] Страница ${pageName} не требует проверки 3DS PAAY combinedRequest`);
        }
    }

    // --- PAAY old ---
    else if (threeDS === 'paay-old') {
        if (pageName === 'index' || pageName === 'qualify') {
            await checkProcPopup(false);
            await checkOptionVar(['dnaThreeDS', 'browserData'], false);
        }
        else if (pageName === 'checkout' || pageName === 'order') {
            await checkProcPopup();
            await checkPaayIframe(true);
            await checkOptionVar(['dnaThreeDS', 'browserData', 'combinedRequest'], false);
            await checkOptionVar(['gontelPayy'], true);
            await checkPaayLib(true);
            await check3dsBlockExists(false);
            await checkHiddenInputXtid(true);
        }
        else {
            log(`ℹ️ [${threeDS}] Страница ${pageName} не требует проверки 3DS PAAY old`);
        }
    }


};
