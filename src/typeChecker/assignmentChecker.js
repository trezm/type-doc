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
    .map((assignment) => _checkAssignment(assignment, scope));

  return assignments;
}

function _checkAssignment(assignment /* t:Object */, scope /* t:Scope */) /* t:[TypeDocError] */ {
  const declaration = scope.declarations
    .find((declaration) => declaration.var === assignment.var);

  if (!declaration) {
    throw new Error('Could not find delcaration');
  }

  if (assignment.assignment.type !== declaration.type) {
    return new TypeMismatchError(`Type mismatch in assignment ${assignment.var} on line ${assignment.line}`, {
      expectedType: declaration.type,
      actualType: assignment.assignment.type
    });
  }

  return undefined;
}
