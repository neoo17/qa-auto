/**
 * @param {import('playwright').Page} page
 * @param {Function} log
 * @param {string} partner
 * @param {string} pageName
 */
module.exports = async function checkAllPopups(page, log, partner, pageName) {
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
        log(`❌[${pageName}] Не найдено ни одной видимой ссылки .modal-link`);
        return;
    }

    let affiliatesFound = false;
    let affiliatesHref = null;
    for (const link of visibleLinks) {
        const href = await link.evaluate(el => {
            let parent = el.parentElement;
            while (parent && !['UL','OL','NAV','DIV','SECTION','FOOTER','BODY'].includes(parent.tagName)) {
                parent = parent.parentElement;
            }
            if (!parent) return false;
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
            return a ? (a.getAttribute('href') || '') : '';
        });
        if (href) {
            affiliatesFound = true;
            affiliatesHref = href;
            break;
        }
    }

    if (partner === 'ga' || partner === 'hg') {
        if (affiliatesFound) {
            // normalize and validate exact URL
            const expected = 'https://57hecuhyj2f.typeform.com/to/m76gIX0w';
            const norm = (u) => String(u || '').trim().replace(/\/$/, '').toLowerCase();
            const ok = norm(affiliatesHref) === norm(expected);
            if (ok) {
                log(`✅[${pageName}] Найдена ссылка Affiliates и ведёт на верный URL`);
            } else {
                log(`❌[${pageName}] Ссылка Affiliates ведёт на неверный URL. Ожидали: "${expected}", получили: "${affiliatesHref || '—'}"`);
            }
        } else {
            log(`❌[${pageName}] Для партнёра ga/hg не найдена ссылка Affiliates`);
        }
    } else {
        if (affiliatesFound) {
            log(`❌[${pageName}] Ошибка: найдена ссылка Affiliates для партнёра ${partner}`);
        } else {
            log(`✅[${pageName}] Нет ни одной ссылки Affiliates для партнёра ${partner}`);
        }
    }


    for (let i = 0; i < visibleLinks.length; i++) {
        const link = visibleLinks[i];
        await link.evaluate(el => el.scrollIntoView({ behavior: "smooth", block: "center" }));
        const text = await link.evaluate(el => el.textContent.trim());
        log(`🖱[${pageName}] Открываем попап по ссылке: "${text}"`);
        await link.click({ force: true });
        const modalAppeared = await page.waitForSelector('.modal:visible, .modal[style*="display: block"]', { timeout: 5000 }).catch(() => null);
        if (!modalAppeared) {
            log(`❌[${pageName}]При клике попап "${text}" не открылся!`);
            continue;
        }
        log(`⏳[${pageName}] Ждём 1.2 секунды после открытия попапа`);
        await page.waitForTimeout(1200);

        const modalVisible = await page.$('.modal:visible, .modal[style*="display: block"]');
        if (modalVisible) {
            log(`✅[${pageName}] Попап открылся`);
        } else {
            log(`❌[${pageName}] Попап не открылся`);
            continue;
        }

        const closeBtn = await modalVisible.$('.close-modal');
        if (closeBtn) {
            log(`✅[${pageName}] Найдена кнопка закрытия попапа`);
            await closeBtn.click();
            log(`⏳[${pageName}] Ждём 1.5 секунды после закрытия попапа`);
            await page.waitForTimeout(1500);
            await page.waitForSelector('.modal:visible, .modal[style*="display: block"]', { state: 'hidden', timeout: 3000 })
                .catch(() => log(`❌[${pageName}] Попап "${text}" не закрылся за 3 секунды (или уже закрыт)`));

            log(`✅[${pageName}] Попап успешно закрылся`);
        } else {
            log(`❌[${pageName}] Не найдена кнопка .close-modal внутри попапа`);
        }

        await page.waitForTimeout(600);
    }

    log(`✔️[${pageName}] Проверка всех попапов завершена`);
}
