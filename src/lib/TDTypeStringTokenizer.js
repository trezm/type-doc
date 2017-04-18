'use strict';

export class TDTypeToken {
  constructor(value) {
    this.value = value.trim();
  }
}

export function tokenizeString(inputString /* t:String */) /* t:Array TDTypeToken */ {
  inputString = inputString.trim();
  const existingTokens = [];
  const firstArrowIndex = inputString.indexOf('->');
  const firstParensIndex = inputString.indexOf('(');

  if (!inputString.length) {
    return [];
  }

  if (firstArrowIndex === 0) {
    return existingTokens.concat(tokenizeString(inputString.substring(2)));
  }

  if (firstArrowIndex < 0) {
    return [new TDTypeToken(inputString)];
  }

  if (firstArrowIndex < firstParensIndex ||
    firstParensIndex < 0) {
    return existingTokens.concat([
        new TDTypeToken(inputString.substring(0, firstArrowIndex - 1))
      ])
      .concat(tokenizeString(inputString.substring(firstArrowIndex + 2)));
  }

  if (firstArrowIndex > firstParensIndex) {
    let lastParenCount = 1;
    for (let i = firstParensIndex + 1; i < inputString.length; i++) {
      if (inputString[i] === '(') {
        lastParenCount++;
      }

      if (inputString[i] === ')') {
        lastParenCount--;
      }

      if (lastParenCount === 0) {
        return existingTokens
          .concat([tokenizeString(inputString.substring(firstParensIndex + 1, i), [])])
          .concat(tokenizeString(inputString.substring(i + 1), []))
      }
    }
  }

  return existingTokens;
}

export function convertTokensToA(tokens, a) {
  if (!tokens.length) {
    return [];
  }

  return (tokens[0] instanceof TDTypeToken) ?
    ([a(tokens[0])].concat(convertTokensToA(tokens.slice(1), a))) :
    ([convertTokensToA(tokens[0], a)].concat(convertTokensToA(tokens.slice(1), a)));
}

export function stringifyTokens(tokens) {
  if (tokens instanceof TDTypeToken) {
    return tokens.value;
  }

  if (!tokens || !tokens.length) {
    return '';
  }

  const results = (tokens[0] instanceof TDTypeToken) ?
    ([tokens[0].value, stringifyTokens(tokens.slice(1))]) :
    ([`(${stringifyTokens(tokens[0])})`, stringifyTokens(tokens.slice(1))])

  return results
    .filter((result) => result.trim().length)
    .join(' -> ');
}

export function stringifyAndFlatten(tokens /* t:Array TDTypeToken */) /* t:Array String */ {
  return tokens.map((token) => token instanceof TDTypeToken ? token.value : stringifyTokens(token));
}

export function mergeTypes(typeString1, typeString2) {
  return stringifyTokens(
    consolidateTokens(
      tokenizeString(typeString1),
      tokenizeString(typeString2)
    )
  );
}

export function consolidateTokens(tokens1, tokens2) {
  let head1 = stringifyTokens(tokens1[0]);
  let head2 = stringifyTokens(tokens2[0]);
  let rest1 = tokens1.slice(1);
  let rest2 = tokens2.slice(1);
  let newHead;

  if (!rest1.length && rest2.length) {
    rest1 = tokens1;
    head1 = '';
  }

  if (!rest2.length && rest1.length) {
    rest2 = tokens2;
    head2 = '';
  }

  if (!head1 && !head2) {
    return [];
  }

  if (head1 && head2 &&
    head1 !== head2) {
    newHead = new TDTypeToken(`${head1} | ${head2}`);
  } else if ((!head1 || !head2)) {
    newHead = new TDTypeToken(`[${head1 || head2}]`);
  } else {
    newHead = new TDTypeToken(head1);
  }

  return [newHead].concat(consolidateTokens(rest1, rest2));
}
