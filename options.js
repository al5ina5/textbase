const fs = require('fs')

var options = {
    publicFolder: './public',
    pagesFolder: './pages',
    siteFolder: './_site',
    templateFolder: __dirname + '/templates/textbase',
    minify: false,
    erase: true,
    dev: false,
    showExtensions: false,
}

module.exports = {
    ...options,
    get: function (addOptions, callback) {
        fs.exists(process.cwd() + '/_textbase.js', (_textbaseExists) => {
            if (_textbaseExists) {
                var importedConfig = require(process.cwd() + '/_textbase.js')
                options = { ...options, ...importedConfig }
            }

            options = { ...options, ...addOptions }
            callback(options)
        })
    }
}