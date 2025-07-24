const fetch = require('node-fetch');
const cheerio = require('cheerio');

async function fetchIsoRegionsFromWiki(countryCode) {
    const url = `https://en.wikipedia.org/wiki/ISO_3166-2:${countryCode.toUpperCase()}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Не удалось загрузить Wikipedia: ${res.statusText}`);
    const html = await res.text();
    const $ = cheerio.load(html);

    const regions = [];
    $('table.wikitable').each((tableIdx, table) => {
        $(table).find('tbody tr').each((i, row) => {
            const th = $(row).find('th');
            const tds = $(row).find('td');


            if (th.length && tds.length) {
                let codeText = th.text().trim();

                if (!codeText && th.find('span.monospaced').length) {
                    codeText = th.find('span.monospaced').text().trim();
                }

                if (codeText && codeText.startsWith(countryCode.toUpperCase() + '-')) {
                    let nameText = $(tds[0]).text().trim();
                    if (nameText.includes('[')) nameText = nameText.split('[')[0].trim();
                    regions.push({
                        code: codeText.split('-')[1],
                        fullCode: codeText,
                        name: nameText,
                    });
                }
            }


            else if (tds.length >= 2) {
                const codeText = tds.eq(0).text().trim();
                let nameText = tds.eq(1).text().trim();
                if (nameText.includes('[')) nameText = nameText.split('[')[0].trim();
                if (codeText && nameText && codeText.startsWith(countryCode.toUpperCase() + '-')) {
                    regions.push({
                        code: codeText.split('-')[1],
                        fullCode: codeText,
                        name: nameText,
                    });
                }
            }
        });
    });
    return regions;
}


function cleanLabel(label) {
    return label.replace(/\s*\((SCT|NIR|ENG|WLS)\)\s*$/i, '').trim();
}

module.exports = async function checkSelectOptionsISOAndNamesViaWiki(page, countryCode, log, selector = 'select[name="state"]') {
    const wikiUrl = `https://en.wikipedia.org/wiki/ISO_3166-2:${countryCode.toUpperCase()}`;
    log(`🌍 Парсим Wikipedia ISO 3166-2 для страны: ${countryCode}...`);
    let regions = [];
    try {
        regions = await fetchIsoRegionsFromWiki(countryCode);
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
            `✅ Все значения <code>option</code> в <b>${selector}</b> соответствуют официальным региональным кодам ISO 3166-2 для страны <b>${countryCode.toUpperCase()}</b>, полученным с <a href="${wikiUrl}" target="_blank">Wikipedia</a>.`
        );
    } else {
        log(
            `❌ Обнаружены значения <code>option</code> в <b>${selector}</b>, которые отсутствуют среди региональных кодов ISO 3166-2 (${countryCode.toUpperCase()}):<br><br>` +
            invalidValue.map(opt => `  - value: "${opt.value}" (label: "${opt.label}")`).join('<br>') +
            `<br><br>Сравнение выполнено с кодами регионов по <a href="${wikiUrl}" target="_blank">Wikipedia</a>`
        );
    }


    const validOptions = options.filter(opt =>
        allCodes.includes(opt.value)
    );
    const invalidLabels = validOptions.filter(opt => {
        const region = regions.find(r => r.code === opt.value || r.fullCode === opt.value);
        if (!region) return false;

        return cleanLabel(opt.label) !== region.name && cleanLabel(opt.label).toLowerCase() !== region.name.toLowerCase();
    });

    if (invalidLabels.length === 0) {
        log(
            `✅ Все названия регионов (label) в <b>${selector}</b> соответствуют официальным наименованиям из ISO 3166-2 для страны <b>${countryCode.toUpperCase()}</b> по данным <a href="${wikiUrl}" target="_blank">Wikipedia</a>.`
        );
    } else {
        log(
            `❌ Обнаружены названия регионов (label) в <b>${selector}</b>, не совпадающие с официальными ISO 3166-2 (${countryCode.toUpperCase()}):<br><br>` +
            invalidLabels.map(opt => {
                const region = regions.find(r => r.code === opt.value || r.fullCode === opt.value);
                return `  - label: "${opt.label}" (value: "${opt.value}") — официально: "${region ? region.name : '?'}"`;
            }).join('<br>') +
            `<br><br>Сравнение выполнено с официальными названиями из <a href="${wikiUrl}" target="_blank">Wikipedia</a>`
        );
    }
};
