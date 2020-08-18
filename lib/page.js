const fs = require('fs-extra')
const minify = require('html-minifier').minify
const colors = require('colors')
const beautify = require('js-beautify').html
const rimraf = require('rimraf')
const recursive = require("recursive-readdir")
const yaml = require('yaml')
const Handlebars = require('handlebars')
const showdown = require('showdown')
const converter = new showdown.Converter({
    tables: true
})

var page = {
    reset: function (callback) {
        rimraf(global.options.siteFolder, {}, (error) => {
            if (error) console.log(error)
            if (callback) callback()
        })
    },
    syncPublic: function () {
        fs.exists(global.options.publicFolder, (exists) => {
            if (exists) {
                var source = global.options.publicFolder + '/.'
                var dest = global.options.siteFolder
                fs.copy(source, dest)
                    .then(() => { })
                    .catch(err => console.log(err))

                console.log('Public folder copied to _site.')
            }
        })
    },
    syncStylesheet: function () {
        var source = global.options.templateFolder + '/style.css'
        var dest = global.options.siteFolder + '/style.css'
        fs.copy(source, dest)
            .then(() => {
                console.log('Stylesheet copied to _site.')
            })
            .catch(error => console.log(error))
    },
    prepare: function (callback) {
        handlebarsSource = fs.readFileSync(global.options.templateFolder + '/index.html').toString()
        handlebarsTemplate = Handlebars.compile(handlebarsSource)

        fs.exists(global.options.siteFolder, (exists) => {
            if (exists) {
                callback(null)
                page.syncPublic()
                page.syncStylesheet()
                return console.log('Project folder exists.')
            } else {
                fs.mkdirp(global.options.siteFolder, (err) => {
                    if (err) return console.log(err)
                    page.syncPublic()
                    page.syncStylesheet()
                    callback()
                    return console.log('Project folder created.')
                })
            }
        })
    },
    // Function to parse a page. Returns: (pageglobal.options, pageMarkdown)
    parse: function (pageRoute, callback) {
        fs.readFile(pageRoute, (error, data) => {
            if (error) console.log(error)

            var read = data.toString()
            var parsedYAML = {}
            if (read.startsWith('---') && ((read.match(/\-\-\-/g) || []).length) >= 2) {
                var firstYAML = read.indexOf('---')
                var secondYAML = read.indexOf('---', firstYAML + 3) + 3
                var pageYAML = read.substring(firstYAML, secondYAML)

                try {
                    parsedYAML = yaml.parse(pageYAML.replace(/\-\-\-/g, ''))
                } catch (e) {
                    console.log(e)
                }
            }

            var markdown = read.replace(pageYAML, '')
            if (callback) callback(parsedYAML, markdown)
        })
    },
    injectOptions: function (pageRoute, newOptions, callback) {
        // Function to inject global.options, parsed as YAML, into the page.
        fs.readFile(pageRoute, (error, data) => {
            if (error) console.log(error)

            var read = data.toString()

            page.parse(pageRoute, (oldOptions, markdown) => {
                var combinedOptions = { ...oldOptions, ...newOptions }
                var optionToYAML = '---\n' + yaml.stringify(combinedOptions) + '---'

                fs.writeFile(pageRoute, optionToYAML + markdown)
                    .then(() => console.log())
                    .catch((error) => {
                        console.log(error)
                    })
            })
        })
    },
    compile: function (pageRoute, callback) {
        // Function to compile the page into it's .html equivalent.
        var fileSplit = pageRoute.replace(/[\\]/g, '/').split('/')
        var fileName = fileSplit.pop().replace('md', 'html')
        var filePath = () => {
            // fileSplit.pop()
            fileSplit.shift()
            var path = '/' + fileSplit.join('/')
            if (path != '/') path = path + '/'
            return path
        }

        if (!global.options.showExtensions && fileName != 'index.html') {
            var destinationFolder = global.options.siteFolder + filePath() + fileName.split('.')[0]
            var destinationFile = destinationFolder + '/index.html'
        } else {
            var destinationFolder = global.options.siteFolder + filePath()
            var destinationFile = destinationFolder + fileName
        }

        // console.log('')
        // console.log(pageRoute)
        // console.log(fileSplit)
        // console.log(destinationFolder)
        // console.log('')

        fs.mkdirp(destinationFolder, (error) => {
            if (error) console.log(error)

            var handlebarsSource = fs.readFileSync(global.options.templateFolder + '/index.html').toString()
            var handlebarsTemplate = Handlebars.compile(handlebarsSource)

            page.parse(pageRoute, (pageOptions, pageMarkdown) => {
                if (global.options.minify) {

                    var html = minify(handlebarsTemplate({
                        html: converter.makeHtml(pageMarkdown),
                        page: pageOptions
                    }), {
                        removeAttributeQuotes: true,
                        collapseWhitespace: true,
                        removeComments: true
                    })
                } else {
                    var html = beautify(handlebarsTemplate({
                        html: converter.makeHtml(pageMarkdown),
                        page: pageOptions
                    }))
                }

                if (global.options.dev) {
                    fs.writeFile(destinationFile, html + '<script src="/reload/reload.js"></script>')
                        .then(() => {
                        })
                        .catch((error) => {
                            console.log(error)
                        })
                } else {
                    fs.writeFile(destinationFile, html)
                        .then(() => {
                            // console.log(`${file.white} >> ${destinationFile.blue}`.brightYellow)
                        })
                        .catch((error) => {
                            console.log(error)
                        })
                }

                if (callback) callback()
            })
        })
    },
    createDirectoryRoute: function (route, callback) {
        var links = ['# Routes']

        page.all((page) => {
            links.push(`- [${page(global.options).url}](${page(global.options).url})`)
        }, () => {
            if (global.options.minify) {
                var html = minify(handlebarsTemplate({
                    html: converter.makeHtml(links.join('\r\n')),
                }), {
                    removeAttributeQuotes: true,
                    collapseWhitespace: true,
                    removeComments: true
                })
            } else {
                var html = beautify(handlebarsTemplate({
                    html: converter.makeHtml(links.join('\r\n')),
                }))
            }

            fs.writeFile(global.options.siteFolder + route, html)
                .then(() => {
                    if (callback) callback(null)
                })
                .catch((error) => {
                    if (callback) callback(`An error occurred while writing ${route}.`.red)
                    if (callback) callback(error)
                })
        })
    },
    parseRoute: function (pageRoute, callback) {
        var fileSplit = pageRoute.split('/')
        var fileName = pageRoute.split('/').pop().replace('md', 'html')
        var filePath = () => {
            fileSplit.pop()
            fileSplit.shift()
            var path = '/' + fileSplit.join('/')
            if (path != '/') path = path + '/'
            return path
        }

        if (!global.options.showExtensions && fileName != 'index.html') {
            var destinationFolder = global.options.siteFolder + filePath() + fileName.split('.')[0]
            var destinationFile = destinationFolder + '/index.html'
        } else {
            var destinationFolder = global.options.siteFolder + filePath()
            var destinationFile = destinationFolder + fileName
        }

        var url = destinationFolder.replace(global.options.siteFolder, '')

        var route = {
            pageRoute,
            fileName,
            filePath: filePath(),
            destinationFolder,
            destinationFile,
            url
        }

        callback(route)
    },
    all: function (actions, callback) {
        recursive(global.options.pagesFolder, function (error, files) {
            files.map((file, index) => {
                if (!file.endsWith('md')) return

                page.parseRoute(file, (route) => {
                    actions(route)
                })
            })

            if (callback) callback()
        })
    }
}

module.exports = page