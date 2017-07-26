import { stub } from 'sinon';
import { expect } from 'chai';
import { TDTypeChecker } from '../lib/TDTypeChecker';

describe('jsdoc', () => {
  describe('types', () => {
    it('should properly assign types from multiline jsdoc types', () => {
      const errors = new TDTypeChecker(`
/**
 * @type {number}
 */
const n = 1;

/**
 * @type {string}
 */
const s = n;
`).run();

      expect(errors).to.exist;
      expect(errors.length).to.equal(1);
      expect(errors[0].extras.expectedType).to.equal('string');
      expect(errors[0].extras.actualType).to.equal('number');
    });

    it('should properly assign types from single line jsdoc types', () => {
      const errors = new TDTypeChecker(`
/** @type {number} */
const n = 1;

/** @type {string} */
const s = n;
`).run();

      expect(errors).to.exist;
      expect(errors.length).to.equal(1);
      expect(errors[0].extras.expectedType).to.equal('string');
      expect(errors[0].extras.actualType).to.equal('number');
    });
  });

  describe('typedef', () => {
    it('should be treated like a typedoc class', () => {
      const errors = new TDTypeChecker(`
  /**
   * @typedef {Object} Options
   * @property {string} someString
   */

  /** @type {Options} */
  const example = { someString: 'asdf' };

  /** @type {number} */
  const someNumber = example.someBadString;
  `).run({
        strictClassChecks: true
      });

      expect(errors[0].extras.property).to.equal('someBadString');
      expect(errors[0].extras.class).to.equal('Options');
    });

    it('should check types on typedefs', () => {
      const errors = new TDTypeChecker(`
  /**
   * @typedef {Object} Options
   * @property {string} someString
   */

  /** @type {Options} */
  const example = { someString: 'asdf' };

  /** @type {number} */
  const someNumber = example.someString;
  `).run({
        strictClassChecks: true
      });

      expect(errors[0].extras.expectedType).to.equal('number');
      expect(errors[0].extras.actualType).to.equal('string');
    });
  });

  describe('functions', () => {
    it('should properly recognize errors using jsdoc types', () => {
      const errors = new TDTypeChecker(`
const n /* t:number */ = 1;
const s /* t:string */ = 'asdf';

/**
 * Add two numbers
 *
 * @param {number} a - The first number
 * @param {number} b - The second number
 * @returns {number} - the sum of the arguments
 */
function add(a, b) {
  return a + b;
}

add(n, s)`).run();

      expect(errors).to.exist;
      expect(errors.length).to.equal(1);
      expect(errors[0].extras.expectedType).to.equal('number');
      expect(errors[0].extras.actualType).to.equal('string');
    });

    it('should check against argument types', () => {
      const errors = new TDTypeChecker(`
/**
 * Really doesn't do much...
 *
 * @param {number} somenumber - a number
 * @returns {string} the string of a number
 */
function someFunction(somenumber) {
    const somestring /* t:string */ = somenumber;
    return somestring;
}`).run();

      expect(errors).to.exist;
      expect(errors.length).to.equal(1);
      expect(errors[0].extras.expectedType).to.equal('string');
      expect(errors[0].extras.actualType).to.equal('number');
    });
  });

  describe('functions as classes', () => {
    it('should allow @class to be used with functions', () => {
      const errors = new TDTypeChecker(`
/**
 * Add two numbers
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
const n /* t:number */ = 1;
const s /* t:string */ = 'asdf';

/**
 * @class TestClass
 */
class TestClass {
  constructor() {
    const s /* t:string */ = this.add(1, 2);
  }

  /**
   * Add two numbers
   *
   * @memberof TestClass
   * @param {number} a - The first number
   * @param {number} b - The second number
   * @returns {number} - the sum of the arguments
   */
  add(a, b) {
    return a + b;
  }
}
`).run();

      expect(errors).to.exist;
      expect(errors.length).to.equal(1);
      expect(errors[0].extras.expectedType).to.equal('string');
      expect(errors[0].extras.actualType).to.equal('number');
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
   * Add two numbers
   *
   * @memberOf TestClass
   * @param {number} a - The first number
   * @param {number} b - The second number
   * @returns {number} - the sum of the arguments
   */
  add(a, b) {
    return a + b;
  }

  /**
   * Add two numbers
   *
   * @memberOf TestClass
   * @param {string} a - The first number
   * @param {string} b - The second number
   * @returns {string} - the sum of the arguments
   */
  adds(a, b) {
    return this.add(number(a), number(b));
  }
}
`).run();

      expect(errors).to.exist;
      expect(errors.length).to.equal(1);
      expect(errors[0].extras.expectedType).to.equal('string');
      expect(errors[0].extras.actualType).to.equal('number');
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
     * @param {string} s - The string to return
     * @returns {string} - the string passed in
     */
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
  });
});
