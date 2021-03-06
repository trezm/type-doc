'use strict';

import { TDBinding } from './TDBinding';
import { TDClassType } from './TDClassType';
import { TDDeclaration } from './TDDeclaration';
import { TDType } from './TDType';
import { config } from './TDConfigSingleton';
import { addDefinitionFileToScope } from './TDDeclarationImporter';

function _split(someString /* t:String */) /* t:Array String */ {
  const split = someString.split(/\s+/);

  let joinableIndices = [];
  let currentIndices = split;
  split.forEach((val, index) => val === '|' && (joinableIndices = joinableIndices.concat([index])));
  joinableIndices.forEach((index) => {
    const joinableIndicesHead = joinableIndices.slice(0, index - 1);
    const joinableIndicesToBeCombined = joinableIndices.slice(index - 1, index + 1);
    const joinableIndicesTail = joinableIndices.slice(index + 1);

    currentIndices = joinableIndices
      .concat(joinableIndicesToBeCombined.join(' | '))
      .concat(joinableIndicesTail);
  });

  return currentIndices;
}

export class TDScope {
  constructor(parent /* t:TDScope */) {
    this.parent = parent;
    this.declarations = {};
    this.namespaces = {};

    if (!parent) {
      addDefinitionFileToScope(this, '../lib.json');

      (config.definitionFiles || []).forEach((file) => addDefinitionFileToScope(this, file));
    }
  }

  get isBound() /* t:boolean */ {
    return Boolean(this.binding);
  }

  updateDeclaration(declaration) {
    // TODO: Short circuit if for some reason there is no declaration
    if (!declaration.name) {
      return;
    }

    let wasAdded = false;

    const declarationSplit = _split(declaration.nonNamespacedName);
    this.declarations[declarationSplit[0]] = declaration;
  }

  addDeclaration(declaration /* t:TDDeclaration */, allowNamespace=false) {
    // TODO: Short circuit if for some reason there is no declaration
    if (!declaration.name) {
      return;
    }

    const declarationSplit = _split(declaration.nonNamespacedName);
    this.declarations[declarationSplit[0]] = declaration;

    if (declaration.isNamespaced && allowNamespace) {
      this.addDeclarationToNamespace(declaration);
    }
  }

  addDeclarationToNamespace(declaration /* t:TDDeclaration */) {
    if (this.parent) {
      this.parent.addDeclarationToNamespace(declaration);
    } else {
      const namespace = this.namespaces[declaration.namespace] || {};

      this.namespaces[declaration.namespace] = Object.assign(Object.assign({}, namespace), { [declaration.nonNamespacedTypeString]: declaration });
    }
  }

  findTypeForName(name /* t:String */, limitScope /* t:Boolean */) /* t:TDType */ {
    if (!name) {
      return;
    }

    const nameSplit = _split(name);
    const declaration = this.declarations[nameSplit[0]];

    const type = (declaration && declaration.type) ||
      (!limitScope && this.parent && this.parent.findTypeForName(name)) ||
      this.findTypeInNamespace(name);

    return type;
  }

  findTypeInNamespace(name /* t:String */) /* t:TDType */ {
    if (!name) {
      return;
    }

    const namespace /* t:String */ = name.split(':')[0];
    const keyName = name.split(':')[1];

    if (!namespace || !keyName) {
      return undefined;
    }

    if (this.parent) {
      return this.parent.findTypeInNamespace(name);
    } else {
      const declaration = this.namespaces[namespace][keyName];
      return declaration && declaration.type;
    }
  }

  findTypeForStaticMember(node /* t:Object */) /* t:TDType */ {
    const propertyName = node.property.name;

    switch (node.object.type) {
      case 'ThisExpression': {
        const propertyType = this.this && this.this.type.getPropertyTypeForName && this.this.type.getPropertyTypeForName(propertyName);

        return (this.binding && this.binding.findTypeForName(propertyName)) ||
          propertyType ||
          (this.parent && this.parent.findTypeForStaticMember(node));
      }
      default:
        return;
    }
  }

  findTypeForMember(node /* t:Object */) /* t:TDType */ {
    switch (node.object.type) {
      case 'NewExpression':
        return this.findTypeForName(node.object.callee.name);
      case 'ThisExpression': {
        const propertyName = node.property.name;
        return (this.binding && this.binding.findTypeForName(propertyName)) ||
          (this.parent && this.parent.findTypeForMember(node)) ||
          (this.parent && this.parent.findTypeForStaticMember(node));
      }
      case 'MemberExpression': {
        const objectType = node.object.scope.findTypeForMember(node.object);
        const classType = objectType &&
          node.scope.findTypeForName(objectType.typeString);

        if (classType && classType.getPropertyTypeForName) {
          return classType.getPropertyTypeForName(node.property.name);
        } else if (objectType && objectType.getPropertyTypeForName) {
          return objectType.getPropertyTypeForName(node.property.name);
        } else {
          return objectType;
        }
      }
      case 'CallExpression': {
        const propertyName = node.property.name;
        const propertyClassName = node.property.name ? node.property.name.split(' ')[0] : node.property.value;

        let type = node.object.callee.type === 'MemberExpression' ? this.findTypeForMember(node.object.callee) : this.findTypeForName(node.object.callee.name);

        if (!type || !type.getPropertyTypeForName) {
          return TDType.any();
        } else {
          return type.getPropertyTypeForName(propertyName);
        }
      }
      case 'Identifier': {
        const propertyClassName = node.property.name ? node.property.name.split(' ')[0] : node.property.value;
        let type = this.findTypeForName(node.object.name);
        const originalType = type;
        let genericMap = {};

        if (type &&
          !(type instanceof TDClassType) &&
          !type.isAny) {
          type = this.findTypeForName(type.typeString);
          genericMap = type ? type.extractGenericMapGivenType(originalType) : {};
        }

        /**
         * A little bit of a hack here to wrap a TDType in a declaration like a method.
         */
        if (type &&
          type.getPropertyTypeForName &&
          type.getPropertyTypeForName(node.property.name)) {
          let propType = type.getPropertyTypeForName(node.property.name);

          type = propType;
        } else if (type &&
          type.getMethodTypeForName &&
          type.getMethodTypeForName(node.property.name)) {
          let propType = type.getMethodTypeForName(node.property.name);

          type = propType;
        } else if (type &&
          type.properties) {
          return undefined;
        }

        let alteredTypeString = (type || TDType.any()).typeString;
        return new TDType(alteredTypeString, genericMap);
      }
      default:
        return;
    }
  }

  findThisDef() {
    return this.this || this.parent && this.parent.findThisDef();
  }

  initializeBinding(returnType) {
    this.binding = new TDBinding(returnType);
  }

  initializeThis(_this /* t:TDDeclaration */) {
    this.this = _this;
  }

  addBoundMethodDeclaration(declaration /* t:TDDeclaration */) {
    if (this.isBound) {
      this.binding.addMethodDeclaration(declaration);
    } else if (this.parent) {
      this.parent.addBoundMethodDeclaration(declaration);
    }
  }
}
