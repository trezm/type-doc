'use strict';

import { TDDeclaration } from './TDDeclaration';
import { TDScope } from './TDScope';

const TYPEDEF_REGEX = /^\s*t:([^\s]+)\s*$/;
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

  _assignDeclarationTypes(ast, parentScope) {
    let body = (ast && ast.body) || (ast && ast.value && ast.value.body);
    body = body.body || body;

    if (body) {
      const scope = new TDScope(parentScope);

      body.filter((statement) => Boolean(statement.body || (statement.value && statement.value.body)))
        .forEach((statement) => this._assignDeclarationTypes(statement, scope));

      this._typeDefs
        .forEach((typeDefComment) => {
          this._assignTypeForDeclarationFromTypeDef(body, typeDefComment, scope);
          this._assignTypeForExportDeclarationFromTypeDef(body, typeDefComment, scope);
          this._assignTypeForParameterFromTypeDef(body, typeDefComment, scope);
          this._assignTypeForFunctionFromTypeDef(body, typeDefComment, scope);
          this._assginTypeForClassMethodsFromTypeDef(body, typeDefComment, scope);
        });

      this._jsDocDefs
        .forEach((jsDocComment) => {
          this._assignTypeForFunctionFromJSDoc(body, jsDocComment, scope);
          this._assignTypeForClassMethodsFromJSDoc(body, jsDocComment, scope);
        });
    }
  }

  /**
   * Note that this is not a pure function and _will_ alter the values within
   * the `ast` argument.
   */
  _assignTypeForDeclarationFromTypeDef(ast, typeDef) {
    const foundStatement = ast
      .filter((statement) => statement.type === 'VariableDeclaration')
      .map((variableDeclaration) => variableDeclaration.declarations)
      .reduce((a, b) => a.concat(b), [])
      .find((variableDeclarator) => this._positionEqual(variableDeclarator.id.loc.end, typeDef.loc.start, { adjacent: true }));

    if (foundStatement) {
      foundStatement.id.tdType = typeDef.value.match(TYPEDEF_REGEX)[1];
    }
  }

  _assignTypeForExportDeclarationFromTypeDef(ast, typeDef) {
    const foundStatement = ast
      .filter((statement) => statement.type === 'ExportNamedDeclaration')
      .map((exportNamedDeclaration) => exportNamedDeclaration.declaration.declarations || exportNamedDeclaration.declaration)
      .reduce((a, b) => a.concat(b), [])
      .find((variableDeclarator) => this._positionEqual(variableDeclarator.id.loc.end, typeDef.loc.start, { adjacent: true }));

    if (foundStatement) {
      foundStatement.id.tdType = typeDef.value.match(TYPEDEF_REGEX)[1];
    }
  }

  _assignTypeForParameterFromTypeDef(ast, typeDef) {
    const foundParam = ast
      .filter((statement) => {
        return statement.type === 'FunctionDeclaration' ||
          statement.type === 'MethodDefinition';
      })
      .map((declaration) => declaration.value || declaration)
      .map((functionDeclaration) => functionDeclaration.params)
      .reduce((a, b) => a.concat(b), [])
      .find((paramIdentifier) => this._positionEqual(paramIdentifier.loc.end, typeDef.loc.start, { adjacent: true }));

    if (foundParam) {
      foundParam.tdType = typeDef.value.match(TYPEDEF_REGEX)[1];
    }
  }

  _assginTypeForClassMethodsFromTypeDef(ast, typeDef) {
    ast
      .filter((statement) => statement.type === 'MethodDefinition')
      .forEach((methodDefinition) => {
        const functionExpression = methodDefinition.value;
        const lastParam = functionExpression.params[functionExpression.params.length - 1];
        const lastParamTypeString = lastParam && lastParam.tdType || '';
        const lastParamLoc = (lastParam && lastParam.loc) ||
          (methodDefinition.key && methodDefinition.key.loc);
        const typeDefIsAfterParams = (typeDef.loc.start.row > lastParamLoc.end.row) ||
          ((typeDef.loc.start.row === lastParamLoc.end.row) &&
           (typeDef.loc.start.column > lastParamLoc.end.column + lastParamTypeString.length));
        const typeDefIsBeforeBody = (typeDef.loc.end.row < functionExpression.body.loc.start.row) ||
          ((typeDef.loc.end.row === functionExpression.body.loc.start.row) &&
           (typeDef.loc.end.column < functionExpression.body.loc.start.column));

        if (typeDefIsAfterParams &&
            typeDefIsBeforeBody) {
          methodDefinition.tdType = typeDef.value.match(TYPEDEF_REGEX)[1];
          methodDefinition.key.tdType = typeDef.value.match(TYPEDEF_REGEX)[1];
        }
      });
  }

  _assignTypeForFunctionFromTypeDef(ast, typeDef) {
    ast
      .filter((statement) => statement.type === 'FunctionDeclaration')
      .forEach((functionDeclaration) => {
        const lastParam = functionDeclaration.params[functionDeclaration.params.length - 1];
        const lastParamTypeString = lastParam && lastParam.tdType || '';
        const lastParamLoc = lastParam && lastParam.loc || functionDeclaration.id.loc;
        const typeDefIsAfterParams = (typeDef.loc.start.row > lastParamLoc.end.row) ||
          ((typeDef.loc.start.row === lastParamLoc.end.row) &&
           (typeDef.loc.start.column > lastParamLoc.end.column + lastParamTypeString.length));
        const typeDefIsBeforeBody = (typeDef.loc.end.row < functionDeclaration.body.loc.start.row) ||
          ((typeDef.loc.end.row === functionDeclaration.body.loc.start.row) &&
           (typeDef.loc.end.column < functionDeclaration.body.loc.start.column));

        if (typeDefIsAfterParams &&
            typeDefIsBeforeBody) {
          functionDeclaration.tdType = typeDef.value.match(TYPEDEF_REGEX)[1];
          functionDeclaration.id.tdType = typeDef.value.match(TYPEDEF_REGEX)[1];
        }
      });
  }

  _assignTypeForClassMethodsFromJSDoc(ast, typeDef) {
    ast
      .filter((statement) => statement.type === 'MethodDefinition')
      .forEach((methodDefinition) => {
        const functionExpression = methodDefinition.value;
        const commentEndLine = typeDef.loc.end.line;
        const functionStartLine = functionExpression.loc.start.line;

        if (functionStartLine === commentEndLine + 1) {
          const paramStrings = typeDef.value.match(JSDOC_PARAMS_REGEX);
          const returns = (typeDef.value.match(JSDOC_RETURNS_REGEX) || [])[1];

          paramStrings.forEach((paramString) => {
            const paramStringMatch = paramString.match(JSDOC_SINGLE_PARAM_REGEX);
            const param = functionExpression.params.find((functionParam) => functionParam.name === paramStringMatch[2]);

            if (param) {
              param.tdType = paramStringMatch[1];
            } else {
              console.log('undocumented param:', paramString);
            }
          });
          functionExpression.tdType = returns;
        }
      });
  }

  _assignTypeForFunctionFromJSDoc(ast, typeDef) {
    ast
      .filter((statement) => statement.type === 'FunctionDeclaration')
      .forEach((functionDeclaration) => {
        const commentEndLine = typeDef.loc.end.line;
        const functionStartLine = functionDeclaration.loc.start.line;

        if (functionStartLine === commentEndLine + 1) {
          const paramStrings = typeDef.value.match(JSDOC_PARAMS_REGEX);
          const returns = (typeDef.value.match(JSDOC_RETURNS_REGEX) || [])[1];

          paramStrings.forEach((paramString) => {
            const paramStringMatch = paramString.match(JSDOC_SINGLE_PARAM_REGEX);
            const param = functionDeclaration.params.find((functionParam) => functionParam.name === paramStringMatch[2]);

            if (param) {
              param.tdType = paramStringMatch[1];
            } else {
              console.log('undocumented param:', paramString);
            }
          });
          functionDeclaration.tdType = returns;
          functionDeclaration.id.tdType = returns;
        }
      });
  }

  _findTypeDefComments(ast) {
    return ast.comments
      .filter((comment) => TYPEDEF_REGEX.test(comment.value));
  }

  _findJSDocDefComments(ast) {
    return ast.comments
      .filter((comment) => JSDOC_PARAMS_REGEX.test(comment.value) || JSDOC_RETURNS_REGEX.test(comment.value));
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
