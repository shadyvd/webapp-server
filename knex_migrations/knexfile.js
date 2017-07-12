/**
 * @file       knex_migrations/knexfile.js
 * @author     Vish Desai <vishwakarma_d@hotmail.com>
 * @version    1.8.3
 * @copyright  Copyright&copy; 2014 - 2017 {@link https://twyr.github.io|Twy'r Project}
 * @license    {@link https://spdx.org/licenses/MITNFA.html|MITNFA}.
 * @summary    The Twy'r Web Application database migration configuration
 *
 */

'use strict';

module.exports = {
	'development': {
		'client': 'pg',
		'debug': true,

		'connection': {
			'database': 'twyr',
			'user': 'twyr',
			'password': 'twyr'
		},

		'migrations': {
			'tableName': 'knex_migrations'
		}
	}
};
