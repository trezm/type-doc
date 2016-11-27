import { stub } from 'sinon';
import { expect } from 'chai';
import { TDTypeChecker } from '../lib/TDTypeChecker';

describe('jsdoc', () => {
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
  });

  describe('class methods', () => {
    it('should properly recognize errors using jsdoc types', () => {
      const errors = new TDTypeChecker(`
const n /* t:number */ = 1;
const s /* t:string */ = 'asdf';

class TestClass {
  constructor() {
    const s /* t:string */ = this.add(1, 2);
  }

  /**
   * Add two numbers
   *
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
class TestClass {
  constructor() {
  }

  /**
   * Add two numbers
   *
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
   * @param {string} a - The first number
   * @param {string} b - The second number
   * @returns {string} - the sum of the arguments
   */
  adds(a, b) {
    return this.add(a, b);
  }
}
`).run();

      expect(errors).to.exist;
      expect(errors.length).to.equal(1);
      expect(errors[0].extras.expectedType).to.equal('string');
      expect(errors[0].extras.actualType).to.equal('number');
    });
  });
});
