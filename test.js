var parser = require('./dist/parser').parser;
var typeChecker = require('./dist/typeChecker');

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
`;

// console.log(JSON.stringify(parser.parse(functionTest1), null, 2));
typeChecker.typeChecker(functionTest2);
