'use strict';

exports.seed = function(knex, Promise) {
	let componentId = null,
		loginWidgetId = null,
		logoutWidgetId = null,
		webappId = null;

	let publicPermissionId = null,
		registeredPermissionId = null;

	return knex.raw('SELECT id FROM modules WHERE name = ? AND parent IS NULL', ['TwyrWebApp'])
		.then(function(parentId) {
			if(!parentId.rows.length)
				return null;

			webappId = parentId.rows[0].id;
			return knex.raw('SELECT id FROM modules WHERE parent = ? AND name = ? AND type = ?', [webappId, 'Sessions', 'component']);
		})
		.then(function(existingComponentId) {
			if(existingComponentId.rows.length)
				return null;

			return knex('modules').insert({
				'parent': webappId,
				'type': 'component',
				'name': 'Sessions',
				'display_name': 'Session',
				'description': 'The Twy\'r Web Application Session Management Component',
				'metadata': {
					'author': 'Twy\'r',
					'version': '1.8.3',
					'website': 'https://twyr.github.io',
					'demo': 'https://twyr.github.io',
					'documentation': 'https://twyr.github.io'
				}
			}).returning('id')
			.then(function(sessionComponentId) {
				componentId = sessionComponentId[0];
				return knex('component_widgets').insert({
					'module': componentId,
					'ember_component': 'login-widget',
					'display_name': 'Twy\'r Login',
					'description': 'The Twy\'r Web Application Login Widget',
					'metadata': {
						'author': 'Twy\'r',
						'version': '1.8.3',
						'website': 'https://twyr.github.io',
						'demo': 'https://twyr.github.io',
						'documentation': 'https://twyr.github.io'
					}
				}).returning('id');
			})
			.then(function(loginComponentId) {
				loginWidgetId = loginComponentId[0];
				return knex('component_widget_templates').insert({
					'component_widget': loginWidgetId,
					'ember_template': 'login-widget',
					'display_name': 'Twy\'r Login',
					'description': 'The Twy\'r Web Application Login Widget Default Template',
					'is_default': true,
					'metadata': {
						'author': 'Twy\'r',
						'version': '1.8.3',
						'website': 'https://twyr.github.io',
						'demo': 'https://twyr.github.io',
						'documentation': 'https://twyr.github.io'
					}
				}).returning('id');
			})
			.then(function() {
				return knex('component_widgets').insert({
					'module': componentId,
					'ember_component': 'logout-widget',
					'display_name': 'Twy\'r Logout',
					'description': 'The Twy\'r Web Application Logout Widget',
					'metadata': {
						'author': 'Twy\'r',
						'version': '1.8.3',
						'website': 'https://twyr.github.io',
						'demo': 'https://twyr.github.io',
						'documentation': 'https://twyr.github.io'
					}
				}).returning('id');
			})
			.then(function(logoutComponentId) {
				logoutWidgetId = logoutComponentId[0];
				return knex('component_widget_templates').insert({
					'component_widget': logoutWidgetId,
					'ember_template': 'logout-widget',
					'display_name': 'Twy\'r Logout',
					'description': 'The Twy\'r Web Application Logout Widget Default Template',
					'is_default': true,
					'metadata': {
						'author': 'Twy\'r',
						'version': '1.8.3',
						'website': 'https://twyr.github.io',
						'demo': 'https://twyr.github.io',
						'documentation': 'https://twyr.github.io'
					}
				}).returning('id');
			})
			.then(function() {
				return knex.raw('SELECT id FROM component_permissions WHERE module = ? AND name = ?', [webappId, 'public']);
			})
			.then(function(publicPermId) {
				publicPermissionId = publicPermId.rows[0].id;
				return knex.raw('SELECT id FROM component_permissions WHERE module = ? AND name = ?', [webappId, 'registered']);
			})
			.then(function(registeredPermId) {
				registeredPermissionId = registeredPermId.rows[0].id;

				return Promise.all([
					knex('component_widgets_permissions').insert({
						'component_widget': loginWidgetId,
						'component_permission': publicPermissionId
					}),
					knex('component_widgets_permissions').insert({
						'component_widget': logoutWidgetId,
						'component_permission': registeredPermissionId
					})
				]);
			});
		});
};
