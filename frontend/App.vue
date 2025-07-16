<template>
  <div class="qa-container">
    <div class="qa-header">
      <h1>Женя-Боря v2.0</h1>
      <div class="qa-controls">
        <button @click="addTest" :disabled="tests.length >= 10">
          <span class="icon">➕</span> Добавить поток
        </button>
        <button @click="runAll" :disabled="tests.some(t => t.loading || !t.url)">
          <span class="icon">🚀</span> Запустить все
        </button>
        <label class="ninja-mod-label">
          <input type="checkbox" v-model="ninjaMod" />
          <span>ninja-mod <span class="ninja-desc">(без визуального окна)</span></span>
        </label>
      </div>
    </div>

    <div class="global-config-card">
      <div class="global-config-title">
        <span class="icon" style="font-size:20px; margin-right:8px;">⚙️</span>
        <span>Глобальные настройки</span>
      </div>
      <div class="global-config-fields one-row">
        <select v-model="globalConfig.selectedFlow" @change="syncGlobalToTests">
          <option v-for="flow in flows" :key="flow.value" :value="flow.value">{{ flow.label }}</option>
        </select>
        <select v-model="globalConfig.selectedCheckType" @change="syncGlobalToTests">
          <option v-for="opt in checkTypeList" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </option>
        </select>
        <select v-model="globalConfig.selectedPartner" @change="syncGlobalToTests">
          <option v-for="opt in partnersList" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </option>
        </select>

        <multiselect
            :key="globalConfig.selectedCountry?.value"
            v-model="globalConfig.selectedCountry"
            :options="countryOptions"
            @input="() => { (tests.value || []).forEach(t => t.countryAuto = false) }"
            placeholder="Выберите страну"
            label="label"
            track-by="value"
            :allow-empty="false"
            :disabled="false"
        >
          <template #option="{ option }">
            <img v-for="flag in option.flags" :src="flag" :key="flag" style="width:22px;margin-right:5px" />
            <span>{{ option.label }}</span>
          </template>
          <template #singleLabel="{ option }">
            <img v-for="flag in option.flags" :src="flag" :key="flag" style="width:22px;margin-right:5px" />
            <span>{{ option.label }}</span>
          </template>
        </multiselect>



        <select v-model="globalConfig.selected3ds" @change="syncGlobalToTests">
          <option v-for="opt in getThreeDsOptions(globalConfig.selectedPartner)" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </option>
        </select>


      </div>
      <div style="    display: flex
;
    gap: 13px;
    align-items: center;
    flex-wrap: nowrap; margin-top: 15px">

        <select v-model="globalConfig.selectedDevice" @change="syncGlobalToTests">
          <option v-for="d in devicesList" :value="d.value" :key="d.value">{{ d.label }}</option>
        </select>
        <select v-model="globalConfig.selectedBrowser" @change="syncGlobalToTests">
          <option v-for="b in filteredBrowsers(globalConfig.selectedDevice)" :value="b.value" :key="b.value">{{ b.label }}</option>
        </select>
        <select v-if="filteredBrowserVersions(globalConfig.selectedDevice, globalConfig.selectedBrowser).length > 1"
                v-model="globalConfig.selectedVersion" @change="syncGlobalToTests">
          <option v-for="v in filteredBrowserVersions(globalConfig.selectedDevice, globalConfig.selectedBrowser)" :value="v" :key="v">
            {{ versionLabel(globalConfig.selectedBrowser, v) }}
          </option>
        </select>
      </div>
    </div>

    <div class="qa-multi-row" v-for="(test, idx) in tests" :key="test.id">
      <fieldset>
        <legend>Тест #{{ idx + 1 }}</legend>
        <div class="test-bar">
          <input v-model="test.url" type="text" placeholder="URL для теста" />
          <input class="custom-param-input" v-model="test.customParam" placeholder="Кастомный параметр" />
          <button :disabled="test.loading" @click="() => runTest(idx)" class="test-btn">▶️</button>
          <button @click="removeTest(idx)" class="test-remove">✖</button>
          <button type="button" class="dropdown-toggle onlyicon" @click="test.showConfig = !test.showConfig">
            <span class="icon" style="font-size:18px;">⚙️</span>
          </button>
        </div>

        <transition name="fade">
          <div v-if="test.showConfig" class="per-test-config-outer">
            <label class="per-test-checkbox">
              <input type="checkbox" v-model="test.useCustomConfig" @change="toggleCustomConfig(test)" />
              Использовать отдельные настройки для этого теста
            </label>
            <div v-if="test.useCustomConfig" class="per-test-settings-block">
              <div class="per-test-setting">
                <span>Флоу:</span>
                <select v-model="test.selectedFlow">
                  <option v-for="flow in flows" :key="flow.value" :value="flow.value">{{ flow.label }}</option>
                </select>
              </div>
              <div class="per-test-setting">
                <span>Партнёр:</span>
                <select v-model="test.selectedPartner">
                  <option v-for="opt in partnersList" :key="opt.value" :value="opt.value">
                    {{ opt.label }}
                  </option>
                </select>
              </div>
              <div class="per-test-setting">
                <span>Тип проверки:</span>
                <select v-model="test.selectedCheckType">
                  <option v-for="opt in checkTypeList" :key="opt.value" :value="opt.value">
                    {{ opt.label }}
                  </option>
                </select>
              </div>
              <div class="per-test-setting">
                <span>Страна:</span>
                <multiselect
                    :key="test.selectedCountry?.value"
                    v-model="test.selectedCountry"
                    :options="countryOptions"
                    @input="() => { test.countryAuto = false }"
                    placeholder="Выберите страну"
                    label="label"
                    track-by="value"
                    :allow-empty="false"
                    :disabled="false"
                >
                  <template #option="{ option }">
                    <img   v-for="flag in (option.flags || [])"
                           :src="flag"
                           :key="flag"
                           style="width:22px;margin-right:5px" />
                    <span>{{ option.label }}</span>
                  </template>
                  <template #singleLabel="{ option }">
                    <img   v-for="flag in (option.flags || [])"
                           :src="flag"
                           :key="flag"
                           style="width:22px;margin-right:5px" />
                    <span>{{ option.label }}</span>
                  </template>
                </multiselect>

              </div>

              <div class="per-test-setting">
                <span>3DS:</span>
                <select v-model="test.selected3ds">
                  <option v-for="opt in getThreeDsOptions(test.selectedPartner)" :key="opt.value" :value="opt.value">
                    {{ opt.label }}
                  </option>
                </select>
              </div>
              <div class="per-test-setting">
                <span>Девайс:</span>
                <select v-model="test.selectedDevice">
                  <option v-for="d in devicesList" :value="d.value" :key="d.value">{{ d.label }}</option>
                </select>
              </div>
              <div class="per-test-setting">
                <span>Браузер:</span>
                <select v-model="test.selectedBrowser">
                  <option v-for="b in filteredBrowsers(test.selectedDevice)" :value="b.value" :key="b.value">{{ b.label }}</option>
                </select>
              </div>
              <div class="per-test-setting" v-if="filteredBrowserVersions(test.selectedDevice, test.selectedBrowser).length > 1">
                <span>Версия:</span>
                <select v-model="test.selectedVersion">
                  <option v-for="v in filteredBrowserVersions(test.selectedDevice, test.selectedBrowser)" :value="v" :key="v">
                    {{ versionLabel(test.selectedBrowser, v) }}
                  </option>
                </select>
              </div>
            </div>
          </div>
        </transition>

        <pre v-if="test.logs.length"
             :ref="el => setLogRef(test.id, el)"
             class="log-block">
  <div v-for="(log, i) in test.logs" :key="i" v-html="highlightLog(log)"></div>
