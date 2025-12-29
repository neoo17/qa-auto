/**
 * @param {import('playwright').Page} page
 * @param {Function} log
 * @param {string} pageName
 */
module.exports = async function checkFooterYear(page, log, pageName) {
    const currentYear = new Date().getFullYear();
    const yearStr = String(currentYear);
    try {
        const selectors = ['span.container-year', 'span.u-copyright', '#footer', 'footer'];
        const elements = [];

        for (const selector of selectors) {
            const els = await page.$$(selector);
            for (const el of els) elements.push({ selector, el });
        }

        if (!elements.length) {
            return;
        }

        const matches = [];
        const foundTexts = [];
        const foundYears = new Set();
        const yearRegex = /\b(19|20)\d{2}\b/g;

        for (const { selector, el } of elements) {
            const rawText = await el.evaluate(node => (node.textContent || '').trim());
            const text = rawText.replace(/\s+/g, ' ').trim();
            const years = text.match(yearRegex) || [];
            const hasYear = years.includes(yearStr);
            const maxLen = 140;
            const displayText = text.length > maxLen ? `${text.slice(0, maxLen)}...` : text;

            foundTexts.push(`${selector}: "${displayText || '—'}"`);
            for (const y of years) foundYears.add(y);
            if (hasYear) matches.push({ selector, text });
        }

        if (matches.length) {
            const firstMatch = matches[0];
            log(`✅[${pageName}] Год в футере корректный: ${yearStr}`);
        } else if (foundYears.size) {
            log(`❌[${pageName}] Неверный год в футере. Ожидали ${currentYear}, нашли ${Array.from(foundYears).join(', ')}`);
        } else {
            return;
        }
    } catch (e) {
        log(`⚠️[${pageName}] Ошибка при проверке года в футере: ${e.message || e}`);
    }
};
