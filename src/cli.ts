import {Peg} from './parser.js'
const withWhite = `
expression <- additive
additive <- multitive ( "+" multitive /  "-" multitive ) *
multitive <- primary ( "*" primary / "/" primary ) *
primary <- "(" expression ")" / number
number <- ~space* @digit ~space*
space <- (" " / "	")`

process.stdin.resume();
process.stdin.setEncoding('utf8');
let input_string = ''
process.stdin.on('data', chunk =>{
  if (chunk.toString().indexOf('exit') !== -1){
    process.exit()
  }
  else{
    //console.log(runCalc(String(chunk)));
  }
})

process.stdin.on('end', () =>{
  process.exit()
  console.log('exit')
})
