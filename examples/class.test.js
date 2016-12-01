class TestClass {
  constructor() {}

  aFineMethod(s /* t:String */) /* t:String */ {
    return s;
  }

  toNumber(n /* t:Number */) /* t:Number */ {
    this.aFineMethod(n);
  }
}