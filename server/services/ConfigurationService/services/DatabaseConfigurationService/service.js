/**
 * @file      server/services/ConfigurationService/services/DatabaseConfigurationService/service.js
 * @author    Vish Desai <vishwakarma_d@hotmail.com>
 * @version   1.8.3
 * @copyright Copyright&copy; 2014 - 2017 {@link https://twyr.github.io|Twy'r Project}
 * @license   {@link https://spdx.org/licenses/MITNFA.html|MITNFA}
 * @summary   The Twy'r Web Application Database-based Configuration Service
 *
 */

'use strict';

/**
 * Module dependencies, required for ALL Twy'r modules
 * @ignore
 */
const promises = require('bluebird');

/**
 * Module dependencies, required for this module
 * @ignore
 */
const TwyrBaseService = require('./../../../TwyrBaseService').TwyrBaseService;

class DatabaseConfigurationService extends TwyrBaseService {
	constructor(module) {
		super(module);
	}

	start(dependencies, callback) {
		if(!this.$module.$config.subservices) {
			if(callback) callback(null, false);
			return;
		}

		if(!this.$module.$config.subservices[this.name]) {
			if(callback) callback(null, false);
			return;
		}

		const path = require('path');
		const knex = require('knex');

		const rootPath = path.dirname(require.main.filename);

		this.$config = this.$module.$config.subservices[this.name];
		this.$config.migrations.directory = path.isAbsolute(this.$config.migrations.directory) ? this.$config.migrations.directory : path.join(rootPath, this.$config.migrations.directory);
		this.$config.seeds.directory = path.isAbsolute(this.$config.seeds.directory) ? this.$config.seeds.directory : path.join(rootPath, this.$config.seeds.directory);

		const knexInstance = knex(this.$config);
		knexInstance.on('query', this._databaseQuery.bind(this));
		knexInstance.on('query-error', this._databaseQueryError.bind(this));

		this._dummyAsync()
		.then(() => {
			return knexInstance.migrate.latest();
		})
		.then(() => {
			return knexInstance.seed.run();
		})
		.catch((err) => {
			if((process.env.NODE_ENV || 'development') === 'development') console.error(`${this.name}::migration Error: ${err.stack}`);
		})
		.then(() => {
			return knexInstance.destroy();
		})
		.then(() => {
			const pg = require('pg');
			this.$database = promises.promisifyAll(new pg.Client(this.$config.connection));
			return this.$database.connectAsync();
		})
		.then(() => {
			this.$database.on('notice', this._databaseNotice.bind(this));
			this.$database.on('notification', this._databaseNotification.bind(this));

			return promises.all([this.$database.queryAsync('LISTEN "twyr-config-change"'), this.$database.queryAsync('LISTEN "twyr-state-change"')]);
		})
		.then(() => {
			return this._reloadAllConfigAsync();
		})
		.then(() => {
			super.start(dependencies, callback);
			return null;
		})
		.catch((err) => {
			if((process.env.NODE_ENV || 'development') === 'development') console.error(`${this.name}::start Error: ${err.stack}`);
			if(callback) callback(err);
		});
	}

	stop(callback) {
		// Stop sub-services, if any...
		super.stop((err, status) => {
			if(err) {
				if(callback) callback(err);
				return;
			}

			promises.all([this.$database.queryAsync('UNLISTEN "twyr-webapp-config-change"'), this.$database.queryAsync('UNLISTEN "twyr-webapp-state-change"')])
			.then(() => {
				this.$database.end();
				delete this.$database;

				if(callback) callback(null, status);
				return null;
			})
			.catch((unlistenErr) => {
				if((process.env.NODE_ENV || 'development') === 'development') console.error(`${this.name}::stop Error: ${unlistenErr.stack}`);
				if(callback) callback(unlistenErr);
			});
		});
	}

	loadConfig(module, callback) {
		if(!this.$database) {
			if(callback) callback(null, {});
			return;
		}

		const cachedModule = this._getCachedModule(module);
		if(cachedModule) {
			module.displayName = cachedModule.displayName;
			if(callback) callback(null, cachedModule.configuration);
			return;
		}

		if(callback) callback(null, {});
	}

	saveConfig(module, config, callback) {
		if(!this.$database) {
			if(callback) callback(null, {});
			return;
		}

		const cachedModule = this._getCachedModule(module);
		if(!cachedModule) {
			if(callback) callback(null, {});
			return;
		}

		const deepEqual = require('deep-equal');
		if(deepEqual(cachedModule.configuration, config)) {
			if(callback) callback(null, cachedModule.configuration);
			return;
		}

		cachedModule.configuration = config;
		this.$database.queryAsync('UPDATE modules SET configuration = $1 WHERE id = $2;', [config, cachedModule.id])
		.then(() => {
			if(callback) callback(null, cachedModule.configuration);
			return null;
		})
		.catch((err) => {
			if((process.env.NODE_ENV || 'development') === 'development') console.error(`Error saving configuration for ${module.name}: ${err.stack}`);
			if(callback) callback(err);
		});
	}

