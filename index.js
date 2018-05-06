#!/usr/bin/env node

"use strict";

const AWS = require('aws-sdk');
AWS.config.update({
  region: 'eu-west-1'
});
const lambda = new AWS.Lambda();

const fs = require('fs');
const colors = require('colors');
const minimist = require('minimist');

const getBranches = require('./getBranches');
const get_body = require('./get_body');

var invokeFolder = process.cwd();

var alias;
var params = {};

var args = minimist(process.argv.slice(2), {
  boolean: ['published', 'verbose']
});

function read(name, format) {
  return new Promise(function(resolve, reject) {
    fs.readFile(name, format, (err, data) => err ? reject(err) : resolve(JSON.parse(data.toString('utf-8'))));
  });
}

function write(path, contents) {
  return new Promise(function(resolve, reject) {
    fs.writeFile(path, contents, 'utf-8', (err) => err ? reject(err) : resolve());
  });
}

read('package.json', 'utf-8')
  // get branches
  .then(data => {
    params.FunctionName = data.name;

    alias = data.lambdaAlias;
    return getBranches();
  })
  // read get payload
  .then(body => {
    if (alias) {
      if (body.currentBranch == alias && args.published) {
        console.log(colors.blue('Running lambda alias:', alias));
        params.Qualifier = alias;

      } else console.log(colors.blue('Running lambda $LATEST'));
    } else console.log(colors.blue('Running lambda $LATEST, no lambdaAlias found in package.json'));

    // if we have payload
    if (args.payload) {
      return read(args.payload, 'utf-8')
        .then(payloadFile => {
          if (args.name) payloadFile = payloadFile[args.name];

          if (args.published) {
            if (alias) {
              payloadFile.requestContext = {
                stage: alias
              };
            } else return Promise.reject('Lambda alias does not exist, cannot run published version');

          } else {
            payloadFile.requestContext = {
              stage: args.simver || 'dev'
            };

            console.log('\n' + colors.blue(`Simulating version:${payloadFile.requestContext.stage}`));
          }

          params.Payload = JSON.stringify(payloadFile);
          return Promise.resolve();
        });

    } else return Promise.resolve();
  })
  // invoke lambda
  .then(() => lambda.invoke(params).promise())
  // write to outfile, log
  .then(res => {
    // console.log('res:', res);
    console.log('StatusCode:', res.StatusCode);

    var Payload;
    try {
      Payload = JSON.parse(res.Payload);
    } catch (e) {
      Payload = res.Payload;
    } finally {
      if ((Payload.isBase64Encoded || Payload['Content-Encoding'] === 'gzip') && Payload.body) return get_body(Payload);
      else return Payload;
    }
  })
  .then(Payload => {
    if (args.verbose) console.log('Response:', Payload);
    return write('outfile.json', JSON.stringify(Payload, null, 2));
  })
  .then(() => {
    console.log(colors.green('Success'));
    process.exit();
  })
  .catch(err => {
    console.log(colors.red(err));
    process.exit(1);
  });
