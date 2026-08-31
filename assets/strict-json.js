function syntaxError(message) {
  return new SyntaxError(message);
}

function skipWhitespace(text, index) {
  while (/\s/u.test(text[index] ?? '')) index += 1;
  return index;
}

function scanString(text, start) {
  if (text[start] !== '"') throw syntaxError(`expected string at ${start}`);
  let index = start + 1;
  while (index < text.length) {
    const character = text[index];
    if (character === '"') return { raw: text.slice(start, index + 1), end: index + 1 };
    if (character === '\\') {
      index += 2;
      continue;
    }
    if (character.charCodeAt(0) < 0x20) throw syntaxError(`invalid control character at ${index}`);
    index += 1;
  }
  throw syntaxError('unterminated string');
}

function scanValue(text, start) {
  const index = skipWhitespace(text, start);
  const character = text[index];

  if (character === '"') return scanString(text, index).end;
  if (character === '{') return scanObject(text, index);
  if (character === '[') return scanArray(text, index);

  let end = index;
  while (end < text.length && !/[\s,}\]]/u.test(text[end])) end += 1;
  if (end === index) throw syntaxError(`expected value at ${index}`);
  return end;
}

function scanObject(text, start) {
  let index = skipWhitespace(text, start + 1);
  const keys = new Set();
  if (text[index] === '}') return index + 1;

  while (index < text.length) {
    const keyToken = scanString(text, index);
    const key = JSON.parse(keyToken.raw);
    if (keys.has(key)) throw syntaxError(`duplicate key: ${key}`);
    keys.add(key);

    index = skipWhitespace(text, keyToken.end);
    if (text[index] !== ':') throw syntaxError(`expected colon at ${index}`);
    index = scanValue(text, index + 1);
    index = skipWhitespace(text, index);
    if (text[index] === '}') return index + 1;
    if (text[index] !== ',') throw syntaxError(`expected comma at ${index}`);
    index = skipWhitespace(text, index + 1);
  }

  throw syntaxError('unterminated object');
}

function scanArray(text, start) {
  let index = skipWhitespace(text, start + 1);
  if (text[index] === ']') return index + 1;

  while (index < text.length) {
    index = scanValue(text, index);
    index = skipWhitespace(text, index);
    if (text[index] === ']') return index + 1;
    if (text[index] !== ',') throw syntaxError(`expected comma at ${index}`);
    index = skipWhitespace(text, index + 1);
  }

  throw syntaxError('unterminated array');
}

export function parseStrictJson(text) {
  if (typeof text !== 'string') throw syntaxError('JSON input must be a string');
  const end = scanValue(text, 0);
  if (skipWhitespace(text, end) !== text.length) throw syntaxError(`unexpected token at ${end}`);
  return JSON.parse(text);
}
