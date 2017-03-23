'use strict';

import { TDDeclaration } from './TDDeclaration';
import { TDScope } from './TDScope';
import { TDType } from './TDType';

export class TDTypeInferer {
  static run(ast /* t:any */) /* t:any */ {
    // ast.imports = (ast.imports || [])
    //   .map((importedTree) => this.run(importedTree.ast));

    this.runOnNode(ast);

    return ast;
  }

  static runOnNode(node /* t:any */) /* t:any */ {
    switch (node.type) {
      case 'Program': {
        node.body.forEach((_node) => this.runOnNode(_node));
        break;
      }
      case 'ExpressionStatement': {
        this.runOnNode(node.expression);
        break;
      }
      case 'CallExpression': {
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
        const body = node.body && node.body.body || [node.body];
        node.params
          .forEach((param, index) => {
            const type = (!param.tdType || param.tdType.isAny) ? new TDType(node.tdType.typeList[index]) : param.tdType;
            node.scope.updateDeclaration(new TDDeclaration(type, param.name));
          });

        body.forEach((statement) => this.runOnNode(statement));
        break;
      }
      default:
        // Do nothing
    }
  }
}
