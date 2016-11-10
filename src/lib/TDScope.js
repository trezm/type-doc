'use strict';

import { TDBinding } from './TDBinding';
import { TDDeclaration } from './TDDeclaration';

export class TDScope {
  constructor(parent /* t:TDScope */) {
    this.parent = parent;
    this.declarations = [];
  }

  get isBound() /* t:boolean */ {
    return Boolean(this.binding);
  }

  addDeclaration(declaration /* t:TDDeclaration */) {
    this.declarations.push(declaration);
  }

  findDeclarationForName(name /* t:string */) /* t:TDDeclaration */ {
    const declaration = this.declarations.find((declaration) => declaration.name === name);

    return declaration || this.parent && this.parent.findDeclarationForName(name);
  }

  findDeclarationForStaticMember(node /* t:Object */) /* t:TDDeclaration */ {
    const propertyName = node.property.name;

    switch (node.object.type) {
      case 'ThisExpression':
        return (this.binding && this.binding.findDeclarationForName(propertyName)) ||
          (this.parent && this.parent.findDeclarationForStaticMember(node));
      default:
        return;
    }
  }

  initializeBinding() {
    this.binding = new TDBinding();
  }

  addBoundMethodDeclaration(declaration /* t:TDMethodDeclaration */) {
    if (this.isBound) {
      this.binding.addMethodDeclaration(declaration);
    } else if (this.parent) {
      this.parent.addBoundMethodDeclaration(declaration);
    }
  }
}