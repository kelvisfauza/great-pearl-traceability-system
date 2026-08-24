// Shared GSM-7 sanitizer for SMS bodies.
// Emojis / smart punctuation force UCS-2 encoding on providers like
// BulkSMS, which cuts the segment limit from 160 to 70 chars and shows
// "?" on most handsets — tripling credit cost. Every SMS body must pass
// through toGsm7() before it reaches a provider.

const GSM_REPLACEMENTS: Array<[RegExp, string]> = [
  [/[\u2018\u2019\u201B\u2032]/g, "'"],
  [/[\u201C\u201D\u201F\u2033]/g, '"'],
  [/[\u2013\u2014\u2015\u2212]/g, '-'],
  [/[\u2026]/g, '...'],
  [/[\u00A0\u2000-\u200B\u202F\u205F\u3000]/g, ' '],
  [/[\u2022\u00B7\u25CF\u25AA]/g, '-'],
  [/[\u20A6\u20AC\u00A3\u00A5]/g, ''],
  [/[\u2705\u274C\u26A0\uFE0F]/g, ''],
];

const GSM_ALLOWED =
  /[^\n\r A-Za-z0-9@$_!"#%&'()*+,\-./:;<=>?\[\]^{|}~\u00A7\u00E4\u00F6\u00FC\u00DF\u00C4\u00D6\u00DC]/g;

export function toGsm7(input: string): string {
  let out = (input || '').normalize('NFKD');
  for (const [re, rep] of GSM_REPLACEMENTS) out = out.replace(re, rep);
  out = out.replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F1E6}-\u{1F1FF}]/gu, '');
  out = out.replace(/[\u0300-\u036F]/g, '');
  out = out.replace(GSM_ALLOWED, '');
  out = out
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/ *\n{3,} */g, '\n\n')
    .replace(/^[ \-]+|[ \-]+$/g, '')
    .replace(/\n[ \-]+/g, '\n')
    .replace(/[ \-]+\n/g, '\n')
    .trim();
  return out;
}

export function smsSegments(text: string): number {
  return Math.max(1, Math.ceil((text || '').length / 160));
}
