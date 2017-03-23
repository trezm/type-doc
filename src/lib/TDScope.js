'use strict';

import { TDBinding } from './TDBinding';
import { TDClassType } from './TDClassType';
import { TDDeclaration } from './TDDeclaration';
import { TDBuiltinDeclarations } from './TDBuiltinDeclarations';
import { TDType } from './TDType';

export class TDScope {
  constructor(parent /* t:TDScope */) {
    this.parent = parent;
    this.declarations = [];
    this.namespaces = {};

    if (!parent) {
      this.declarations = this.declarations.concat(TDBuiltinDeclarations);
    }
  }

  get isBound() /* t:boolean */ {
    return Boolean(this.binding);
  }

  updateDeclaration(declaration) {
    let wasAdded = false;

    this.declarations = this.declarations
      .map((existingDeclaration) => {
        if (existingDeclaration.name === declaration.name) {
          wasAdded = true;
          return declaration;
        } else {
          return existingDeclaration;
        }
      });

    if (!wasAdded) {
      this.declarations.push(declaration);
    }
  }

  addDeclaration(declaration /* t:TDDeclaration */, allowNamespace=false) {
    this.declarations.push(declaration);

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

    const declaration = this.declarations.find((declaration) => {
      const declarationSplit = declaration.nonNamespacedName.split(' ');
      const nameSplit = name.split(' ');

      const classNamesAreEqual = declarationSplit[0] === nameSplit[0];

      return classNamesAreEqual;
    });

    const type = declaration && declaration.type;

    return type ||
      !limitScope && this.parent && this.parent.findTypeForName(name) ||
      this.findTypeInNamespace(name);
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
        const propertyType = this.this && this.this.type.properties && this.this.type.properties[propertyName];

        return (this.binding && this.binding.findTypeForName(propertyName)) ||
          propertyType ||
          (this.parent && this.parent.findTypeForStaticMember(node));
      }
      default:
        return;
    }
  }

  findTypeForMember(node /* t:Object */) /* t:TDType */ {
    const propertyName = node.property.name;

    switch (node.object.type) {
      case 'ThisExpression':
        return (this.binding && this.binding.findTypeForName(propertyName)) ||
          (this.parent && this.parent.findTypeForStaticMember(node));
      case 'MemberExpression': {
        const objectType = node.object.scope.findTypeForMember(node.object);
        const classType = objectType &&
          node.scope.findTypeForName(objectType.typeString);

        if (classType) {
          return classType.properties[node.property.name];
        } else if (objectType && objectType.properties) {
          return objectType.properties[node.property.name];
        } else {
          return objectType;
        }
      }
      case 'Identifier': {
        const propertyClassName = node.property.name.split(' ')[0];
        let type = this.findTypeForName(node.object.name);
        const originalType = type;
        let genericMap = {};

        if (type &&
          !(type instanceof TDClassType)) {
          type = this.findTypeForName(type.typeString);
          genericMap = type.extractGenericMapGivenType(originalType);
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
