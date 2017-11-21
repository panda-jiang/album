'use strict'
const express = require('express')
//引入path核心对象
const path = require('path')
//解析post请求体数据
const bodyParser = require('body-parser')
//文件功能增强的包
const fse = require('fs-extra')
//解析上传文件的包
const formidable = require('formidable')

//引入数据库
const mysql = require('mysql')
const pool = mysql.createPool({
    connectionLimit: 10,
    host: '127.0.0.1',
    user: 'root',
    password: 'panjun',
    database: 'album'
})

//创建服务器
let app = express()
//配置模板引擎
app.engine('html', require('express-art-template'))

//配置路由规则
let router = express.Router()
//测试路由
router.get('/test', (req,res,next) => {
    pool.getConnection(function(err, connection) {
        connection.query('select * from album_dir', function(error,result,fields){
            //查询完毕以后，释放连接
            connection.release()
            if(error) throw error
            res.render('test.html', {
                text: result[2].dir
            })
        })
    })
})
.get('/',(req,res,next)=>{
    //获取连接
    pool.getConnection((err,connection)=> {
        if(err) return next(err)
        connection.query('select * from album_dir', (error, result)=> {
            res.render('index.html',{
                album: result
            })
        })
    })
})
.get('/showDir',(req,res,next)=> {
    //获取url上的查询字符串
    let dirname = req.query.dir
    // console.log(dirname)
    pool.getConnection((err,connection)=> {
        //处理获取连接时的异常
        if(err) return next(err)
        connection.query('select * from album_file where dir =?', [dirname], (error,result)=> {
            //查询完先释放
            connection.release()
            //处理查询时带来的异常
            if(err) return next(err)

            //渲染页面  记录相册名
            res.render('album.html',{
                album: result,
                dir:dirname
            })
        })
    })
})
//新增相册
.post('/addDir',(req,res,next)=> {
    let dirname = req.body.dirname
    console.log(dirname)
    pool.getConnection((err,connection)=> {
        if(err) return next(err)
        connection.query('insert into album_dir values (?)', [dirname],(error,result)=> {
            //释放连接池
            connection.release()
            //处理查询出现的异常
            if(err) return next(err)

            //创建本地文件夹
            const dir = `./resource/${dirname}`
            //确保目录存在
            fse.ensureDir(dir, err => {
                res.redirect('/showDir?dir=' + dirname)
            })
        })
    })
    
})
//新增照片
.post('/addPic', (req,res,next)=> {
    var form = new formidable.IncomingForm()
    let rootPath = path.join(__dirname,'resource')
    //设置默认上传目录
    form.uploadDir = rootPath
    form.parse(req, function(err, fields, file) {
        if(err) return next(err)

        let filename = path.parse(file.pic.path).base
        let dist = path.join(rootPath,fields.dir,filename)
        fse.move(file.pic.path,dist,(err)=>{
            if(err) return next(err)
            console.log('移动成功了')

            let db_file = `/resource/${fields.dir}/${filename}`
            let db_dir = fields.dir

            pool.getConnection((err,connection)=>{
                if(err) return next(err)
                connection.query('insert into album_file value(?,?)',[db_file,
                db_dir],(error,result)=>{
                    connection.release()
                    if(err) return next(err)
                    res.redirect('/showDir?dir=' + db_dir)
                })
            })
        })
    })
})


//处理静态资源
// /public/vender/bootstrap/js/bootstrap.js
app.use('/public',express.static('./public'));
//向外暴露相片静态资源目录
app.use('/resource',express.static('./resource'));
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));
// parse application/json
app.use(bodyParser.json());
///中间件执行列表
app.use(router);
//中间键执行列表
app.use(router)


//错误处理中间键
app.use((err,req,res,next)=> {
    console.log('=========出错啦=============')
    console.log(err)
    console.log('=========出错啦=============')
    res.send(`
        您要访问的页面飞走啦.....
        <a href="">回首页</a>
        `)
})

//开启服务器
app.listen(8888, ()=> {
    console.log('服务器开启啦')
})