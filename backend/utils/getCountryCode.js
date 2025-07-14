// utils/getCountryCode.js

module.exports = function getCountryCode(url) {
    // Ищет /xx-vN/ или /xx-vNN/ где xx — код страны
    const match = url.match(/\/([a-z]{2})-v\d+/i);
    return match ? match[1].toLowerCase() : null;
};
