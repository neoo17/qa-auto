/**
 * Проверяет, нет ли на странице других продуктовых названий, кроме текущего.
 * Совпадение считается, если встречается максимальная по длине последовательность (2+ слова подряд) из productList,
 * и этот фрагмент НЕ совпадает с текущим названием (или его частью).
 */
async function checkNoOtherProductsOnPage(page, currentProductTitle, log, productList) {
    function normalizeForCompare(str) {
        return (str || "")
            .replace(/Jump!/gi, '')
            .replace(/\s+/g, ' ')
            .trim()
            .toLowerCase();
    }

    const pageTextRaw = await page.evaluate(() => document.body.textContent || '');
    const pageText = normalizeForCompare(pageTextRaw);
    const mainTitle = normalizeForCompare(currentProductTitle);

    let found = [];
    for (const prod of productList) {
        let normProd = normalizeForCompare(prod);
        if (!normProd || normProd === mainTitle) continue;

        // разбиваем на слова оригинал (оставляя спецсимволы)
        const wordsOrig = prod
            .replace(/Jump!/gi, '')
            .replace(/\s+/g, ' ')
            .trim()
            .split(' ')
            .filter(x => x.length > 0);

        // Фрагменты от длинных к коротким (мин. 2 слова)
        let maxMatch = null;
        for (let len = wordsOrig.length; len >= 2; len--) {
            for (let i = 0; i <= wordsOrig.length - len; i++) {
                const fragmentArr = wordsOrig.slice(i, i + len);
                const fragment = fragmentArr.join(' ');
                const fragmentNorm = normalizeForCompare(fragment);

                // Встречается ли этот фрагмент на странице?
                if (pageText.includes(fragmentNorm)) {
                    // Совпадает ли с currentTitle? Если да — пропускаем
                    if (mainTitle.includes(fragmentNorm)) continue;
                    // В остальных случаях — это потенциально чужой продукт!
                    maxMatch = fragment;
                    break;
                }
            }
            if (maxMatch) break;
        }
        if (maxMatch) found.push(maxMatch);
    }

    if (found.length) {
        log(`⚠️ [ProductChecker][Warning] На странице найдены возможные другие продукты (фрагменты): "${found.join('", "')}"`);
    } else {
        log(`✅ [ProductChecker] На странице нет других продуктовых названий, кроме "${currentProductTitle}"`);
    }
}

module.exports = checkNoOtherProductsOnPage;
