import { Block } from './block';
import { Scope } from './scope';
import {
  TypeMismatchError
} from '../errors';

/**
 * This method checks the return value of all functions in the passed in scope's declarations
 */
export function checkFunctions(scope /* t:Scope */) /* t:[TypeDocError] */ {
  const functionDeclarations = scope.declarations
    .filter((declaration) => declaration.name === 'function')
    .map((functionDeclaration) => {
      let statements = functionDeclaration.arguments.concat(functionDeclaration.block.contents);
      let functionScope = _generateScope(statements);

      functionScope.parentScope = scope;

      return checkFunctions(functionScope).concat([_checkFunctionReturnValue(functionDeclaration, functionScope)]);
    })
    .reduce((a, b) => a.concat(b), [])
    .filter((error) => Boolean(error));

  return functionDeclarations || [];
}

/**
 * Checks the return value of the given function passed in with the function's scope.
 */
function _checkFunctionReturnValue(func /* t:Object */, scope /* t:Scope */) /* t:TypeDocError? */ {
  const returnStatement = func.block.contents.find((statement) => statement.name === 'return');
  const returnType = _getReturnTypeForExpression(returnStatement, scope);

  if (returnType !== func.type) {
    const tempName = func.var || 'an anonymous function';
    return new TypeMismatchError(`Type mismatch in function ${tempName} on line ${func.line}`, {
      expectedType: func.type,
      actualType: returnType
    });
  }

  return null;
}

/**
 * Get the return type of the expression with the given scope.
 */
function _getReturnTypeForExpression(expr /* t:Object */, scope /* t:Scope */) /* t:string */ {
  switch (expr.val.name) {
    case 'operation':
      return _getTypeForVariable(expr.val.left, scope);
    case 'call':
      return _getTypeForVariable(expr.val.val, scope);
  }
}

/**
 * Get the type of the variable
 */
function _getTypeForVariable(varName /* t:string */, scope /* t:Scope */) /* t:string */ {
  let declaration = scope.declarations.find((declaration) => declaration.var === varName);

  // Check the parent scope
  if (!declaration && scope.parentScope) {
    declaration = _getTypeForVariable(varName, scope.parentScope);
  } else if (declaration) {
    declaration = declaration.type;
  }

  if (!declaration) {
    throw new Error('Could not find declaration'); // Make this into a typedoc error.
  }

  return declaration;
}
