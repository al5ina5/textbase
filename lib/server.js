// const global.options = require('../global.options')
const lib = require('./lib')
const page = require('./page')
const express = require('express')
const http = require('http')
const reload = require('reload')
const chokidar = require('chokidar')

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

        var server = http.createServer(app)

        if (global.options.dev) {
            // Reload code here
            reload(app).then((reloadReturned) => {
                server.listen(port, () => {
                    console.log('Live preview running on:'.brightYellow + (' http://localhost:' + server.address().port).blue)
                })

                chokidar.watch(global.options.siteFolder).on('change', (event, path) => {
                    reloadReturned.reload()
                })

            }).catch((err) => {
                console.error('Reload could not start.', err)
            })

            // changes in pages
            var watcher = chokidar.watch()
            watcher.add([
                global.options.pagesFolder,
            ])
            watcher.on('change', (path) => {
                console.log('Live Preview:'.brightYellow + (' http://localhost:' + server.address().port).blue)
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
                console.log('Live Preview:'.brightYellow + (' http://localhost:' + server.address().port).blue)
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
                console.log(`Production server running on: http://localhost:${port}`)
            })
        }
    }
}

module.exports = server
