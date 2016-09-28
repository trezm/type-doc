'use strict';

const start = Date.now();
const host = process.env.HOST || "localhost";
const port = process.env.PORT || 3000;
const http = require('http');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');

let server = http.createServer(handleRequest);
const serverDirectory = path.resolve(__dirname);
console.log( chalk.blue('%s is the current directory'), serverDirectory );

/**
 * @description - top-level request handler. invoked on every request.
 *
 * @param {object} request - an http.IncomingMessage for requests to server
 * @param {object} response - an http.IncomingMessage for responses from server
 */
function handleRequest(request, response) {
  const start = Date.now();
  console.log( chalk.blue('%s request made to %s'), request.method, request.url);

  if (request.url === '/') {
    fs.readFile(serverDirectory + '/../app/index.html', function(error, content) {
      if (error) {
        response.writeHead(404);
        response.end();
        console.log( chalk.red('%s request made to %s took %dms and responded with %s'), request.method, request.url, (Date.now()) - start, '404');
        console.log( chalk.red('error occurred %s'), error.message);
      } else {
        response.writeHead(200, { 'Content-Type': 'text/html' });
        response.end(content, 'utf-8');
        console.log( chalk.green('%s request made to %s took %dms'), request.method, request.url, (Date.now()) - start);
      }
	  });
  } else {
    response.end('Hmmm doesnt seem to be anything at: ' + request.url);
    console.log( chalk.red('%s request made to %s took %dms but found no registered route'), request.method, request.url, (Date.now()) - start);
  }
}

server.listen(port, function(){
  console.log( chalk.blue('%s booted in %dms - http://%s:%s'), 'docs server', ( Date.now() ) - start, host, port );
});