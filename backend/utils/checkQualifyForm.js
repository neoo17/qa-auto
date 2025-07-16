// checkQualifyForm.js
const fieldsConfig = require('./fieldLabelsConfig.js');
const QUALIFY_FIELDS = ['firstName', 'lastName', 'email', 'phone'];

/**
 * @param {import('playwright').Page} page
 * @param {Function} log
 * @param {string} countryCode
 * @param {string} partner
 */

module.exports = async function checkQualifyForm(page, log, countryCode, partner) {
    log('📝 Проверяем наличие формы #qualify...');
    await page.waitForSelector('form#qualify', { timeout: 7000 });

    const couponSelector = 'span.coupon';
    const couponExists = await page.$(couponSelector);

    if (couponExists) {
        const couponValue = await page.$eval(couponSelector, el => el.textContent.trim());
        log(`🧾 На странице есть купон: "${couponValue}"`);

        if (['dnav3', 'newdna'].includes(partner)) {
            if (couponValue === 'DA25171525') {
                log('✅ Купон для dnav3/newdna корректный: DA25171525');
            } else {
                log(`❌ Купон для dnav3/newdna должен быть "DA25171525", а сейчас "${couponValue}"`);
            }
        }
        if (['hg', 'ga'].includes(partner)) {
            if (couponValue === 'BS31910296') {
                log('✅ Купон для hg/ga корректный: BS31910296');
            } else {
                log(`❌ Купон для hg/ga должен быть "BS31910296", а сейчас "${couponValue}"`);
            }
        }
    } else {
        log('ℹ️ Купон <span class="coupon">BS31910296</span> не найден на странице (пропускаем проверку)');
    }


    log(`🌎 Проверяем лейблы и плейсхолдеры для QUALIFY (${countryCode})`);
    const config = fieldsConfig[countryCode];
    if (!config) {
        log(`⚠️ Нет настроек для страны "${countryCode}" — пропускаем проверку`);
    } else {
        for (const name of QUALIFY_FIELDS) {
            const { label, placeholder, type } = config[name];
            const inputSel = `form#qualify input[name="${name}"]`;

            // Label
            let actualLabel = null;
            try {
                actualLabel = await page.$eval(`${inputSel} >> xpath=../../label`, el => el.textContent.trim());
            } catch {
                actualLabel = null;
            }
            if (actualLabel !== label) {
                log(`❌ Label для "${name}" не совпадает! Ожидали: "${label}", получили: "${actualLabel}"`);
            } else {
                log(`✅ Label для "${name}" совпадает: "${label}"`);
            }

            // Placeholder
            let actualPlaceholder = null;
            try {
                actualPlaceholder = await page.$eval(inputSel, el => el.getAttribute('placeholder'));
            } catch {
                actualPlaceholder = null;
            }
            if (actualPlaceholder !== placeholder) {
                log(`❌ Placeholder для "${name}" не совпадает! Ожидали: "${placeholder}", получили: "${actualPlaceholder}"`);
            } else {
                log(`✅ Placeholder для "${name}" совпадает: "${placeholder}"`);
            }

            // Type
            let actualType = null;
            try {
                actualType = await page.$eval(inputSel, el => el.getAttribute('type'));
            } catch {
                actualType = null;
            }
            if (actualType !== type) {
                log(`❌ Type для "${name}" не совпадает! Ожидали: "${type}", получили: "${actualType}"`);
            } else {
                log(`✅ Type для "${name}" совпадает: "${type}"`);
            }
        }
    }

    // --- Проверка required, пустая форма ---
    log('🚫 Пробуем отправить пустую форму...');
    await page.click('form#qualify button[type="submit"]');
    await page.waitForTimeout(800);

    let stillHere = await page.isVisible('form#qualify');
    if (stillHere) {
        log('✅ Форма осталась — валидация пустой формы работает');
    } else {
        log('❌ Форма исчезла — баг при отправке пустой формы');
    }

    const invalidEmails = ['test@', 'bad.email', '@domain.com', '.user@gmail.com', 'user.@gmail.com', 'us..er@gmail.com'];
    for (const bad of invalidEmails) {
        await page.fill('input[name="firstName"]', 'Test');
        await page.fill('input[name="lastName"]', 'Test');
        await page.fill('input[name="email"]', bad);
        await page.fill('input[name="phone"]', '123456');
        log(`🚫 Пробуем отправить с невалидным email: "${bad}"`);
        await page.click('form#qualify button[type="submit"]');
        await page.waitForTimeout(700);
        stillHere = await page.isVisible('form#qualify');
        if (stillHere) {
            log('✅ Форма осталась — невалидный email не пропущен');
        } else {
            log(`❌ Форма ушла — баг в валидации email: "${bad}"`);
            return;
        }
        await page.fill('input[name="email"]', '');
    }

    await page.fill('input[name="firstName"]', 'Ivan');
    await page.fill('input[name="lastName"]', 'Ivanov');
    await page.fill('input[name="email"]', 'user1_2-3@subdomain.test.com');
    await page.fill('input[name="phone"]', '8888888888');
};