	getModuleState(module, callback) {
		const cachedModule = this._getCachedModule(module);

		if(!cachedModule) {
			if(callback) callback(null, true);
			return;
		}

		if(callback) callback(null, cachedModule.enabled);
	}

	setModuleState(module, enabled, callback) {
		const cachedModule = this._getCachedModule(module);

		if(!cachedModule) {
			if(callback) callback(null, true);
			return;
		}

		if(cachedModule.enabled === enabled) {
			if(callback) callback(null, enabled);
			return;
		}

		cachedModule.enabled = enabled;
		this.$database.queryAsync('UPDATE modules SET enabled = $1 WHERE id = $2', [enabled, cachedModule.id])
		.then(() => {
			if(callback) callback(null, enabled);
			return null;
		})
		.catch((err) => {
			if(callback) callback(err);
		});
	}

	getModuleId(module, callback) {
		const cachedModule = this._getCachedModule(module);

		if(!cachedModule) {
			if(callback) callback(null, null);
			return;
		}

		if(callback) callback(null, cachedModule.id);
	}

	_processConfigChange(configUpdateModule, config) {
		let currentModule = this;
		while(currentModule.$module) currentModule = currentModule.$module;

		const deepEqual = require('deep-equal'),
			path = require('path');

		const pathSegments = path.join(currentModule.$application, configUpdateModule).split(path.sep);

		// Iterate down the cached config objects
		let cachedModule = this.$cachedConfigTree[pathSegments.shift()];
		pathSegments.forEach((segment) => {
			if(!cachedModule) return;
			cachedModule = cachedModule[segment];
		});

		if(!cachedModule)
			return;

		if(deepEqual(cachedModule.configuration, config))
			return;

		cachedModule.configuration = config;
		this.$database.queryAsync('UPDATE modules SET configuration = $1 WHERE id = $2;', [config, cachedModule.id])
		.catch((err) => {
			if((process.env.NODE_ENV || 'development') === 'development') console.error(`Error saving configuration for ${cachedModule.name}: ${err.stack}`);
		});
	}

	_processStateChange(configUpdateModule, state) {
		let currentModule = this;
		while(currentModule.$module) currentModule = currentModule.$module;

		const path = require('path');
		const pathSegments = path.join(currentModule.application, configUpdateModule).split(path.sep);

		// Iterate down the cached config objects
		let cachedModule = this.$cachedConfigTree[pathSegments.shift()];
		pathSegments.forEach((segment) => {
			if(!cachedModule) return;
			cachedModule = cachedModule[segment];
		});

		if(!cachedModule)
			return;

		if(cachedModule.enabled === state)
			return;

		cachedModule.enabled = state;
		this.$database.queryAsync('UPDATE modules SET enabled = $1 WHERE id = $2;', [state, cachedModule.id])
		.catch((err) => {
			if((process.env.NODE_ENV || 'development') === 'development') console.error(`Error saving state for ${cachedModule.name}:\n${err.stack}`);
		});
	}

	_reloadAllConfig(callback) {
		this.$database.queryAsync('SELECT unnest(enum_range(NULL::module_type)) AS type')
		.then((result) => {
			const _ = require('lodash'),
				inflection = require('inflection');

			this.$moduleTypes = _.map(result.rows, (row) => {
				return inflection.pluralize(row.type);
			});

			let serverModule = this;
			while(serverModule.$module) serverModule = serverModule.$module;

			return this.$database.queryAsync('SELECT id FROM modules WHERE name = $1 AND parent IS NULL', [serverModule.$application]);
		})
		.then((result) => {
			if(!result.rows.length) return { 'rows': [] };

			return this.$database.queryAsync('SELECT A.*, B.display_name, B.configuration, B.enabled FROM fn_get_module_descendants($1) A INNER JOIN modules B ON (A.id = B.id)', [result.rows[0].id]);
		})
		.then((result) => {
			this.$cachedConfigTree = this._reorgConfigsToTree(result.rows, null);

			if(callback) callback(null, true);
			return null;
		})
		.catch((err) => {
			if(callback) callback(err);
		});
	}

	_getCachedModule(module) {
		const pathSegments = [];
		let currentModule = module;

		do {
			pathSegments.unshift(currentModule.$application || currentModule.name);

			if(currentModule.$module) {
				let moduleType = '';
				this.$moduleTypes.forEach((type) => {
					if(!currentModule.$module[`$${type}`]) return;

					if(Object.keys(currentModule.$module[`$${type}`]).indexOf(currentModule.name) >= 0)
						moduleType = type;
				});

				pathSegments.unshift(moduleType);
			}

			currentModule = currentModule.$module;
		} while(currentModule);

		// Iterate down the cached config objects
		let cachedModule = this.$cachedConfigTree[pathSegments.shift()];
		pathSegments.forEach((segment) => {
			if(!cachedModule) return;
			cachedModule = cachedModule[segment];
		});

		return cachedModule;
	}

