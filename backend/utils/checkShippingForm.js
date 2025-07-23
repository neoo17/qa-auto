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


            if (isSelect && name === 'country') {
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

            const customDropdownSelect = await page.$('form#shipping-mobile .dropdown .dropdown-select');
            if (customDropdownSelect) {
                log('⚡️ [state] Кастомный select (dropdown), выбираем штат через .dropdown-menu-item');
                await customDropdownSelect.click();
                await page.waitForSelector('form#shipping-mobile .dropdown-menu', { timeout: 2500 });
                await page.waitForTimeout(200);
                const toPick = await page.$('form#shipping-mobile .dropdown-menu-item:not(.is-select)[data-value]');
                if (toPick) {
                    const value = await toPick.getAttribute('data-value');
                    const text = await toPick.evaluate(el => el.textContent.trim());
                    await toPick.click();
                    log(`✅ [state] Кликнули по кастомному штату: ${text}`);
                } else {
                    log('❌ [state] Не нашли доступный штат для выбора в кастомном dropdown!');
                }
            } else {
                // Обычный select
                log('🟢 [state] Обычный select, выбираем штат через .selectOption');
                const stateOptions = await page.$$eval(inputSel + ' option', opts => opts.map(o => o.value).filter(Boolean));
                if (stateOptions.length >= 1) {
                    await page.selectOption(inputSel, stateOptions[0]);
                    await page.$eval(inputSel, el => {
                        el.dispatchEvent(new Event('change', { bubbles: true }));
                    });
                    const currentValue = await page.$eval(inputSel, el => el.value);
                    log(`✅ [state] Выбрали штат "${stateOptions[0]}" в обычном select`);
                } else {
                    log('❌ [state] Нет доступных опций для выбора в обычном select!');
                }
            }
        } else if (isSelect) {
            continue;
        } else {
            await page.fill(inputSel, 'test');
        }
    }

    log('🟢 Тест shipping формы завершён');
};
