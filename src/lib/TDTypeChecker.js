'use strict';

import { resolve } from 'path';
import { TDASTGenerator } from './TDASTGenerator';
import { TDScopeGenerator } from './TDScopeGenerator';
import { TDTypeAdapter } from './TDTypeAdapter';
import { TDType } from './TDType';
import { TypeMismatchError } from '../errors';

String.prototype.capitalize = function() {
  return this.charAt(0).toUpperCase() + this.slice(1);
};

export class TDTypeChecker {
  constructor(file, ast) {
    this._file = file;
    this._ast = ast;
  }

  run() {
    let ast = this._ast;
    let tdTypeAdapter;

    if (!ast) {
      const tdAstGenerator = new TDASTGenerator(this._file);

      ast = tdAstGenerator.ast;
      ast.file = resolve(this._file);
    }

    tdTypeAdapter = new TDTypeAdapter(ast);
    ast = tdTypeAdapter.ast;
    this._ast = ast;
    new TDScopeGenerator(ast).generate();

    const importErrors = ast
      .imports
      .map((importedTree) => this._checkNode(importedTree.ast))
      .reduce((a, b) => a.concat(b), []);

    let newErrors = importErrors.concat(this._checkNode(ast, []));

    return newErrors;
  }

  _checkNode(node, errors=[]) {
    switch (node.type) {
      case 'MethodDefinition': {
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
        errors = errors.concat(this._checkNode(node.body && node.body.body || [node.body]));

        return errors;
      }
      case 'FunctionDeclaration': {
        errors = errors.concat(this._checkNode(node.body));
        errors = errors.concat(this._checkFunctionReturnType(node));

        return errors;
      }
      case 'ExportNamedDeclaration': {
        return errors.concat(this._checkNode(node.declaration));
      }
      case 'ImportDeclaration': {
        return errors;
      }
      case 'ImportSpecifier': {
        // console.log('node:', node);
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
        // Fix this up -- we're hitting issues checking for calls of arguments
        // that are functions called in the return statement.
        // errors = errors.concat(this._checkNode(node.argument));

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

        return errors.concat(this._checkAssignmentExpressionTypes(node));
      }
      case 'CallExpression': {
        errors = errors.concat(this._checkCallArgumentTypes(node));

        return errors.concat(
          node
            .arguments
            .map((argument) => this._checkNode(argument))
            .reduce((a, b) => a.concat(b), []));
      }
      default:
        // console.log('unidentified node:', node.type);
        return errors;
    }
  }

/**
 * New check methods
 */
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

    const error = this._testTypes(declaratorType, assignmentType, node.loc.start.line);

