# TypeDoc

Type checking with valid JavaScript

## Table of Contents
- [Introduction](#introduction)
- [Setup](#setup)
- [cli](#cli)
- [Type Comments](#type-comments)
- [What Works?](#what-works-right-now)

## Introduction
TypeDoc aims to provide a static type checking without changing JavaScript. This is accomplished by adding type annotations via comments near declarations.

Take, for example, the following function to apply a transform to an input. There is an error in that `results` is defined as a `String`, yet is getting assigned a `Number`. TypeDoc aims to catch errors like this during static analysis rather than waiting until run time.

```
function transform(input /* t:a */, translationFunction /* t:a -> b */) /* t:b */ {
  return translationFunction(input);
}

const aNumber /* t:Number */ = 4
const results /* t:String */ = transform(aNumber, (theNumber) => theNumber);

```

## Setup

### Install dependencies
```
> yarn
```
or
```
> npm install
```

Then, to build,

```
> ./node_modules/.bin/gulp build:dev
```

## CLI
TypeDoc has a basic cli for testing files. You can run it like so. _Note:_ type-doc must be compiled prior to running the CLI.
```
> bin/type-doc <some-file>
```

For example,
```
> bin/type-doc ./examples/importDirectory.test.js
```

### Functional testing
Simply add the `-f`, or `--functional`, argument to also check for strictly functional, i.e.

```
> bin/type-doc --functional ./examples/functional.test.js
```

## Type Comments
Types are recognized as capitalized words, for example `Number` is a type. Types do not need to be existing types in the JavaScript system, type could be any capitalized word, for example, `Jedi`.

Function or method types are formatted as capitalized words separated by `->`, for example, a function that tells you the color of a Jedi's lightsaber would have a type like this:
```
Jedi -> Color
```

Unions are also allowed, for example, if you wanted to know who would win in a Jedi vs Sith fight, you could write a function with the signature
```
Jedi -> Sith -> Jedi | Sith
```

TypeDoc also allows Generic Types. Any word that does not begin with a capital will be considered a generic type. An example to get the apprentice associated with a certain Jedi or Sith lord could look something like:
```
alignment -> Apprentice alignment
```

Below you'll find a list of comment formats that TypeDoc recognizes.

### Inline variables
```
const aString /* t:String */ = 'hi';
```

### Function declarations
TypeDoc style:
```
function mayTheForceBeWithYou(name /* t:String */) /* t:String */ {
  return 'And with you, ' + name;
}
```
JSDoc style:
```
/**
 * Let's you know if it's a trap
 *
 * @param {String} a - the thing you're tryinig to figure out
 * @returns {Boolean} - whether or not the argument is a trap
 */
function isItA(thing) {
  return thing === 'Trap';
}
```

### Class declarations
TypeDoc style:
```
/**
  * class :: TestClass
  *   aString :: String
  *   aGoodMethod :: String -> String
  */
class TestClass {
  constructor() {
    this.aString = 'hello';
  }

  aGoodMethod(s /* t:String */) /* t:String */ {
    return s;
  }
}
```

JSDoc style:
```
/**
 * @class TestClass
 */
class TestClass {
  constructor() {
    const s /* t:String */ = this.add(1, 2);
  }

  /**
   * Add two Numbers
   *
   * @memberOf TestClass
   * @param {Number} a - The first Number
   * @param {Number} b - The second Number
   * @returns {Number} - the sum of the arguments
   */
  add(a, b) {
    return a + b;
  }
}
```

## What works right now?
Here's a highlights view of what TypeDoc can do so far. For a more complete list, please check out `src/integrationTests`!

Type Checking:

- [x] Generic types
- [x] Multiple files
- [x] Assignment checking
- [x] Checking vs literals
- [x] Param checking
- [x] Return checking
- [x] Class checking
- [x] Class method checking (params and returns.)

Functional:

- [x] Prevent out of scope variable changes
- [x] Prevent modifying properties on Immutable objects
- [x] Prevent calling `push`, `pop`, `shift`, `unshift` outside of the declared scope (i.e. in child scopes).
