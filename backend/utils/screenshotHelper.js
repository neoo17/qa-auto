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
    await page.screenshot({ path: filePath, fullPage: true });
    if (typeof log === 'function') {
        log(`📸 Скриншот сохранён: /screenshots/${path.basename(screenshotDir)}/${name}.png`);
    }
}

module.exports = shot;
