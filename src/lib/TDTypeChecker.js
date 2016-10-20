'use strict';

import { TDASTGenerator } from './TDASTGenerator';
import { TDTypeAdapter } from './TDTypeAdapter';
import { TypeMismatchError } from '../errors';

export class TDTypeChecker {
  constructor(entryPoint, ast) {
    this._entryPoint = entryPoint;
    this._ast = ast;
  }

  run() {
    let ast = this._ast;
    let tdTypeAdapter;

    if (!ast) {
      const tdAstGenerator = new TDASTGenerator(this._entryPoint);

      ast = tdAstGenerator.ast;
    }

    tdTypeAdapter = new TDTypeAdapter(ast);

    return this._checkTypes(tdTypeAdapter.ast);
  }

  _checkTypes(ast) {
    let body = ast && ast.body;
    body = body.body || body;

    if (body) {
      let errors = [];

      // Assign parents
      errors = errors.concat(this._checkParents(body, ast));

      errors = errors.concat(this._checkImports(body, ast));
      errors = errors.concat(this._checkDeclarations(body, ast));
      errors = errors.concat(this._checkAssignments(body, ast));
      errors = errors.concat(this._checkReturns(body, ast));

      return errors;
    }
  }

  _checkParents(statements, parent) {
    return statements.filter((statement) => Boolean(statement.body))
      .map((statement) => {
        statement.parent = parent;

        // Prepend identifiers to a body
        if (statement.type === 'FunctionDeclaration') {
          statement.body.body.push({
            type: 'VariableDeclaration',
            declarations: statement.params.map((param) => {
              return {
                id: param,
                loc: statement.loc
              };
            })
          });
        }

        this._checkParents(statement.body.body || statement.body, statements);
        return this._checkTypes(statement);
      })
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
          return declaration.declaration;
        } else {
          return declaration;
        }
      })
      .map((variableDeclaration) => variableDeclaration.declarations)
      .reduce((a, b) => a.concat(b), [])
      .map((variableDeclarator) => {
        const declaratorType = variableDeclarator.id.tdType;
        const assignmentType = this._findTypeForNode(variableDeclarator.init, statements, null /* parent */, ast);

        return this._testTypes(declaratorType, assignmentType, variableDeclarator.loc.start.line);
      })
      .filter((errors) => Boolean(errors));
  }

  _checkAssignments(statements) {
    return statements.filter((statement) => {
        return statement.type === 'ExpressionStatement' &&
          statement.expression.type === 'AssignmentExpression';
      })
      .map((expressionStatement) => expressionStatement.expression)
      .map((assignmentExpression) => {
        const declaratorType = this._findTypeForNode(assignmentExpression.left, statements);
        const assignmentType = this._findTypeForNode(assignmentExpression.right, statements);

        return this._testTypes(declaratorType, assignmentType, assignmentExpression.loc.start.line);
      })
      .filter((errors) => Boolean(errors));
  }

  _checkReturns(statements) {
    return statements
      .filter((statement) => statement.type === 'FunctionDeclaration')
      .map((functionDeclaration) => {
        return functionDeclaration.body.body
          .filter((statement) => statement.type === 'ReturnStatement')
          .map((returnStatement) => {
            const returnType = this._findTypeForNode(
              returnStatement.argument,
              functionDeclaration.body.body,
              functionDeclaration.parent);

            return this._testTypes(functionDeclaration.tdType, returnType, returnStatement.loc.start.line);
          });
      })
      .reduce((a, b) => a.concat(b), [])
      .filter((errors) => Boolean(errors));
  }

  _testTypes(expectedType, actualType, lineNumber) {
    if (typeof expectedType !== 'undefined' &&
        typeof actualType !== 'undefined' &&
        expectedType !== actualType) {
      return new TypeMismatchError(`Type mismatch in declaration on line ${lineNumber}`, {
        expectedType: expectedType,
        actualType: actualType
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

        this._findTypeForImport(importSpecifier, statements, parent, ast);

        importSpecifier.id = importSpecifier.local;
        return importSpecifier;

        // NOTE TO PETE: This is returning without a tdType. You should have a tdType.
      })
      .find((importSpecifier) => identifier.name === importSpecifier.local.name);

    return importDeclarator;
  }

  _findTypeForNode(node, statements, parent, ast) {
    let assignedDeclarator;

    if (!node) {
      return;
    }

    switch (node.type) {
      case 'Literal':
        return typeof node.value;
      case 'Identifier':
        assignedDeclarator = this._findDeclaratorFromIdentifier(node, statements, parent, ast);
        if (assignedDeclarator) {
          return (assignedDeclarator.id && assignedDeclarator.id.tdType) ||
            (assignedDeclarator.init && typeof assignedDeclarator.init.value);
        }

        assignedDeclarator = this._findImportFromIdentifier(node, statements, parent, ast);
        if (assignedDeclarator) {
          return this._findTypeForImport(assignedDeclarator, statements, parent, ast);
        }

        return;
      case 'BinaryExpression':
        debugger;
        return this._findTypeForExpression(node, statements, parent, ast);
      case 'NewExpression':
        return node.callee.name;
      case 'CallExpression':
        assignedDeclarator = this._findFunctionDeclaratorFromIdentifier(node.callee, statements, parent);
        return assignedDeclarator.tdType;
      default:
        return;
    }
  }

  _findTypeForExpression(expression, statements, parent, ast) {
    return this._findTypeForNode(expression.left, statements, parent, ast);
  }

  _findTypeForImport(importSpecifier, statements, parent, ast) {
    return ast.imports
      .map((_import) => _import.ast)
      .map((importedAst) => {
        const correspondingExport = importedAst.body
          .filter((statement) => statement.type === 'ExportNamedDeclaration')
          .map((exportNamedDeclaration) => exportNamedDeclaration.declaration.declarations)
          .reduce((a, b) => a.concat(b), [])
          .find((variableDeclarator) => variableDeclarator.id.name === importSpecifier.imported.name);

        return this._findTypeForNode(correspondingExport.id, importedAst.body, null, importedAst);
      })
      .find((type) => Boolean(type));
  }
}
