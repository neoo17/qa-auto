/**
 * Проверяет правильность пробелов перед спецсимволами в зависимости от локали
 * @param {import('playwright').Page} page
 * @param {Function} log
 * @param {string} countryCode
 */
module.exports = async function checkPunctuation(page, log, countryCode) {
    // Определяем правила для разных локалей
    const localeRules = {
        // Французские локали (кроме CA_FR) - должны быть пробелы перед ! ? : ; %
        fr: { needSpace: ['!', '?', ':', ';', '%'], message: 'должны быть пробелы' },
        ch_fr: { needSpace: ['!', '?', ':', ';', '%'], message: 'должны быть пробелы' },
        
        // Канадская французская локаль - НЕ должны быть пробелы перед ! ? : ; %
        ca_fr: { needSpace: [], noSpace: ['!', '?', ':', ';', '%'], message: 'НЕ должны быть пробелы' },
        
        // Германские и скандинавские локали - должны быть пробелы только перед %
        de: { needSpace: ['%'], message: 'должен быть пробел перед %' },
        ch_de: { needSpace: ['%'], message: 'должен быть пробел перед %' },
        se: { needSpace: ['%'], message: 'должен быть пробел перед %' },
        no: { needSpace: ['%'], message: 'должен быть пробел перед %' },
        fi: { needSpace: ['%'], message: 'должен быть пробел перед %' },
        is: { needSpace: ['%'], message: 'должен быть пробел перед %' }
    };
    
    // Проверяем, нужно ли проверять текущую локаль
    const rules = localeRules[countryCode];
    if (!rules) {
        log(`ℹ️ Пропускаем проверку пробелов перед спецсимволами (локаль не требует проверки: ${countryCode})`);
        return;
    }

    log(`🔍 Проверяем пробелы перед спецсимволами для локали ${countryCode}...`);
    
    // Получаем весь текст со страницы
    const textContent = await page.evaluate(() => {
        // Получаем все текстовые узлы на странице
        const textNodes = [];
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );
        
        let node;
        while (node = walker.nextNode()) {
            // Пропускаем пустые текстовые узлы и скрипты
            if (node.textContent.trim() && 
                !['SCRIPT', 'STYLE'].includes(node.parentElement.tagName)) {
                textNodes.push(node.textContent);
            }
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
        
        // Проверка на наличие пробелов (когда их не должно быть)
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

    // Выводим результаты
    if (errors.length === 0) {
        const symbolsList = rules.needSpace?.length > 0 ? 
            rules.needSpace.join(', ') : 
            rules.noSpace.join(', ');
        log(`✅ Все проверенные спецсимволы (${symbolsList}) соответствуют правилам локали ${countryCode}`);
    } else {
        // Группируем ошибки по символам для более компактного вывода
        const groupedErrors = {};
        errors.forEach(err => {
            if (!groupedErrors[err.symbol]) {
                groupedErrors[err.symbol] = [];
            }
            groupedErrors[err.symbol].push(err.context);
        });
        
        // Выводим ошибки в формате, который будет отображаться в финальном логе ошибок
        log(`❌ Найдено ${errors.length} ошибок с пробелами перед спецсимволами:`);
        
        // Выводим до 3 примеров для каждого символа
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