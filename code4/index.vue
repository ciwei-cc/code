<template>
  <div class="crud-table-container" v-loading="loading">
    <el-row class="crud-table-topbar">
      <el-form :inline="true" style="flex:1">
        <el-form-item style="margin-bottom:0" v-if="hasCreatedId">
          <el-date-picker v-model="search.created_at" size="mini" @change="onSearch" value-format="timestamp" type="datetimerange" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期">
          </el-date-picker>
        </el-form-item>
        <el-form-item style="margin-bottom:0" v-if="hasName">
          <el-input type="input" size="mini" v-model="search.name" placeholder="请输入名称进行过滤" @input="onSearch"></el-input>
        </el-form-item>
        <el-form-item style="margin-bottom:0" v-for="(field,idx) in searchFields" :key="idx">
          <el-input type="input" size="mini" v-model="search[field.prop]" :placeholder="field.placeholder" @input="onSearch"></el-input>
        </el-form-item>
        <slot name="search"></slot>
      </el-form>
      <el-button type="primary" icon="el-icon-plus" size="mini" @click="$emit('want-create')" v-if="enableAdd">{{addText}}</el-button>
      <slot name="header-btn"></slot>
    </el-row>
    <el-table :data="renderData" :height="height" :span-method="spanMethod" :stripe="handleAttribute(options.stripe,false)" :border="handleAttribute(options.border,false)" :header-cell-style="headerRowStyle" :cell-class-name="cellClassName" @selection-change="handleSelectionChange">
      <el-table-column v-if="handleValueBoolean(enbaleSelect)" type="selection" width="38"></el-table-column>
      <el-table-column v-if="handleValueBoolean(enableExpand)" type="expand" width="50" label="详情">
        <template slot-scope="scope">
          <slot name="expand" :row="scope.row"></slot>
        </template>
      </el-table-column>
      <el-table-column v-for="(column,idx) in columns" :key="idx" :label="handleAttribute(column.title,'')" :width="handleAttribute(column.width)">
        <template slot-scope="scope">
          <div 
            v-loading="scope.row[`__is_loading_cell__${column.key}`]"
            element-loading-spinner="el-icon-loading"
            element-loading-background="rgba(0,0,0,0)"
          >
            <div v-if="scope.row[`__is_loading_cell__${column.key}`]">&#12288;</div>
            <div :class="{'ellipsis':column.ellipsis}" v-show="!scope.row[`__is_loading_cell__${column.key}`]">
              <el-popover
                :visible-arrow="false"
                v-if="!column.component && column.ellipsis"
                placement="top-start"
                width="500"
                trigger="hover"
                :content="scope.row[column.key]">
                <span slot="reference">{{ scope.row[column.key] }}</span>
              </el-popover>
              <span v-if="!column.component && !column.ellipsis">{{ scope.row[column.key] }}</span>
              <el-switch v-if="isComponent(column.component, 'switch')" :value="scope.row[column.key]" @input="column.beforeChange(...arguments, handlePureRow(scope.row), scope.$index)"></el-switch>
              <el-button v-if="isComponent(column.component, 'button')" :type="handleAttribute(column.type,'default')" :size="handleAttribute(column.size,'small')" @click="column.beforeChange(...arguments, handlePureRow(scope.row), scope.$index)">{{scope.row[column.key]}}</el-button>
            </div>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="操作" fixed="right" v-if="enableOperate" :width="getOperateWidth()">
        <template slot="header" slot-scope="scope">
          操作
        </template>
        <template slot-scope="scope">
          <el-button v-if="enableUpdate" type="primary" size="mini" @click="handleRowBtnClick('want-update', scope.row, scope.$index)">
            编辑
          </el-button>
          <el-button v-if="enableDelete" type="danger" size="mini" @click="handleRowBtnClick('want-delete', scope.row, scope.$index)">
            删除
          </el-button>
          <el-button v-for="(v,k) in rowHandle" :key="k" :icon="handleIcon(v.icon)" :type="handleAttribute(v.type,'default')" :size="handleAttribute(v.size,'small')" :disabled="handleDisableAttribute(v.disabled, scope.row)" @click="handleRowBtnClick(k, scope.row, scope.$index, v)">
            {{v.text}}
          </el-button>
        </template>
      </el-table-column>
    </el-table>
    <div class="crud-table-page">
      <el-pagination :layout="handleAttribute(null,'total, sizes, prev, pager, next, jumper, ->')" :total="handleAttribute(page.total,0)" :page-sizes="sizes" :page-size="handleAttribute(page.size,10)" :current-page="handleAttribute(page.index,1)" @current-change="handlePaginationChange" @size-change="handlePageSizeChange">
      </el-pagination>
    </div>
  </div>