</pre>

        <!-- ℹ️ Информация о тесте -->
        <div v-if="test.testInfo && test.testInfo.length" class="info-toggle-box" :class="{opened: !test.testInfoCollapsed}">
          <div class="info-toggle-title" @click="test.testInfoCollapsed = !test.testInfoCollapsed">
            <span>ℹ️ Информация о тесте</span>
            <span class="arrow">{{ test.testInfoCollapsed ? '▼' : '▲' }}</span>
          </div>
          <transition name="fade">
            <div v-show="!test.testInfoCollapsed" class="info-report">
              <div v-for="(info, n) in test.testInfo" :key="n" class="info-row">
                <template v-if="typeof info === 'object' && info.package">
                  <div>
                    <b>{{ info.message || info.error }}</b>
                    <ul>
                      <li>Название: {{ info.package.templates?.title }}</li>
                      <li>SKU: {{ info.package.sku }}</li>
                      <li>Количество: {{ info.package.quantity }}</li>
                      <li>Цена: ${{ info.package.price }}</li>
                      <li>Полная цена: ${{ info.package.fullprice }}</li>
                      <li>Retail: ${{ info.package.templates?.retail }}</li>
                    </ul>
                  </div>
                </template>
                <template v-else-if="info._section === 'POST ajax/order'">
                  <div>
                    <b>POST ajax/order</b>
                    <pre>{{ JSON.stringify(info.data, null, 2) }}</pre>
                  </div>
                </template>
                <template v-else-if="info._section === 'Checkout POST ajax/order'">
                  <div>
                    <b>Checkout POST ajax/order</b>
                    <pre>{{ JSON.stringify(info.data, null, 2) }}</pre>
                  </div>
                </template>
                <template v-else>
                  {{ info }}
                </template>
              </div>
            </div>
          </transition>
        </div>

        <!-- 🖼️ Скриншоты -->
        <div v-if="screenshotsByTest[test.id]?.length"
             class="screenshots-toggle-box"
             :class="{opened: !test.screenshotsCollapsed}"
        >
          <div class="screenshots-toggle-title" @click="test.screenshotsCollapsed = !test.screenshotsCollapsed">
            <span>🖼️ Скриншоты</span>
            <span class="arrow">{{ test.screenshotsCollapsed ? '▼' : '▲' }}</span>
          </div>
          <transition name="fade">
            <div v-show="!test.screenshotsCollapsed" class="screenshots-block">
              <div class="screenshots-thumbs">
                <div v-for="(shot, i) in screenshotsByTest[test.id]"
                     :key="shot.name"
                     class="screenshot-thumb"
                     @click="openScreenshotModal(idx, i)"
                >
                  <img :src="shot.url" :alt="shot.name" />
                  <div class="screenshot-label">{{ shot.name }}</div>
                </div>
              </div>
            </div>
          </transition>
        </div>

        <!-- 📊 Размеры страниц/изображений -->
        <div v-if="test.pageWeights && test.pageWeights.length" class="perf-toggle-box" :class="{opened: !test.perfCollapsed}">
          <div class="perf-toggle-title" @click="test.perfCollapsed = !test.perfCollapsed">
            <span>📊 Размеры страниц/изображений</span>
            <span class="arrow">{{ test.perfCollapsed ? '▼' : '▲' }}</span>
          </div>
          <transition name="fade">
            <div v-show="!test.perfCollapsed">
              <div class="perf-report">
                <div v-for="pw in test.pageWeights" :key="pw.page" class="perf-page-block">
                  <div :class="['perf-page-row', heavyClass(pw)]">
                    <span class="perf-title">{{ pageLabel(pw.page) }}</span>
                    <span>Страница: <b>{{ (pw.transferred/1024).toFixed(1) }} кБ</b></span>
                    <span v-if="heavyImages(pw).length">
                      | Картинок >{{IMG_HEAVY_LIMIT/1024}}кБ: <b style="color:#d62b2b">{{ heavyImages(pw).length }}</b>
                    </span>
                  </div>
                  <div v-if="heavyImages(pw).length" class="perf-heavy-imgs">
                    <div
                        v-for="img in heavyImages(pw)"
                        :key="img.url"
                        class="perf-heavy-img"
                        :title="img.url"
                    >
                      🖼 <span>{{ shortUrl(img.url) }}</span>
                      <b>{{ (img.transferred/1024).toFixed(1) }} кБ</b>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </transition>
        </div>

        <!-- Ошибки -->
        <div v-if="test.errors.length && test.testEnded" class="error-report">
          <h2>🛑 Проблем: {{ test.errors.length }}</h2>
          <ul>
            <li v-for="(err, i) in test.errors" :key="i" v-html="highlightError(err)"></li>
          </ul>
        </div>
      </fieldset>
    </div>
    <!-- FAQ -->
    <div class="custom-param-info-wide">
      <div class="custom-param-header" @click="showParamInfo = !showParamInfo">
        <span>❓ FAQ</span>
        <span class="arrow">{{ showParamInfo ? '▲' : '▼' }}</span>
      </div>
      <transition name="fade">
        <div v-show="showParamInfo" class="custom-param-content">
          <p>
            <b>Формат:</b> <code>ПАКЕТ-АПСЕЙЛ1-АПСЕЙЛ2-...</code> <br>
            Например: <code>2-1-0-1</code>
          </p>
          <ul>
            <li>
              <b>Первая цифра</b> — номер пакета, который будет выбран на странице выбора. Например, <code>2</code> — выбрать второй пакет (<code>data-order-type="2"</code>).
            </li>
            <li>
              <b>Дальше идут цифры для каждого апсейла:</b>
              <ul>
                <li>
                  <code>1</code> — <span style="color:#2abf2a;font-weight:600">Покупаем</span> апсейл ("Yes")
                </li>
                <li>
                  <code>0</code> — <span style="color:#c82d2d;font-weight:600">Отклоняем</span> апсейл ("No")
                </li>
              </ul>
            </li>
            <li>
              <b>Пример:</b> <code>3-1-0-1</code>
              <ul>
                <li>Выбрать <b>3-й пакет</b></li>
                <li><b>1-й апсейл</b>: купить</li>
                <li><b>2-й апсейл</b>: отклонить</li>
                <li><b>3-й апсейл</b>: купить</li>
              </ul>
            </li>
            <li>
              <b>Если поле пустое</b> — будет выбран 1-й пакет, <b>все апсейлы будут куплены</b> до confirmation.
            </li>
          </ul>
          <p>
            <b>Финиш:</b> если после апсейлов наступает страница <code>confirmation.html</code>, обработка заканчивается.
          </p>
        </div>
      </transition>
    </div>

    <!-- Модалка скриншотов -->
    <transition name="fade">
      <div
          v-if="screenshotModal.show"
          class="screenshot-modal"
          @click.self="closeScreenshotModal"
          tabindex="0"
          @keydown.left.prevent="prevScreenshot(tests[screenshotModal.testIdx])"
          @keydown.right.prevent="nextScreenshot(tests[screenshotModal.testIdx])"
      >
        <div class="screenshot-modal-content">
          <button class="modal-close" @click="closeScreenshotModal">✖</button>
          <button class="modal-prev" @click="prevScreenshot(tests[screenshotModal.testIdx])" :disabled="screenshotModal.imgIdx === 0">←</button>
          <div class="modal-image-scroll">
            <img
                :src="(screenshotsByTest[tests[screenshotModal.testIdx]?.id] || [])[screenshotModal.imgIdx]?.url"
                :alt="(screenshotsByTest[tests[screenshotModal.testIdx]?.id] || [])[screenshotModal.imgIdx]?.name"
                class="modal-image"
            />
          </div>
          <button
              class="modal-next"
              @click="nextScreenshot(tests[screenshotModal.testIdx])"
              :disabled="screenshotModal.imgIdx === (screenshotsByTest[tests[screenshotModal.testIdx]?.id]?.length || 0) - 1"
          >→</button>
          <div class="modal-caption">
            {{ (screenshotsByTest[tests[screenshotModal.testIdx]?.id] || [])[screenshotModal.imgIdx]?.name }}
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, reactive, nextTick, watch } from 'vue'

