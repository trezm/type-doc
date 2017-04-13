'use strict';

import { resolve } from 'path';
import { readFileSync } from 'fs';
import * as ts from 'typescript';
import { TDDeclaration } from './TDDeclaration';
import { TDType } from './TDType';
import { TDClassType } from './TDClassType';

/**
 * class :: TDDeclarationNode
 *   nodeType :: String
 *   properties :: Array TDDeclarationNode
 *   name :: String
 *   referencedASTs :: Array TDDeclarationNode
 *   typeString :: String
 */
class TDDeclarationNode {
  constructor(
    nodeType /* t:String */,
    properties=[] /* t:Array TDDeclarationNode */,
    name /* t:String */,
    referencedASTs=[] /* t:Array TDDeclarationNode */,
    typeString=undefined /* t:String */,
    namespace=undefined)
  {
    this.nodeType = nodeType;
    this.properties = properties;
    this.name = name;
    this.referencedASTs = referencedASTs;
    this.typeString = typeString;
    this.namespace = namespace;
  }
}

const KEY_MAP = _generateNumberToKeyMap();

console.log('starting');
generateASTFromPath(__dirname + '/../../node_modules/typescript/lib/lib.d.ts');
console.log('done');

let cachedASTs = {};
export function generateASTFromPath(path /* t:String */) /* t:Array TDDeclarationNode */ {
  let referencedASTs;

  if (path.indexOf('.json') > -1) {
    return require(path);
  } else {
    const directory = path.split('/').slice(0, path.split('/').length - 1).join('/') || '.';
    const sourceFile = ts.createSourceFile(path, readFileSync(path).toString(), ts.ScriptTarget.ES2015, true);

    referencedASTs = sourceFile
      .referencedFiles
      .filter((fileReference) => !(cachedASTs || (cachedASTs = {}))[resolve(`${directory}/${fileReference.fileName}`)])
      .map((fileReference) => {
        cachedASTs[resolve(`${directory}/${fileReference.fileName}`)] = true;
        return generateASTFromPath(resolve(`${directory}/${fileReference.fileName}`));
      });
    return generateASTFromSourceFile(sourceFile, referencedASTs);
  }
}

export function generateASTFromSourceFile(sourceFile, referencedASTs /* t:Array TDDeclarationNode */) /* t:Array TDDeclarationNode */ {
  let statements = [];

  ts.forEachChild(sourceFile, (_node) => {
    let result = _deconstructSourceFile(_node);
    if (result) {
      statements = statements.concat(result);
    }
  });

  return statements;
}

export function addDefinitionFileToScope(scope /* t:TDScope */, path /* t:String */) /* t:TDScope */ {
  const ast = generateASTFromPath(path);
  ast.forEach((node) => {
      if (!node) {
        return;
      }

      switch (node.nodeType) {
        case 'Interface':
          const tdClass = new TDClassType(node.typeString);

          node.properties.forEach((property) => tdClass.addPropertyOrMethod(property.name, property.typeString));

          scope.addDeclaration(new TDDeclaration(tdClass, node.name));
          break;
        case 'Declaration':
          scope.addDeclaration(new TDDeclaration(new TDType(node.typeString), node.name));
          break;
        default:
          throw new Error(`Unknown node type: ${node.nodeType}`);
      }
    });
}