    return (error && errors.concat([error])) || errors;
  }

  _checkAssignmentExpressionTypes(node, errors=[]) {
    node.left.scope = node.scope;
    node.right.scope = node.scope;

    const declaratorType = this._findTypeForNode(node.left);
    const assignmentType = this._findTypeForNode(node.right);

    const error = this._testTypes(declaratorType, assignmentType, node.loc.start.line)

    return (error && errors.concat([error])) || errors;
  }

  _checkFunctionReturnType(node, errors=[]) {
    const functionReturnType = node.tdType;
    const bodyReturnType = this._findReturnType(node.body);

    const error = this._testTypes(functionReturnType, bodyReturnType, node.loc.start.line);

    return (error && errors.concat([error])) || errors;
  }

  _checkCallArgumentTypes(node, errors=[]) {
    const scope = node.scope;
    const isThisExpression = node.callee.object &&
      node.callee.object.type === 'ThisExpression';
    const name = node.callee.name ||
      (isThisExpression && node.callee.property.name);
    const functionDeclaration = isThisExpression ?
      scope.findDeclarationForStaticMember(node.callee) :
      scope.findDeclarationForName(name);

    const genericTypes = {};

    return functionDeclaration && node.arguments.map((argument, index) => {
      const argumentDeclarationType = this._findTypeForNode(argument, argument.scope || scope);
      const param = functionDeclaration.params[index];
      const paramType = param.type;
      let genericsErrors = [];

      /* Assign any types to generics */
      if (paramType.typeList.length !== argumentDeclarationType.typeList.length) {
        // Throw an error
      }

      paramType
        .typeList
        .forEach((typeString, index) => {
          debugger;
          if (genericTypes[typeString] && argumentDeclarationType.isGeneric) {
            genericTypes[argumentDeclarationType.typeList[index]] = typeString;
          } else if (genericTypes[typeString] &&
            genericTypes[typeString] !== argumentDeclarationType.typeList[index]) {
            genericsErrors = genericsErrors.concat([
              new TypeMismatchError(`Generic type '${typeString}' is inconsistent at line ${node.loc.start.line}`, {
                type1: genericTypes[typeString],
                type2: argumentDeclarationType.typeList[index]
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

      return this._testTypes(paramType, argumentDeclarationType, node.loc.start.line);
    })
    .reduce((a, b) => a.concat(b), [])
    .filter((a) => Boolean(a));
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

  _checkChildScopes(statements, parent) {
    return statements.filter((statement) => Boolean(statement.body || (statement.value && statement.value.body)))
      .map((statement) => this._checkTypes(statement && statement.value || statement, statement.scope))
      .reduce((a, b) => a.concat(b), []);
  }

  _checkImports(statements, ast) {
    return (ast.imports || [])
      .map((importNode) => new TDTypeChecker(null, importNode.ast))
      .map((importTypeChecker) => importTypeChecker.run())
      .reduce((a, b) => a.concat(b), []);
  }


  _testTypes(expectedType=TDType.any() /* t:TDType */, actualType=TDType.any() /* t:TDType */, lineNumber /* t:Number */) /* t:TypeMismatchError? */ {
    if (expectedType.equals(actualType)) {
      return new TypeMismatchError(`Type mismatch in declaration on line ${lineNumber}`, {
        actualType: actualType.typeString,
        expectedType: expectedType.typeString,
        file: this._ast.file
      });
    }

    return;
  }

  _findDeclaratorFromDeclarator(declaration, statements, parent, ast) {
    return this._findDeclaratorFromIdentifier(declaration.init, statements, parent, ast);
  }

  _findDeclaratorFromIdentifier(identifier, statements, parent, ast) {
    const variableDeclarator = statements.filter((statement) => {
        return statement.type === 'VariableDeclaration';
      })
      .map((variableDeclaration) => variableDeclaration.declarations)
      .reduce((a, b) => a.concat(b), [])
      .find((variableDeclarator) => identifier.name === variableDeclarator.id.name);

    const exportDeclarator = statements.filter((statement) => {
        return statement.type === 'ExportNamedDeclaration';
      })
      .map((exportNamedDeclaration) => exportNamedDeclaration.declaration.declarations)
      .reduce((a, b) => a.concat(b), [])
      .find((variableDeclarator) => identifier.name === variableDeclarator.id.name);

    if (!variableDeclarator && !exportDeclarator && parent) {
      return this._findDeclaratorFromIdentifier(identifier, parent.body.body || parent.body, parent.parent);
    }

    return variableDeclarator || exportDeclarator;
  }

  _findFunctionDeclaratorFromIdentifier(identifier, statements, parent) {
    const result = statements.filter((statement) => {
        return statement.type === 'FunctionDeclaration';
      })
      .find((functionDeclaration) => identifier.name === functionDeclaration.id.name);

    if (!result && parent) {
      return this._findFunctionDeclaratorFromIdentifier(identifier, parent.body.body || parent.body, parent.parent);
    }

    return result;
  }

  _findImportFromIdentifier(identifier, statements, parent, ast) {
    const importDeclarator = statements.filter((statement) => {
        return statement.type === 'ImportDeclaration';
      })
      .map((importDeclaration) => importDeclaration.specifiers)
      .reduce((a, b) => a.concat(b), [])
      .map((importSpecifier) => {
        const wrappedImport = ast.imports.find((wrappedImport) => wrappedImport.specifiers.indexOf(importSpecifier) > -1);

        importSpecifier.id = importSpecifier.local;
        return importSpecifier;

        // NOTE TO PETE: This is returning without a tdType. You should have a tdType.
      })
      .find((importSpecifier) => identifier.name === importSpecifier.local.name);

    return importDeclarator;
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
      case 'Identifier':
        tdDeclaration = scope.findDeclarationForName(node.name);
        return tdDeclaration && tdDeclaration.type || TDType.any();
      case 'BinaryExpression':
        node.left.scope = scope;
        node.right.scope = scope;
        return this._findTypeForExpression(node);
      case 'NewExpression':
        return new TDType(node.callee.name);
      case 'CallExpression':
        if (node.callee.type === 'MemberExpression') {
          tdDeclaration = scope.findDeclarationForStaticMember(node.callee);
        } else {
          tdDeclaration = scope.findDeclarationForName(node.callee.name);
        }

        signature = tdDeclaration &&
          tdDeclaration.type  &&
          tdDeclaration.type.typeString.split(' -> ');
        returnType = signature && signature.pop();

        tdDeclaration && tdDeclaration.params && node.arguments.forEach((argument, index) => {
          const argumentDeclarationType = new TDType(this._findTypeForNode(argument, argument.scope || scope));
          const param = tdDeclaration.params[index];
          const paramType = param.type;

          paramType
            .typeList
            .forEach((typeString, index) => {
              if (genericTypes[typeString] && argumentDeclarationType.isGeneric) {
                genericTypes[argumentDeclarationType.typeList[index]] = typeString;
              } else if (genericTypes[typeString] &&
                genericTypes[typeString] !== argumentDeclarationType.typeList[index]) {
                throw new TypeMismatchError(`Generic type '${typeString}' is inconsistent at line ${node.loc.start.line}`, {
                  type1: genericTypes[typeString],
                  type2: argumentDeclarationType.typeList[index]
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
