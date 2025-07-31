module.exports = async function clickSendButtonAndCheckQualify(page, log) {
    log('🔎 Ищем все кнопки .btn__send...');
    const buttons = await page.$$('a.btn__send');

    if (!buttons.length) {
        log('❌ Кнопки .btn__send не найдены');
        return;
    }

    log(`🔘 Найдено кнопок: ${buttons.length}. Пробуем последнюю...`);
    const btn = buttons[buttons.length - 1];

    const box = await btn.boundingBox();
    if (!box) {
        log('❌ Последняя кнопка найдена, но она не видима (boundingBox = null)');
        return;
    }
    log(`✅ Кнопка найдена.`);

    try {
        await btn.scrollIntoViewIfNeeded();
        await btn.waitForElementState('visible');
        await btn.waitForElementState('enabled');
        await page.evaluate(el => el.click(), btn);
        log('🟢 Клик выполнен');
    } catch (err) {
        log(`❌ Ошибка при клике по кнопке: ${err.message}`);
        return;
    }

    const oldUrl = page.url();
    let success = false;

    for (let i = 0; i < 20; i++) {
        await page.waitForTimeout(200);
        const url = page.url();
        if (url !== oldUrl && url.includes('qualify.html')) {
            log('──────────────────────────────');
            log(`✅ Произошёл переход на qualify.html`);
            success = true;
            break;
        }
    }

    if (!success) {
        const url = page.url();
        log(`❌ После клика не было перехода на qualify.html. Текущий url: ${url}`);
    }
};
