import { stub } from 'sinon';
import { expect } from 'chai';
import { TDTypeChecker } from '../lib/TDTypeChecker';

describe('jsdoc', () => {
  describe('functions', () => {
    it('should properly recognize errors using jsdoc types', () => {
      const errors = new TDTypeChecker(`
const n /* t:Number */ = 1;
const s /* t:String */ = 'asdf';

/**
 * Add two Numbers
 *
 * @param {Number} a - The first Number
 * @param {Number} b - The second Number
 * @returns {Number} - the sum of the arguments
 */
function add(a, b) {
  return a + b;
}

add(n, s)`).run();

      expect(errors).to.exist;
      expect(errors.length).to.equal(1);
      expect(errors[0].extras.expectedType).to.equal('Number');
      expect(errors[0].extras.actualType).to.equal('String');
    });

    it('should check against argument types', () => {
      const errors = new TDTypeChecker(`
/**
 * Really doesn't do much...
 *
 * @param {Number} someNumber - a number
 * @returns {String} the string of a number
 */
function someFunction(someNumber) {
    const someString /* t:String */ = someNumber;
    return someString;
}`).run();

      expect(errors).to.exist;
      expect(errors.length).to.equal(1);
      expect(errors[0].extras.expectedType).to.equal('String');
      expect(errors[0].extras.actualType).to.equal('Number');
    });
  });

  describe('functions as classes', () => {
    it('should allow @class to be used with functions', () => {
      const errors = new TDTypeChecker(`
/**
 * Add two Numbers
 *
 * @class SomeClass
 */
function SomeClass(a, b) {

}`).run();

      expect(errors).to.exist;
      expect(errors.length).to.equal(0);
    });
  });

  describe('class methods', () => {
    it('should properly recognize errors using jsdoc types', () => {
      const errors = new TDTypeChecker(`
const n /* t:Number */ = 1;
const s /* t:String */ = 'asdf';

/**
 * @class TestClass
 */
class TestClass {
  constructor() {
    const s /* t:String */ = this.add(1, 2);
  }

  /**
   * Add two Numbers
   *
   * @memberOf TestClass
   * @param {Number} a - The first Number
   * @param {Number} b - The second Number
   * @returns {Number} - the sum of the arguments
   */
  add(a, b) {
    return a + b;
  }
}
`).run();

      expect(errors).to.exist;
      expect(errors.length).to.equal(1);
      expect(errors[0].extras.expectedType).to.equal('String');
      expect(errors[0].extras.actualType).to.equal('Number');
    });

    it('should check return values of other methods', () => {
      const errors = new TDTypeChecker(`
/**
 * @class TestClass
 */
class TestClass {
  constructor() {
  }

  /**
   * Add two Numbers
   *
   * @memberOf TestClass
   * @param {Number} a - The first Number
   * @param {Number} b - The second Number
   * @returns {Number} - the sum of the arguments
   */
  add(a, b) {
    return a + b;
  }

  /**
   * Add two Numbers
   *
   * @memberOf TestClass
   * @param {String} a - The first Number
   * @param {String} b - The second Number
   * @returns {String} - the sum of the arguments
   */
  adds(a, b) {
    return this.add(Number(a), Number(b));
  }
}
`).run();

      expect(errors).to.exist;
      expect(errors.length).to.equal(1);
      expect(errors[0].extras.expectedType).to.equal('String');
      expect(errors[0].extras.actualType).to.equal('Number');
    });

    it('should check if a method exists in a method call on an instantiated class', () => {
      const errors = new TDTypeChecker(`
/**
 * @class TestClass
 */
  class TestClass {
    constructor() {
    }

    /**
     * Returns the string it's passed
     *
     * @memberOf TestClass
     * @param {String} s - The string to return
     * @returns {String} - the string passed in
     */
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
  });
});
