/**
 * Проверяет правильность пробелов перед спецсимволами в зависимости от локали
 * @param {import('playwright').Page} page
 * @param {Function} log
 * @param {string} countryCode
 */
module.exports = async function checkPunctuation(page, log, countryCode) {
    const localeRules = {
        fr: { needSpace: ['!', '?', ':', ';', '%'], message: 'должны быть пробелы' },
        ch_fr: { needSpace: ['!', '?', ':', ';', '%'], message: 'должны быть пробелы' },

        ca_fr: { needSpace: [], noSpace: ['!', '?', ':', ';', '%'], message: 'НЕ должны быть пробелы' },

        de: { needSpace: ['%'], message: 'должен быть пробел перед %' },
        ch_de: { needSpace: ['%'], message: 'должен быть пробел перед %' },
        se: { needSpace: ['%'], message: 'должен быть пробел перед %' },
        no: { needSpace: ['%'], message: 'должен быть пробел перед %' },
        fi: { needSpace: ['%'], message: 'должен быть пробел перед %' },
        is: { needSpace: ['%'], message: 'должен быть пробел перед %' }
    };

    const rules = localeRules[countryCode];
    if (!rules) {
        log(`ℹ️ Пропускаем проверку пробелов перед спецсимволами (локаль не требует проверки: ${countryCode})`);
        return;
    }

    log(`🔍 Проверяем пробелы перед спецсимволами для локали ${countryCode}...`);

    const textContent = await page.evaluate(() => {
        const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'SVG']);
        const textNodes = [];

        const isVis = (el) => {
            if (!el) return false;
            if (el.closest('noscript,script,style,template,svg')) return false;
            if (el.closest('[hidden], [aria-hidden="true"]')) return false;
            const cs = window.getComputedStyle(el);
            if (!cs) return false;
            if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return false;
            const rects = el.getClientRects ? el.getClientRects() : null;
            if (rects && rects.length === 0) return false;
            return true;
        };

        const isControlVisible = (ctrl) => {
            if (!ctrl) return false;
            const type = (ctrl.getAttribute && ctrl.getAttribute('type')) || '';
            if (type && type.toLowerCase() === 'hidden') return false;
            return isVis(ctrl);
        };

        const findAssociatedControls = (el) => {
            const controls = [];
            // If label -> use 'for' and nested controls
            const label = el.closest && el.closest('label');
            if (label) {
                const forId = label.getAttribute('for');
                if (forId) {
                    const byId = document.getElementById(forId);
                    if (byId) controls.push(byId);
                }
                label.querySelectorAll && controls.push(...label.querySelectorAll('input,select,textarea'));
            }
            // Common form containers
            if (controls.length === 0) {
                const container = el.closest && el.closest('form, .form, .form-group, .form__group, .field, .form-field, .input, .form-row, .control');
                if (container && container.querySelectorAll) {
                    controls.push(...container.querySelectorAll('input,select,textarea'));
                }
            }
            return controls;
        };

        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );

        let node;
        while (node = walker.nextNode()) {
            const el = node.parentElement;
            if (!el) continue;

            if (!node.textContent || !node.textContent.trim()) continue;

            if (SKIP_TAGS.has(el.tagName)) continue;
            if (el.closest('noscript,script,style,template,svg')) continue;

            if (!isVis(el)) continue;

            // Skip label-like texts when their associated controls are hidden
            const associated = findAssociatedControls(el);
            if (associated.length > 0) {
                const anyVisible = Array.from(associated).some(isControlVisible);
                if (!anyVisible) continue;
            }

            const t = node.textContent;
            if (/<[^>]+>/.test(t) || /=\s*["'][^"']*["']/.test(t)) continue;

            textNodes.push(t);
        }
        return textNodes;
    });

    let errors = [];

    textContent.forEach(text => {
        const skipTimerPattern = /\b\d{1,2}:\d{2}\b/;
        if (skipTimerPattern.test(text)) {
            return;
        }
        if (rules.needSpace && rules.needSpace.length > 0) {
            rules.needSpace.forEach(symbol => {
                const regex = new RegExp(`\\w[${symbol}]`, 'g');
                const matches = text.match(regex);
                if (matches) {
                    matches.forEach(match => {
                        errors.push({
                            symbol,
                            context: text.substring(
                                Math.max(0, text.indexOf(match) - 20),
                                Math.min(text.length, text.indexOf(match) + 20)
                            ).trim(),
                            type: 'missing'
                        });
                    });
                }
            });
        }

        if (rules.noSpace && rules.noSpace.length > 0) {
            rules.noSpace.forEach(symbol => {
                const regex = new RegExp(`\\s[${symbol}]`, 'g');
                const matches = text.match(regex);
                if (matches) {
                    matches.forEach(match => {
                        errors.push({
                            symbol,
                            context: text.substring(
                                Math.max(0, text.indexOf(match) - 20),
                                Math.min(text.length, text.indexOf(match) + 20)
                            ).trim(),
                            type: 'extra'
                        });
                    });
                }
            });
        }
    });

    if (errors.length === 0) {
        const symbolsList = rules.needSpace?.length > 0 ?
            rules.needSpace.join(', ') :
            rules.noSpace.join(', ');
        log(`✅ Все проверенные спецсимволы (${symbolsList}) соответствуют правилам локали ${countryCode}`);
    } else {

        const groupedErrors = {};
        errors.forEach(err => {
            if (!groupedErrors[err.symbol]) {
                groupedErrors[err.symbol] = [];
            }
            groupedErrors[err.symbol].push(err.context);
        });

        log(`❌ Найдено ${errors.length} ошибок с пробелами перед спецсимволами:`);

        Object.keys(groupedErrors).forEach(symbol => {
            const examples = groupedErrors[symbol].slice(0, 3);
            log(`❌ Символ "${symbol}" (${groupedErrors[symbol].length} ошибок):`);
            examples.forEach(ex => {
                log(`❌   - "${ex}"`);
            });
            if (groupedErrors[symbol].length > 3) {
                log(`❌   ... и еще ${groupedErrors[symbol].length - 3} примеров`);
            }
        });
    }
};