const showParamInfo = ref(false)
const screenshotsByTest = ref({})

import Multiselect from 'vue-multiselect'
import 'vue-multiselect/dist/vue-multiselect.css'

const flag = code => `https://flagcdn.com/24x18/${code}.png`

const countryOptions = [
  { value: 'ca', label: 'CA', flags: [flag('ca')] },
  { value: 'us', label: 'US', flags: [flag('us')] },
  { value: 'au', label: 'AU', flags: [flag('au')] },
  { value: 'nz', label: 'NZ', flags: [flag('nz')] },
  { value: 'il', label: 'IL', flags: [flag('il')] },
  { value: 'za', label: 'ZA', flags: [flag('za')] },
  { value: 'sg', label: 'SG', flags: [flag('sg')] },
  { value: 'uk', label: 'UK', flags: [flag('gb')] },
  { value: 'ie', label: 'IE', flags: [flag('ie')] },
  { value: 'fr', label: 'FR', flags: [flag('fr')] },
  // Двойной флаг: CA (fr) — Канада и Франция
  { value: 'ca_fr', label: 'CA (fr)', flags: [flag('ca'), flag('fr')] },
  { value: 'ch_fr', label: 'CH (fr)', flags: [flag('ch'), flag('fr')] },
  { value: 'de', label: 'DE', flags: [flag('de')] },
  { value: 'ch_de', label: 'CH (de)', flags: [flag('ch'), flag('de')] },
  { value: 'es', label: 'ES', flags: [flag('es')] },
  { value: 'us_es', label: 'US (es)', flags: [flag('us'), flag('es')] },
  { value: 'pr', label: 'PR', flags: [flag('pr')] },
  { value: 'cl', label: 'CL', flags: [flag('cl')] },
  { value: 'ar', label: 'AR', flags: [flag('ar')] },
  { value: 'mx', label: 'MX', flags: [flag('mx')] },
  { value: 'co', label: 'CO', flags: [flag('co')] },
  { value: 'pe', label: 'PE', flags: [flag('pe')] },
  { value: 'pt', label: 'PT', flags: [flag('pt')] },
  { value: 'br_pt', label: 'BR (pt)', flags: [flag('br'), flag('pt')] },
  { value: 'se', label: 'SE', flags: [flag('se')] },
  { value: 'dk', label: 'DK', flags: [flag('dk')] },
  { value: 'it', label: 'IT', flags: [flag('it')] },
  { value: 'no', label: 'NO', flags: [flag('no')] },
  { value: 'fi', label: 'FI', flags: [flag('fi')] },
  { value: 'is', label: 'IS', flags: [flag('is')] },
  { value: 'nl', label: 'NL', flags: [flag('nl')] },
  { value: 'jp', label: 'JP', flags: [flag('jp')] }
]

const selectedCountry = ref(countryOptions[0])

const devicesList = [
  {value: '', label: 'Desktop', browsers: ['chromium', 'firefox', 'webkit']},
  {value: 'iPhone 13', label: 'iPhone 13', browsers: ['webkit']},
  {value: 'Pixel 5', label: 'Pixel 5', browsers: ['chromium', 'firefox']},
  {value: 'iPad (gen 7)', label: 'iPad (gen 7)', browsers: ['webkit']},
]

