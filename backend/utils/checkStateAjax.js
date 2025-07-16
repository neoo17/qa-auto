/**
 * @param {import('playwright').Page} page
 * @param {Function} log
 * @returns {Promise<any|undefined>}
 */
module.exports = async function checkStateAjax(page, log) {
    log('🔎 Начинаю ждать /ajax/state...');
    const response = await page.waitForResponse(
        res => res.url().includes('/ajax/state') && res.status() === 200,
        { timeout: 20000 }
    );
    const json = await response.json();
    log('🟢 State успешно получен!');
    return json;
};
