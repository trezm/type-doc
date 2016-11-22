'use strict';

import { TDTypeChecker } from './lib/TDTypeChecker';

export function main(entryFile='./examples/require.test.js') {
  const tdTypeChecker = new TDTypeChecker(entryFile);
  return tdTypeChecker.run();
}
