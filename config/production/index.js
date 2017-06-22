/**
 * @file       config/production/index.js
 * @author     Vish Desai <vishwakarma_d@hotmail.com>
 * @version    1.8.3
 * @copyright  Copyright&copy; 2014 - 2017 {@link https://twyr.github.io|Twy'r Project}
 * @license    {@link https://spdx.org/licenses/MITNFA.html|MITNFA}.
 * @desc       The Twy'r Web Application cluster-level configuration parameters
 *
 */

'use strict';

exports.config = {
	'loadFactor': 1.0,
	'restart': false,

	'repl': {
		'controlPort': 1237,
		'controlHost': '127.0.0.1',
		'parameters': {
			'prompt': 'Twy\'r Web Application >',
			'terminal': true,
			'useGlobal': false,

			'input': null,
			'output': null
		}
	},

	'main': './server/TwyrWebApp',
	'application': 'TwyrWebApp',
	'title': 'Twyr Web Application'
};
