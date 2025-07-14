// flows/basic.js
module.exports = async function basicFlow(page, log) {
    log('🔍 Ждем форму...')
    await page.waitForSelector('form#shipping', { timeout: 10000 })
    log('❌ Вводим невалидные данные...')
    await page.fill('input[name="firstName"]', '')
    await page.fill('input[name="lastName"]', '')
    await page.fill('input[name="email"]', 'invalid@@')
    await page.fill('input[name="phone"]', 'abc')
    await page.fill('input[name="address"]', '')
    await page.fill('input[name="zipCode"]', '??')
    await page.fill('input[name="city"]', '')
    await page.selectOption('select[name="state"]', '')

    log('📛 Отправляем форму с ошибками...')
    await page.click('button[type="submit"]')
    await page.waitForTimeout(2000)
    const stillHere = await page.isVisible('form#shipping')
    if (stillHere) {
        log('✅ Форма осталась на месте — валидация сработала')
    } else {
        log('❌ Форма ушла с экрана — баг?')
    }

    // Ввод валидных данных, оплата, upsale...
    log('✅ Вводим валидные данные...')
    await page.fill('input[name="firstName"]', 'Jean')
    await page.fill('input[name="lastName"]', 'Dupont')
    await page.fill('input[name="email"]', 'jean.dupont@example.com')
    await page.fill('input[name="phone"]', '0601020304')
    await page.fill('input[name="address"]', '10 rue de Test')
    await page.fill('input[name="zipCode"]', '75001')
    await page.fill('input[name="city"]', 'Paris')
    await page.selectOption('select[name="state"]', 'IDF')

    log('🚀 Отправляем форму...')
    await page.click('button[type="submit"]')

    log('✅ Базовый сценарий успешно завершён')
}
