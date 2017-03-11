'use strict';

import { resolve } from 'path';
import { TDASTGenerator } from './TDASTGenerator';
import { TDClassType } from './TDClassType';
import { TDScopeGenerator } from './TDScopeGenerator';
import { TDTypeAdapter } from './TDTypeAdapter';
import { TDType } from './TDType';
import {
  TypeMismatchError,
  UndeclaredError
} from '../errors';

String.prototype.capitalize = function() {
  return this.charAt(0).toUpperCase() + this.slice(1);
};

const DEFAULT_OPTIONS = {
  strictClassChecks: false
};

export class TDTypeChecker {
  constructor(file, ast) {
    this._file = file;
    this._ast = ast;
  }

  run(options=DEFAULT_OPTIONS) {
    this.options = Object.assign(Object.assign({}, DEFAULT_OPTIONS), options);

    let ast = this._ast;
    let tdTypeAdapter;

    if (!ast) {
      const tdAstGenerator = new TDASTGenerator(this._file, this.options);

      ast = tdAstGenerator.ast;
      ast.file = resolve(this._file);
    }

    tdTypeAdapter = new TDTypeAdapter(ast);
    ast = tdTypeAdapter.ast;
    this._ast = ast;
    new TDScopeGenerator(ast).generate(ast.scope);

    const importErrors = (ast.imports || [])
      .map((importedTree) => this._checkNode(importedTree.ast))
      .reduce((a, b) => a.concat(b), []);

    let newErrors = importErrors.concat(this._checkNode(ast, []));

    return newErrors;
  }

  _checkNode(node, errors=[]) {
    try {
      switch (node.type) {
        case 'MethodDefinition': {
          errors = errors.concat(this._checkClassNodeSignature(node));

          return errors.concat(this._checkNode(node.value));
        }
        case 'Program':
          return errors.concat(
            node
              .body
              .map((declarator) => this._checkNode(declarator))
              .reduce((a, b) => a.concat(b), []));
        case 'BlockStatement': {
          return errors.concat(
            node
              .body
              .map((statement) => this._checkNode(statement))
              .reduce((a, b) => a.concat(b), []));
        }
        case 'ClassDeclaration': {
          return errors.concat(
            node
              .body
              .body
              .map((statement) => this._checkNode(statement))
              .reduce((a, b) => a.concat(b), []));
        }
        case 'FunctionExpression': {
          errors = errors.concat(this._checkNode(node.body));
          errors = errors.concat(this._checkFunctionReturnType(node));

          return errors;
        }
        case 'ArrowFunctionExpression': {
          const bodyErrors = (node.body && node.body.body || [node.body])
            .map((bodyNode) => this._checkNode(bodyNode))
            .reduce((a, b) => a.concat(b));

          return errors.concat(bodyErrors);
        }
        case 'FunctionDeclaration': {
          errors = errors.concat(this._checkNode(node.body));
          errors = errors.concat(this._checkFunctionReturnType(node));

          return errors;
        }
        case 'ExportNamedDeclaration': {
          if (node.declaration) {
            return errors.concat(this._checkNode(node.declaration));
          } else {
            return errors;
          }
        }
        case 'ImportDeclaration': {
          return errors;
        }
        case 'ImportSpecifier': {
          return errors;
        }
        case 'VariableDeclaration': {
          return errors.concat(
            node
              .declarations
              .map((declarator) => this._checkNode(declarator))
              .reduce((a, b) => a.concat(b), []));
        }
        case 'VariableDeclarator': {
          if (node.init &&
            node.init.callee &&
            node.init.callee.name === 'require') {

          } else if (node.init) {
            errors = errors.concat(this._checkNode(node.init));
          }

          return errors.concat(this._checkDeclaratorInitType(node));
        }
        case 'ReturnStatement': {
          errors = errors.concat(this._checkNode(node.argument));

          return errors;
        }
        case 'BinaryExpression': {
          errors = errors.concat(this._checkNode(node.left));
          errors = errors.concat(this._checkNode(node.right));

          return errors;
        }
        case 'ExpressionStatement': {
          return errors.concat(this._checkNode(node.expression));
        }
        case 'AssignmentExpression': {
          errors = errors.concat(this._checkNode(node.left));
          errors = errors.concat(this._checkNode(node.right));

          return errors
            .concat(this._checkAssignmentExpressionTypes(node))
            .concat(this._checkMemberAssignmentType(node));
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

          // errors = errors.concat(this._checkCallType(node));
          errors = errors.concat(this._checkCallArgumentTypes(node));
          errors = errors.concat(this._checkNode(node.callee));

          return errors.concat(
            node
              .arguments
              .map((argument) => this._checkNode(argument))
              .reduce((a, b) => a.concat(b), []))
              .filter((val) => Boolean(val));
        }
        case 'MemberExpression':
          if (node.object.type !== 'Identifier') {
            errors = errors.concat(this._checkNode(node.object));
            errors = errors.concat(this._checkNode(node.property));
          }

          return errors.concat(this._checkMemberExpression(node));
        default:
          return errors;
      }
    } catch (e) {
      console.error('[TypeDoc]', e);
      return errors;
    }
  }

/**
 * New check methods
 */
  _checkMemberExpression(node, errors=[]) {
    let functionDeclaration;

    if (node.object.type === 'ThisExpression') {
      functionDeclaration = node.scope.findDeclarationForStaticMember(node);
    } else {
      functionDeclaration = node.scope.findDeclarationForMember(node);
    }

    const objectType = this._findTypeForNode(node.object);

    if (!objectType) {
      return errors;
    }

    if (!functionDeclaration &&
      !objectType.isAny &&
      this.options.strictClassChecks) {
      return errors.concat([new UndeclaredError(`${node.property.name} is not a declared property of class ${objectType.typeString} on line ${node.loc.start.line}`, {
        property: node.property.name,
        class: objectType.typeString,
        start: {
          line: node.loc.start.line,
          column: node.loc.start.column
        },
        end: {
          line: node.loc.end.line,
          column: node.loc.end.column
        }
      })]);
    }

    return errors;
  }

