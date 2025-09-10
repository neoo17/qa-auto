/**
 * Проверяет объединенную форму shipping (поля из qualify и shipping)
 * @param {import('playwright').Page} page
 * @param {Function} log
 * @param {string} countryCode
 * @param {string} partner
 * @returns {Promise<string>} селектор, по которому был клик
 */
module.exports = async function checkCombinedShippingForm(page, log, countryCode, partner) {
    const fieldsConfig = require('./fieldLabelsConfig.js');

    // 1. Проверка купона (ищем и <span class="coupon"> и input#promo c value)
    let couponValue = null;
    // 1.1 Поиск по span.coupon
    const couponSelector = 'span.coupon';
    const couponExists = await page.$(couponSelector);
    if (couponExists) {
        couponValue = await page.$eval(couponSelector, el => el.textContent.trim());
        log(`🧾 На странице есть купон: "${couponValue}" (span.coupon)`);
    } else {
        // 1.2 Поиск по input#promo[value]
        const promoInput = await page.$('input#promo[value]');
        if (promoInput) {
            couponValue = await page.$eval('input#promo', el => el.value.trim());
            log(`🧾 На странице есть купон: "${couponValue}" (input#promo)`);
        }
    }

    if (couponValue) {
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
        log('ℹ️ Купон не найден на странице (пропускаем проверку)');
    }

    // 2. Проверка лейблов и плейсхолдеров
    log(`🌎 Проверяем лейблы и плейсхолдеры для объединенной формы shipping (${countryCode})`);
    const config = fieldsConfig[countryCode];

    if (!config) {
        log(`⚠️ Нет настроек для страны "${countryCode}" — пропускаем проверку`);
        return;
    }

    const allFields = [
        'firstName', 'lastName', 'email', 'phone',
        'address', 'zipCode', 'city', 'state', 'country'
    ];

    for (const name of allFields) {
        if (!config[name]) continue;

        const { label, placeholder, type } = config[name];
        const isSelect = type === 'select';
        const inputSel = isSelect
            ? `form#shipping select[name="${name}"]`
            : `form#shipping input[name="${name}"]`;

        // Проверяем существование поля
        const fieldExists = await page.$(inputSel) !== null;
        if (!fieldExists) {
            log(`ℹ️ Поле "${name}" не найдено на форме`);
            continue;
        }

        if (isSelect && name === 'country') {
            try {
                const selectedValue = await page.$eval(inputSel, el => el.value);
                const expectedCountry = (((countryCode || '').split(/[-_]/)[0]) || '').toUpperCase();
                const actualCountry = (selectedValue || '').toUpperCase();
                if (actualCountry === expectedCountry) {
                    log(`✅ [${name}] выбрано правильное значение: "${actualCountry}"`);
                } else {
                    log(`❌ [${name}] выбрано неверное значение! Ожидали: "${expectedCountry}", получили: "${actualCountry}"`);
                }
            } catch {
                log(`❌ [${name}] не удалось получить выбранное значение`);
            }
        }

        // Проверяем видимость поля
        const isVisible = await page.$eval(inputSel, el => {
            const style = window.getComputedStyle(el);
            return style.display !== 'none' && style.visibility !== 'hidden' && el.offsetParent !== null;
        }).catch(() => false);

        if (!isVisible) {
            log(`ℹ️ Поле "${name}" скрыто, пропускаем проверку`);
            continue;
        }

        // --- Проверяем label (через for или DOM структуру) ---
        try {
            let labelEl = null;
            // 1. Если есть id, ищем label[for]
            const inputId = await page.$eval(inputSel, el => el.id || null).catch(() => null);
            if (inputId) {
                labelEl = await page.$(`label[for="${inputId}"]`);
            }
            // 2. Если нет — ищем "соседний" label в том же .form-holder
            if (!labelEl) {
                const formHolder = await page.$(`${inputSel} >> xpath=ancestor::*[contains(@class, "form-holder")]`);
                if (formHolder) {
                    labelEl = await formHolder.$('label');
                }
            }
            if (labelEl) {
                const actualLabel = await labelEl.evaluate(el => el.textContent.trim());
                if (actualLabel !== label) {
                    log(`❌ Label для "${name}" не совпадает! Ожидали: "${label}", получили: "${actualLabel}"`);
                } else {
                    log(`✅ Label для "${name}" совпадает: "${label}"`);
                }
            } else {
                log(`ℹ️ Label для "${name}" не найден, пропускаем проверку`);
            }
        } catch (e) {
            log(`ℹ️ Не удалось получить label для "${name}"`);
        }

        // Проверка placeholder для input
        if (!isSelect) {
            try {
                const actualPlaceholder = await page.$eval(inputSel, el => el.getAttribute('placeholder'));
                if (actualPlaceholder !== placeholder) {
                    log(`❌ Placeholder для "${name}" не совпадает! Ожидали: "${placeholder}", получили: "${actualPlaceholder}"`);
                } else {
                    log(`✅ Placeholder для "${name}" совпадает: "${placeholder}"`);
                }
            } catch {
                log(`ℹ️ Не удалось получить placeholder для "${name}"`);
            }

            // Проверка типа поля
            try {
                const actualType = await page.$eval(inputSel, el => el.getAttribute('type'));
                if (actualType !== type) {
                    log(`❌ Type для "${name}" не совпадает! Ожидали: "${type}", получили: "${actualType}"`);
                } else {
                    log(`✅ Type для "${name}" совпадает: "${type}"`);
                }
            } catch {
                log(`ℹ️ Не удалось получить type для "${name}"`);
            }
        }

        // Проверка первого option для select
        if (isSelect && placeholder) {
            try {
                const optionText = await page.$eval(`${inputSel} option`, el => el.textContent.trim());
                if (optionText !== placeholder) {
                    log(`❌ [select ${name}] Первый option (placeholder) — ожидали "${placeholder}", получили "${optionText}"`);
                } else {
                    log(`✅ [select ${name}] Первый option совпадает: "${optionText}"`);
                }
            } catch {
                log(`ℹ️ Не удалось получить первый option для "${name}"`);
            }
        }
    }

    // 3. Проверка required, пустая форма
    log('🚫 Пробуем отправить пустую форму...');
    for (const name of allFields) {
        const inputSel = `form#shipping input[name="${name}"]`;
        const inputExists = await page.$(inputSel) !== null;
        if (inputExists) {
            await page.fill(inputSel, '');
        }
    }

    // --- Универсальный клик по сабмиту ---
    let submitSelector;
    const hasRushtop = await page.$('form#shipping #rushtop');
    if (hasRushtop) {
        submitSelector = 'form#shipping #rushtop';
        log('🔘 Кликаем по #rushtop для отправки формы');
        await page.click(submitSelector);
    } else {
        submitSelector = 'form#shipping button[type="submit"]';
        log('🔘 Кликаем по button[type="submit"] для отправки формы');
        await page.click(submitSelector);
    }
    await page.waitForTimeout(800);

    let stillHere = await page.isVisible('form#shipping');
    if (stillHere) {
        log('✅ Форма осталась — валидация пустой формы работает');
    } else {
        log('❌ Форма исчезла — баг при отправке пустой формы');
        return submitSelector; // Возвращаем даже если форма исчезла
    }

    // 4. Проверка валидации email
    const invalidEmails = [
        'test@', 'bad.email', '@domain.com', '.user@gmail.com', 'user.@gmail.com', 'us..er@gmail.com'
    ];
    for (const bad of invalidEmails) {
        await page.fill('input[name="firstName"]', 'Test');
        await page.fill('input[name="lastName"]', 'Test');
        await page.fill('input[name="email"]', bad);
        await page.fill('input[name="phone"]', '123456');
        log(`🚫 Пробуем отправить с невалидным email: "${bad}"`);
        // --- Тот же универсальный клик ---
        const hasRushtop = await page.$('form#shipping #rushtop');
        if (hasRushtop) {
            submitSelector = 'form#shipping #rushtop';
            await page.click(submitSelector);
        } else {
            submitSelector = 'form#shipping button[type="submit"]';
            await page.click(submitSelector);
        }
        await page.waitForTimeout(700);
        stillHere = await page.isVisible('form#shipping');
        if (stillHere) {
            log('✅ Форма осталась — невалидный email не пропущен');
        } else {
            log(`❌ Форма ушла — баг в валидации email: "${bad}"`);
            return submitSelector;
        }
        await page.fill('input[name="email"]', '');
    }

    // 5. Заполняем форму валидными данными
    log('📝 Заполняем форму валидными данными...');
    await page.fill('input[name="firstName"]', 'Ivan');
    await page.fill('input[name="lastName"]', 'Ivanov');
    await page.fill('input[name="email"]', 'user1_2-3@subdomain.test.com');
    await page.fill('input[name="phone"]', '8888888888');

    // Заполняем адресные поля
    const addressField = await page.$('input[name="address"]');
    if (addressField) await page.fill('input[name="address"]', 'Test Street 123');
    const zipField = await page.$('input[name="zipCode"]');
    if (zipField) await page.fill('input[name="zipCode"]', '12345');
    const cityField = await page.$('input[name="city"]');
    if (cityField) await page.fill('input[name="city"]', 'Test City');

    // Выбираем штат/регион, если есть
    const stateSelect = await page.$('form#shipping select[name="state"]');
    if (stateSelect) {
        const customDropdownSelect = await page.$('form#shipping .dropdown .dropdown-select');
        if (customDropdownSelect) {
            log('⚡️ [state] Кастомный select (dropdown), выбираем штат через .dropdown-menu-item');
            await customDropdownSelect.click();
            await page.waitForSelector('form#shipping .dropdown-menu', { timeout: 2500 });
            await page.waitForTimeout(200);
            const toPick = await page.$('form#shipping .dropdown-menu-item:not(.is-select)[data-value]');
            if (toPick) {
                const text = await toPick.evaluate(el => el.textContent.trim());
                await toPick.click();
                log(`✅ [state] Кликнули по кастомному штату: ${text}`);
            } else {
                log('❌ [state] Не нашли доступный штат для выбора в кастомном dropdown!');
            }
        } else {
            log('🟢 [state] Обычный select, выбираем штат через .selectOption');
            const stateOptions = await page.$$eval('form#shipping select[name="state"] option', opts => opts.map(o => o.value).filter(Boolean));
            if (stateOptions.length >= 1) {
                await page.selectOption('form#shipping select[name="state"]', stateOptions[0]);
                await page.$eval('form#shipping select[name="state"]', el => {
                    el.dispatchEvent(new Event('change', { bubbles: true }));
                });
                log(`✅ [state] Выбрали штат "${stateOptions[0]}" в обычном select`);
            } else {
                log('❌ [state] Нет доступных опций для выбора в обычном select!');
            }
        }
    }

    log('🟢 Тест объединенной формы shipping завершён');
    return submitSelector;
};
