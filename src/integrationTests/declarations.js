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

  aBadMethod(s /* t:String */) /* t:Number */ {
    return s;
  }
}
`).run();

      expect(errors[0].extras.expectedType).to.equal('Number');
      expect(errors[0].extras.actualType).to.equal('String');
    });
  });

  describe('with functions', () => {
    it('should check the return type of the called expression', () => {
      const errors = new TDTypeChecker(`
var hi /* t:Number */ = stringinator();

function stringinator() /* t:String */ {
  return 'asdf';
}
`).run();

      expect(errors[0].extras.expectedType).to.equal('Number');
      expect(errors[0].extras.actualType).to.equal('String');
    });

    it('should check the params of the called expression', () => {
      const errors = new TDTypeChecker(`
var hi /* t:String */ = stringinator('1');

function stringinator(n /* t:Number */) /* t:String */ {
  return '' + n;
}
`).run();

      expect(errors[0].extras.expectedType).to.equal('Number');
      expect(errors[0].extras.actualType).to.equal('String');
    });
  });

  describe('with constants', () => {
    it('should check against string constants', () => {
      const errors = new TDTypeChecker(`
var hi /* t:Number */ = 'asdf';
`).run();

      expect(errors[0].extras.expectedType).to.equal('Number');
      expect(errors[0].extras.actualType).to.equal('String');
    });

    it('should check against Number constants', () => {
      const errors = new TDTypeChecker(`
var bye /* t:String */ = 1;
`).run();

      expect(errors[0].extras.expectedType).to.equal('String');
      expect(errors[0].extras.actualType).to.equal('Number');
    });
  });

  describe('with variables', () => {
    it('should check against earlier assignments to the variable', () => {
      const errors = new TDTypeChecker(`
var greeting /* t:String */ = 'hello'
var hi /* t:Number */ = greeting;
`).run();

      expect(errors[0].extras.expectedType).to.equal('Number');
      expect(errors[0].extras.actualType).to.equal('String');
    });

    it('should respect multiple types', () => {
      const errors = new TDTypeChecker(`
var aNumber /* t:String | Number */ = '1'
var hi /* t:Number */ = aNumber;
`).run();

      expect(errors.length).to.equal(0);
    });
  });

  describe('with const', () => {
    it('should assign the type of the right hand to the left hand variable', () => {
      const errors = new TDTypeChecker(`
const greeting = 'hello';
var hi /* t:Number */ = greeting;
`).run();

      expect(errors[0].extras.expectedType).to.equal('Number');
      expect(errors[0].extras.actualType).to.equal('String');
    });
  })
});
