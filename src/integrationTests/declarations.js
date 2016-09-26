import { stub } from 'sinon';
import { expect } from 'chai';
import { typeChecker } from '../typeChecker';

describe('declarations', () => {
  describe('with classes', () => {
    it('should check class type on instantiation', () => {
      const errors = typeChecker(`
class Thing1 {}
class Thing2 {}

var hi /* t:Thing1 */ = new Thing2();
`);

      expect(errors[0].extras.expectedType).to.equal('Thing1');
      expect(errors[0].extras.actualType).to.equal('Thing2');
    });
  });

  describe('with constants', () => {
    it('should check against string constants', () => {
      const errors = typeChecker(`
var hi /* t:number */ = 'asdf';
`);

      expect(errors[0].extras.expectedType).to.equal('number');
      expect(errors[0].extras.actualType).to.equal('string');
    });

    it('should check against number constants', () => {
      const errors = typeChecker(`
var bye /* t:string */ = 1;
`);

      expect(errors[0].extras.expectedType).to.equal('string');
      expect(errors[0].extras.actualType).to.equal('number');
    });
  });

  describe('with variables', () => {
    it('should check against earlier assignments to the variable', () => {
      const errors = typeChecker(`
var greeting /* t:string */ = 'hello'
var hi /* t:number */ = greeting;
`);

      expect(errors[0].extras.expectedType).to.equal('number');
      expect(errors[0].extras.actualType).to.equal('string');
    });
  })
});
