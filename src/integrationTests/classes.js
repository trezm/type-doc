import { stub } from 'sinon';
import { expect } from 'chai';
import { TDTypeChecker } from '../lib/TDTypeChecker';

describe('classes', () => {
  it('should respect `this.`', () => {
    const errors = new TDTypeChecker(`
class TestClass {
  constructor() {}

  aGoodMethod1(s /* t:String */) /* t:String */ {
    return s;
  }

  aGoodMethod2(s /* t:String */) /* t:String */ {
    return this.aGoodMethod1(s);
  }
}
`).run();

    expect(errors.length).to.equal(0);
  });

  it('should be able to test against class methods', () => {
    const errors = new TDTypeChecker(`
class TestClass {
  constructor() {}

  aBadMethod(s /* t:String */) /* t:String */ {
    return s;
  }

  toNumber(s /* t:String */) /* t:Number */ {
    return this.aBadMethod(s);
  }
}
`).run();

    expect(errors[0].extras.expectedType).to.equal('Number');
    expect(errors[0].extras.actualType).to.equal('String');
  });

  it('should check method argument types', () => {
    const errors = new TDTypeChecker(`
class TestClass {
  constructor() {}

  aFineMethod(s /* t:String */) /* t:String */ {
    return s;
  }

  toNumber(n /* t:Number */) /* t:Number */ {
    this.aFineMethod(n);
  }
}
`).run();

    expect(errors[0].extras.expectedType).to.equal('String');
    expect(errors[0].extras.actualType).to.equal('Number');
  });

  describe('using ahead of time declaration', () => {
    it('should allow AOT class declaration', () => {
      const errors = new TDTypeChecker(`
  /**
   * class :: TestClass
   *   aString :: String
   *   aGoodMethod :: String -> String
   */
  class TestClass {
    constructor() {
      this.aString = 'hello';
    }

    aGoodMethod(s /* t:String */) /* t:String */ {
      return s;
    }
  }
  `).run();

      expect(errors.length).to.equal(0);
    });

    it('should check against AOT method declarations', () => {
      const errors = new TDTypeChecker(`
  /**
   * class :: TestClass
   *   aString :: String
   *   aGoodMethod :: String -> Number
   */
  class TestClass {
    constructor() {
      this.aString = 'hello';
    }

    aGoodMethod(s /* t:String */) /* t:String */ {
      return s;
    }
  }
  `).run();

      expect(errors[0].extras.expectedType).to.equal('String -> Number');
      expect(errors[0].extras.actualType).to.equal('String -> String');
    });

    it('should check against AOT property declarations', () => {
      const errors = new TDTypeChecker(`
  /**
   * class :: TestClass
   *   aString :: String
   *   aGoodMethod :: String -> String
   */
  class TestClass {
    constructor() {
      this.aString = 1;
    }

    aGoodMethod(s /* t:String */) /* t:String */ {
      return s;
    }
  }
  `).run();

      expect(errors[0].extras.expectedType).to.equal('String');
      expect(errors[0].extras.actualType).to.equal('Number');
    });

    it('should throw an error in strict mode if have an undeclared method', () => {
      const errors = new TDTypeChecker(`
  /**
   * class :: TestClass
   *   aString :: String
   *   aGoodMethod :: String -> String
   */
  class TestClass {
    constructor() {
      this.aString = 'hello';
    }

    aGoodMethod(s /* t:String */) /* t:String */ {
      return s;
    }

    aBadMethod(s /* t:String */) /* t:String */ {
      return s;
    }
  }
  `).run({
        strictClassChecks: true
      });

      expect(errors[0].extras.method).to.equal('aBadMethod');
      expect(errors[0].extras.class).to.equal('TestClass');
    });

    it('should throw an error in strict mode if have an undeclared property', () => {
      const errors = new TDTypeChecker(`
  /**
   * class :: TestClass
   *   aString :: String
   *   aGoodMethod :: String -> String
   */
  class TestClass {
    constructor() {
      this.aString = 'hello';
      this.anotherString = 'hello';
    }

    aGoodMethod(s /* t:String */) /* t:String */ {
      return s;
    }
  }
  `).run({
        strictClassChecks: true
      });

      expect(errors[0].extras.property).to.equal('anotherString');
      expect(errors[0].extras.class).to.equal('TestClass');
    });

    it('should check if a method exists in a method call on an instantiated class', () => {
      const errors = new TDTypeChecker(`
  /**
   * class :: TestClass
   *   aGoodMethod :: String -> String
   */
  class TestClass {
    constructor() {
    }

    aGoodMethod(s /* t:String */) /* t:String */ {
      return s;
    }
  }

  const example /* t:TestClass */ = new TestClass();
  example.aBadMethod();
  `).run({
        strictClassChecks: true
      });

      expect(errors[0].extras.property).to.equal('aBadMethod');
      expect(errors[0].extras.class).to.equal('TestClass');
    });

    it('should check if a property exists in a property reference on an instantiated class', () => {
      const errors = new TDTypeChecker(`
  /**
   * class :: TestClass
   *   aString :: String
   */
  class TestClass {
    constructor() {
      this.aString = 'hello';
    }
  }

  const example /* t:TestClass */ = new TestClass();
  example.aBadString = 'bye';
  `).run({
        strictClassChecks: true
      });

      expect(errors[0].extras.property).to.equal('aBadString');
      expect(errors[0].extras.class).to.equal('TestClass');
    });

    it('should correctly check arguments', () => {
      const errors = new TDTypeChecker(`
  /**
   * class :: TestClass
   *   aGoodMethod :: String -> String
   */
  class TestClass {
    constructor() {
    }

    aGoodMethod(s /* t:String */) /* t:String */ {
      return s;
    }
  }

  const aNumber /* t:Number */ = 2;
  const example /* t:TestClass */ = new TestClass();
  const aString /* t:String */ = example.aGoodMethod(aNumber);
  `).run({
        strictClassChecks: true
      });

      expect(errors[0].extras.expectedType).to.equal('String');
      expect(errors[0].extras.actualType).to.equal('Number');
    });

    it('should allow multiple levels of property access', () => {
      const errors = new TDTypeChecker(`
/**
 * class :: TestClass
 *   aGoodMethod :: String -> String
 */
class TestClass {
  constructor() {
  }

  aGoodMethod(s /* t:String */) /* t:String */ {
    return s;
  }
}

/**
 * class :: ContainerClass
 *   testClass :: TestClass
 */
class ContainerClass {
  constructor() {
    this.testClass = new TestClass();
  }
}

const aNumber /* t:Number */ = 2;
const example /* t:ContainerClass */ = new ContainerClass();
const aString /* t:String */ = example.testClass.aBadMethod(aNumber);
  `).run({
        strictClassChecks: true
      });

      expect(errors[0].extras.property).to.equal('aBadMethod');
      expect(errors[0].extras.class).to.equal('TestClass');
    });
  });
});
