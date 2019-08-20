export default {
  methods: {
    handleAttribute(value, defaultValue) {
      if (value === false || value === 0 || value === '') {
        return value
      }
      return value || defaultValue
    },
    handleValueBoolean(value) {
      return !!value
    },
    handleIcon(icon) {
      return (this.handleValueBoolean(icon) && `el-icon-${icon}`) || ''
    },
    handlePureRow(row){
      let __before_format_row__ = row.__before_format_row__
      row = this.deepClone(row)
      Object.keys(row).forEach(k=>{
        if(k.startsWith("__is_loading_cell__")) delete row[k]
      })
      delete row.__before_format_row__
      return Object.assign(row,__before_format_row__)
    },
    handleDisableAttribute(cb, data) {
      if (typeof cb === 'function') {
        return cb(data) || false
      }
      return false
    },
    handleFormItemBoolean(v, item) {
      return this.handleValueBoolean(v.component) && this.handleValueBoolean(v.component.name) && v.component.name === item
    },
    handleFormItemOptions(v) {
      return (this.handleValueBoolean(v.component) && this.handleValueBoolean(v.component.options) && v.component.options) || []
    },
    emptyObject(obj) {
      return JSON.stringify(obj) === '{}'
    },
    deepClone(source) {
      if (!source && typeof source !== 'object') {
        throw new Error('error arguments', 'deepClone')
      }
      const targetObj = source.constructor === Array ? [] : {}
      Object.keys(source).forEach(keys => {
        if (source[keys] && typeof source[keys] === 'object') {
          targetObj[keys] = this.deepClone(source[keys])
        } else {
          targetObj[keys] = source[keys]
        }
      })
      return targetObj
    }, 
    looseEqual(a, b) {
      if (a === b) return true
      const isObjectA = this.isObject(a)
      const isObjectB = this.isObject(b)
      if (isObjectA && isObjectB) {
        try {
          const isArrayA = Array.isArray(a)
          const isArrayB = Array.isArray(b)
          if (isArrayA && isArrayB) {
            return a.length === b.length && a.every((e, i) => {
              return looseEqual(e, b[i])
            })
          } else if (a instanceof Date && b instanceof Date) {
            return a.getTime() === b.getTime()
          } else if (!isArrayA && !isArrayB) {
            const keysA = Object.keys(a)
            const keysB = Object.keys(b)
            return keysA.length === keysB.length && keysA.every(key => {
              return looseEqual(a[key], b[key])
            })
          } else {
            /* istanbul ignore next */
            return false
          }
        } catch (e) {
          /* istanbul ignore next */
          return false
        }
      } else if (!isObjectA && !isObjectB) {
        return String(a) === String(b)
      } else {
        return false
      }
    },
    isObject(obj) {
      return obj !== null && typeof obj === 'object'
    }
  }
}