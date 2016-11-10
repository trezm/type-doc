'use strict';

import { TDTypeChecker } from './lib/TDTypeChecker';

export function main(entryFile='./examples/jsdoc.test.js') {
  const tdTypeChecker = new TDTypeChecker(entryFile);
  return tdTypeChecker.run();
}
