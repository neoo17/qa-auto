module.exports = async function collectPerfStats(page, pageName, sendPerf) {
    // Ждём полной загрузки и небольшой паузы
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1200);

    const perfEntries = await page.evaluate(() =>
        performance.getEntriesByType('resource')
            .map(e => ({
                url: e.name,
                type: e.initiatorType,
                transferred: e.transferSize || e.encodedBodySize || 0
            }))
    );
    const mainTransferred = await page.evaluate(() => {
        const nav = performance.getEntriesByType('navigation')[0];
        return nav?.transferSize || 0;
    });

    // Суммируем только то, что реально больше 0
    const totalTransferred = mainTransferred +
        perfEntries.filter(r => r.transferred > 0).reduce((sum, r) => sum + r.transferred, 0);

    sendPerf({
        page: pageName,
        transferred: totalTransferred,
        resources: perfEntries
    });
};
