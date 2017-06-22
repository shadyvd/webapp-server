'use strict';

exports.seed = function(knex, Promise) {
	let basicInfoWidgetId = null,
		changePwdWidgetId = null,
		componentId = null,
		contactInfoWidgetId = null,
		profileWidgetId = null,
		registeredPermId = null,
		webappId = null;

	return knex.raw('SELECT id FROM modules WHERE name = ? AND parent IS NULL', ['TwyrWebApp'])
		.then(function(parentId) {
			if(!parentId.rows.length)
				return null;

			webappId = parentId.rows[0].id;
			return knex.raw('SELECT id FROM modules WHERE parent = ? AND name = ? AND type = ?', [webappId, 'Profiles', 'component']);
		})
		.then(function(existingComponentId) {
			if(existingComponentId.rows.length)
				return null;

			return knex('modules').insert({
				'parent': webappId,
				'type': 'component',
				'name': 'Profiles',
				'display_name': 'Profile Manager',
				'description': 'The Twy\'r Web Application User Profile Management Component',
				'metadata': {
					'author': 'Twy\'r',
					'version': '1.8.3',
					'website': 'https://twyr.github.io',
					'demo': 'https://twyr.github.io',
					'documentation': 'https://twyr.github.io'
				}
			}).returning('id')
			.then(function(profileComponentId) {
				componentId = profileComponentId[0];
				return Promise.all([
					knex('component_widgets').insert({
						'module': componentId,
						'ember_component': 'profile-widget',
						'notification_area_only': true,
						'display_name': 'Profile',
						'description': 'The Twy\'r Web Application Profile Management Widget',
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
						'ember_component': 'profile-change-password',
						'display_name': 'Change Password',
						'description': 'The Twy\'r Web Application Password Management Widget',
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
						'ember_component': 'profile-basic-information',
						'display_name': 'Basic Information',
						'description': 'The Twy\'r Web Application Profile Basic Information Widget',
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
						'ember_component': 'profile-contacts',
						'display_name': 'Contact Information',
						'description': 'The Twy\'r Web Application Profile Contact Information Widget',
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
				profileWidgetId = widgetIds[0][0];
				changePwdWidgetId = widgetIds[1][0];
				basicInfoWidgetId = widgetIds[2][0];
				contactInfoWidgetId = widgetIds[3][0];

				return Promise.all([
					knex('component_widget_templates').insert({
						'component_widget': profileWidgetId,
						'ember_template': 'profile-widget',
						'display_name': 'Profile',
						'description': 'The Twy\'r Web Application Profile Widget Default Template',
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
						'component_widget': changePwdWidgetId,
						'ember_template': 'profile-change-password',
						'display_name': 'Change Password',
						'description': 'The Twy\'r Web Application Password Management Default Template',
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
						'component_widget': basicInfoWidgetId,
						'ember_template': 'profile-basic-information',
						'display_name': 'Basic Information',
						'description': 'The Twy\'r Web Application Profile Basic Information Default Template',
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
						'component_widget': contactInfoWidgetId,
						'ember_template': 'profile-contacts',
						'display_name': 'Contact Information',
						'description': 'The Twy\'r Web Application Profile Contact Information Default Template',
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
						'component_widget': profileWidgetId,
						'component_permission': registeredPermId
					}),
					knex('component_widgets_permissions').insert({
						'component_widget': changePwdWidgetId,
						'component_permission': registeredPermId
					}),
					knex('component_widgets_permissions').insert({
						'component_widget': basicInfoWidgetId,
						'component_permission': registeredPermId
					}),
					knex('component_widgets_permissions').insert({
						'component_widget': contactInfoWidgetId,
						'component_permission': registeredPermId
					})
				]);
			});
		});
};
