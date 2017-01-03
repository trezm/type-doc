'use strict';

import { TDType } from './TDType';

export class TDDeclaration {
  constructor(type /* t:TDType */, name /* t:String */) {
    this.type = type || new TDType();
    this.name = name;
  }
}
