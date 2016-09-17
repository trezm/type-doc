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
export function checkDeclarations(scope /* t:Scope */) /* t:[TypeDocError] */ {
  const assignments = scope.declarations
    .filter((statement) => statement.name === 'declaration')
      .map((declaration) => _checkDeclarationType(declaration, scope))

  return assignments;
}

function _checkDeclarationType(declaration /* t:Object */, scope /* t:Scope */) {
  let assignmentType /* t:string */;

  if (!declaration.type) {
    return undefined;
  }

  switch (declaration.assignment.name) {
    case 'classInstantiation':
    case 'constant':
      assignmentType = declaration.assignment.type;
  }

  if (assignmentType !== declaration.type) {
    return new TypeMismatchError(`Type mismatch in declaration on line ${declaration.line}`, {
      expectedType: declaration.type,
      actualType: assignmentType
    });
  }

  return undefined;
}
