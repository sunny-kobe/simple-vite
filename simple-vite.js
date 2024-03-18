const http = require('http')
const fs = require('fs')
const path = require('path')

function rewriteImport(content) { // ++++新增
  return content.replace(/ from ['|"]([^'"]+)['|"]/g, function (s0, s1) { // 找到  from 'vue' 中的  'vue'
    if (s1[0] !== '.' && s1[1] !== '/') {
      return ` from '/@modules/${s1}'`
    } else {
      return s0
    }
  })
}

const server = http.createServer((req, res) => {
  const { url, query } = req

  if (url === '/') {
    // 设置响应头的Content-Type是为了让浏览器以html的编码方式去加载这份资源
    res.writeHead(200, {
      'Content-Type': 'text/html'
    })

    let content = fs.readFileSync('./index.html', 'utf8')
    res.end(content)
  } else if (url.endsWith('.js')) {
    const p = path.resolve(__dirname, url.slice(1))
    res.writeHead(200, {
      'Content-Type': 'application/javascript'
    })
    const content = fs.readFileSync(p, 'utf8')
    res.end(rewriteImport(content))  // +++++修改
  }

})

server.listen(8080, () => {
  console.log('listening on port 8080');
})
