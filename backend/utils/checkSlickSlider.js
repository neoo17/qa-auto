// utils/checkSlickSlider.js

/**
 * Проверяет, есть ли slick-слайдер, и листает его если он есть.
 * @param {import('playwright').Page} page
 * @param {Function} log
 */
module.exports = async function checkSlickSlider(page, log) {
    log('🔎 Ищем слайдер');
    const slider = await page.$('.slick-slider');

    if (!slider) {
        log('ℹ️ Слайдер не найден');
        return;
    }

    log('✅ Найден .slick-slider, начинаем проверку листания');

    const prevBtn = await slider.$('.slick-prev');
    const nextBtn = await slider.$('.slick-next');
    const dots = await slider.$$('.slick-dots li button');

    const slides = await slider.$$('.slick-slide');
    log(`ℹ️ Всего слайдов: ${slides.length}`);

    if (nextBtn) {
        for (let i = 0; i < Math.min(3, slides.length - 1); i++) {
            await nextBtn.click();
            log(`➡️ Кликнули по стрелке next (${i + 1})`);
            await page.waitForTimeout(900);
        }
        log('✅ Слайдер пролистали вперёд');
    } else if (dots.length > 1) {
        for (let i = 1; i < Math.min(4, dots.length); i++) {
            await dots[i].click();
            log(`🔘 Переключились на слайд по точке ${i + 1}`);
            await page.waitForTimeout(900);
        }
        log('✅ Слайдер пролистали по точкам');
    } else {
        log('⚠️ Нет кнопок .slick-next и точек — не удалось пролистать, возможно только один слайд');
    }
}
