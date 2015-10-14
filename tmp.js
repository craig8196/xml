

var buf = new Buffer(8);

buf.writeUInt32BE(0xdeadbeef, 0);
buf.writeUInt32BE(0xcafebabe, 4);
console.log(buf);
console.log('\u0009' < '\u000A');
var zero = '0';
var nine = '9';
var eq = '=';
console.log(zero.charCodeAt(0).toString(16));
console.log(nine.charCodeAt(0).toString(16));
console.log(eq.charCodeAt(0).toString(16));
