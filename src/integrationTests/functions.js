import { stub } from 'sinon';
import { expect } from 'chai';
import { TDTypeChecker } from '../lib/TDTypeChecker';

describe('functions', () => {
  describe('return values and arguments', () => {
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

  describe('calls', () => {
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

    it('should check return types of called functions as arguments', () => {
      const errors = new TDTypeChecker(`
function zero() /* t:string */ {
  return '0';
}

function addOne(x /* t:number */) /* t:number */ {
  return x + 1;
}

addOne(zero());
`).run();

      expect(errors).to.exist;
      expect(errors.length).to.equal(1);
      expect(errors[0].extras.expectedType).to.equal('number');
      expect(errors[0].extras.actualType).to.equal('string');
    });

    it('should allow inline functions', () => {
      const errors = new TDTypeChecker(`
function addOne(x /* t:string */, stringTonumber /* t:string -> number */) /* t:number */ {
  return stringTonumber(x) + 1;
}

addOne('0', (astring /* t:string */) => number(astring));
`).run();

      expect(errors).to.exist;
      expect(errors.length).to.equal(0);
    });

    it('should check inline function return types', () => {
      const errors = new TDTypeChecker(`
function addOne(x /* t:string */, stringTonumber /* t:string -> number */) /* t:number */ {
  return 1;
}

addOne('0', (astring /* t:string */) => astring);
`).run();

      expect(errors).to.exist;
      expect(errors.length).to.equal(1);
      expect(errors[0].extras.expectedType).to.equal('string -> number');
      expect(errors[0].extras.actualType).to.equal('string -> string');
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

  it('should be able to handle arrow functions with references to outter scopes', () => {
    const errors = new TDTypeChecker(`
let someResult /* t:string */;
const test = (result) => someResult = result;
test(4);
    `).run();

    expect(errors).to.exist;
    expect(errors.length).to.equal(1);
    expect(errors[0].extras.expectedType).to.equal('string');
    expect(errors[0].extras.actualType).to.equal('number');
  });
});
