/**
 * @file      server/services/AuthService/strategies/serialize-user.js
 * @author    Vish Desai <vishwakarma_d@hotmail.com>
 * @version   1.8.3
 * @copyright Copyright&copy; 2014 - 2017 {@link https://twyr.github.io|Twy'r Project}
 * @license   {@link https://spdx.org/licenses/MITNFA.html|MITNFA}
 * @desc      The Twy'r Web Application User Session Serialization / Deserialization
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

exports.strategy = function() {
	const auth = this.Interface;

	auth.serializeUser((request, user, callback) => {
		this._dummyAsync()
		.then(() => {
			return this.$utilities.userSessionCacheAsync(request.tenant, user.id, request.device.type);
		})
		.then((deserializedUser) => {
			if(callback) callback(null, deserializedUser.id);
			return null;
		})
		.catch((err) => {
			if(callback) callback(err);
		});
	});

	auth.deserializeUser((request, userId, callback) => {
		this._dummyAsync()
		.then(() => {
			return this.$utilities.userSessionCacheAsync(request.tenant, userId, request.device.type);
		})
		.then((deserializedUser) => {
			if(callback) callback(null, deserializedUser);
			return null;
		})
		.catch((err) => {
			if(callback) callback(err);
		});
	});
};
