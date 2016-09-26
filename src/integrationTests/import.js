import { sandbox as s, stub } from 'sinon';
import { expect } from 'chai';
import { loader } from '../loader/file';
import * as fs from '../loader/file/fsWrapper';

describe('import', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = s.create();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('should not throw an error with multiple files', () => {
    const readFileSyncStub = sandbox.stub(fs, 'readFileSync', (file) => {
      return {
        './test': `var n = 2;`,
        'main': `
import { test } from './test';
`
      }[file];
    });

    const errors = loader('main').errors;

    expect(errors.length).to.equal(0);
  });

  it('should throw errors caused by multiple files', () => {
    const readFileSyncStub = sandbox.stub(fs, 'readFileSync', (file) => {
      return {
        './test': `export const test /* t:number */ = 2;`,
        'main': `
import { test } from './test';

var s /* t:string */ = test
`
      }[file];
    });

    const errors = loader('main').errors;

    expect(errors[0].extras.expectedType).to.equal('string');
    expect(errors[0].extras.actualType).to.equal('number');
  });

  it('should run tests on the imported files', () => {
    const readFileSyncStub = sandbox.stub(fs, 'readFileSync', (file) => {
      return {
        './test': `
let aNumber /* t:number */ = 3;
export const test /* t:string */ = aNumber;
`,
        'main': `
import { test } from './test';

var s /* t:string */ = test
`
      }[file];
    });

    const errors = loader('main').errors;

    expect(errors[0].extras.expectedType).to.equal('string');
    expect(errors[0].extras.actualType).to.equal('number');
  });
});
