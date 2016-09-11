import { parser } from './parser';

import {
  TypeMismatchError
} from './errors';

export function typeChecker(input /* t:string */) /* t:TypeDocError */ {
  const ast /* t:object */ = parser.parse(input);

  let functionsToCheck;
  let errors;

  functionsToCheck = _findFunctions(ast);
  functionsToCheck = functionsToCheck.map((_function) => {
    let functionWithScope = Object.assign({}, _function);
    functionWithScope.scopedDeclarations = _addScopedVariablesToFunction(_function, ast);

    return functionWithScope;
  });

  errors = functionsToCheck.map((_function) => _checkReturnType(_function));

  // Filter undefined results
  errors = errors.filter((error) => Boolean(error));

  return errors;
}

function _findFunctions(statements /* t:[Object] */) /* t:[Object] */ {
  return statements.filter((statement) => statement.name === 'function');
}

function _addScopedVariablesToFunction(func /* t:Object */, statements /* t:[Object] */) /* t:Object */ {
  return _getVariableDeclarationsInFunc({
    block: {
      contents: statements
    }
  });
}

function _checkReturnType(func /* t:Object */) /* t:TypeDocError? */ {
  const contents = func.block.contents;
  const returnObject = contents.find((statement) => statement.name === 'return');
  let returnType;

  if (returnObject.val.name === 'operation') {
    returnType = _getTypeFromOperation(returnObject.val, func);
  }

  if (returnObject.val.name === 'call') {
    returnType = _getTypeFromFunctionCall(returnObject.val, func);
  }

  if (returnType !== func.type) {
    let tempName = func.var || 'an anonymous function';
    return new TypeMismatchError(`Type mismatch in function ${tempName} on line ${func.line}`, {
      expectedType: func.type,
      actualType: returnType
    });
  }

  return;
}

function _getVariableDeclarationsInFunc(func /* t:Object */) /* t:[Object] */ {
  const contents = func.block.contents;

  let declarations = contents.filter((statement) => statement.name === 'declaration' || statement.name === 'function');

  declarations = declarations.concat(func.arguments || []);
  declarations = declarations.concat(func.scopedDeclarations || []);

  return declarations || [];
}

function _getVariableDeclarationInFunc(varName /* t:string */, func /* t:Object */) /* t:Object */ {
  const declarations = _getVariableDeclarationsInFunc(func);
  const declaration = declarations.find((_declaration) => _declaration.var === varName);

  if (!declaration) {
    throw new Error(`No declaration found for ${varName} on line ${func.line}`);
  }

  return declaration;
}

function _getTypeFromOperation(operation /* t:Object */, func /* t:Object */) /* t:string */ {
  let leftType;
  let rightType;

  if (typeof operation.left === 'string') {
    leftType = _getVariableDeclarationInFunc(operation.left, func).type;
  }

  if (typeof operation.right === 'string') {
    rightType = _getVariableDeclarationInFunc(operation.right, func).type;
  }

  if (leftType !== rightType) {
    throw new Error(`Type mismatch in expression ${operation} on line ${operation.line}`);
  }

  return rightType;
}

function _getTypeFromFunctionCall(call /* t:Object */, func /* t:Object */) /* t:string */ {
  return _getVariableDeclarationInFunc(call.val, func).type;
}
