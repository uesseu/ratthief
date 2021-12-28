export class Peg{
  pegString: string
  pegStruct: PegToken[][]
  ast!: Ast
  pegCodes: PegToken[][]
  stock!: string[][]
  constructor(pegstring: string){
    this.pegCodes = pegstring.trim().split('\n').map(tokenize(options))
    this.pegString = pegstring
    this.pegStruct = makePegStruct(this.pegCodes)
  }
  parse(code: string,
    packrat: boolean = true,
    shortmode: boolean = false){
    this.ast = {name: '', value:'', node:[]}
    this.stock = new Array(this.pegCodes.length).fill(new Array())
    const res = parseByOnePeg(this.pegStruct, 0, this.pegCodes[0][0].token,
      code, 0, this.ast, shortmode, packrat, this.stock)
    if(res === -1) console.log('Syntax error')
    return this.ast
  }
}
