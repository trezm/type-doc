import { sandbox as s, stub } from 'sinon';
import { expect } from 'chai';
import {
  TDTypeChecker,
  clearCache
} from '../lib/TDTypeChecker';
import * as fs from 'fs';
import * as fsWrapper from '../loader/file/fsWrapper';

describe('import', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = s.create();
    sandbox.stub(fsWrapper, 'resolve', (arg) => {
      return arg;
    });
  });

  afterEach(() => {
    sandbox.restore();
    clearCache();
  });

  it('should not throw an error with multiple files', () => {
    const readFileSyncStub = sandbox.stub(fsWrapper, 'readFileSync', (file) => {
      return {
        './test': `var n = 2;`,
        './main': `
import { test } from './test';
`
      }[file];
    });

    const errors = new TDTypeChecker('./main').run();

    expect(errors.length).to.equal(0);
  });

  it('should throw errors caused by multiple files', () => {
    const readFileSyncStub = sandbox.stub(fsWrapper, 'readFileSync', (file) => {
      return {
        './test': `export const test /* t:number */ = 2;`,
        './main': `
import { test } from './test';

var s /* t:string */ = test
`
      }[file];
    });

    const errors = new TDTypeChecker('./main').run();

    expect(errors[0].extras.expectedType).to.equal('string');
    expect(errors[0].extras.actualType).to.equal('number');
  });

  it('should respect namespaces across multiple files', () => {
    const readFileSyncStub = sandbox.stub(fsWrapper, 'readFileSync', (file) => {
      return {
        './test1': `
  /**
   * class :: someNamespace:TestClass
   *   aGoodMethod :: string -> string
   */
  export class TestClass {
  constructor() {
  }

  aGoodMethod(s /* t:string */) /* t:string */ {
    return s;
  }
  }`,
        './test2': `
  const example /* t:someNamespace:TestClass */ = new TestClass();
  example.aBadMethod();

  export const classValue = example;`,
        './main': `
  import { TestClass } from './test1';
  import { classValue } from './test2';
  `
      }[file];
    });

    const errors = new TDTypeChecker('./main').run({
      strictClassChecks: true
    });

    expect(errors[0].extras.property).to.equal('aBadMethod');
    expect(errors[0].extras.class).to.equal('someNamespace:TestClass');
  });

  it('should run tests on the imported files', () => {
    const readFileSyncStub = sandbox.stub(fsWrapper, 'readFileSync', (file) => {
      return {
        './test': `
let anumber /* t:number */ = 3;
export const test /* t:string */ = anumber;
`,
        './main': `
import { test } from './test';

var s /* t:string */ = test
`
      }[file];
    });

    const errors = new TDTypeChecker('./main').run();

    expect(errors[0].extras.expectedType).to.equal('string');
    expect(errors[0].extras.actualType).to.equal('number');
  });

  it('should handle multiple imports', () => {
    const readFileSyncStub = sandbox.stub(fsWrapper, 'readFileSync', (file) => {
      return {
        './test': `
let anumber /* t:number */ = 3;
export const test1 /* t:string */ = anumber;
export const test2 /* t:string */ = anumber;
`,
        './main': `
import { test1, test2 } from './test';
`
      }[file];
    });

    const errors = new TDTypeChecker('./main').run();

    expect(errors[0].extras.expectedType).to.equal('string');
    expect(errors[0].extras.actualType).to.equal('number');
    expect(errors[1].extras.expectedType).to.equal('string');
    expect(errors[1].extras.actualType).to.equal('number');
  });

  it('should handle multiple with different types', () => {
    const readFileSyncStub = sandbox.stub(fsWrapper, 'readFileSync', (file) => {
      return {
        './test': `
export const test1 /* t:string */ = 'asdf';
export const test2 /* t:number */ = 1;
`,
        './main': `
import { test1, test2 } from './test';

const thing1 /* t:number */ = test1;
const thing2 /* t:string */ = test2;
`
      }[file];
    });

    const errors = new TDTypeChecker('./main').run();

    expect(errors[0].extras.actualType).to.equal('string');
    expect(errors[0].extras.expectedType).to.equal('number');
    expect(errors[1].extras.expectedType).to.equal('string');
    expect(errors[1].extras.actualType).to.equal('number');
  });

  it('should handle aliases with different types', () => {
    const readFileSyncStub = sandbox.stub(fsWrapper, 'readFileSync', (file) => {
      return {
        './test': `
export const test1 /* t:string */ = 'asdf';
`,
        './main': `
import { test1 as test2 } from './test';

const thing1 /* t:number */ = test2;
`
      }[file];
    });

    const errors = new TDTypeChecker('./main').run();

    expect(errors[0].extras.actualType).to.equal('string');
    expect(errors[0].extras.expectedType).to.equal('number');
  });

  it('should handle class exports', () => {
    const readFileSyncStub = sandbox.stub(fsWrapper, 'readFileSync', (file) => {
      return {
        './test': `
export class Test {
  constructor() {}
}`,
        './main': `
import { Test } from './test';
`
      }[file];
    });

    const errors = new TDTypeChecker('./main').run();

    expect(errors.length).to.equal(0);
  });

  it('should handle export imports', () => {
    const readFileSyncStub = sandbox.stub(fsWrapper, 'readFileSync', (file) => {
      return {
        './test': `
export { TestClass } from './testClass';`,
        './testClass': `
export class TestClass {
  constructor() {}
}`,
        './main': `
import { TestClass } from './test';

const test = new TestClass();
`
      }[file];
    });

    const errors = new TDTypeChecker('./main').run();

    expect(errors.length).to.equal(0);
  });

  it('should be able to catch errors with import exports', () => {
    const readFileSyncStub = sandbox.stub(fsWrapper, 'readFileSync', (file) => {
      return {
        './test': `
export { TestClass } from './testClass';`,
        './testClass': `
export class TestClass {
  constructor() {}
}`,
        './main': `
import { TestClass } from './test';

const test /* t:TestClass2 */ = new TestClass();
`
      }[file];
    });

    const errors = new TDTypeChecker('./main').run();

    expect(errors.length).to.equal(1);
    expect(errors[0].extras.actualType).to.equal('TestClass');
    expect(errors[0].extras.expectedType).to.equal('TestClass2');
  });
});
