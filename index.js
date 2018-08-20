#!/usr/bin/env node

"use strict";

const AWS = require('aws-sdk');
AWS.config.update({
  region: 'eu-west-1'
});

const fs = require('fs');
const colors = require('colors');
const minimist = require('minimist');
const homedir = require('os').homedir();
const _ = require('lodash');

const getBranches = require('./getBranches');
const get_body = require('./get_body');

let alias;
const params = {};

const args = minimist(process.argv.slice(2), {
  boolean: ['published', 'verbose']
});


/**
 * read - Promisified read
 *
 * @param  {string} name   Path to file
 * @param  {string} format
 * @return {Promise}        resolves to the contents of the file(json parsed)
 */
function read(name, format) {
  return new Promise(function(resolve, reject) {
    fs.readFile(name, format, (err, data) => err ? reject(err) : resolve(JSON.parse(data.toString('utf-8'))));
  });
}

/**
 * write - Promisified write
 *
 * @param  {string} path   Path to file
 * @param  {string} contents Contents of file
 * @return {Promise}
 */
function write(path, contents) {
  return new Promise(function(resolve, reject) {
    fs.writeFile(path, contents, 'utf-8', (err) => err ? reject(err) : resolve());
  });
}

Promise.all([
    read('package.json', 'utf-8'),
    read(homedir + '/.uplambda.json', 'utf-8')
    .catch(err => {
      if (err.code != 'ENOENT') return Promise.reject(err);
      else return Promise.reject(`Config file ${homedir}/.uplambda.json was not found. Run "uplambda --account --add" to init`);
    })
  ])
  .then(res => {
    const [package_json, config] = res;

    // get credenetials
    let account;
    let aws_access_key_id;
    let aws_secret_access_key;

    const tmp_accounts = _.filter(config, {
      active: true
    });

    if (tmp_accounts.length === 0) return Promise.reject(`Invalid ${homedir}/.uplambda.json. At least one account must be active at a time. Run "uplambda --account --use <your_account_alias>" to choose which account to enable`);
    if (tmp_accounts.length !== 1) return Promise.reject(`Invalid ${homedir}/.uplambda.json. Only one account can be active at a time. Run "uplambda --account --use <your_account_alias>" to choose which account to enable`);
    else {
      account = tmp_accounts[0].account;
      aws_access_key_id = tmp_accounts[0].aws_access_key_id;
      aws_secret_access_key = tmp_accounts[0].aws_secret_access_key;
    }

    const lambda = new AWS.Lambda({
      accessKeyId: aws_access_key_id,
      secretAccessKey: aws_secret_access_key,
      region: account.match(/^(.+):/)[1]
    });

    params.FunctionName = package_json.name;

    alias = package_json.lambdaAlias;
    return getBranches()
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

        let Payload;
        try {
          Payload = JSON.parse(res.Payload);
        } catch (e) {
          Payload = res.Payload;
        }

        if ((Payload.isBase64Encoded || Payload['Content-Encoding'] === 'gzip') && Payload.body) return get_body(Payload);
        else return Payload;
      })
      .then(Payload => {
        if (args.verbose) console.log('Response:', Payload);
        return write('outfile.json', JSON.stringify(Payload, null, 2));
      })
      .then(() => {
        console.log(colors.green('Success'));
        process.exit();
      });
  })
  .catch(err => {
    console.log(colors.red(err));
    process.exit(1);
  });
