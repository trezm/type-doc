import { stub } from 'sinon';
import { expect } from 'chai';
import { TDTypeChecker } from '../lib/TDTypeChecker';

describe('functions', () => {
  describe('functions should test return values of arguments', () => {
    it('should allow arguments and not throw errors', () => {
      const errors = new TDTypeChecker(`
function add(x /* t:number */, y /* t:number */) /* t:number */ {
  return x + y;
}

function subtract(x /* t:number */, y /* t:number */) /* t:number */ {
  return x - y;
}`).run();

      expect(errors).to.exist;
      expect(errors.length).to.equal(0);
    });

    it('should throw errors if arguments are returned and the type is wrong', () => {
      const errors = new TDTypeChecker(`
function multiply(x /* t:number */, y /* t:number */) /* t:string */ {
  return x * y;
}`).run();

      expect(errors).to.exist;
      expect(errors.length).to.equal(1);
      expect(errors[0].extras.expectedType).to.equal('string');
      expect(errors[0].extras.actualType).to.equal('number');
    });
  });

  describe('function calls', () => {
    it('should allow function calls as returns', () => {
      const errors = new TDTypeChecker(`
function add(x /* t:number */, y /* t:number */) /* t:number */ {
  return x + y;
}

function addTwo(x /* t:number */) /* t:number */ {
  var two /* t:number */ = 2;

  return add(x, two);
}`).run();

      expect(errors).to.exist;
      expect(errors.length).to.equal(0);
    });

    it('should check the return type of the function', () => {
      const errors = new TDTypeChecker(`
function subtract(x /* t:number */, y /* t:number */) /* t:number */ {
  return x - y;
}

function subtractTwo(x /* t:number */) /* t:string */ {
  return subtract(x, 2);
}`).run();

      expect(errors).to.exist;
      expect(errors.length).to.equal(1);
      expect(errors[0].extras.expectedType).to.equal('string');
      expect(errors[0].extras.actualType).to.equal('number');
    });

    it('should check the argument types', () => {
      const errors = new TDTypeChecker(`
const s /* t:string */ = 'some string';
const n /* t:number */ = 1;

function subtract(x /* t:number */, y /* t:number */) /* t:number */ {
  return x - y;
}

subtract(n, s);
`).run();

      expect(errors).to.exist;
      expect(errors.length).to.equal(1);
      expect(errors[0].extras.expectedType).to.equal('number');
      expect(errors[0].extras.actualType).to.equal('string');
    });
  });

  describe('functions in functions should still respect types', () => {
    it('should allow functions in functions', () => {
      const errors = new TDTypeChecker(`                  // 1
function a(x /* t:string */) /* t:string */ {       // 2
  function b(y /* t:string */) /* t:string */ {     // 3
    function c(z /* t:string */) /* t:string */ {   // 4
      return y + x + z;                             // 5
    }                                               // 6
                                                    // 7
    return c(y);                                    // 8
  }                                                 // 9
                                                    // 10
  return b(x);                                      // 11
}`).run();

      expect(errors).to.exist;
      expect(errors.length).to.equal(0);
    });

    it('should identify type errors from functions in functions declared in parent scopes', () => {
      const errors = new TDTypeChecker(`
function d(x /* t:string */) /* t:string */ {
  function e(y /* t:string */) /* t:string */ {
    function f(z /* t:string */) /* t:number */ {
      return y + x + z;
    }

    return f(y);
  }

  return e(x);
}`).run();

      expect(errors).to.exist;
      expect(errors.length).to.equal(2);
      expect(errors[0].extras.expectedType).to.equal('number');
      expect(errors[0].extras.actualType).to.equal('string');
      expect(errors[1].extras.expectedType).to.equal('string');
      expect(errors[1].extras.actualType).to.equal('number');
    });
  });
});
