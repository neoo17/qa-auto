/**
 * @param {import('playwright').Page} page
 * @param {Function} log
 * @param {string|object|any} geo
 * @param {string} partner
 */
module.exports = async function testGdprBlockAdvanced(page, log, geo, partner, pageName) {
    const GDPR_GEO = [
        'ie', 'fr', 'de', 'ch', 'pt', 'nl', 'is', 'fi', 'es', 'se', 'dk', 'it', 'no'
    ];
    const GDPR_GEO_UK_PARTNERS = ['dnav3', 'newdna'];

    let geoLower = '';
    if (typeof geo === 'string') {
        geoLower = geo.toLowerCase();
    } else if (geo && typeof geo === 'object' && geo.country) {
        geoLower = String(geo.country).toLowerCase();
        log('⚠️ [GDPR] geo пришёл объектом, беру geo.country:', geoLower);
    } else if (geo != null) {
        geoLower = String(geo).toLowerCase();
        log('⚠️ [GDPR] geo пришёл не строкой, а:', typeof geo, ', значение:', geo, ', кастую в строку:', geoLower);
    } else {
        log('❌ [GDPR] geo undefined/null, устанавливаю ""');
        geoLower = '';
    }

    log(`[GDPR] geoLower: "${geoLower}", partner: "${partner}"`);

    const shouldHaveGdpr =
        GDPR_GEO.includes(geoLower) ||
        (geoLower === 'uk' && GDPR_GEO_UK_PARTNERS.includes(String(partner)));

    const gdprBox = await page.$('.gdpr__box');
    const isVisible = gdprBox ? await gdprBox.isVisible().catch(() => false) : false;

    if (shouldHaveGdpr) {
        if (!gdprBox || !isVisible) {
            log('❌ [GDPR] Блок .gdpr__box НЕ найден или не видим!');
            return;
        }

        log('[GDPR] Ищем ссылку с классом .modal-link...');
        const modalLink = await gdprBox.$('.modal-link');
        if (!modalLink) {
            log('❌ [GDPR] Внутри .gdpr__box нет ссылки с классом .modal-link!');
            return;
        }

        log('[GDPR] Кликаем по ссылке, открываем попап...');
        const beforeModals = await page.$$('div[role="dialog"], .modal, .popup, .fancybox__container, .fancybox-active');
        await modalLink.click();
        await page.waitForTimeout(300);

        const afterModals = await page.$$('div[role="dialog"], .modal, .popup, .fancybox__container, .fancybox-active');
        let foundNewModal = false;
        for (const am of afterModals) {
            if (!beforeModals.includes(am)) foundNewModal = true;
        }
        if (!foundNewModal && afterModals.length === beforeModals.length) {
            log('❌ [GDPR] Попап не открылся после клика!');
        } else {
            log('✅ [GDPR] Попап открылся.');

            await page.waitForTimeout(1000);
            let closed = false;
            const closeSelectors = [
                '.fancybox__close', '.modal .close', '.popup .close', '[aria-label="Close"]'
            ];
            for (const sel of closeSelectors) {
                const closeBtn = await page.$(sel);
                if (closeBtn) {
                    await closeBtn.click().catch(() => {});
                    closed = true;
                    break;
                }
            }
            if (!closed) {
                const backdrop = await page.$('.fancybox__backdrop, .modal-backdrop, .popup-backdrop');
                if (backdrop) await backdrop.click().catch(() => {});
            }
            await page.waitForTimeout(300);
            log('✅ [GDPR] Попап закрыт.');
        }


        log('[GDPR] Прячем GDPR-блок ');
        const wasHidden = await page.evaluate(() => {
            const el = document.getElementById('gdpr');
            if (el) {
                el.style.display = 'none';
                return true;
            }
            const box = document.querySelector('.gdpr__box');
            if (box) {
                box.style.display = 'none';
                return true;
            }
            return false;
        });
        if (wasHidden) {
            log('✅ [GDPR] Блок успешно скрыт.');
        } else {
            log('❌ [GDPR] Блок не найден для скрытия!');
        }
    } else {
        if (gdprBox && isVisible) {
            log('❌ [GDPR] Блок .gdpr__box есть и видим, хотя не должен!');
            throw new Error('[GDPR] Блок .gdpr__box есть и видим, хотя не должен!');
        } else {
            log('✅ [GDPR] Блока .gdpr__box нет или он скрыт, всё ок.');
        }
    }
};
