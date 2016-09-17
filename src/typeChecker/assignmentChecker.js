import { Block } from './block';
import {
  generateScope,
  Scope
} from './scope';
import {
  TypeMismatchError
} from '../errors';

/**
 * This method checks the return value of all functions in the passed in scope's declarations
 */
export function checkAssignments(scope /* t:Scope */) /* t:[TypeDocError] */ {
  const assignments = scope.assignments
    .filter((declaration) => declaration.name === 'declaration' ||
      declaration.name === 'assignment')
      map((assignment) => {
        console.log('assignment:', assignment);
      });
  //   .map((functionDeclaration) => {
  //     let statements = functionDeclaration.arguments.concat(functionDeclaration.block.contents);
  //     let functionScope = _generateScope(statements);

  //     functionScope.parentScope = scope;

  //     return checkVariables(functionScope).concat([_checkFunctionReturnValue(functionDeclaration, functionScope)]);
  //   })
  //   .reduce((a, b) => a.concat(b), [])
  //   .filter((error) => Boolean(error));

  // return functionDeclarations || [];
}
