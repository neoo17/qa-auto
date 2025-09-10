const path = require('path');
const fs = require('fs');

/**
 * Сохраняет скриншот страницы по указанному имени.
 * @param {object} page - playwright.Page
 * @param {string} screenshotDir - путь до папки для скринов
 * @param {string} name - имя скрина (без .png)
 * @param {function} [log] - функция для логирования (опционально)
 */
async function shot(page, screenshotDir, name, log) {
    if (!fs.existsSync(screenshotDir)) {
        fs.mkdirSync(screenshotDir, { recursive: true });
    }
    const filePath = path.join(screenshotDir, name + '.png');
    let didAdjustScrollContainers = false;
    if (name === 'confirmation') {
        try {
            // Небольшой проскролл, чтобы добить lazy‑контент
            await page.evaluate(() => {
                window.scrollTo(0, 0);
                setTimeout(() => window.scrollTo(0, document.documentElement.scrollHeight || document.body.scrollHeight || 2000), 50);
            });
            await page.waitForTimeout(250);

            // Ищем самый высокий скроллируемый контейнер и временно раскрываем его
            didAdjustScrollContainers = await page.evaluate(() => {
                const candidates = Array.from(document.querySelectorAll('*'));
                let best = null;
                let bestScore = 0;
                for (const el of candidates) {
                    const cs = getComputedStyle(el);
                    const sh = el.scrollHeight || 0;
                    const ch = el.clientHeight || 0;
                    const scrollable = /(auto|scroll)/.test(cs.overflowY) && sh > ch + 20;
                    if (scrollable) {
                        const score = sh - ch;
                        if (score > bestScore) {
                            best = el; bestScore = score;
                        }
                    }
                }
                if (best) {
                    const sh = best.scrollHeight || 0;
                    best.setAttribute('data-qa-scrollfix', '1');
                    best.setAttribute('data-qa-prev-style', best.getAttribute('style') || '');
                    best.style.overflowY = 'visible';
                    best.style.maxHeight = 'none';
                    if (sh) best.style.height = sh + 'px';
                    // Подстрахуемся и ослабим переполнение у ближайших родителей
                    let p = best.parentElement;
                    let hops = 0;
                    while (p && hops < 2) {
                        const pcs = getComputedStyle(p);
                        if (/(auto|scroll|hidden)/.test(pcs.overflowY)) {
                            p.setAttribute('data-qa-prev-style', p.getAttribute('style') || '');
                            p.style.overflowY = 'visible';
                            p.style.maxHeight = 'none';
                        }
                        p = p.parentElement; hops++;
                    }
                    return true;
                }
                return false;
            });
        } catch {}
    }

    await page.screenshot({ path: filePath, fullPage: true });

    // Возвращаем стили обратно, если меняли
    if (didAdjustScrollContainers) {
        try {
            await page.evaluate(() => {
                document.querySelectorAll('[data-qa-prev-style]').forEach(el => {
                    const prev = el.getAttribute('data-qa-prev-style');
                    if (prev) el.setAttribute('style', prev); else el.removeAttribute('style');
                    el.removeAttribute('data-qa-prev-style');
                    el.removeAttribute('data-qa-scrollfix');
                });
            });
        } catch {}
    }
    if (typeof log === 'function') {
        log(`📸 Скриншот сохранён: /screenshots/${path.basename(screenshotDir)}/${name}.png`);
    }
}

module.exports = shot;
