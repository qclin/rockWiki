require('colors')
var jsdiff = require('diff');

var one = 'beep boop';
var other = 'beep boob blah';

var diff = jsdiff.diffChars(one, other);
console.log(diff);
diff.forEach(function(part){
  // green for additions, red for deletions
  // grey for common parts
  var color = part.added ? 'green' :
    part.removed ? 'red' : 'grey';
  process.stderr.write(part.value[color]);
});

console.log();

//document.body.innerHTML 

var changed = diffString(
   "The red brown fox jumped over the rolling log.",
   "The brown spotted fox leaped over the rolling log"
);

console.log(changed);
