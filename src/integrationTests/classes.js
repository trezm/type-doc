import { stub } from 'sinon';
import { expect } from 'chai';
import { TDTypeChecker } from '../lib/TDTypeChecker';

describe('classes', () => {
  it('should respect `this.`', () => {
    const errors = new TDTypeChecker(`
class TestClass {
  constructor() {}

  aGoodMethod1(s /* t:string */) /* t:string */ {
    return s;
  }

  aGoodMethod2(s /* t:string */) /* t:string */ {
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

  aBadMethod(s /* t:string */) /* t:string */ {
    return s;
  }

  tonumber(s /* t:string */) /* t:number */ {
    return this.aBadMethod(s);
  }
}
`).run();

    expect(errors[0].extras.expectedType).to.equal('number');
    expect(errors[0].extras.actualType).to.equal('string');
  });

  it('should check method argument types', () => {
    const errors = new TDTypeChecker(`
class TestClass {
  constructor() {}

  aFineMethod(s /* t:string */) /* t:string */ {
    return s;
  }

  tonumber(n /* t:number */) /* t:number */ {
    this.aFineMethod(n);
  }
}
`).run();

    expect(errors[0].extras.expectedType).to.equal('string');
    expect(errors[0].extras.actualType).to.equal('number');
  });

  it('should allow super/subclasses', () => {
    const errors = new TDTypeChecker(`
class SuperClass {}
class SubClass extends SuperClass {}

const someClass /* t:SuperClass */ = new SubClass();
`).run();

    expect(errors.length).to.equal(0);
  });

  it('should allow nested super/subclasses', () => {
    const errors = new TDTypeChecker(`
class SuperestClass {}
class SuperClass extends SuperestClass {}
class SubClass extends SuperClass {}

const someClass /* t:SuperestClass */ = new SubClass();
`).run();

    expect(errors.length).to.equal(0);
  });

  describe('using ahead of time declaration', () => {
    it('should allow AOT class declaration', () => {
      const errors = new TDTypeChecker(`
  /**
   * class :: TestClass
   *   astring :: string
   *   aGoodMethod :: string -> string
   */
  class TestClass {
    constructor() {
      this.astring = 'hello';
    }

    aGoodMethod(s /* t:string */) /* t:string */ {
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
   *   astring :: string
   *   aGoodMethod :: string -> number
   */
  class TestClass {
    constructor() {
      this.astring = 'hello';
    }

    aGoodMethod(s /* t:string */) /* t:string */ {
      return s;
    }
  }
  `).run();

      expect(errors[0].extras.expectedType).to.equal('string -> number');
      expect(errors[0].extras.actualType).to.equal('string -> string');
    });

    it('should check against AOT property declarations', () => {
      const errors = new TDTypeChecker(`
  /**
   * class :: TestClass
   *   astring :: string
   *   aGoodMethod :: string -> string
   */
  class TestClass {
    constructor() {
      this.astring = 1;
    }

    aGoodMethod(s /* t:string */) /* t:string */ {
      return s;
    }
  }
  `).run();

      expect(errors[0].extras.expectedType).to.equal('string');
      expect(errors[0].extras.actualType).to.equal('number');
    });

    it('should throw an error in strict mode if it has an undeclared method', () => {
      const errors = new TDTypeChecker(`
  /**
   * class :: TestClass
   *   astring :: string
   *   aGoodMethod :: string -> string
   */
  class TestClass {
    constructor() {
      this.astring = 'hello';
    }

    aGoodMethod(s /* t:string */) /* t:string */ {
      return s;
    }

    aBadMethod(s /* t:string */) /* t:string */ {
      return s;
    }
  }
  `).run({
        strictClassChecks: true
      });

      expect(errors[0].extras.method).to.equal('aBadMethod');
      expect(errors[0].extras.class).to.equal('TestClass');
    });

    it('should throw an error in strict mode if it has an undeclared property', () => {
      const errors = new TDTypeChecker(`
  /**
   * class :: TestClass
   *   astring :: string
   *   aGoodMethod :: string -> string
   */
  class TestClass {
    constructor() {
      this.astring = 'hello';
      this.anotherstring = 'hello';
    }

    aGoodMethod(s /* t:string */) /* t:string */ {
      return s;
    }
  }
  `).run({
        strictClassChecks: true
      });

      expect(errors[0].extras.property).to.equal('anotherstring');
      expect(errors[0].extras.class).to.equal('TestClass');
    });

    it('should check if a method exists in a method call on an instantiated class', () => {
      const errors = new TDTypeChecker(`
  /**
   * class :: TestClass
   *   aGoodMethod :: string -> string
   */
  class TestClass {
    constructor() {
    }

    aGoodMethod(s /* t:string */) /* t:string */ {
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
   *   astring :: string
   */
  class TestClass {
    constructor() {
      this.astring = 'hello';
    }
  }

  const example /* t:TestClass */ = new TestClass();
  example.aBadstring = 'bye';
  `).run({
        strictClassChecks: true
      });

      expect(errors[0].extras.property).to.equal('aBadstring');
      expect(errors[0].extras.class).to.equal('TestClass');
    });

    it('should correctly check arguments', () => {
      const errors = new TDTypeChecker(`
  /**
   * class :: TestClass
   *   aGoodMethod :: string -> string
   */
  class TestClass {
    constructor() {
    }

    aGoodMethod(s /* t:string */) /* t:string */ {
      return s;
    }
  }

  const anumber /* t:number */ = 2;
  const example /* t:TestClass */ = new TestClass();
  const astring /* t:string */ = example.aGoodMethod(anumber);
  `).run({
        strictClassChecks: true
      });

      expect(errors[0].extras.expectedType).to.equal('string');
      expect(errors[0].extras.actualType).to.equal('number');
    });

    it('should allow multiple levels of property access', () => {
      const errors = new TDTypeChecker(`
/**
 * class :: TestClass
 *   aGoodMethod :: string -> string
 */
class TestClass {
  constructor() {
  }

  aGoodMethod(s /* t:string */) /* t:string */ {
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

const anumber /* t:number */ = 2;
const example /* t:ContainerClass */ = new ContainerClass();
const astring /* t:string */ = example.testClass.aBadMethod(anumber);
  `).run({
        strictClassChecks: true
      });

      expect(errors[0].extras.property).to.equal('aBadMethod');
      expect(errors[0].extras.class).to.equal('TestClass');
    });

    it('should allow super/subclasses', () => {
      const errors = new TDTypeChecker(`
/**
 * class :: SuperClass
 */
class SuperClass {}

/**
 * class :: SubClass => SuperClass
 */
class SubClass extends SuperClass {}
const someClass /* t:SuperClass */ = new SubClass();
`).run();

      expect(errors.length).to.equal(0);
    });
  });
});
