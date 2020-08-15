
const page = require('./lib/page')
var options = require('./options')
const fs = require('fs-extra')
const async = require('async')
const colors = require('colors')
const chokidar = require('chokidar')
const { program } = require('commander')
const express = require('express')
const http = require('http')
const reload = require('reload')
const cp = require('cp')
const cpr = require('cpr')
const inquirer = require('inquirer')

program.parse(process.argv)

exports.updateOptions = (addOptions, callback) => {
    fs.exists(process.cwd() + '/_textbase.js', (_textbaseExists) => {
        if (_textbaseExists) {
            var importedConfig = require(process.cwd() + '/_textbase.js')
            options = { ...options, ...importedConfig, ...addOptions }
        }

        options = { ...options, ...addOptions }
        callback(null)
    })
}

exports.generate = async (ops) => {
    async.waterfall([
        updateConfig = (callback) => {
            this.updateOptions(ops, () => {
                callback(null)
            })
        },
        // eraseSite = (callback) => {
        //     if (options.erase) {
        //         rimraf(options.siteFolder, (error) => {
        //             if (error) callback('Error during rimraf.')
        //             callback(null)
        //         })
        //     } else {
        //         callback(null)
        //     }
        // },
        prepareSite = (callback) => {
            fs.mkdirpSync(options.siteFolder)

            cp.sync(`${options.templateFolder}/style.css`, `${options.siteFolder}/style.css`)

            if (fs.existsSync(options.publicFolder)) {
                fs.copy(options.publicFolder + '/.', options.siteFolder)
            }

            page.all((pageData) => {
                page.compile(pageData.pageRoute, () => {
                    console.log(pageData.pageRoute, 'recompiled.')
                })
            })

            page.createDirectoryRoute('/_routes.html')

            callback(null)
        }
    ], (error, results) => {
        if (error) console.log(error)

        console.log(`Static website generated in ${options.siteFolder.blue}.`.brightYellow)
    })
}

// `textbase dev`
exports.dev = () => {
    this.updateOptions({}, () => {
        exports.generate({ dev: true })

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

            chokidar.watch(options.siteFolder + '/*').on('change', (event, path) => {
                reloadReturned.reload()
            })

        }).catch(function (err) {
            console.error('Reload could not start, could not start server/sample app', err)
        })

        var watcher = chokidar.watch()
        watcher.add([
            options.pagesFolder,
            options.publicFolder,
            options.templateFolder,
            process.cwd() + '/_textbase.js'
        ])
        watcher.on('change', (path) => {
            console.log('Live Preview:'.brightYellow + (' http://localhost:' + server.address().port).blue)
            page.compile(path, () => {
                console.log(path, 'compiled.')
            })
        })
    })
}

// `textbase deploy`
if (program.args[0] == 'deploy') {
    console.log(`${`Run`.yellow} ${`vercel`.blue} ${`or`.yellow} ${`netlify`.blue} ${`to deploy.`.yellow} `)
}

exports.eject = () => {
    inquirer
        .prompt([
            {
                type: 'confirm',
                name: 'eject',
                message: 'Are you sure you want to eject? This may overwrite your current configuration.'
            }
        ])
        .then(answers => {
            if (!answers.eject) {
                return console.log('Ejection aborted.'.brightYellow)
            }

            this.updateOptions({}, () => {
                var optionsCopy = Object.assign({}, options)
                optionsCopy.templateFolder = './templates/textbase'

                var textbase = 'module.exports = ' + JSON.stringify(optionsCopy, null, 4)

                fs.writeFile(process.cwd() + '/_textbase.js', textbase, (err) => {
                    if (err) console.log(err)
                    console.log('Config ejected to '.brightYellow + './_textbase.js'.blue + '. Alter this to configure your generation options.'.brightYellow)
                })

                fs.exists(process.cwd() + '/templates/textbase', (exists) => {
                    if (!exists) {
                        fs.mkdirp(process.cwd() + '/templates/textbase', (err) => {
                            if (err) return console.log(err)
                            cpr(__dirname + '/templates/textbase/.', process.cwd() + '/templates/textbase/', {
                                deleteFirst: true, //Delete "to" before
                                overwrite: true, //If the file exists, overwrite it
                                confirm: true //After the copy, stat all the copied files to make sure they are there
                            }, function (err, files) {
                                if (err) return console.log(err)
                                console.log('Default textbase template ejected to '.brightYellow + './templates/textbase'.blue + '. Alter this to configure your template.'.brightYellow)
                            })
                        })
                    }
                })
            })
        })
        .catch(error => {
            console.log(error)
        })
}