  _checkDeclaratorInitType(node, errors=[]) {
    if (!node.id || !node.init) {
      return errors;
    }

    node.id.scope = node.scope;
    node.init.scope = node.scope;

    let declaratorType;
    let assignmentType;

    if (node.init &&
      node.init.callee &&
      node.init.callee.name === 'require') {
      let assignmentDeclaration = node.scope.findDeclarationForName(node.id.name);
      declaratorType = this._findTypeForNode(node.id);
      assignmentType = (assignmentDeclaration && assignmentDeclaration.tdType) || TDType.any();
    } else {
      declaratorType = this._findTypeForNode(node.id);
      assignmentType = this._findTypeForNode(node.init);
    }

    const error = this._testTypes(declaratorType, assignmentType, node);

    return (error && errors.concat([error])) || errors;
  }

  _checkAssignmentExpressionTypes(node, errors=[]) {
    node.left.scope = node.scope;
    node.right.scope = node.scope;

    const declaratorType = this._findTypeForNode(node.left);
    const assignmentType = this._findTypeForNode(node.right);

    const error = this._testTypes(declaratorType, assignmentType, node);

    return (error && errors.concat([error])) || errors;
  }

  _checkMemberAssignmentType(node, errors=[]) {
    if (node.left.type !== 'MemberExpression') {
      return errors;
    }

    const classDeclaration = node.scope.findThisDef();

    if (!classDeclaration) {
      return errors;
    }

    const classPropertyDef = classDeclaration &&
      classDeclaration.type.properties &&
      classDeclaration.type.properties[node.left.property && node.left.property.name];

    if (!classPropertyDef &&
      this.options.strictClassChecks) {
      return errors.concat([new UndeclaredError(`${node.left.property.name} is undeclared on the class ${classDeclaration.type.typeString} at line ${node.loc.start.line}`, {
        property: node.left.property.name,
        class: classDeclaration.type.typeString,
        start: {
          line: node.loc.start.line,
          column: node.loc.start.column
        },
        end: {
          line: node.loc.end.line,
          column: node.loc.end.column
        }
      })]);
    }

    const error = this._testTypes(classPropertyDef, this._findTypeForNode(node.right), node);

    return (error && errors.concat([error])) || errors;
  }

