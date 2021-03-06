interface PegToken {
  kind: number,
  token: string,
  link: number,
  transient: boolean
}
interface Ast {
  name: string,
  value: string,
  node: Ast[]
}

interface Token{
  kind: number,
  token: string
}

const kind = {
  sep: 0,
  blank: 1,
  token: 2,
  string: 3,
  or: 4
}

const special = {
  not: -1,
  plus: 0,
  mul: 1,
  and: 2
}

const isTokenOf = (token: PegToken, word: string) => {
  if((token.kind === kind.token) && token.token===word)
    return true
  return false
}


const isValidString = (token: Token, code: string, num: number)=>{
  for(let n=0; n<token.token.length;n++){
    if(code[num+n] !== token.token[n]) return false
  }
  return true
}

const isAlphabet = (str: String)=>{
  str = (str==null)?"":str;
  if(str.match(/^[A-Za-z]$/)) return true;
  return false;
}

const isDigit = (str: String)=>{
  str = (str==null)?"":str;
  if(str.match(/^[0-9]$/)) return true;
  return false;
}

interface Options{
  strsep: string[],
  escape: string[],
  sep: string[],
  blank: string[],
  normal: string,
  special: string,
  orbrace: string[]
}
const options = {
  strsep: ['"', "'"],
  escape: ['\\'],
  sep: [','],
  blank: [' '],
  normal: '%@abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890_',
  special: '~()*+/&',
  orbrace: ['[', ']']
}

const isin = (chara: string, charlist: string[]|string) => {
  for (const c of charlist) if (c == chara) return true
  return false
}

const tokenize = (options: Options) => (code: string) => {
  let strnum: number
  let start : number
  strnum = start = 0
  let escapemode: boolean = false
  let normalmode: boolean = true
  let strmode: boolean = false
  let result: PegToken[] = []
  const gotoEndOfString = (endCharacter: string[] | string) => {
    start = strnum
    strnum++
    while(!isin(code[strnum], endCharacter) || escapemode){
      if (escapemode) escapemode=false
      else if (code[strnum] == '\\') escapemode = true
      strnum++
    }
    strnum++
  }
  while(strnum < code.length) {
    // string mode
    if(isin(code[strnum], options.strsep)){
      gotoEndOfString(code[strnum])
      result.push({kind:kind.string,
        token: code.slice(start + 1, strnum - 1),
        link: -1, transient:false})
    }
    else if(isin(code[strnum], options.orbrace[0])){
      gotoEndOfString(options.orbrace[1])
      result.push({kind:kind.or,
        token: code.slice(start + 1, strnum - 1),
        link: -1, transient:false})
    }
    // skip blank
    else if(isin(code[strnum], options.blank))strnum++
    else if(isin(code[strnum], options.special)){
      result.push({kind: kind.token,
        token: code.slice(strnum, strnum+1),
        link: -1, transient: false})
      strnum++
    }
    else{
      start = strnum
      normalmode = isin(code[strnum], options.normal) ? true: false
      strnum++
      while(!isin(code[strnum], options.sep.concat(options.blank)) || escapemode){
        if (escapemode) escapemode = false
        else if (code[strnum] == '\\') escapemode = true
        if (code.length <= strnum) break
        if(isin(code[strnum], options.normal) == normalmode) strnum++
        else break
      }
      result.push({kind: kind.token,
        token: code.slice(start, strnum),
        link: -1, transient: false})
    }
  }
  return result
}

const makePegStruct = (tokens: PegToken[][]) => {
  // Names of grammers.
  let names: string[] = tokens.map(token=>token[0].token)
  // Numbers of linked from.
  let nameNumList: number[] = new Array(names.length).fill(0)
  let grammers: PegToken[][] = tokens.map(token=>token.slice(2))
  // Set up links.
  for(let grammer of grammers){
    for(let token of grammer){
      for(let nameNum=0; nameNum < names.length; nameNum++){
	if(token.token===names[nameNum]){
	  token.link=nameNum
	  nameNumList[nameNum]++
	}
      }
    }
  }
  for(let nameNum=0; nameNum < nameNumList.length; nameNum++){
    if(nameNumList[nameNum]===1){
      // If link is only one, it is transient.
      for(let grammer of grammers){
	for(let token of grammer){
	  if(token.link===nameNum)token.transient = true
	}
      }
    }
  }
  return grammers
}

