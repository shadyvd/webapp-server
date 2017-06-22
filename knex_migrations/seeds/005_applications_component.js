'use strict';

exports.seed = function(knex, Promise) {
	let appChooserId = null,
		appChooserWidgetId = null,
		componentId = null,
		registeredPermId = null,
		webappId = null;

	return knex.raw('SELECT id FROM modules WHERE name = ? AND parent IS NULL', ['TwyrWebApp'])
		.then(function(parentId) {
			if(!parentId.rows.length)
				return null;

			webappId = parentId.rows[0].id;
			return knex.raw('SELECT id FROM modules WHERE parent = ? AND name = ? AND type = ?', [webappId, 'Applications', 'component']);
		})
		.then(function(existingComponentId) {
			if(existingComponentId.rows.length)
				return null;

			return knex('modules').insert({
				'parent': webappId,
				'type': 'component',
				'name': 'Applications',
				'display_name': 'Application Renderer',
				'description': 'The Twy\'r Web Application Application Renderer Component',
				'metadata': {
					'author': 'Twy\'r',
					'version': '1.8.3',
					'website': 'https://twyr.github.io',
					'demo': 'https://twyr.github.io',
					'documentation': 'https://twyr.github.io'
				}
			}).returning('id')
			.then(function(appComponentId) {
				componentId = appComponentId[0];
				return Promise.all([
					knex('component_widgets').insert({
						'module': componentId,
						'ember_component': 'application-chooser-widget',
						'notification_area_only': true,
						'display_name': 'Application Chooser Widget',
						'description': 'The Twy\'r Web Application Application Chooser Widget',
						'metadata': {
							'author': 'Twy\'r',
							'version': '1.8.3',
							'website': 'https://twyr.github.io',
							'demo': 'https://twyr.github.io',
							'documentation': 'https://twyr.github.io'
						}
					}).returning('id'),
					knex('component_widgets').insert({
						'module': componentId,
						'ember_component': 'application-chooser',
						'display_name': 'Application Chooser',
						'description': 'The Twy\'r Web Application Application Chooser',
						'metadata': {
							'author': 'Twy\'r',
							'version': '1.8.3',
							'website': 'https://twyr.github.io',
							'demo': 'https://twyr.github.io',
							'documentation': 'https://twyr.github.io'
						}
					}).returning('id')
				]);
			})
			.then(function(widgetIds) {
				appChooserWidgetId = widgetIds[0][0];
				appChooserId = widgetIds[1][0];

				return Promise.all([
					knex('component_widget_templates').insert({
						'component_widget': appChooserWidgetId,
						'ember_template': 'application-chooser-widget',
						'display_name': 'Application Chooser Widget',
						'description': 'The Twy\'r Web Application Application Chooser Widget Default Template',
						'is_default': true,
						'metadata': {
							'author': 'Twy\'r',
							'version': '1.8.3',
							'website': 'https://twyr.github.io',
							'demo': 'https://twyr.github.io',
							'documentation': 'https://twyr.github.io'
						}
					}),
					knex('component_widget_templates').insert({
						'component_widget': appChooserId,
						'ember_template': 'application-chooser',
						'display_name': 'Application Chooser',
						'description': 'The Twy\'r Web Application Application Chooser Default Template',
						'is_default': true,
						'metadata': {
							'author': 'Twy\'r',
							'version': '1.8.3',
							'website': 'https://twyr.github.io',
							'demo': 'https://twyr.github.io',
							'documentation': 'https://twyr.github.io'
						}
					})
				]);
			})
			.then(function() {
				return knex.raw('SELECT id FROM component_permissions WHERE module = ? AND name = ?', [webappId, 'registered']);
			})
			.then(function(permId) {
				registeredPermId = permId.rows[0].id;

				return Promise.all([
					knex('component_widgets_permissions').insert({
						'component_widget': appChooserWidgetId,
						'component_permission': registeredPermId
					}),
					knex('component_widgets_permissions').insert({
						'component_widget': appChooserId,
						'component_permission': registeredPermId
					})
				]);
			});
		});
};
