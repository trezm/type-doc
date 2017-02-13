'use strict';

import { TDDeclaration } from './TDDeclaration';
import { TDMethodDeclaration } from './TDMethodDeclaration';
import { TDScope } from './TDScope';
import { TDType } from './TDType';

export class TDScopeGenerator {
  constructor(ast) {
    this.ast = ast;
  }

  _assignDeclarationTypes(node, existingScope=new TDScope()) {
    node.scope = existingScope;

    switch (node.type) {
      case 'MethodDefinition': {
        const scope = new TDScope(existingScope);

        node.value.body.body.forEach((statement) => this._assignDeclarationTypes(statement, scope));

        const tdType = this._searchForNodeType(node);
        const tdDeclaration = new TDMethodDeclaration(tdType, node.key.name);

        node.value.params.forEach((param) => {
          tdDeclaration.addParam(new TDDeclaration(param.tdType, param.name));
          scope.addDeclaration(new TDDeclaration(param.tdType, param.name));
        });

        existingScope.addBoundMethodDeclaration(tdDeclaration);
        return;
      }
      case 'Program':
        node.body.forEach((statement) => this._assignDeclarationTypes(statement, existingScope));
        return;
      case 'ClassDeclaration': {
        const scope = new TDScope(existingScope);
        const declaration = new TDDeclaration(node.tdType, node.id.name);
        scope.initializeBinding();
        scope.initializeThis(declaration);

        existingScope.addDeclaration(declaration);
        node.body.body.forEach((statement) => this._assignDeclarationTypes(statement, scope));
        return;
      }
      case 'FunctionExpression':
      case 'ArrowFunctionExpression': {
        const body = node.body && node.body.body || [node.body];
        const arrowExpressionScope = new TDScope(existingScope);
        node.scope = arrowExpressionScope;
        node.params
          .forEach((param) => {
            arrowExpressionScope.addDeclaration(new TDDeclaration(param.tdType, param.name));
          });

        body.forEach((statement) => this._assignDeclarationTypes(statement, arrowExpressionScope));
        return;
      }
      case 'FunctionDeclaration': {
        const scope = new TDScope(existingScope);
        const tdType = this._searchForNodeType(node.id);
        const tdDeclaration = new TDMethodDeclaration(tdType, node.id.name);
        scope.initializeBinding(tdType);

        node.params.forEach((param) => {
          let paramDeclaration;

          if (param.tdType.typeString.indexOf('->') > -1) {
            let returnType = new TDType(param.tdType.typeList[param.tdType.typeList.length - 1]);
            paramDeclaration = new TDMethodDeclaration(returnType, param.name);

            for (let i = 0; i < param.tdType.typeList.length - 1; i++) {
              paramDeclaration.addParam(new TDDeclaration(new TDType(param.tdType.typeList[i]), undefined));
            }
          } else {
            paramDeclaration = new TDDeclaration(param.tdType, param.name);
          }

          tdDeclaration.addParam(paramDeclaration);
          scope.addDeclaration(paramDeclaration);
        });

        existingScope.addDeclaration(tdDeclaration);
        node.body.body.forEach((statement) => this._assignDeclarationTypes(statement, scope));
        return;
      }
      case 'ExportNamedDeclaration': {
        if (node.declaration) {
          this._assignDeclarationTypes(node.declaration, existingScope);
        } else {
          const imports = this.ast.imports;
          const relevantImport = imports.find((anImport) => anImport.source === node.source);

          new TDScopeGenerator(relevantImport.ast).generate();

          node.specifiers
            .filter((specifier) => specifier.imported || specifier.exported)
            .forEach((specifier) => {
              const declaration = this._findImportOrRequireForName((specifier.imported || specifier.exported).name, relevantImport);

              if (declaration) {
                existingScope.addDeclaration(new TDDeclaration(declaration.type, specifier.local.name));
              }
            });
        }
        return;
      }
      case 'ImportDeclaration': {
        const imports = this.ast.imports;
        const relevantImport = imports.find((anImport) => anImport.source === node.source);

        new TDScopeGenerator(relevantImport.ast).generate();

        node.specifiers
          .filter((specifier) => specifier.imported)
          .forEach((specifier) => {
            const declaration = this._findImportOrRequireForName(specifier.imported.name, relevantImport);

            if (declaration) {
              existingScope.addDeclaration(new TDDeclaration(declaration.type, specifier.local.name));
            }
          });
        return;
      }
      case 'ImportSpecifier': {
        return;
      }
      case 'VariableDeclaration': {
        node.declarations.forEach((declarator) => this._assignDeclarationTypes(declarator, existingScope));
        return;
      }
      case 'VariableDeclarator': {
        if (node.init &&
          node.init.callee &&
          node.init.callee.name === 'require') {
          const importName = node.init.arguments[0] &&
            node.init.arguments[0].value.replace(/^\.\//, '');
          const imports = this.ast.imports;
          const relevantImport = imports.find((anImport) => anImport.source === importName);

          new TDScopeGenerator(relevantImport.ast).generate();
          const declaration = this._findImportOrRequireForName(undefined, relevantImport);

          if (declaration) {
            existingScope.addDeclaration(new TDDeclaration(declaration.type, node.id.name));
          }
        } else {
          const tdType = this._searchForNodeType(node);
          const tdDeclaration = new TDDeclaration(tdType, node.id.name);

          node.init && this._assignDeclarationTypes(node.init, existingScope);
          existingScope.addDeclaration(tdDeclaration);
        }
        return;
      }
      case 'ReturnStatement': {
        this._assignDeclarationTypes(node.argument, existingScope);
        return;
      }
      case 'AssignmentExpression':
      case 'BinaryExpression': {
        this._assignDeclarationTypes(node.left, existingScope);
        this._assignDeclarationTypes(node.right, existingScope);
        return;
      }
      case 'ExpressionStatement': {
        this._assignDeclarationTypes(node.expression, existingScope);
        return;
      }
      case 'CallExpression': {
        node.arguments.forEach((argument) => this._assignDeclarationTypes(argument, existingScope));
        this._assignDeclarationTypes(node.callee, existingScope);
        return;
      }
      case 'MemberExpression': {
        this._assignDeclarationTypes(node.object, existingScope);
        this._assignDeclarationTypes(node.property, existingScope);
        return;
      }
      default:
        // console.log('unidentified node:', node.type);
        return;
    }
  }

  generate(parentScope /* t:TDScope */) /* t:TDScope */ {
    this._assignDeclarationTypes(this.ast);
  }

  /**
   * Assign scope to all of the statements in the body
   */
  _assignScopeToStatements(ast /* t:Object */, scope /* t:TDScope */) {
    const statements = this._getBodyForAst(ast)
      .forEach((statement) => statement.scope = scope);
  }

  /**
   * Search for node type
   */
  _searchForNodeType(node /* t:Object */, ast /* t:Object */) /* t:String? */ {
    switch (node.type) {
      case 'Identifier':
      case 'FunctionDeclaration':
      case 'FunctionExpression':
      case 'MethodDefinition':
      case 'VariableDeclarator':
        return node.tdType;
      default:
        return undefined;
    }
  }

  /**
   * Find type for import or require
   */
  _findImportOrRequireForName(name /* t:String */, relevantImport /* t:Object */) {
    const declaration = relevantImport
      .ast
      .body
      .map((statement) => {
        const isTypedES6Export = statement.type === 'ExportNamedDeclaration' &&
          statement.scope.findDeclarationForName(name);

        const isAnExpression = statement.type === 'ExpressionStatement';
        const isAnAssignment = isAnExpression && statement.expression.type === 'AssignmentExpression';
        const isLeftAStaticMember = isAnAssignment && statement.expression.left.type === 'MemberExpression';
        const isLeftModuleDotExports = isLeftAStaticMember &&
          statement.expression.left.object.name === 'module' &&
          statement.expression.left.property.name === 'exports';
        const isLeftJustExports = isLeftAStaticMember &&
          statement.expression.left.object.name === 'exports';
        const isTypedNodeExport = (isLeftModuleDotExports || isLeftJustExports) &&
          statement.scope.findDeclarationForName(statement.expression.right.name);

        return isTypedES6Export || isTypedNodeExport;
      })
      .find((exists) => exists);

    return declaration;
  }

  /**
   * Generates an intermediate child scope based on parameters and anything else
   * that would not be contained within the parent scope.
   */
  _generateChildScopeForNode(node /* t:Object */, parent /* t:TDScope */) /* t:TDScope */ {
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
  _findDeclarationsWithTypes(ast /* t:Object */) /* t:[Object] */ {
    const declarationTypes = {
      'ExportNamedDeclaration': true,
      'ImportDeclaration': true,
      // 'MethodDefinition': true,
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

  _findFunctionDeclarationsWithTypes(ast /* t:Object */) {
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

  _findCallExpressions(ast) {
    const declarationTypes = {
      'ExpressionStatement': true,
      'VariableDeclaration': true
    };

    // ast.body for programs, ast.body.body for functions
    const statements = this._getBodyForAst(ast)
      .filter((statement) => declarationTypes[statement.type])
      .filter((statement) => !statement.expression || statement.expression.type === 'CallExpression')
      .map((statement) => {
        if (statement.type === 'VariableDeclaration') {
          return statement
            .declarations
            .filter((declaration) => declaration.init && declaration.init.type === 'CallExpression')
            .map((declaration) => declaration.init);
        } else {
          return statement.expression;
        }
      })
      .reduce((a, b) => a.concat(b), []);

    return statements;
  }

  /**
   * Find any method definitions in the current ast.
   */
  _findMethodDefinitions(ast /* t:Object */) {
    const statements = this._getBodyForAst(ast)
      .filter((statement) => statement.type === 'MethodDefinition');

    return statements;
  }

  /**
   * Find the type of the import by searching through the `imports` of the `ast`
   * argument.
   */
  _assignTypesToImportSpecifiers(importNode /* t:Object */, ast /* t:Object */) /* t:Object */ {
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

  _assignTypesToRequire(requireNode /* t:Object */, ast /* t:Object */) /* t:Object */ {
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
  _getBodyForAst(ast) {
    const functionBody = ast.body && ast.body.body;
    const methodBody = ast.value && ast.value.body.body;
    const programBody = ast.body;

    return functionBody || methodBody || programBody;
  }
}
