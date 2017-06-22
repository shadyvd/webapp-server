/* global define:true */
/* eslint dot-notation: 0 */

'use strict';

define(
	'twyr-webapp/resolver',
	['exports', 'ember-resolver'],
	function (exports, _emberResolver) {
		exports['default'] = _emberResolver['default'];
	}
);

define(
	'twyr-webapp/router',
	['exports', 'ember'],
	function (exports, _ember) {
		if(window.developmentMode) console.log('DEFINE: twyr-webapp/application/router');
		exports['default'] = _ember['default'].Router.extend({
			'location': 'history'
		});
	}
);

define(
	'twyr-webapp/initializers/container-debug-adapter',
	['exports', 'ember-resolver/container-debug-adapter'],
	function (exports, _emberResolverContainerDebugAdapter) {
		exports['default'] = {
			'name': 'container-debug-adapter',

			'initialize': function() {
				const app = arguments[1] || arguments[0];
				app.register('container-debug-adapter:main', _emberResolverContainerDebugAdapter['default']);
				app.inject('container-debug-adapter:main', 'namespace', 'application:main');
			}
		};
	}
);

define(
	'twyr-webapp/adapters/application',
	['exports', 'ember-data/adapters/json-api'],
	function (exports, _jsonAPIAdapter) {
		if(window.developmentMode) console.log('DEFINE: twyr-webapp/adapters/application');
		exports['default'] = _jsonAPIAdapter['default'].extend({
			'host': '/'
		});
	}
);

define(
	'twyr-webapp/serializers/application',
	['exports', 'ember', 'ember-data/serializers/json-api'],
	function (exports, _ember, _jsonAPISerializer) {
		if(window.developmentMode) console.log('DEFINE: twyr-webapp/serializers/application');
		exports['default'] = _jsonAPISerializer['default'].extend({
			'keyForAttribute': function(attr) {
				return _ember['default'].String.underscore(attr);
			},

			'keyForLink': function(attr) {
				return _ember['default'].String.underscore(attr);
			},

			'keyForRelationship': function(attr) {
				return _ember['default'].String.underscore(attr);
			}
		});
	}
);

define(
	'twyr-webapp/application',
	['exports', 'ember', 'twyr-webapp/resolver', 'ember-load-initializers'],
	function(exports, _ember, _twyrWebAppResolver, _emberLoadInitializers) {
		if(window.developmentMode) console.log('DEFINE: twyr-webapp/application');
		const twyrApplication = _ember['default'].Application.extend({
			'modulePrefix': 'twyr-webapp',
			'Resolver': _twyrWebAppResolver['default']
		});

		(0, _emberLoadInitializers['default'])(twyrApplication, 'twyr-webapp');

		if(window.developmentMode) console.log('DEFINE: twyr-webapp/application/create');
		const App = twyrApplication.create({
			'name': 'twyr-webapp',
			'version': '1.8.3',
			'LOG_RESOLVER': window.developmentMode,
			'LOG_ACTIVE_GENERATION': window.developmentMode,
			'LOG_TRANSITIONS': window.developmentMode,
			'LOG_TRANSITIONS_INTERNAL': window.developmentMode,
			'LOG_VIEW_LOOKUPS': window.developmentMode
		});

		App.UUID = function() {
			return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
				const r = Math.random()*16|0,
					v = c === 'x' ? r : (r&0x3|0x8);
				return v.toString(16);
			});
		};

		exports['default'] = App;
	}
);

