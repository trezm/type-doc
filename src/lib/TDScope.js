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

  findDeclarationForName(name /* t:String */, limitScope /* t:boolean */) /* t:TDDeclaration */ {
    const declaration = this.declarations.find((declaration) => declaration.nonNamespacedName === name);

    return declaration ||
      !limitScope && this.parent && this.parent.findDeclarationForName(name) ||
      this.findDeclarationInNamespace(name);
  }

  findDeclarationInNamespace(name /* t:String */) /* t:TDDeclaration */ {
    if (!name) {
      return;
    }

    const namespace /* t:String */ = name.split(':')[0];
    const keyName = name.split(':')[1];

    if (!namespace || !keyName) {
      return undefined;
    }

    if (this.parent) {
      return this.parent.findDeclarationInNamespace(name);
    } else {
      return this.namespaces[namespace][keyName];
    }
  };

  findDeclarationForStaticMember(node /* t:Object */) /* t:TDDeclaration */ {
    const propertyName = node.property.name;

    switch (node.object.type) {
      case 'ThisExpression': {
        const propertyType = this.this && this.this.type.properties && this.this.type.properties[propertyName];

        return (this.binding && this.binding.findDeclarationForName(propertyName)) ||
          (propertyType && new TDDeclaration(propertyType, undefined)) ||
          (this.parent && this.parent.findDeclarationForStaticMember(node));
      }
      default:
        return;
    }
  }

  findDeclarationForMember(node /* t:Object */) /* t:TDDeclaration */ {
    const propertyName = node.property.name;

    switch (node.object.type) {
      case 'ThisExpression':
        return (this.binding && this.binding.findDeclarationForName(propertyName)) ||
          (this.parent && this.parent.findDeclarationForStaticMember(node));
      case 'MemberExpression': {
        const objectDeclaration = node.object.scope.findDeclarationForMember(node.object);
        const classDeclaration = objectDeclaration &&
          objectDeclaration.type &&
          node.scope.findDeclarationForName(objectDeclaration.type.typeString);

        if (classDeclaration) {
          return classDeclaration.type.properties[node.property.name];
        } else if (objectDeclaration && objectDeclaration.type.properties) {
          return objectDeclaration.type.properties[node.property.name];
        } else {
          return objectDeclaration;
        }
      }
      case 'Identifier': {
        let declaration = this.findDeclarationForName(node.object.name);

        if (declaration &&
          declaration.type &&
          !(declaration.type instanceof TDClassType)) {
          declaration = this.findDeclarationForName(declaration.type.typeString);
        }

        /**
         * A little bit of a hack here to wrap a TDType in a declaration like a method.
         */
        if (declaration &&
          declaration.type &&
          declaration.type.properties &&
          declaration.type.properties[node.property.name]) {
          let propType = declaration.type.properties[node.property.name];
          let signature = propType.types
            .map((type) => type.typeString)
            .join(' -> ');

          declaration = new TDDeclaration(new TDType(signature), node.property.name);
        } else if (declaration &&
          declaration.type &&
          declaration.type.properties) {
          return undefined;
        }

        return declaration;
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
