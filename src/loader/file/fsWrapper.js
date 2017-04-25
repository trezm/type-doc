import * as fs from 'fs';
import { resolve as _resolve } from 'path';

export function resolve(path) {
  return _resolve(path);
}

export function readFileSync(name /* t:String */) /* t:String */ {
  name = _isADirectoryWithAnIndex(name) || _isAJsFile(name);

  if (!name) {
    throw new Error(`${name} does not exist.`);
  }

  return fs.readFileSync(name, 'utf8');
}

function _isADirectoryWithAnIndex(name) /* t:String? */ {
  try {
    let stat = fs.lstatSync(name);
    return stat.isDirectory() && _isAJsFileWithExtension(name + '/index.js');
  } catch(e) {
    return undefined;
  }
}

function _isAJsFile(name) /* t:String? */ {
  try {
    return _isAJsFileWithoutExtension(name) || _isAJsFileWithExtension(name);
  } catch(e) {
    return undefined;
  }
}

function _isAJsFileWithoutExtension(name) /* t:String? */ {
  try {
    let stat = fs.lstatSync(name + '.js');
    return stat.isFile() && name + '.js';
  } catch(e) {
    return undefined;
  }
}

function _isAJsFileWithExtension(name) /* t:String? */ {
  try {
    let stat = fs.lstatSync(name);
    return stat.isFile() && name;
  } catch(e) {
    return undefined;
  }
}
