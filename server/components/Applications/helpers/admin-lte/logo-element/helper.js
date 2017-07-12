/**
 * @file      server/components/Applications/helpers/admin-lte/logo-element/helper.js
 * @author    Vish Desai <vishwakarma_d@hotmail.com>
 * @version   1.8.3
 * @copyright Copyright&copy; 2014 - 2017 {@link https://twyr.github.io|Twy'r Project}
 * @license   {@link https://spdx.org/licenses/MITNFA.html|MITNFA}
 * @summary   The Twy'r Web Application Application Component Logo Helper
 *
 */

'use strict';

/**
 * Module dependencies, required for ALL Twy'r modules
 * @ignore
 */

/**
 * Module dependencies, required for this module
 * @ignore
 */
exports.helper = {
	'method': function(inputElement, user, callback) {
		this._dummyAsync()
		.then(() => {
			inputElement.replaceWith(
`{{#link-to "application" class="logo"}}
	<span class="logo-lg">
		<img src="/Applications/logo.png" style="max-width:100%; max-height:40px;" />
	</span>
{{/link-to}}
`);
			if(callback) callback(null);
		})
		.catch((err) => {
			if(callback) callback(err);
		});
	}
};
