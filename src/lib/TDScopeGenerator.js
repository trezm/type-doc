'use strict';

import { TDDeclaration } from './TDDeclaration';
import { TDMethodDeclaration } from './TDMethodDeclaration';
import { TDScope } from './TDScope';

export class TDScopeGenerator {
  static generate(ast /* t:Object */, parentScope /* t:TDScope */) /* t:TDScope */ {
    const declarations = this._findDeclarationsWithTypes(ast);
    const functionDeclarations = this._findFunctionDeclarationsWithTypes(ast);
    const methodDefinitions = this._findMethodDefinitions(ast);
    const nodesForChildScopes = this._findNodesForChildScopes(ast);
    const scope = new TDScope(parentScope);
    ast.scope = scope;

    declarations.forEach((declaration) => {
      const tdType = this._searchForNodeType(declaration, ast);
      const tdDeclaration = new TDDeclaration(tdType, declaration.name);

      scope.addDeclaration(tdDeclaration);
    });

    functionDeclarations.forEach((declaration) => {
      const tdType = this._searchForNodeType(declaration.id, ast);
      const tdDeclaration = new TDMethodDeclaration(tdType, declaration.id.name);

      declaration.params.forEach((param) => {
        tdDeclaration.addParam(new TDDeclaration(param.tdType, param.name));
      });

      scope.addDeclaration(tdDeclaration);
    });

    methodDefinitions.forEach((declaration) => {
      const tdType = this._searchForNodeType(declaration.value, ast);
      const tdDeclaration = new TDMethodDeclaration(tdType, declaration.key.name);

      declaration.value.params.forEach((param) => {
        tdDeclaration.addParam(new TDDeclaration(param.tdType, param.name));
      });

      scope.addBoundMethodDeclaration(tdDeclaration);
    });

    this._assignScopeToStatements(ast, scope);

    nodesForChildScopes.forEach((node) => {
      const childScope = this._generateChildScopeForNode(node, scope);
      this.generate(node, childScope);
    });

    ast.scope = scope;
    return scope;
  }

  static _findNodesForChildScopes(ast /* t:Object */) /* t:[Object] */ {
    const nodesWithScopes = this._getBodyForAst(ast)
      .filter((node) => {
        return node.type === 'ClassDeclaration' ||
          node.type === 'FunctionDeclaration' ||
          node.type === 'MethodDefinition';
      });

    return nodesWithScopes;
  }

  /**
   * Assign scope to all of the statements in the body
   */
  static _assignScopeToStatements(ast /* t:Object */, scope /* t:TDScope */) {
    const statements = this._getBodyForAst(ast)
      .forEach((statement) => statement.scope = scope);
  }

  /**
   * Search for node type
   */
  static _searchForNodeType(node /* t:Object */, ast /* t:Object */) /* t:string? */ {
    switch (node.type) {
      case 'Identifier':
      case 'FunctionDeclaration':
      case 'FunctionExpression':
        return node.tdType;
      default:
        return undefined;
    }
  }

  /**
   * Generates an intermediate child scope based on parameters and anything else
   * that would not be contained within the parent scope.
   */
  static _generateChildScopeForNode(node /* t:Object */, parent /* t:TDScope */) /* t:TDScope */ {
    const childScope = new TDScope(parent);
    const functionParams = node.params;
    const methodParams = node.value && node.value.params;
    const nodesThatBind = {
      ClassDeclaration: true,
      FunctionDeclaration: true
    };

    (functionParams || methodParams || [])
      .forEach((param) => {
        childScope.addDeclaration(new TDDeclaration(param.tdType, param.name));
      });

    if (nodesThatBind[node.type]) {
      childScope.initializeBinding();
    }

    return childScope;
  }

