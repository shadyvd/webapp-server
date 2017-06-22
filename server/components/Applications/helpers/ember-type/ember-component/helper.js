/**
 * @file      server/components/Applications/helpers/ember-type/ember-component/helper.js
 * @author    Vish Desai <vishwakarma_d@hotmail.com>
 * @version   1.8.3
 * @copyright Copyright&copy; 2014 - 2017 {@link https://twyr.github.io|Twy'r Project}
 * @license   {@link https://spdx.org/licenses/MITNFA.html|MITNFA}
 * @desc      The Twy'r Web Application Application Component Ember Component Helper
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
const _ = require('lodash');

exports.helper = {
	'method': function(inputElement, user, callback) {
		this._dummyAsync()
		.then(() => {
			const emberComponent = inputElement.data('ember-component'),
				serverComponent = inputElement.data('server-component');

			const allowedEmberComponents = _.map(user.modules[serverComponent], 'ember_component');
			if(allowedEmberComponents.indexOf(emberComponent) < 0)
				inputElement.remove();
			else {
				const inputParameterString = inputElement.data('ember-parameters').replace(/'/g, '"');
				let componentParameters = '';

				if(inputParameterString) {
					const inputParameters = JSON.parse(inputParameterString);
					Object.keys(inputParameters).forEach((inputParameter) => {
						if(inputParameters[inputParameter].type === 'string')
							componentParameters += `${inputParameter}="${inputParameters[inputParameter].value}" `;
						else
							componentParameters += `${inputParameter}=${inputParameters[inputParameter].value} `;
					});

					inputElement.replaceWith(`{{component "${emberComponent}" layout="${inputElement.data('ember-template')}" ${componentParameters.trim()}}}`);
				}
				else
					inputElement.remove();
			}

			if(callback) callback(null);
		})
		.catch((err) => {
			if(callback) callback(err);
		});
	}
};