  _checkFunctionReturnType(node, errors=[]) {
    const functionReturnType = new TDType(node.tdType && node.tdType.typeList[node.tdType.typeList.length - 1]);
    const bodyReturnType = this._findReturnType(node.body);

    const error = this._testTypes(functionReturnType, bodyReturnType, node);

    return (error && errors.concat([error])) || errors;
  }

  _checkCallType(node, errors=[]) {
    const objectType = this._findTypeForNode(node);
    // Remove?
  }

  _checkCallArgumentTypes(node, errors=[]) {
    const scope = node.scope;
    let functionDeclaration;

    if (node.callee.type === 'Identifier') {
      functionDeclaration = scope.findDeclarationForName(node.callee.name);
    } else if (node.callee.type === 'Super') {
      // TODO: Handle super calls
      return errors;
    } else if (node.callee.object.type === 'ThisExpression') {
      functionDeclaration = scope.findDeclarationForStaticMember(node.callee);
    } else {
      functionDeclaration = scope.findDeclarationForMember(node.callee);
    }

    // Short circuit, it's probably a call with the type of "Function"
    if (functionDeclaration && functionDeclaration.type.typeList.length === 1) {
      return errors;
    }

    const genericTypes = {};
    return functionDeclaration && node.arguments.map((argument, index) => {
      const argumentDeclarationType = this._findTypeForNode(argument, argument.scope || scope);
      const paramType = new TDType(functionDeclaration.type.typeList[index]);
      let genericsErrors = [];

      /* Assign any types to generics */
      if (paramType.typeList.length !== argumentDeclarationType.typeList.length) {
        // Throw an error
      }

      paramType
        .typeList
        .forEach((typeString, index) => {
          if (genericTypes[typeString] && argumentDeclarationType.isGeneric) {
            genericTypes[argumentDeclarationType.typeList[index]] = typeString;
          } else if (genericTypes[typeString] &&
            genericTypes[typeString] !== argumentDeclarationType.typeList[index]) {
            genericsErrors = genericsErrors.concat([
              new TypeMismatchError(`Generic type '${typeString}' is inconsistent at line ${node.loc.start.line}`, {
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
              })
            ]);
          } else if (TDType.testForGeneric(typeString)) {
            genericTypes[typeString] = argumentDeclarationType.typeList[index];
          }
        });

      // Do we need to wrap TDType here...
      // return new TDType(this._followGenericChain(genericTypes, returnType) || returnType || TDType.any());
      if (genericsErrors.length) {
        return genericsErrors;
      }

      if (paramType.isGeneric) {
        genericTypes[paramType.typeString] = argumentDeclarationType.typeString;
      }

      return this._testTypes(paramType, argumentDeclarationType, node);
    })
    .reduce((a, b) => a.concat(b), [])
    .filter((a) => Boolean(a));
  }

  _checkClassNodeSignature(node, errors=[]) {
    if (node.key.name === 'constructor') {
      return errors;
    }

    const classDeclaration = node.scope.findThisDef();
    const classMethodDef = classDeclaration &&
      classDeclaration.type.methods &&
      classDeclaration.type.methods[node.key.name];

    if (classDeclaration &&
      !classMethodDef &&
      this.options.strictClassChecks) {
      return errors.concat([new UndeclaredError(`${node.key.name} was not declared ahead of time on the class ${classDeclaration.type.typeString} at line ${node.loc.start.line}`, {
        method: node.key.name,
        class: classDeclaration.type.typeString,
        start: {
          line: node.loc.start.line,
          column: node.loc.start.column
        },
        end: {
          line: node.loc.end.line,
          column: node.loc.end.column
        }
      })]);
    }

    const error = this._testTypes(classMethodDef, node.tdType, node);

    if (error) {
      errors = errors.concat([error]);
    }

    return errors;
  }

  /**
   * New helper methods
   */

  _findReturnType(node, errors=[]) {
    let returnStatement = node
      .body
      .find((statement) => statement.type === 'ReturnStatement');

    return (returnStatement && this._findTypeForNode(returnStatement)) || TDType.any();
  }

/**
 * Legacy check methods
 */

  _testTypes(expectedType=TDType.any() /* t:TDType */, actualType=TDType.any() /* t:TDType */, node /* t:Node */) /* t:TypeMismatchError? */ {
    if (expectedType.equals(actualType)) {
      return new TypeMismatchError(`Type mismatch in declaration on line ${node.loc.start.line}`, {
        actualType: actualType.typeString,
        expectedType: expectedType.typeString,
        file: this._ast.file,
        start: {
          line: node.loc.start.line,
          column: node.loc.start.column
        },
        end: {
          line: node.loc.end.line,
          column: node.loc.end.column
        }
      });
    }

    return;
  }

