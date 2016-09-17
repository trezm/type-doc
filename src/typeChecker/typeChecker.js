import { Block } from './block';
import { parser } from '../parser';
import { generateScope, Scope } from './scope';
import { checkFunctions } from './functionChecker';
import {
  TypeMismatchError
} from '../errors';

export function typeChecker(input /* t:string */) /* t:[TypeDocError] */ {
  const ast /* t:object */ = parser.parse(input);

  let functionsToCheck;
  let errors;

  let rootScope = generateScope(ast);

  errors = checkFunctions(rootScope);

  return errors;
}
