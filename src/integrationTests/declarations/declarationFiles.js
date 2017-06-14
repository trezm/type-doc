import { stub } from 'sinon';
import { expect } from 'chai';
import {
  TDTypeChecker,
  clearCache
} from '../../lib/TDTypeChecker';

describe('[declarations] external files', () => {
  it('should be able import files based on the options', () => {
    const errors = new TDTypeChecker(`
const somestring /* t:string */ = stringTonumber('2');
`).run({
      definitionFiles: ['./src/integrationTests/test.d.ts']
    });

    expect(errors[0].extras.expectedType).to.equal('string');
    expect(errors[0].extras.actualType).to.equal('number');
  });
});
