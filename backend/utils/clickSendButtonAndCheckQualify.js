module.exports = async function clickSendButtonAndCheckQualify(page, log) {
    log('🔎 Ищем кнопку .btn__send...');
    const btn = await page.$('.btn__send');
    if (!btn) {
        log('❌ Кнопка .btn__send не найдена');
        return;
    }
    log('✅ Кнопка найдена, кликаем...');

    const oldUrl = page.url();

    await btn.click();


    let success = false;
    for (let i = 0; i < 20; i++) { // ~4 секунды (200мс * 20)
        await page.waitForTimeout(200);
        const url = page.url();
        if (url !== oldUrl && url.includes('qualify.html')) {
            log('──────────────────────────────');
            log(`✅ Произошёл переход на qualify`);
            success = true;
            break;
        }
    }

    if (!success) {
        const url = page.url();
        log(`❌ После клика не было перехода на qualify.html. Текущий url: ${url}`);
    }
};
