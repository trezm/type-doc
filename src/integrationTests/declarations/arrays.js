import { stub } from 'sinon';
import { expect } from 'chai';
import { TDTypeChecker } from '../../lib/TDTypeChecker';

describe('[declarations] Arrays', () => {
  it('should be able to run through simple types and maps', () => {
    const errors = new TDTypeChecker(`
var s /* t:String */ = new Array(10).map(() => 'a').join('');
`).run();

    expect(errors.length).to.equal(0);
  });

  it('should be able to detect inconsistency after a join', () => {
    const errors = new TDTypeChecker(`
var s /* t:Number */ = new Array(10).map(() => 'a').join('');
`).run();

    expect(errors[0].extras.expectedType).to.equal('Number');
    expect(errors[0].extras.actualType).to.equal('String');
  });

  it('should properly map generics in map functions', () => {
    const errors = new TDTypeChecker(`
const someStringArray /* t:Array String */ = ['hello'];
const array /* t:Array TDType */ = someStringArray.map((typeString, index, mappedArray) => new TDType(typeString));
`).run();

    expect(errors.length).to.equal(0);
  });
});
