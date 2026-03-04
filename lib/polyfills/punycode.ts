const maxInt = 2147483647;
const base = 36;
const tMin = 1;
const tMax = 26;
const skew = 38;
const damp = 700;
const initialBias = 72;
const initialN = 128;
const delimiter = '-';

function baseMinusTFn(codePoint: number): number {
  if (codePoint - 48 < 10) return codePoint - 22;
  if (codePoint - 65 < 26) return codePoint - 65;
  if (codePoint - 97 < 26) return codePoint - 97;
  return base;
}

function digitToBasic(digit: number, flag: number): number {
  return digit + 22 + 75 * (digit < 26 ? 1 : 0) - ((flag !== 0 ? 1 : 0) << 5);
}

function adapt(delta: number, numPoints: number, firstTime: boolean): number {
  let k = 0;
  delta = firstTime ? Math.floor(delta / damp) : delta >> 1;
  delta += Math.floor(delta / numPoints);
  for (; delta > (((base - tMin) * tMax) >> 1); k += base) {
    delta = Math.floor(delta / (base - tMin));
  }
  return Math.floor(k + ((base - tMin + 1) * delta) / (delta + skew));
}

function ucs2decode(str: string): number[] {
  const output: number[] = [];
  let counter = 0;
  const length = str.length;
  while (counter < length) {
    const value = str.charCodeAt(counter++);
    if (value >= 0xd800 && value <= 0xdbff && counter < length) {
      const extra = str.charCodeAt(counter++);
      if ((extra & 0xfc00) === 0xdc00) {
        output.push(((value & 0x3ff) << 10) + (extra & 0x3ff) + 0x10000);
      } else {
        output.push(value);
        counter--;
      }
    } else {
      output.push(value);
    }
  }
  return output;
}

function ucs2encode(array: number[]): string {
  return String.fromCodePoint(...array);
}

function decode(input: string): string {
  const output: number[] = [];
  const inputLength = input.length;
  let i = 0;
  let n = initialN;
  let bias = initialBias;

  let basic = input.lastIndexOf(delimiter);
  if (basic < 0) basic = 0;

  for (let j = 0; j < basic; ++j) {
    output.push(input.charCodeAt(j));
  }

  let index = basic > 0 ? basic + 1 : 0;

  while (index < inputLength) {
    const oldi = i;
    let w = 1;
    let k = base;
    while (true) {
      if (index >= inputLength) break;
      const digit = baseMinusTFn(input.charCodeAt(index++));
      if (digit >= base || digit > Math.floor((maxInt - i) / w)) break;
      i += digit * w;
      const t = k <= bias ? tMin : k >= bias + tMax ? tMax : k - bias;
      if (digit < t) break;
      const bmt = base - t;
      if (w > Math.floor(maxInt / bmt)) break;
      w *= bmt;
      k += base;
    }
    const out = output.length + 1;
    bias = adapt(i - oldi, out, oldi === 0);
    if (Math.floor(i / out) > maxInt - n) break;
    n += Math.floor(i / out);
    i %= out;
    output.splice(i++, 0, n);
  }

  return ucs2encode(output);
}

function encode(input: string): string {
  const output: string[] = [];
  const inputDecoded = ucs2decode(input);
  let n = initialN;
  let delta = 0;
  let bias = initialBias;

  const basicChars: number[] = [];
  for (const cp of inputDecoded) {
    if (cp < 0x80) basicChars.push(cp);
  }

  let basicLength = basicChars.length;
  let handledCPCount = basicLength;

  if (basicLength) {
    output.push(String.fromCodePoint(...basicChars));
  }

  if (basicLength) {
    output.push(delimiter);
  }

  while (handledCPCount < inputDecoded.length) {
    let m = maxInt;
    for (const cp of inputDecoded) {
      if (cp >= n && cp < m) m = cp;
    }

    if (m - n > Math.floor((maxInt - delta) / (handledCPCount + 1))) break;
    delta += (m - n) * (handledCPCount + 1);
    n = m;

    for (const cp of inputDecoded) {
      if (cp < n && ++delta > maxInt) break;
      if (cp === n) {
        let q = delta;
        let k = base;
        while (true) {
          const t = k <= bias ? tMin : k >= bias + tMax ? tMax : k - bias;
          if (q < t) break;
          const qMinusT = q - t;
          const bmt = base - t;
          output.push(String.fromCharCode(digitToBasic(t + (qMinusT % bmt), 0)));
          q = Math.floor(qMinusT / bmt);
          k += base;
        }
        output.push(String.fromCharCode(digitToBasic(q, 0)));
        bias = adapt(delta, handledCPCount + 1, handledCPCount === basicLength);
        delta = 0;
        ++handledCPCount;
      }
    }
    ++delta;
    ++n;
  }

  return output.join('');
}

function toASCII(input: string): string {
  return input
    .split('.')
    .map((label) => {
      if (/[^\0-\x7E]/.test(label)) {
        return 'xn--' + encode(label);
      }
      return label;
    })
    .join('.');
}

function toUnicode(input: string): string {
  return input
    .split('.')
    .map((label) => {
      if (label.startsWith('xn--')) {
        return decode(label.slice(4));
      }
      return label;
    })
    .join('.');
}

export const punycode = {
  version: '2.1.0',
  ucs2: {
    decode: ucs2decode,
    encode: ucs2encode,
  },
  decode,
  encode,
  toASCII,
  toUnicode,
};

if (typeof globalThis !== 'undefined' && !(globalThis as any).punycode) {
  (globalThis as any).punycode = punycode;
}
