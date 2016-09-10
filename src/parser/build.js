import * as fs from 'fs';
import { Parser } from 'jison';
import { grammar } from './grammar';

const parser = new Parser(grammar);

fs.writeFile(__dirname + '/parser.js', parser.generate(), (err) => {
  if (err) {
    return console.log(err);
  }

  console.log('Successfully generated parser.js');
});
