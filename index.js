#!/usr/bin/env node

"use strict";

const exec = require('child_process').exec;
const fs = require('fs');
const colors = require('colors');
const minimist = require('minimist');

const getBranches = require('./getBranches');

var invokeFolder = process.cwd();

var command;
var alias;

var args = minimist(process.argv.slice(2), {
  boolean: ['published']
});

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

    alias = data.lambdaAlias;

    getBranches(function(err, currentBranch, otherBranches) {
      if (err) {
        throw err;

      } else {
        if (alias) {
          if (currentBranch == alias && args.published) {
            console.log(colors.blue('Running lambda alias:', alias));
            command += ` --qualifier ${alias}`;

          } else {
            console.log(colors.blue('Running lambda $LATEST'));
          }
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

              if (args.published) {
                if (alias) {
                  payloadFile.requestContext = {
                    stage: alias
                  };
                } else {
                  throw new Error('Lambda alias does not exist, cannot run published version');
                }
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
  }
});
