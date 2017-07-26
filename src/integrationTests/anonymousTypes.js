import { stub } from 'sinon';
import { expect } from 'chai';
import { TDTypeChecker } from '../lib/TDTypeChecker';

describe('anonymous type', () => {
  describe('assignments', () => {
    it('should use ducktyping', () => {
      const errors = new TDTypeChecker(`
  /**
   * @typedef {Object} Options
   * @property {string} someString
   */

  /** @type {Options} */
  const example = { someString: 2 };
  `).run({
        strictClassChecks: true
      });

      expect(errors).to.exist;
      expect(errors.length).to.equal(1);
      expect(errors[0].extras.expectedType).to.equal('Options');
      expect(errors[0].extras.actualType).to.equal('{"someString":"number"}');
    });

    it('should use ducktyping for params', () => {
      const errors = new TDTypeChecker(`
  /**
   * @typedef {Object} Options
   * @property {string} someString
   */

  /**
   * Does a whole lotta nothin'
   *
   * @param {Options} options
   */
  function doNothingWithOptions(options) {}

  doNothingWithOptions({ someString: 1 });
  `).run({
        strictClassChecks: true
      });

      expect(errors).to.exist;
      expect(errors.length).to.equal(1);
      expect(errors[0].extras.expectedType).to.equal('Options');
      expect(errors[0].extras.actualType).to.equal('{"someString":"number"}');
    });

    it('should not throw an error if everything checks out', () => {
      const errors = new TDTypeChecker(`
  /**
   * @typedef {Object} Options
   * @property {string} someString
   */

  /**
   * Does a whole lotta nothin'
   *
   * @param {Options} options
   */
  function doNothingWithOptions(options) {}

  doNothingWithOptions({ someString: 'asdf' });
  `).run({
        strictClassChecks: true
      });

      expect(errors).to.exist;
      expect(errors.length).to.equal(0);
    });
  });

  describe('functions', () => {
    it('should allow ducktyping', () => {
      const errors = new TDTypeChecker(`
  /**
   * @typedef {Object} Options
   * @property {string} someString
   */

  /**
   * @param {Options} opts
   * @returns {Options}
   */
  function optionTest(opts) {
    return opts;
  }

  optionTest({ someString: 2 });
  `).run({
        strictClassChecks: true
      });

      expect(errors).to.exist;
      expect(errors.length).to.equal(1);
      expect(errors[0].extras.expectedType).to.equal('Options');
      expect(errors[0].extras.actualType).to.equal('{"someString":"number"}');
    });
  });
});
