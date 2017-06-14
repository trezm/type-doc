import { stub } from 'sinon';
import { expect } from 'chai';
import { TDTypeChecker } from '../../lib/TDTypeChecker';

describe('[declarations] Arrays', () => {
  it('should be able to run through simple types and maps', () => {
    const errors = new TDTypeChecker(`
var s /* t:string */ = new Array(10).map(() => 'a').join('');
`).run();

    expect(errors.length).to.equal(0);
  });

  it('should be able to detect inconsistency after a join', () => {
    const errors = new TDTypeChecker(`
var s /* t:number */ = new Array(10).map(() => 'a').join('');
`).run();

    expect(errors[0].extras.expectedType).to.equal('number');
    expect(errors[0].extras.actualType).to.equal('string');
  });

  it('should properly map generics in map functions', () => {
    const errors = new TDTypeChecker(`
const somestringArray /* t:Array string */ = ['hello'];
const array /* t:Array TDType */ = somestringArray.map((typestring, index, mappedArray) => new TDType(typestring));
`).run();

    expect(errors.length).to.equal(0);
  });
});