const partnersList = [
  { value: 'newdna', label: 'NEWDNA' },
  { value: 'dnav3', label: 'DNA v3' },
  { value: 'ga', label: 'GA' },
  { value: 'hg', label: 'HG' }
]
const checkTypeList = [
  { value: 'full', label: 'Full' },
  { value: 'fast', label: 'Fast' }
]
const browsersList = [
  {
    value: 'chromium',
    label: 'Chromium/Chrome',
    devices: ['', 'Pixel 5', 'Desktop'],
    versions: ['stable', '120', '125']
  },
  {value: 'firefox', label: 'Firefox', devices: ['', 'Pixel 5', 'Desktop'], versions: ['stable', 'esr']},
  {
    value: 'webkit',
    label: 'WebKit/Safari',
    devices: ['', 'iPhone 13', 'iPad (gen 7)', 'Desktop'],
    versions: ['stable']
  },
]

const flows = [
  {value: 'routerFlow', label: 'Auto'},
  // {value: 'basic', label: 'Basic'}
]
const threeDsList = [
  {value: 'none', label: 'Нет 3DS'},
  {value: 'pixxles-dna', label: 'Pixxles DNA'},
  {value: 'pixxles-ga', label: 'Pixxles GA'},
  {value: 'paay-combined', label: 'PAAY combinedRequest'},
  {value: 'paay-old', label: 'PAAY old'}
]

const ninjaMod = ref(true)

const globalConfig = reactive({
  selectedFlow: flows[0].value,
  selectedCountry: countryOptions.find(c => c.value === 'us'),
  selected3ds: 'none',
  selectedDevice: '',
  selectedBrowser: 'chromium',
  selectedVersion: 'stable',
  selectedPartner: 'ga',
  selectedCheckType: 'full'
})

const tests = ref([makeTestObj()])

function makeTestObj() {
  return {
    id: Math.random().toString(36).slice(2),
    url: '',
    selectedFlow: globalConfig.selectedFlow,
    selectedCountry: globalConfig.selectedCountry,
    countryAuto: true,
    selected3ds: globalConfig.selected3ds,
    selectedDevice: globalConfig.selectedDevice,
    selectedBrowser: globalConfig.selectedBrowser,
    selectedVersion: globalConfig.selectedVersion,
    selectedPartner: globalConfig.selectedPartner,
    selectedCheckType: globalConfig.selectedCheckType,
    customParam: '',
    logs: [],
    errors: [],
    testInfo: [],
    testInfoCollapsed: true,
    loading: false,
    testEnded: false,
    useCustomConfig: false,
    showConfig: false,
    pageWeights: [],
    perfCollapsed: true,
    screenshotsCollapsed: true // Для вкладки скриншотов
  }
}
function onCountryInput() {
  if (Array.isArray(tests.value)) {
    tests.value.forEach(t => t.countryAuto = false)
  }
}
function addTest() {
  if (tests.value.length < 10) tests.value.push(makeTestObj())
}

function removeTest(idx) {
  tests.value.splice(idx, 1)
}

function filteredBrowsers(device) {
  return browsersList.filter(b =>
      devicesList.find(d => d.value === device)?.browsers.includes(b.value)
  )
}

function filteredBrowserVersions(device, browser) {
  const found = browsersList.find(b => b.value === browser)
  if (!found) return []
  return found.versions || []
}

function versionLabel(browser, version) {
  if (browser === 'chromium') {
    if (version === '120') return 'Chrome 120'
    if (version === '125') return 'Chrome 125'
    if (version === 'stable') return 'Chrome Stable'
  }
  if (browser === 'firefox') {
    if (version === 'esr') return 'Firefox ESR'
    if (version === 'stable') return 'Firefox Stable'
  }
  if (browser === 'webkit') {
    if (version === 'stable') return 'Safari'
  }
  return version
}

const threeDsOptions = {
  newdna: [
    {value: 'pixxles-dna', label: 'Pixxles DNA'}
  ],
  dnav3: [
    {value: 'pixxles-dna', label: 'Pixxles DNA'}
  ],
  ga: [
    {value: 'pixxles-ga', label: 'Pixxles GA'}
  ],
  hg: [
    {value: 'paay-combined', label: 'PAAY combinedRequest'},
    {value: 'paay-old', label: 'PAAY old'}
  ]
};

function getThreeDsOptions(partner) {
  return [{value: 'none', label: 'Нет 3DS'}, ...(threeDsOptions[partner] || [])];
}

function highlightLog(log) {
  if (log.includes('──────────────────────────────')) return `<span style="color:#3fa3ff;font-weight:bold;">${log}</span>`
  if (log.startsWith('➡️ Переход на страницу:')) return `<span style="color:#ffe063;font-weight:bold;">${log}</span>`
  if (log.startsWith('✅') || log.startsWith('✔️')) return `<span style="color:#53f38b;">${log}</span>`
  if (log.startsWith('❌') || log.startsWith('⚠️')) return `<span style="color:#ff6767;">${log}</span>`
  return log
}

function highlightError(log) {
  return `<span style="font-weight:500; color:#ff6767;">${log}</span>`
}

function syncGlobalToTests() {
  tests.value.forEach(t => {
    if (!t.useCustomConfig) {
      t.selectedFlow = globalConfig.selectedFlow
      t.selectedCountry = globalConfig.selectedCountry
      t.selected3ds = globalConfig.selected3ds
      t.selectedDevice = globalConfig.selectedDevice
      t.selectedBrowser = globalConfig.selectedBrowser
      t.selectedVersion = globalConfig.selectedVersion
      t.selectedPartner = globalConfig.selectedPartner
      t.selectedCheckType = globalConfig.selectedCheckType
    }
  })
}

function toggleCustomConfig(test) {
  if (test.useCustomConfig) {
    test.selectedFlow = globalConfig.selectedFlow
    test.selectedCountry = globalConfig.selectedCountry
    test.selected3ds = globalConfig.selected3ds
    test.selectedDevice = globalConfig.selectedDevice
    test.selectedBrowser = globalConfig.selectedBrowser
    test.selectedVersion = globalConfig.selectedVersion
    test.selectedPartner = globalConfig.selectedPartner
    test.selectedCheckType = globalConfig.selectedCheckType
  }
}

