export interface PegToken {
  kind: number;
  token: string;
  link: number;
  transient: boolean;
}
export interface Ast {
  name: string;
  value: string;
  node: Ast[];
}

export const KIND = {
  SEP: 0,
  BLANK: 1,
  TOKEN: 2,
  STRING: 3,
  LINK: 4,
  OR: 5,
};

export const NUM2KIND = [
  "SEP",
  "BLANK",
  "TOKEN",
  "STRING",
  "LINK",
  "OR"
]

export const SPECIAL = {
  NOT: -1,
  PLUS: 0,
  MUL: 1,
  AND: 2,
};

export const isTokenOf = (token: PegToken, word: string) => {
  if (token.kind === KIND.TOKEN && token.token === word) return true;
  return false;
};

export const isValidString = (token: PegToken, code: string, num: number) => {
  for (let n = 0; n < token.token.length; n++) {
    if (code[num + n] !== token.token[n]) return false;
  }
  return true;
};

export const isAlphabet = (str: String) => {
  str = str == null ? "" : str;
  if (str.match(/^[A-Za-z]$/)) return true;
  return false;
};

export const isDigit = (str: String) => {
  str = str == null ? "" : str;
  if (str.match(/^[0-9]$/)) return true;
  return false;
};

export interface Options {
  strsep: string[];
  escape: string[];
  sep: string[];
  blank: string[];
  normal: string;
  special: string;
  orbrace: string[];
}

export const options = {
  strsep: ['"', "'"],
  escape: ["\\"],
  sep: [","],
  blank: [" "],
  normal: "%@abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890_",
  special: "~()*+/&",
  orbrace: ["[", "]"],
};

export const isin = (chara: string, charlist: string[] | string) => {
  for (const c of charlist) if (c === chara) return true;
  return false;
};

export const tokenize = (options: Options) => (code: string) => {
  let strnum: number;
  let start: number;
  strnum = start = 0;
  let escapemode: boolean = false;
  let normalmode: boolean = true;
  let strmode: boolean = false;
  let result: PegToken[] = [];
  const gotoEndOfString = (endCharacter: string[] | string) => {
    start = strnum;
    strnum++;
    while (!isin(code[strnum], endCharacter) || escapemode) {
      if (escapemode) escapemode = false;
      else if (code[strnum] == "\\") escapemode = true;
      strnum++;
    }
    strnum++;
  };
  while (strnum < code.length) {
    // string mode
    if (isin(code[strnum], options.strsep)) {
      gotoEndOfString(code[strnum]);
      result.push({
        kind: KIND.STRING,
        token: code.slice(start + 1, strnum - 1),
        link: -1,
        transient: false,
      });
    } else if (isin(code[strnum], options.orbrace[0])) {
      gotoEndOfString(options.orbrace[1]);
      result.push({
        kind: KIND.OR,
        token: code.slice(start + 1, strnum - 1),
        link: -1,
        transient: false,
      });
    }
    // skip blank
    else if (isin(code[strnum], options.blank)) strnum++;
    else if (isin(code[strnum], options.special)) {
      result.push({
        kind: KIND.TOKEN,
        token: code.slice(strnum, strnum + 1),
        link: -1,
        transient: false,
      });
      strnum++;
    } else {
      start = strnum;
      normalmode = isin(code[strnum], options.normal) ? true : false;
      strnum++;
      while (
        !isin(code[strnum], options.sep.concat(options.blank)) ||
        escapemode
      ) {
        if (escapemode) escapemode = false;
        else if (code[strnum] == "\\") escapemode = true;
        if (code.length <= strnum) break;
        if (isin(code[strnum], options.normal) == normalmode) strnum++;
        else break;
      }
      result.push({
        kind: KIND.LINK,
        token: code.slice(start, strnum),
        link: -1,
        transient: false,
      });
    }
  }
  return result;
};

export const makePegStruct = (tokens: PegToken[][]) => {
  // Names of grammers.
  let names: string[] = tokens.map((token) => token[0].token);
  // Numbers of linked from.
  let nameNumList: number[] = new Array(names.length).fill(0);
  let grammers: PegToken[][] = tokens.map((token) => token.slice(2));
  // Set up links.
  for (let grammer of grammers)
    for (let token of grammer)
      if (token.kind === KIND.LINK)
        for (let nameNum = 0; nameNum < names.length; nameNum++)
          if (token.token === names[nameNum]) {
            token.link = nameNum;
            nameNumList[nameNum]++;
          }
  for (let nameNum = 0; nameNum < nameNumList.length; nameNum++)
    if (nameNumList[nameNum] === 1)
      // If link is only one, it is transient.
      for (let grammer of grammers)
        for (let token of grammer)
          if (token.kind === KIND.LINK && token.link === nameNum)
            token.transient = true;
  return grammers;
};

// From here, test code.

/*
 * Go to next slash.
 *
 * Since, depth should be same with current cursor,
 * it counts brace depth.
 * If error, returns -1
 */
export const gotoNextSlash = (peg: PegToken[], cursor: number) => {
  let braceDepth = 0;
  while (0 <= cursor && cursor <= peg.length - 1) {
    cursor++;
    if (cursor === peg.length) break;
    if (peg[cursor].kind === KIND.TOKEN) {
      if (braceDepth === 0 && peg[cursor].token === "/") return cursor;
      else if (peg[cursor].token === "(") braceDepth++;
      else if (peg[cursor].token === ")") braceDepth--;
    }
    if (braceDepth < 0) return -1;
  }
  return -1;
};

/*
 * Go to end of brace PEG.
 * The start point is inner of brace.
 *
 * Returns cursor.
 * If error, returns -1
 */
export const gotoBraceEnd = (peg: PegToken[], cursor: number) => {
  let braceDepth = 1;
  while (braceDepth !== 0) {
    cursor++;
    if (cursor === peg.length) return -1;
    if (isTokenOf(peg[cursor], "(")) braceDepth++;
    else if (isTokenOf(peg[cursor], ")")) braceDepth--;
  }
  return cursor;
};

/*
 * Go to start of brace of PEG.
 * The start point is inner of brace.
 *
 * Returns cursor.
 * If error, returns -1
 */
export const gotoBraceStart = (peg: PegToken[], cursor: number) => {
  let braceDepth = 1;
  while (braceDepth !== 0) {
    cursor--;
    if (cursor === -1) return -1;
    if (isTokenOf(peg[cursor], "(")) braceDepth--;
    else if (isTokenOf(peg[cursor], ")")) braceDepth++;
  }
  return cursor;
};
