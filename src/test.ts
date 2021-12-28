import {Peg} from './parser.js'
// $: Ignore command
// %: Treat as a string
// @word: Strings
// @upper: Strings, which is upper at head
// @UPPER: Strings. All of characters are upper.
// @lower: Lower case
// @digits: Digits
// @Digits: Digits whose head is not zero.
// @Digits: Digits whose head is not zero.
// @line: \\n
// @space: space, tab
// @white: space, tab, \\n
const withWhite = `
expression <- additive
additive <- multitive ( "+" multitive /  "-" multitive ) *
multitive <- primary ( "*" primary / "/" primary ) *
primary <- "(" expression ")" / number
number <- ~space* @digit ~space*
space <- (" " / "	")`

const formula = `
expression <- additive
additive <- multitive ("+" multitive /  "-" multitive) *
multitive <- primary ("*" primary / "/" primary) *
primary <- "(" expression ")" / @digit`

const calc = `
S <- A
A <- P "+" A / P "-" A / P
P <- "(" A ")" / "1"`

const left = `
A <- P / P "+" A / P "-" A
P <- A / "1"`

const drug = `
expression <- name~' '*~','*~' '*amount~' '*~','~' '*route
name <- @word
amount <- @digit
route <- @word`

let code = '(((((((1)))))))'
let addive = '1+1'
let peg: Peg
let ast = {}

peg = new Peg(left)
//ast = peg.parse(addive)
//console.log(ast)

console.log(calc)
let shortmode=false
peg = new Peg(calc)
console.time('Pack rat test, Grammer1')
ast = peg.parse(code, true, true)
console.timeEnd('Pack rat test, Grammer1')
console.log(code)
console.log(ast)

peg = new Peg(calc)
console.time('No rat test, Grammer1')
ast = peg.parse(code, false, true)
console.timeEnd('No rat test, Grammer1')
console.log(code)

//console.dir(ast, {depth: null})

peg = new Peg(formula)
console.time('Pack rat test, Grammer2')
ast = peg.parse(code, true, true)
console.timeEnd('Pack rat test, Grammer2')
console.log(code)

peg = new Peg(formula)
console.time('No rat test, Grammer2')
ast = peg.parse(code, false, true)
console.timeEnd('No rat test, Grammer2')
console.log(code)

peg = new Peg(withWhite)
console.time('No rat test')
ast = peg.parse('1+ 1* 8 / 7', false, true)
console.timeEnd('No rat test')

console.time('Pack rat test')
peg = new Peg(withWhite)
ast = peg.parse('(1+ 1)* 89 + 9 / 7', true, true)
//ast = peg.parse('1+ 1* 8 / 7', false, true)
console.timeEnd('Pack rat test')
console.dir(ast, {depth:null})

peg=new Peg(drug)
//console.log(peg.pegStruct)
ast = peg.parse('aripiprazole, 3, oral', true, true)
console.log(ast)
