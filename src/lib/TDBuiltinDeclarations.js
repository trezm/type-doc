'use strict';

import { TDClassType } from './TDClassType';
import { TDDeclaration } from './TDDeclaration';
import { TDType } from './TDType';

export const TDBuiltinDeclarations = [
  new TDDeclaration(new TDType('any -> Number'), 'Number'),
  new TDDeclaration(new TDType('NodeModule'), 'module'),
  new TDDeclaration(
    new TDClassType('NodeModule')
      .addPropertyDeclaration('exports', 'any'),
    'NodeModule'),
  new TDDeclaration(new TDType('String -> any'), 'require')
  // new TDDeclaration(new TDType('Promise a'), 'Promise'),
  // new TDDeclaration(
  //   new TDClassType('Promise')
  //     .addMethodDeclaration('constructor', '((a -> Undefined) -> (a -> Undefined) -> a) -> Promise a')
  //     .addMethodDeclaration('then a b', '(a -> b) -> Promise b')
  //     .addMethodDeclaration('catch a b', '(a -> b) -> Promise b')
  // )
];
