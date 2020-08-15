var options = require('../options')
const fs = require('fs-extra')
const minify = require('html-minifier').minify
const colors = require('colors')
const beautify = require('js-beautify').html
const rimraf = require('rimraf')
const recursive = require("recursive-readdir")
const yaml = require('yaml')
const Handlebars = require('handlebars')
const handlebarsSource = fs.readFileSync(options.templateFolder + '/index.html').toString()
const handlebarsTemplate = Handlebars.compile(handlebarsSource)
const showdown = require('showdown')
const showdownIcon = require('showdown-icon')
const showdownCustomClass = require('showdown-custom-class')
const footnotes = require('showdown-footnotes')
const converter = new showdown.Converter({
    extensions: [footnotes, showdownCustomClass, 'icon'],
    tables: true
})
const librsync = require('rsync');

var page = {
    reset: function (callback) {
        rimraf(options.siteFolder, {}, (error) => {
            if (error) console.log(error)
            if (callback) callback()
        })
    },
    syncPublic: function () {
        fs.exists(options.publicFolder, (exists) => {
            if (exists) {
                var rsync = new librsync()
                    .shell('ssh')
                    .flags('az')
                    .source(options.publicFolder + '/*')
                    .destination(options.siteFolder);

                // Execute the command
                rsync.execute(function (error, code, cmd) {
                    console.log('Syncing _site with public.')
                    // if (error) console.log(error)
                    // console.log(code)
                    // console.log(cmd)
                })
            }
        })
    },
    prepare: function (callback) {
        fs.exists(options.siteFolder, (exists) => {
            if (exists) {
                callback(null)
                page.syncPublic()
                return console.log('Project folder exists.')
            } else {
                fs.mkdirp(options.siteFolder, (err) => {
                    if (err) return console.log(err)
                    page.syncPublic()
                    callback()
                    return console.log('Project folder created.')
                })
            }
        })
    },
    // Function to parse a page. Returns: (pageOptions, pageMarkdown)
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
        // Function to inject options, parsed as YAML, into the page.
        fs.readFile(pageRoute, (error, data) => {
            if (error) console.log(error)

            var read = data.toString()

            page.parse(pageRoute, (oldOptions, markdown) => {
                var combinedOptions = { ...oldOptions, ...newOptions }
                var optionToYAML = '---\n' + yaml.stringify(options) + '---'

                fs.writeFile(pageRoute, optionToYAML + markdown)
                    .then(() => console.log())
                    .catch((erroror) => {
                        console.log(erroror)
                    })
            })
        })
    },
    compile: function (pageRoute, addOptions, callback) {
        // Function to compile the page into it's .html equivalent.
        options.get(addOptions, (options) => {
            var fileSplit = pageRoute.split('/')
            var fileName = pageRoute.split('/').pop().replace('md', 'html')
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

            fs.mkdirp(destinationFolder, (erroror) => {
                if (erroror) console.log(erroror)
                page.parse(pageRoute, (pageOptions, pageMarkdown) => {
                    if (options.minify) {
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

                    if (options.dev) {
                        fs.writeFile(destinationFile, html + '<script src="/reload/reload.js"></script>')
                            .then(() => {
                            })
                            .catch((erroror) => {
                                console.log(erroror)
                            })
                    } else {
                        fs.writeFile(destinationFile, html)
                            .then(() => {
                                // console.log(`${file.white} >> ${destinationFile.blue}`.brightYellow)
                            })
                            .catch((erroror) => {
                                console.log(erroror)
                            })
                    }

                    if (callback) callback()
                })
            })
        })
    },
    createDirectoryRoute: function (route, callback) {
        var links = ['# Routes']

        options.get(null, (options) => {
            page.all((page) => {
                links.push(`- [${page.url}](${page.url})`)
            }, () => {
                if (options.minify) {
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

                fs.writeFile(options.siteFolder + route, html)
                    .then(() => {
                        if (callback) callback(null)
                    })
                    .catch((erroror) => {
                        if (callback) callback(`An erroror occurred while writing ${route}.`.red)
                        if (callback) callback(erroror)
                    })
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

        if (!options.showExtensions && fileName != 'index.html') {
            var destinationFolder = options.siteFolder + filePath() + fileName.split('.')[0]
            var destinationFile = destinationFolder + '/index.html'
        } else {
            var destinationFolder = options.siteFolder + filePath()
            var destinationFile = destinationFolder + fileName
        }

        var url = destinationFolder.replace(options.siteFolder, '')

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
        recursive(options.pagesFolder, function (error, files) {
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