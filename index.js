'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
var path = require("path");
var poolio_1 = require("poolio");
var chalk = require("chalk");
var fs = require("fs");
var Vorpal = require("vorpal");
var name = ' => [suman-d] =>';
var log = console.log.bind(console, name);
var logGood = console.log.bind(console, chalk.cyan(name));
var logVeryGood = console.log.bind(console, chalk.green(name));
var logWarning = console.error.bind(console, chalk.yellow.bold(name));
var logError = console.error.bind(console, chalk.red(name));
var getSharedWritableStream = function () {
    return fs.createWriteStream(path.resolve(__dirname + '/test.log'));
};
var filePath = path.resolve(__dirname + '/lib/worker.js');
var defaultOptions = {
    size: 3,
    getSharedWritableStream: getSharedWritableStream,
    addWorkerOnExit: true,
    streamStdioAfterDelegation: true,
    oneTimeOnly: true,
    inheritStdio: false,
    resolveWhenWorkerExits: true,
    stdout: process.stdout,
    stderr: process.stderr
};
exports.startSumanShell = function (projectRoot, sumanLibRoot, opts) {
    var cwd = process.cwd();
    var shortCWD = String(cwd).split('/').slice(-3).join('/');
    console.log('short cwd => ', shortCWD);
    var p = new poolio_1.Pool(Object.assign({}, defaultOptions, opts, {
        filePath: filePath,
        env: Object.assign({}, process.env, {
            SUMAN_LIBRARY_ROOT_PATH: sumanLibRoot,
            SUMAN_PROJECT_ROOT: projectRoot
        })
    }));
    var vorpal = new Vorpal();
    vorpal.command('run [file]')
        .description('run a single test script')
        .autocomplete({
        data: function (input, cb) {
            var basename = path.basename(input);
            var dir = path.dirname(path.resolve(process.cwd() + ("/" + input)));
            fs.readdir(dir, function (err, items) {
                if (err) {
                    return cb(null);
                }
                var matches = items.filter(function (item) {
                    return String(item).match(basename);
                });
                return cb(matches);
            });
        }
    })
        .action(function (args, cb) {
        var testFilePath = path.resolve(process.cwd() + ("/" + args.file));
        try {
            fs.statSync(testFilePath);
        }
        catch (err) {
            return cb(err.message);
        }
        var begin = Date.now();
        p.anyCB({ testFilePath: testFilePath }, function (err, result) {
            log('total time millis => ', Date.now() - begin);
            cb(null);
        });
    });
    vorpal
        .delimiter(shortCWD + chalk.magenta(' / suman>'))
        .show();
    var to = setTimeout(function () {
        process.stdin.end();
        console.log('No stdin was received after 25 seconds..closing...');
        p.killAllImmediately();
        process.exit(0);
    }, 25000);
    process.stdin
        .on('data', function customOnData(data) {
        clearTimeout(to);
        if (String(data) === 'q') {
            console.log('killing all active workers.');
            p.killAllActiveWorkers();
        }
    });
    return function cleanUpSumanD() {
    };
};
var $exports = module.exports;
exports.default = $exports;
