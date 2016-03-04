#!/usr/bin/env node
'use strict';
var DockerIO = require("dockerode")


var fs = require('fs'),
    util = require('util'),
    path = require('path'),
    commandline = require('commander'),
    logger = require("../lib/logger"),
    config = require('../config/config'),
    DockeFileValidator = require('../');



function printEntry(entry, level) {
    var ref_url = getRefUrl(entry.reference_url);
    var line = entry.line ? ("Line " + entry.line + ":") : "Line 0:";
    if (entry.lineContent) {
        console.log(line + " -> " + entry.lineContent);
    }
    var message = entry.message ? entry.message : " ";
    var description = entry.description ? (". " + entry.description + ". ") : ". ";
    console.log(level + ": " + message + description +
        "\nReference -> " + ref_url);
    console.log("\n");

}


function printResults(results) {
    var errors = results.error;
    var warn = results.warn;
    var info = results.info;
    if (errors && errors.data && errors.data.length > 0) {
        console.log("\n--------ERRORS---------\n");
        errors.data.forEach(function (entry) {
            printEntry(entry, "ERROR");
        });
    }
    if (warn && warn.data && warn.data.length > 0) {
        console.log("\n-------WARNINGS--------\n");
        warn.data.forEach(function (entry) {
            printEntry(entry, "WARNING");
        });
    }
    if (info && info.data && info.data.length > 0) {
        console.log("\n--------INFO---------\n");
        info.data.forEach(function (entry) {
            printEntry(entry, "INFO");
        });
    }

    if ((errors.count + warn.count + info.count) === 0) {
        console.log("Check passed!");
    }

}

function printJsonResults(results) {
    var json = JSON.stringify(results, undefined, 2);
    console.log(json);
}


var dockerfileLocation = null;
var rulefileLocation = null;
var dockerfile = null;
var rulefile = null;
var printJson = false;
var remoteFile = false;

commandline.


commandline.option('-j, --json', 'Show results in JSON format')
    .option('-r, --rulefile [rulefile] (optional)', 'Rule file', rulefile)
    .option('-f, --dockerfile [dockerfile] (required)', 'File to lint. Accepts a local file or an http(s) URL', dockerfile)
    .option('-v, --verbose', 'Show debugging logs')
    .parse(process.argv);

if (commandline.verbose) {
    if (logger.transports.console) logger.transports.console.level = 'debug';
    if (logger.transports.file) logger.transports.file.level = 'debug';
}

if (commandline.json) {
    printJson = true;
}

if (!commandline.dockerfile) {
    commandline.help();
}

dockerfileLocation = commandline.dockerfile;
if (commandline.rulefile) {
    rulefileLocation = commandline.rulefile;
}

try {
    dockerfile = fs.readFileSync(dockerfileLocation, 'UTF-8');
} catch (e) {
    if (/^http[s]?:\/\//.test(dockerfileLocation)) {
        remoteFile = true;
    } else {
        console.error('ERROR: Dockerfile not found -> ' + dockerfileLocation);
        process.exit(1);
    }
}
if (rulefileLocation !== null) {
    if (!fs.existsSync(rulefileLocation)) {
        console.error('ERROR: Rule file not found -> ' + rulefileLocation);
        process.exit(1);
    }
}

function runValidation(dockerfile, rulefileLocation) {
    var validator = new DockeFileValidator(rulefileLocation);
    var results = validator.validate(dockerfile);
    if (printJson) {
        printJsonResults(results);
    } else {
        printResults(results);
    }

    if (results.error.count > 0) {
        process.exit(1);
    } else {
        process.exit(0);
    }
}

if (remoteFile) {
    downloadDockerfile(dockerfileLocation, function (dockerfile) {
        runValidation(dockerfile, rulefileLocation);
    });
} else {
    runValidation(dockerfile, rulefileLocation);
}

