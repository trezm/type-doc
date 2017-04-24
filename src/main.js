'use strict';

import { TDFunctionalChecker } from './lib/TDFunctionalChecker';
import { TDTypeChecker } from './lib/TDTypeChecker';
import { profile } from './lib/TDProfiler';

export { TDFunctionalChecker } from './lib/TDFunctionalChecker';
export { TDTypeChecker } from './lib/TDTypeChecker';

profile('TypeDoc source parsing', false);
export function main(entryFile='./src/lib/TDScope', checkFunctional=false, options) {
  profile('TypeDoc main calling', options.showProfiling);
  const tdTypeChecker = new TDTypeChecker(entryFile);
  profile('TDTypeChecker instantiation', options.showProfiling);
  const tdFunctionalChecker = new TDFunctionalChecker(entryFile);
  profile('TDFunctionalChecker instantiation', options.showProfiling);

  let results = [];

  results = results.concat(tdTypeChecker.run(options));

  if (checkFunctional) {
    results = results.concat(tdFunctionalChecker.run(options));
  }

  return results;
}
