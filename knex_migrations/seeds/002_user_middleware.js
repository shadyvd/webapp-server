'use strict';

exports.seed = function(knex) {
	let webappId = null;

	return knex.raw('SELECT id FROM modules WHERE name = ? AND parent IS NULL', ['TwyrWebApp'])
		.then(function(parentId) {
			if(!parentId.rows.length)
				return null;

			webappId = parentId.rows[0].id;
			return knex.raw('SELECT id FROM modules WHERE parent = ? AND name = ? AND type = ?', [webappId, 'User', 'middleware']);
		})
		.then(function(existingMiddlewareId) {
			if(existingMiddlewareId.rows.length)
				return null;

			return knex('modules').insert({
				'parent': webappId,
				'type': 'middleware',
				'name': 'User',
				'display_name': 'User',
				'description': 'The Twy\'r Web Application User Middleware',
				'metadata': {
					'author': 'Twy\'r',
					'version': '1.8.3',
					'website': 'https://twyr.github.io',
					'demo': 'https://twyr.github.io',
					'documentation': 'https://twyr.github.io'
				}
			});
		});
};
