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

    it('should allow class declarations', () => {
      const errors = typeChecker(`
class TestClass {
  constructor() {}
}
`);

      expect(errors.length).to.equal(0);
    });

    it('should check the methods of classes', () => {
      const errors = typeChecker(`
class TestClass {
  constructor() {}

  aBadMethod(s /* t:string */) /* t:number */ {
    return s;
  }
}
`);

      expect(errors[0].extras.expectedType).to.equal('number');
      expect(errors[0].extras.actualType).to.equal('string');
    });
  });

  describe('with functions', () => {
    it('should check the return type of the called expression', () => {
      const errors = typeChecker(`
var hi /* t:number */ = stringinator();

function stringinator() /* t:string */ {
  return 'asdf';
}
`);

      expect(errors[0].extras.expectedType).to.equal('number');
      expect(errors[0].extras.actualType).to.equal('string');
    });

    it('should check the params of the called expression', () => {
      const errors = typeChecker(`
var hi /* t:string */ = stringinator('1');

function stringinator(n /* t:number */) /* t:string */ {
  return '' + n;
}
`);

      expect(errors[0].extras.expectedType).to.equal('number');
      expect(errors[0].extras.actualType).to.equal('string');
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
  });
});
