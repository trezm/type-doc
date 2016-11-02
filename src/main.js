'use strict';

import { TDTypeChecker } from './lib/TDTypeChecker';

export function main(entryFile='./src/lib/TDTypeChecker.js') {
  const tdTypeChecker = new TDTypeChecker(entryFile);
  return tdTypeChecker.run();
}
