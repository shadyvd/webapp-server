/**
 * @file      server/utilities/rest-call/utility.js
 * @author    Vish Desai <vishwakarma_d@hotmail.com>
 * @version   1.8.3
 * @copyright Copyright&copy; 2014 - 2017 {@link https://twyr.github.io|Twy'r Project}
 * @license   {@link https://spdx.org/licenses/MITNFA.html|MITNFA}
 * @summary   The Twy'r Web Application Utility Method to invoke a RESTful API on another server
 *
 */


'use strict';

/**
 * Module dependencies, required for ALL Twy'r modules
 * @ignore
 */
// const promises = require('bluebird');

/**
 * Module dependencies, required for this module
 * @ignore
 */

exports.utility = {
	'name': 'restCall',
	'isAsync': true,
	'method': function(proto, options, callback) {
		const protocol = require(proto),
			statusCodes = require('http').STATUS_CODES;

		// See if the options are ok, otherwise add what we need
		if(options.method === 'POST') {
			if(!options.headers)
				options.headers = {};
			if(!options.headers['Content-Type'])
				options.headers['Content-Type'] = 'application/json';
			if(!options.headers['Content-Length'])
				options.headers['Content-Length'] = Buffer.byteLength(options.data);
		}

		// Here is the meat and potatoes for executing the request
		if((process.env.NODE_ENV || 'development') === 'development') console.log(`restCall::Executing Request: ${JSON.stringify(options, undefined, '\t')}`);
		const request = protocol.request(options, (response) => {
			let data = null;

			response.setEncoding('utf8');
			response.on('data', (chunk) => {
				if(!data)
					data = chunk;
				else
					data += chunk;
			});

			response.on('end', () => {
				let errorObj = null;

				if(response.statusCode !== '200') {
					errorObj = {
						'code': response.statusCode,
						'path': options.path,
						'message': statusCodes[response.statusCode]
					};
				}

				if(callback) callback(errorObj, data);
			});
		});

		request.on('error', (err) => {
			if(callback) callback(err);
		});

		// Now that the infrastructure is setup, write the data
		if(options.method === 'POST') request.write(options.data);

		// Tell node we are done, so it actually executes
		request.end();
	}
};
