var assert = require('assert');
var xml = require('../index.js');
var fs = require('fs');


var lexer = new xml.Lexer();

var inputFile = 'test/data/pipe-test.xml';
var outputFile = 'test/data/pipe-test-output.xml';
var input = fs.createReadStream(inputFile);
var output = fs.createWriteStream(outputFile);
input.setEncoding('utf8');

input.pipe(lexer).pipe(output);
