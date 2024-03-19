const http = require('http')
const fs = require('fs') 
const path = require('path') 
const { URL } = require('url');
const compilerSfc = require('@vue/compiler-sfc') // +++++新增
const compilerDom = require('@vue/compiler-dom')



function rewriteImport(content) { 
  return content.replace(/ from ['|"]([^'"]+)['|"]/g, function(s0, s1) { // 找到  from 'vue' 中的  'vue'
    if (s1[0] !== '.' && s1[1] !== '/') {
      return ` from '/@modules/${s1}'`
    } else {
      return s0
    }
  })
}

const server = http.createServer((req, res) => {
  const { url } = req
  const query = new URL(req.url, `http://${req.headers.host}`).searchParams;  // ++++ node 新版本，读取get请求的参数写法

  if (url === '/') {
    // 设置响应头的Content-Type是为了让浏览器以html的编码方式去加载这份资源
    res.writeHead(200, { 
      'Content-Type': 'text/html'
    })

    // index.html新增的代码
    const script = `
    <script>
      const socket = new WebSocket("ws://localhost:8080");

      socket.addEventListener("open", function (event) {
        socket.send("Hello Server!");
      });

      socket.addEventListener("message", function (event) {
        console.log("Message from server ", event.data);
        window.location.reload() // 接收到后端的推送后直接刷新页面
      });


      window.process = {
        env: {
          NODE_ENV: 'dev'
        }
      }

    </script>
    <script 
    `

    let content = fs.readFileSync('./index.html', 'utf8')
    content = content.replace('<script ', script)

    res.end(content)
  } else if (url.endsWith('.js')) {
    const p = path.resolve(__dirname, url.slice(1))
    res.writeHead(200, {
      'Content-Type': 'application/javascript'
    })
    const content = fs.readFileSync(p, 'utf8')
    res.end(rewriteImport(content))  // +++++修改
  } else if (url.startsWith('/@modules/')) {
    const prefix = path.resolve(__dirname, 'node_modules', url.replace('/@modules/', ''))
    const module = require(prefix + '/package.json').module
    const p = path.resolve(prefix, module)
    const content = fs.readFileSync(p, 'utf8')
    res.writeHead(200, {
      'Content-Type': 'application/javascript'
    })
    res.end(rewriteImport(content))
  } else if (url.indexOf('.vue') !== -1) { // 返回.vue文件的js部分
    const p = path.resolve(__dirname, url.split('?')[0].slice(1))
    const { descriptor } = compilerSfc.parse(fs.readFileSync(p, 'utf8'))
    if (!query.get('type')) {
      res.writeHead(200, {'Content-Type': 'application/javascript'})
      const content = `
        ${rewriteImport(descriptor.script.content.replace('export default', 'const __script = '))} 
        import { render as __render } from "${url}?type=template" 
        __script.render = __render 
        export default __script
      `
      res.end(content)
    } else if (query.get('type') === 'template') { // 返回.vue文件的html部分
      const template = descriptor.template
      const render = compilerDom.compile(template.content, {mode: 'module'}).code
      res.writeHead(200, {'Content-Type': 'application/javascript'})
      res.end(rewriteImport(render))
    }
  } else if (url.endsWith('.css')) {
    const p = path.resolve(__dirname, url.slice(1))
    const file = fs.readFileSync(p, 'utf8')
    const content = `
      const css = "${file.replace(/\n/g, '')}"
      let link = document.createElement('style')
      link.setAttribute('type', 'text/css')
      document.head.appendChild(link)
      link.innerHTML = css
      export default css
    `
    res.writeHead(200, {'Content-Type': 'application/javascript'})
    res.end(content)
  }

})

// 热更新 -------------------------------------------------------------------------- 

const WebSocket = require('ws');
const wss = new WebSocket.Server({ server });
const chokidar = require('chokidar');

wss.on('connection', (ws) => {
  // 在客户端连接时执行的代码
  console.log('Client connected');

  // 在连接关闭时执行的代码
  ws.on('close', () => {
    console.log('Client disconnected');
  });
});


const watcher = chokidar.watch('.', {
  ignored: ['**/node_modules/**', '**/.git/**'],
  persistent: true, 
});

watcher.on('change', (path) => {
  // 发送热更新通知给所有连接的客户端
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send('update');
    }
  });
});

// -------------------------------------------------------------------------



server.listen(8080, () => {
  console.log('listening on port 8080');
})