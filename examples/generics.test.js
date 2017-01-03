function translate(input /* t:a */, translationFunction /* t:a -> b */) /* t:b */ {
  return translationFunction(input);
}

const aNumber /* t:Number */ = 4
const results /* t:String */ = translate(aNumber, (theNumber /* t:Number */) => theNumber);
