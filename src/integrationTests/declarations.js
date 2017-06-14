import { stub } from 'sinon';
import { expect } from 'chai';
import { TDTypeChecker } from '../lib/TDTypeChecker';

describe('declarations', () => {
  describe('with classes', () => {
    it('should check class type on instantiation', () => {
      const errors = new TDTypeChecker(`
class Thing1 {}
class Thing2 {}

var hi /* t:Thing1 */ = new Thing2();
`).run();

      expect(errors[0].extras.expectedType).to.equal('Thing1');
      expect(errors[0].extras.actualType).to.equal('Thing2');
    });

    it('should allow class declarations', () => {
      const errors = new TDTypeChecker(`
class TestClass {
  constructor() {}
}
`).run();

      expect(errors.length).to.equal(0);
    });

    it('should check the methods of classes', () => {
      const errors = new TDTypeChecker(`
class TestClass {
  constructor() {}

  aBadMethod(s /* t:string */) /* t:number */ {
    return s;
  }
}
`).run();

      expect(errors[0].extras.expectedType).to.equal('number');
      expect(errors[0].extras.actualType).to.equal('string');
    });
  });

  describe('with functions', () => {
    it('should check the return type of the called expression', () => {
      const errors = new TDTypeChecker(`
var hi /* t:number */ = stringinator();

function stringinator() /* t:string */ {
  return 'asdf';
}
`).run();

      expect(errors[0].extras.expectedType).to.equal('number');
      expect(errors[0].extras.actualType).to.equal('string');
    });

    it('should check the params of the called expression', () => {
      const errors = new TDTypeChecker(`
var hi /* t:string */ = stringinator('1');

function stringinator(n /* t:number */) /* t:string */ {
  return '' + n;
}
`).run();

      expect(errors[0].extras.expectedType).to.equal('number');
      expect(errors[0].extras.actualType).to.equal('string');
    });
  });

  describe('with constants', () => {
    it('should check against string constants', () => {
      const errors = new TDTypeChecker(`
var hi /* t:number */ = 'asdf';
`).run();

      expect(errors[0].extras.expectedType).to.equal('number');
      expect(errors[0].extras.actualType).to.equal('string');
    });

    it('should check against number constants', () => {
      const errors = new TDTypeChecker(`
var bye /* t:string */ = 1;
`).run();

      expect(errors[0].extras.expectedType).to.equal('string');
      expect(errors[0].extras.actualType).to.equal('number');
    });
  });

  describe('with variables', () => {
    it('should check against earlier assignments to the variable', () => {
      const errors = new TDTypeChecker(`
var greeting /* t:string */ = 'hello'
var hi /* t:number */ = greeting;
`).run();

      expect(errors[0].extras.expectedType).to.equal('number');
      expect(errors[0].extras.actualType).to.equal('string');
    });

    it('should respect multiple types', () => {
      const errors = new TDTypeChecker(`
var anumber /* t:string | number */ = '1'
var hi /* t:number */ = anumber;
`).run();

      expect(errors.length).to.equal(0);
    });
  });

  describe('with const', () => {
    it('should assign the type of the right hand to the left hand variable', () => {
      const errors = new TDTypeChecker(`
const greeting = 'hello';
var hi /* t:number */ = greeting;
`).run();

      expect(errors[0].extras.expectedType).to.equal('number');
      expect(errors[0].extras.actualType).to.equal('string');
    });
  })
});
