'use strict';

import { TDClassType } from './TDClassType';
import { TDDeclaration } from './TDDeclaration';
import { TDMethodDeclaration } from './TDMethodDeclaration';
import { TDType } from './TDType';

export const TDBuiltinDeclarations = [
  new TDMethodDeclaration(new TDType('Number'), 'Number')
    .addParam(new TDDeclaration(new TDType('any'), 'anyToMakeNumber')),
  new TDDeclaration(new TDType('NodeModule'), 'module'),
  new TDDeclaration(
    new TDClassType('NodeModule')
      .addPropertyDeclaration('exports', 'any'),
    'NodeModule'),
  // new TDDeclaration(new TDType('Promise a'), 'Promise'),
  // new TDDeclaration(
  //   new TDClassType('Promise')
  //     .addMethodDeclaration('constructor', '((a -> Undefined) -> (a -> Undefined) -> a) -> Promise a')
  //     .addMethodDeclaration('then a b', '(a -> b) -> Promise b')
  //     .addMethodDeclaration('catch a b', '(a -> b) -> Promise b')
  // )
];
