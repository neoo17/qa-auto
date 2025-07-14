/**
 * Проверяет цены пакетов на странице choose с данными из state
 * @param {import('playwright').Page} page
 * @param {Array} products - products из state
 * @param {Function} log
 */
module.exports = async function checkChoosePackages(page, products, log) {
    log('──────────────────────────────');
    log('➡️ Сравниваем цены с AirTable');

    const packageElements = await page.$$('.packages .package');

    if (!Array.isArray(products) || !products.length) {
        log('❌ В state не найдено ни одного продукта для сравнения!');
        return;
    }

    for (let i = 0; i < packageElements.length; i++) {
        const pkgEl = packageElements[i];
        const orderType = await pkgEl.getAttribute('data-order-type');
        // products[0] -> data-order-type="1"
        // products[1] -> data-order-type="2"
        // products[2] -> data-order-type="3"
        // ...но если у тебя другая логика, поправь!

        // Важно! Индекс пакета = индекс в products (по твоей структуре)
        const stateProduct = products[i];
        const quantity = stateProduct?.quantity || orderType;

        const priceText = await pkgEl.$eval('.price', el => el.textContent.trim());
        const retailText = await pkgEl.$('.retail-price')
            ? await pkgEl.$eval('.retail-price', el => el.textContent.trim())
            : null;
        const saveText = await pkgEl.$('.save-price')
            ? await pkgEl.$eval('.save-price', el => el.textContent.trim())
            : null;

        log(`📦 Проверяем пакет с data-order-type="${orderType}" (products[${i}])`);

        if (!stateProduct) {
            log(`❌ В state нет продукта для пакета #${i} (data-order-type="${orderType}")`);
            continue;
        }

        // Проверяем .price
        const domPrice = parseFloat(priceText.replace(/[^\d.]/g, ''));
        const statePrice = parseFloat(stateProduct.price);
        if (Math.abs(domPrice - statePrice) < 0.01) {
            log(`✅ Price for ${quantity} bottle(s): ${domPrice} совпадает с AirTable: ${statePrice}`);
        } else {
            log(`❌ Price for ${quantity} bottle(s): ${domPrice} НЕ совпадает с AirTable: ${statePrice}`);
        }

        // Проверяем .retail-price (если есть и там и там)
        if (retailText && stateProduct.templates?.retail) {
            const domRetail = parseFloat(retailText.replace(/[^\d.]/g, ''));
            const stateRetail = parseFloat(stateProduct.templates.retail);
            if (Math.abs(domRetail - stateRetail) < 0.01) {
                log(`✅ Retail for ${quantity} bottle(s): ${domRetail} совпадает с AirTable: ${stateRetail}`);
            } else {
                log(`❌ Retail for ${quantity} bottle(s): ${domRetail} НЕ совпадает с AirTable: ${stateRetail}`);
            }
        }

        // Проверяем .save-price (выводим только если есть и там, и там)
        if (saveText && stateProduct.templates?.save) {
            const domSave = parseFloat(saveText.replace(/[^\d.]/g, ''));
            const stateSave = parseFloat(stateProduct.templates.save);
            if (Math.abs(domSave - stateSave) < 0.01) {
                log(`✅ Save for ${quantity} bottle(s): ${domSave} совпадает с AirTable: ${stateSave}`);
            } else {
                log(`❌ Save for ${quantity} bottle(s): ${domSave} НЕ совпадает с AirTable: ${stateSave}`);
            }
        }

        log('---');
    }

    log('✔️ Проверка всех пакетов завершена');
};
