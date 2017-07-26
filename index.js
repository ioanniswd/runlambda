#!/usr/bin/env node

var exec = require('child_process').exec;
var fs = require('fs');

var invokeFolder = process.cwd();

var command;

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

if (invokeFolder.indexOf('lambdafns') == -1) {
  console.log('You are in the wrong folder, path must be under lambdafns');
} else {
  command = 'aws lambda invoke --function-name ${PWD##*/} outfile';
  // if we have payload
  if(process.argv[2]) {
    fs.readFile(process.argv[2], function(err, data) {
      if(err) {
        throw err;
      } else {
        console.log('data');
        var payloadFile = JSON.parse(data.toString('utf-8'));
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
