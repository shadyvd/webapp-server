/**
 * @file       config/development/index.js
 * @author     Vish Desai <vishwakarma_d@hotmail.com>
 * @version    1.8.3
 * @copyright  Copyright&copy; 2014 - 2017 {@link https://twyr.github.io|Twy'r Project}
 * @license    {@link https://spdx.org/licenses/MITNFA.html|MITNFA}.
 * @summary    The Twy'r Web Application cluster-level configuration parameters
 *
 */

'use strict';

exports.config = {
	'loadFactor': 0.25,
	'restart': false,

	'repl': {
		'prompt': ''
	},

	'main': './server/TwyrWebApp',
	'application': 'TwyrWebApp',
	'title': 'Twyr Web Application'
};