</template>
<script>
import utils from "./utils";
export default {
  props: {
    loading: {
      type: Boolean,
      default: false
    },
    data: {
      type: Array,
      required: true
    },
    height: Number | String,
    options: {
      type: Object,
      default() {
        return {
          border: true,
          stripe: true
        };
      }
    },
    enableUpdate: {
      type: Boolean,
      default: true
    },
    headerRowStyle: {
      type: Object,
      default() {
        return {
          background: "#ebebeb"
        };
      }
    },
    cellClassName: {
      type: Function,
      default() {
        return () => {};
      }
    },
    enableDelete: {
      type: Boolean,
      default: true
    },
    enableAdd: {
      type: Boolean,
      default: true
    },
    addText: {
      type: String,
      default: "添加"
    },
    enbaleSelect: {
      type: Boolean,
      default: false
    },
    enableExpand: {
      type: Boolean,
      default: false
    },
    columns: {
      type: Array,
      required: true
    },
    rowHandle: Object,
    spanMethod: {
      type: Function,
      default() {
        return () => {};
      }
    },
    enableOperate: {
      type: Boolean,
      default: true
    },
    searchFields: {
      type: Array,
      default() {
        return [];
      }
    }
  },
  computed: {
    hasName() {
      return this.columns.findIndex(v => v.key === "name") >= 0;
    },
    hasUserName() {
      return this.columns.findIndex(v => v.key === "username") >= 0;
    },
    hasCreatedId(){
      return this.columns.findIndex(v => v.key === "created_at") >= 0;
    }
  },
  watch: {
    data() {
      this.setOriginData();
    }
  },
  created(){
    this.setOriginData();
  },
  data() {
    return {
      sizes: [5, 10, 20, 50],
      page: {
        index: 1,
        size: 10,
        total: 0
      },
      search: {},
      renderData: [],
      throttle: false
    };
  },
  mixins: [utils],
  methods: {
    onSearch(val) {
      if (this.throttle) clearTimeout(this.throttle);
      this.throttle = setTimeout(() => {
        this.page.index = 1;
        this.setOriginData();
      }, 30);
    },
    getOperateWidth() {
      let width = 0;
      if (this.enableUpdate) {
        width += 75;
      }
      if (this.enableDelete) {
        width += 75;
      }
      if (this.rowHandle) {
        Object.keys(this.rowHandle).forEach(k => {
          width += this.rowHandle[k].text.length * 12;
        });
        width += 52;
      }
      return `${width}px`;
    },
    isSearchItem(item) {
      let isSearchItem = true;
      Object.keys(this.search).forEach(searchProp => {
        let itemValue = item[searchProp];
        let searchValue = this.search[searchProp];
        if (itemValue && searchValue) {
          if (Array.isArray(searchValue) && searchProp === "created_at") {
            const [start, end] = searchValue;
            itemValue = String(itemValue).length == 10 ? itemValue * 1000 : item;
            isSearchItem = start <= itemValue && end >= itemValue;
          } else if (
            !itemValue
              .toLocaleLowerCase()
              .includes(searchValue.toLocaleLowerCase())
          ) {
            isSearchItem = false;
          }
        }
      });
      return isSearchItem;
    },
    setOriginData() {
      this.originData = this.data.filter(item => {
        return this.isSearchItem(item);
      });
      this.page.total = this.originData.length;
      this.setPage();
    },
    handleSelectionChange(selection) {
      this.$emit("selection-change", selection);
    },
    handleRowBtnClick(event, row, index, btnConfig) {
      row = this.handlePureRow(row);
      if (event === "want-delete") {
        this.$confirm("是否确认删除？")
          .then(() => {
            this.$emit(event, Object.assign({}, row), index);
          })
          .catch(err => {});
      } else {
        this.$emit(event, Object.assign({}, row), index, btnConfig);
      }
    },
    setPage() {
      let { index, size } = this.page;
      this.renderData = this.deepClone(this.originData)
        .map(item => item)
        .splice(index * size - size, size)
        .map(row => {
          row.__before_format_row__ = row.__before_format_row__ || this.deepClone(row);
          this.columns.forEach(({ key, format }) => {
            if (format) {
              let promise = new Promise((res, rej) => {
                let formatRet = format(row.__before_format_row__, ret => res(ret));
                if (formatRet !== undefined) {
                  res(formatRet);
                }else{
                  row[`__is_loading_cell__${key}`] = true
                }
              });
              promise.then(ret=>{
                row[key] = ret
                row[`__is_loading_cell__${key}`] = false
              })
            }
          });
          return row;
        });
    },
    handlePaginationChange(index) {
      this._handlePageChange({ index });
    },
    handlePageSizeChange(size) {
      this._handlePageChange({ size });
    },
    _handlePageChange(data) {
      this.page = Object.assign(this.page, data);
      this.setPage();
      this.$emit("page-change", Object.assign({}, this.page));
    },
    isComponent(targetComponent, component) {
      return targetComponent === component;
    }
  }
};
</script>
<style lang="scss">
.crud-table-container {
  .el-loading-spinner {
    top: 50%;
    margin-top: 0;
    transform: translateY(-50%);
    width: 100%;
    text-align: center;
    position: absolute;
  }
  .crud-table-topbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .crud-table-page {
    margin: 15px 0;
  }
  .ellipsis {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .a {
    padding-left: 15px
  }
}
</style>
