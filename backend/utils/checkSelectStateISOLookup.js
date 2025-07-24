const fetch = require('node-fetch');
const cheerio = require('cheerio');

function extractCountryAndLang(rawCode) {
    if (!rawCode) return { country: '', lang: 'en' };
    const [country, lang] = rawCode.split('_');
    return {
        country: country.toLowerCase(),
        lang: lang ? lang.toLowerCase() : 'en'
    };
}

async function fetchIsoRegionsFromWiki(countryCode, lang = 'en') {
    const url = `https://${lang}.wikipedia.org/wiki/ISO_3166-2:${countryCode.toUpperCase()}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Не удалось загрузить Wikipedia (${lang}): ${res.statusText}`);
    const html = await res.text();
    const $ = cheerio.load(html);

    const regions = [];
    $('table.wikitable').each((tableIdx, table) => {
        $(table).find('tbody tr').each((i, row) => {
            const tds = $(row).find('td');
            if (tds.length < 2) return;

            let codeText = null;
            let nameText = null;

            for (let idx = 0; idx < 2; idx++) {
                const cellText = tds.eq(idx).text().trim();
                if (cellText.startsWith(countryCode.toUpperCase() + '-')) {
                    codeText = cellText;
                    // ИСПОЛЬЗУЙ ЭТУ ЛОГИКУ:
                    nameText = null;
                    const allLinks = tds.eq(1 - idx).find('a').toArray();
                    for (const a of allLinks) {
                        const $a = $(a);
                        if ($a.find('img').length) continue;
                        const style = $a.attr('style');
                        if (style && /display\s*:\s*none/.test(style)) continue;
                        const txt = $a.text().trim();
                        if (txt) {
                            nameText = txt;
                            break;
                        }
                    }
                    if (!nameText) nameText = tds.eq(1 - idx).text().trim();
                    break;
                }
            }


            if (codeText && nameText) {
                regions.push({
                    code: codeText.split('-')[1],
                    fullCode: codeText,
                    name: nameText,
                });
            }
        });
    });
    return regions;
}



function cleanLabel(label) {
    return label.replace(/\s*\((SCT|NIR|ENG|WLS)\)\s*$/i, '').trim();
}
function cleanRegionName(name) {
    // Убирает язык в скобках (de), (fr), (it), (rm), (en), (gsw) и др.
    return name.replace(/\s*\(([a-z]{2,4})\)\s*$/i, '').trim();
}

module.exports = async function checkSelectOptionsISOAndNamesViaWiki(page, rawCountryCode, log, selector = 'select[name="state"]') {
    const { country, lang } = extractCountryAndLang(rawCountryCode);

    const wikiUrl = `https://${lang}.wikipedia.org/wiki/ISO_3166-2:${country.toUpperCase()}`;
    log(`🌍 Парсим Wikipedia ISO 3166-2 для страны: ${country}, язык: ${lang}...`);
    let regions = [];
    try {
        regions = await fetchIsoRegionsFromWiki(country, lang);
    } catch (e) {
        log(`❌ Не удалось получить регионы с Wikipedia: ${e.message}`);
        return;
    }
    if (!regions.length) {
        log(`❌ Нет подходящих регионов на Wikipedia: ${wikiUrl}`);
        return;
    }

    const allCodes = regions.map(r => r.code).concat(regions.map(r => r.fullCode));

    const options = await page.$$eval(`${selector} option`, opts =>
        opts.filter(opt => opt.value).map(opt => ({
            value: opt.value,
            label: opt.textContent.trim(),
        }))
    );

    const invalidValue = options.filter(opt =>
        !allCodes.includes(opt.value)
    );

    if (invalidValue.length === 0) {
        log(
            `✅ Все значения <code>option</code> в <b>${selector}</b> соответствуют официальным региональным кодам ISO 3166-2 для страны <b>${country.toUpperCase()}</b>, полученным с <a href="${wikiUrl}" target="_blank">Wikipedia</a>.`
        );
    } else {
        log(
            `❌ Обнаружены значения <code>option</code> в <b>${selector}</b>, которые отсутствуют среди региональных кодов ISO 3166-2 (${country.toUpperCase()}):<br><br>` +
            invalidValue.map(opt => `  - value: "${opt.value}" (label: "${opt.label}")`).join('<br>') +
            `<br><br>Сравнение выполнено с кодами регионов по <a href="${wikiUrl}" target="_blank">Wikipedia</a>`
        );
    }

    const validOptions = options.filter(opt =>
        allCodes.includes(opt.value)
    );
    function normalizeName(str) {
        return (str || '')
            .trim()
            .toLowerCase()
            .replace(/\s+/g, ' ')
            .normalize('NFKC');
    }

    const invalidLabels = validOptions.filter(opt => {
        const region = regions.find(r => r.code === opt.value || r.fullCode === opt.value);
        if (!region) return false;

        const labelNorm = normalizeName(cleanLabel(opt.label));
        const regionNorm = normalizeName(cleanRegionName(region.name));

        if (labelNorm !== regionNorm) {
            console.log(`❌ НЕ совпало: "${opt.label}" vs "${region.name}" | [${labelNorm}] vs [${regionNorm}]`);
            return true;
        }
        return false;
    });


    if (invalidLabels.length === 0) {
        log(
            `✅ Все названия регионов (label) в <b>${selector}</b> соответствуют официальным наименованиям из ISO 3166-2 для страны <b>${country.toUpperCase()}</b> по данным <a href="${wikiUrl}" target="_blank">Wikipedia</a>.`
        );
    } else {
        log(
            `❌ Обнаружены названия регионов (label) в <b>${selector}</b>, не совпадающие с официальными ISO 3166-2 (${country.toUpperCase()}):<br><br>` +
            invalidLabels.map(opt => {
                const region = regions.find(r => r.code === opt.value || r.fullCode === opt.value);
                return `  - label: "${opt.label}" (value: "${opt.value}") — официально: "${region ? region.name : '?'}"`;
            }).join('<br>') +
            `<br><br>Сравнение выполнено с официальными названиями из <a href="${wikiUrl}" target="_blank">Wikipedia</a>`
        );
    }
};
