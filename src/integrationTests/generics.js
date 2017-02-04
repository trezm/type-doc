import { stub } from 'sinon';
import { expect } from 'chai';
import { TDTypeChecker } from '../lib/TDTypeChecker';

describe('generics', () => {
  it('should not freak out when used', () => {
    const errors = new TDTypeChecker(`
var stringArray /* t:Array String */ = [];
`).run();

    expect(errors.length).to.equal(0);
  });

  it('should throw an error when the generic type does not match', () => {
    const errors = new TDTypeChecker(`
var NumberArray /* t:Array Number */ = []
var stringArray /* t:Array String */ = NumberArray;
`).run();

    expect(errors[0].extras.expectedType).to.equal('Array String');
    expect(errors[0].extras.actualType).to.equal('Array Number');
  });

  it('should throw errors with inline generics with hints', () => {
    const errors = new TDTypeChecker(`
function translate(input /* t:a */, translationFunction /* t:a -> b */) /* t:b */ {
  return translationFunction(input);
}

const aNumber /* t:Number */ = 4
const results /* t:String */ = translate(aNumber, (theNumber /* t:Number */) => theNumber);
`).run();

    expect(errors[0].extras.expectedType).to.equal('String');
    expect(errors[0].extras.actualType).to.equal('Number');
  });

  it('should throw errors with inline generics without hints', () => {
    const errors = new TDTypeChecker(`
function translate(input /* t:a */, translationFunction /* t:a -> b */) /* t:b */ {
  return translationFunction(input);
}

const aNumber /* t:Number */ = 4
const results /* t:String */ = translate(aNumber, (theNumber) => theNumber);
`).run();

    expect(errors[0].extras.expectedType).to.equal('String');
    expect(errors[0].extras.actualType).to.equal('Number');
  });

  it('should throw errors with inline mixed generics', () => {
    const errors = new TDTypeChecker(`
function makeANumber(input /* t:a */, numberifier /* t:a -> Number */) /* t:Number */ {
  return numberifier(input);
}

const aString /* t:String */ = '4';
const aNumber /* t:String */ = makeANumber(aString, (anotherString) => Number(anotherString));
`).run();

    expect(errors[0].extras.expectedType).to.equal('String');
    expect(errors[0].extras.actualType).to.equal('Number');
  });

  it('should throw an error if a generic is inconsistent', () => {
    const errors = new TDTypeChecker(`
function add(input1 /* t:a */, input2 /* t:a */) /* t:a */ {
  return input1 + input2;
}

const aNumber /* t:Number */ = 4;
const aString /* t:String */ = '5';
add(aNumber, aString);
`).run();

    expect(errors[0].extras.type1).to.equal('Number');
    expect(errors[0].extras.type2).to.equal('String');
  });
});
