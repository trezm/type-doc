'use strict';

import { TDDeclaration } from './TDDeclaration';
import { TDScope } from './TDScope';

const TYPEDEF_REGEX = /^\s*t:([^\s]+)\s*$/;

export class TDTypeAdapter {
  constructor(ast) {
    this._ast = ast;
    this._typeDefs = this._findTypeDefComments(this._ast);
  }

  get ast() {
    this._assignDeclarationTypes(this._ast);
    return this._ast;
  }

  _assignDeclarationTypes(ast, parentScope) {
    let body = ast && ast.body;
    body = body.body || body;

    if (body) {
      const scope = new TDScope(parentScope);

      body.filter((statement) => Boolean(statement.body))
        .forEach((statement) => this._assignDeclarationTypes(statement, scope));

      this._typeDefs
        .forEach((typeDefComment) => {
          this._assignTypeForDeclaration(body, typeDefComment, scope);
          this._assignTypeForExportDeclaration(body, typeDefComment, scope);
          this._assignTypeForParameter(body, typeDefComment, scope);
          this._assignTypeForFunction(body, typeDefComment, scope);
          this._assginTypeForClassMethods(body, typeDefComment, scope);
        });
    }
  }

  /**
   * Note that this is not a pure function and _will_ alter the values within
   * the `ast` argument.
   */
  _assignTypeForDeclaration(ast, typeDef) {
    const foundStatement = ast
      .filter((statement) => statement.type === 'VariableDeclaration')
      .map((variableDeclaration) => variableDeclaration.declarations)
      .reduce((a, b) => a.concat(b), [])
      .find((variableDeclarator) => this._positionEqual(variableDeclarator.id.loc.end, typeDef.loc.start, { adjacent: true }));

    if (foundStatement) {
      foundStatement.id.tdType = typeDef.value.match(TYPEDEF_REGEX)[1];
    }
  }

  _assignTypeForExportDeclaration(ast, typeDef) {
    const foundStatement = ast
      .filter((statement) => statement.type === 'ExportNamedDeclaration')
      .map((exportNamedDeclaration) => exportNamedDeclaration.declaration.declarations || exportNamedDeclaration.declaration)
      .reduce((a, b) => a.concat(b), [])
      .find((variableDeclarator) => this._positionEqual(variableDeclarator.id.loc.end, typeDef.loc.start, { adjacent: true }));

    if (foundStatement) {
      foundStatement.id.tdType = typeDef.value.match(TYPEDEF_REGEX)[1];
    }
  }

  _assignTypeForParameter(ast, typeDef) {
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

  _assginTypeForClassMethods(ast, typeDef) {
    const foundMethod = ast
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

  _assignTypeForFunction(ast, typeDef) {
    const foundFunction = ast
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

  _findTypeDefComments(ast) {
    return ast.comments
      .filter((comment) => TYPEDEF_REGEX.test(comment.value));
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
