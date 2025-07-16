const fs = require('fs');

function ensureDirSync(dir) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

const checkAllPopups = require('../utils/checkAllPopups');
const checkSlickSlider = require('../utils/checkSlickSlider');
const clickSendButtonAndCheckQualify = require('../utils/clickSendButtonAndCheckQualify');
const checkQualifyForm = require('../utils/checkQualifyForm');
const checkStateAjax = require('../utils/checkStateAjax');
const checkPageTitleMatchesState = require('../utils/checkPageTitleMatchesState');
const checkChoosePackages = require('../utils/checkChoosePackages');
const chooseByCustomParam = require('../utils/chooseByCustomParam');
const collectPerfStats = require('../utils/collectPerfStats');
const checkShippingForm = require('../utils/checkShippingForm');
const checkCheckoutForm = require('../utils/checkCheckoutForm');
const shot = require('../utils/screenshotHelper');
const checkNoOtherProductsOnPage = require("../utils/checkNoOtherProductsOnPage");
const productList = require("../utils/productNames.json");
const testThreeDS = require('../utils/testThreeDS');
const testGdprBlockAdvanced = require("../utils/testGdprBlockAdvanced");
const checkOnPage = require("../utils/checkOnPage");

module.exports = async function mobileOnlyFlow(
    page, log, context, url, country, custom, sendPerf, sendTestInfo, screenshotDir, firstState
) {
    ensureDirSync(screenshotDir);

    log('🔵 Открыли страницу...');
    // --- Index ---
    await shot(page, screenshotDir, 'index', log);
    const stateData = await firstState;

    if (stateData?.data?.templates?.title) {
        await checkNoOtherProductsOnPage(page, stateData.data.templates.title, log, productList);
    }
    await testThreeDS(page, log, custom.threeDS, 'index');
    await checkPageTitleMatchesState(page, stateData, log, "index");
    if (typeof sendPerf === 'function') await collectPerfStats(page, 'main', sendPerf);

    if (custom.checkType === 'full') {
        await testGdprBlockAdvanced(page, log, country, custom.partner, 'index');
        await checkSlickSlider(page, log);
        await checkAllPopups(page, log, custom.partner, 'index');

    }

    // --- Qualify ---
    const qualifyStatePromise = checkStateAjax(page, log);
    await clickSendButtonAndCheckQualify(page, log);
    const stateData2 = await qualifyStatePromise;
    if (custom.checkType === 'full') {
        await testGdprBlockAdvanced(page, log, country, custom.partner, "qualify");
        await checkAllPopups(page, log, custom.partner, "qualify");
    }
    await shot(page, screenshotDir, 'qualify', log);
    await checkPageTitleMatchesState(page, stateData2, log, "qualify");
    if (typeof sendPerf === 'function') await collectPerfStats(page, 'qualify', sendPerf);
    await checkQualifyForm(page, log, country, custom.partner);

    // --- Choose ---
    log('──────────────────────────────');
    log('➡️ Переход на choose');
    const chooseStatePromise = checkStateAjax(page, log);

    if (await checkOnPage(page, 'qualify.html')) {
        await page.click('form#qualify button[type="submit"]');
    }

    const stateData3 = await chooseStatePromise;
    if (custom.checkType === 'full') {
        await testGdprBlockAdvanced(page, log, country, custom.partner, "choose");
        await checkAllPopups(page, log, custom.partner, "choose");
    }
    await shot(page, screenshotDir, 'choose', log);
    await checkPageTitleMatchesState(page, stateData3, log, "choose");
    if (typeof sendPerf === 'function') await collectPerfStats(page, 'choose', sendPerf);
    await checkChoosePackages(page, stateData3.data.products, log);
    await chooseByCustomParam(page, log, custom, sendTestInfo, stateData3.data.products);

    // --- Shipping ---
    log('──────────────────────────────');
    log('➡️ Переход на shipping');
    const shippingStatePromise = checkStateAjax(page, log);
    const stateData4 = await shippingStatePromise;

    log('=== Полученная страна: ' + country);
    if (custom.checkType === 'full') {
        await testGdprBlockAdvanced(page, log, country, custom.partner, "shipping");
        await checkAllPopups(page, log, custom.partner, "shipping");
    }
    await shot(page, screenshotDir, 'shipping', log);
    await checkPageTitleMatchesState(page, stateData4, log, "shipping");
    if (typeof sendPerf === 'function') await collectPerfStats(page, 'shipping', sendPerf);
    await checkShippingForm(page, log, country);

    // --- Checkout ---
    log('──────────────────────────────');
    log('➡️ Переход на checkout');
    const checkoutStatePromise = checkStateAjax(page, log);
    if (await checkOnPage(page, 'shipping.html')) {
        await page.click('form#shipping-mobile button[type="submit"]');
    }
    const stateData5 = await checkoutStatePromise;
    if (custom.checkType === 'full') {
        await testGdprBlockAdvanced(page, log, country, custom.partner, "checkout");
        await checkAllPopups(page, log, custom.partner, "checkout");
    }
    await checkPageTitleMatchesState(page, stateData5, log, "checkout");
    await testThreeDS(page, log, custom.threeDS, 'checkout');
    if (typeof sendPerf === 'function') await collectPerfStats(page, 'checkout', sendPerf);
    await shot(page, screenshotDir, 'checkout', log);
    await checkCheckoutForm(page, log, sendTestInfo, checkStateAjax, custom.checkType);

    return stateData5;
};

