import { stub } from 'sinon';
import { expect } from 'chai';
import { TDTypeChecker } from '../../lib/TDTypeChecker';

describe('[declarations] external files', () => {
  it('should be able import files based on the options', () => {
    const errors = new TDTypeChecker(`
const someString /* t:String */ = stringToNumber('2');
`).run({
      definitionFiles: ['./src/integrationTests/test.d.ts']
    });

    expect(errors[0].extras.expectedType).to.equal('String');
    expect(errors[0].extras.actualType).to.equal('Number');
  });
});
