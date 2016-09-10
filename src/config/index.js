'use strict';

import { config as development } from './development';
import { config as production } from './production';
import { config as test } from './test';

let _config = development;

if (process.env.NODE_ENV === 'prod') {
  _config = production
}

if (process.env.NODE_ENV === 'test') {
  _config = development
}

export const config = _config;
export default config;
