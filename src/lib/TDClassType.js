'use strict';

import { TDType } from './TDType';
import { mergeTypes } from './TDTypeStringTokenizer';

/**
 * class :: TDClassType
 *   any :: any -> TDClassType
 *   methods :: Array TDType
 *   properties :: Array TDType
 *   getPropertyTypeForName :: TDDeclaration
 *   addPropertyOrMethod :: string -> string -> TDClassType
 *   addMethodDeclaration :: string -> string -> TDClassType
 *   addPropertyDeclaration :: string -> string -> TDClassType
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

  static any(node /* t:any */) /* t:TDClassType */ {
    const anonymousType = new TDClassType();

    node.properties
      .filter((prop) => prop.kind === 'init')
      .forEach((prop) => {
        anonymousType.addPropertyOrMethod(prop.key.name, typeof prop.value.value);
      });

    return anonymousType;
  }

  toString() /* t:string */ {
    if (this.isAny) {
      const fakeObject = {};

      Object.keys(this.properties || {})
        .forEach((key) => fakeObject[key.replace(/^__/, '')] = this.properties[key].typeString);
      return JSON.stringify(fakeObject);
    } else {
      return this.typeString;
    }
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

  isSubclassOf(otherType /* t:TDType */) /* t:boolean */ {
    return (!this.isAny && !otherType.isAny && this.__proto__.__proto__.isSubclassOf(otherType)) || this.isDucktypeOf(otherType);
  }

  isDucktypeOf(otherType /* t:TDType */) /* t:boolean */ {
    const hasRequiredTypes = true;

    const missingType = Object.keys(otherType.properties || {})
      .find((key) => {
        const trimmedKey = key.replace(/^__/, '');
        const thisPropertyType = this.getPropertyTypeForName(trimmedKey);

        return !otherType.getPropertyTypeForName(trimmedKey).isSubclassOf(thisPropertyType);
      });

    return !Boolean(missingType);
  }
}