const logRefs = ref({})

function setLogRef(id, el) {
  if (el) logRefs.value[id] = el
}

function scrollToEnd(id) {
  nextTick(() => {
    setTimeout(() => {
      const el = logRefs.value[id]
      if (el) el.scrollTop = el.scrollHeight
    }, 30)
  })
}

watch(
    () => tests.value.map(t => ({id: t.id, len: t.logs.length})),
    (newArr, oldArr) => {
      newArr.forEach(({id, len}, idx) => {
        const oldLen = oldArr[idx]?.len ?? 0
        if (len > oldLen) scrollToEnd(id)
      })
    }
)

const IMG_HEAVY_LIMIT = 50 * 500

function isImageType(type) {
  return ['image', 'img', 'jpeg', 'png', 'svg+xml', 'gif', 'webp', 'jpg'].some(key => (type || '').toLowerCase().includes(key))
}

function heavyImages(pw) {
  if (!pw.resources) return []
  return pw.resources.filter(res =>
      isImageType(res.type) && res.transferred > IMG_HEAVY_LIMIT
  )
}


watch(
    () => tests.value.map(t => t.url),
    (urls, prevUrls) => {
      urls.forEach((url, idx) => {
        if (!url || url === prevUrls[idx]) return;
        const geo = extractGeoFromUrl(url);
        if (geo) {
          const opt = countryOptions.find(o => o.value === geo);
          if (opt && tests.value[idx].countryAuto) {
            tests.value[idx].selectedCountry = opt;
            if (!tests.value[idx].useCustomConfig) {
              globalConfig.selectedCountry = opt;
            }
          }
        }
      });
    }
)


function extractGeoFromUrl(url) {
  const m = url.match(/\/([a-z]{2}(?:-[a-z]{2})?)-v\d+/i);
  if (m) return m[1].replace('-', '_').toLowerCase();
  const intl = url.match(/\/intl-([a-z]{2}(?:-[a-z]{2})?)-v\d+/i);
  if (intl) return intl[1].replace('-', '_').toLowerCase();
  return null;
}



function pageLabel(page) {
  if (page === 'main') return 'Главная'
  if (page === 'qualify') return 'Qualify'
  if (page === 'choose') return 'Choose'
  if (page === 'shipping') return 'Shipping'
  if (page === 'checkout') return 'Checkout'
  if (page === 'confirmation') return 'Confirmation'
  return page
}

function heavyClass(pw) {
  if (pw.page === 'main' && pw.transferred > 3500 * 1024) return 'too-heavy'
  if (pw.page !== 'main' && pw.transferred > 2000 * 1024) return 'heavy'
  return ''
}

function shortUrl(url) {
  try {
    const u = new URL(url)
    return u.pathname.split('/').pop() || u.pathname
  } catch {
    return url.slice(-28)
  }
}

// =================== СКРИНШОТЫ ========================
// Парсим путь к папке скриншотов из логов и возвращаем список файлов (можешь править под себя)
function getScreenshotFolder(test) {
  const found = test.logs.find(x => x.includes('Скриншоты будут лежать тут: /screenshots/'));
  if (!found) return '';
  const m = found.match(/\/screenshots\/([\w-]+)\//);
  return m ? m[1] : '';
}

async function getScreenshotsReal(test) {
  const folder = getScreenshotFolder(test)
  if (!folder) return []
  const names = [
    'index.png',
    'qualify.png',
    'choose.png',
    'shipping.png',
    'checkout.png',
    'upsale-1.png',
    'upsale-2.png',
    'confirmation.png'
  ]
  const resArr = await Promise.all(names.map(async name => {
    try {
      const res = await fetch(`http://localhost:3000/screenshots/${folder}/${name}`, {method: 'HEAD'})
      if (res.ok) return {url: `http://localhost:3000/screenshots/${folder}/${name}`, name}
    } catch {
    }
    return null
  }))
  // Оставляем только существующие
  return resArr.filter(Boolean)
}


const screenshotModal = ref({
  show: false,
  testIdx: null,
  imgIdx: 0
})

function openScreenshotModal(testIdx, imgIdx) {
  screenshotModal.value = {show: true, testIdx, imgIdx}
  document.body.style.overflow = 'hidden'; // Запрет скролла под модалкой
}

function closeScreenshotModal() {
  screenshotModal.value.show = false
  document.body.style.overflow = '';
}

function prevScreenshot(test) {
  if (screenshotModal.value.imgIdx > 0) screenshotModal.value.imgIdx--
}

function nextScreenshot(test) {
  const shots = screenshotsByTest.value[test.id] || []
  if (screenshotModal.value.imgIdx < shots.length - 1) screenshotModal.value.imgIdx++
}

async function runAll() {
  syncGlobalToTests()
  tests.value.forEach(t => {
    t.logs = [];
    t.errors = [];
    t.testEnded = false;
    t.loading = true;
    t.pageWeights = [];
    t.perfCollapsed = true;
    t.screenshotsCollapsed = true;
  })
  const testsData = tests.value.map(t => ({
    url: t.url,
    flow: t.selectedFlow,
    country: t.selectedCountry?.value || globalConfig.selectedCountry.value,
    threeDS: t.selected3ds,
    device: t.selectedDevice,
    browser: t.selectedBrowser,
    version: t.selectedVersion,
    custom: {
      customParam: t.customParam,
      partner: t.selectedPartner,
      checkType: t.selectedCheckType,
      threeDS: t.selected3ds
    },
    ninja: ninjaMod.value

  }))
  const response = await fetch('http://localhost:3000/api/run-multi-test', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({tests: testsData}),
  })
  const reader = response.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''
  while (true) {
    const {done, value} = await reader.read()
    if (done) break
    buffer += decoder.decode(value)
    const lines = buffer.split('\n\n')
    buffer = lines.pop()
    for (const line of lines) {
      if (line.startsWith('data:')) {
        try {
          const obj = JSON.parse(line.replace('data:', '').trim())
          if (obj.stream !== undefined && tests.value[obj.stream]) {
            if (obj.type === 'log') {
              tests.value[obj.stream].logs.push(obj.text)
              if (obj.text.startsWith('❌') || obj.text.startsWith('⚠️')) {
                tests.value[obj.stream].errors.push(obj.text)
              }
              scrollToEnd(obj.stream)
            }
            if (obj.type === 'perf') {
              if (!tests.value[obj.stream].pageWeights) tests.value[obj.stream].pageWeights = []
              const idx = tests.value[obj.stream].pageWeights.findIndex(pw => pw.page === obj.page)
              if (idx >= 0) tests.value[obj.stream].pageWeights[idx] = obj
              else tests.value[obj.stream].pageWeights.push(obj)
            }
            if (obj.type === 'end') {
              tests.value[obj.stream].testEnded = true
              tests.value[obj.stream].loading = false
              getScreenshotsReal(tests.value[obj.stream]).then(arr => {
                screenshotsByTest.value[tests.value[obj.stream].id] = arr
              })
            }
            if (obj.type === 'testInfo') {
              if (!Array.isArray(tests.value[obj.stream].testInfo))
                tests.value[obj.stream].testInfo = []
              tests.value[obj.stream].testInfo.push(obj.text)
            }
          }
        } catch {
        }
      }
    }
  }
  tests.value.forEach(t => t.loading = false)
}

