const fs = require('fs-extra')
const showdown = require('showdown')
const Handlebars = require('handlebars')
const async = require('async')
const minify = require('html-minifier').minify
const colors = require('colors')
const rimraf = require('rimraf')
const beautify = require('js-beautify').html
const chokidar = require('chokidar')
const footnotes = require('showdown-footnotes')
const { program } = require('commander')
const express = require('express')
const http = require('http')
const reload = require('reload')
const cp = require('cp');
const cpr = require('cpr');
const { exists, watch } = require('fs-extra')
const inquirer = require('inquirer');
const open = require('open');
const recursive = require("recursive-readdir")
const { mkdir } = require('fs')

const showdownIcon = require('showdown-icon')
const showdownCustomClass = require('showdown-custom-class')

program.parse(process.argv)

var converter = new showdown.Converter({
    extensions: [footnotes, showdownCustomClass, 'icon'],
    tables: true
})

var options = {
    publicFolder: './public',
    pagesFolder: './pages',
    siteFolder: './_site',
    templateFolder: __dirname + '/templates/textbase',
    minify: false,
    erase: true,
    dev: false,
    showExtensions: false
}

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
        eraseSite = (callback) => {
            if (options.erase) {
                rimraf(options.siteFolder, (error) => {
                    if (error) callback('Error during rimraf.')
                    callback(null)
                })
            } else {
                callback(null)
            }
        },
        prepareSite = (callback) => {
            fs.mkdirpSync(options.siteFolder)

            cp.sync(`${options.templateFolder}/style.css`, `${options.siteFolder}/style.css`)

            if (fs.existsSync(options.publicFolder)) {
                fs.copy(options.publicFolder + '/.', options.siteFolder)
            }

            var pages = fs.readdirSync(options.pagesFolder)

            var handlebarsSource = fs.readFileSync(options.templateFolder + '/index.html').toString()
            var handlebarsTemplate = Handlebars.compile(handlebarsSource)

            recursive(options.pagesFolder, function (err, files) {
                files.map((file, index) => {

                    if (!file.endsWith('md')) return

                    var fileSplit = file.split('/')
                    var fileName = file.split('/').pop().replace('md', 'html')
                    var filePath = () => {
                        fileSplit.pop()
                        fileSplit.shift()
                        var path = '/' + fileSplit.join('/')
                        if (path != '/') path = path + '/'
                        return path
                    }

                    if (!options.showExtensions && fileName != 'index.html') {
                        var destinationFolder = options.siteFolder + filePath() + fileName.split('.')[0]
                        var destinationFile = destinationFolder + '/index.html'
                    } else {
                        var destinationFolder = options.siteFolder + filePath()
                        var destinationFile = destinationFolder + fileName
                    }

                    // console.log(destinationFolder)
                    // console.log(destinationFile)
                    // console.log('')

                    fs.mkdirp(destinationFolder, (err) => {
                        if (err) console.log(err)

                        var markdown = fs.readFileSync(file).toString()

                        if (options.minify) {
                            var html = minify(handlebarsTemplate({
                                html: converter.makeHtml(markdown),
                                // header: headerHTML,
                                // footer: footerHTML
                            }), {
                                removeAttributeQuotes: true,
                                collapseWhitespace: true,
                                removeComments: true
                            })
                        } else {
                            var html = beautify(handlebarsTemplate({
                                html: converter.makeHtml(markdown),
                                // header: headerHTML,
                                // footer: footerHTML
                            }))
                        }

                        if (options.dev) {
                            fs.writeFile(destinationFile, html + '<script src="/reload/reload.js"></script>')
                                .then(() => {
                                    console.log(`DEV ${file.white} >> ${destinationFile.blue}`.brightYellow)
                                })
                                .catch((error) => {
                                    console.log(error)
                                })
                        } else {
                            fs.writeFile(destinationFile, html)
                                .then(() => {
                                    console.log(`${file.white} >> ${destinationFile.blue}`.brightYellow)
                                })
                                .catch((error) => {
                                    console.log(error)
                                })
                        }
                    })
                })
            })

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
        watcher.on('change', (event, path) => {
            exports.generate({ dev: true })
            console.log('Live Preview:'.brightYellow + (' http://localhost:' + server.address().port).blue)
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

exports.help = () => {
    console.log('Available Commands:'.brightYellow)
    console.log('textbase'.blue.white + ' - Run the generator.'.brightYellow)
    console.log('textbase dev'.blue + ' - Development mode.'.brightYellow)
    console.log('textbase eject'.blue + ' - Eject the configuration to your current directory.'.brightYellow)
    console.log('textbase deploy'.blue + ' - Deploy your textbase site.'.brightYellow)
}