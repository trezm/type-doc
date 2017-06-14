'use strict';

import { resolve } from 'path';
import {
  TDASTGenerator,
  clearCache as clearASTCache
} from './TDASTGenerator';
import { TDClassType } from './TDClassType';
import {
  TDScopeGenerator,
  clearCache as clearScopeCache
} from './TDScopeGenerator';
import {
  TDTypeAdapter,
  clearCache as clearTypeCache
} from './TDTypeAdapter';
import { TDTypeInferer } from './TDTypeInferer';
import { TDType } from './TDType';
import {
  TypeMismatchError,
  UndeclaredError
} from '../errors';
import { config } from './TDConfigSingleton';
import { profile } from './TDProfiler';
import { mergeTypes } from './TDTypeStringTokenizer';
import {
  findTypeForNode,
  findReturnType
 } from './TDTypeResolver';

String.prototype.capitalize = function() {
  return this.charAt(0).toUpperCase() + this.slice(1);
};

const DEFAULT_OPTIONS = {
  strictClassChecks: false,
  silenceProfiler: true
};

let errorCache = {};
export function clearCache() {
  errorCache = {};
  clearASTCache();
  clearTypeCache();
  clearScopeCache();
}
export class TDTypeChecker {
  constructor(file, ast) {
    this._file = file;
    this._ast = ast;
  }

  run(options=DEFAULT_OPTIONS) {
    options = Object.assign({}, Object.assign({}, DEFAULT_OPTIONS), options);

    Object.getOwnPropertyNames(options).forEach((key) => config[key] = options[key]);

    this.options = Object.assign(Object.assign({}, DEFAULT_OPTIONS), options);

    if (!options.clearCache) {
      clearCache();
      options.clearCache = true;
    }

    this._generateAST();

    let errors = errorCache[this._ast.file] || this._checkNode(this._ast, []);
    errorCache[this._ast.file] = errors;

    errors = errors.concat((this._ast.imports || [])
      .map((importedTree) => {
        return errorCache[importedTree.ast.file] || new TDTypeChecker(importedTree.ast.file, importedTree.ast).run(options);
      })
      .reduce((a, b) => a.concat(b), []));

    profile('Type Checking', options.showProfiling);
    return errors;
  }

  runSingleFile(file, options=DEFAULT_OPTIONS) {
    if (file) {
      this._file = file;
      this._ast = null;
    }

    options = Object.assign({}, Object.assign({}, DEFAULT_OPTIONS), options);

    Object.getOwnPropertyNames(options).forEach((key) => config[key] = options[key]);

    this.options = Object.assign(Object.assign({}, DEFAULT_OPTIONS), options);

    if (!options.clearCache) {
      clearCache();
      options.clearCache = true;
    }

    this._generateAST();

    return this._checkNode(this._ast, []);
  }

  _generateAST() {
    let ast = this._ast;
    let tdTypeAdapter;

    if (!ast) {
      const tdAstGenerator = new TDASTGenerator(this._file, this.options);

      ast = tdAstGenerator.ast;
      ast.file = resolve(this._file);
    }
    profile('AST Generation', this.options.showProfiling);

    tdTypeAdapter = new TDTypeAdapter(ast);
    ast = tdTypeAdapter.ast;
    this._ast = ast;

    profile('Type Adaptation', this.options.showProfiling);
    new TDScopeGenerator(ast).generate(ast.scope);

    profile('Scope Generation', this.options.showProfiling);
    this._ast = TDTypeInferer.run(this._ast);

    profile('Type Inference', this.options.showProfiling);
  }

