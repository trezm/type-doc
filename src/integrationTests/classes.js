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
});