async function runTest(idx) {
  const t = tests.value[idx]

  if (!t.useCustomConfig) {
    t.selectedFlow = globalConfig.selectedFlow
    t.selectedCountry = globalConfig.selectedCountry
    t.selected3ds = globalConfig.selected3ds
    t.selectedDevice = globalConfig.selectedDevice
    t.selectedBrowser = globalConfig.selectedBrowser
    t.selectedVersion = globalConfig.selectedVersion
    t.selectedPartner = globalConfig.selectedPartner
    t.selectedCheckType = globalConfig.selectedCheckType
  }

  if (!t.url) {
    alert('Введите URL')
    return
  }
  t.logs = []
  t.errors = []
  t.testEnded = false
  t.loading = true
  t.pageWeights = []
  t.perfCollapsed = true
  t.screenshotsCollapsed = true
  const testsData = [{
    url: t.url,
    flow: t.selectedFlow,
    country: t.selectedCountry.value, // <--- тут!
    threeDS: t.selected3ds,
    device: t.selectedDevice,
    browser: t.selectedBrowser,
    version: t.selectedVersion,
    custom: {
      param: t.customParam,
      partner: t.selectedPartner,
      checkType: t.selectedCheckType,
      threeDS: t.selected3ds,
    },
    ninja: ninjaMod.value,
  }]
  const response = await fetch('http://localhost:3000/api/run-multi-test', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({tests: testsData}),
  })
  const reader = response.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''
  while (true) {
    const {done, value} = await reader.read()
    if (done) break
    buffer += decoder.decode(value)
    const lines = buffer.split('\n\n')
    buffer = lines.pop()
    for (const line of lines) {
      if (line.startsWith('data:')) {
        try {
          const obj = JSON.parse(line.replace('data:', '').trim())
          if (obj.stream === 0) {
            if (obj.type === 'log') {
              t.logs.push(obj.text)
              if (obj.text.startsWith('❌') || obj.text.startsWith('⚠️')) {
                t.errors.push(obj.text)
              }
              scrollToEnd(0)
            }
            if (obj.type === 'perf') {
              if (!t.pageWeights) t.pageWeights = []
              const idx = t.pageWeights.findIndex(pw => pw.page === obj.page)
              if (idx >= 0) t.pageWeights[idx] = obj
              else t.pageWeights.push(obj)
            }
            if (obj.type === 'end') {
              tests.value[obj.stream].testEnded = true
              tests.value[obj.stream].loading = false
              getScreenshotsReal(tests.value[obj.stream]).then(arr => {
                screenshotsByTest.value[tests.value[obj.stream].id] = arr
              })
            }
            if (obj.type === 'testInfo') {
              if (!Array.isArray(t.testInfo)) t.testInfo = []
              t.testInfo.push(obj.text)
            }
          }
        } catch {
        }
      }
    }
  }
  t.loading = false
}

</script>


<style>
body {
  font-family: system-ui, sans-serif;
  background: #f6f8fb;
}

.multiselect__option--highlight::after {
  display: none !important;
}

.screenshots-toggle-box {
  background: #fff;
  border-radius: 8px;
  margin: 18px 0 8px 0;
  border: 1.3px solid #e5eafe;
  transition: all .13s;
}

.screenshots-toggle-title {
  padding: 9px 20px 9px 20px;
  cursor: pointer;
  font-weight: 600;
  font-size: 1.09em;
  color: #0a1c35;
  user-select: none;
  display: flex;
  align-items: center;
  gap: 10px;
}

.screenshots-toggle-title .arrow {
  font-size: 1em;
  color: #b1b1b1;
  margin-left: auto;
}

.screenshots-block {
  padding: 15px 24px 10px 24px;
}

.screenshots-thumbs {
  display: flex;
  flex-wrap: wrap;
  gap: 18px 18px;
}

.screenshot-thumb {
  width: 90px;
  height: 90px;
  border-radius: 6px;
  overflow: hidden;
  background: #f7faff;
  box-shadow: 0 1px 8px #cdd2e3;
  cursor: pointer;
  border: 2px solid #e6eaff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transition: border .15s;
  position: relative;
}

.screenshot-thumb:hover {
  border: 2px solid #66aaff;
}

.screenshot-thumb img {
  max-width: 100%;
  max-height: 70px;
  display: block;
  margin: 0 auto;
}

.multiselect {
  max-width: 200px;
}

.screenshot-label {
  font-size: 0.89em;
  color: #3c4d6e;
  text-align: center;
  margin-top: 4px;
  word-break: break-all;
}

/* Модалка скриншота */
.screenshot-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(30, 40, 60, 0.80);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn .20s;
}

