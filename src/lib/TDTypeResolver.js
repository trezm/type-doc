'use strict';

import { TDType } from './TDType';
import { TDClassType } from './TDClassType';
import { mergeTypes } from './TDTypeStringTokenizer';

export function findTypeForNode(node, scope) {
  let tdDeclaration;
  let signature;
  let returnType;
  let genericTypes = {};

  if (!node) {
    return;
  } else {
    scope = scope || node.scope;
  }

  switch (node.type) {
    case 'FunctionExpression':
    case 'ArrowFunctionExpression':
      node.body.scope = scope;

      let arrowFunctionReturn = findTypeForNode(node.body);

      return new TDType(node.params
        .map((param) => (param.tdType || TDType.any()).typeString)
        .join(' -> ') + ' -> ' + arrowFunctionReturn.typeString);
    case 'Literal':
      return new TDType((typeof node.value).capitalize());
    case 'TemplateLiteral':
      return new TDType('String');
    case 'Identifier': {
      let type = scope.findTypeForName(node.name);

      let classType = scope.findTypeForName(
        type && type.typeString
      );

      if (classType &&
        !(classType instanceof TDClassType)) {
        classType = undefined;
      }

      if (type && !type.isGeneric && classType && classType.isGeneric) { return type; }
      if (classType) { return classType; }
      if (type) { return type; }
      return TDType.any();
    }
    case 'AssignmentExpression':
      return findTypeForNode(node.right);
    case 'BinaryExpression':
      node.left.scope = scope;
      node.right.scope = scope;
      return findTypeForExpression(node);
    case 'UnaryExpression': {
      return new TDType('Boolean');
    }
    case 'LogicalExpression': {
      const leftType = findTypeForNode(node.left);
      const rightType = findTypeForNode(node.right);

      if (node.operator === '||') {
        return new TDType(mergeTypes(leftType && leftType.typeString, rightType && rightType.typeString));
      } else if (node.operator === '&&') {
        return rightType;
      } else if (node.operator === '+' && (leftType.typeString === 'string' || rightType.typeString === 'string')) {
        return new TDType('string');
      } else {
        return leftType;
      }
    }
    case 'NewExpression': {
      const type = node.scope.findTypeForName(node.callee.name);
      const isAny = type && type.isAny;

      if (isAny || !type) {
        return new TDType(node.callee.name);
      } else {
        return type;
      }
    }
    case 'CallExpression': {
      /**
       * Okay, so this is a little interesting actually, basically for a call expression the
       * callee will either be:
       *  - An Identifier
       *  - A MemberExpression
       *    - For member expressions, they can be infinitely chained
       *    - A MemberExpression consists of the last property under `property` and then all
       *        of the preceding access under another MemberExpression under `object`.
       *    - When both `object` and `property` are identifiers, the chain has ended
       *
       * With this in mind, we should be checking the type access of everything in _reverse order_
       * and passing the type down. In other words, we recursively go through the tree until we reach
       * (identifier,identifier), test the type, then return the type of the property along with any errors
       * and continue this process until we return here.
       */
      let type;

      if (node.callee.type === 'Identifier') {
        type = scope.findTypeForName(node.callee.name);
      } else if (node.callee.type === 'Super') {
        // TODO: Handle super calls
        return errors;
      } else if (node.callee.type === 'CallExpression') {
        type = findTypeForNode(node.callee);
      } else if (node.callee.object.type === 'ThisExpression') {
        type = scope.findTypeForStaticMember(node.callee);
      } else {
        type = scope.findTypeForMember(node.callee);
      }

      if (!type) {
        returnType = findTypeForNode(node.callee, node.callee.scope || scope);
      }

      signature = (type && type.typeString.split(' -> ')) ||
        (returnType && returnType.typeString.split(' -> '));

      if (signature && signature.length > 1) {
        returnType = signature && signature.pop();
      } else {
        returnType = TDType.any();
      }

      type && type.typeList.length > 1 && node.arguments.forEach((argument, index) => {
        const argumentDeclarationType = new TDType(findTypeForNode(argument, argument.scope || scope));
        const paramTypeString = type.typeList[index];

        // Should do something with the real tokenizer here.
        paramTypeString
          .split('->')
          .map((aType) => aType.trim())
          .forEach((typeString, index) => {
            if (genericTypes[typeString] && argumentDeclarationType.isGeneric) {
              genericTypes[argumentDeclarationType.typeList[index]] = typeString;
            } else if (genericTypes[typeString] &&
              genericTypes[typeString] !== argumentDeclarationType.typeList[index]) {
              throw new TypeMismatchError(`Generic type '${typeString}' is inconsistent at line ${node.loc.start.line}`, {
                type1: genericTypes[typeString],
                type2: argumentDeclarationType.typeList[index],
                start: {
                  line: node.loc.start.line,
                  column: node.loc.start.column
                },
                end: {
                  line: node.loc.end.line,
                  column: node.loc.end.column
                }
              });
            } else if (TDType.testForGeneric(typeString)) {
              genericTypes[typeString] = argumentDeclarationType.typeList[index];
            }
          });
      });

      // Do we need to wrap TDType here...
      return new TDType(followGenericChain(genericTypes, returnType) || returnType || TDType.any());
    }
    case 'ReturnStatement':
      // TODO: Short circuit if for some reason there is no
      node.argument && (node.argument.scope = scope);
      return findTypeForNode(node.argument);
    case 'MemberExpression': {
      if (node.object.type === 'ThisExpression') {
        const type = node.scope.findTypeForStaticMember(node);
        let classType;

        if (type) {
          classType = scope.findTypeForName(type.typeString);
        }

        return classType || type || TDType.any();
      } else {
        const objectType = findTypeForNode(node.object);

        if (objectType &&
          !objectType.isAny &&
          objectType.properties) {
          // Note, we're assuming that property is _always_ an Identifier.
          const propertyType = objectType.getPropertyTypeForName(node.property.name);

          const classType = scope.findTypeForName(
            propertyType && propertyType.typeString
          );
          return classType || propertyType || TDType.any();
        } else if (objectType &&
          !objectType.isAny &&
          node.property.type === 'Literal') {
          let type = new TDType(objectType.genericTypes[0] || objectType.typeString.split(' ')[1]);
          let classType;

          if (!type.isAny) {
            classType = scope.findTypeForName(type.typeString);
          }

          return classType || type;
        } else {
          return objectType;
        }
      }
    }
    case 'ThisExpression': {
      const thisDeclaration = node.scope.findThisDef();

      return thisDeclaration && thisDeclaration.type;
    }
    case 'BlockStatement': {
      return findReturnType(node);
    }
    case 'ObjectExpression': {
      // TODO: Consider handling more strictly
      return TDClassType.any(node);
    }
    case 'ArrayExpression': {
      return new TDType('Array any');
    }
    case 'ConditionalExpression': {
      const consequent = findTypeForNode(node.consequent);
      const alternate = findTypeForNode(node.alternate);

      if (consequent.isSubclassOf(alternate)) { return alternate; }
      if (alternate.isSubclassOf(consequent)) { return consequent; }

      return new TDType(`${consequent.typeString} | ${alternate.typeString}`);
    }
    default:
      return;
  }
}

export function followGenericChain(generics, type) {
  const genericValue = generics[type];

  if (!genericValue) {
    return;
  }

  return followGenericChain(generics, genericValue) || genericValue;
}

export function findReturnType(node, errors=[]) {
  let returnStatement = node
    .body
    .find((statement) => statement.type === 'ReturnStatement');

  return (returnStatement && findTypeForNode(returnStatement)) || TDType.any();
}

export function findTypeForExpression(expression) {
  return findTypeForNode(expression.right);
}
