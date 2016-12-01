'use strict';

import { TDDeclaration } from './TDDeclaration';
import { TDType } from './TDType';

export class TDMethodDeclaration extends TDDeclaration {
  constructor(type /* t:TDType */, name /* t:String */) {
    super(type, name);

    this._returnType = type;

    this.params = [];
  }

  addParam(param /* t:TDDeclaration */) {
    const localReturnType = this._returnType.typeString.indexOf('->') > -1 ?
      `(${this._returnType.typeString})` :
      this._returnType.typeString;
    this.params.push(param);

    this.type = new TDType(
      this.params
        .map((param) => param.type.typeString)
        .concat(localReturnType)
        .join(' -> ')
      );
  }

  findParam(name) {
    return this.params.find((param) => param.name === name);
  }
}
