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

  aFineMethod(s /* t:string */) /* t:string */ {
    return s;
  }

  toNumber(s /* t:string */) /* t:number */ {
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

  toNumber(n /* t:number */) /* t:number */ {
    this.aBadMethod(n);
  }
}
`).run();

    expect(errors[0].extras.expectedType).to.equal('number');
    expect(errors[0].extras.actualType).to.equal('string');
  });
});
