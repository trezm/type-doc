'use strict';

import { v4 } from 'node-uuid';

export class TDType {
  constructor(typeString='any' /* t:String */) {
    if (typeString.constructor.name === this.constructor.name) {
      this.isAny = typeString.isAny;
      typeString = typeString.typeString;
    } else if (typeString === 'any') {
      this.isAny = true;
      typeString = v4();
    }

    this.typeString = typeString;

    this.typeList = typeString
      .split(' ')
      .filter((singleType) => singleType !== '->' && Boolean(singleType)) ||
      [];
  }

  static testForGeneric(inputString /* t:String */) /* t:Boolean */ {
    return inputString === inputString.toLowerCase();
  }

  static any() /* t:TDType */ {
    return new TDType();
  }

  get isGeneric() /* t:Boolean */ {
    return this.typeList.some((type) => type === type.toLowerCase());
  }

  get types() /* t:Array TDType */ {
    return this.typeList.map((typeString) => new TDType(typeString));
  }

  equals(otherType /* t:TDType */) /* t:Boolean */ {
    const expectedType /* t:String */ = this.typeList.join(' ');
    const actualType /* t:String */ = otherType.typeList.join(' ');

    const allowedTypes = (expectedType || 'any')
      .split('|')
      .map((type) => type.trim());
    const actualTypes = (actualType || 'any')
      .split('|')
      .map((type) => type.trim());
    const allowsAny = allowedTypes.indexOf('any') > -1 || this.isAny;
    const isAny = actualTypes.indexOf('any') > -1 || otherType.isAny;
    const matchesGeneric = this.typeList
      .map((typeString, index) => {
        const otherString = otherType.typeList[index] || '';
        const typeStringIsGeneric = typeString === typeString.toLowerCase();
        const otherStringIsGeneric = otherString === otherString.toLowerCase();
        const typesMatch = typeString === otherString;

        return typesMatch || typeStringIsGeneric || otherStringIsGeneric;
      })
      .every((value) => value);

    const isValid = matchesGeneric || isAny || allowsAny;
    return !isValid;
  }
}
