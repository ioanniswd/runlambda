"use strict";

const exec = require('child_process').exec;

/**
 * Return info for branches
 * @module
 */
/**
 * Returns the current branch, which is used as the name/alias and the rest
 * of the branches just in case.
 *
 * @param  {function} callback
 * @return {Promise}          Resolves to currentBranch and otherBranches
 */
module.exports = function() {
  return new Promise(function(resolve, reject) {
    exec('git branch', function(err, stdout, stderr) {
      if (err) reject(err);
      else if (stderr) reject(stderr);
      else {
        let currentBranch;
        let otherBranches = [];
        let arr = stdout.split('\n');
        arr.forEach(function(branchName) {
          if (branchName.indexOf('*') != -1) currentBranch = branchName.replace(/\*\s/g, '');
          else otherBranches.push(branchName.replace(/\s/g, ''));
        });

        otherBranches = otherBranches.filter(function(item) {
          return item && item.length > 0;
        });

        resolve({
          currentBranch: currentBranch,
          otherBranches: otherBranches
        });
      }
    });
  });
};
