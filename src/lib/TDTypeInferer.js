'use strict';

import { TDDeclaration } from './TDDeclaration';
import { TDScope } from './TDScope';
import { TDType } from './TDType';
import { findTypeForNode } from './TDTypeResolver';

export class TDTypeInferer {
  static run(ast /* t:any */) /* t:any */ {
    // ast.imports = (ast.imports || [])
    //   .map((importedTree) => this.run(importedTree.ast));

    this.runOnNode(ast);

    return ast;
  }

  static runOnNode(node /* t:any */) /* t:any */ {
    switch (node && node.type) {
      case 'Program': {
        node.body.forEach((_node) => this.runOnNode(_node));
        break;
      }
      case 'ExpressionStatement': {
        this.runOnNode(node.expression);
        break;
      }
      case 'ClassDeclaration': {
        this._assignClassTypesAndSuperTypes(node);
        break;
      }
      case 'CallExpression': {
        /**
         * Note to self: We probably want to do some generic inference around this point.
         */
        if (!node.callee ||
          !node.callee.property) {
          break;
        }

        const expressionType = node.scope.findTypeForMember(node.callee);

        if (expressionType) {
          node.arguments.forEach((argument, index) => {
            argument.tdType = new TDType(expressionType.typeList[index]);
          });
        }

        node.arguments.forEach((argument) => this.runOnNode(argument));

        break;
      }
      case 'FunctionExpression':
      case 'ArrowFunctionExpression': {
        this._inferTypesInParams(node);
        this._inferTypesFromBodyAssignments(node);

        const paramTypes = node.params.map((param) => node.scope.findTypeForName(param.name).typeString);

        node.tdType = new TDType(paramTypes.concat([
          node.tdType && node.tdType.typeList[node.tdType.typeList.length - 1] || 'any'
        ]).join(' -> '));
        break;
      }
      case 'VariableDeclaration':
        node.declarations.forEach((variableDeclarator) => this.runOnNode(variableDeclarator));

        if (node.kind === 'const') {
          this._inferTypeFromConstAssignment(node);
        }

        break;
      case 'VariableDeclarator':
        this.runOnNode(node.init);

        const existingType = node.scope.findTypeForName(node.id && node.id.name);

        if (node.id.type === 'Identifier' &&
          node.init &&
          existingType &&
          existingType.isAny) {
          node.scope.updateDeclaration(new TDDeclaration(node.init.tdType, node.id.name));
        }
        break;
      default:
        // Do nothing
    }
  }

  static _assignClassTypesAndSuperTypes(node) {
    const superType = node.tdType.superType;

    if (superType) {
      const type = node.scope.findTypeForName(superType.typeString);

      if (type) {
        node.tdType.superType = type;
        node.tdType.superTypeString = type.typeString;
      }
    }
  }

  static _inferTypeFromConstAssignment(node) {
    node.declarations.forEach((variableDeclarator) => {
      const existingType = variableDeclarator.scope.findTypeForName(variableDeclarator.id && variableDeclarator.id.name);

      if (variableDeclarator.id.type === 'Identifier' &&
        (!variableDeclarator.id.tdType || variableDeclarator.id.tdType.isAny) &&
        variableDeclarator.init &&
        existingType &&
        existingType.isAny) {
        variableDeclarator.scope.updateDeclaration(new TDDeclaration(findTypeForNode(variableDeclarator.init), variableDeclarator.id.name));
      }
    });
  }

  static _inferTypesInParams(node) {
    const body = node.body && node.body.body || [node.body];

    node.params
      .forEach((param, index) => {
        const type = (!param.tdType || param.tdType.isAny) ? new TDType(node.tdType.typeList[index]) : param.tdType;
        node.scope.updateDeclaration(new TDDeclaration(type, param.name));
      });

    body.forEach((statement) => this.runOnNode(statement));
  }

  static _inferTypesFromBodyReturns(node) {

  }

  static _inferTypesFromBodyAssignments(node) {
    const body = node.body && node.body.body || [node.body];

    body
      .filter((statement) => statement.type === 'AssignmentExpression')
      .forEach((assignmentStatement) => {
        const scope = assignmentStatement.scope;
        const isLeftIdentifier = assignmentStatement.left.type === 'Identifier';
        const isRightIdentifier = assignmentStatement.right.type === 'Identifier';

        if (isLeftIdentifier &&
          isRightIdentifier) {
          const leftType = scope.findTypeForName(assignmentStatement.left.name);
          const rightType = scope.findTypeForName(assignmentStatement.right.name);

          if (!leftType.isAny && (rightType.isAny || TDType.isNonSpecified(rightType))) {
            scope.updateDeclaration(new TDDeclaration(leftType, assignmentStatement.right.name));
          }
        }
      });
  }
}
