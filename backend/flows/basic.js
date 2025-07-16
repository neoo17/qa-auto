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
    
    // Устанавливаем десктопное разрешение
    await page.setViewportSize({ width: 1280, height: 800 });

    log('🖥️ Десктопный режим включен');
    log('🔵 Открываем страницу...');

    // --- Открываем первую страницу ---
    await page.goto(url, { waitUntil: 'load' });
    const mainStatePromise = firstState || checkStateAjax(page, log);
    
    // --- Index с объединенной формой shipping ---
    await shot(page, screenshotDir, 'index', log);

    const stateData = await mainStatePromise;
    
    if (stateData?.data?.templates?.title) {
        await checkNoOtherProductsOnPage(page, stateData.data.templates.title, log, productList);
    }
    
    await testThreeDS(page, log, custom.threeDS, 'index');
    await checkPageTitleMatchesState(page, stateData, log, "index");
    if (typeof sendPerf === 'function') await collectPerfStats(page, 'main', sendPerf);
    
    // Проверка пробелов перед спецсимволами в зависимости от локали
    if (custom.checkType === 'full') {
        await checkPunctuation(page, log, country);
        await testGdprBlockAdvanced(page, log, country, custom.partner, 'index');
        await checkSlickSlider(page, log);
        await checkAllPopups(page, log, custom.partner, 'index');
    }

    // Проверяем наличие объединенной формы shipping
    log('📝 Проверяем наличие объединенной формы #shipping...');
    await page.waitForSelector('form#shipping', { timeout: 7000 });
    
    // Проверяем поля формы (объединенные поля из qualify и shipping)
    await checkCombinedShippingForm(page, log, country, custom.partner);
    
    log('✅ Проверка главной страницы с формой shipping завершена');
};