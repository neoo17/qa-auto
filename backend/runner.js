    const playwright = require('playwright');
    const flows = {
        basic: require('./flows/basic'),
        mobileOnly: require('./flows/mobile-only-full'),
        auto: require('./flows/routerFlow')
    };
    const path = require('path')
    const fs = require('fs')

    function ensureDirSync(dir) {
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    }

    /**
     * @param {string} url
     * @param {function} log
     * @param {string} flow
     * @param {string} country
     * @param {object} [custom]
     * @param {string} browser
     * @param {string} device
     * @param {boolean} ninja
     * @param {string} version
     * @param {function} [sendPerf]
     * @param {function} [sendTestInfo]
     */
    async function runTest(
        url, log, flow = 'auto', country, custom = {}, browser = 'chromium', device = '', ninja = true, version = 'stable', sendPerf, sendTestInfo
    ) {
        log(`▶️ Запускаем: ${browser} ${version} | ${device || 'Desktop'} ${ninja ? 'ninja-mod' : ''}`);
        const type = browser || 'chromium';
        let context, browserInstance;
        const screenshotDir = path.join(__dirname, 'screenshots', `${Date.now()}-${Math.random().toString(36).slice(2)}`);
        ensureDirSync(screenshotDir);

        try {
            let launchOpts = { headless: ninja };
            if (type === 'chromium' && version === '120') launchOpts.executablePath = '/usr/bin/chromium-120';
            if (type === 'chromium' && version === '125') launchOpts.executablePath = '/usr/bin/chromium-125';
            browserInstance = await playwright[type].launch(launchOpts);

            if (device) {
                const { devices } = playwright;
                const deviceConfig = devices[device];
                if (!deviceConfig) throw new Error(`Не найден конфиг для девайса "${device}"`);

                context = await browserInstance.newContext({
                    ...deviceConfig,
                    viewport: deviceConfig.viewport,
                    screen: deviceConfig.viewport,
                });
            } else {
                context = await browserInstance.newContext();
            }
            const page = await context.newPage();

            page.on('pageerror', e => log('Page error: ' + e.message));
            page.on('console', msg => {
                if (msg.type() === 'error' && !msg.text().includes('429'))
                    log('Console error: ' + msg.text());
            });

            const flowFunc = flows[flow] || flows.auto;
            await flowFunc(page, log, context, url, country, custom, sendPerf, sendTestInfo, screenshotDir);
            log(`🖼️ Скриншоты будут лежать тут: /screenshots/${path.basename(screenshotDir)}/`);
        } catch (e) {
            log('❌ Ошибка: ' + (e.stack || e.message || e));
        } finally {
            if (browserInstance) await browserInstance.close();
        }
    }

    module.exports = { runTest };