// From here, test code.

const gotoNextSlash = (peg: PegToken[], cursor: number) => {
  let depth = 0
  while((0 <= cursor) && (cursor <= peg.length - 1)){
    cursor++
    if(cursor === peg.length) break
    if(peg[cursor].kind === kind.token){
      if(depth === 0 && peg[cursor].token === '/') return cursor
      if(peg[cursor].token=== '(') depth++
      if(peg[cursor].token=== ')') depth--
    }
    if(depth < 0) return -1
  }
  return -1
}

/*
* Go to brace out of the word.
* 
*/
const gotoBrace = (peg: PegToken[], cursor: number, former: boolean=true) => {
  let depth = 1
  while(cursor <= peg.length && cursor > 0){
    if(former){
      cursor++
      if(cursor === peg.length) break
    }
    else{
      cursor--
      if(cursor === -1) break
    }
    if(isTokenOf(peg[cursor], '(')){
      if(former) depth++
      else depth--
    }
    if(isTokenOf(peg[cursor], ')')){
      if(former) depth--
      else depth++
    }
    if(depth === 0) break
  }
  return cursor
}


/*
* Recursive efficient pack rat parser function.
* Returns number, it ends at code.
*/
const parseByOnePeg = (peg: PegToken[][], grammerNumber: number, name: string,
  code: string, startLocation: number, ast: Ast,
  shortmode: boolean=false, packrat: boolean=true, stock: any[],
  transient: boolean=false
) => {
  if(packrat && stock[grammerNumber][startLocation]) {
    ast['node'] = stock[grammerNumber][startLocation][0]
    if(shortmode && ast['node'].length === 1){
      ast['name'] = ast['node'][0]['name']
      ast['value'] = ast['node'][0]['value']
      ast['node'] = ast['node'][0]['node']
    }
    return stock[grammerNumber][startLocation][1]
  }
  const grammer: PegToken[] = peg[grammerNumber]
  let depth = 0 // Depth of brace.
  let errordepth = -1 // Depth of error. If not -1, error.
  let cursors: number[] = new Array(grammer.length).fill(0) // Location of each depth.
  cursors[0] = startLocation
  let plusThrough: boolean[] = new Array(grammer.length).fill(false)
  let ignore = -1 // Ignore if depth is smaller than it.
  let ignoreSpare = -1
  const checkIgnore = () => {
    if(ignore === depth){
      ignoreSpare = ignore
      ignore = -1
    }
  }
  let isError = false
  const setError = () => {
    isError = true
    errordepth = depth
  }
  const removeError = () => {
    isError = false
    errordepth = -1
  }
  ast['name'] = name
  ast['value'] = ''
  let node: Array<Array<Ast>> = []
  node.push([])
  let pegNum = 0
  let token: PegToken
  let wordLength = 0
  if(code.length <= startLocation){
    return -1
  }
  while(pegNum < grammer.length && cursors[0] < code.length){
    token = grammer[pegNum]
    //----------
    // Error case
    //----------
    if(isError){
      if(token.kind === kind.token && token.token === '/'){
        removeError()
        node[depth] = new Array()
      }
      else if(token.kind === kind.token && token.token === '*'){
        removeError()
        continue
      }
      else if(token.kind === kind.token && token.token === '+'){
        if(plusThrough[pegNum] === false){
          plusThrough[pegNum] = true
          setError()
        }
        else{ removeError() }
        continue
      }
      else if(token.kind === kind.token && token.token === '('){
        pegNum = gotoBrace(grammer, pegNum+1, true) + 1
        cursors[depth] = cursors[depth-1]
        continue
      }
      else if(token.kind === kind.token && token.token === ')'){
        depth--
        errordepth--
        cursors[depth] = cursors[depth+1]
        cursors[depth+1] = 0
      }
      else if(token.kind === kind.token && token.token === '&'){ }
      else if(token.kind === kind.token && token.token === '~'){ }
      else{
        if(depth===0)cursors[depth] = startLocation
        else cursors[depth] = cursors[depth-1]
        wordLength = gotoNextSlash(grammer, pegNum)
        // if no slash
        if(wordLength === -1) {
          pegNum = gotoBrace(grammer, pegNum, true)
          continue
        }
        else {
          pegNum = wordLength
          setError()
          continue
        }
      }
    }
    //----------
    // No error case
    //----------
    else{
      //----------
      // Token case
      //----------
      if(token.kind === kind.token){
        //----------
        // Error case Or
        //----------
        if(token.token === '/'){
          wordLength = gotoBrace(grammer, pegNum, true)
          if(wordLength !== -1){
            pegNum = wordLength
            continue
          }
          else{
            setError()
            continue
          }
          checkIgnore()
        }
        //----------
        // Error case Brace
        //----------
        else if(token.token === '('){
          depth++
          node[depth] = new Array()
          cursors[depth] = cursors[depth-1]
        }
        else if(token.token === ')') {
          depth--
          node[depth] = node[depth].concat(node[depth+1])
          cursors[depth] = cursors[depth+1]
        }
        //----------
        // Repeat
        //----------
        else if(token.token === '*' || token.token === '+'){
          plusThrough[pegNum] = token.token === '+' ? true: false
          if(grammer[pegNum-1].kind === kind.token
            &&grammer[pegNum-1].token === ')'){
            if(isError){
              pegNum = gotoBrace(grammer, pegNum-2, false)
              continue
            }
            else{
              removeError()
              node[depth] = node[depth].concat(node[depth+1])
            }
          }
          else {
            if(isError) {
              pegNum--
              continue
            }
            else{
              removeError()
            }
          }
        }
        //----------
        // Manual transient
        //----------
        else if(token.token==='&'){
          // Do not save log.
          for(let n = startLocation; n < cursors[depth]; n++){
            stock.map(x=>x[n]=null)
          }
        }
        //----------
        // Special word
        //----------
        else if(token.token[0] === '@'){
          wordLength = 0
          if(token.token === '@word')
            while(isAlphabet(code[cursors[depth]+wordLength])) wordLength++
          else if(token.token === '@digit')
            while(isDigit(code[cursors[depth]+wordLength])) wordLength++
          else throw('Peg syntax error at ' + grammerNumber)
          if(wordLength === 0) setError()
          if(ignore===-1)node[depth].push({name: name,
            value: code.slice(cursors[depth], cursors[depth]+wordLength), node: []})
          cursors[depth] += wordLength
          checkIgnore()
        }
        else if(token.token === '~'){
          if(ignore === -1)ignore = depth
        }
        //----------
        // No end Token case
        //----------
        else{
          let newAst = {name: token.token, value: '', node:[]}
          wordLength = parseByOnePeg(peg, token.link, token.token, code, cursors[depth],
            newAst, shortmode, packrat, stock, token.transient)
          if (wordLength === -1) setError()
          else{
            cursors[depth] = wordLength
            if(newAst['node'].length !== 0 || newAst['value'] !== ''){
              if(newAst.name[0] === '%') {
                if(ignore===-1)ast['value']+=newAst.value
              }
              else if(ignore===-1)node[depth].push(newAst)
            }
          }
          checkIgnore()
        }
      }
      //----------
      // No error string case
      //----------
      else if(token.kind === kind.string){
        if(isValidString(token, code, cursors[depth])) {
          if(ignore===-1)node[depth].push({name: name, value: token.token, node: []})
          cursors[depth] += token.token.length
        }
        else setError()
        checkIgnore()
      }
      //----------
      // No error or case
      //----------
      else if(token.kind === kind.or){
        if(isin(code[cursors[depth]], token.token)) {
          if(ignore===-1)node[depth].push({name: name, value: token.token, node: []})
          cursors[depth]++
        }
        else setError()
        checkIgnore()
      }
    }
    pegNum++
  }

  //console.log(errordepth !== -1 ? 'Bad end': 'Good end')
  //----------
  // end of loop
  //----------
  if (isError) return -1
  if(depth !== 0)return -1
  if(node[0].length !== 0)ast['node'] = node[0]
  else ast['node'] = new Array()
  if(packrat && !transient) stock[grammerNumber][startLocation] = [ast['node'], cursors[0]]
  if(shortmode && ast['node'].length === 1){
    ast['name'] = ast['node'][0]['name']
    ast['value'] = ast['node'][0]['value']
    ast['node'] = ast['node'][0]['node']
  }
  return cursors[0]
}

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

