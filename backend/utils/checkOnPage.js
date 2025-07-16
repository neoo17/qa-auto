/**
 * Проверяет, находимся ли мы на ожидаемой странице по URL.
 * @param {import('playwright').Page} page
 * @param {string} expected - строка, которая должна содержаться в url (например, 'qualify.html')
 * @returns {Promise<boolean>}
 */
module.exports = async function checkOnPage(page, expected) {
    const url = page.url();
    return url.includes(expected);
};
