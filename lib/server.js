// const options = require('../options')
const page = require('./page')
const express = require('express')
const http = require('http')
const reload = require('reload')
const chokidar = require('chokidar')

var server = {
    start: function (options) {
        const app = express()

        app.set('port', options.port || 0)
        app.use(express.static(options.siteFolder))

        var server = http.createServer(app)

        // Reload code here
        reload(app).then(function (reloadReturned) {
            // reloadReturned is documented in the returns API in the README

            // Reload started, start web server
            server.listen(app.get('port'), function () {
                console.log('Live Preview:'.brightYellow + (' http://localhost:' + server.address().port).blue)

                // open('http://localhost:' + server.address().port)
            })

            // 404 handling.
            app.get('*', function (req, res) {
                // res.send('404', 404)
                res.redirect('/404')
            })

            if (options.dev) {
                chokidar.watch(options.siteFolder + '/*').on('change', (event, path) => {
                    reloadReturned.reload()
                })
            }

        }).catch(function (err) {
            console.error('Reload could not start, could not start server/sample app', err)
        })

        if (options.dev) {
            // changes in pages, template, or _textbase.js
            var watcher = chokidar.watch()
            watcher.add([
                options.pagesFolder,
                options.templateFolder,
                process.cwd() + '/_textbase.js'
            ])
            watcher.on('change', (path) => {
                console.log('Live Preview:'.brightYellow + (' http://localhost:' + server.address().port).blue)
                page.compile(path, { dev: true }, () => {
                    console.log(path, 'compiled.')
                })
            })


            // changes in the `public` folder
            var publicWatcher = chokidar.watch()
            publicWatcher.add([
                options.publicFolder,
            ])
            publicWatcher.on('change', (path) => {
                page.syncPublic(() => { })
            })
        }
    }
}

module.exports = server
