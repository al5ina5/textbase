
const page = require('./page')
var options = require('../options')
var server = require('./server')
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

// `textbase dev`
exports.dev = () => {
    this.build({ dev: true })

    options.get({ dev: true }, (options) => {
        server.start(options)
    })
}

exports.start = () => {
    this.build()

    options.get({}, (options) => {
        server.start(options)
    })
}

exports.build = (options) => {
    page.reset(() => {
        page.prepare(() => {
            page.all((pageData) => {
                page.compile(pageData.pageRoute, options, () => {
                    console.log(pageData.pageRoute, 'compiled.')
                })
            })
        })
    })
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
        .catch(error => {
            console.log(error)
        })
}