	_reorgConfigsToTree(configArray, parentId) {
		const reOrgedTree = {};

		if(!this.$cachedMap) this.$cachedMap = {};

		if(parentId) {
			this.$moduleTypes.forEach((moduleType) => {
				reOrgedTree[moduleType] = {};
			});
		}

		configArray.forEach((config) => {
			if(config.parent !== parentId)
				return;

			const configObj = {};
			configObj.id = config.id;
			configObj.name = config.name;
			configObj.displayName = config.display_name;
			configObj.enabled = config.enabled;
			configObj.configuration = config.configuration;

			const configSubObj = this._reorgConfigsToTree(configArray, config.id);
			this.$moduleTypes.forEach((moduleType) => {
				configObj[moduleType] = configSubObj[moduleType];
			});

			if(parentId === null)
				reOrgedTree[config.name] = configObj;
			else {
				const inflection = require('inflection');
				reOrgedTree[inflection.pluralize(config.type)][config.name] = configObj;
			}

			this.$cachedMap[configObj.id] = configObj;
		});

		return reOrgedTree;
	}

	_getModulePath(module, callback) {
		if(callback) callback(null, '');
	}

	_databaseNotification(data) {
		if(!this.$cachedMap[data.payload])
			return null;

		if(data.channel === 'twyr-config-change') {
			this._databaseConfigurationChange(data.payload);
			return;
		}

		if(data.channel === 'twyr-state-change') {
			this._databaseStateChange(data.payload);
			return;
		}
	}

	_databaseConfigurationChange(moduleId) {
		const deepEqual = require('deep-equal'),
			inflection = require('inflection');

		this.$database.queryAsync('SELECT configuration FROM modules WHERE id = $1', [moduleId])
		.then((result) => {
			if(!result.rows.length)
				return null;

			if(deepEqual(this.$cachedMap[moduleId].configuration, result.rows[0].configuration))
				return null;

			this.$cachedMap[moduleId].configuration = result.rows[0].configuration;
			return this.$database.queryAsync('SELECT name, type FROM fn_get_module_ancestors($1) ORDER BY level DESC', [moduleId]);
		})
		.then((result) => {
			if(!result) return null;
			result = result.rows;

			result.shift();
			if(!result.length) return null;

			const module = [];
			result.forEach((pathSegment) => {
				module.push(inflection.pluralize(pathSegment.type));
				module.push(pathSegment.name);
			});

			this.$module.emit('update-config', this.name, module.join('/'), this.$cachedMap[moduleId].configuration);
			return null;
		})
		.catch((err) => {
			if((process.env.NODE_ENV || 'development') === 'development') console.error(`Error retrieving configuration for ${moduleId}: ${err.stack}`);
		});
	}

	_databaseStateChange(moduleId) {
		const inflection = require('inflection');

		this._dummyAsync()
		.then(() => {
			return this.$database.queryAsync('SELECT enabled FROM modules WHERE id = $1', [moduleId]);
		})
		.then((result) => {
			if(!result.rows.length)
				return null;

			if(this.$cachedMap[moduleId].enabled === result.rows[0].enabled)
				return null;

			this.$cachedMap[moduleId].enabled = result.rows[0].enabled;
			return this.$database.queryAsync('SELECT name, type FROM fn_get_module_ancestors($1) ORDER BY level DESC', [moduleId]);
		})
		.then((result) => {
			if(!result) return null;
			result = result.rows;

			result.shift();
			if(!result.length) return null;

			const module = [];
			result.forEach((pathSegment) => {
				module.push(inflection.pluralize(pathSegment.type));
				module.push(pathSegment.name);
			});

			this.$module.emit('update-state', this.name, module.join('/'), this.$cachedMap[moduleId].enabled);
			return null;
		})
		.catch((err) => {
			if((process.env.NODE_ENV || 'development') === 'development') console.error(`Error retrieving state for ${moduleId}: ${err.stack}`);
		});
	}

	_databaseQuery(queryData) {
		if((process.env.NODE_ENV || 'development') === 'development') console.log(`${this.name}::_databaseQuery: ${JSON.stringify(queryData, undefined, '\t')}`);
	}

	_databaseNotice() {
		if((process.env.NODE_ENV || 'development') === 'development') console.log(`${this.name}::_databaseNotification: ${JSON.stringify(arguments, undefined, '\t')}`);
	}

	_databaseQueryError(err, queryData) {
		if((process.env.NODE_ENV || 'development') === 'development') console.error(`${this.name}::_databaseQueryError: ${JSON.stringify({ 'query': queryData, 'error': err }, undefined, '\t')}`);
	}

	get basePath() { return __dirname; }
}

exports.service = DatabaseConfigurationService;
