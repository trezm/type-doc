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
      case 'pojo':
        assignmentType = declaration.assignment.type;
    }
  } else {
    const assignmentDeclaration = scope.declarations.find((statement) => {
      return statement.name === 'declaration' &&
        statement.var === declaration.assignment.split('.')[0];
    });

    const assignmentValue = _followPropertyAccess(declaration, assignmentDeclaration, scope);

    assignmentType = assignmentValue && assignmentValue.type;
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

function _followPropertyAccess(targetProperty /* t:string */, declaration /* t:Object */, scope /* t:Scope */) {
  // Pop the first argument, as it's value is already declaration
  const key = targetProperty.assignment.split('.').slice(1).join('.');

  return _getValueForStringifiedKey(key, declaration.assignment, scope);
}

function _getValueForStringifiedKey(stringifiedKey /* t:string */, pojo /* t:any */, scope /* t:scope */) /* t:any */ {
  const splitKeys = stringifiedKey.split('.');
  const firstKey = splitKeys.shift();

  /**
   * If the current pojo doesn't have a val, then it's a constant and we should return it.
   * Similarly, if the val isn't an object, it's a reference, so find the declaration so we
   * can pass the declaration/type out.
   */
  if (!pojo.val) {
    return scope.declarations.find((declaration) => declaration.var === stringifiedKey);
  }

  const value = pojo.val[firstKey];

  if (!value) {
    return pojo;
  }

  if (typeof value !== 'object') {
    const declaration = scope.declarations.find((declaration) => declaration.var === pojo.val[firstKey]);
    return declaration && declaration.assignment;
  }

  if (value.type === 'pojo') {
    return _getValueForStringifiedKey(splitKeys.join('.'), value, scope);
  }

  return value;
}
