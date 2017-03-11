import { stub } from 'sinon';
import { expect } from 'chai';
import { TDTypeChecker } from '../lib/TDTypeChecker';

describe('functions', () => {
  describe('should test return values of arguments', () => {
    it('should allow arguments and not throw errors', () => {
      const errors = new TDTypeChecker(`
function add(x /* t:Number */, y /* t:Number */) /* t:Number */ {
  return x + y;
}

function subtract(x /* t:Number */, y /* t:Number */) /* t:Number */ {
  return x - y;
}`).run();

      expect(errors).to.exist;
      expect(errors.length).to.equal(0);
    });

    it('should throw errors if arguments are returned and the type is wrong', () => {
      const errors = new TDTypeChecker(`
function multiply(x /* t:Number */, y /* t:Number */) /* t:String */ {
  return x * y;
}`).run();

      expect(errors).to.exist;
      expect(errors.length).to.equal(1);
      expect(errors[0].extras.expectedType).to.equal('String');
      expect(errors[0].extras.actualType).to.equal('Number');
    });
  });

  describe('calls', () => {
    it('should allow function calls as returns', () => {
      const errors = new TDTypeChecker(`
function add(x /* t:Number */, y /* t:Number */) /* t:Number */ {
  return x + y;
}

function addTwo(x /* t:Number */) /* t:Number */ {
  var two /* t:Number */ = 2;

  return add(x, two);
}`).run();

      expect(errors).to.exist;
      expect(errors.length).to.equal(0);
    });

    it('should check the return type of the function', () => {
      const errors = new TDTypeChecker(`
function subtract(x /* t:Number */, y /* t:Number */) /* t:Number */ {
  return x - y;
}

function subtractTwo(x /* t:Number */) /* t:String */ {
  return subtract(x, 2);
}`).run();

      expect(errors).to.exist;
      expect(errors.length).to.equal(1);
      expect(errors[0].extras.expectedType).to.equal('String');
      expect(errors[0].extras.actualType).to.equal('Number');
    });

    it('should check the argument types', () => {
      const errors = new TDTypeChecker(`
const s /* t:String */ = 'some string';
const n /* t:Number */ = 1;

function subtract(x /* t:Number */, y /* t:Number */) /* t:Number */ {
  return x - y;
}

subtract(n, s);
`).run();

      expect(errors).to.exist;
      expect(errors.length).to.equal(1);
      expect(errors[0].extras.expectedType).to.equal('Number');
      expect(errors[0].extras.actualType).to.equal('String');
    });

    it('should check return types of called functions as arguments', () => {
      const errors = new TDTypeChecker(`
function zero() /* t:String */ {
  return '0';
}

function addOne(x /* t:Number */) /* t:Number */ {
  return x + 1;
}

addOne(zero());
`).run();

      expect(errors).to.exist;
      expect(errors.length).to.equal(1);
      expect(errors[0].extras.expectedType).to.equal('Number');
      expect(errors[0].extras.actualType).to.equal('String');
    });

    it('should allow inline functions', () => {
      const errors = new TDTypeChecker(`
function addOne(x /* t:String */, stringToNumber /* t:String -> Number */) /* t:Number */ {
  return stringToNumber(x) + 1;
}

addOne('0', (aString /* t:String */) => Number(aString));
`).run();

      expect(errors).to.exist;
      expect(errors.length).to.equal(0);
    });

    it('should check inline function return types', () => {
      const errors = new TDTypeChecker(`
function addOne(x /* t:String */, stringToNumber /* t:String -> Number */) /* t:Number */ {
  return 1;
}

addOne('0', (aString /* t:String */) => aString);
`).run();

      expect(errors).to.exist;
      expect(errors.length).to.equal(1);
      expect(errors[0].extras.expectedType).to.equal('String -> Number');
      expect(errors[0].extras.actualType).to.equal('String -> String');
    });

    it('should not throw an error if there is a callback', () => {
      const errors = new TDTypeChecker(`
/**
 *
 * @param {Function} callback - a callback to call
 */
function someFunction(callback) {
    return callback('asdf');
}
`).run();

      expect(errors).to.exist;
      expect(errors.length).to.equal(0);
    });
  });

  describe('in functions should still respect types', () => {
    it('should allow functions in functions', () => {
      const errors = new TDTypeChecker(`                  // 1
function a(x /* t:String */) /* t:String */ {       // 2
  function b(y /* t:String */) /* t:String */ {     // 3
    function c(z /* t:String */) /* t:String */ {   // 4
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
function d(x /* t:String */) /* t:String */ {
  function e(y /* t:String */) /* t:String */ {
    function f(z /* t:String */) /* t:Number */ {
      return y + x + z;
    }

    return f(y);
  }

  return e(x);
}`).run();

      expect(errors).to.exist;
      expect(errors.length).to.equal(2);
      expect(errors[0].extras.expectedType).to.equal('Number');
      expect(errors[0].extras.actualType).to.equal('String');
      expect(errors[1].extras.expectedType).to.equal('String');
      expect(errors[1].extras.actualType).to.equal('Number');
    });
  });

  it('should allow chained functions (like promises)', () => {
    const errors = new TDTypeChecker(`
messaging.getToken()
  .then(function(refreshedToken) {
    userService.addFCMToken(refreshedToken)
  })
  .catch(function(err) {
    console.log('Unable to retrieve refreshed token ', err);
  });
    `).run();

    expect(errors).to.exist;
    expect(errors.length).to.equal(0);
  });

  it('should allow a function passed in as an any argument to accept an empty object', () => {
    const errors = new TDTypeChecker(`
function f(a) {
  a({});
}
    `).run();

    expect(errors).to.exist;
    expect(errors.length).to.equal(0);
  });
});