  _checkNode(node, errors=[]) {
    // TODO: Short circuit if for some reason there is no
    if (!node) {
      return errors;
    }

    try {
      switch (node.type) {
        case 'MethodDefinition': {
          errors = errors.concat(this._checkClassNodeSignature(node));

          return errors.concat(this._checkNode(node.value));
        }
        case 'Program':
          return errors.concat(
            node
              .body
              .map((declarator) => this._checkNode(declarator))
              .reduce((a, b) => a.concat(b), []));
        case 'BlockStatement': {
          return errors.concat(
            node
              .body
              .map((statement) => this._checkNode(statement))
              .reduce((a, b) => a.concat(b), []));
        }
        case 'ClassDeclaration': {
          return errors.concat(
            node
              .body
              .body
              .map((statement) => this._checkNode(statement))
              .reduce((a, b) => a.concat(b), []));
        }
        case 'FunctionExpression': {
          errors = errors.concat(this._checkNode(node.body));
          errors = errors.concat(this._checkFunctionReturnType(node));

          return errors;
        }
        case 'ArrowFunctionExpression': {
          const bodyErrors = (node.body && node.body.body || [node.body])
            .map((bodyNode) => this._checkNode(bodyNode))
            .reduce((a, b) => a.concat(b));

          return errors.concat(bodyErrors);
        }
        case 'FunctionDeclaration': {
          errors = errors.concat(this._checkNode(node.body));
          errors = errors.concat(this._checkFunctionReturnType(node));

          return errors;
        }
        case 'ExportNamedDeclaration': {
          if (node.declaration) {
            return errors.concat(this._checkNode(node.declaration));
          } else {
            return errors;
          }
        }
        case 'ImportDeclaration': {
          return errors;
        }
        case 'ImportSpecifier': {
          return errors;
        }
        case 'VariableDeclaration': {
          return errors.concat(
            node
              .declarations
              .map((declarator) => this._checkNode(declarator))
              .reduce((a, b) => a.concat(b), []));
        }
        case 'VariableDeclarator': {
          if (node.init &&
            node.init.callee &&
            node.init.callee.name === 'require') {

          } else if (node.init) {
            errors = errors.concat(this._checkNode(node.init));
          }

          return errors.concat(this._checkDeclaratorInitType(node));
        }
        case 'ReturnStatement': {
          errors = errors.concat(this._checkNode(node.argument));

          return errors;
        }
        case 'BinaryExpression': {
          errors = errors.concat(this._checkNode(node.left));
          errors = errors.concat(this._checkNode(node.right));

          return errors;
        }
        case 'ExpressionStatement': {
          return errors.concat(this._checkNode(node.expression));
        }
        case 'AssignmentExpression': {
          errors = errors.concat(this._checkNode(node.left));
          errors = errors.concat(this._checkNode(node.right));

          return errors
            .concat(this._checkAssignmentExpressionTypes(node))
            .concat(this._checkMemberAssignmentType(node));
        }
        case 'CallExpression': {
          /**
           * Okay, so this is a little interesting actually, basically for a call expression the
           * callee will either be:
           *  - An Identifier
           *  - A MemberExpression
           *    - For member expressions, they can be infinitely chained
           *    - A MemberExpression consists of the last property under `property` and then all
           *        of the preceding access under another MemberExpression under `object`.
           *    - When both `object` and `property` are identifiers, the chain has ended
           *
           * With this in mind, we should be checking the type access of everything in _reverse order_
           * and passing the type down. In other words, we recursively go through the tree until we reach
           * (identifier,identifier), test the type, then return the type of the property along with any errors
           * and continue this process until we return here.
           */
          // errors = errors.concat(this._checkCallType(node));
          errors = errors.concat(this._checkCallArgumentTypes(node));
          errors = errors.concat(this._checkNode(node.callee));

          return errors.concat(
            node
              .arguments
              .map((argument) => this._checkNode(argument))
              .reduce((a, b) => a.concat(b), []))
              .filter((val) => Boolean(val));
        }
        case 'MemberExpression':
          if (node.object.type !== 'Identifier') {
            errors = errors.concat(this._checkNode(node.object));
            errors = errors.concat(this._checkNode(node.property));
          }

          return errors.concat(this._checkMemberExpression(node));
        default:
          return errors;
      }
    } catch (e) {
      console.error('[TypeDoc]', e);
      return errors;
    }
  }

