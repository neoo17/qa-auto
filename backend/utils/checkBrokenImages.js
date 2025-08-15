/**
 * @param {import('playwright').Page} page
 * @param {Function} log
 * @param {Function} [sendTestInfo]
 */
module.exports = async function checkBrokenImages(page, log, sendTestInfo) {
    const pageUrl = page.url();
    log(`🔎 [BrokenImages] Начинаю проверку. Страница: ${pageUrl}`);

    const broken = [];
    const seenKeys = new Set();

    const pushUnique = (item) => {
        const k = `${item.type}|${item.url}|${item.status||''}|${item.error||''}|${item.message||''}`;
        if (!seenKeys.has(k)) { seenKeys.add(k); broken.push(item); }
    };


    page.on('response', async (response) => {
        try {
            if (!response.ok()) {
                const req = response.request();
                const url = response.url();
                const isImg = req.resourceType() === 'image' || /\.(png|jpe?g|gif|webp|svg|ico)(\?|$)/i.test(url) || url.toLowerCase().includes('favicon');
                if (isImg) {
                    pushUnique({
                        type: url.toLowerCase().includes('favicon') ? 'favicon-response' : 'image-response',
                        url,
                        status: response.status(),
                        statusText: response.statusText()
                    });
                }
            }
        } catch {}
    });

    page.on('requestfailed', (request) => {
        try {
            const url = request.url();
            const isImg = request.resourceType() === 'image' || /\.(png|jpe?g|gif|webp|svg|ico)(\?|$)/i.test(url) || url.toLowerCase().includes('favicon');
            if (isImg) {
                pushUnique({
                    type: url.toLowerCase().includes('favicon') ? 'favicon-requestfailed' : 'image-requestfailed',
                    url,
                    error: request.failure()?.errorText || 'request failed'
                });
            }
        } catch {}
    });

    page.on('console', (msg) => {
        try {
            const text = msg.text() || '';
            if (/Failed to load resource|net::/i.test(text)) {
                const m = text.match(/(https?:\/\/|\/)[^\s)"]+/g);
                const url = m ? m[m.length - 1] : undefined;
                if (url && (url.toLowerCase().includes('favicon') || url.match(/\.(png|jpe?g|gif|webp|svg|ico)(\?|$)/i))) {
                    pushUnique({ type: 'console', url, message: text });
                }
            }
        } catch {}
    });


    const toAbs = (href) => {
        try { return new URL(href, pageUrl).toString(); } catch { return href; }
    };


    const { imgUrls, iconUrls } = await page.evaluate(() => {
        const urls = new Set();


        document.querySelectorAll('img').forEach(img => {
            if (img.currentSrc) urls.add(img.currentSrc);
            else if (img.src) urls.add(img.src);

            const ss = img.getAttribute('srcset') || '';
            ss.split(',').forEach(part => {
                const u = part.trim().split(/\s+/)[0];
                if (u) urls.add(u);
            });
        });


        const iconSet = new Set();
        document.querySelectorAll('link[rel~="icon"], link[rel="shortcut icon"]').forEach(link => {
            const href = link.getAttribute('href') || '';
            if (href) iconSet.add(href);
        });

        return { imgUrls: Array.from(urls), iconUrls: Array.from(iconSet) };
    }).catch(() => ({ imgUrls: [], iconUrls: [] }));

    const candidates = [
        ...imgUrls,
        ...iconUrls
    ]
        .map(u => u && u.trim())
        .filter(Boolean)
        .filter(u => !u.startsWith('data:image'))
        .map(toAbs);


    const uniqueCandidates = Array.from(new Set(candidates));


    for (const url of uniqueCandidates) {
        try {

            const looksImage = /\.(png|jpe?g|gif|webp|svg|ico)(\?|$)/i.test(url) || url.toLowerCase().includes('favicon');
            if (!looksImage) continue;

            let res = await page.request.fetch(url, { method: 'HEAD' });
            if (res.status() === 405 || res.status() === 501) {

                res = await page.request.fetch(url, { method: 'GET', maxRedirects: 0 });
            }

            if (res.status() >= 400) {
                pushUnique({
                    type: url.toLowerCase().includes('favicon') ? 'favicon-active' : 'image-active',
                    url,
                    status: res.status(),
                    statusText: res.statusText()
                });
            }
        } catch (e) {
            pushUnique({
                type: url.toLowerCase().includes('favicon') ? 'favicon-active' : 'image-active',
                url,
                error: (e && e.message) || 'request error'
            });
        }
    }

    try { await page.waitForLoadState('networkidle', { timeout: 3000 }); } catch {}

    if (broken.length === 0) {
        log(`✅ [BrokenImages] Битых картинок не найдено. Страница: ${pageUrl}`);
        sendTestInfo && sendTestInfo({
            _section: 'BrokenImages',
            page: pageUrl,
            message: 'Битых картинок не найдено'
        });
        return [];
    }

    const pageName = pageUrl.split('?')[0].split('/').filter(Boolean).pop();


    const first = broken[0];
    const fileName = first.url ? first.url.split('/').pop() : '(нет имени)';

    let humanType = 'image';
    if (first.type.includes('favicon')) humanType = 'favicon';

    log(`❌ [BrokenImages] На странице "${pageName}" отсутствует ресурс "${fileName}" (тип: ${humanType}, код: ${first.status || first.error || '??'})`);

    sendTestInfo && sendTestInfo({
        _section: 'BrokenImages',
        page: pageUrl,
        message: `Отсутствует ресурс "${fileName}" (тип: ${humanType}) на странице "${pageName}"`
    });

    return broken;

};
