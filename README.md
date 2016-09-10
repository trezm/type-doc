# TypeDoc

Type checking with valid JavaScript

## Table of Contents
- [Setup](#setup)
- [What Works?](#what-works-right-now)

## Setup
Setup is still a little jenky, right now you have to run the following in order to set it up _once_.

```
> gulp build:dev; ./bin/build-parser.sh; gulp build:dev
```

After that, all you have to do is

```
> gulp build:dev
```

## What works right now?

Basically this:
```
function add(x /* t:number */, y /* t:number */) /* t:number */ {
    return x + y;
}

function subtract(x /* t:number */, y /* t:number */) /* t:number */ {
    return x - y;
}

function multiply(x /* t:number */, y /* t:number */) /* t:string */ {
    return x + y;
}

function addTwo(x /* t:number */) /* t:number */ {
    return add(x, 2);
}

function subtractTwo(x /* t:number */) /* t:string */ {
    return subtract(x, 2);
}
```

Right now if you just run `node test.js` you can see what's currently working :)
