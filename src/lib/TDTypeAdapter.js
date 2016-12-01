'use strict';

import { TDDeclaration } from './TDDeclaration';
import { TDScope } from './TDScope';
import { TDType } from './TDType';

const TYPEDEF_REGEX = /^\s*t:(.+)$/;
const JSDOC_PARAMS_REGEX = /@param\s*\{[^\}]+\}\s*[^\s]+/g;
const JSDOC_SINGLE_PARAM_REGEX = /@param\s*\{([^\}]+)\}\s*\[?([^\s\]]+)\]?/;
const JSDOC_RETURNS_REGEX = /@returns\s*\{([^\}]+)\}/;

export class TDTypeAdapter {
  constructor(ast) {
    this._ast = ast;
    this._typeDefs = this._findTypeDefComments(this._ast);
    this._jsDocDefs = this._findJSDocDefComments(this._ast);
  }

  get ast() {
    this._assignDeclarationTypes(this._ast);
    return this._ast;
  }

  _assignDeclarationTypes(node) {
    switch (node.type) {
      case 'MethodDefinition': {
        node.value.body.body.forEach((statement) => this._assignDeclarationTypes(statement));
        node.value.params.forEach((param) => this._addTypeToParameter(param));
        this._addTypeToFunction(node.value, node.key);
        this._addJSDocTypeToClassMethod(node.value);
        node.tdType = node.value.tdType;

        return;
      }
      case 'Program':
        node.body.forEach((statement) => this._assignDeclarationTypes(statement));
        return;
      case 'ClassDeclaration': {
        node.body.body.forEach((statement) => this._assignDeclarationTypes(statement));
        return;
      }
      case 'ArrowFunctionExpression': {
        const body = node.body && node.body.body || [node.body];
        body.forEach((statement) => this._assignDeclarationTypes(statement));
        node.params.forEach((param) => this._addTypeToParameter(param));
        this._addTypeToFunction(node, node.id);
        this._addJSDocTypeToFunction(node);
        return;
      }
      case 'FunctionDeclaration': {
        node.body.body.forEach((statement) => this._assignDeclarationTypes(statement));
        node.params.forEach((param) => this._addTypeToParameter(param));
        this._addTypeToFunction(node, node.id);
        this._addJSDocTypeToFunction(node);
        return;
      }
      case 'ExpressionStatement': {
        this._assignDeclarationTypes(node.expression);
        return;
      }
      case 'ReturnStatement': {
        this._assignDeclarationTypes(node.argument);
        return;
      }
      case 'CallExpression': {
        node.arguments.forEach((argument) => this._assignDeclarationTypes(argument));
        return;
      }
      case 'VariableDeclaration': {
        node.declarations.forEach((declarator) => this._assignDeclarationTypes(declarator));
        return;
      }
      case 'VariableDeclarator': {
        if (node.init &&
          node.init.callee &&
          node.init.callee.name === 'require') {
          this._addTypeToRequire(node);
        } else if (node.init) {
          this._assignDeclarationTypes(node.init);
          this._addTypeToDeclarator(node);
        } else {
          this._addTypeToDeclarator(node);
        }
        return;
      }
      case 'ExportNamedDeclaration': {
        this._assignDeclarationTypes(node.declaration);
        return;
      }
      case 'ImportDeclaration': {
        this._addTypeToImport(node);
        return;
      }
      case 'ImportSpecifier': {
        throw new Error('Unhandled ImportSpecifier');
        return;
      }
      default:
        // console.log('unidentified node:', node.type);
        return;
    }
  }

  /**
   * New single node methods
   */
  _addJSDocTypeToFunction(node) {
    const foundType = this._jsDocDefs.find((typeDef) => {
      const commentEndLine = typeDef.loc.end.line;
      const functionStartLine = node.loc.start.line;

      return functionStartLine === commentEndLine + 1;
    });

    if (foundType) {
      const paramStrings = foundType.value.match(JSDOC_PARAMS_REGEX);
      const returns = (foundType.value.match(JSDOC_RETURNS_REGEX) || [])[1];

      paramStrings.forEach((paramString) => {
        const paramStringMatch = paramString.match(JSDOC_SINGLE_PARAM_REGEX);
        const param = node.params.find((functionParam) => functionParam.name === paramStringMatch[2]);

        if (param) {
          param.tdType = new TDType(paramStringMatch[1]);
        } else {
          console.log('undocumented param:', paramString);
        }
      });
      node.tdType = new TDType(returns);
      node.id.tdType = new TDType(returns);
    }
  }