  _findTypeForNode(node, scope=node.scope) {
    let tdDeclaration;
    let signature;
    let returnType;
    let genericTypes = {};

    if (!node) {
      return;
    }

    switch (node.type) {
      case 'ArrowFunctionExpression':
        node.body.scope = scope;
        let arrowFunctionReturn = this._findTypeForNode(node.body);

        return new TDType(node.params
          .map((param) => (param.tdType || TDType.any()).typeString)
          .join(' -> ') + ' -> ' + arrowFunctionReturn.typeString);
      case 'Literal':
        return new TDType((typeof node.value).capitalize());
      case 'Identifier': {
        tdDeclaration = scope.findDeclarationForName(node.name);

        let classDeclaration = scope.findDeclarationForName(
          tdDeclaration && tdDeclaration.type && tdDeclaration.type.typeString
        );

        if (classDeclaration &&
          classDeclaration.type &&
          !(classDeclaration.type instanceof TDClassType)) {
          classDeclaration = undefined;
        }

        return (classDeclaration && classDeclaration.type) ||
          (tdDeclaration && tdDeclaration.type) ||
          TDType.any();
      }
      case 'BinaryExpression':
        node.left.scope = scope;
        node.right.scope = scope;
        return this._findTypeForExpression(node);
      case 'NewExpression': {
        const declaration = node.scope.findDeclarationForName(node.callee.name);
        const isAny = declaration && declaration.type.isAny;

        if (isAny || !declaration) {
          return new TDType(node.callee.name);
        } else {
          return declaration.type;
        }
      }
      case 'CallExpression':
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
        if (node.callee.type === 'Identifier') {
          tdDeclaration = scope.findDeclarationForName(node.callee.name);
        } else if (node.callee.type === 'Super') {
          // TODO: Handle super calls
          return errors;
        } else if (node.callee.object.type === 'ThisExpression') {
          tdDeclaration = scope.findDeclarationForStaticMember(node.callee);
        } else {
          tdDeclaration = scope.findDeclarationForMember(node.callee);
        }

        if (!tdDeclaration) {
          returnType = this._findTypeForNode(node.callee);
        }

        signature = (tdDeclaration && tdDeclaration.type && tdDeclaration.type.typeString.split(' -> ')) ||
          (returnType && returnType.typeString.split(' -> '));
        returnType = signature && signature.pop();

        tdDeclaration && tdDeclaration.type.typeList.length > 1 && node.arguments.forEach((argument, index) => {
          const argumentDeclarationType = new TDType(this._findTypeForNode(argument, argument.scope || scope));
          const paramTypeString = tdDeclaration.type.typeList[index];

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
        return new TDType(this._followGenericChain(genericTypes, returnType) || returnType || TDType.any());
      case 'ReturnStatement':
        node.argument.scope = scope;
        return this._findTypeForNode(node.argument);
      case 'MemberExpression': {
        if (node.object.type === 'ThisExpression') {
          const declaration = node.scope.findDeclarationForStaticMember(node);
          return declaration && declaration.type || TDType.any();
        } else {
          const objectType = this._findTypeForNode(node.object);

          if (objectType &&
            !objectType.isAny &&
            objectType.properties) {
            // Note, we're assuming that property is _always_ an Identifier.
            const propertyType = objectType.properties[node.property.name];

            const classDeclaration = scope.findDeclarationForName(
              propertyType && propertyType.typeString
            );
            return (classDeclaration && classDeclaration.type) ||
              propertyType ||
              TDType.any();
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
        return this._findReturnType(node);
      }
      case 'ObjectExpression': {
        // TODO: Consider handling more strictly
        return TDType.any();
      }
      default:
        return;
    }
  }

  _followGenericChain(generics, type) {
    const genericValue = generics[type];

    if (!genericValue) {
      return;
    }

    return this._followGenericChain(generics, genericValue) || genericValue;
  }

  _findTypeForExpression(expression) {
    return this._findTypeForNode(expression.left);
  }
}
