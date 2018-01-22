"use strict";

const zlib = require('zlib');

module.exports = function(Payload) {
  var body;
  // console.log('Payload:', Payload);
  // if request is made through API GW

  return new Promise(function(resolve, reject) {
    if (Payload && Payload.isBase64Encoded) {
      body = Buffer.from(Payload.body, 'base64');
      if (Payload.headers['Content-Encoding'] == 'gzip') {
        zlib.gunzip(body, function(err, data) {
          if (err) reject(err);
          else resolve(JSON.parse(data.toString('utf-8')));
        });

      } else resolve(JSON.parse(body.toString('utf-8')));
    } else resolve(Payload);
  });
};
