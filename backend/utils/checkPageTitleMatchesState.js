module.exports = async function checkPageTitleMatchesState(page, stateData, log, pageName = '') {
    const expectedTitle = stateData?.data?.templates?.title?.trim();

    if (!expectedTitle) {
        throw new Error(`[${pageName}] Тайтл из state не найден!`);
    }

    const actualTitle = await page.title();
    log(`🌐 [${pageName}] Title страницы: "${actualTitle}"`);
    log(`📦 [${pageName}] Title из state: "${expectedTitle}"`);

    if (actualTitle.trim() !== expectedTitle) {
        throw new Error(
            `❌ [${pageName}] Title не совпадает!\nОжидалось: "${expectedTitle}"\nПолучено: "${actualTitle}"`
        );
    }

    log(`✅ [${pageName}] Title совпадает!`);
};
