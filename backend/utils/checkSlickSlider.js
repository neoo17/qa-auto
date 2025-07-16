/**
 * Проверяет, есть ли slick-слайдер, и листает его если он есть.
 * @param {import('playwright').Page} page
 * @param {Function} log
 */
module.exports = async function checkSlickSlider(page, log) {
    try {
        log('🔎 Ищем слайдер');
        const slider = await page.$('.slick-slider');

        if (!slider) {
            log('ℹ️ Слайдер не найден');
            return;
        }

        log('✅ Найден .slick-slider, начинаем проверку листания');

        let prevBtn = null, nextBtn = null, dots = [], slides = [];

        try {
            prevBtn = await slider.$('.slick-prev');
            nextBtn = await slider.$('.slick-next');
            // Кликаем по li, а не по button!
            dots = await slider.$$('.slick-dots li');
            slides = await slider.$$('.slick-slide');
        } catch (e) {
            log('⚠️ Ошибка при поиске кнопок/точек/слайдов слайдера: ' + e.message);
        }

        log(`ℹ️ Всего слайдов: ${slides.length}`);

        if (nextBtn) {
            for (let i = 0; i < Math.min(3, slides.length - 1); i++) {
                try {
                    await nextBtn.click({ timeout: 2000 });
                    log(`➡️ Кликнули по стрелке next (${i + 1})`);
                } catch (e) {
                    log(`⚠️ Не удалось кликнуть по .slick-next: ${e.message}`);
                }
                await page.waitForTimeout(900);
            }
            log('✅ Слайдер пролистали вперёд');
        } else if (dots.length > 1) {
            for (let i = 1; i < Math.min(4, dots.length); i++) {
                try {
                    await dots[i].scrollIntoViewIfNeeded();
                    await page.waitForTimeout(100);
                    await dots[i].click({ timeout: 2000, force: true });
                    log(`🔘 Обычный клик по dots  #${i + 1}`);
                } catch (e) {
                    log(`❌ Не удалось кликнуть по dots  #${i + 1}: ${e.message}`);
                }
                await page.waitForTimeout(800);
            }

            log('✅ Слайдер пролистали по точкам');
        } else {
            log('⚠️ Нет кнопок .slick-next и точек — не удалось пролистать, возможно только один слайд');
        }
    } catch (err) {
        log('⚠️ Глобальная ошибка при работе со слайдером: ' + err.message);
    }
};
