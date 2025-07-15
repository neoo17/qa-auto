module.exports = async function checkPageTitleMatchesState(page, stateData, log, pageName = '') {
    const expectedTitle = stateData?.data?.templates?.title?.trim();

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
};
