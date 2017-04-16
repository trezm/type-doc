'use strict';

import { TDType } from './TDType';
import { mergeTypes } from './TDTypeStringTokenizer';

/**
 * class :: TDClassType
 *   methods :: Array TDType
 *   properties :: Array TDType
 *   getPropertyTypeForName :: TDDeclaration
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
    if (this._methods.hasOwnProperty(name)) {
      this._methods[`__${name}`] = new TDType(mergeTypes(this._methods[name].typeString, methodSignature));
    } else {
      this._methods[`__${name}`] = new TDType(methodSignature);
    }

    return this;
  }

  addPropertyDeclaration(name /* t:String */, propertyType /* t:String */) /* t:TDClassType */ {
    this._properties[`__${name}`] = new TDType(propertyType);

    return this;
  }

  getPropertyTypeForName(name /* t:String */) /* t:TDType */ {
    const matchingKey = Object.keys(this.properties)
      .find((key) => {
        const keyClassName = key.split(' ')[0];

        return keyClassName === `__${name}`;
      });

    return this.properties[matchingKey];
  }

  getMethodTypeForName(name /* t:String */) /* t:TDType */ {
    const matchingKey = Object.keys(this._methods)
      .find((key) => {
        const keyClassName = key.split(' ')[0];

        return keyClassName === `__${name}`;
      });

    return this.methods[matchingKey];
  }
}
