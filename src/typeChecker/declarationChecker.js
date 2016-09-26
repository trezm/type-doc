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
    .filter((statement) => statement.name === 'declaration' || statement.name === 'export')
    .map((declaration) => _checkDeclarationType(declaration, scope))
    .filter((error) => Boolean(error));

  return assignments;
}

function _checkDeclarationType(declaration /* t:Object */, scope /* t:Scope */) {
  let assignmentType /* t:string */;
  let doesNotHaveExplicitType;
  let hasBeenChecked;
  let doesNotHaveAssignment;

  declaration = declaration.name === 'export' ? declaration.val : declaration;

  doesNotHaveExplicitType = !declaration.type;
  hasBeenChecked = typeof declaration.isValid !== 'undefined';
  doesNotHaveAssignment = !declaration.assignment;

  if (doesNotHaveExplicitType || hasBeenChecked || doesNotHaveAssignment) {
    return undefined;
  }

  if (declaration.assignment.name) {
    switch (declaration.assignment.name) {
      case 'classInstantiation':
      case 'constant':
        assignmentType = declaration.assignment.type;
    }
  } else {
    const assignmentDeclaration = scope.declarations.find((statement) => {
      return statement.name === 'declaration' &&
        statement.var === declaration.assignment;
    });

    assignmentType = assignmentDeclaration && assignmentDeclaration.type;
  }

  if (assignmentType !== declaration.type) {
    declaration.isValid = false;
    return new TypeMismatchError(`Type mismatch in declaration on line ${declaration.line}`, {
      expectedType: declaration.type,
      actualType: assignmentType
    });
  } else {
    declaration.isValid = true;
  }

  return undefined;
}
