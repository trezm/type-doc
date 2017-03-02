'use strict';

import { TDFunctionalChecker } from './lib/TDFunctionalChecker';
import { TDTypeChecker } from './lib/TDTypeChecker';

export function main(entryFile='../consumer-web/src/controllers/api/v4/customers.js', checkFunctional=false, options) {
  const tdTypeChecker = new TDTypeChecker(entryFile);
  const tdFunctionalChecker = new TDFunctionalChecker(entryFile);

  let results = [];

  results = results.concat(tdTypeChecker.run(options));

  if (checkFunctional) {
    results = results.concat(tdFunctionalChecker.run(options));
  }

  return results;
}
