'use strict';

exports.seed = function(knex) {
	let webappId = null;

	return knex.raw('SELECT id FROM modules WHERE name = ? AND parent IS NULL', ['TwyrWebApp'])
		.then(function(parentId) {
			if(!parentId.rows.length)
				return null;

			webappId = parentId.rows[0].id;
			return knex.raw('SELECT id FROM server_applications WHERE server = ? AND name = ?', [webappId, 'Profile']);
		})
		.then(function(existingProfileApplicationId) {
			if(existingProfileApplicationId.rows.length)
				return null;

			return knex('server_applications').insert({
				'server': webappId,
				'name': 'Profile',
				'media': 'desktop',
				'category': 'Settings',
				'description': 'The Twy\'r Profile Application',
				'metadata': {
					'author': 'Twy\'r',
					'version': '1.8.3',
					'website': 'https://twyr.github.io',
					'demo': 'https://twyr.github.io',
					'documentation': 'https://twyr.github.io'
				}
			}).returning('id')
			.then(function(profileApplicationId) {
				return knex('server_application_screens').insert({
					'server_application': profileApplicationId[0],
					'name': 'Main Screen'
				});
			});
		})
		.then(function() {
			return knex.raw('SELECT id FROM server_applications WHERE server = ? AND name = ?', [webappId, 'Applications']);
		})
		.then(function(existingApplicationsApplicationId) {
			if(existingApplicationsApplicationId.rows.length)
				return null;

			return knex('server_applications').insert({
				'server': webappId,
				'name': 'Applications',
				'media': 'desktop',
				'category': 'Applications',
				'description': 'The Twy\'r Application Chooser Application',
				'metadata': {
					'author': 'Twy\'r',
					'version': '1.8.3',
					'website': 'https://twyr.github.io',
					'demo': 'https://twyr.github.io',
					'documentation': 'https://twyr.github.io'
				}
			}).returning('id')
			.then(function(applicationApplicationId) {
				return knex('server_application_screens').insert({
					'server_application': applicationApplicationId[0],
					'name': 'Main Screen'
				});
			});
		});
};
