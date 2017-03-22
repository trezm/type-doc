'use strict';

import { TDType } from './TDType';

/**
 * class :: TDDeclaration
 *   type :: TDType
 *   name :: String
 *   isNamespaced :: Boolean
 *   namespace :: String
 *   nonNamespacedTypeString :: String
 *   nonNamespacedName :: String
 */
export class TDDeclaration {
  constructor(type /* t:TDType */, name /* t:String */) {
    this.type = type || new TDType();
    this.name = name;
  }

  get isNamespaced() /* t:Boolean */ {
    return this.type.typeString && this.type.typeString.split(':').length === 2;
  }

  get namespace() /* t:String */ {
    return this.type.typeString.split(':')[0];
  }

  get nonNamespacedTypeString() /* t:String */ {
    return this.isNamespaced ? this.type.typeString.split(':')[1] : this.type.typeString;
  }

  get nonNamespacedName() /* t:String */ {
    return this.name;
  }
}
