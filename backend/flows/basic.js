const fs = require('fs');

function ensureDirSync(dir) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

const checkAllPopups = require('../utils/checkAllPopups');
const checkSlickSlider = require('../utils/checkSlickSlider');
const checkStateAjax = require('../utils/checkStateAjax');
const checkPageTitleMatchesState = require('../utils/checkPageTitleMatchesState');
const collectPerfStats = require('../utils/collectPerfStats');
const shot = require('../utils/screenshotHelper');
const checkNoOtherProductsOnPage = require("../utils/checkNoOtherProductsOnPage");
const productList = require("../utils/productNames.json");
const testThreeDS = require('../utils/testThreeDS');
const checkPunctuation = require('../utils/checkPunctuation');
const testGdprBlockAdvanced = require("../utils/testGdprBlockAdvanced");
const checkCombinedShippingForm = require('../utils/checkCombinedShippingForm');
const checkOnPage = require("../utils/checkOnPage");
const checkCheckoutForm = require("../utils/checkCheckoutForm");
const chooseProductByCustomParam = require("../utils/chooseProductByCustomParam");
const checkChoosePackages = require("../utils/checkChoosePackages");
const checkSelectStateISOLookup = require("../utils/checkSelectStateISOLookup");
const checkBrokenImages = require("../utils/checkBrokenImages");

/**
 * Десктопный флоу с объединенной формой shipping
 * @param {import('playwright').Page} page
 * @param {Function} log
 * @param {*} context
 * @param {string} url
 * @param {string} country
 * @param {*} custom
 * @param {Function} sendPerf
 * @param {Function} sendTestInfo
 * @param {string} screenshotDir
 */
module.exports = async function Basic(
    page, log, context, url, country, custom, sendPerf, sendTestInfo, screenshotDir, firstState
) {
    ensureDirSync(screenshotDir);

    await page.setViewportSize({ width: 1280, height: 800 });

    log('🖥️ Десктопный режим включен');
    log('🔵 Открываем страницу...');


    await page.goto(url, { waitUntil: 'load' });
    const mainStatePromise = firstState || checkStateAjax(page, log);

    await shot(page, screenshotDir, 'index', log);

    const stateData = await mainStatePromise;

    // if (stateData?.data?.templates?.title) {
    //     await checkNoOtherProductsOnPage(page, stateData.data.templates.title, log, productList);
    // }
    
    await testThreeDS(page, log, custom.threeDS, 'index');

    if (custom.partner === 'ga' || custom.partner === 'gh') {
        await checkSelectStateISOLookup(page, country, log, 'select[name="state"]')
    }



    await checkPageTitleMatchesState(page, stateData, log, "index");
    if (typeof sendPerf === 'function') await collectPerfStats(page, 'main', sendPerf);

    await checkBrokenImages(page, log, sendTestInfo);

    if (custom.checkType === 'full') {
        await checkPunctuation(page, log, country);
        await testGdprBlockAdvanced(page, log, country, custom.partner, 'index');
        await checkAllPopups(page, log, custom.partner, 'index');
    }

    log('📝 Проверяем наличие объединенной формы #shipping...');
    await page.waitForSelector('form#shipping', { timeout: 7000 });

    const buttonName = await checkCombinedShippingForm(page, log, country, custom.partner);
    
    log('✅ Проверка главной страницы с формой shipping завершена');



    // --- Order ---
    log('──────────────────────────────');
    log('➡️ Переход на order');
    const orderStatePromise = checkStateAjax(page, log);

    await page.click(buttonName);

    const stateData3 = await orderStatePromise;

    await checkBrokenImages(page, log, sendTestInfo);

    if (custom.checkType === 'full') {
        await checkPunctuation(page, log, country);
        await testGdprBlockAdvanced(page, log, country, custom.partner, "order");
        await checkAllPopups(page, log, custom.partner, "order");
    }
    await checkPageTitleMatchesState(page, stateData3, log, "order");
    await testThreeDS(page, log, custom.threeDS, 'order');
    if (typeof sendPerf === 'function') await collectPerfStats(page, 'order', sendPerf);
    await shot(page, screenshotDir, 'order', log);
    await checkChoosePackages(page, stateData3.data.products, log);
    await chooseProductByCustomParam(page, log, custom, sendTestInfo, stateData3.data.products);
    await checkCheckoutForm(page, log, custom, sendTestInfo, checkStateAjax, custom.checkType);

    return stateData3;
};