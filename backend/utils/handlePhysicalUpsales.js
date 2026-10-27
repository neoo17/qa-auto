const shot = require('./screenshotHelper');
const checkFooterYear = require('./checkFooterYear');

function parseActions(custom) {
    const schema = typeof custom === 'string' ? custom : (custom?.param || custom?.customParam || '1');
    return String(schema).toLowerCase().replace(/[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/g, '-')
        .replace(/\s+/g, '').split('-').filter(Boolean).slice(1);
}

function upsaleSku(url) {
    return new URL(url).pathname.match(/\/upsale-(\d+)\.html$/i)?.[1];
}

function normalizeTitle(title, quantities = []) {
    let result = String(title || '').replace(/Upsell|Upgrade/gi, '');
    for (const quantity of quantities) {
        result = result.replace(new RegExp(`\\b${Number(quantity)}\\s+(?=bottles?\\b)`, 'gi'), '');
    }
    return result.replace(/\s+/g, ' ').trim().toLowerCase();
}

async function submitUpsale(page, button, isYes) {
    const previousUrl = page.url();
    const endpoint = isYes ? '/ajax/add-upsale' : '/ajax/skip-upsells';
    const destinationRequests = new Set();
    let navigating = false;
    const capture = request => {
        if (request.isNavigationRequest() && request.frame() === page.mainFrame() && request.url() !== previousUrl) {
            navigating = true;
        }
        if (request.url().includes('/ajax/state') && navigating) destinationRequests.add(request);
    };
    page.on('request', capture);
    // The offer may fetch state on the old page before navigating. Only accept destination state.
    const statePromise = page.waitForResponse(response =>
        destinationRequests.has(response.request()) && response.status() === 200, { timeout: 20000 });
    const responsePromise = page.waitForResponse(response =>
        response.request().method() === 'POST' && new URL(response.url()).pathname === endpoint,
    { timeout: 15000 });
    const navigation = page.waitForURL(url => url.href !== previousUrl, { waitUntil: 'load', timeout: 20000 });
    try {
        const [response, stateResponse] = await Promise.all([
            responsePromise, statePromise, navigation, button.click()
        ]);
        if (!response.ok()) throw new Error(`${endpoint}: HTTP ${response.status()}`);
        const body = await response.json().catch(() => null);
        if (body?.success === false) throw new Error(`${endpoint}: сервер отклонил действие`);
        const state = await stateResponse.json();
        return { request: response.request(), state };
    } finally {
        page.off('request', capture);
    }
}

/** Physical alternatives are SKUs on one page, not separate steps in the funnel. */
module.exports = async function handlePhysicalUpsales(page, log, custom, sendTestInfo, firstState, screenshotDir) {
    const actions = parseActions(custom);
    const buyAll = actions.length === 0;
    const catalog = new Map();
    let state = { data: firstState };
    for (let step = 1; step <= 10; step++) {
        if (/\/confirmation(?:\.html)?$/i.test(new URL(page.url()).pathname)) return state;
        for (const product of [...(state.data?.upsales || []), ...(state.data?.availableUpsales || [])]) {
            catalog.set(String(product.sku), product);
        }
        const pageProduct = catalog.get(upsaleSku(page.url()));
        if (!pageProduct) throw new Error(`Не найден SKU текущего апсейла в state: ${page.url()}`);
        // Preserve the history protection check used by the existing upsale flow.
        const beforeBack = page.url();
        log(`🧪 Проверяем возврат назад с апсейла #${step}...`);
        await page.goBack();
        await page.waitForTimeout(1000);
        if (page.url() === beforeBack) log(`✅ [Check][#${step}] Возврат назад заблокирован`);
        else log(`❌ [Check][#${step}] После возврата назад URL изменился: ${page.url()}`);
        await page.goForward();
        await page.waitForTimeout(350);
        await checkFooterYear(page, log, `upsale-${step}`);
        const action = actions[step - 1] ?? (buyAll ? '1' : '0');
        if (!/^(?:[0-3]|\d+b)$/.test(action)) throw new Error(`Неизвестное действие апсейла: ${action}`);
        const quantity = /^(\d+)b$/.exec(action)?.[1];
        const isYes = action !== '0';
        const choices = [];
        for (const element of await page.locator('.package[data-order-type]:visible').all()) {
            const sku = await element.getAttribute('data-order-type');
            const product = catalog.get(sku);
            if (!product) throw new Error(`Вариант апсейла SKU ${sku} отсутствует в state`);
            choices.push({ element, product, active: await element.evaluate(el => el.classList.contains('active')) });
        }
        let expected = pageProduct;
        if (quantity) {
            const choice = choices.find(item => Number(item.product.quantity) === Number(quantity));
            if (choice) {
                if (!choice.active) await choice.element.click();
                await page.waitForFunction(sku =>
                    [...document.querySelectorAll('.package.active[data-order-type]')]
                        .some(el => el.dataset.orderType === sku), String(choice.product.sku), { timeout: 3000 });
                expected = choice.product;
            } else if (choices.length || Number(pageProduct.quantity) !== Number(quantity)) {
                throw new Error(`На апсейле #${step} нет варианта ${quantity} банки`);
            }
        } else if (choices.length) {
            const selected = choices.find(item => item.active);
            if (!selected) throw new Error(`На апсейле #${step} не выбран пакет`);
            expected = selected.product;
        }

        const quantities = choices.length > 1 ? choices.map(item => item.product.quantity) : [];
        const actualTitle = await page.title();
        if (expected.templates?.title && normalizeTitle(actualTitle, quantities) === normalizeTitle(expected.templates.title, quantities)) {
            log(`✅ [Physical #${step}] Title совпадает`);
        } else {
            log(`❌ [Physical #${step}] Title не совпадает: "${actualTitle}" / "${expected.templates?.title}"`);
        }
        if (screenshotDir) await shot(page, screenshotDir, `upsale-${step}`, log);

        // Keep legacy action meanings: 1 = first anchor, 2 = last DIV, 3 = last anchor.
        const selector = !isYes ? '.button__no:visible'
            : action === '2' ? 'div.button__yes:visible' : 'a.button__yes:visible';
        const buttons = page.locator(selector);
        if (!(await buttons.count())) throw new Error(`Нет кнопки для действия ${action} на апсейле #${step}`);
        const button = action === '2' || action === '3' ? buttons.last() : buttons.first();
        log(`🖱️ [Physical #${step}] ${isYes ? `Покупаем SKU ${expected.sku}, количество ${expected.quantity}` : 'Пропускаем предложение'}`);
        const result = await submitUpsale(page, button, isYes);
        const params = new URLSearchParams(result.request.postData() || '');
        const sentSkus = params.getAll('upsale[]');
        if (isYes) {
            if (sentSkus.length === 1 && sentSkus[0] === String(expected.sku)) {
                log(`✅ [Physical #${step}] SKU совпадает: ${expected.sku}`);
            } else {
                log(`❌ [Physical #${step}] SKU не совпадает: ожидали ${expected.sku}, отправили ${sentSkus.join(', ')}`);
            }
        }
        sendTestInfo?.({
            _section: isYes ? 'YES' : 'NO',
            message: `Physical #${step}: ${isYes ? 'покупка' : 'пропуск'}`,
            package: expected,
            data: Object.fromEntries(params)
        });
        state = result.state;
    }
    if (!/\/confirmation(?:\.html)?$/i.test(new URL(page.url()).pathname)) {
        throw new Error('Превышен лимит 10 апсейлов без перехода на confirmation');
    }
    return state;
};

module.exports.parseActions = parseActions;
