import { Block } from './block';
import { parser } from '../parser';
import { Scope } from './scope';
import { checkFunctions } from './functionChecker';
import {
  TypeMismatchError
} from '../errors';

export function typeChecker(input /* t:string */) /* t:[TypeDocError] */ {
  const ast /* t:object */ = parser.parse(input);

  let functionsToCheck;
  let errors;

  let rootScope = _generateScope(ast);

  errors = _checkFunctions(rootScope);

  return errors;
}

function _generateScope(statements /* t:[Object] */) /* t:Scope */ {
  const declarations = statements.filter((statement) => {
    return statement.name === 'declaration' ||
      statement.name === 'function' ||
      statement.name === 'argument'
    });

  return new Scope(null, declarations);
}
