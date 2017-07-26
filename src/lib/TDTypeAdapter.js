'use strict';

import { TDClassType } from './TDClassType';
import { TDInterfaceType } from './TDInterfaceType';
import { TDScope } from './TDScope';
import { TDType } from './TDType';

const TYPEDEF_REGEX = /^\s*t:(.+)$/;
const CLASSDEF_REGEX = /\s*class\s*::\s*[^\s]+(?:\s*=>\s*[^\s]+\s*)*\s*/;
const CLASSMETHODDEF_REGEX = /^\s\s+[^\s]+\s*::\s*[^\s][^\n]*$/gm;
const JSDOC_PARAMS_REGEX = /@param\s*\{[^\}]+\}\s*[^\s]+/g;
const JSDOC_CLASSES_REGEX = /@class\s*([^\s\]]+)/g;
const JSDOC_SINGLE_PARAM_REGEX = /@param\s*\{([^\}]+)\}\s*\[?([^\s\]]+)\]?/;
const JSDOC_SINGLE_CLASS_REGEX = /@class\s*([^\s\]]+)/;
const JSDOC_MEMBEROF_REGEX = /@memberof\s*([^\s\]]+)/i;
const JSDOC_RETURNS_REGEX = /@returns\s*\{([^\}]+)\}/;
const JSDOC_TYPE_REGEX = /@type\s*\{([^\}]+)\}/;
const JSDOC_TYPEDEF_REGEX = /@typedef\s*\{([^\}]+)\}\s*\[?([^\s\]]+)\]?/;
const JSDOC_PROPERTY_REGEX = /@property\s*\{([^\}]+)\}\s*\[?([^\s\]]+)\]?/g;
const JSDOC_SINGLE_PROPERTY_REGEX = /@property\s*\{([^\}]+)\}\s*\[?([^\s\]]+)\]?/;

let adapterCache = {};
export function clearCache() {
  adapterCache = {};
}
export class TDTypeAdapter {
  constructor(ast) {
    this._ast = ast;

    this._globalClasses = {};
    adapterCache[this._ast.file] = this;

    this._typeDefs = this._findTypeDefComments(this._ast);
    this._classDefs = this._findClassDefComments(this._ast);
    this._jsDocDefs = this._findJSDocDefComments(this._ast);

    this._assignDeclarationTypes(this._ast);
    this._generateOrphanTypes(this._ast, this._jsDocDefs);
  }

  get ast() {
    return this._ast;
  }

