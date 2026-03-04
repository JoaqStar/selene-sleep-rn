const ucs2decode = (str: string): number[] => {
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
};

const ucs2encode = (array: number[]): string => {
  return String.fromCodePoint(...array);
};

const punycodeModule = {
  version: '2.3.1',
  ucs2: {
    decode: ucs2decode,
    encode: ucs2encode,
  },
  decode: (input: string) => input,
  encode: (input: string) => input,
  toASCII: (input: string) => input,
  toUnicode: (input: string) => input,
};

try {
  const existing = require('punycode');
  if (existing && typeof existing === 'object') {
    if (!existing.ucs2 || typeof existing.ucs2.decode !== 'function') {
      existing.ucs2 = punycodeModule.ucs2;
    }
    if (typeof existing.decode !== 'function') {
      existing.decode = punycodeModule.decode;
    }
    if (typeof existing.encode !== 'function') {
      existing.encode = punycodeModule.encode;
    }
    if (typeof existing.toASCII !== 'function') {
      existing.toASCII = punycodeModule.toASCII;
    }
    if (typeof existing.toUnicode !== 'function') {
      existing.toUnicode = punycodeModule.toUnicode;
    }
  }
} catch (_e) {
  // punycode module not available
}

if (typeof globalThis !== 'undefined') {
  (globalThis as any).punycode = punycodeModule;
}

if (typeof global !== 'undefined') {
  (global as any).punycode = punycodeModule;
}

export default punycodeModule;
