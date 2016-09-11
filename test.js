var parser = require('./dist/parser').parser;
var typeChecker = require('./dist/typeChecker');

let errors;
const functionTest1 = `
function add(x /* t:number */, y /* t:number */) /* t:number */ {
  return x + y;
}
`;

const functionTest2 = `
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
  var two /* t:number */ = 2;

  return add(x, two);
}

function subtractTwo(x /* t:number */) /* t:string */ {
  return subtract(x, 2);
}

function a(x /* t:string */) /* t:string */ {
  function b(y /* t:string */) /* t:string */ {
    function c(z /* t:string */) /* t:string */ {
      return y + x + z;
    }

    return c(y);
  }

  return b(x);
}

function d(x /* t:string */) /* t:string */ {
  function e(y /* t:string */) /* t:string */ {
    function f(z /* t:string */) /* t:number */ {
      return y + x + z;
    }

    return f(y);
  }

  return e(x);
}
`;

errors = typeChecker.typeChecker(functionTest2);

if (errors) {
  errors.forEach((error) => console.log(error.toString()));
} else {
  console.log('No type errors!');
}

