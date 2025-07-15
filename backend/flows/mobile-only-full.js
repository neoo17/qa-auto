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
const handleUpsales = require('../utils/handleUpsales');
const shot = require('../utils/screenshotHelper');
const checkNoOtherProductsOnPage = require("../utils/checkNoOtherProductsOnPage");
const productList = require("../utils/productNames.json");
const checkConfirmationPage = require('../utils/checkConfirmationPage');
const testThreeDS = require('../utils/testThreeDS');

module.exports = async function mobileOnlyFlow(
    page, log, context, url, country, custom, sendPerf, sendTestInfo, screenshotDir
) {
    ensureDirSync(screenshotDir);
    await page.setViewportSize({ width: 375, height: 667 });



    log('📱 Мобильный режим включен');
    log('🔵 Открываем страницу...');

    log('=== Полученная страна: ' + country);

    // --- Открываем первую страницу ---
    await page.goto(url, { waitUntil: 'load' });
    const mainStatePromise = checkStateAjax(page, log);
    const hasQualify = await page.$('form#qualify') !== null;

    if (!hasQualify) {
        // --- Index ---
        await shot(page, screenshotDir, 'index', log);
        const stateData = await mainStatePromise;
        if (stateData?.data?.templates?.title) {
            await checkNoOtherProductsOnPage(page, stateData.data.templates.title, log, productList);
        }
        await testThreeDS(page, log, custom.threeDS, 'index');
        await checkPageTitleMatchesState(page, stateData, log, "index");
        if (typeof sendPerf === 'function') await collectPerfStats(page, 'main', sendPerf);

        if (custom.checkType === 'full') {
            await checkAllPopups(page, log, custom.partner, 'index');
            await checkSlickSlider(page, log);
        }

        // --- Qualify ---
        const qualifyStatePromise = checkStateAjax(page, log);
        await clickSendButtonAndCheckQualify(page, log);
        const stateData2 = await qualifyStatePromise;
        log('=== Полученная страна: ' + country);
        if (custom.checkType === 'full') {
            await checkAllPopups(page, log, custom.partner, "qualify");
        }
        await shot(page, screenshotDir, 'qualify', log);
        await checkPageTitleMatchesState(page, stateData2, log, "qualify");
        if (typeof sendPerf === 'function') await collectPerfStats(page, 'qualify', sendPerf);
        await checkQualifyForm(page, log, country, custom.partner);

        // --- дальше стандартный flow ---
        await continueFlowAfterQualify(page, log, country, custom, sendPerf, sendTestInfo, screenshotDir, stateData2);

    } else {
        console.log('=== [DEBUG] Страна на входе:', country);
        log('👀 Обнаружена SHORT версия ');
        const stateData2 = await mainStatePromise;
        log('=== Полученная страна: ' + country);
        if (custom.checkType === 'full') {
            await checkAllPopups(page, log, custom.partner, "qualify");
        }
        await shot(page, screenshotDir, 'qualify', log);
        await checkPageTitleMatchesState(page, stateData2, log, "qualify");
        if (typeof sendPerf === 'function') await collectPerfStats(page, 'qualify', sendPerf);
        await checkQualifyForm(page, log, country, custom.partner);

        // --- дальше стандартный flow ---
        await continueFlowAfterQualify(page, log, country, custom, sendPerf, sendTestInfo, screenshotDir, stateData2);
    }

    log('✅ Мобильный автотест завершён');
};

async function continueFlowAfterQualify(
    page, log, country, custom, sendPerf, sendTestInfo, screenshotDir, qualifyStateData
) {
    // --- Choose ---
    log('──────────────────────────────');
    log('➡️ Переход на choose');
    const chooseStatePromise = checkStateAjax(page, log);
    await page.click('form#qualify button[type="submit"]');
    const stateData3 = await chooseStatePromise;
    if (custom.checkType === 'full') {
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
    await page.click('form#shipping-mobile button[type="submit"]');
    const stateData5 = await checkoutStatePromise;
    if (custom.checkType === 'full') {
        await checkAllPopups(page, log, custom.partner, "checkout");
    }
    await checkPageTitleMatchesState(page, stateData5, log, "checkout");
    await testThreeDS(page, log, custom.threeDS, 'checkout');
    if (typeof sendPerf === 'function') await collectPerfStats(page, 'checkout', sendPerf);
    await shot(page, screenshotDir, 'checkout', log);
    await checkCheckoutForm(page, log, sendTestInfo, checkStateAjax, custom.checkType);

    // --- Upsales ---
    log('──────────────────────────────');
    log('➡️ Переход на апсейлы (upsales)');
    await handleUpsales(page, log, custom, sendTestInfo, checkStateAjax, stateData5.data, screenshotDir);

    // --- Confirmation ---
    await checkPageTitleMatchesState(page, stateData5, log, "confirmation");
    if (custom.checkType === 'full') {
        await checkAllPopups(page, log, custom.partner, "confirmation");
    }
    await shot(page, screenshotDir, 'confirmation', log);
    await checkConfirmationPage(page, stateData5, log);
}
