import { stub } from 'sinon';
import { expect } from 'chai';
import { typeChecker } from '../typeChecker';

describe('classes', () => {
  it('should respect `this.`', () => {
    const errors = typeChecker(`
class TestClass {
  constructor() {}

  aGoodMethod1(s /* t:string */) /* t:string */ {
    return s;
  }

  aGoodMethod2(s /* t:string */) /* t:string */ {
    return this.aGoodMethod1(s);
  }
}
`);

    expect(errors.length).to.equal(0);
  });

  it('should be able to test against class methods', () => {
    const errors = typeChecker(`
class TestClass {
  constructor() {}

  aFineMethod(s /* t:string */) /* t:string */ {
    return s;
  }

  toNumber(s /* t:string */) /* t:number */ {
    return this.aBadMethod(s);
  }
}
`);

    expect(errors[0].extras.expectedType).to.equal('number');
    expect(errors[0].extras.actualType).to.equal('string');
  });

  it('should check method argument types', () => {
    const errors = typeChecker(`
class TestClass {
  constructor() {}

  aFineMethod(s /* t:string */) /* t:string */ {
    return s;
  }

  toNumber(n /* t:number */) /* t:number */ {
    this.aBadMethod(n);
  }
}
`);

    expect(errors[0].extras.expectedType).to.equal('number');
    expect(errors[0].extras.actualType).to.equal('string');
  });
});
