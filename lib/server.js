// const global.options = require('../global.options')
const lib = require('./lib')
const page = require('./page')
const express = require('express')
const http = require('http')
const reload = require('reload')
const chokidar = require('chokidar')
var nodeCleanup = require('node-cleanup')

var server = {
    start: () => {
        const app = express()

        var port = global.options.port
        app.use(express.static(global.options.siteFolder))

        // 404 handling.
        // app.get('*', (req, res) => {
        //     // res.send('404', 404)
        //     res.redirect('/404')
        // })

        // var server = http.createServer(app)

        app.set('port', global.options.port || 4000)
        if (global.options.dev) {
            // Reload code here
            var server = http.createServer(app)

            // Reload code here
            reload(app).then(function (reloadReturned) {
                // reloadReturned is documented in the returns API in the README
                var watcher = chokidar.watch()
                watcher.add([
                    global.options.siteFolder,
                ])
                watcher.on('change', (path) => {
                    reloadReturned.reload()
                })
                nodeCleanup(function (exitCode, signal) {
                    console.log('ded')
                    reloadReturned.closeServer()
                    // release resources here before node exits
                })

                // Reload started, start web server
                server.listen(app.get('port'), function () {
                    console.log('Web server listening on port ' + app.get('port'))
                })
            }).catch(function (err) {
                console.error('Reload could not start, could not start server/sample app', err)
            })

            // changes in pages
            var watcher = chokidar.watch()
            watcher.add([
                global.options.pagesFolder,
            ])
            watcher.on('change', (path) => {
                // console.log('Live Preview:'.brightYellow + (' http://localhost:' + server.address().port).blue)
                page.compile(path, () => {
                    console.log(path, 'compiled.')
                })
            })

            // changes in template
            var watcher = chokidar.watch()
            watcher.add([
                global.options.templateFolder,
            ])
            watcher.on('change', (path) => {
                // console.log('Live Preview:'.brightYellow + (' http://localhost:' + server.address().port).blue)
                lib.build()
            })

            // changes in the `public` folder
            var publicWatcher = chokidar.watch()
            publicWatcher.add([
                global.options.publicFolder,
            ])
            publicWatcher.on('change', (path) => {
                page.syncPublic(() => { })
                page.syncStylesheet(() => { })
            })
        } else {
            app.listen(port, () => {
                // console.log(`Production server running on: http://localhost:${port}`)
            })
        }
    }
}

module.exports = server