  /**
   * New check methods
   */
  _checkMemberExpression(node, errors=[]) {
    let functionDeclaration;
    let functionType;

    if (node.object.type === 'ThisExpression') {
      functionType = node.scope.findTypeForStaticMember(node);
    } else {
      functionType = node.scope.findTypeForMember(node);
    }

    const objectType = findTypeForNode(node.object);

    if (!objectType) {
      return errors;
    }

    console.log('this.options.strictClassChecks:', this.options.strictClassChecks);
    if (!functionType &&
      !objectType.isAny &&
      this.options.strictClassChecks) {
      return errors.concat([new UndeclaredError(`${node.property.name} is not a declared property of class ${objectType.typeString} on line ${node.loc.start.line}`, {
        property: node.property.name,
        class: objectType.typeString,
        start: {
          line: node.loc.start.line,
          column: node.loc.start.column
        },
        end: {
          line: node.loc.end.line,
          column: node.loc.end.column
        }
      })]);
    }

    return errors;
  }

  _checkDeclaratorInitType(node, errors=[]) {
    if (!node.id || !node.init) {
      return errors;
    }

    node.id.scope = node.scope;
    node.init.scope = node.scope;

    let declaratorType;
    let assignmentType;

    if (node.init &&
      node.init.callee &&
      node.init.callee.name === 'require') {
      declaratorType = findTypeForNode(node.id);
      assignmentType = node.scope.findTypeForName(node.id.name) || TDType.any();
    } else {
      declaratorType = findTypeForNode(node.id);
      assignmentType = findTypeForNode(node.init);
    }

    const error = this._testTypes(declaratorType, assignmentType, node);

    return (error && errors.concat([error])) || errors;
  }

  _checkAssignmentExpressionTypes(node, errors=[]) {
    node.left.scope = node.scope;
    node.right.scope = node.scope;

    const declaratorType = findTypeForNode(node.left);
    const assignmentType = findTypeForNode(node.right);

    const error = this._testTypes(declaratorType, assignmentType, node);

    return (error && errors.concat([error])) || errors;
  }

  _checkMemberAssignmentType(node, errors=[]) {
    if (node.left.type !== 'MemberExpression') {
      return errors;
    }

    const classDeclaration = node.scope.findThisDef();

    if (!classDeclaration) {
      return errors;
    }

    const classPropertyDef = classDeclaration &&
      classDeclaration.type.getPropertyTypeForName &&
      classDeclaration.type.getPropertyTypeForName(node.left.property && node.left.property.name);

    if (!classPropertyDef &&
      this.options.strictClassChecks) {
      return errors.concat([new UndeclaredError(`${node.left.property.name} is undeclared on the class ${classDeclaration.type.typeString} at line ${node.loc.start.line}`, {
        property: node.left.property.name,
        class: classDeclaration.type.typeString,
        start: {
          line: node.loc.start.line,
          column: node.loc.start.column
        },
        end: {
          line: node.loc.end.line,
          column: node.loc.end.column
        }
      })]);
    }

    const error = this._testTypes(classPropertyDef, findTypeForNode(node.right), node);

    return (error && errors.concat([error])) || errors;
  }

  _checkFunctionReturnType(node, errors=[]) {
    const functionReturnType = new TDType(node.tdType && node.tdType.typeList[node.tdType.typeList.length - 1]);
    const bodyReturnType = findReturnType(node.body);

    const error = this._testTypes(functionReturnType, bodyReturnType, node);

    return (error && errors.concat([error])) || errors;
  }

  _checkCallType(node, errors=[]) {
    const objectType = findTypeForNode(node);
    // Remove?
  }

