/// <reference lib="es5" />
import {PegToken, Ast, KIND, SPECIAL, isin, isDigit, NUM2KIND,
  isTokenOf, isAlphabet, isValidString,
  makePegStruct, tokenize, options,
  gotoNextSlash, gotoBraceStart, gotoBraceEnd} from "./parser_tips.ts"
interface Stock {
  ast: Ast[];
  cursor: number;
}

const cache = () => {};

export class PegCursor{
  private peg: PegToken[][];
  private pegCursor = 0;
  private cursors: number[];
  depth = 0;
  error = false;

  isEnded(){
    //console.log(this.peg[0])
    return this.getCurrentLoc() === this.peg[this.pegCursor].length
  }

  openLink(){
    if (this.getToken().link === -1)
      throw `Not a valid link. ${JSON.stringify(this.getToken())}`
    const newCursor = new PegCursor(this.peg, this.getToken().link)
    newCursor.cursors[0] = this.getCurrentLoc()
    return newCursor
  }

  length(){
    return this.peg[this.pegCursor].length
  }

  constructor(peg: PegToken[][], pegNumber: number){
    this.peg = peg;
    this.cursors = <number[]>Array(peg.length).fill(0)
    this.pegCursor = pegNumber
  }

  goUp(){
    if(this.depth === 0) throw `Too shallow depth.`
    this.cursors[this.depth - 1] = this.cursors[this.depth]
    this.depth--
    this.cursors[this.depth + 1] = 0
  }

  goDown(){
    if(this.depth === this.peg.length - 1) throw "Too deep depth."
    this.cursors[this.depth + 1] = this.cursors[this.depth]
    this.depth++
  }

  /*
   * Go to next of current peg grammer.
   * Depth of brace itself is same as outer of brace.
   */
  gotoNext(){
    if (this.cursors[this.depth] === this.peg[this.pegCursor].length - 1)
      return false
    if (this.isTokenOf('(')){
      this.cursors[this.depth + 1] = this.cursors[this.depth]
      this.goDown()
    }
    this.cursors[this.depth]++
    if(this.isTokenOf(')')) {
      this.cursors[this.depth - 1] = this.cursors[this.depth]
      this.goUp()
    }
    return true
  }

  /*
   * Go to prev of current peg grammer.
   * Depth of brace itself is same as outer of brace.
   */
  gotoPrev(){
    if (this.cursors[this.depth] === 0) return false
    if (this.isTokenOf(')')){
      this.cursors[this.depth + 1] = this.cursors[this.depth]
      this.goDown()
    }
    this.cursors[this.depth]--
    if(this.isTokenOf('(')) {
      this.cursors[this.depth - 1] = this.cursors[this.depth]
      this.goUp()
    }
    if (this.cursors[this.depth] === this.peg[this.pegCursor].length - 1)
      return false
    return true
  }

  /*
   * Go to prev of current peg grammer.
   * Depth of brace itself is same as outer of brace.
   */
  gotoNextSlash(){
    const startDepth = this.depth;
    const startLocation = this.cursors[this.depth]
    while (this.gotoNext() && this.depth >= startDepth) {
      if(this.isTokenOf('/') && startDepth === this.depth) return this
    }
    this.depth = startDepth;
    this.cursors[this.depth] = startLocation
    return this;
  }

  /*
   * Go to end of brace.
   * If current cursor is on start of brace,
   * you must gotoNext at first.
   */
  gotoBraceEnd(){
    const startDepth = this.depth;
    const startLocation = this.cursors[this.depth]
    while (this.gotoNext()) {
      if (this.depth > startDepth) return this
    }
    this.depth = startDepth;
    this.cursors[this.depth] = startLocation
    return this;
  }

  /*
   * Go to start of brace.
   * If current cursor is on end of brace,
   * you must gotoPrev at first.
   */
  gotoBraceStart(){
    const startDepth = this.depth;
    const startLocation = this.cursors[this.depth]
    while (this.gotoNext()) {
      if (this.depth > startDepth) return this
    }
    this.depth = startDepth;
    this.cursors[this.depth] = startLocation
    return this;
  }

  /*
   * Get current token.
   */
  getToken(){
    return this.peg[this.pegCursor][this.cursors[this.depth]]
  }

  /*
   * Returns true if the no end token and match the word.
   */
  isTokenOf(word: string){
    return this.peg[this.pegCursor][this.cursors[this.depth]].token === word
  }

  isString(){
    return this.peg[this.pegCursor][this.cursors[this.depth]].kind === KIND.STRING
  }

  isLink(){
    return this.peg[this.pegCursor][this.cursors[this.depth]].kind === KIND.LINK
  }

  /*
   * It should called at * or +.
   */
  gotoStartOfRepeat(){
    this.gotoPrev()
    if(this.isTokenOf(')')) {
      this.gotoPrev()
      this.gotoBraceStart()
    }
  }
  getCurrentLoc(){
    return this.cursors[this.depth]
  }
}

export class ParseMethods{
  cursor: PegCursor;
  code: string;
  codenum: number;
  ast: Ast;
  constructor(code: string, codenum: number,
              peg: PegToken[][], pegnum: number, ast: Ast){
    this.cursor = new PegCursor(peg, pegnum)
    this.code = code
    this.codenum = codenum
    this.ast = ast
  }
  braceStart(){
    if (this.cursor.error) {
      this.cursor.gotoNext()
      this.cursor.gotoBraceEnd();
      this.cursor.gotoNext()
      if (this.cursor.isTokenOf('*')) this.cursor.gotoNext()
    }
    else{
      this.cursor.gotoNext()
      this.cursor.depth++
    }
  }
}

