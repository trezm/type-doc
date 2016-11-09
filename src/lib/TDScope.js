'use strict';

import { TDDeclaration } from './TDDeclaration';

export class TDScope {
  constructor(parent /* t:TDScope */) {
    this.parent = parent;
    this.declarations = [];
  }

  addDeclaration(declaration /* t:TDDeclaration */) {
    this.declarations.push(declaration);
  }

  findDeclarationForName(name /* t:string */) /* t:string */ {
    const declaration = this.declarations.find((declaration) => declaration.name === name);

    return declaration || this.parent && this.parent.findDeclarationForName(name);
  }
}
