/**
 * @param {import('playwright').Page} page
 * @param {Function} log
 * @param {string} pageName
 */
module.exports = async function checkFooterYear(page, log, pageName) {
    const currentYear = new Date().getFullYear();
    const yearStr = String(currentYear);
    try {
        const primarySelectors = ['span.container-year', 'span.u-copyright'];
        const fallbackSelectors = ['#footer', 'footer'];
        const elements = [];

        for (const selector of primarySelectors) {
            const el = await page.$(selector);
            if (el) elements.push({ selector, el });
        }

        if (!elements.length) {
            for (const selector of fallbackSelectors) {
                const el = await page.$(selector);
                if (el) elements.push({ selector, el });
            }

            if (!elements.length) {
                // log(`❌[${pageName}] Не найден элемент .container-year, .u-copyright, #footer или footer`);
                return;
            }
        }

        const matches = [];
        const foundTexts = [];

        for (const { selector, el } of elements) {
            const rawText = await el.evaluate(node => (node.textContent || '').trim());
            const text = rawText.replace(/\s+/g, ' ').trim();
            const years = text.match(/\d{4}/g) || [];
            const hasYear = years.includes(yearStr) || text.includes(yearStr);
            const maxLen = 140;
            const displayText = text.length > maxLen ? `${text.slice(0, maxLen)}...` : text;

            foundTexts.push(`${selector}: "${displayText || '—'}"`);
            if (hasYear) matches.push({ selector, text });
        }

        if (matches.length) {
            const firstMatch = matches[0];
            log(`✅[${pageName}] Год в футере корректный: ${yearStr}`);
        } else {
            log(`❌[${pageName}] Неверный год в футере. Ожидали ${currentYear}, получили ${foundTexts.join('; ')}`);
        }
    } catch (e) {
        log(`⚠️[${pageName}] Ошибка при проверке года в футере: ${e.message || e}`);
    }
};
