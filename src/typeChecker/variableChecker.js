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
export function checkVariables(scope /* t:Scope */) /* t:[TypeDocError] */ {
  // const functionDeclarations = scope.declarations
  //   .filter((declaration) => declaration.name === 'declaration')
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
