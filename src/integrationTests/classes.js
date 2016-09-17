import { stub } from 'sinon';
import { expect } from 'chai';
import { typeChecker } from '../typeChecker';

describe('classes', () => {
  describe.skip('classes should test return values of arguments', () => {
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
});
