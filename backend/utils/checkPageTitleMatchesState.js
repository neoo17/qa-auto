module.exports = async function checkPageTitleMatchesState(page, stateData, log, pageName = '') {
    const expectedTitle = stateData?.data?.templates?.title?.trim();
    const expectedDescription = stateData?.data?.templates?.description?.trim();

    if (!expectedTitle) {
        log(`❌ [${pageName}] Тайтл из state не найден!`);
        return;
    }

    const actualTitle = await page.title();
    log(`🌐 [${pageName}] Title страницы: "${actualTitle}"`);
    log(`📦 [${pageName}] Title из state: "${expectedTitle}"`);

    if (actualTitle.trim() !== expectedTitle) {
        log(`❌ [${pageName}] Title не совпадает!\nОжидалось: "${expectedTitle}"\nПолучено: "${actualTitle}"`);
        return;
    }

    log(`✅ [${pageName}] Title совпадает!`);

    const actualDescription = await page.$eval('meta[name="description"]', el => el.content.trim()).catch(() => null);

    if (actualDescription !== null && typeof expectedTitle === 'string') {
        log(`🌐 [${pageName}] Description страницы: "${actualDescription}"`);
        log(`📦 [${pageName}] Description из state: "${expectedTitle}"`);
        if (actualDescription !== expectedTitle) {
            log(`❌ [${pageName}] Description не совпадает!\nОжидалось: "${expectedTitle}"\nПолучено: "${actualDescription}"`);
            return;
        }
        log(`✅ [${pageName}] Description совпадает!`);
    }
};