  _addJSDocTypeToClassMethod(node) {
    const foundType = this._jsDocDefs.find((typeDef) => {
      const commentEndLine = typeDef.loc.end.line;
      const functionStartLine = node.loc.start.line;

      return functionStartLine === commentEndLine + 1;
    });

    if (foundType) {
      const paramStrings = foundType.value.match(JSDOC_PARAMS_REGEX);
      const returns = (foundType.value.match(JSDOC_RETURNS_REGEX) || [])[1];

      paramStrings.forEach((paramString) => {
        const paramStringMatch = paramString.match(JSDOC_SINGLE_PARAM_REGEX);
        const param = node.params.find((functionParam) => functionParam.name === paramStringMatch[2]);

        if (param) {
          param.tdType = new TDType(paramStringMatch[1]);
        } else {
          console.log('undocumented param:', paramString);
        }
      });
      node.tdType = new TDType(returns);
      node.tdType = new TDType(returns);
    }
  }

  _addTypeToImport(node) {
    const imports = this._ast.imports;
    const relevantImport = imports.find((anImport) => anImport.source === node.source);

    // Add types to the new tree
    const importTypeAdapter = new TDTypeAdapter(relevantImport.ast);
    const importAst = importTypeAdapter.ast;
  }

  _addTypeToRequire(node) {
    const importName = node.init.arguments[0] &&
      node.init.arguments[0].value.replace(/^\.\//, '');
    const imports = this._ast.imports;
    const relevantImport = imports.find((anImport) => anImport.source === importName);

    // Add types to the new tree
    const importTypeAdapter = new TDTypeAdapter(relevantImport.ast);
    const importAst = importTypeAdapter.ast;
  }

  _addTypeToDeclarator(node) {
    const foundType = this._typeDefs.find((typeDef) => this._positionEqual(node.id.loc.end, typeDef.loc.start, { adjacent: true }));

    node.id.tdType = foundType ? this._extractType(foundType.value, TYPEDEF_REGEX) : new TDType();
    node.tdType = foundType ? this._extractType(foundType.value, TYPEDEF_REGEX) : new TDType;
  }

  _addTypeToParameter(node) {
    const foundType = this._typeDefs.find((typeDef) => this._positionEqual(node.loc.end, typeDef.loc.start, { adjacent: true }));

    node.tdType = foundType ? this._extractType(foundType.value, TYPEDEF_REGEX) : new TDType();
  }

  _addTypeToFunction(node, identifier) {
    const foundType = this._typeDefs.find((typeDef) => {
      const lastParam = node.params[node.params.length - 1];
      const lastParamTypeString = lastParam &&
        lastParam.tdType &&
        lastParam.tdType.typeString ||
        '';
      const lastParamLoc = lastParam && lastParam.loc || identifier.loc;
      const typeDefIsAfterParams = (typeDef.loc.start.line > lastParamLoc.end.line) ||
        ((typeDef.loc.start.line === lastParamLoc.end.line) &&
          (typeDef.loc.start.column > lastParamLoc.end.column + lastParamTypeString.length));
      const typeDefIsBeforeBody = (typeDef.loc.end.line < node.body.loc.start.line) ||
        ((typeDef.loc.end.line === node.body.loc.start.line) &&
          (typeDef.loc.end.column < node.body.loc.start.column));
      return typeDefIsAfterParams && typeDefIsBeforeBody;
    });
    const type = foundType ? this._extractType(foundType.value, TYPEDEF_REGEX) : new TDType();

    node.tdType = type;
    if (identifier) {
      identifier.tdType = type;
    }
  }

  _findTypeDefComments(ast) {
    return ast.comments
      .filter((comment) => comment.value.match(TYPEDEF_REGEX));
  }

  _findJSDocDefComments(ast) {
    return ast.comments
      .filter((comment) => {
        const params = comment.value.match(JSDOC_PARAMS_REGEX);
        const returns = comment.value.match(JSDOC_RETURNS_REGEX);

        return params || returns;
      });
  }

  _extractType(inputString, regex, index=1) {
    return new TDType((inputString.match(regex)[index] || '').trim());
  }

  _positionEqual(pos1, pos2, options) {
    let pos1Line = pos1.line;
    let pos2Line = pos2.line;
    let pos1Column = pos1.column;
    let pos2Column = pos2.column;

    if (options.adjacent) {
      pos1Column++;
    }

    return pos1Line === pos2Line && pos1Column === pos2Column;
  }
}
