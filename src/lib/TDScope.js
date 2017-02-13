'use strict';

import { TDBinding } from './TDBinding';
import { TDClassType } from './TDClassType';
import { TDDeclaration } from './TDDeclaration';
import { TDBuiltinDeclarations } from './TDBuiltinDeclarations';
import { TDMethodDeclaration } from './TDMethodDeclaration';

export class TDScope {
  constructor(parent /* t:TDScope */) {
    this.parent = parent;
    this.declarations = [];

    if (!parent) {
      this.declarations = this.declarations.concat(TDBuiltinDeclarations);
    }
  }

  get isBound() /* t:boolean */ {
    return Boolean(this.binding);
  }

  addDeclaration(declaration /* t:TDDeclaration */) {
    this.declarations.push(declaration);
  }

  findDeclarationForName(name /* t:String */, limitScope /* t:boolean */) /* t:TDDeclaration */ {
    const declaration = this.declarations.find((declaration) => declaration.name === name);

    return declaration || !limitScope && this.parent && this.parent.findDeclarationForName(name);
  }

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
          let signature = propType.types;

          declaration = new TDMethodDeclaration(signature.pop(), node.property.name);

          signature.forEach((type) => declaration.addParam(new TDDeclaration(type, undefined)));
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

  addBoundMethodDeclaration(declaration /* t:TDMethodDeclaration */) {
    if (this.isBound) {
      this.binding.addMethodDeclaration(declaration);
    } else if (this.parent) {
      this.parent.addBoundMethodDeclaration(declaration);
    }
  }
}
