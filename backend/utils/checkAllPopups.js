/**
 * @param {import('playwright').Page} page
 * @param {Function} log
 * @param {string} partner
 */
module.exports = async function checkAllPopups(page, log, partner) {
    const allLinks = await page.$$('.modal-link');
    const visibleLinks = [];
    for (const link of allLinks) {
        const isVisible = await link.evaluate(el => {
            const style = window.getComputedStyle(el);
            return style.display !== 'none' && style.visibility !== 'hidden' && el.offsetParent !== null;
        });
        if (isVisible) visibleLinks.push(link);
    }
    log(`DEBUG: найдено видимых .modal-link: ${visibleLinks.length}`);

    if (!visibleLinks.length) {
        log('❌ Не найдено ни одной видимой ссылки .modal-link');
        return;
    }

    // === ПРОСТАЯ ПРОВЕРКА AFFILIATES ===
    let affiliatesFound = false;
    for (const link of visibleLinks) {
        const found = await link.evaluate(el => {
            // Ищем ближайший контейнер (ul, ol, nav, div, section, footer, body)
            let parent = el.parentElement;
            while (parent && !['UL','OL','NAV','DIV','SECTION','FOOTER','BODY'].includes(parent.tagName)) {
                parent = parent.parentElement;
            }
            if (!parent) return false;
            // Ищем видимую <a> с текстом "Affiliates" в этом контейнере
            const a = Array.from(parent.querySelectorAll('a')).find(node => {
                if (!node.textContent) return false;
                const style = window.getComputedStyle(node);
                return (
                    style.display !== 'none' &&
                    style.visibility !== 'hidden' &&
                    node.offsetParent !== null &&
                    node.textContent.trim() === 'Affiliates'
                );
            });
            return !!a;
        });
        if (found) {
            affiliatesFound = true;
            break; // достаточно одного совпадения
        }
    }

    if (partner === 'ga' || partner === 'gh') {
        if (affiliatesFound) {
            log('✅ Найдена видимая ссылка Affiliates ');
        } else {
            log('❌ Для партнёра ga/gh не найдена ссылка Affiliates');
        }
    } else {
        if (affiliatesFound) {
            log('❌ Ошибка: найдена ссылка Affiliates для партнёра ' + partner);
        } else {
            log('✅ Нет ни одной ссылки Affiliates для партнёра ' + partner);
        }
    }

    // ---- дальше твоя логика по попапам ----
    for (let i = 0; i < visibleLinks.length; i++) {
        const link = visibleLinks[i];
        await link.evaluate(el => el.scrollIntoView({ behavior: "smooth", block: "center" }));
        const text = await link.evaluate(el => el.textContent.trim());
        log(`🖱 Открываем попап по ссылке: "${text}"`);
        await Promise.all([
            page.waitForSelector('.modal:visible, .modal[style*="display: block"]', { timeout: 5000 }),
            link.click(),
        ]);
        log('⏳ Ждём 1.2 секунды после открытия попапа');
        await page.waitForTimeout(1200);

        const modalVisible = await page.$('.modal:visible, .modal[style*="display: block"]');
        if (modalVisible) {
            log('✅ Попап открылся');
        } else {
            log('❌ Попап не открылся');
            continue;
        }

        const closeBtn = await modalVisible.$('.close-modal');
        if (closeBtn) {
            log('✅ Найдена кнопка закрытия попапа');
            await closeBtn.click();
            log('⏳ Ждём 1.5 секунды после закрытия попапа');
            await page.waitForTimeout(1500);
            await page.waitForSelector('.modal:visible, .modal[style*="display: block"]', { state: 'hidden', timeout: 3000 });
            log('✅ Попап успешно закрылся');
        } else {
            log('❌ Не найдена кнопка .close-modal внутри попапа');
        }

        await page.waitForTimeout(600);
    }

    log('✔️ Проверка всех попапов завершена');
}
