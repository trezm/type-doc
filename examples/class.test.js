const s = () => 'hello';

class TestClass {
  constructor() {}

  aFineMethod(s /* t:string */) /* t:string */ {
    return s;
  }

  toNumber(s /* t:number */) /* t:string */ {
    return this.aFineMethod(s);
  }
}
