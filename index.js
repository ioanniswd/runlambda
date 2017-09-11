#!/usr/bin/env node

"use strict";

const exec = require('child_process').exec;
const fs = require('fs');
const colors = require('colors');
const minimist = require('minimist');

const getBranches = require('./getBranches');

var invokeFolder = process.cwd();

var command;

var args = minimist(process.argv.slice(2));

function execute(command) {
  exec(command, function(err, stdout, stderr) {
    if (err) {
      console.log(err);
    } else if (stderr) {
      console.log('stderr', stderr);
    } else {
      console.log('stdout:', stdout);
    }
  });
}

fs.readFile('package.json', 'utf-8', function(err, data) {
  if (err) {
    throw (err);
  } else {
    data = JSON.parse(data.toString('utf-8'));
    let functionName = data.name;

    command = `aws lambda invoke --function-name ${functionName} outfile`;

    if (data.lambdaAlias) {
      getBranches(function(err, currentBranch, otherBranches) {
        if (err) {
          throw err;

        } else {
          if (currentBranch == data.lambdaAlias) {
            console.log(colors.blue('Running lambda alias:', data.lambdaAlias));
            command += ` --qualifier ${data.lambdaAlias}`;

          } else {
            console.log(colors.blue('Running lambda $LATEST, lambdaAlias is not the same as branch name'));
          }
        }
      });
    } else {
      console.log(colors.blue('Running lambda $LATEST, no lambdaAlias found in package.json'));
    }
    // if we have payload
    if (process.argv[2]) {
      fs.readFile(process.argv[2], function(err, data) {
        if (err) {
          throw err;
        } else {
          console.log('data');
          var payloadFile = JSON.parse(data.toString('utf-8'));

          if (args.name) {
            payloadFile = payloadFile[args.name];
          }

          if(data.lambdaAlias) {
            payloadFile.requestContext = {
              stage: data.lambdaAlias
            };
          }
          
          payloadFile = JSON.stringify(payloadFile);
          payloadFile = payloadFile.replace(/"/g, '\\"');
          command += ' --payload "' + payloadFile + '"';
          console.log('command: ', command);

          execute(command);
        }
      });
    } else {
      execute(command);
    }
  }
});