  /**
   * Notes:
   * - Should filter on:
   *   - VariableDeclarations
   *   - Exports
   *   - FunctionDeclarations
   *   - ClassDeclarations
   *   - Function params
   */
  static _findDeclarationsWithTypes(ast /* t:Object */) /* t:[Object] */ {
    const declarationTypes = {
      'ExportNamedDeclaration': true,
      'ImportDeclaration': true,
      'MethodDefinition': true,
      'VariableDeclaration': true
    };

    // ast.body for programs, ast.body.body for functions
    const statements = this._getBodyForAst(ast)
      .filter((statement) => declarationTypes[statement.type])
      .filter((statement) => !(statement.type === 'ExportNamedDeclaration' && statement.declaration.type === 'FunctionDeclaration'))
      .map((statement) => {
        // TODO(@pete) consider refactoring this so there are no side
        // effects to this function
        if (statement.type === 'ImportDeclaration') {
          this._assignTypesToImportSpecifiers(statement, ast);
        }

        if (statement.type === 'VariableDeclaration' &&
          statement.declarations.length &&
          statement.declarations.find((declarator) => {
            return declarator.init &&
              declarator.init.type === 'CallExpression' &&
              declarator.init.callee.name === 'require' &&
              declarator.init.arguments.length &&
              declarator.init.arguments[0] &&
              /^\.\//.test(declarator.init.arguments[0].value);
          })) {
          this._assignTypesToRequire(statement, ast);
          debugger;
        }

        if (statement.type === 'ExportNamedDeclaration') {
          return statement.declaration;
        }

        return statement;
      })
      .map((statement) => statement.declarations || statement.specifiers || statement)
      .reduce((a, b) => a.concat(b), [])
      .map((statement) => statement.local || statement.id || statement.key || statement);

    return statements;
  }

  static _findFunctionDeclarationsWithTypes(ast /* t:Object */) {
    const declarationTypes = {
      'ExportNamedDeclaration': true,
      'FunctionDeclaration': true
    };

    // ast.body for programs, ast.body.body for functions
    const statements = this._getBodyForAst(ast)
      .filter((statement) => declarationTypes[statement.type])
      .filter((statement) => statement.type !== 'ExportNamedDeclaration' || statement.declaration.type === 'FunctionDeclaration')
      .map((statement) => {
        if (statement.type === 'ExportNamedDeclaration' &&
          statement.declaration.type === 'FunctionDeclaration') {
          return statement.declaration;
        }

        return statement;
      })
      .reduce((a, b) => a.concat(b), []);

    return statements;
  }

  /**
   * Find any method definitions in the current ast.
   */
  static _findMethodDefinitions(ast /* t:Object */) {
    const statements = this._getBodyForAst(ast)
      .filter((statement) => statement.type === 'MethodDefinition');

    return statements;
  }

  /**
   * Find the type of the import by searching through the `imports` of the `ast`
   * argument.
   */
  static _assignTypesToImportSpecifiers(importNode /* t:Object */, ast /* t:Object */) /* t:Object */ {
    const relevantImport = ast.imports
      .find((anImport) => anImport.source === importNode.source);

    (relevantImport.specifiers || [])
      .forEach((specifier) => {
        const exportedIdentifier = relevantImport
          .ast
          .body
          .filter((statement) => statement.type = 'ExportNamedDeclaration')
          .map((exportNamedDeclaration) => exportNamedDeclaration.declaration && exportNamedDeclaration.declaration.declarations)
          .filter((declarations) => Boolean(declarations))
          .reduce((a, b) => a.concat(b), [])
          .find((variableDeclarator) => variableDeclarator.id.name === specifier.imported.name);

        specifier.local.tdType = exportedIdentifier && exportedIdentifier.id.tdType;
      });

    return relevantImport;
  }

  static _assignTypesToRequire(requireNode /* t:Object */, ast /* t:Object */) /* t:Object */ {
    const relevantImport = ast.imports
      .find((anImport) => anImport.source === requireNode
        .declarations[0]
        .init
        .arguments[0]
        .value
        .replace(/^\.\//, ''));

    /**
     * This is an oversimplification, but we'll try and find top level assignments
     * to module.exports.
     */
    const importTypes = relevantImport
      .ast
      .body
      .filter((statement) => {
        const isAnExpression = statement.type === 'ExpressionStatement';
        const isAnAssignment = isAnExpression && statement.expression.type === 'AssignmentExpression';
        const isLeftAStaticMember = isAnAssignment && statement.expression.left.type === 'MemberExpression';
        const isLeftModuleDotExports = isLeftAStaticMember &&
          statement.expression.left.object.name === 'module' &&
          statement.expression.left.property.name === 'exports';
        const isLeftJustExports = isLeftAStaticMember &&
          statement.expression.left.object.name === 'exports';

        return isLeftModuleDotExports || isLeftJustExports;
      })
      .map((statement) => statement.scope.findDeclarationForName(statement.expression.right.name));

    if (importTypes.length) {
      requireNode.declarations[0].id.tdType = importTypes[importTypes.length - 1].type;
    }
  }

  /**
   * Get the body for a given ast
   */
  static _getBodyForAst(ast) {
    const functionBody = ast.body && ast.body.body;
    const methodBody = ast.value && ast.value.body.body;
    const programBody = ast.body;

    return functionBody || methodBody || programBody;
  }
}
