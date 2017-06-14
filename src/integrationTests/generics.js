import { stub } from 'sinon';
import { expect } from 'chai';
import { TDTypeChecker } from '../lib/TDTypeChecker';

describe('generics', () => {
  it('should not freak out when used', () => {
    const errors = new TDTypeChecker(`
var stringArray /* t:Array string */ = [];
`).run();

    expect(errors.length).to.equal(0);
  });

  it('should throw an error when the generic type does not match', () => {
    const errors = new TDTypeChecker(`
var numberArray /* t:Array number */ = []
var stringArray /* t:Array string */ = numberArray;
`).run();

    expect(errors[0].extras.expectedType).to.equal('Array string');
    expect(errors[0].extras.actualType).to.equal('Array number');
  });

  it('should throw errors with inline generics with hints', () => {
    const errors = new TDTypeChecker(`
function translate(input /* t:a */, translationFunction /* t:a -> b */) /* t:b */ {
  return translationFunction(input);
}

const anumber /* t:number */ = 4
const results /* t:string */ = translate(anumber, (thenumber /* t:number */) => thenumber);
`).run();

    expect(errors[0].extras.expectedType).to.equal('string');
    expect(errors[0].extras.actualType).to.equal('number');
  });

  it('should throw errors with inline generics without hints', () => {
    const errors = new TDTypeChecker(`
function translate(input /* t:a */, translationFunction /* t:a -> b */) /* t:b */ {
  return translationFunction(input);
}

const anumber /* t:number */ = 4
const results /* t:string */ = translate(anumber, (thenumber) => thenumber);
`).run();

    expect(errors[0].extras.expectedType).to.equal('string');
    expect(errors[0].extras.actualType).to.equal('number');
  });

  it('should throw errors with inline mixed generics', () => {
    const errors = new TDTypeChecker(`
function makeAnumber(input /* t:a */, numberifier /* t:a -> number */) /* t:number */ {
  return numberifier(input);
}

const astring /* t:string */ = '4';
const anumber /* t:string */ = makeAnumber(astring, (anotherstring) => number(anotherstring));
`).run();

    expect(errors[0].extras.expectedType).to.equal('string');
    expect(errors[0].extras.actualType).to.equal('number');
  });

  it('should throw an error if a generic is inconsistent', () => {
    const errors = new TDTypeChecker(`
function add(input1 /* t:a */, input2 /* t:a */) /* t:a */ {
  return input1 + input2;
}

const anumber /* t:number */ = 4;
const astring /* t:string */ = '5';
add(anumber, astring);
`).run();

    expect(errors[0].extras.type1).to.equal('number');
    expect(errors[0].extras.type2).to.equal('string');
  });
});
