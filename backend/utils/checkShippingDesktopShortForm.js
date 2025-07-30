/**
 * Проверяет desktop short shipping форму на странице checkout (по конфику для страны)
 * @param {import('playwright').Page} page
 * @param {Function} log
 * @param {string} countryCode
 * @param {string} partner
 * @returns {Promise<void>}
 */
module.exports = async function checkShippingDesktopShortForm(page, log, countryCode, partner) {
    const fieldsConfig = require('./fieldLabelsConfig.js');
    const config = fieldsConfig[countryCode];


    const configMap = {
        shippingFirstName: 'firstName',
        shippingLastName:  'lastName',
        shippingEmail:     'email',
        shippingPhone:     'phone',
        shippingAddress:   'address',
        shippingZipCode:   'zipCode',
        shippingCity:      'city',
        shipping_state:    'state',
        shippingCountry:   'country'
    };
    const allFields = Object.keys(configMap);

    log(`🌐 Проверяем форму checkout на странице: ${page.url()}`);

    if (!config) {
        log(`⚠️ Нет настроек для страны "${countryCode}" — пропускаем проверку`);
        return;
    }

    let couponValue = null;
    const promoInput = await page.$('input#promo[value]');
    if (promoInput) {
        couponValue = await page.$eval('input#promo', el => el.value.trim());
        log(`🧾 На странице есть купон: "${couponValue}" (input#promo)`);
    } else {
        log('ℹ️ Купон не найден на странице (пропускаем проверку)');
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
    }

    log(`🌎 Проверяем лейблы и плейсхолдеры для формы checkout (${countryCode})`);

    for (const name of allFields) {
        const origName = configMap[name];
        if (!config[origName]) continue;
        const { label, placeholder, type } = config[origName];
        const isSelect = type === 'select';
        const inputSel = isSelect
            ? `form#checkout select[name="${name}"]`
            : `form#checkout input[name="${name}"]`;

        // Проверяем существование поля
        const element = await page.$(inputSel);
        if (!element) {
            log(`ℹ️ Поле "${name}" не найдено на форме`);
            continue;
        }



        if (isSelect && name === 'shippingCountry') {
            try {
                const selectedValue = await page.$eval(inputSel, el => el.value);
                if ((selectedValue || '').toLowerCase() === (countryCode || '').toLowerCase()) {
                    log(`✅ [${name}] выбрано правильное значение: "${selectedValue}"`);
                } else {
                    log(`❌ [${name}] выбрано неверное значение! Ожидали: "${countryCode}", получили: "${selectedValue}"`);
                }
            } catch {
                log(`❌ [${name}] не удалось получить выбранное значение`);
            }
        }

        // Проверяем видимость
        const isVisible = await element.evaluate(el => {
            const style = window.getComputedStyle(el);
            return style.display !== 'none' && style.visibility !== 'hidden' && el.offsetParent !== null;
        }).catch(() => false);

        if (!isVisible) {
            log(`ℹ️ Поле "${name}" скрыто, пропускаем проверку`);
            continue;
        }

        // --- Проверяем label ---
        try {
            let labelEl = null;
            const inputId = await element.evaluate(el => el.id || null).catch(() => null);
            if (inputId) {
                labelEl = await page.$(`label[for="${inputId}"]`);
            }
            if (!labelEl) {
                const formHolder = await page.$(`${inputSel} >> xpath=ancestor::*[contains(@class, "form-holder")]`);
                if (formHolder) {
                    labelEl = await formHolder.$('label');
                }
            }
            if (labelEl && label) {
                const actualLabel = await labelEl.evaluate(el => el.textContent.trim());
                if (actualLabel !== label) {
                    log(`❌ Label для "${name}" не совпадает! Ожидали: "${label}", получили: "${actualLabel}"`);
                } else {
                    log(`✅ Label для "${name}" совпадает: "${label}"`);
                }
            } else if (label) {
                log(`ℹ️ Label для "${name}" не найден, пропускаем проверку`);
            }
        } catch (e) {
            log(`ℹ️ Не удалось получить label для "${name}"`);
        }

        if (!isSelect && placeholder) {
            try {
                const actualPlaceholder = await element.evaluate(el => el.getAttribute('placeholder'));
                if (actualPlaceholder !== placeholder) {
                    log(`❌ Placeholder для "${name}" не совпадает! Ожидали: "${placeholder}", получили: "${actualPlaceholder}"`);
                } else {
                    log(`✅ Placeholder для "${name}" совпадает: "${placeholder}"`);
                }
            } catch {
                log(`ℹ️ Не удалось получить placeholder для "${name}"`);
            }

            // Проверка типа поля
            if (type) {
                try {
                    const actualType = await element.evaluate(el => el.getAttribute('type'));
                    if (actualType !== type) {
                        log(`❌ Type для "${name}" не совпадает! Ожидали: "${type}", получили: "${actualType}"`);
                    } else {
                        log(`✅ Type для "${name}" совпадает: "${type}"`);
                    }
                } catch {
                    log(`ℹ️ Не удалось получить type для "${name}"`);
                }
            }
        }

        if (isSelect && placeholder) {
            try {
                const optionText = await element.$eval('option', el => el.textContent.trim());
                if (optionText !== placeholder) {
                    log(`❌ [select ${name}]  Placeholder для state — ожидали "${placeholder}", получили: "${optionText}"`);
                } else {
                    log(`✅ [select ${name}] Placeholder для state: "${optionText}"`);
                }
            } catch {
                log(`ℹ️ Не удалось получить первый option для "${name}"`);
            }
        }
    }

    log('🚫 Пробуем отправить пустую форму...');
    for (const name of allFields) {
        const origName = configMap[name];
        if (!config[origName]) continue;
        const { type } = config[origName];
        const isSelect = type === 'select';
        const inputSel = isSelect
            ? `form#checkout select[name="${name}"]`
            : `form#checkout input[name="${name}"]`;
        const element = await page.$(inputSel);
        if (element && !isSelect) await element.fill('');
    }

    // Сабмит формы
    const submitSelectors = [
        'form#checkout button[type="submit"]',
        'form#checkout input[type="submit"]',
        '#checkout button[type="submit"]',
        '#checkout input[type="submit"]',
        '#checkout button',
        '#checkout input[type="submit"]'
    ];
    for (const sel of submitSelectors) {
        const btn = await page.$(sel);
        if (btn) {
            log(`🔘 Кликаем по "${sel}" для отправки формы`);
            await btn.click();
            break;
        }
    }
    await page.waitForTimeout(700);

    const skipValidationCheck = ['shippingCountry'];

    for (const name of allFields) {
        if (skipValidationCheck.includes(name)) continue;

        const origName = configMap[name];
        if (!config[origName]) continue;
        const { type } = config[origName];
        const isSelect = type === 'select';
        const inputSel = isSelect
            ? `form#checkout select[name="${name}"]`
            : `form#checkout input[name="${name}"]`;
        const element = await page.$(inputSel);
        if (!element) continue;

        const isVisible = await element.evaluate(el => {
            const style = window.getComputedStyle(el);
            return style.display !== 'none' && style.visibility !== 'hidden' && el.offsetParent !== null;
        }).catch(() => false);
        if (!isVisible) continue;

        const classList = await element.evaluate(el => el.className || '');
        if (classList.includes('error')) {
            log(`✅ [${name}] на невалидных данных есть класс .error (ОК)`);
        } else if (classList.includes('valid')) {
            log(`❌ [${name}] на невалидных данных есть класс .valid (Ошибка!)`);
        } else {
            log(`⚠️ [${name}] на невалидных данных нет классов .error/.valid (class="${classList}")`);
        }
    }


    if (config.email) {
        const emailInput = await page.$('form#checkout input[name="shippingEmail"]');
        if (emailInput) {
            const isVisible = await emailInput.evaluate(el => {
                const style = window.getComputedStyle(el);
                return style.display !== 'none' && style.visibility !== 'hidden' && el.offsetParent !== null;
            }).catch(() => false);

            if (isVisible) {
                const invalidEmails = [
                    'test@', 'bad.email', '@domain.com', '.user@gmail.com', 'user.@gmail.com', 'us..er@gmail.com'
                ];
                for (const bad of invalidEmails) {
                    if (config.firstName)
                        await page.fill('form#checkout input[name="shippingFirstName"]', 'Test');
                    if (config.firstName)
                        await page.fill('form#checkout input[name="shippingLastName"]', 'Test');
                    await page.fill('form#checkout input[name="shippingEmail"]', bad);
                    if (config.phone)
                        await page.fill('form#checkout input[name="shippingPhone"]', '123456');
                    log(`🚫 Пробуем отправить с невалидным email: "${bad}"`);
                    for (const sel of submitSelectors) {
                        const btn = await page.$(sel);
                        if (btn) {
                            await btn.click();
                            break;
                        }
                    }
                    await page.waitForTimeout(700);

                    const emailClass = await emailInput.evaluate(el => el.className || '');
                    if (emailClass.includes('error')) {
                        log(`✅ [shippingEmail] на невалидном email "${bad}" есть класс .error (ОК)`);
                    } else if (emailClass.includes('valid')) {
                        log(`❌ [shippingEmail] на невалидном email "${bad}" есть класс .valid (Ошибка!)`);
                    } else {
                        log(`⚠️ [shippingEmail] на невалидном email "${bad}" нет классов .error/.valid (class="${emailClass}")`);
                    }
                    await page.fill('form#checkout input[name="shippingEmail"]', '');
                }
            }
        }
    }


    log('📝 Заполняем форму валидными данными...');


    if (config.country) {
        const inputSel = `form#checkout select[name="shippingCountry"]`;
        const countryEl = await page.$(inputSel);
        if (countryEl) {
            const options = await page.$$eval(
                inputSel + ' option',
                opts => opts.filter(o => !o.disabled && o.value).map(o => o.value)
            );
            if (options.length > 0) {
                const countryVal = options[0];
                log(`🔽 Сначала выбираем страну: "${countryVal}"`);
                await page.selectOption(inputSel, countryVal);
                await page.$eval(inputSel, el => {
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                    el.dispatchEvent(new Event('change', { bubbles: true }));
                });

                log(`⏳ Ждём обновление селекта shipping_state...`);
                await page.waitForTimeout(500);
            }
        }
    }


    for (const name of allFields) {
        if (name === 'shippingCountry') continue; // уже выбрали выше

        const origName = configMap[name];
        if (!config[origName]) continue;
        const { type } = config[origName];
        const isSelect = type === 'select';

        const inputSel = isSelect
            ? `form#checkout select[name="${name}"]`
            : `form#checkout input[name="${name}"]`;

        const element = await page.$(inputSel);
        if (!element) continue;

        const isVisible = await element.evaluate(el => {
            const style = window.getComputedStyle(el);
            return style.display !== 'none' && style.visibility !== 'hidden' && el.offsetParent !== null;
        }).catch(() => false);
        if (!isVisible) continue;

        if (isSelect) {
            const options = await page.$$eval(
                inputSel + ' option',
                opts => opts.filter(o => !o.disabled && o.value).map(o => o.value)
            );

            if (options.length > 0) {
                const valueToSelect = options[0];
                log(`🔽 Выбираем "${valueToSelect}" в селекте ${name}`);
                await page.selectOption(inputSel, valueToSelect);
                await page.$eval(inputSel, el => {
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                    el.dispatchEvent(new Event('change', { bubbles: true }));
                });
            } else {
                log(`⚠️ Нет валидных значений в ${name}`);
            }
        } else {
            let val = 'Test';
            if (name.toLowerCase().includes('last')) val = 'Ivanov';
            if (name.toLowerCase().includes('email')) val = 'user1_2-3@subdomain.test.com';
            if (name.toLowerCase().includes('phone')) val = '8888888888';
            if (name.toLowerCase().includes('address')) val = 'Test Street 123';
            if (name.toLowerCase().includes('zip')) val = '12345';
            if (name.toLowerCase().includes('city')) val = 'Test City';
            await element.fill(val);
        }
    }



    log('🟢 Тест shippingDesktopShortForm завершён');
};
