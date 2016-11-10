'use strict';

import { resolve } from 'path';
import { TDASTGenerator } from './TDASTGenerator';
import { TDScopeGenerator } from './TDScopeGenerator';
import { TDTypeAdapter } from './TDTypeAdapter';
import { TypeMismatchError } from '../errors';

export class TDTypeChecker {
  constructor(file, ast) {
    this._file = file;
    this._ast = ast;
  }

  run() {
    let ast = this._ast;
    let tdTypeAdapter;
    let scope;

    if (!ast) {
      const tdAstGenerator = new TDASTGenerator(this._file);

      ast = tdAstGenerator.ast;
      ast.file = resolve(this._file);
    }

    tdTypeAdapter = new TDTypeAdapter(ast);
    ast = tdTypeAdapter.ast;
    this._ast = ast;

    return this._checkTypes(ast);
  }

  _checkTypes(ast, parentScope) {
    let body = ast && ast.body;
    body = body.body || body;

    if (body) {
      let errors = [];
      let scope;

      errors = errors.concat(this._checkImports(body, ast));
      scope = TDScopeGenerator.generate(ast, parentScope);

      errors = errors.concat(this._checkChildScopes(body, ast));
      errors = errors.concat(this._checkDeclarations(body, ast));
      errors = errors.concat(this._checkAssignments(body, ast));
      errors = errors.concat(this._checkReturns(body, ast));
      errors = errors.concat(this._checkCalls(body, ast));

      return errors;
    }
  }

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

  _checkDeclarations(statements, ast) {
    return statements.filter((statement) => {
        return statement.type === 'VariableDeclaration' ||
          statement.type === 'ExportNamedDeclaration';
      })
      .map((declaration) => {
        if (declaration.type === 'ExportNamedDeclaration') {
          declaration.declaration.scope = declaration.scope;
          return declaration.declaration;
        } else {
          return declaration;
        }
      })
      .map((variableDeclaration) => {
        const declarations = (variableDeclaration.declarations || [variableDeclaration]);

        declarations.forEach((declaration) => declaration.scope = variableDeclaration.scope);
        return declarations;
      })
      .reduce((a, b) => a.concat(b), [])
      .filter((variableDeclarator) => Boolean(variableDeclarator.init))
      .map((variableDeclarator) => {
        variableDeclarator.id.scope = variableDeclarator.scope;
        variableDeclarator.init.scope = variableDeclarator.scope;

        const declaratorType = this._findTypeForNode(variableDeclarator.id);
        const assignmentType = this._findTypeForNode(variableDeclarator.init);

        return this._testTypes(declaratorType, assignmentType, variableDeclarator.loc.start.line);
      })
      .filter((errors) => Boolean(errors));
  }

  _checkAssignments(statements) {
    return statements.filter((statement) => {
        return statement.type === 'ExpressionStatement' &&
          statement.expression.type === 'AssignmentExpression';
      })
      .map((expressionStatement) => {
        expressionStatement.expression.scope = expressionStatement.scope;
        return expressionStatement.expression;
      })
      .map((assignmentExpression) => {
        assignmentExpression.left.scope = assignmentExpression.scope;
        assignmentExpression.right.scope = assignmentExpression.scope;

        const declaratorType = this._findTypeForNode(assignmentExpression.left);
        const assignmentType = this._findTypeForNode(assignmentExpression.right);

        return this._testTypes(declaratorType, assignmentType, assignmentExpression.loc.start.line);
      })
      .filter((errors) => Boolean(errors));
  }

  _checkReturns(statements) {
    return statements
      .filter((statement) => {
        return statement.type === 'FunctionDeclaration' ||
          statement.type === 'MethodDefinition';
      })
      .map((declaration) => {
        return (declaration.value || declaration).body.body
          .filter((statement) => statement.type === 'ReturnStatement')
          .map((returnStatement) => {
            const returnType = this._findTypeForNode(returnStatement);

            return this._testTypes(declaration.tdType, returnType, returnStatement.loc.start.line);
          });
      })
      .reduce((a, b) => a.concat(b), [])
      .filter((errors) => Boolean(errors));
  }

  _checkCalls(statements) {
    return statements
      .filter((statement) => {
        return statement.type === 'ExpressionStatement' &&
          statement.expression.type === 'CallExpression';
      })
      .map((callExpression) => {
        const functionDeclaration = callExpression.scope.findDeclarationForName(callExpression.expression.callee.name);

        return functionDeclaration && callExpression.expression.arguments.map((argument, index) => {
          const argumentDeclaration = callExpression.scope.findDeclarationForName(argument.name);
          const argumentDeclarationType = argumentDeclaration && argumentDeclaration.type;
          const param = functionDeclaration.params[index];
          const paramType = param.type;

          return this._testTypes(paramType, argumentDeclarationType, callExpression.loc.start.line);
        });
      })
      .reduce((a, b) => a.concat(b), [])
      .filter((errors) => Boolean(errors));
  }

  _testTypes(expectedType, actualType, lineNumber) {
    const checkExpectedType = typeof expectedType !== 'undefined' &&
      expectedType !== 'any';
    const checkActualType = typeof actualType !== 'undefined' &&
      actualType !== 'any';

    if (checkExpectedType &&
        checkActualType &&
        expectedType !== actualType) {
      return new TypeMismatchError(`Type mismatch in declaration on line ${lineNumber}`, {
        actualType: actualType,
        expectedType: expectedType,
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

  _findTypeForNode(node) {
    let tdDeclaration;

    if (!node) {
      return;
    }

    switch (node.type) {
      case 'Literal':
        return typeof node.value;
      case 'Identifier':
        tdDeclaration = node.scope.findDeclarationForName(node.name);
        return tdDeclaration && tdDeclaration.type || 'any';
      case 'BinaryExpression':
        node.left.scope = node.scope;
        node.right.scope = node.scope;
        return this._findTypeForExpression(node);
      case 'NewExpression':
        return node.callee.name;
      case 'CallExpression':
        if (node.callee.type === 'MemberExpression') {
          tdDeclaration = node.scope.findDeclarationForStaticMember(node.callee);
        } else {
          tdDeclaration = node.scope.findDeclarationForName(node.callee.name);
        }

        return tdDeclaration && tdDeclaration.type || 'any';
      case 'ReturnStatement':
        node.argument.scope = node.scope;
        return this._findTypeForNode(node.argument);
      default:
        return;
    }
  }

  _findTypeForExpression(expression) {
    return this._findTypeForNode(expression.left);
  }
}
