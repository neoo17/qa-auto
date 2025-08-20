/**
 * @param {import('playwright').Page} page
 * @param {Function} log
 * @param {Function} [sendTestInfo]
 */
module.exports = async function checkBrokenImages(page, log, sendTestInfo) {
    const pageUrl = page.url();
    log(`🔎 [BrokenResources] Начинаю проверку. Страница: ${pageUrl}`);

    const broken = [];
    const seenKeys = new Set();

    const pushUnique = (item) => {
        const k = `${item.type}|${item.url}|${item.status||''}|${item.error||''}|${item.message||''}`;
        if (!seenKeys.has(k)) { seenKeys.add(k); broken.push(item); }
    };

    const isImageUrl = (url) => /\.(png|jpe?g|gif|webp|svg|ico)(\?|$)/i.test(url);
    const isVideoUrl = (url) => /\.(mp4|webm|ogg)(\?|$)/i.test(url);
    const isFaviconUrl = (url) => url.toLowerCase().includes('favicon');
    const isMediaOrImageUrl = (url) => isImageUrl(url) || isVideoUrl(url) || isFaviconUrl(url);

    page.on('response', async (response) => {
        try {
            if (!response.ok()) {
                const req = response.request();
                const url = response.url();
                const rt = req.resourceType(); // 'image' | 'media' | ...
                const lookslike = rt === 'image' || rt === 'media' || isMediaOrImageUrl(url);
                if (lookslike) {
                    pushUnique({
                        type: isFaviconUrl(url)
                            ? 'favicon-response'
                            : isVideoUrl(url)
                                ? 'video-response'
                                : 'image-response',
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
            const rt = request.resourceType();
            const lookslike = rt === 'image' || rt === 'media' || isMediaOrImageUrl(url);
            if (lookslike) {
                pushUnique({
                    type: isFaviconUrl(url)
                        ? 'favicon-requestfailed'
                        : isVideoUrl(url)
                            ? 'video-requestfailed'
                            : 'image-requestfailed',
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
                // вытащим последнее, что похоже на URL
                const m = text.match(/(https?:\/\/|\/)[^\s)"]+/g);
                const url = m ? m[m.length - 1] : undefined;
                if (url && (isMediaOrImageUrl(url))) {
                    pushUnique({ type: isVideoUrl(url) ? 'video-console' : (isFaviconUrl(url) ? 'favicon-console' : 'image-console'), url, message: text });
                }
            }
        } catch {}
    });

    const toAbs = (href) => {
        try { return new URL(href, pageUrl).toString(); } catch { return href; }
    };

    // Собираем источники: <img>, srcset, favicons и видео (<video>, <source>)
    const { imgUrls, iconUrls, videoUrls } = await page.evaluate(() => {
        const imgSet = new Set();
        document.querySelectorAll('img').forEach(img => {
            if (img.currentSrc) imgSet.add(img.currentSrc);
            else if (img.src) imgSet.add(img.src);

            const ss = img.getAttribute('srcset') || '';
            ss.split(',').forEach(part => {
                const u = part.trim().split(/\s+/)[0];
                if (u) imgSet.add(u);
            });
        });

        const iconSet = new Set();
        document.querySelectorAll('link[rel~="icon"], link[rel="shortcut icon"]').forEach(link => {
            const href = link.getAttribute('href') || '';
            if (href) iconSet.add(href);
        });

        const videoSet = new Set();
        // <video src>
        document.querySelectorAll('video').forEach(v => {
            const src = v.getAttribute('src');
            if (src) videoSet.add(src);
            // <video><source src>
            v.querySelectorAll('source').forEach(s => {
                const u = s.getAttribute('src');
                if (u) videoSet.add(u);
            });
        });
        // На случай standalone <source> вне <video>
        document.querySelectorAll('source').forEach(s => {
            const u = s.getAttribute('src');
            if (u) videoSet.add(u);
        });

        return { imgUrls: Array.from(imgSet), iconUrls: Array.from(iconSet), videoUrls: Array.from(videoSet) };
    }).catch(() => ({ imgUrls: [], iconUrls: [], videoUrls: [] }));

    const candidates = [
        ...imgUrls,
        ...iconUrls,
        ...videoUrls
    ]
        .map(u => u && u.trim())
        .filter(Boolean)
        .filter(u => !u.startsWith('data:image') && !u.startsWith('data:video'))
        .map(toAbs);

    const uniqueCandidates = Array.from(new Set(candidates));

    for (const url of uniqueCandidates) {
        try {
            const looksResource = isMediaOrImageUrl(url);
            if (!looksResource) continue;

            let res = await page.request.fetch(url, { method: 'HEAD' });
            if (res.status() === 405 || res.status() === 501) {
                res = await page.request.fetch(url, { method: 'GET', maxRedirects: 0 });
            }

            if (res.status() >= 400) {
                pushUnique({
                    type: isFaviconUrl(url)
                        ? 'favicon-active'
                        : isVideoUrl(url)
                            ? 'video-active'
                            : 'image-active',
                    url,
                    status: res.status(),
                    statusText: res.statusText()
                });
            }
        } catch (e) {
            pushUnique({
                type: isFaviconUrl(url)
                    ? 'favicon-active'
                    : isVideoUrl(url)
                        ? 'video-active'
                        : 'image-active',
                url,
                error: (e && e.message) || 'request error'
            });
        }
    }

    try { await page.waitForLoadState('networkidle', { timeout: 3000 }); } catch {}

    if (broken.length === 0) {
        log(`✅ [BrokenResources] Битых ресурсов не найдено. Страница: ${pageUrl}`);
        sendTestInfo && sendTestInfo({
            _section: 'BrokenImages',
            page: pageUrl,
            message: 'Битых ресурсов не найдено'
        });
        return [];
    }

    const pageName = pageUrl.split('?')[0].split('/').filter(Boolean).pop();

    const first = broken[0];
    const fileName = first.url ? first.url.split('/').pop() : '(нет имени)';

    let humanType = 'image';
    if ((first.type || '').includes('favicon')) humanType = 'favicon';
    else if ((first.type || '').includes('video')) humanType = 'video';

    log(`❌ [BrokenResources] На странице "${pageName}" отсутствует ресурс "${fileName}" (тип: ${humanType}, код: ${first.status || first.error || '??'})`);

    sendTestInfo && sendTestInfo({
        _section: 'BrokenImages',
        page: pageUrl,
        message: `Отсутствует ресурс "${fileName}" (тип: ${humanType}) на странице "${pageName}"`
    });

    return broken;
};
