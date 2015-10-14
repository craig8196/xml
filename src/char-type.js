
function isWhiteSpace(char) {
  return char === '\u0020' || char === '\u0009' || char === '\u000A' || char === '\u000D';
}

function isNameStartChar(char) {
  return char === ':' ||
    char === '_' ||
    (char >= 'A' && char <= 'Z') ||
    (char >= 'a' && char <= 'z') ||
    (char >= '\u00C0' && char <= '\u00D6') ||
    (char >= '\u00D8' && char <= '\u00F6') ||
    (char >= '\u00F8' && char <= '\u02FF') ||
    (char >= '\u0370' && char <= '\u037D') ||
    (char >= '\u037F' && char <= '\u1FFF') ||
    (char >= '\u200C' && char <= '\u200D') ||
    (char >= '\u2070' && char <= '\u218F') ||
    (char >= '\u2C00' && char <= '\u2FEF') ||
    (char >= '\u3001' && char <= '\uD7FF') ||
    (char >= '\uF900' && char <= '\uFDCF') ||
    (char >= '\uFDF0' && char <= '\uFFFD') ||
    (char >= '\u10000' && char <= '\uEFFFF');
}

function isNameChar(char) {
  return isNameStartChar(char) ||
    char === '-' ||
    char === '.' ||
    (char >= '0' && char <= '9') ||
    char === '\u00B7' ||
    (char >= '\u0300' && char <= '\u036F') ||
    (char >= '\u203F' && char <= '\u2040');
}

function isChar(char) {
  return char === '\u0009' ||
    char === '\u000A' ||
    char === '\u000D' ||
    (char >= '\u0020' && char <= '\uD7FF') ||
    (char >= '\uE000' && char <= '\uFFFD') ||
    (char >= '\u10000' && char <= '\u10FFFF');
}

function isCharData(char) {
  return false; // TODO
}

module.exports.isWhiteSpace = isWhiteSpace;
module.exports.isNameStartChar = isNameStartChar;
module.exports.isNameChar = isNameChar;
module.exports.isChar = isChar;
module.exports.isCharData = isCharData;
