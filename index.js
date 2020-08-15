#!/usr/bin/env node

const fs = require('fs-extra')
const { program } = require('commander')
const lib = require('./lib/lib')

program.parse(process.argv)
console.log('')

var options = {
    publicFolder: './public',
    pagesFolder: './pages',
    siteFolder: './_site',
    templateFolder: __dirname + '/templates/textbase',
    minify: false,
    dev: false,
    port: 0,
    showExtensions: false,
}

var optionsFile = process.cwd() + '/_textbase.js'
fs.exists(optionsFile, (exists) => {
    if (exists) options = { ...options, ...require(optionsFile) }

    global.options = options

    switch (program.args[0]) {
        case 'eject':
            lib.eject()
            break
        case 'build':
            lib.build()
            break
        case 'start':
            lib.start()
            break
        default:
            global.options = { ...global.options, ...{ dev: true } }
            lib.dev()
            break
    }
})