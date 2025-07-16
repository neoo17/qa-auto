const Basic = require('./basic');
const shortMobile = require('./shortMobile');
const shortDesktop = require('./shortDesktop');
const mobileOnlyFlow = require('./mobile-only-full');
const checkStateAjax = require("../utils/checkStateAjax");
const checkAllPopups = require("../utils/checkAllPopups");
const shot = require("../utils/screenshotHelper");
const checkPageTitleMatchesState = require("../utils/checkPageTitleMatchesState");
const handleUpsales = require("../utils/handleUpsales");
const checkConfirmationPage = require("../utils/checkConfirmationPage");


module.exports = async function routerFlow(page, log, context, url, country, custom, sendPerf, sendTestInfo, screenshotDir) {
    const state = checkStateAjax(page, log);
    await page.goto(url, { waitUntil: 'load' });

    const firstState = await state;
    let stateData;

    if (await page.$('form#shipping') !== null) {
        stateData = await Basic(page, log, context, url, country, custom, sendPerf, sendTestInfo, screenshotDir);
        await continueFlowAfterQualify(page, log, country, custom, sendPerf, sendTestInfo, screenshotDir, stateData);
        return;
    }
    if (await page.$('form#checkout') !== null) {
        stateData = await shortDesktop(page, log, context, url, country, custom, sendPerf, sendTestInfo, screenshotDir);
        await continueFlowAfterQualify(page, log, country, custom, sendPerf, sendTestInfo, screenshotDir, stateData);
        return;
    }
    if (await page.$('form#qualify') !== null) {
        stateData = await shortMobile(page, log, context, url, country, custom, sendPerf, sendTestInfo, screenshotDir, firstState);
        await continueFlowAfterQualify(page, log, country, custom, sendPerf, sendTestInfo, screenshotDir, stateData);
        return;
    }

    stateData = await mobileOnlyFlow(page, log, context, url, country, custom, sendPerf, sendTestInfo, screenshotDir, firstState);
    await continueFlowAfterQualify(page, log, country, custom, sendPerf, sendTestInfo, screenshotDir, stateData);
};


async function continueFlowAfterQualify(
    page, log, country, custom, sendPerf, sendTestInfo, screenshotDir, stateData
) {


    if (stateData && stateData.data.upsales.length > 0) {
        log('──────────────────────────────');
        log('➡️ Переход на апсейлы (upsales)');
        await handleUpsales(page, log, custom, sendTestInfo, checkStateAjax, stateData.data, screenshotDir, custom.partner);

        // --- Confirmation ---
        await checkPageTitleMatchesState(page, stateData, log, "confirmation");
        if (custom.checkType === 'full') {
            await checkAllPopups(page, log, custom.partner, "confirmation");
        }
        await shot(page, screenshotDir, 'confirmation', log);
        await checkConfirmationPage(page, stateData, log);
    } else {
        // --- Confirmation ---
        await checkPageTitleMatchesState(page, stateData, log, "confirmation");
        if (custom.checkType === 'full') {
            await checkAllPopups(page, log, custom.partner, "confirmation");
        }
        await shot(page, screenshotDir, 'confirmation', log);
        await checkConfirmationPage(page, stateData, log);
    }

}
