import { stub } from 'sinon';
import { expect } from 'chai';
import { typeChecker } from '../typeChecker';

describe('functions', () => {
  describe('functions should test return values of arguments', () => {
    it('should allow arguments and not throw errors', () => {
      const errors = typeChecker(`
function add(x /* t:number */, y /* t:number */) /* t:number */ {
  return x + y;
}

function subtract(x /* t:number */, y /* t:number */) /* t:number */ {
  return x - y;
}`);

      expect(errors).to.exist;
      expect(errors.length).to.equal(0);
    });

    it('should throw errors if arguments are returned and the type is wrong', () => {
      const errors = typeChecker(`
function multiply(x /* t:number */, y /* t:number */) /* t:string */ {
  return x + y;
}`);

      expect(errors).to.exist;
      expect(errors.length).to.equal(1);
      expect(errors[0].extras.expectedType).to.equal('string');
      expect(errors[0].extras.actualType).to.equal('number');
    });
  });

  describe('function calls', () => {
    it('should allow function calls as returns', () => {
      const errors = typeChecker(`
function add(x /* t:number */, y /* t:number */) /* t:number */ {
  return x + y;
}

function addTwo(x /* t:number */) /* t:number */ {
  var two /* t:number */ = 2;

  return add(x, two);
}`);

      expect(errors).to.exist;
      expect(errors.length).to.equal(0);
    });

    it('should check the return type of the function', () => {
      const errors = typeChecker(`
function subtract(x /* t:number */, y /* t:number */) /* t:number */ {
  return x - y;
}

function subtractTwo(x /* t:number */) /* t:string */ {
  return subtract(x, 2);
}`);

      expect(errors).to.exist;
      expect(errors.length).to.equal(1);
      expect(errors[0].extras.expectedType).to.equal('string');
      expect(errors[0].extras.actualType).to.equal('number');
    });
  });

  describe('functions in functions should still respect types', () => {
    it('should allow functions in functions', () => {
      const errors = typeChecker(`                  // 1
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
}`);

      expect(errors).to.exist;
      expect(errors.length).to.equal(0);
    });

    it('should identify type errors from functions in functions declared in parent scopes', () => {
      const errors = typeChecker(`                  // 1
function d(x /* t:string */) /* t:string */ {       // 2
  function e(y /* t:string */) /* t:string */ {     // 3
    function f(z /* t:string */) /* t:number */ {   // 4
      return y + x + z;                             // 5
    }                                               // 6
                                                    // 7
    return f(y);                                    // 8
  }                                                 // 9
                                                    // 10
  return e(x);                                      // 11
}`);

      expect(errors).to.exist;
      expect(errors.length).to.equal(2);
      expect(errors[0].extras.expectedType).to.equal('number');
      expect(errors[0].extras.actualType).to.equal('string');
      expect(errors[1].extras.expectedType).to.equal('string');
      expect(errors[1].extras.actualType).to.equal('number');
    });
  });
});