class Nodes{
  node: Ast[][] = []
  pegCursor: PegCursor
  constructor(pegCursor: PegCursor){
    this.pegCursor = pegCursor
    this.node = new Array(pegCursor.length()).fill([]);
  }

  merge_parent(){
    if (this.node.length > 0){
      const last: Ast[] = <Ast[]>this.node.pop()
      this.node[this.node.length - 2] = this.node[this.node.length - 2].concat(last)
      return true
    }
    return false
  }

  add(ast: Ast){
    this.node[this.pegCursor.depth].push(ast)
  }
}

const parseByOnePeg = (code: string,
                       upperCursor: number = 0,
                       pegCursor: PegCursor,
                       ast: Ast, stock: Stock[][]
                       ) => {
  let cursor = upperCursor; // Cursor of code itself
  let plusThrough: boolean[] = new Array(pegCursor.length()).fill(false);
  let wordLength = 0; // Length of code of new token.
  // Nodes of asts.
  // First dim is depth of brace and second dim is array of ast children.
  // If brace ends, child nodes are added to parents.
  let node: Nodes = new Nodes(pegCursor)
  // let node: Ast[][] = []
  let token: PegToken
  while(cursor < code.length){
    token = pegCursor.getToken()
    console.log(token, pegCursor.getCurrentLoc(), cursor, code[cursor], pegCursor.error)
    if (pegCursor.isEnded()){
      if(pegCursor.error){
        console.log('error end')
        return -1
      }
      else{
        console.log(`normal end ${cursor} ${JSON.stringify(node.node)}`)
        if(pegCursor.depth === 0) return cursor
        else console.log('no end')
      }
    }

    if (pegCursor.isLink()){
      let newAst = { name: token.token, value: "", node: [] };
      wordLength = parseByOnePeg(code, cursor, pegCursor.openLink(), newAst, stock);
      if(wordLength === -1) pegCursor.error = true
      else{
        cursor = wordLength;
        if (newAst["node"].length !== 0 || newAst["value"] !== "") {
          if (newAst.name[0] === "%") ast["value"] += newAst.value;
          else node.add(newAst);
        }
      }
      pegCursor.gotoNext()
    }

    else if(pegCursor.isString()){
      if(!pegCursor.error) {
        if (isValidString(token, code, cursor)){
          node.add({ name: token.token,
                   value: token.token, node: [] })
          cursor += token.token.length
        } else pegCursor.error = true
      }
      pegCursor.gotoNext()
    }

    else if(pegCursor.isTokenOf('(')) {
      if(pegCursor.error) {
        pegCursor.gotoNext()
        pegCursor.gotoBraceEnd()
      } else pegCursor.gotoNext()
    }

    else if(pegCursor.isTokenOf(')')) {
      pegCursor.gotoNext()
      node.merge_parent()
    }

    else if(pegCursor.isTokenOf('*')){
      if(!pegCursor.error) pegCursor.gotoStartOfRepeat()
      else{
        pegCursor.gotoNext()
        pegCursor.error = false
      }
    }

    else if(pegCursor.isTokenOf('+')){
      if(pegCursor.error){
        if(plusThrough[pegCursor.getCurrentLoc()]) {
          plusThrough[pegCursor.getCurrentLoc()] = false
          pegCursor.error = false
        } else {
          plusThrough[pegCursor.getCurrentLoc()] = true
        }
        pegCursor.gotoNext()
      } else pegCursor.gotoStartOfRepeat()
    }

    else if(pegCursor.isTokenOf('/')){
      if(pegCursor.error){
        pegCursor.gotoNext()
        pegCursor.error = false
      } else pegCursor.gotoBraceEnd()
    }

    else if(token.token === '@word'){
      if(pegCursor.error) pegCursor.gotoNext()
      else{
        while (isAlphabet(code[cursor] + wordLength)) wordLength++;
        if (wordLength === 0) pegCursor.error = true;
        pegCursor.gotoNext()
      }
    }

    else if(token.token === '@digit'){
      if(pegCursor.error) pegCursor.gotoNext()
      else{
        while (isDigit(code[cursor] + wordLength)) wordLength++;
        if (wordLength === 0) pegCursor.error = true;
        pegCursor.gotoNext()
      }
    }
    else if(token.token === '~'){pegCursor.gotoNext()}
  }

  if(pegCursor.getToken())
  console.log(NUM2KIND[pegCursor.getToken().kind],
              pegCursor.getToken().token, pegCursor.getCurrentLoc(),
              cursor, code[cursor], pegCursor.error)
  if(pegCursor.error) return -1
  return cursor
}


export class Peg {
  pegString: string;
  pegStruct: PegToken[][];
  ast!: Ast;
  pegCodes: PegToken[][];
  stock?: Stock[][] = [];
  constructor(pegstring: string) {
    this.pegCodes = pegstring.trim().split("\n").map(tokenize(options));
    this.pegString = pegstring;
    this.pegStruct = makePegStruct(this.pegCodes);
  }
  parse(code: string, packrat: boolean = true) {
    this.ast = { name: "", value: "", node: [] };
    this.stock = new Array(this.pegCodes.length).fill([]);
    const res = parseByOnePeg(
      code, 0, new PegCursor(this.pegStruct, 0), this.ast, this.stock);
    if (res === -1) console.log("Syntax error");
    delete this.stock;
    this.stock = [];
    return this.ast;
  }
}

const withWhite = `
expression <- additive
additive <- multitive ( "+" multitive /  "-" multitive ) *
multitive <- primary ( "*" primary / "/" primary ) *
primary <- "(" expression ")" / number
number <- ~space* @digit ~space*
space <- (" " / "	")`

let code = '(((((((1)))))))'
let parser = new Peg(withWhite)
console.log(JSON.stringify(parser.pegStruct))
console.log(parser.parse(code))
