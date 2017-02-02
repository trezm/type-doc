'use strict';

import { TDType } from './TDType';

/**
 * class :: TDClassType
 *   methods :: Array TDMethodDeclaration
 *   properties :: Array TDDeclaration
 *   addPropertyOrMethod :: String -> String -> TDClassType
 *   addMethodDeclaration :: String -> String -> TDClassType
 *   addPropertyDeclaration :: String -> String -> TDClassType
 */
export class TDClassType extends TDType {
  constructor(typeString /* t:String */) {
    super(typeString);

    this._methods = {};
    this._properties = {};
  }

  get methods() {
    return this._methods;
  }

  get properties() {
    return Object.assign(Object.assign({}, this._properties), this._methods);
  }

  addPropertyOrMethod(name /* t:String */, signature /* t:String */) /* t:TDClassType */ {
    if (signature.indexOf('->') > -1) {
      this.addMethodDeclaration(name, signature);
    } else {
      this.addPropertyDeclaration(name, signature);
    }

    return this;
  }

  addMethodDeclaration(name /* t:String */, methodSignature /* t:String */) /* t:TDClassType */ {
    this._methods = Object.assign(Object.assign({}, this._methods), { [name]: new TDType(methodSignature) });

    return this;
  }

  addPropertyDeclaration(name /* t:String */, propertyType /* t:String */) /* t:TDClassType */ {
    this._properties = Object.assign(Object.assign({}, this._properties), { [name]: new TDType(propertyType) });

    return this;
  }
}
