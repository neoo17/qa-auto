/**
 * Проверяет цены пакетов на странице choose с данными из state
 * @param {import('playwright').Page} page
 * @param {Array} products - products из state
 * @param {Function} log
 */
module.exports = async function checkChoosePackages(page, products, log) {
    log('──────────────────────────────');
    log('➡️ Сравниваем цены с AirTable');

    // Собираем только реальные пакеты: либо .package, либо .product.productN
    const packageElements = await page.$$('.package, .product');
    const realPackages = [];
    for (const el of packageElements) {
        if (await el.evaluate(el => el.tagName.toLowerCase() === 'div')) {
            const classStr = await el.getAttribute('class') || '';
            // .package (старый вариант) или .product1/.product2/.product3 (новый вариант)
            if (
                classStr.includes('package') ||
                /product\d+/.test(classStr)
            ) {
                realPackages.push(el);
            }
        }
    }

    if (!Array.isArray(products) || !products.length) {
        log('❌ В state не найдено ни одного продукта для сравнения!');
        return;
    }

    function parsePrice(str) {
        if (!str) return null;
        const match = String(str).replace(',', '.').match(/(\d+[\d.,]*)/);
        if (match) return parseFloat(match[1].replace(/,/g, '.'));
        return null;
    }

    async function getTextByClasses(pkgEl, classes) {
        for (const className of classes) {
            try {
                const text = await pkgEl.$eval(className, el => el.textContent.trim());
                if (text) return text;
            } catch {}
        }
        return null;
    }

    // Определяем id пакета для лога: data-order-type или класс .productN
    async function getPackageIdentifier(pkgEl, idx) {
        const orderType = await pkgEl.getAttribute('data-order-type');
        if (orderType) return `data-order-type="${orderType}"`;

        // Пробуем найти класс productN
        const classStr = await pkgEl.getAttribute('class') || '';
        const match = classStr.match(/product(\d+)/);
        if (match) return `class="product${match[1]}"`;

        // Если ничего нет — просто порядковый номер (fallback)
        return `#${idx + 1}`;
    }

    let found = false;
    for (let i = 0; i < realPackages.length; i++) {
        const pkgEl = realPackages[i];
        const pkgId = await getPackageIdentifier(pkgEl, i);

        const stateProduct = products[i];
        const quantity = stateProduct?.quantity || (pkgId.match(/\d+/)?.[0] ?? (i + 1));

        const priceText = await getTextByClasses(pkgEl, ['.price', '.price-hard', '.price-custom']);
        const retailText = await getTextByClasses(pkgEl, ['.retail-price', '.retail-price-hard']);
        const saveText = await getTextByClasses(pkgEl, ['.save-price', '.save-price-hard']);

        log(`📦 Проверяем пакет #${i + 1} (${pkgId})`);
        found = true;

        if (!stateProduct) {
            log(`❌ В state нет продукта для пакета #${i} (${pkgId})`);
            log('---');
            continue;
        }

        // Проверяем .price
        const domPrice = parsePrice(priceText);
        const statePrice = parsePrice(stateProduct.price);
        if (domPrice == null || statePrice == null) {
            log(`⚠️ Не удалось распарсить цену для ${quantity} bottle(s): dom="${priceText}", state="${stateProduct.price}"`);
        } else if (Math.abs(domPrice - statePrice) < 0.01) {
            log(`✅ Price for ${quantity} bottle(s): ${domPrice} совпадает с AirTable: ${statePrice}`);
        } else {
            log(`❌ Price for ${quantity} bottle(s): ${domPrice} НЕ совпадает с AirTable: ${statePrice}`);
        }

        // Проверяем .retail-price (если есть и там, и там)
        if (retailText && stateProduct.templates?.retail) {
            const domRetail = parsePrice(retailText);
            const stateRetail = parsePrice(stateProduct.templates.retail);
            if (domRetail == null || stateRetail == null) {
                log(`⚠️ Не удалось распарсить retail для ${quantity} bottle(s): dom="${retailText}", state="${stateProduct.templates.retail}"`);
            } else if (Math.abs(domRetail - stateRetail) < 0.01) {
                log(`✅ Retail for ${quantity} bottle(s): ${domRetail} совпадает с AirTable: ${stateRetail}`);
            } else {
                log(`❌ Retail for ${quantity} bottle(s): ${domRetail} НЕ совпадает с AirTable: ${stateRetail}`);
            }
        }

        // Проверяем .save-price (выводим только если есть и там, и там)
        if (saveText && stateProduct.templates?.save) {
            const domSave = parsePrice(saveText);
            const stateSave = parsePrice(stateProduct.templates.save);
            if (domSave == null || stateSave == null) {
                log(`⚠️ Не удалось распарсить save для ${quantity} bottle(s): dom="${saveText}", state="${stateProduct.templates.save}"`);
            } else if (Math.abs(domSave - stateSave) < 0.01) {
                log(`✅ Save for ${quantity} bottle(s): ${domSave} совпадает с AirTable: ${stateSave}`);
            } else {
                log(`❌ Save for ${quantity} bottle(s): ${domSave} НЕ совпадает с AirTable: ${stateSave}`);
            }
        }

        log('---');
    }

    if (!found) {
        log('❌ Не найдено ни одного блока с пакетами на странице!');
    } else {
        log('✔️ Проверка всех пакетов завершена');
    }
};
