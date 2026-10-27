/** Resolve the package upgrade popup before waiting for the order request. */
module.exports = async function handlePackagePopup(page, log, mode = 'skip', products = [], originalPackage) {
    const popup = page.locator('.upgrade__wrapper:visible').first();
    if (mode === 'skip') {
        const decline = popup.locator('.upgrade__no_button');
        if (await decline.isVisible()) {
            log('ℹ️ Попап пакета: сохраняем исходный пакет');
            await decline.click();
        } else {
            await popup.locator('.upgrade__close').click();
            await popup.waitFor({ state: 'hidden' });
            await originalPackage.click();
        }
        return null;
    }

    if (!['1', '2'].includes(String(mode))) throw new Error(`Неизвестный вариант попапа: ${mode}`);
    const option = popup.locator(`.upgrade__packages_item.package${mode}`);
    if (!(await option.isVisible())) throw new Error(`В попапе нет доступного пакета №${mode}`);
    const product = products[Number(mode) - 1];
    if (!product) throw new Error(`В state нет пакета №${mode} для попапа`);

    // A single available option is already selected and may intentionally disable clicks.
    if (!(await option.evaluate(el => el.classList.contains('active')))) await option.click();
    const submit = popup.locator('.upgrade__yes_button');
    const selectedOrderType = await submit.getAttribute('data-order-type');
    if (selectedOrderType !== String(mode)) throw new Error(`Попап выбрал пакет ${selectedOrderType} вместо ${mode}`);

    const priceText = await option.locator('.price-hard').innerText();
    const price = Number(priceText.replace(/[^\d.,]/g, '').replace(',', '.'));
    if (Number.isFinite(price) && Math.abs(price - Number(product.price)) < 0.01) {
        log(`✅ [Попап пакета] Цена совпадает со state: ${priceText}`);
    } else {
        log(`❌ [Попап пакета] Цена не совпадает: страница ${priceText}, state ${product.price}`);
    }
    log(`✔️ Попап пакета: выбираем №${mode}, SKU ${product.sku}`);
    await submit.click();
    return product;
};
