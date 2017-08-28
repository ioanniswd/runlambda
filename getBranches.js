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
 * @return {object}          currentBranch and otherBranches
 */
module.exports = function(callback) {
  exec('git branch', function(err, stdout, stderr) {
    if (err) {
      callback(err);
    } else if (stderr) {
      callback(stderr);
    } else {
      let currentBranch;
      let otherBranches = [];
      let arr = stdout.split('\n');
      arr.forEach(function(branchName) {
        if (branchName.indexOf('*') != -1) {
          currentBranch = branchName.replace(/\*\s/g, '');
        } else {
          otherBranches.push(branchName.replace(/\s/g, ''));
        }
      });

      otherBranches = otherBranches.filter(function(item) {
        return item && item.length > 0;
      });

      callback(null, currentBranch, otherBranches);
    }
  });
};
