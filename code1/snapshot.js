const SqliteDB = require('../sqlite/index.js');
const db = new SqliteDB('./snapRemoteShot.db');
const connect = require('./connect.js.js.js');
const request = require('request');
const fs = require('fs')
const path = require('path')

//snapRemoteShot表
const createSnapRemoteShotTableSql =
`create table if not exists sys_snapRemoteShot ( 
    snapRemoteShotId   INTEGER PRIMARY KEY AUTOINCREMENT,
    snapRemoteShotName VARCHAR,
    category     VARCHAR,
    node         VARCHAR,
    created_at   INTEGER,
    status       INTEGER,
    expectCount  INTEGER,
    actualCount  INTEGER 
);`
db.create(createSnapRemoteShotTableSql);

const targets = ['consumers', 'plugins', 'services', 'routes']
const exportCodes = {
  success: 0,
  lack: 11,
  unlink: 12,
  exists: 13
}
const importCodes = {
  success: 0,
  lack: 21,
  unlink: 22,
  unexists: 23
}

class SnapRemoteShotFile {
  getSnapRemoteShotPath(snapRemoteShotName) {
    return path.join(__dirname, `../snapRemoteShot/${snapRemoteShotName}.txt`)
  }
  writeSnapRemoteShot(file, snapRemoteShotForWrite) {
    return fs.writeFileSync(file, JSON.stringify(snapRemoteShotForWrite), { encoding: 'utf8' })
  }
  readSnapRemoteShot(file) {
    return JSON.parse(fs.readFileSync(file, { encoding: 'utf8' }))
  }
  existsSnapRemoteShot(file) {
    return fs.existsSync(file)
  }
}

class SnapRemoteShotRequest {
  constructor(){
    this.successDelete = {}
    this.successPost = {}
  }
  request({ url, method, data }) {
    return new Promise((res, rej) => {
      request({
        url,
        method,
        json: true,
        body: data,
        headers:{
          "content-type": "application/json"
        }
      }, (error, response) => {
        if (error) {
          rej(error.message)
        } else {
          res(response)
        }
      });
    })
  }
  batchQuery(url) {
    return Promise.all(targets.map((object) => {
      return new Promise((res, rej) => {
        this.request({ url:`${url}/${object}`, method: "GET" }).then((response) => {
          if(response.statusCode === 200){
            res({object, response:response.body})
          }else{
            rej()
          }
        }).catch(err => {
          rej(err)
        })
      })
    }))
  }
  batchDelete(url,snapRemoteShot) {
    let promises = []
    this.successDelete = {}
    Object.keys(snapRemoteShot).forEach(object=>{
      snapRemoteShot[object].data.forEach((v) => {
        let id = v.id
        promises.push(new Promise((res,rej)=>{
          this.request({url:`${url}/${object}/${id}`,method:"DELETE"}).then(() => {
            if(!this.successDelete[object]) this.successDelete[object] = {data:[]}
            this.successDelete[object].data.push(v)
            res()
          }).catch(()=> {
            res()
          })
        }))
      })
    })
    return Promise.all(promises)
  }
  batchPost(url, snapRemoteShot) {
    let promises = []
    this.successPost = {}
    Object.keys(snapRemoteShot).forEach(object => {
      snapRemoteShot[object].data.forEach(v=>{
        promises.push(new Promise((res,rej)=>{
          this.request({url:`${url}/${object}`,method:"POST",data:v}).then((response)=>{
            if([200,201].includes(response.statusCode)){
              if(!this.successPost[object]) this.successPost[object] = {data:[]}
              this.successPost[object].data.push(response.body)
              res()
            }else{
              res()
            }
          }).catch((err)=>{
            res()
          })
        }))
      })
    })
    return Promise.all(promises)
  }
}

class SnapRemoteShotUtil {
  getConnect() {
    return new Promise(resolve => {
      connect.getActiveConnect().then(([connect]) => {
        try {
          resolve(connect.url)
        } catch (error) {
          resolve()
        }
      });
    })
  }
  getCount(v) {
    return Object.keys(v).map(k => v[k].data.length).reduce((a, b) => a + b)
  }
}

const snapRemoteShotUtil = new SnapRemoteShotUtil()
const snapRemoteShotFile = new SnapRemoteShotFile()
const snapRemoteShotRequest = new SnapRemoteShotRequest()

