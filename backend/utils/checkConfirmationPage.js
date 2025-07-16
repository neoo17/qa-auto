/**
 * Сравнивает телефон со страницы и из стейта
 * А также тестирует кнопку "назад" — должны остаться на confirmation
 * @param {import('playwright').Page} page
 * @param {Object} state - стейт страницы (order, confirmation)
 * @param {Function} log - функция логирования
 */
module.exports = async function checkConfirmationPage(page, state, log) {
    try {
        // Проверяем, есть ли .local-phone на странице
        const localPhoneExists = await page.$('.local-phone') !== null;
        if (localPhoneExists) {
            // Телефон из стейта
            const statePhone = state?.data?.templates?.phone;
            if (!statePhone) {
                log('❗ Не найден телефон в стейте заказа');
                return;
            }

            // Телефон на странице
            const pagePhone = await page.$eval('.local-phone', el => el.innerText.trim());
            if (pagePhone === statePhone) {
                log(`✅ Телефон на confirmation совпадает: ${pagePhone}`);
            } else {
                log(`❌ Телефон не совпадает! На странице: ${pagePhone}, в стейте: ${statePhone}`);
            }
        }
        // Если элемента нет — ничего не делаем
    } catch (e) {
        log(`❗ Ошибка сравнения телефона на confirmation: ${e.message}`);
    }

    // Проверяем кнопку назад
    try {
        log('🧪 Пробуем вернуться назад с confirmation на апсейл...');
        const urlBefore = page.url();
        await page.goBack();
        await page.waitForTimeout(1000);
        const urlAfter = page.url();
        if (urlAfter === urlBefore) {
            log(`✅ [Check] После возврата назад всё еще остались на confirmation (ОК)`);
        } else {
            log(`❌ [Check] После возврата назад URL изменился! Было: ${urlBefore}, стало: ${urlAfter}`);
        }
        // Можно вернуть страницу обратно вперёд если нужно
        await page.goForward();
        await page.waitForTimeout(200);
    } catch (e) {
        log(`❗ Ошибка проверки кнопки "назад" на confirmation: ${e.message}`);
    }
};
