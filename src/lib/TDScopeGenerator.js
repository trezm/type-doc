'use strict';

import { TDDeclaration } from './TDDeclaration';
import { TDScope } from './TDScope';

export class TDScopeGenerator {
  static generate(ast /* t:Object */, parentScope /* t:TDScope */) /* t:TDScope */ {
    const declarations = this._findDeclarationsWithTypes(ast);
    const nodesForChildScopes = this._findNodesForChildScopes(ast);
    const scope = new TDScope(parentScope);

    declarations.forEach((declaration) => {
      const tdType = this._searchForNodeType(declaration, ast);
      scope.addDeclaration(new TDDeclaration(tdType, declaration.name));
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
    const functionBody = ast.body && ast.body.body;
    const programBody = ast.body;
    // ast.body for programs, ast.body.body for functions
    const nodesWithScopes = (functionBody || programBody)
      .filter((node) => node.type === 'FunctionDeclaration');

    return nodesWithScopes;
  }

  /**
   * Assign scope to all of the statements in the body
   */
  static _assignScopeToStatements(ast /* t:Object */, scope /* t:TDScope */) {
    const functionBody = ast.body && ast.body.body;
    const programBody = ast.body;
    // ast.body for programs, ast.body.body for functions
    const statements = (functionBody || programBody)
      .forEach((statement) => statement.scope = scope);
  }

  /**
   * Search for node type
   */
  static _searchForNodeType(node /* t:Object */, ast /* t:Object */) /* t:string? */ {
    switch (node.type) {
      case 'Identifier':
        return node.tdType;
      case 'FunctionDeclaration':
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

    (node.params || [])
      .forEach((param) => {
        childScope.addDeclaration(new TDDeclaration(param.tdType, param.name));
      });

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
      'FunctionDeclaration': true,
      'ImportDeclaration': true,
      'VariableDeclaration': true
    };

    const functionBody = ast.body && ast.body.body;
    const programBody = ast.body;
    // ast.body for programs, ast.body.body for functions
    const statements = (functionBody || programBody)
      .filter((statement) => declarationTypes[statement.type])
      .map((statement) => {
        // TODO(@pete) consider refactoring this so there are no side
        // effects to this function
        if (statement.type === 'ImportDeclaration') {
          this._assignTypesToImportSpecifiers(statement, ast);
        }

        if (statement.type === 'ExportNamedDeclaration') {
          return statement.declaration;
        }

        return statement;
      })
      .map((statement) => statement.declarations || statement.specifiers || statement)
      .reduce((a, b) => a.concat(b), [])
      .map((statement) => statement.local || statement.id || statement);

    return statements;
  }

  /**
   * Find the type of the import by searching through the `imports` of the `ast`
   * argument.
   */
  static _assignTypesToImportSpecifiers(importNode /* t:Object */, ast /* t:Object */) /* t:string */ {
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
}