const snapRemoteShotDB = {
  _insertSnapRemoteShot({ snapRemoteShotName, category, node = "-", expectCount, actualCount, code }) {
    let insertSql = `insert into sys_snapRemoteShot(snapRemoteShotName,category,node,created_at,code,expectCount,actualCount) values('${snapRemoteShotName}','${category}','${node}',${new Date().getTime()},${code},${expectCount},${actualCount});`
    return db.executeSql(insertSql);
  },
  async _createDbModel(param) {
    let node = await snapRemoteShotUtil.getConnect()
    return Object.assign({}, param, {
      node,
      expectCount: 0,
      actualCount: 0,
      code: exportCodes.success
    })
  },
  _batchQuery(node, codes) {
    return new Promise((res, rej) => {
      snapRemoteShotRequest.batchQuery(node).then(data => {
        let remoteData = {}
        data.forEach(({ object, response }) => {
          remoteData[object] = response
        })
        res(remoteData)
      }).catch(err => {
        rej({ code: codes.unlink, err })
      })
    })
  },
  _import(node, snapRemoteShotForRead) {
    return new Promise((res,rej)=>{
      this._batchQuery(node, importCodes).then(remoteData =>{
        snapRemoteShotRequest.batchDelete(node,remoteData).then(()=>{
          snapRemoteShotRequest.batchPost(node,snapRemoteShotForRead).then(()=>{
            this._batchQuery(node,importCodes).then(afterData => {
              let expectCount = snapRemoteShotUtil.getCount(snapRemoteShotForRead)
              let actualCount = snapRemoteShotUtil.getCount(afterData)
              if(expectCount === actualCount){
                res({expectCount,actualCount})
              }else{
                res({expectCount,actualCount,code:importCodes.lack})
              }
            })
          })
        })
      }).catch(() => {
        rej()
      })
    })
  },
  getsnapRemoteShot() {
    return db.select("select * from sys_snapRemoteShot;");
  },
  import(param) {
    return new Promise(async (res, rej) => {
      let file = snapRemoteShotFile.getSnapRemoteShotPath(param.snapRemoteShotName)
      let model = await this._createDbModel(param)
      let snapRemoteShotForRead = snapRemoteShotFile.readSnapRemoteShot(file)
      if(!snapRemoteShotFile.existsSnapRemoteShot(file) || !snapRemoteShotForRead){
        this._insertSnapRemoteShot(Object.assign(model, { code:importCodes.unexists })).then(()=>rej())
      }
      this._import(model.node, snapRemoteShotForRead).then((c)=>{
        this._insertSnapRemoteShot(Object.assign(model, { code:importCodes.success },c)).then(() => {
          model.code === 0 ? res() : rej()
        })
      }).catch(()=>{
        this._insertSnapRemoteShot(Object.assign(model, { code:importCodes.unlink })).then(() => rej())
      })
    })
  },
  export(param) {
    return new Promise(async (res, rej) => {
      let model = await this._createDbModel(param)
      this._batchQuery(model.node,exportCodes).then(snapRemoteShotForWrite => {
        let file = snapRemoteShotFile.getSnapRemoteShotPath(param.snapRemoteShotName)
        if (snapRemoteShotFile.existsSnapRemoteShot(file)) {
          model.code = exportCodes.exists
        } else {
          snapRemoteShotFile.writeSnapRemoteShot(file, snapRemoteShotForWrite)
          let snapRemoteShotForRead = snapRemoteShotFile.readSnapRemoteShot(file)
          let expectCount = snapRemoteShotUtil.getCount(snapRemoteShotForWrite)
          let actualCount = snapRemoteShotUtil.getCount(snapRemoteShotForRead)
          Object.assign(model, {
            expectCount,
            actualCount,
            code: expectCount === actualCount ? exportCodes.success : exportCodes.lack
          })
        }
        this._insertSnapRemoteShot(model).then(() => {
          model.code === 0 ? res() : rej()
        })
      }).catch(({ code, err }) => {
        this._insertSnapRemoteShot(Object.assign(model, { code })).then(() => rej(err))
      })
    })
  }
};
module.exports = snapRemoteShotDB;