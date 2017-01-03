'use strict';

import { TDDeclaration } from './TDDeclaration';
import { TDType } from './TDType';

export const TDBuiltinDeclarations = [
  new TDDeclaration(new TDType('any -> Number'), 'Number')
];
