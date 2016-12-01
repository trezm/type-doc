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
  });

  describe('class methods', () => {
    it('should properly recognize errors using jsdoc types', () => {
      const errors = new TDTypeChecker(`
const n /* t:Number */ = 1;
const s /* t:String */ = 'asdf';

class TestClass {
  constructor() {
    const s /* t:String */ = this.add(1, 2);
  }

  /**
   * Add two Numbers
   *
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
class TestClass {
  constructor() {
  }

  /**
   * Add two Numbers
   *
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
   * @param {String} a - The first Number
   * @param {String} b - The second Number
   * @returns {String} - the sum of the arguments
   */
  adds(a, b) {
    return this.add(a, b);
  }
}
`).run();

      expect(errors).to.exist;
      expect(errors.length).to.equal(1);
      expect(errors[0].extras.expectedType).to.equal('String');
      expect(errors[0].extras.actualType).to.equal('Number');
    });
  });
});
