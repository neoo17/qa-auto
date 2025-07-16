/**
 * @param {import('playwright').Page} page
 * @param {Function} log
 * @param {string} countryCode
 */
module.exports = async function checkShippingForm(page, log, countryCode) {
    const fieldsConfig = require('./fieldLabelsConfig.js');
    const SHIPPING_FIELDS = ['address', 'zipCode', 'city', 'state', 'country']; // country — опционально

    log('📦 Проверяем наличие формы #shipping-mobile...');
    await page.waitForSelector('form#shipping-mobile', { timeout: 7000 });

    const countryShort = countryCode.split('_')[0].toUpperCase();

    if (SHIPPING_FIELDS.includes('country')) {
        log('🌍 Проверяем наличие и значение select country');
        const countrySelect = await page.$('form#shipping-mobile select[name="country"], form#shipping-mobile select#id_country');
        if (!countrySelect) {
            log('❌ Не найден select[name="country"] (или #id_country) в shipping-форме!');
        } else {
            const selectedValue = await page.$eval(
                'form#shipping-mobile select[name="country"], form#shipping-mobile select#id_country',
                el => el.value
            );
            if (selectedValue !== countryShort) {
                log(`❌ В select страны выбрано "${selectedValue}", ожидалось "${countryShort}"`);
            } else {
                log(`✅ В select страны выбрано верное значение: "${selectedValue}"`);
            }
            const options = await page.$$eval(
                'form#shipping-mobile select[name="country"] option, form#shipping-mobile select#id_country option',
                opts => opts.map(o => o.value)
            );
            if (!options.includes(countryShort)) {
                log(`❌ Нет опции с value="${countryShort}" в select страны!`);
            } else {
                log(`✅ В select страны есть опция с value="${countryShort}"`);
            }
        }
    }

    log(`🌎 Проверяем лейблы и плейсхолдеры shipping для ${countryCode}`);
    const config = fieldsConfig[countryCode];
    if (!config) {
        log(`⚠️ Нет настроек для страны "${countryCode}" — пропускаем проверку`);
    } else {
        for (const name of SHIPPING_FIELDS) {
            if (!config[name]) continue;
            const { label, placeholder, type } = config[name];
            const isSelect = type === 'select';
            const inputSel = isSelect
                ? `form#shipping-mobile select[name="${name}"]`
                : `form#shipping-mobile input[name="${name}"]`;

            const isVisible = await page.$eval(inputSel, el => {
                const style = window.getComputedStyle(el);
                return style.display !== 'none' && style.visibility !== 'hidden' && el.offsetParent !== null;
            }).catch(() => false);

            if (!isVisible) {
                log(`ℹ️ Поле "${name}" скрыто, пропускаем проверку лейбла/плейсхолдеров/типа`);
                continue;
            }

            if (isSelect && placeholder) {
                let optionText = null;
                try {
                    optionText = await page.$eval(`${inputSel} option`, el => el.textContent.trim());
                } catch {
                    optionText = null;
                }
                if (optionText !== placeholder) {
                    log(`❌ [select ${name}] Первый option (placeholder) — ожидали "${placeholder}", получили "${optionText}"`);
                } else {
                    log(`✅ [select ${name}] Первый option совпадает: "${optionText}"`);
                }
            }

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

            if (!isSelect) {
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
            }

            if (!isSelect) {
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
    }

    log('🚫 Пробуем отправить полностью пустую shipping форму...');
    await page.click('form#shipping-mobile button[type="submit"]');
    await page.waitForTimeout(800);
    let stillHere = await page.isVisible('form#shipping-mobile');
    if (stillHere) {
        log('✅ Shipping форма осталась — валидация пустых полей работает (required)');
    } else {
        log('❌ Shipping форма исчезла — баг при отправке пустой shipping формы');
    }

    log('🚀 Отправляю shipping форму с заполненными полями');
    for (const name of SHIPPING_FIELDS) {
        if (!config[name]) continue;
        const { type } = config[name];
        const isSelect = type === 'select';
        const inputSel = isSelect
            ? `form#shipping-mobile select[name="${name}"]`
            : `form#shipping-mobile input[name="${name}"]`;

        const isVisible = await page.$eval(inputSel, el => {
            const style = window.getComputedStyle(el);
            return style.display !== 'none' && style.visibility !== 'hidden' && el.offsetParent !== null;
        }).catch(() => false);

        if (!isVisible) continue;

        if (isSelect && name === 'state') {
            // --- КАСТОМНЫЙ SELECT (dropdown) ---
            const customDropdownSelect = await page.$('form#shipping-mobile .dropdown .dropdown-select');
            if (customDropdownSelect) {
                log('⚡️ [state] Кастомный select (dropdown), выбираем штат через .dropdown-menu-item');
                await customDropdownSelect.click();
                await page.waitForSelector('form#shipping-mobile .dropdown-menu', { timeout: 2000 }).catch(() => {});
                const states = await page.$$eval('form#shipping-mobile .dropdown-menu-item', items =>
                    items.map(el => ({
                        value: el.getAttribute('data-value'),
                        text: el.textContent,
                        isSelect: el.classList.contains('is-select'),
                        style: getComputedStyle(el).display
                    }))
                );
                const visibleStates = states.filter(s => s.style !== 'none');
                const toPick = visibleStates.find(s => !s.isSelect && s.value);
                if (toPick) {
                    await page.click(`form#shipping-mobile .dropdown-menu-item[data-value="${toPick.value}"]`);
                    log(`✅ [state] Кликнули по кастомному штату: ${toPick.text}`);
                } else {
                    log('❌ [state] Не нашли доступный штат для выбора в кастомном dropdown!');
                }
            } else {
                // --- ОБЫЧНЫЙ SELECT ---
                log('🟢 [state] Обычный select, выбираем штат через .selectOption');
                const stateOptions = await page.$$eval(inputSel + ' option', opts => opts.map(o => o.value).filter(Boolean));
                if (stateOptions.length >= 2) {
                    await page.selectOption(inputSel, stateOptions[1]);
                    log(`✅ [state] Выбрали штат "${stateOptions[1]}" в обычном select`);
                } else {
                    log('❌ [state] Недостаточно опций для выбора в обычном select!');
                }
            }
        } else if (isSelect) {
            // Любой другой селект
            const options = await page.$$eval(inputSel + ' option', opts => opts.map(o => o.value).filter(Boolean));
            if (options.length >= 2) {
                await page.selectOption(inputSel, options[1]);
            }
        } else {
            await page.fill(inputSel, 'test');
        }
    }

    log('🟢 Тест shipping формы завершён');
};
