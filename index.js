'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
var process = require('suman-browser-polyfills/modules/process');
var global = require('suman-browser-polyfills/modules/global');
var path = require("path");
var cp = require("child_process");
var poolio_1 = require("poolio");
var chalk = require("chalk");
var fs = require("fs");
var Vorpal = require("vorpal");
var _ = require("lodash");
var _suman = global.__suman = (global.__suman || {});
var logging_1 = require("./lib/logging");
var find_prompt_1 = require("./lib/find-prompt");
var sumanGlobalModulesPath = path.resolve(process.env.HOME + '/.suman/global');
try {
    require.resolve('inquirer');
}
catch (err) {
    logging_1.log.warning('loading suman-shell...please wait.');
    try {
        cp.execSync("cd " + sumanGlobalModulesPath + " && npm install inquirer");
    }
    catch (err) {
        logging_1.log.error('suman-shell could not be loaded; suman-shell cannot load the "inquirer" dependency.');
        logging_1.log.error(err.stack || err);
        process.exit(1);
    }
}
try {
    require('inquirer');
}
catch (err) {
    logging_1.log.warning('you may be missing necessary dependences for the suman-shell CLI.');
    logging_1.log.warning(err.message);
}
var getSharedWritableStream = function () {
    return fs.createWriteStream(path.resolve(__dirname + '/test.log'));
};
var filePath = path.resolve(__dirname + '/lib/worker.js');
var defaultPoolioOptions = {
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
    logging_1.log.newLine();
    var cwd = process.cwd();
    var shortCWD = String(cwd).split('/').slice(-3).join('/');
    if (shortCWD.length + 1 < String(cwd).length) {
        shortCWD = ' /.../' + shortCWD;
    }
    shortCWD = chalk.gray(shortCWD);
    var p = new poolio_1.Pool(Object.assign({}, defaultPoolioOptions, opts, {
        filePath: filePath,
        env: Object.assign({}, process.env, {
            SUMAN_LIBRARY_ROOT_PATH: sumanLibRoot,
            SUMAN_PROJECT_ROOT: projectRoot,
            FORCE_COLOR: 1
        })
    }));
    var findPrompt = find_prompt_1.makeFindPrompt(p, projectRoot);
    process.once('exit', function () {
        p.killAllActiveWorkers();
    });
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
        var testFilePath = path.isAbsolute(args.file) ? args.file : path.resolve(process.cwd() + ("/" + args.file));
        try {
            fs.statSync(testFilePath);
        }
        catch (err) {
            return cb(err.message);
        }
        var begin = Date.now();
        p.anyCB({ testFilePath: testFilePath }, function (err, result) {
            logging_1.log.veryGood('total time millis => ', Date.now() - begin, '\n');
            cb(null);
        });
    });
    vorpal.command('find')
        .description('find test files to run')
        .option('--opts <sumanOpts>', 'Search for test scripts in subdirectories.')
        .cancel(function () {
        logging_1.log.warning('find command was canceled.');
    })
        .action(function (args, cb) {
        logging_1.log.info('args => ', args);
        var dir;
        if (args && typeof args.folder === 'string') {
            dir = path.isAbsolute(args.folder) ? args.folder : path.resolve(projectRoot + '/' + args.folder);
        }
        else {
            dir = path.resolve(projectRoot + '/test');
        }
        var sumanOptions = _.flattenDeep([args.opts || []]);
        logging_1.log.info('suman options => ', sumanOptions);
        sumanOptions = sumanOptions.join(' ');
        findPrompt(this, dir, sumanOptions, function (err) {
            err && logging_1.log.error(err);
            cb(null);
        });
    });
    vorpal
        .delimiter(shortCWD + chalk.magenta(' // suman>'))
        .show();
    var to = setTimeout(function () {
        logging_1.log.error('No stdin was received after 25 seconds...closing...');
        p.killAllImmediately();
        setTimeout(function () {
            process.exit(1);
        }, 2000);
    }, 25000);
    process.stdin
        .setEncoding('utf8')
        .resume()
        .on('data', function customOnData(data) {
        clearTimeout(to);
    });
    return function cleanUpSumanShell() {
    };
};
