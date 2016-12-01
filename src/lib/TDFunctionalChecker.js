'use strict';

import { resolve } from 'path';
import { TDASTGenerator } from './TDASTGenerator';
import { TDScopeGenerator } from './TDScopeGenerator';
import { TDTypeAdapter } from './TDTypeAdapter';
import { ImmutableError, ScopeAssignmentError } from '../errors';

export class TDFunctionalChecker {
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
    new TDScopeGenerator(ast).generate();

    return this._check(ast);
  }

  _check(ast /* t:Object */, parentScope) {
    let body = ast && ast.body;
    body = body.body || body;

    if (body) {
      let errors = [];
      let scope;

      errors = errors.concat(this._checkImports(body, ast));

      errors = errors.concat(this._checkChildScopes(body, ast));
      errors = errors.concat(this._checkAssignments(body, ast));
      errors = errors.concat(this._checkFunctionCalls(body, ast));

      return errors;
    }
  }

  _checkChildScopes(statements, parent) {
    return statements.filter((statement) => Boolean(statement.body || (statement.value && statement.value.body)))
      .map((statement) => this._check(statement && statement.value || statement, statement.scope))
      .reduce((a, b) => a.concat(b), []);
  }

  _checkImports(statements, ast) {
    return (ast.imports || [])
      .map((importNode) => new TDFunctionalChecker(null, importNode.ast))
      .map((importTypeChecker) => importTypeChecker.run())
      .reduce((a, b) => a.concat(b), []);
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
        let errors = [];

        assignmentExpression.left.scope = assignmentExpression.scope;
        assignmentExpression.right.scope = assignmentExpression.scope;

        errors = errors.concat(this._checkImmutability(assignmentExpression));
        errors = errors.concat(this._checkDeclarationScope(assignmentExpression));
        errors = errors.concat(this._checkCallsForKnownSideEffects(assignmentExpression.left));
        errors = errors.concat(this._checkCallsForKnownSideEffects(assignmentExpression.right));

        return errors;
      })
      .reduce((a, b) => a.concat(b), [])
      .filter((errors) => Boolean(errors));
  }

  _checkFunctionCalls(statements) {
    return statements.filter((statement) => {
        return statement.type === 'ExpressionStatement' &&
          statement.expression.type === 'CallExpression';
      })
      .map((expressionStatement) => {
        expressionStatement.expression.scope = expressionStatement.scope;
        return this._checkCallsForKnownSideEffects(expressionStatement.expression);
      })
      .reduce((a, b) => a.concat(b), [])
      .filter((errors) => Boolean(errors));
  }

  _checkImmutability(statement) {
    if (statement.left.type === 'MemberExpression') {
      return [new ImmutableError(`Cannot make assignments to objects on line ${statement.loc.start.line}. Consider using \`Object.assign()\`.`, {
        file: this._ast.file
      })];
    }

    return [];
  }

  _checkCallsForKnownSideEffects(statement) {
    const hasCallee = statement.callee && statement.callee.object;
    const calleeDeclaration = hasCallee && statement.scope.findDeclarationForName(statement.callee.object && statement.callee.object.name);
    const isCalleeTyped = calleeDeclaration && calleeDeclaration.type;
    const isCalleeArray = isCalleeTyped && calleeDeclaration.type.typeString.match(/.*\[\]$/);
    const isInCurrentScope = calleeDeclaration && statement.scope.findDeclarationForName(statement.callee.object.name, true);
    const disallowedArrayMethods = [
      'push',
      'pop',
      'shift',
      'unshift'
    ];

    if (isCalleeArray &&
      !isInCurrentScope &&
      statement.callee.property.name &&
      disallowedArrayMethods.indexOf(statement.callee.property.name) > -1) {
      return [new ImmutableError(`Array.prototype.${statement.callee.property.name} is not allowed on line ${statement.loc.start.line} because it alters an immutable object.`, {
        file: this._ast.file
      })];
    }

    return [];
  }

  _checkDeclarationScope(statement) {
    let identifier;

    switch(statement.left.type) {
      case 'MemberExpression':
        identifier = statement.left.object.name;
        break;
      case 'Identifier':
        identifier = statement.left;
        break;
    }

    if (identifier) {
      const scopedDeclaration = statement.scope.findDeclarationForName(identifier, true);
      const nonScopedDeclaration = statement.scope.findDeclarationForName(identifier, false);

      if (scopedDeclaration !== nonScopedDeclaration) {
        return [new ScopeAssignmentError(`Cannot make assignments to objects declared outside of scope on line ${statement.loc.start.line}.`, {
          file: this._ast.file
        })];
      }
    }

    return [];
  }
}
