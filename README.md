# TypeDoc

Type checking with valid JavaScript

## Table of Contents
- [Setup](#setup)
- [cli](#cli)
- [What Works?](#what-works-right-now)
- [TODO](#todo)

## Setup
All you have to do is

```
> gulp build:dev
```

## CLI
TypeDoc has a basic cli for testing files. You can run it by running
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

## What works right now?
Check out the tests and examples for currently supported functionality, but among the list we currently have

Type Checking:

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

Right now if you just run `node test.js` you can see what's currently working :)

## TODO

- [ ] Implement understanding of classes and subclasses
- [ ] Implement union types
- [ ] Implement structs
- [ ] Ensure that `map`, `reduce`, etc. return the correct types.

