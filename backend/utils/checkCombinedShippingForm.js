/**
 * Проверяет объединенную форму shipping (поля из qualify и shipping)
 * @param {import('playwright').Page} page
 * @param {Function} log
 * @param {string} countryCode
 * @param {string} partner
 */
module.exports = async function checkCombinedShippingForm(page, log, countryCode, partner) {
    const fieldsConfig = require('./fieldLabelsConfig.js');
    
    // 1. Проверка купона
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
    
    // 2. Проверка лейблов и плейсхолдеров
    log(`🌎 Проверяем лейблы и плейсхолдеры для объединенной формы shipping (${countryCode})`);
    const config = fieldsConfig[countryCode];
    
    if (!config) {
        log(`⚠️ Нет настроек для страны "${countryCode}" — пропускаем проверку`);
        return;
    }
    
    // Объединенный список полей из qualify и shipping
    const allFields = [
        // Поля из qualify
        'firstName', 'lastName', 'email', 'phone',
        // Поля из shipping
        'address', 'zipCode', 'city', 'state', 'country'
    ];
    
    // Проверяем все поля
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

        // Проверяем видимость поля
        const isVisible = await page.$eval(inputSel, el => {
            const style = window.getComputedStyle(el);
            return style.display !== 'none' && style.visibility !== 'hidden' && el.offsetParent !== null;
        }).catch(() => false);

        if (!isVisible) {
            log(`ℹ️ Поле "${name}" скрыто, пропускаем проверку`);
            continue;
        }

        // Проверка лейбла (если есть)
        try {
            const labelEl = await page.$(`${inputSel} >> xpath=../../label`);
            if (labelEl) {
                const actualLabel = await labelEl.evaluate(el => el.textContent.trim());
                if (actualLabel !== label) {
                    log(`❌ Label для "${name}" не совпадает! Ожидали: "${label}", получили: "${actualLabel}"`);
                } else {
                    log(`✅ Label для "${name}" совпадает: "${label}"`);
                }
            }
        } catch {
            // Если лейбла нет, это не ошибка
        }

        // Проверка placeholder для обычных полей
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
    // Очищаем все поля
    for (const name of allFields) {
        const inputSel = `form#shipping input[name="${name}"]`;
        const inputExists = await page.$(inputSel) !== null;
        if (inputExists) {
            await page.fill(inputSel, '');
        }
    }
    
    await page.click('form#shipping button[type="submit"]');
    await page.waitForTimeout(800);

    let stillHere = await page.isVisible('form#shipping');
    if (stillHere) {
        log('✅ Форма осталась — валидация пустой формы работает');
    } else {
        log('❌ Форма исчезла — баг при отправке пустой формы');
        return; // Прерываем тест, если форма исчезла
    }

    // 4. Проверка валидации email
    const invalidEmails = ['test@', 'bad.email', '@domain.com', '.user@gmail.com', 'user.@gmail.com', 'us..er@gmail.com'];
    for (const bad of invalidEmails) {
        await page.fill('input[name="firstName"]', 'Test');
        await page.fill('input[name="lastName"]', 'Test');
        await page.fill('input[name="email"]', bad);
        await page.fill('input[name="phone"]', '123456');
        log(`🚫 Пробуем отправить с невалидным email: "${bad}"`);
        await page.click('form#shipping button[type="submit"]');
        await page.waitForTimeout(700);
        stillHere = await page.isVisible('form#shipping');
        if (stillHere) {
            log('✅ Форма осталась — невалидный email не пропущен');
        } else {
            log(`❌ Форма ушла — баг в валидации email: "${bad}"`);
            return;
        }
        await page.fill('input[name="email"]', '');
    }

    // 5. Заполняем форму валидными данными
    log('📝 Заполняем форму валидными данными...');
    
    // Заполняем поля из qualify
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
            // Обычный select
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
};