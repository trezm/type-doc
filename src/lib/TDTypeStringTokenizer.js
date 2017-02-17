'use strict';

export class TDTypeToken {
  constructor(value) {
    this.value = value.trim();
  }
}

export function tokenizeString(inputString) {
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
  if (!tokens.length) {
    return '';
  }

  const results = (tokens[0] instanceof TDTypeToken) ?
    ([tokens[0].value, stringifyTokens(tokens.slice(1))]) :
    ([`(${stringifyTokens(tokens[0])})`, stringifyTokens(tokens.slice(1))])

  return results
    .filter((result) => result.trim().length)
    .join(' -> ');
}

export function stringifyAndFlatten(tokens) {
  return tokens.map((token) => token instanceof TDTypeToken ? token.value : stringifyTokens(token));
}
