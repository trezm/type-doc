'use strict';

import { TDFunctionalChecker } from './lib/TDFunctionalChecker';
import { TDTypeChecker } from './lib/TDTypeChecker';

export function main(entryFile='./examples/generics.test.js', checkFunctional=false) {
  const tdTypeChecker = new TDTypeChecker(entryFile);
  const tdFunctionalChecker = new TDFunctionalChecker(entryFile);

  let results = [];

  results = results.concat(tdTypeChecker.run());

  if (checkFunctional) {
    results = results.concat(tdFunctionalChecker.run());
  }

  return results;
}