.screenshot-modal-content {
  position: relative;
  background: #fff;
  border-radius: 10px;
  padding: 20px 48px;
  min-width: 340px;
  min-height: 340px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.modal-image {
  width: 100%;
  max-width: 100%;
  height: auto;
  border-radius: 5px;
  box-shadow: 0 2px 16px #001a3555;
}

.modal-close, .modal-prev, .modal-next {
  position: absolute;
  top: 18px;
  font-size: 2em;
  background: #fff;
  border: none;
  cursor: pointer;
  color: #3c4d6e;
  padding: 0 12px;
  border-radius: 5px;
  opacity: 0.8;
  transition: background .15s, color .15s;
}

.modal-close {
  right: 12px;
  top: 8px;
  font-size: 1.7em;
}

.modal-prev {
  left: 5px;
}

.modal-next {
  right: 5px;
}

.modal-caption {
  margin-top: 12px;
  color: #132d53;
  font-size: 1.01em;
  font-weight: 600;
  text-align: center;
}

@media (max-width: 700px) {
  .modal-image {
    max-width: 92vw;
  }

  .screenshot-modal-content {
    padding: 15px 3vw;
    min-width: 0;
  }
}

.qa-container {
  margin: 32px auto 0 auto;
  max-width: 1200px;
}

.qa-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 36px;
  margin-bottom: 22px;
  border-bottom: 1.5px solid #e7ebfa;
  padding-bottom: 8px;
}

.screenshot-modal-content {
  position: relative;
  background: #fff;
  border-radius: 10px;
  padding: 20px 48px;
  min-width: 340px;
  min-height: 340px;
  display: flex;
  flex-direction: column;
  align-items: center;
  /* Ограничение максимальной ширины (чтобы не вылазило за экран) */
  max-width: 96vw;
  max-height: 96vh;
}

/* Контейнер с вертикальным скроллом */
.modal-image-scroll {
  width: 100%;
  /* Занимать всю доступную ширину */
  max-width: 100%;
  /* Ограничение по высоте модалки минус кнопки и паддинги, подбери под свой дизайн! */
  max-height: 75vh;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  background: #f9fbfe;
  border-radius: 5px;
  margin-bottom: 10px;
}

/* Картинка всегда по ширине, высота — какая получится */
.modal-image {
  width: 100%;
  max-width: 100%;
  height: auto;
  border-radius: 5px;
  box-shadow: 0 2px 16px #001a3555;
  display: block;
}

.per-test-config-outer select {
  height: 40px;
  border-radius: 5px;
  font-size: 16px;
}

.per-test-config-outer .multiselect {
  width: 200px;
}

.per-test-config-outer .multiselect span {
  line-height: 16px;
}

.custom-param-info-wide {
  width: 100%;
  background: #e7f0fe;
  color: #283044;
  border-radius: 12px;
  margin: 22px 0 26px 0;
  padding: 0;
  border: 1.7px solid #d1e3fa;
  box-shadow: 0 2px 14px #b6c3e62c;
  font-size: 1.11em;
  max-width: 100%;
  transition: box-shadow .13s;
}

.custom-param-header {
  cursor: pointer;
  font-size: 1.18em;
  font-weight: 700;
  padding: 18px 35px 17px 32px;
  border-radius: 12px 12px 0 0;
  user-select: none;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #dbeaff;
  color: #2157a2;
  letter-spacing: 0.01em;
}

.custom-param-header .arrow {
  font-size: 1.07em;
  color: #6b8fc1;
  margin-left: 16px;
}

.custom-param-content {
  padding: 18px 38px 16px 38px;
  background: #e7f0fe;
  border-radius: 0 0 12px 12px;
  animation: fadeIn .18s;
}

.custom-param-content code {
  background: #e3e7f5;
  color: #13427d;
  border-radius: 4px;
  padding: 1px 8px;
  font-size: 0.98em;
}

.custom-param-content ul {
  padding-left: 25px;
  margin: 7px 0 8px 0;
}

.custom-param-content li {
  margin-bottom: 6px;
}

