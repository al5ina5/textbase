var options = require('../options')
const fs = require('fs-extra')
const minify = require('html-minifier').minify
const colors = require('colors')
const beautify = require('js-beautify').html
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

var page = {
    // Function to parse a page. Returns: (pageOptions, pageMarkdown)
    parse: function (pageRoute, callback) {
        fs.readFile(pageRoute, (err, data) => {
            if (err) console.log(err)

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
        fs.readFile(pageRoute, (err, data) => {
            if (err) console.log(err)

            var read = data.toString()

            page.parse(pageRoute, (oldOptions, markdown) => {
                var combinedOptions = { ...oldOptions, ...newOptions }
                var optionToYAML = '---\n' + yaml.stringify(options) + '---'

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

        fs.mkdirp(destinationFolder, (error) => {
            if (error) console.log(error)
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
        recursive(options.pagesFolder, function (err, files) {
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