  _checkCallArgumentTypes(node, errors=[]) {
    const scope = node.scope;
    let functionDeclaration;
    let functionType;

    if (node.callee.type === 'Identifier') {
      functionType = scope.findTypeForName(node.callee.name);
    } else if (node.callee.type === 'Super') {
      // TODO: Handle super calls
      return errors;
    } else if (node.callee.type === 'CallExpression') {
      functionType = findTypeForNode(node.callee);
    } else if (node.callee.object.type === 'ThisExpression') {
      functionType = scope.findTypeForStaticMember(node.callee);
    } else {
      functionType = scope.findTypeForMember(node.callee);
    }

    // Short circuit, it's probably a call with the type of "Function"
    if (functionType && functionType.typeList.length === 1) {
      return errors;
    }

    const genericTypes = {};
    return functionType && node.arguments.map((argument, index) => {
      // TODO: Short circuit if for some reason there is no argumentDeclarationType
      const argumentDeclarationType = findTypeForNode(argument, argument.scope || scope) || TDType.any();
      const paramType = new TDType(functionType.typeList[index]);
      let genericsErrors = this._checkNode(argument);

      /* Assign any types to generics */
      if (paramType.typeList.length !== argumentDeclarationType.typeList.length) {
        // Throw an error
      }

      paramType
        .typeList
        .forEach((typeString, index) => {
          if (genericTypes[typeString] && argumentDeclarationType.isGeneric) {
            genericTypes[argumentDeclarationType.typeList[index]] = typeString;
          } else if (genericTypes[typeString] &&
            genericTypes[typeString] !== argumentDeclarationType.typeList[index]) {
            genericsErrors = genericsErrors.concat([
              new TypeMismatchError(`Generic type '${typeString}' is inconsistent at line ${node.loc.start.line}`, {
                type1: genericTypes[typeString],
                type2: argumentDeclarationType.typeList[index],
                start: {
                  line: node.loc.start.line,
                  column: node.loc.start.column
                },
                end: {
                  line: node.loc.end.line,
                  column: node.loc.end.column
                }
              })
            ]);
          } else if (TDType.testForGeneric(typeString)) {
            genericTypes[typeString] = argumentDeclarationType.typeList[index];
          }
        });

      // Do we need to wrap TDType here...
      // return new TDType(this._followGenericChain(genericTypes, returnType) || returnType || TDType.any());
      if (genericsErrors.length) {
        return genericsErrors;
      }

      if (paramType.isGeneric) {
        genericTypes[paramType.typeString] = argumentDeclarationType.typeString;
      }

      return this._testTypes(paramType, argumentDeclarationType, node);
    })
    .reduce((a, b) => a.concat(b), [])
    .filter((a) => Boolean(a));
  }

  _checkClassNodeSignature(node, errors=[]) {
    if (node.key.name === 'constructor') {
      return errors;
    }

    const classDeclaration = node.scope.findThisDef();
    const classMethodDef = classDeclaration &&
      classDeclaration.type.getMethodTypeForName &&
      classDeclaration.type.getMethodTypeForName(node.key.name);

    if (classDeclaration &&
      !classMethodDef &&
      this.options.strictClassChecks) {
      return errors.concat([new UndeclaredError(`${node.key.name} was not declared ahead of time on the class ${classDeclaration.type.typeString} at line ${node.loc.start.line}`, {
        method: node.key.name,
        class: classDeclaration.type.typeString,
        start: {
          line: node.loc.start.line,
          column: node.loc.start.column
        },
        end: {
          line: node.loc.end.line,
          column: node.loc.end.column
        }
      })]);
    }

    const error = this._testTypes(classMethodDef, node.tdType, node);

    if (error) {
      errors = errors.concat([error]);
    }

    return errors;
  }

/**
 * Legacy check methods
 */

  _testTypes(expectedType=TDType.any() /* t:TDType */, actualType=TDType.any() /* t:TDType */, node /* t:Node */) /* t:TypeMismatchError? */ {
    if (!actualType.isSubclassOf(expectedType)) {
      return new TypeMismatchError(`Type mismatch in declaration on line ${node.loc.start.line}`, {
        actualType: actualType.typeString,
        expectedType: expectedType.typeString,
        file: this._ast.file,
        start: {
          line: node.loc.start.line,
          column: node.loc.start.column
        },
        end: {
          line: node.loc.end.line,
          column: node.loc.end.column
        }
      });
    }

    return;
  }
}