.fade-enter-active, .fade-leave-active {
  transition: opacity .20s;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

@media (max-width: 800px) {
  .custom-param-header {
    font-size: 1em;
    padding: 14px 14px 13px 17px;
  }

  .custom-param-content {
    padding: 12px 12px 10px 14px;
  }
}

.qa-header h1 {
  font-size: 2.7rem;
  font-weight: 900;
  letter-spacing: -2px;
  margin: 0;
  padding: 0;
  line-height: 1.08;
  color: #222;
}

.qa-controls {
  display: flex;
  align-items: center;
  gap: 18px;
  flex-wrap: wrap;
}

.qa-controls button {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 8px 18px;
  font-size: 1.15rem;
  border-radius: 6px;
  border: 1.5px solid #bfc9e7;
  background: #f8fafd;
  color: #232323;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s, border 0.15s, color 0.15s;
  box-shadow: 0 1px 3px #ededf5b5;
}

.qa-controls button:disabled {
  background: #ececec;
  color: #b5b5b5;
  cursor: not-allowed;
  border-color: #e5e5e5;
  box-shadow: none;
}

.icon {
  font-size: 1.2em;
  line-height: 1;
}

.ninja-mod-label {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 1.15rem;
  font-weight: 500;
  cursor: pointer;
  user-select: none;
  padding: 2px 0 0 2px;
  color: #313241;
}

.ninja-mod-label input[type="checkbox"] {
  width: 18px;
  height: 18px;
  accent-color: #3890ff;
  margin-right: 2px;
}

.ninja-desc {
  font-size: 0.93em;
  font-weight: 400;
  color: #7e8a9c;
  margin-left: 2px;
}

/* Глобальные настройки */
.global-config-card {
  background: #fff;
  border-radius: 13px;
  padding: 19px 22px 13px 22px;
  margin-bottom: 30px;
  border: 2px solid #e7ebfa;
  box-shadow: 0 1px 7px #b2b3ce29;
  max-width: 100%;
}

pre, .info-report pre {
  white-space: pre-wrap;
  word-break: break-all;
  overflow-wrap: break-word;
}

.info-report pre {
  white-space: pre-wrap;
  word-break: break-all;
  overflow-wrap: break-word;
}

.global-config-title {
  font-size: 1.22em;
  font-weight: 700;
  color: #3971f6;
  display: flex;
  align-items: center;
  margin-bottom: 12px;
  letter-spacing: 0.2px;
}

.global-config-fields.one-row {
  display: flex;
  gap: 13px;
  align-items: center;
  flex-wrap: nowrap;
}

.global-config-card select {
  height: 36px;
  border-radius: 4px;
  border: 1.4px solid #e5eafe;
  padding: 0 13px;
  font-size: 1.1em;
  background: #f8fafd;
  color: #29292d;
  outline: none;
  min-width: 140px;
  max-width: 230px;
}

.global-config-card select:focus {
  border: 1.7px solid #86acff;
}

@media (max-width: 1200px) {
  .global-config-fields.one-row {
    flex-wrap: wrap;
  }

  .global-config-card select {
    min-width: 120px;
    font-size: 1em;
  }
}

/* Test bar + настройка потока */
.qa-multi-row {
  margin-bottom: 16px;
}

fieldset {
  border: 1px solid #e7ebfa;
  border-radius: 12px;
  margin-bottom: 8px;
  background: #22232a;
  padding-top: 0;
  box-shadow: 0 1px 8px #e7ebfa24;
}

legend {
  color: #fff;
  font-size: 1.4rem;
  font-weight: 600;
  padding: 0 18px;
  background: #23232c;
  border-radius: 8px;
}

.test-bar {
  display: grid;
  grid-template-columns:
    minmax(170px, 1.3fr)
    minmax(140px, 1fr)
    38px 38px 55px;
  gap: 10px;
  align-items: center;
  background: #26272e;
  padding: 16px 14px 8px 14px;
  border-radius: 9px 9px 0 0;
  margin-bottom: 8px;
}

.test-bar input, .test-bar select {
  height: 36px;
  border-radius: 7px;
  border: 1px solid #393949;
  padding: 0 10px;
  font-size: 15px;
  background: #22222c;
  color: #f5f5f7;
  outline: none;
  transition: border 0.15s;
}

.test-bar input:focus, .test-bar select:focus {
  border: 1.5px solid #559dff;
}

.onlyicon {
  padding: 7px 7px 7px 7px;
  min-width: 35px;
  background: #282b32;
  border-radius: 7px;
  color: #bfc9e7;
}

.custom-param-input {
  min-width: 140px;
  background: #23242e;
}

.test-btn, .test-remove {
  height: 36px;
  width: 36px;
  font-size: 20px;
  border-radius: 7px;
  border: none;
  cursor: pointer;
}

.test-btn {
  background: #dbefff;
  color: #146d1d;
  transition: background 0.18s;
}

.test-btn:disabled {
  background: #e5e5e7;
  color: #a0a0a7;
  cursor: not-allowed;
}

.test-remove {
  background: #ffdbdb;
  color: #ba2626;
  transition: background 0.18s;
}

.test-remove:hover {
  background: #ffbaba;
}

.test-status {
  padding-left: 18px;
  font-size: 17px;
  color: #aad2ff;
  margin: 0 0 7px 0;
}

.log-block {
  margin-top: 8px;
  background: #181818;
  color: #e1e1e1;
  padding: 8px;
  border-radius: 8px;
  max-height: 340px;
  overflow: auto;
  font-size: 15px;
}

.per-test-config-outer {
  background: #23243a;
  border-radius: 8px;
  margin: 10px 0 7px 0;
  padding: 13px 18px 10px 22px;
  color: #e9ebf8;
  border: 1.5px solid #23253c;
}

.per-test-checkbox {
  font-size: 1.10em;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 10px;
}

.per-test-settings-block {
  display: flex;
  gap: 19px;
  flex-wrap: wrap;
  margin-top: 12px;
}

.per-test-setting {
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 130px;
}

.per-test-setting span {
  font-size: 0.96em;
  font-weight: 600;
  color: #b2baf2;
}

.error-report {
  background: #2b1a1a;
  color: #fff;
  border-radius: 8px;
  padding: 10px 18px;
  margin-top: 12px;
  font-size: 16px;
}

.error-report ul {
  padding-left: 16px;
}

/* ---- Вес страниц ---- */
.perf-toggle-box {
  background: #fff;
  border-radius: 8px;
  margin: 18px 0 8px 0;
  border: 1.3px solid #e5eafe;
  transition: all .13s;
}

.perf-toggle-title {
  padding: 9px 20px 9px 20px;
  cursor: pointer;
  font-weight: 600;
  font-size: 1.16em;
  color: #3fa3ff;
  user-select: none;
  display: flex;
  align-items: center;
  gap: 10px;
}

.perf-toggle-title .arrow {
  font-size: 1em;
  color: #b1b1b1;
  margin-left: auto;
}

.fade-enter-active, .fade-leave-active {
  transition: opacity .22s;
}

.fade-enter, .fade-leave-to {
  opacity: 0;
}

.perf-report {
  background: #f5fbfa;
  color: #24282e;
  border-radius: 8px;
  padding: 13px 20px 10px 20px;
  font-size: 15px;
}

.perf-page-block {
  margin-bottom: 8px;
}

.perf-page-row {
  font-weight: 500;
  font-size: 1.13em;
  margin-bottom: 3px;
  background: #ecf3f6;
  padding: 4px 12px;
  border-radius: 7px;
  display: flex;
  align-items: center;
  gap: 18px;
}

.perf-page-row.too-heavy {
  color: #fff;
  background: #b13434;
}

.perf-page-row.heavy {
  color: #fff;
  background: #d87116;
}

.perf-title {
  min-width: 80px;
  display: inline-block;
  font-weight: bold;
}

.perf-heavy-imgs {
  margin: 3px 0 0 18px;
  display: flex;
  flex-wrap: wrap;
  gap: 7px 20px;
}

.perf-heavy-img {
  display: flex;
  align-items: center;
  gap: 9px;
  background: #fff2f2;
  border-radius: 4px;
  padding: 2px 10px;
  color: #d62b2b;
  font-size: 1em;
  font-weight: bold;
  border: 1px solid #ffd3d3;
}

.info-toggle-box {
  background: #fff;
  border-radius: 8px;
  margin: 18px 0 8px 0;
  border: 1.3px solid #e5eafe;
  transition: all .13s;
}

.info-toggle-title {
  padding: 9px 20px 9px 20px;
  cursor: pointer;
  font-weight: 600;
  font-size: 1.09em;
  color: #235;
  user-select: none;
  display: flex;
  align-items: center;
  gap: 10px;
}

.info-toggle-title .arrow {
  font-size: 1em;
  color: #b1b1b1;
  margin-left: auto;
}

.info-report {
  background: #f8fbfd;
  color: #323549;
  border-radius: 7px;
  padding: 13px 24px 8px 24px;
  font-size: 15px;
}

.info-row {
  margin-bottom: 6px;
  border-left: 3px solid #79bcff;
  padding-left: 11px;
  font-size: 1.04em;
}

</style>