  _assignDeclarationTypes(node) {
    if (!node) {
      return;
    }

    switch (node.type) {
      case 'MethodDefinition': {
        node.value.body.body.forEach((statement) => this._assignDeclarationTypes(statement));
        node.value.params.forEach((param) => this._addTypeToParameter(param));
        this._addTypeToFunction(node.value, node.key);
        this._addJSDocTypeToClassMethod(node);

        let signature = node.value.params.map((param) => param.tdType.typeString);
        signature = signature.concat([node.value.tdType.typeString]);

        node.tdType = node.value.tdType;

        return;
      }
      case 'Program':
        node.body.forEach((statement) => this._assignDeclarationTypes(statement));
        return;
      case 'ClassDeclaration': {
        this._addTypeToClass(node);
        this._addJSDocTypeToClass(node);
        node.body.body.forEach((statement) => this._assignDeclarationTypes(statement));
        return;
      }
      case 'FunctionExpression':
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
          this._addJSDocTypeToDeclarator(node);
        } else {
          this._addTypeToDeclarator(node);
          this._addJSDocTypeToDeclarator(node);
        }
        return;
      }
      case 'ExportNamedDeclaration': {
        /**
         * If there is no declaration, then it's an export { blah } from './blah'
         * so we should treat it as an import first.
         */
        if (!node.declaration) {
          this._addTypeToImport(node);
        } else {
          this._assignDeclarationTypes(node.declaration);
        }
        return;
      }
      case 'ImportDeclaration': {
        this._addTypeToImport(node);
        return;
      }
      case 'ImportSpecifier': {
        throw new Error('Unhandled ImportSpecifier');
      }
      default:
        return;
    }
  }

  _generateOrphanTypes(ast, comments) {
    comments
      .filter((comment) => comment.value.match(JSDOC_TYPEDEF_REGEX))
      .forEach((comment) => {
        const typeString = (comment.value.match(JSDOC_TYPEDEF_REGEX) || [])[2];
        const propComments = comment.value.match(JSDOC_PROPERTY_REGEX) || [];

        const interfaceType = new TDInterfaceType(typeString);
        propComments.map((propComment) => propComment.match(JSDOC_SINGLE_PROPERTY_REGEX) || [])
          .filter((match) => match && match.length)
          .forEach((match) => {
            const typeString = match[1];
            const name = match[2];

            interfaceType.addPropertyOrMethod(name, typeString);
          });

        ast.orphanTypes = ast.orphanTypes || [];
        ast.orphanTypes.push({
          name: typeString,
          type: interfaceType
        });
      });
  }

  /**
   * New single node methods
   */
  _addJSDocTypeToDeclarator(node) {
    const foundType = this._jsDocDefs.find((typeDef) => {
      const commentEndLine = typeDef.loc.end.line;
      const declaratorStartLine = node.loc.start.line;

      return declaratorStartLine === commentEndLine + 1;
    });

    if (foundType) {
      const type = (foundType.value.match(JSDOC_TYPE_REGEX) || [])[1] || 'any';

      node.tdType = new TDType(type);
    }
  }

  _addJSDocTypeToFunction(node) {
    const foundType = this._jsDocDefs.find((typeDef) => {
      const commentEndLine = typeDef.loc.end.line;
      const functionStartLine = node.loc.start.line;

      return functionStartLine === commentEndLine + 1;
    });

    if (foundType) {
      const paramStrings = foundType.value.match(JSDOC_PARAMS_REGEX) || [];
      const returns = (foundType.value.match(JSDOC_RETURNS_REGEX) || [])[1] || 'any';

      let signature = node.params.map((param) => {
        const matchingDoc = paramStrings.find((paramString) => param.name === paramString.match(JSDOC_SINGLE_PARAM_REGEX)[2]);

        if (matchingDoc) {
          const paramStringMatch = matchingDoc.match(JSDOC_SINGLE_PARAM_REGEX);
          param.tdType = new TDType(paramStringMatch[1]);
          return paramStringMatch[1];
        } else {
          param.tdType = TDType.any();
          return 'any';
        }
      });

      signature = signature.concat([returns]);

      node.tdType = new TDType(signature.join(' -> '));

      // Anonymous functions won't have id defined.
      if (node.id) {
        node.id.tdType = node.tdType;
      }
    }
  }

  _addJSDocTypeToClassMethod(node) {
    const foundType = this._jsDocDefs.find((typeDef) => {
      const commentEndLine = typeDef.loc.end.line;
      const functionStartLine = node.loc.start.line;

      return functionStartLine === commentEndLine + 1;
    });

    if (foundType) {
      const paramStrings = foundType.value.match(JSDOC_PARAMS_REGEX) || [];
      const returns = (foundType.value.match(JSDOC_RETURNS_REGEX) || [])[1] || 'any';
      const memberMatch = foundType.value.match(JSDOC_MEMBEROF_REGEX);
      const memberString = memberMatch && memberMatch[1];
      const ownerClass = this._globalClasses[memberString];

      let signature = [];

      paramStrings.forEach((paramString) => {
        const paramStringMatch = paramString.match(JSDOC_SINGLE_PARAM_REGEX);
        const param = node.value.params.find((functionParam) => functionParam.name === paramStringMatch[2]);

        if (param) {
          signature = signature.concat(paramStringMatch[1]);
          param.tdType = new TDType(paramStringMatch[1]);
        } else {
          // console.log('undocumented param:', paramString);
          // annoying... ignore this.
        }
      });

      signature = signature.concat([returns]);

      node.tdType = new TDType(signature.join(' -> '));
      node.value.tdType = node.tdType;

      if (ownerClass) {
        ownerClass.addPropertyOrMethod(node.key.name, node.tdType.typeString);
      }
    }
  }

  _addJSDocTypeToClass(node) {
    const foundType = this._jsDocDefs.find((typeDef) => {
      const commentEndLine = typeDef.loc.end.line;
      const functionStartLine = node.loc.start.line;

      return functionStartLine === commentEndLine + 1;
    });

    if (foundType) {
      const classMatch = foundType.value.match(JSDOC_SINGLE_CLASS_REGEX);
      const classString = classMatch && classMatch[1];
      const memberMatch = foundType.value.match(JSDOC_MEMBEROF_REGEX);
      const memberString = memberMatch && memberMatch[1];
      const globalIdentifier = (memberString ? memberString + '.' : '') + classString;
      const identifier = memberString ? memberString + ':' + classString : classString;
      node.tdType = new TDClassType(identifier);

      this._globalClasses[globalIdentifier] = node.tdType;
    }
  }

  _addTypeToClass(node) {
    const foundType = this._classDefs.find((typeDef) => {
      const commentEndLine = typeDef.loc.end.line;
      const functionStartLine = node.loc.start.line;

      return functionStartLine === commentEndLine + 1;
    });

    if (!foundType) {
      let typeString = node.id && node.id.name;
      typeString += node.superClass ? ' => ' + node.superClass.name : '';
      node.tdType = new TDType(typeString);
      return;
    }

    const trimmedComment = foundType
      .value
      .replace(/^\s*\*/gm, '');
    const classMatch = (trimmedComment
      .match(CLASSDEF_REGEX) || [])
      .map((property) => property.split('::')
        .map((prop) => prop.trim()));
    const classProperties = (trimmedComment
      .match(CLASSMETHODDEF_REGEX) || [])
      .map((property) => property.split('::')
        .map((prop) => prop.trim()))
      .filter((property) => property[0] !== 'class');

    if (classMatch && classMatch.length) {
      const classType = new TDClassType(classMatch[0][1]);

      classProperties
        .forEach((prop) => classType.addPropertyOrMethod(prop[0], prop[1]));

      node.tdType = classType;
    }
  }

  _addTypeToImport(node) {
    const imports = this._ast.imports;
    const relevantImport = imports.find((anImport) => anImport.source === node.source);

    // Add types to the new tree
    const importTypeAdapter = adapterCache[relevantImport.ast.file] || new TDTypeAdapter(relevantImport.ast);
    const importAst = importTypeAdapter.ast;
  }

  _addTypeToRequire(node) {
    // Require is probably an expression instead of a value, so ditch early.
    if (node.init.arguments[0] &&
      !node.init.arguments[0].value) {
      return;
    }

    const importName = node.init.arguments[0] &&
      node.init.arguments[0].value.replace(/^\.\//, '');
    const imports = this._ast.imports;
    const relevantImport = imports.find((anImport) => anImport.source === importName);

    if (relevantImport) {
      // Add types to the new tree
      const importTypeAdapter = adapterCache[relevantImport.ast.file] || new TDTypeAdapter(relevantImport.ast);
      const importAst = importTypeAdapter.ast;
    }
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
    if (!identifier) {
      node.tdType = TDType.any();
      return;
    }

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

    const type = foundType ? this._extractType(foundType.value, TYPEDEF_REGEX).typeString : 'any';
    let paramTypes = (node.params || [new TDType()]).map((param) => {
      const typeString = param.tdType.isAny ? 'any' : param.tdType.typeString;
      return typeString.indexOf('->') > -1 ? `(${typeString})` : typeString;
    });

    if (!paramTypes.length) { paramTypes = ['any']; }

    node.tdType = new TDType(paramTypes.concat([type]).join(' -> '));
    if (identifier) {
      identifier.tdType = node.tdType;
    }
  }

  _findTypeDefComments(ast) {
    return ast.comments
      .filter((comment) => comment.value.match(TYPEDEF_REGEX));
  }

  _findClassDefComments(ast) {
    return ast.comments
      .filter((comment) => comment
        .value
        .replace(/^\s*\*/gm, '')
        .replace(/\n/g, '')
        .match(CLASSDEF_REGEX));
  }

  _findJSDocDefComments(ast) {
    return ast.comments
      .filter((comment) => {
        const classes = comment.value.match(JSDOC_CLASSES_REGEX);
        const params = comment.value.match(JSDOC_PARAMS_REGEX);
        const returns = comment.value.match(JSDOC_RETURNS_REGEX);
        const types = comment.value.match(JSDOC_TYPE_REGEX);
        const typedefs = comment.value.match(JSDOC_TYPEDEF_REGEX);

        return classes || params || returns || types || typedefs;
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