function _deconstructSourceFile(node, namespace=undefined) /* t:TDDeclarationNode */ {
  const kind = _getKindFromEnum(node.kind);

  switch(kind) {
    case 'VariableStatement':
      return node.declarationList.declarations.map((declaration) => {
        let typeString = _typeStringFromKind(declaration.type.kind);
        typeString = typeString === 'TypeReference' ? declaration.type.typeName && declaration.type.typeName.text : typeString;

        if (/Constructor$/.test(typeString)) {
          return;
        }

        return new TDDeclarationNode(
          'Declaration',
          [],
          declaration.name.text,
          [],
          typeString,
          namespace);
      }).filter((a) => Boolean(a));
    case 'FunctionDeclaration':
      return new TDDeclarationNode(
        'Declaration',
        [],
        node.name.text,
        [],
        // Dev Note: This is naive, fix it.
        node.parameters
          .map((parameter) => {
            const value = _typeStringFromKind(parameter.type.kind);
            return Boolean(parameter.questionToken) ? `[${value}]` : value;
          })
          .join(' -> ') + ' -> ' + _typeStringFromKind(node.type.kind),
        namespace
      );
    case 'InterfaceDeclaration':
    case 'ClassDeclaration':
      if (/Constructor$/.test(_makeType(node))) {
        return;
      }

      return new TDDeclarationNode(
        'Interface',
        node.members
          /**
           * Dev Note:
           *
           * For now, we're ignoring:
           *   - IndexSignature, i.e. [s: string]: number
           *   - ConstructSignature, new (value?: any): Object
           *   - CallSignature, I think this is (): any;?
           *
           * Yes, I know this isn't efficient. But it's real easy on the eyes.
           */
          .filter((member) => _typeStringFromKind(member.kind) !== 'IndexSignature')
          .filter((member) => _typeStringFromKind(member.kind) !== 'ConstructSignature')
          .filter((member) => _typeStringFromKind(member.kind) !== 'CallSignature')
          .filter((member) => _typeStringFromKind(member.kind) !== 'Constructor')
          .map((member) => {
            const typeString = _makeType(member);
            return new TDDeclarationNode(
              'Declaration',
              [],
              member.name.text,
              [],
              typeString === 'TypeReference' ? node.name.text : typeString,
              namespace
            );
          }),
        node.name.text,
        [],
        _makeType(node)
      );
    case 'ModuleDeclaration':
      return node.body.statements
        .map((_node) => _deconstructSourceFile(_node, node.name.text))
        .reduce((a, b) => a.concat(b), []);
    case 'EndOfFileToken':
    // Don't handle this for now
    case 'TypeAliasDeclaration':
    case 'ImportDeclaration':
    case 'ExportAssignment':
      return undefined;
    default:
      throw new Error(`Unknown node type: ${kind}`);
  }
}

function _makeType(node) /* t:String */ {
  let type = '';

  if (node.type &&  _typeStringFromKind(node.type.kind, node.typeParameters) === 'FunctionType') {
    type = node.type.parameters.map(_getSignatureFromParameter).join(' -> ') + ' -> ';
    type += node.type ? _typeStringFromKind(node.type.kind, node.typeParameters) : node.name.text;
  } else if (node.parameters && node.parameters.length) {
    type = node.parameters.map(_getSignatureFromParameter).join(' -> ') + ' -> ';
    type += node.type ? _typeStringFromKind(node.type.kind, node.typeParameters) : node.name.text;
  } else if (node.typeParameters && node.typeParameters.length) {
    type = node.typeParameters.map(_getSignatureFromParameter).join(' ');
    type = (node.type ? _typeStringFromKind(node.type.kind, node.typeParameters) : node.name.text) + ' ' + type;
  } else if (_typeStringFromKind(node.kind, node.typeParameters) === 'TypeParameter') {
    type += node.name.text.toLowerCase();
  } else {
    type += node.type ? _typeStringFromKind(node.type.kind, node.typeParameters) : node.name.text;
  }

  return type;
}

function _getSignatureFromParameter(parameter /* t:any */) /* t:String */ {
  let signature = _makeType(parameter);

  if (signature === 'TypeReference') {
    signature = (parameter.type.typeName.text && parameter.type.typeName.text.toLowerCase()) ||
      (parameter.type.typeName.left && `${parameter.type.typeName.left}:${parameter.type.typeName.right}`);
  }

  signature = signature.indexOf('->') > -1 ? `(${signature})` : signature;

  if (parameter.questionToken) {
    signature = `[${signature}]`;
  }

  return signature;
}

function _typeStringFromKind(kind /* t:Number */, typeParameters /* t:any */) /* t:String */ {
  const tsKeyword /* t:String */ = _getKindFromEnum(kind);

  switch (tsKeyword) {
    case 'BooleanKeyword':
      return 'Boolean';
    case 'NumberKeyword':
      return 'Number';
    case 'StringKeyword':
      return 'String';
    case 'AnyKeyword':
      return 'any';
    case 'VoidKeyword':
      return 'undefined';
    case 'TypeParameter':
      return 'TypeParameter';
    case 'TypeReference':
      return 'TypeReference';
    case 'ArrayType':
    case 'TupleType':
      return `Array ${typeParameters ? typeParameters.map((type) => type.name.text).join(' ') : 'any'}`;
    case 'FunctionType':
    default:
      return tsKeyword;
  }
}

function _generateNumberToKeyMap() {
  const keyMap = {};

  Object.keys(ts.SyntaxKind).forEach((key) => keyMap[ts.SyntaxKind[key]] = key);

  return keyMap;
}

function _getKindFromEnum(kind /* t:Number */) /* t:String */ {
  return KEY_MAP[kind];
}
