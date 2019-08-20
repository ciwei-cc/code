<template>
  <div class="code-preview__block" ref="codeDoc" :contenteditable="edit">
    <div class="code-preview__line" v-for="(line,idx) in codeLines" :key="idx">
      <span v-for="(style,_idx) in line.styles" :key="`${style.text}${_idx}`" :class="`line-light-${style.type}`">{{style.text.replace(/\s/g,'&nbsp;')}}</span>
    </div>
  </div>
</template>
<script>
export default {
  name: "boss-code-preview",
  props: {
    code: {
      type: Object | Array | String,
      default:""
    },
    edit:{
      type:Boolean,
      default:false
    }
  },
  computed:{
    lineNumberWidth(){
      return `${String(this.codeLines.length).length * 12}px`
    }
  },
  data() {
    return {
      codeLines:[]
    };
  },
  watch:{
    code(){
      this.codeLines = this.parseCode(this.code)
    }
  },
  created(){
    this.codeLines = this.parseCode(this.code)
  },
  methods: {
    // start
    parseCode(code){
      let lines = []
      if(!Array.isArray(code)) code = JSON.stringify(this.code,null,4).split("\n")
      code.forEach((text,idx) => {
        lines.push({
          state:{
            lastType:'none',
            char:'',
            sol:false
          },
          styles:[],
          lineNumber:idx+1,
          text
        })
        let line = lines[idx]
        let state = line.state
        state.charIndex = 0
        state.nextChar = () => {
          if(!state.sol){
            let char = line.text.charAt(state.charIndex)
            state.charIndex ++
            if(line.text.length < state.charIndex){
              state.sol = true
            }
            return char
          }else{
            return line.text.charAt(state.charIndex - 1)
          }
        }
        state.lastChar = () => {
          state.charIndex --
          if(state.sol) state.sol = false
          return line.text.charAt(state.charIndex)
        }
        text = line.text = this.eatSpace(text,line.styles)
        this.parseLine(text, state, (str, next) => {
          line.styles.push({
            text:str,
            type:this.getStrType(text,str) || ""
          })
          if(!state.sol){
            next()
          }
        })
      })
      return lines
    },
    getStrType(text,str){
      str = str.trim()
      if(str === "null") return "atom"
      if(str === "undefined") return "atom"
      if(/^(\d|\d.\d)+$/g.test(str)) return "number"
      if(str === "true" || str === "false") return "boolean"
      if(/^"(.{0,})"$/g.test(str)){
        if(text.replace(/\s/g,'').includes(`${str}:`)){
          return "key"
        }else{
          return "string"
        }
      }
      return "symbol"
    },
    parseLine(text, state, fn){
      let next = ()=>{ this.parseLine(text, state, fn) }
      let ch = state.nextChar()
      if(ch === '"'){
        this.quoteSearch(ch, state, fn, next)
      } else if(/[\[\]{}\(\),;\:]/.test(ch)){
        fn(ch, next)
      } else {
        this.varSearch(ch, state, fn, next)
      }
    },
    varSearch(lastStr, state, fn, next){
      let ch = state.nextChar()
      let curStr = `${lastStr}${ch?ch:''}`
      if(!state.sol){
        if(ch === '"' || /[\[\]{}\(\),;\:]/.test(ch)){
          state.lastChar()
          fn(lastStr,next)
        }else{
          this.varSearch(curStr,state, fn, next)
        }
      }else{
        fn(curStr)
      }
    },
    quoteSearch(lastStr, state, fn, next){
      let ch = state.nextChar()
      let curStr = `${lastStr}${ch?ch:''}`
      if(!state.sol){
        if(ch !== '"'){
          this.quoteSearch(curStr,state,fn,next)
        }else{
          fn(curStr,next)
        }
      }else{
        fn(curStr)
      }
    },
    eatSpace(text,styles){
      let space = ""
      let count = 0
      while(text.startsWith(" ")){
        space += " "
        count ++
        text = text.substr(1,text.length)
      }
      styles.push({ text:space, type:"indent" })
      return text
    },
    validateIsJson(fn){
      return new Promise((res)=>{
        let ok = false
        let body = {}
        try {
          body = JSON.parse(this.$refs.codeDoc.innerText.replace(/\s/g,''))
          ok = true
        } catch (error) {}
        res({ ok, body })
      })
    }
  }
};
</script>
<style lang="scss">
.code-preview__line::selection, .code-preview__line span::selection{ 
  background: rgba(73, 72, 62, .99); 
}
.code-preview__block {
  background: #1e1e1e;
  color: #d4d4d4;
  cursor: text;
  padding:10px;
  font-size: 14px;
  font-family: Consolas, "Courier New", monospace;
  .code-preview__line-number {
    display: inline-block;
    color: #858585;
    margin-right:10px;
    text-align: right;
    user-select: none;
  }
  .line-light-key{
    color: #9cdcfe
  }
  .line-light-string{
    color:#ce9178
  }
  .line-light-number{
    color:#b5cea8
  }
  .line-light-atom{
    color:#569cd6
  }
  .line-light-boolean{
    color:#569cd6
  }
  .line-light-symbol{
    color:#d4d4d4
  }
}
</style>
