import { Block } from './block';
import { parser } from '../parser';
import { generateScope, Scope } from './scope';
import { checkAssignments } from './assignmentChecker';
import { checkFunctions } from './functionChecker';
import { checkDeclarations } from './declarationChecker';

import {
  TypeMismatchError
} from '../errors';

export function typeChecker(input /* t:string | [Object] */) /* t:[TypeDocError] */ {
  let ast /* t:[Object] */ = typeof input === 'string' ? parser.parse(input) : input;

  let functionsToCheck;
  let errors = [];

  let rootScope = generateScope(ast);

  errors = errors.concat(checkFunctions(rootScope));
  errors = errors.concat(checkDeclarations(rootScope));
  errors = errors.concat(checkAssignments(rootScope));

  return errors;
}
