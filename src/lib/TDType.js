'use strict';

import { v4 } from 'node-uuid';
import {
  stringifyAndFlatten,
  tokenizeString
} from './TDTypeStringTokenizer';

const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const PRIMITIVES = new Set(['number', 'string', 'object']);
const CAPITALIZED_PRIMITIVES = new Set(['Number', 'String', 'Object']);

/**
 * class :: TDType
 *   typeString :: String
 *   superType :: [TDType]
 *   superTypeString :: [String]
 *   typeList :: Array String
 *   typeString :: String
 *   isGeneric :: Boolean
 *   types :: Array TDType
 *   genericTypes :: Array String
 *   isOptional :: Boolean
 *   extractGenericMapGivenType :: TDType -> any
 *   isSubclassOf :: TDType -> Boolean
 */
export class TDType {
  constructor(typeString='any' /* t:String */, genericMap={} /* t:any */) {
    let superTypeString;

    if (typeString instanceof this.constructor) {
      this.isAny = typeString.isAny;
      typeString = typeString.typeString;
      superTypeString = typeString.superTypeString;
    } else if (typeString === 'any' ||
      typeString === 'Object') {
      this.isAny = true;
      typeString = v4();
    } else {
      superTypeString = typeString.split('=>')[1] || superTypeString;
      typeString = typeString.split('=>')[0];
    }

    if (typeof typeString !== 'string') {
      throw new Error('must be string or TDType');
    }

    typeString = CAPITALIZED_PRIMITIVES.has(typeString) ? typeString.toLowerCase() : typeString;

    let alteredTypeString = typeString;
    if (!this.isAny) {
      Object.keys(genericMap)
        .forEach((key) => alteredTypeString = alteredTypeString.replace(new RegExp(`\\b\\(?${key}\\)?\\b`, 'g'), genericMap[key]));
        // .forEach((key) => alteredTypeString = alteredTypeString.replace(new RegExp(`\b${key}`, 'g'), genericMap[key]));
    }

    this.typeString = alteredTypeString;
    this.superTypeString = superTypeString && superTypeString.trim();
    this.superType = this.superTypeString && new TDType(this.superTypeString);
  }

  static testForGeneric(inputString /* t:String */) /* t:Boolean */ {
    const splitParts = inputString
      .split(' ')
      .map((part) => part.trim());

    return splitParts.some((part) => !PRIMITIVES.has(part) && part === part.toLowerCase());
  }

  static any() /* t:TDType */ {
    return new TDType();
  }

  static isNonSpecified(type /* t:TDType */) /* t:Boolean */ {
    return UUID_REGEX.test(type.typeString);
  }

  get isGeneric() /* t:Boolean */ {
    return this.typeList
      .map((type) => type.split(' ').map((part) => part.trim()))
      .reduce((a, b) => a.concat(b), [])
      .some((part) => !PRIMITIVES.has(part) && part === part.toLowerCase());
  }

  get types() /* t:Array TDType */ {
    return this.typeList.map((typeString, index, array) => new TDType(typeString));
  }

  get genericTypes() /* t:Array String */ {
    return this.typeList
      .map((type) => type.split(' ').map((part) => part.trim()))
      .reduce((a, b) => a.concat(b), [])
      .filter((part) => !PRIMITIVES.has(part) && part === part.toLowerCase());
  }

  get typeList() /* t:Array String */ {
    const tokens /* t:Array TDTypeToken */ = tokenizeString(this.typeString);

    return stringifyAndFlatten(tokenizeString(this.typeString));
  }

  get isOptional() /* t:Boolean */ {
    return /^\[.*\]$/.test(this.typeString);
  }

  extractGenericMapGivenType(type /* t:TDType */) /* t:any */ {
    let genericMap = {};

    this.typeList
      .forEach((typeString, index) => {
        const extractingTypeString = type.typeList[index];

        if (!extractingTypeString) {
          return;
        }

        const typeStringParts = typeString.split(' ');
        const extractingTypeStringParts = extractingTypeString.split(' ');

        typeStringParts
          .forEach((part, index) => {
            if (!PRIMITIVES.has(part) && part === part.toLowerCase()) {
              genericMap[part] = extractingTypeStringParts[index];
            }
          });
      });

    return genericMap;
  }

  isSubclassOf(otherType /* t:TDType */) /* t:Boolean */ {
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
        const typeStringIsGeneric = TDType.testForGeneric(typeString);
        const otherStringIsGeneric = TDType.testForGeneric(otherString);
        const typesExactlyMatch = typeString === otherString.replace(/^\[/, '').replace(/\]$/, '');
        const oneTypeContainsTheOther = typeString
          .split('|')
          .map((aType) => aType.trim())
          .some((aType) => otherString
            .split('|')
            .map((aType) => aType.trim())
            .indexOf(aType) > -1);

        return typesExactlyMatch || oneTypeContainsTheOther || typeStringIsGeneric || otherStringIsGeneric;
      })
      .every((value) => value);

    // const isValid = matchesGeneric || isAny || allowsAny;
    // return !isValid;
    return matchesGeneric || (isAny || allowsAny) || (this.superType && this.superType.isSubclassOf(otherType));
  }
}
