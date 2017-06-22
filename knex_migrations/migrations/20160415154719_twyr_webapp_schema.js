'use strict';

exports.up = function(knex, Promise) {
	// Step 1: Setup the basics in the database
	return Promise.all([
		knex.schema.raw('SET check_function_bodies = true'),
		knex.schema.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public')
	])
	// Step 2: Setup types
	.then(function() {
		return Promise.all([
			knex.schema.raw("CREATE TYPE public.module_type AS ENUM ('component','middleware','service', 'server', 'template')"),
			knex.schema.raw("CREATE TYPE public.server_application_category AS ENUM ('Applications','Settings')"),
			knex.schema.raw("CREATE TYPE public.gender AS ENUM ('female','male','other')"),
			knex.schema.raw("CREATE TYPE public.contact_type AS ENUM ('email','landline','mobile','other')"),
			knex.schema.raw("CREATE TYPE public.emergency_contact_type AS ENUM ('self','parent','sibling','child','cousin','colleague','medical professional','legal professional','other')"),
			knex.schema.raw("CREATE TYPE public.media_type AS ENUM ('desktop', 'tablet', 'tv', 'phone', 'other')")
		]);
	})
	// Step 3: Setup primary tables  - those that aren't dependent on other tables (i.e. no foreign keys to other tables)
	.then(function() {
		return Promise.all([
			knex.schema.withSchema('public')
			.createTableIfNotExists('modules', function(modTbl) {
				modTbl.uuid('id').notNullable().primary().defaultTo(knex.raw('uuid_generate_v4()'));
				modTbl.uuid('parent').references('id').inTable('modules').onDelete('CASCADE').onUpdate('CASCADE');
				modTbl.specificType('type', 'public.module_type').notNullable().defaultTo('component');
				modTbl.text('name').notNullable();
				modTbl.text('display_name').notNullable();
				modTbl.text('description').notNullable().defaultTo('Another Twyr Module');
				modTbl.jsonb('metadata').notNullable().defaultTo('{}');
				modTbl.jsonb('configuration').notNullable().defaultTo('{}');
				modTbl.jsonb('configuration_schema').notNullable().defaultTo('{}');
				modTbl.boolean('admin_only').notNullable().defaultTo(false);
				modTbl.boolean('enabled').notNullable().defaultTo(true);
				modTbl.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
				modTbl.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
				modTbl.unique(['parent', 'name', 'type']);
			}),

			knex.schema.withSchema('public')
			.createTableIfNotExists('tenants', function(tenantTbl) {
				tenantTbl.uuid('id').notNullable().primary().defaultTo(knex.raw('uuid_generate_v4()'));
				tenantTbl.text('name').notNullable();
				tenantTbl.text('sub_domain').notNullable();
				tenantTbl.boolean('enabled').notNullable().defaultTo(true);
				tenantTbl.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
				tenantTbl.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
				tenantTbl.unique(['sub_domain']);
			}),

			knex.schema.withSchema('public')
			.createTableIfNotExists('users', function(userTbl) {
				userTbl.uuid('id').notNullable().primary().defaultTo(knex.raw('uuid_generate_v4()'));
				userTbl.text('email').notNullable();
				userTbl.text('password').notNullable();
				userTbl.text('first_name').notNullable();
				userTbl.text('middle_names');
				userTbl.text('last_name').notNullable();
				userTbl.text('nickname');
				userTbl.uuid('profile_image');
				userTbl.jsonb('profile_image_metadata');
				userTbl.specificType('gender', 'public.gender').notNullable().defaultTo('other');
				userTbl.timestamp('dob');
				userTbl.boolean('enabled').notNullable().defaultTo(true);
				userTbl.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
				userTbl.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
				userTbl.unique('email');
			})
		]);
	})
	// Step 4: Setup second-level tables - those that have foreign key relationships with the primary tables
	.then(function() {
		return Promise.all([
			knex.schema.withSchema('public')
			.createTableIfNotExists('server_templates', function(srvrTmplTbl) {
				srvrTmplTbl.uuid('id').notNullable().primary().defaultTo(knex.raw('uuid_generate_v4()'));
				srvrTmplTbl.uuid('module').notNullable().references('id').inTable('modules').onDelete('CASCADE').onUpdate('CASCADE');
				srvrTmplTbl.specificType('media', 'public.media_type').notNullable().defaultTo('desktop');
				srvrTmplTbl.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
				srvrTmplTbl.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
			}),

			knex.schema.withSchema('public')
			.createTableIfNotExists('server_applications', function(serverAppTbl) {
				serverAppTbl.uuid('id').notNullable().primary().defaultTo(knex.raw('uuid_generate_v4()'));
				serverAppTbl.uuid('server').notNullable().references('id').inTable('modules').onDelete('CASCADE').onUpdate('CASCADE');
				serverAppTbl.text('name').notNullable();
				serverAppTbl.specificType('media', 'public.media_type').notNullable().defaultTo('desktop');
				serverAppTbl.specificType('category', 'public.server_application_category').notNullable();
				serverAppTbl.boolean('is_default').notNullable().defaultTo(false);
				serverAppTbl.text('description');
				serverAppTbl.jsonb('metadata').notNullable().defaultTo('{}');
				serverAppTbl.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
				serverAppTbl.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
				serverAppTbl.unique(['server', 'name', 'media']);
			}),

			knex.schema.withSchema('public')
			.createTableIfNotExists('component_permissions', function(permTbl) {
				permTbl.uuid('id').notNullable().primary().defaultTo(knex.raw('uuid_generate_v4()'));
				permTbl.uuid('module').notNullable().references('id').inTable('modules').onDelete('CASCADE').onUpdate('CASCADE');
				permTbl.text('name').notNullable();
				permTbl.text('display_name').notNullable();
				permTbl.text('description').notNullable().defaultTo('Another Random Permission');
				permTbl.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
				permTbl.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
				permTbl.unique(['module', 'name']);
				permTbl.unique(['module', 'id']);
			}),

			knex.schema.withSchema('public')
			.createTableIfNotExists('component_widgets', function(modWidgetsTbl) {
				modWidgetsTbl.uuid('id').notNullable().primary().defaultTo(knex.raw('uuid_generate_v4()'));
				modWidgetsTbl.uuid('module').notNullable().references('id').inTable('modules').onDelete('CASCADE').onUpdate('CASCADE');
				modWidgetsTbl.text('ember_component').notNullable();
				modWidgetsTbl.boolean('notification_area_only').notNullable().defaultTo(false);
				modWidgetsTbl.text('display_name').notNullable();
				modWidgetsTbl.text('description');
				modWidgetsTbl.jsonb('metadata').notNullable().defaultTo('{}');
				modWidgetsTbl.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
				modWidgetsTbl.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
				modWidgetsTbl.unique(['ember_component']);
			}),

			knex.schema.withSchema('public')
			.createTableIfNotExists('tenant_locations', function(locationTbl) {
				locationTbl.uuid('id').notNullable().primary().defaultTo(knex.raw('uuid_generate_v4()'));
				locationTbl.uuid('tenant').notNullable().references('id').inTable('tenants').onDelete('CASCADE').onUpdate('CASCADE');
				locationTbl.text('name').notNullable();
				locationTbl.text('line1').notNullable();
				locationTbl.text('line2');
				locationTbl.text('line3');
				locationTbl.text('area').notNullable();
				locationTbl.text('city').notNullable();
				locationTbl.text('state').notNullable();
				locationTbl.text('country').notNullable();
				locationTbl.text('postal_code').notNullable();
				locationTbl.specificType('latitude', 'double precision').notNullable();
				locationTbl.specificType('longitude', 'double precision').notNullable();
				locationTbl.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
				locationTbl.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
				locationTbl.unique(['tenant', 'name']);
				locationTbl.unique(['tenant', 'id']);
			}),

			knex.schema.withSchema('public')
			.createTableIfNotExists('tenant_groups', function(groupTbl) {
				groupTbl.uuid('id').notNullable().primary().defaultTo(knex.raw('uuid_generate_v4()'));
				groupTbl.uuid('tenant').notNullable().references('id').inTable('tenants').onDelete('CASCADE').onUpdate('CASCADE');
				groupTbl.uuid('parent').references('id').inTable('tenant_groups').onDelete('CASCADE').onUpdate('CASCADE');
				groupTbl.text('name').notNullable();
				groupTbl.text('display_name').notNullable();
				groupTbl.text('description');
				groupTbl.boolean('default_for_new_user').notNullable().defaultTo(false);
				groupTbl.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
				groupTbl.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
				groupTbl.unique(['parent', 'name']);
				groupTbl.unique(['tenant', 'id']);
			}),

			knex.schema.withSchema('public')
			.createTableIfNotExists('tenant_folders', function(tenantFolderTbl) {
				tenantFolderTbl.uuid('id').notNullable().primary().defaultTo(knex.raw('uuid_generate_v4()'));
				tenantFolderTbl.uuid('tenant').notNullable().references('id').inTable('tenants').onDelete('CASCADE').onUpdate('CASCADE');
				tenantFolderTbl.uuid('parent').references('id').inTable('tenant_folders').onDelete('CASCADE').onUpdate('CASCADE');
				tenantFolderTbl.text('name').notNullable();
				tenantFolderTbl.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
				tenantFolderTbl.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
				tenantFolderTbl.unique(['tenant', 'id']);
				tenantFolderTbl.unique(['parent', 'name']);
			}),

			knex.schema.withSchema('public')
			.createTableIfNotExists('tenant_applications', function(tenantAppTbl) {
				tenantAppTbl.uuid('id').notNullable().primary().defaultTo(knex.raw('uuid_generate_v4()'));
				tenantAppTbl.uuid('tenant').notNullable().references('id').inTable('tenants').onDelete('CASCADE').onUpdate('CASCADE');
				tenantAppTbl.text('name').notNullable();
				tenantAppTbl.text('description');
				tenantAppTbl.jsonb('metadata').notNullable().defaultTo('{}');
				tenantAppTbl.specificType('media', 'public.media_type').notNullable().defaultTo('desktop');
				tenantAppTbl.boolean('is_default').notNullable().defaultTo(false);
				tenantAppTbl.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
				tenantAppTbl.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
				tenantAppTbl.unique(['tenant', 'id']);
				tenantAppTbl.unique(['tenant', 'name', 'media']);
			}),

			knex.schema.withSchema('public')
			.createTableIfNotExists('tenants_modules', function(tenantModuleTbl) {
				tenantModuleTbl.uuid('id').notNullable().primary().defaultTo(knex.raw('uuid_generate_v4()'));
				tenantModuleTbl.uuid('tenant').notNullable().references('id').inTable('tenants').onDelete('CASCADE').onUpdate('CASCADE');
				tenantModuleTbl.uuid('module').notNullable().references('id').inTable('modules').onDelete('CASCADE').onUpdate('CASCADE');
				tenantModuleTbl.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
				tenantModuleTbl.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
				tenantModuleTbl.unique(['tenant', 'module']);
			}),

			knex.schema.withSchema('public')
			.createTableIfNotExists('tenants_users', function(tenantUserTbl) {
				tenantUserTbl.uuid('id').notNullable().primary().defaultTo(knex.raw('uuid_generate_v4()'));
				tenantUserTbl.uuid('tenant').notNullable().references('id').inTable('tenants').onDelete('CASCADE').onUpdate('CASCADE');
				tenantUserTbl.uuid('login').notNullable().references('id').inTable('users').onDelete('CASCADE').onUpdate('CASCADE');
				tenantUserTbl.uuid('default_tenant_application').references('id').inTable('tenant_applications').onDelete('SET NULL').onUpdate('CASCADE');
				tenantUserTbl.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
				tenantUserTbl.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
				tenantUserTbl.unique(['tenant', 'login']);
				tenantUserTbl.unique(['tenant', 'id']);
			}),

			knex.schema.withSchema('public')
			.createTableIfNotExists('user_social_logins', function(socialLoginTbl) {
				socialLoginTbl.uuid('id').notNullable().primary().defaultTo(knex.raw('uuid_generate_v4()'));
				socialLoginTbl.uuid('login').notNullable().references('id').inTable('users').onDelete('CASCADE').onUpdate('CASCADE');
				socialLoginTbl.text('provider').notNullable();
				socialLoginTbl.text('provider_uid').notNullable();
				socialLoginTbl.text('display_name').notNullable();
				socialLoginTbl.jsonb('social_data').notNullable();
				socialLoginTbl.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
				socialLoginTbl.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
				socialLoginTbl.unique(['provider', 'provider_uid']);
			}),

			knex.schema.withSchema('public')
			.createTableIfNotExists('user_contacts', function(contactsTbl) {
				contactsTbl.uuid('id').notNullable().primary().defaultTo(knex.raw('uuid_generate_v4()'));
				contactsTbl.uuid('login').notNullable().references('id').inTable('users').onDelete('CASCADE').onUpdate('CASCADE');
				contactsTbl.text('contact').notNullable();
				contactsTbl.specificType('type', 'public.contact_type').notNullable().defaultTo('other');
				contactsTbl.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
				contactsTbl.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
			}),

			knex.schema.withSchema('public')
			.createTableIfNotExists('user_emergency_contacts', function(emergencyContactsTbl) {
				emergencyContactsTbl.uuid('id').notNullable().primary().defaultTo(knex.raw('uuid_generate_v4()'));
				emergencyContactsTbl.uuid('login').notNullable().references('id').inTable('users').onDelete('CASCADE').onUpdate('CASCADE');
				emergencyContactsTbl.uuid('contact').notNullable().references('id').inTable('users').onDelete('CASCADE').onUpdate('CASCADE');
				emergencyContactsTbl.specificType('relationship', 'public.emergency_contact_type').notNullable().defaultTo('other');
				emergencyContactsTbl.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
				emergencyContactsTbl.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
				emergencyContactsTbl.unique(['login', 'contact']);
			})
		]);
	})
	// Step 5: Setup third-level tables
	.then(function() {
		return Promise.all([
			knex.schema.withSchema('public')
			.createTableIfNotExists('server_application_screens', function(serverAppScreenTbl) {
				serverAppScreenTbl.uuid('id').notNullable().primary().defaultTo(knex.raw('uuid_generate_v4()'));
				serverAppScreenTbl.uuid('server_application').notNullable().references('id').inTable('server_applications').onDelete('CASCADE').onUpdate('CASCADE');
				serverAppScreenTbl.text('name').notNullable();
				serverAppScreenTbl.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
				serverAppScreenTbl.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
				serverAppScreenTbl.unique(['server_application', 'id']);
				serverAppScreenTbl.unique(['server_application', 'name']);
			}),

			knex.schema.withSchema('public')
			.createTableIfNotExists('server_application_menus', function(serverAppMenuTbl) {
				serverAppMenuTbl.uuid('id').notNullable().primary().defaultTo(knex.raw('uuid_generate_v4()'));
				serverAppMenuTbl.uuid('server_application').notNullable().references('id').inTable('server_applications').onDelete('CASCADE').onUpdate('CASCADE');
				serverAppMenuTbl.text('name').notNullable();
				serverAppMenuTbl.text('description');
				serverAppMenuTbl.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
				serverAppMenuTbl.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
				serverAppMenuTbl.unique(['server_application', 'id']);
				serverAppMenuTbl.unique(['server_application', 'name']);
			}),

			knex.schema.withSchema('public')
			.createTableIfNotExists('component_widgets_permissions', function(modWidgetPermTbl) {
				modWidgetPermTbl.uuid('id').notNullable().primary().defaultTo(knex.raw('uuid_generate_v4()'));
				modWidgetPermTbl.uuid('component_widget').notNullable().references('id').inTable('component_widgets').onDelete('CASCADE').onUpdate('CASCADE');
				modWidgetPermTbl.uuid('component_permission').notNullable().references('id').inTable('component_permissions').onDelete('CASCADE').onUpdate('CASCADE');
				modWidgetPermTbl.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
				modWidgetPermTbl.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
				modWidgetPermTbl.unique(['component_widget', 'component_permission']);
			}),

			knex.schema.withSchema('public')
			.createTableIfNotExists('component_widget_templates', function(modWidgetTmplTbl) {
				modWidgetTmplTbl.uuid('id').notNullable().primary().defaultTo(knex.raw('uuid_generate_v4()'));
				modWidgetTmplTbl.uuid('component_widget').notNullable().references('id').inTable('component_widgets').onDelete('CASCADE').onUpdate('CASCADE');
				modWidgetTmplTbl.text('ember_template').notNullable();
				modWidgetTmplTbl.text('display_name').notNullable();
				modWidgetTmplTbl.text('description');
				modWidgetTmplTbl.specificType('media', 'public.media_type').notNullable().defaultTo('desktop');
				modWidgetTmplTbl.jsonb('metadata').notNullable().defaultTo('{}');
				modWidgetTmplTbl.boolean('is_default').notNullable().defaultTo(false);
				modWidgetTmplTbl.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
				modWidgetTmplTbl.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
				modWidgetTmplTbl.unique(['ember_template', 'media', 'is_default']);
			}),

			knex.schema.withSchema('public')
			.createTableIfNotExists('tenants_server_templates', function(tenantServerTemplateTbl) {
				tenantServerTemplateTbl.uuid('id').notNullable().primary().defaultTo(knex.raw('uuid_generate_v4()'));
				tenantServerTemplateTbl.uuid('tenant').notNullable().references('id').inTable('tenants').onDelete('CASCADE').onUpdate('CASCADE');
				tenantServerTemplateTbl.uuid('server_template').notNullable().references('id').inTable('server_templates').onDelete('CASCADE').onUpdate('CASCADE');
				tenantServerTemplateTbl.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
				tenantServerTemplateTbl.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
			}),

			knex.schema.withSchema('public')
			.createTableIfNotExists('tenants_users_groups', function(tenantUserGroupTbl) {
				tenantUserGroupTbl.uuid('id').notNullable().primary().defaultTo(knex.raw('uuid_generate_v4()'));
				tenantUserGroupTbl.uuid('tenant').notNullable();
				tenantUserGroupTbl.uuid('tenant_group').notNullable();
				tenantUserGroupTbl.uuid('tenant_user').notNullable();
				tenantUserGroupTbl.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
				tenantUserGroupTbl.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
				tenantUserGroupTbl.unique(['tenant', 'tenant_group', 'tenant_user']);

				tenantUserGroupTbl.foreign(['tenant', 'tenant_group']).references(['tenant', 'id']).inTable('tenant_groups').onDelete('CASCADE').onUpdate('CASCADE');
				tenantUserGroupTbl.foreign(['tenant', 'tenant_user']).references(['tenant', 'id']).inTable('tenants_users').onDelete('CASCADE').onUpdate('CASCADE');

				tenantUserGroupTbl.unique(['tenant_group', 'id']);
			}),

			knex.schema.withSchema('public')
			.createTableIfNotExists('tenant_groups_job_titles', function(jobTitleTbl) {
				jobTitleTbl.uuid('id').notNullable().primary().defaultTo(knex.raw('uuid_generate_v4()'));
				jobTitleTbl.uuid('tenant').notNullable();
				jobTitleTbl.uuid('tenant_group').notNullable();
				jobTitleTbl.text('title').notNullable();
				jobTitleTbl.text('description');
				jobTitleTbl.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
				jobTitleTbl.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
				jobTitleTbl.unique(['tenant_group', 'id']);

				jobTitleTbl.foreign(['tenant', 'tenant_group']).references(['tenant', 'id']).inTable('tenant_groups').onDelete('CASCADE').onUpdate('CASCADE');
			}),

			knex.schema.withSchema('public')
			.createTableIfNotExists('tenant_group_permissions', function(groupPermissionTbl) {
				groupPermissionTbl.uuid('id').notNullable().primary().defaultTo(knex.raw('uuid_generate_v4()'));
				groupPermissionTbl.uuid('tenant').notNullable();
				groupPermissionTbl.uuid('tenant_group').notNullable();
				groupPermissionTbl.uuid('module').notNullable();
				groupPermissionTbl.uuid('permission').notNullable();
				groupPermissionTbl.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
				groupPermissionTbl.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
				groupPermissionTbl.unique(['tenant_group', 'permission']);

				groupPermissionTbl.foreign(['module', 'permission']).references(['module', 'id']).inTable('component_permissions').onDelete('CASCADE').onUpdate('CASCADE');
				groupPermissionTbl.foreign(['tenant', 'tenant_group']).references(['tenant', 'id']).inTable('tenant_groups').onDelete('CASCADE').onUpdate('CASCADE');
				groupPermissionTbl.foreign(['tenant', 'module']).references(['tenant', 'module']).inTable('tenants_modules').onDelete('CASCADE').onUpdate('CASCADE');
			}),

			knex.schema.withSchema('public')
			.createTableIfNotExists('tenants_users_locations', function(tenantUserLocationTbl) {
				tenantUserLocationTbl.uuid('id').notNullable().primary().defaultTo(knex.raw('uuid_generate_v4()'));
				tenantUserLocationTbl.uuid('tenant').notNullable();
				tenantUserLocationTbl.uuid('tenant_location').notNullable();
				tenantUserLocationTbl.uuid('tenant_user').notNullable();
				tenantUserLocationTbl.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
				tenantUserLocationTbl.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
				tenantUserLocationTbl.unique(['tenant', 'tenant_location', 'tenant_user']);

				tenantUserLocationTbl.foreign(['tenant', 'tenant_location']).references(['tenant', 'id']).inTable('tenant_locations').onDelete('CASCADE').onUpdate('CASCADE');
				tenantUserLocationTbl.foreign(['tenant', 'tenant_user']).references(['tenant', 'id']).inTable('tenants_users').onDelete('CASCADE').onUpdate('CASCADE');
			}),

			knex.schema.withSchema('public')
			.createTableIfNotExists('tenant_application_screens', function(tenantAppScreenTbl) {
				tenantAppScreenTbl.uuid('id').notNullable().primary().defaultTo(knex.raw('uuid_generate_v4()'));
				tenantAppScreenTbl.uuid('tenant_application').notNullable().references('id').inTable('tenant_applications').onDelete('CASCADE').onUpdate('CASCADE');
				tenantAppScreenTbl.text('name').notNullable();
				tenantAppScreenTbl.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
				tenantAppScreenTbl.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
				tenantAppScreenTbl.unique(['tenant_application', 'id']);
				tenantAppScreenTbl.unique(['tenant_application', 'name']);
			}),

			knex.schema.withSchema('public')
			.createTableIfNotExists('tenant_application_menus', function(tenantAppMenuTbl) {
				tenantAppMenuTbl.uuid('id').notNullable().primary().defaultTo(knex.raw('uuid_generate_v4()'));
				tenantAppMenuTbl.uuid('tenant_application').notNullable().references('id').inTable('tenant_applications').onDelete('CASCADE').onUpdate('CASCADE');
				tenantAppMenuTbl.text('name').notNullable();
				tenantAppMenuTbl.text('description');
				tenantAppMenuTbl.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
				tenantAppMenuTbl.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
				tenantAppMenuTbl.unique(['tenant_application', 'id']);
				tenantAppMenuTbl.unique(['tenant_application', 'name']);
			}),

			knex.schema.withSchema('public')
			.createTableIfNotExists('tenant_application_categories', function(tenantAppCategoryTbl) {
				tenantAppCategoryTbl.uuid('id').notNullable().primary().defaultTo(knex.raw('uuid_generate_v4()'));
				tenantAppCategoryTbl.uuid('tenant').notNullable();
				tenantAppCategoryTbl.uuid('tenant_application').notNullable();
				tenantAppCategoryTbl.uuid('tenant_folder').notNullable();
				tenantAppCategoryTbl.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
				tenantAppCategoryTbl.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
				tenantAppCategoryTbl.unique(['tenant_application', 'tenant_folder']);

				tenantAppCategoryTbl.foreign(['tenant', 'tenant_application']).references(['tenant', 'id']).inTable('tenant_applications').onDelete('CASCADE').onUpdate('CASCADE');
				tenantAppCategoryTbl.foreign(['tenant', 'tenant_folder']).references(['tenant', 'id']).inTable('tenant_folders').onDelete('CASCADE').onUpdate('CASCADE');
			})
		]);
	})
	// Step 6: Setup fourth-level tables
	.then(function() {
		return Promise.all([
			knex.schema.withSchema('public')
			.createTableIfNotExists('server_application_menu_items', function(serverAppMenuItemTbl) {
				serverAppMenuItemTbl.uuid('id').notNullable().primary().defaultTo(knex.raw('uuid_generate_v4()'));
				serverAppMenuItemTbl.uuid('server_application').notNullable();
				serverAppMenuItemTbl.uuid('server_application_menu').notNullable();
				serverAppMenuItemTbl.uuid('server_application_screen');
				serverAppMenuItemTbl.uuid('parent').references('id').inTable('server_application_menu_items').onDelete('CASCADE').onUpdate('CASCADE');
				serverAppMenuItemTbl.text('display_text').notNullable();
				serverAppMenuItemTbl.text('description');
				serverAppMenuItemTbl.boolean('is_home').notNullable().defaultTo(false);
				serverAppMenuItemTbl.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
				serverAppMenuItemTbl.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
				serverAppMenuItemTbl.unique(['parent', 'display_text']);

//				serverAppMenuItemTbl.foreign(['server_application', 'server_application_menu']).references(['server_application', 'id']).inTable('server_application_menus').onDelete('CASCADE').onUpdate('CASCADE');
//				serverAppMenuItemTbl.foreign(['server_application', 'server_application_screen']).references(['server_application', 'id']).inTable('server_application_screens').onDelete('CASCADE').onUpdate('CASCADE');
			}),

			knex.schema.withSchema('public')
			.createTableIfNotExists('tenants_users_groups_job_titles', function(tenantUserGroupJobTitleTbl) {
				tenantUserGroupJobTitleTbl.uuid('id').notNullable().primary().defaultTo(knex.raw('uuid_generate_v4()'));
				tenantUserGroupJobTitleTbl.uuid('tenant_group').notNullable();
				tenantUserGroupJobTitleTbl.uuid('tenant_group_job_title').notNullable();
				tenantUserGroupJobTitleTbl.uuid('tenant_user_group').notNullable();
				tenantUserGroupJobTitleTbl.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
				tenantUserGroupJobTitleTbl.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

				tenantUserGroupJobTitleTbl.foreign(['tenant_group', 'tenant_group_job_title']).references(['tenant_group', 'id']).inTable('tenant_groups_job_titles').onDelete('CASCADE').onUpdate('CASCADE');
				tenantUserGroupJobTitleTbl.foreign(['tenant_group', 'tenant_user_group']).references(['tenant_group', 'id']).inTable('tenants_users_groups').onDelete('CASCADE').onUpdate('CASCADE');
			}),

			knex.schema.withSchema('public')
			.createTableIfNotExists('tenant_application_menu_items', function(tenantAppMenuItemTbl) {
				tenantAppMenuItemTbl.uuid('id').notNullable().primary().defaultTo(knex.raw('uuid_generate_v4()'));
				tenantAppMenuItemTbl.uuid('tenant_application').notNullable();
				tenantAppMenuItemTbl.uuid('tenant_application_menu').notNullable();
				tenantAppMenuItemTbl.uuid('tenant_application_screen');
				tenantAppMenuItemTbl.uuid('parent').references('id').inTable('tenant_application_menu_items').onDelete('CASCADE').onUpdate('CASCADE');
				tenantAppMenuItemTbl.text('display_text').notNullable();
				tenantAppMenuItemTbl.text('description');
				tenantAppMenuItemTbl.boolean('is_home').notNullable().defaultTo(false);
				tenantAppMenuItemTbl.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
				tenantAppMenuItemTbl.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
				tenantAppMenuItemTbl.unique(['parent', 'display_text']);

//				tenantAppMenuItemTbl.foreign(['tenant_application', 'tenant_application_menu']).references(['tenant_application', 'id']).inTable('tenant_application_menus').onDelete('CASCADE').onUpdate('CASCADE');
//				tenantAppMenuItemTbl.foreign(['tenant_application', 'tenant_application_screen']).references(['tenant_application', 'id']).inTable('tenant_application_screens').onDelete('CASCADE').onUpdate('CASCADE');
			})
		]);
	})
	// Step 7: Setup user-defined functions on Modules table
	.then(function() {
		return Promise.all([
			knex.schema.withSchema('public')
			.raw(
				'CREATE FUNCTION public.fn_get_module_ancestors (IN moduleid uuid) ' +
					'RETURNS TABLE ( level integer,  id uuid,  parent uuid,  name text,  type public.module_type) ' +
					'LANGUAGE plpgsql ' +
					'VOLATILE  ' +
					'CALLED ON NULL INPUT ' +
					'SECURITY INVOKER ' +
					'COST 1 ' +
					'AS $$ ' +
				'BEGIN ' +
					'RETURN QUERY ' +
					'WITH RECURSIVE q AS ( ' +
						'SELECT ' +
							'1 AS level, ' +
							'A.id, ' +
							'A.parent, ' +
							'A.name, ' +
							'A.type ' +
						'FROM ' +
							'modules A ' +
						'WHERE ' +
							'A.id = moduleid ' +
						'UNION ALL ' +
						'SELECT ' +
							'q.level + 1, ' +
							'B.id, ' +
							'B.parent, ' +
							'B.name, ' +
							'B.type ' +
						'FROM ' +
							'q, ' +
							'modules B ' +
						'WHERE ' +
							'B.id = q.parent ' +
					') ' +
					'SELECT DISTINCT ' +
						'q.level, ' +
						'q.id, ' +
						'q.parent, ' +
						'q.name, ' +
						'q.type ' +
					'FROM ' +
						'q ' +
					'ORDER BY ' +
						'q.level, ' +
						'q.parent; ' +
				'END; ' +
				'$$;'
			),
			knex.schema.withSchema('public')
			.raw(
				'CREATE FUNCTION public.fn_is_module_enabled (IN moduleid uuid) ' +
					'RETURNS boolean ' +
					'LANGUAGE plpgsql ' +
					'VOLATILE ' +
					'CALLED ON NULL INPUT ' +
					'SECURITY INVOKER ' +
					'COST 1 ' +
					'AS $$ ' +
				'DECLARE ' +
					'is_disabled	integer; ' +
				'BEGIN ' +
					'SELECT ' +
						'COUNT(id) ' +
					'FROM ' +
						'modules ' +
					'WHERE ' +
						'id IN  (SELECT id FROM fn_get_module_ancestors(moduleid)) AND ' +
						'enabled = false ' +
					'INTO ' +
						'is_disabled; ' +
					'RETURN is_disabled <= 0; ' +
				'END; ' +
				'$$;'
			),
			knex.schema.withSchema('public')
			.raw(
				'CREATE FUNCTION public.fn_get_module_descendants (IN moduleid uuid) ' +
					'RETURNS TABLE ( level integer,  id uuid,  parent uuid,  name text,  type public.module_type, enabled boolean ) ' +
					'LANGUAGE plpgsql ' +
					'VOLATILE  ' +
					'CALLED ON NULL INPUT ' +
					'SECURITY INVOKER ' +
					'COST 1 ' +
					'AS $$ ' +
				'BEGIN ' +
					'RETURN QUERY ' +
					'WITH RECURSIVE q AS ( ' +
						'SELECT ' +
							'1 AS level, ' +
							'A.id, ' +
							'A.parent, ' +
							'A.name, ' +
							'A.type, ' +
							'fn_is_module_enabled(A.id) AS enabled ' +
						'FROM ' +
							'modules A ' +
						'WHERE ' +
							'A.id = moduleid ' +
						'UNION ALL ' +
						'SELECT ' +
							'q.level + 1, ' +
							'B.id, ' +
							'B.parent, ' +
							'B.name, ' +
							'B.type, ' +
							'fn_is_module_enabled(B.id) AS enabled ' +
						'FROM ' +
							'q, ' +
							'modules B ' +
						'WHERE ' +
							'B.parent = q.id ' +
					') ' +
					'SELECT DISTINCT ' +
						'q.level, ' +
						'q.id, ' +
						'q.parent, ' +
						'q.name, ' +
						'q.type, ' +
						'q.enabled ' +
					'FROM ' +
						'q ' +
					'ORDER BY ' +
						'q.level, ' +
						'q.parent; ' +
				'END; ' +
				'$$;'
			),
			knex.schema.withSchema('public')
			.raw(
				'CREATE FUNCTION public.fn_check_module_upsert_is_valid () ' +
					'RETURNS trigger ' +
					'LANGUAGE plpgsql ' +
					'VOLATILE  ' +
					'CALLED ON NULL INPUT ' +
					'SECURITY INVOKER ' +
					'COST 1 ' +
					'AS $$ ' +

				'DECLARE ' +
					'parent_module_type	TEXT; ' +
					'is_module_in_tree	INTEGER; ' +
				'BEGIN ' +
					'IF TG_OP = \'UPDATE\' ' +
					'THEN ' +
						'IF OLD.name <> NEW.name ' +
						'THEN ' +
							'RAISE SQLSTATE \'2F003\' USING MESSAGE = \'Module name is NOT mutable\'; ' +
							'RETURN NULL; ' +
						'END IF; ' +

						'IF OLD.type <> NEW.type ' +
						'THEN ' +
							'RAISE SQLSTATE \'2F003\' USING MESSAGE = \'Module type is NOT mutable\'; ' +
							'RETURN NULL; ' +
						'END IF; ' +
					'END IF; ' +

					'IF NEW.type = \'server\' AND NEW.parent IS NULL ' +
					'THEN ' +
						'RETURN NEW; ' +
					'END IF; ' +

					'IF NEW.type = \'server\' AND NEW.parent IS NOT NULL ' +
					'THEN ' +
						'RAISE SQLSTATE \'2F003\' USING MESSAGE = \'Server Modules cannot have parents\' ; ' +
						'RETURN NULL; ' +
					'END IF; ' +

					'IF NEW.type <> \'server\' AND NEW.parent IS NULL ' +
					'THEN ' +
						'RAISE SQLSTATE \'2F003\' USING MESSAGE = \'Only Server Modules cannot have parents - all other module types must belong to a Server\' ; ' +
						'RETURN NULL; ' +
					'END IF; ' +

					'parent_module_type := \'\'; ' +
					'SELECT ' +
						'type ' +
					'FROM ' +
						'modules ' +
					'WHERE ' +
						'id = NEW.parent ' +
					'INTO ' +
						'parent_module_type; ' +

					'IF parent_module_type = \'template\' ' +
					'THEN ' +
						'RAISE SQLSTATE \'2F003\' USING MESSAGE = \'Only Server Templates cannot have sub-modules\' ; ' +
						'RETURN NULL; ' +
					'END IF; ' +

					'IF parent_module_type = \'service\' AND NEW.type <> \'service\' ' +
					'THEN ' +
						'RAISE SQLSTATE \'2F003\' USING MESSAGE = \'Services cannot have sub-modules other than Services\' ; ' +
						'RETURN NULL; ' +
					'END IF; ' +

					'IF NEW.id = NEW.parent ' +
					'THEN ' +
						'RAISE SQLSTATE \'2F003\' USING MESSAGE = \'Module cannot be its own parent\'; ' +
						'RETURN NULL; ' +
					'END IF; ' +

					'is_module_in_tree := 0; ' +
					'SELECT ' +
						'COUNT(id) ' +
					'FROM ' +
						'fn_get_module_ancestors(NEW.parent) ' +
					'WHERE ' +
						'id = NEW.id ' +
					'INTO ' +
						'is_module_in_tree; ' +

					'IF is_module_in_tree > 0 ' +
					'THEN ' +
						'RAISE SQLSTATE \'2F003\' USING MESSAGE = \'Module cannot be its own ancestor\'; ' +
						'RETURN NULL; ' +
					'END IF; ' +

					'is_module_in_tree := 0; ' +
					'SELECT ' +
						'COUNT(id) ' +
					'FROM ' +
						'fn_get_module_descendants(NEW.id) ' +
					'WHERE ' +
						'id = NEW.id AND ' +
						'level > 1 ' +
					'INTO ' +
						'is_module_in_tree; ' +

					'IF is_module_in_tree > 0 ' +
					'THEN ' +
						'RAISE SQLSTATE \'2F003\' USING MESSAGE = \'Module cannot be its own descendant\'; ' +
						'RETURN NULL; ' +
					'END IF; ' +

					'RETURN NEW; ' +
				'END; ' +
				'$$;'
			),
			knex.schema.withSchema('public')
			.raw(
				'CREATE FUNCTION public.fn_notify_config_change () ' +
					'RETURNS trigger ' +
					'LANGUAGE plpgsql ' +
					'VOLATILE ' +
					'CALLED ON NULL INPUT ' +
					'SECURITY INVOKER ' +
					'COST 1 ' +
					'AS $$ ' +

				'BEGIN ' +
					'IF OLD.configuration = NEW.configuration AND OLD.enabled = NEW.enabled ' +
					'THEN ' +
						'RETURN NEW; ' +
					'END IF; ' +

					'IF OLD.configuration <> NEW.configuration ' +
					'THEN ' +
						'PERFORM pg_notify(\'twyr-config-change\', CAST(NEW.id AS text)); ' +
					'END IF; ' +

					'IF OLD.enabled <> NEW.enabled ' +
					'THEN ' +
						'PERFORM pg_notify(\'twyr-state-change\', CAST(NEW.id AS text)); ' +
					'END IF; ' +

					'RETURN NEW; ' +
				'END; ' +
				'$$;'
			),
			knex.schema.withSchema('public')
			.raw(
				'CREATE FUNCTION public.fn_assign_module_to_tenant () ' +
					'RETURNS trigger ' +
					'LANGUAGE plpgsql ' +
					'VOLATILE  ' +
					'CALLED ON NULL INPUT ' +
					'SECURITY INVOKER ' +
					'COST 1 ' +
					'AS $$ ' +

				'BEGIN ' +
					'IF NEW.type <> \'component\' AND NEW.type <> \'server\' ' +
					'THEN ' +
						'RETURN NEW; ' +
					'END IF; ' +

					'IF NEW.admin_only = false OR NEW.type = \'server\' ' +
					'THEN ' +
						'INSERT INTO tenants_modules ( ' +
							'tenant, ' +
							'module ' +
						') ' +
						'SELECT ' +
							'id, ' +
							'NEW.id ' +
						'FROM ' +
							'tenants; ' +
					'END IF; ' +

					'IF NEW.admin_only = true AND NEW.type <> \'server\' ' +
					'THEN ' +
						'INSERT INTO tenants_modules ( ' +
							'tenant, ' +
							'module ' +
						') ' +
						'SELECT ' +
							'id, ' +
							'NEW.id ' +
						'FROM ' +
							'tenants ' +
						'WHERE ' +
							'sub_domain = \'www\'; ' +
					'END IF; ' +

					'RETURN NEW; ' +
				'END; ' +
				'$$;'
			)
		]);
	})
	// Step 8: Setup user-defined functions on Tenants table
	.then(function() {
		return Promise.all([
			knex.schema.withSchema('public')
			.raw(
				'CREATE FUNCTION public.fn_assign_defaults_to_tenant () ' +
					'RETURNS trigger ' +
					'LANGUAGE plpgsql ' +
					'VOLATILE  ' +
					'CALLED ON NULL INPUT ' +
					'SECURITY INVOKER ' +
					'COST 1 ' +
					'AS $$ ' +
				'DECLARE ' +
					'admin_group_id		UUID; ' +
					'user_group_id		UUID; ' +
					'tenant_app_id		UUID; ' +
					'app_category_id	UUID; ' +
				'BEGIN ' +
					'INSERT INTO tenant_groups ( ' +
						'parent, ' +
						'tenant, ' +
						'name, ' +
						'display_name, ' +
						'description ' +
					') ' +
					'VALUES ( ' +
						'NULL, ' +
						'NEW.id, ' +
						'\'administrators\', ' +
						'NEW.name || \' Administrators\', ' +
						'\'The Administrator Group for \' || NEW.name ' +
					') ' +
					'RETURNING ' +
						'id ' +
					'INTO ' +
						'admin_group_id; ' +

					'INSERT INTO tenant_groups ( ' +
						'parent, ' +
						'tenant, ' +
						'name, ' +
						'display_name, ' +
						'description, ' +
						'default_for_new_user ' +
					') ' +
					'VALUES ( ' +
						'admin_group_id, ' +
						'NEW.id, ' +
						'\'users\', ' +
						'NEW.name || \' Users\', ' +
						'\'All Users Group for \' || NEW.name, ' +
						'true ' +
					') ' +
					'RETURNING ' +
						'id ' +
					'INTO ' +
						'user_group_id; ' +

					'IF NEW.sub_domain = \'www\' ' +
					'THEN ' +
						'INSERT INTO tenants_modules ( ' +
							'tenant, ' +
							'module ' +
						') ' +
						'SELECT ' +
							'NEW.id, ' +
							'id ' +
						'FROM ' +
							'modules ' +
						'WHERE ' +
							'type = \'server\' OR type = \'component\' ; ' +
					'END IF; ' +

					'IF NEW.sub_domain <> \'www\' ' +
					'THEN ' +
						'INSERT INTO tenants_modules ( ' +
							'tenant, ' +
							'module ' +
						') ' +
						'SELECT ' +
							'NEW.id, ' +
							'id ' +
						'FROM ' +
							'modules ' +
						'WHERE ' +
							'type = \'server\' OR ' +
							'(type = \'component\' AND admin_only = false); ' +
					'END IF; ' +

					'tenant_app_id := NULL; ' +
					'INSERT INTO tenant_applications( ' +
						'tenant, ' +
						'name, ' +
						'media, ' +
						'is_default ' +
					') ' +
					'VALUES ( ' +
						'NEW.id, ' +
						'\'Home\', ' +
						'\'desktop\', ' +
						'true ' +
					') ' +
					'RETURNING ' +
						'id ' +
					'INTO ' +
						'tenant_app_id; ' +

					'INSERT INTO tenant_application_screens( ' +
						'tenant_application, ' +
						'name ' +
					') ' +
					'VALUES( ' +
						'tenant_app_id, ' +
						'\'Screen 1\' ' +
					'); ' +

					'tenant_app_id := NULL; ' +
					'INSERT INTO tenant_applications( ' +
						'tenant, ' +
						'name, ' +
						'media, ' +
						'is_default ' +
					') ' +
					'VALUES ( ' +
						'NEW.id, ' +
						'\'Home\', ' +
						'\'tablet\', ' +
						'true ' +
					') ' +
					'RETURNING ' +
						'id ' +
					'INTO ' +
						'tenant_app_id; ' +

					'INSERT INTO tenant_application_screens( ' +
						'tenant_application, ' +
						'name ' +
					') ' +
					'VALUES( ' +
						'tenant_app_id, ' +
						'\'Screen 1\' ' +
					'); ' +

					'tenant_app_id := NULL; ' +
					'INSERT INTO tenant_applications( ' +
						'tenant, ' +
						'name, ' +
						'media, ' +
						'is_default ' +
					') ' +
					'VALUES ( ' +
						'NEW.id, ' +
						'\'Home\', ' +
						'\'phone\', ' +
						'true ' +
					') ' +
					'RETURNING ' +
						'id ' +
					'INTO ' +
						'tenant_app_id; ' +

					'INSERT INTO tenant_application_screens( ' +
						'tenant_application, ' +
						'name ' +
					') ' +
					'VALUES( ' +
						'tenant_app_id, ' +
						'\'Screen 1\' ' +
					'); ' +

					'INSERT INTO tenant_group_permissions ( ' +
						'tenant, ' +
						'tenant_group, ' +
						'module, ' +
						'permission ' +
					') ' +
					'SELECT ' +
						'NEW.id, ' +
						'user_group_id, ' +
						'module, ' +
						'permission ' +
					'FROM ' +
						'tenant_group_permissions ' +
					'WHERE ' +
						'tenant_group = (SELECT id FROM tenant_groups WHERE tenant = (SELECT id FROM tenants WHERE sub_domain = \'www\') AND default_for_new_user = true) ' +
					'ON CONFLICT ' +
						'DO NOTHING; ' +

					'IF NEW.sub_domain = \'www\' ' +
					'THEN ' +
						'INSERT INTO tenants_server_templates( ' +
							'tenant, ' +
							'server_template ' +
						') ' +
						'SELECT ' +
							'NEW.id, ' +
							'id ' +
						'FROM ' +
							'server_templates; ' +
					'END IF; ' +

					'IF NEW.sub_domain <> \'www\' ' +
					'THEN ' +
						'INSERT INTO tenants_server_templates( ' +
							'tenant, ' +
							'server_template ' +
						') ' +
						'SELECT ' +
							'NEW.id, ' +
							'server_template ' +
						'FROM ' +
							'tenants_server_templates ' +
						'WHERE ' +
							'tenant = (SELECT id FROM tenants WHERE sub_domain=\'www\'); ' +
					'END IF; ' +

					'INSERT INTO ' +
						'tenant_folders (tenant, name) ' +
					'VALUES ' +
						'(NEW.id, \'Application Categories\') ' +
					'RETURNING ' +
						'id ' +
					'INTO ' +
						'app_category_id; ' +

					'INSERT INTO ' +
						'tenant_application_categories (tenant, tenant_application, tenant_folder) ' +
					'SELECT ' +
						'tenant, ' +
						'id, ' +
						'app_category_id ' +
					'FROM ' +
						'tenant_applications ' +
					'WHERE ' +
						'tenant = NEW.id; ' +

					'RETURN NEW; ' +
				'END; ' +
				'$$;'
			)
		]);
	})
	// Step 9: Setup user-defined functions on Users table
	.then(function() {
		return Promise.all([
			knex.schema.withSchema('public')
			.raw(
				'CREATE FUNCTION public.fn_get_user_permissions (IN tenantsubdomain text, IN userid uuid) ' +
				'RETURNS TABLE (permission uuid) ' +
				'LANGUAGE plpgsql ' +
				'VOLATILE  ' +
				'CALLED ON NULL INPUT ' +
				'SECURITY INVOKER ' +
				'COST 1 ' +
				'AS $$ ' +
				'BEGIN ' +
					'RETURN QUERY ' +
					'SELECT DISTINCT ' +
						'A.permission ' +
					'FROM ' +
						'tenant_group_permissions A ' +
					'WHERE ' +
						'A.tenant_group IN ( ' +
							'SELECT ' +
								'B.tenant_group ' +
							'FROM ' +
								'tenants_users_groups B ' +
							'WHERE ' +
								'B.tenant_user IN ( ' +
									'SELECT ' +
										'C.id ' +
									'FROM ' +
										'tenants_users C ' +
									'WHERE ' +
										'C.login = userid AND ' +
										'C.tenant = (SELECT id FROM tenants WHERE sub_domain = tenantsubdomain) ' +
								') ' +
							'); ' +
				'END; ' +
				'$$;'
			)
		]);
	})
	// Step 10: Setup user-defined functions on Server Templates table
	.then(function() {
		return Promise.all([
			knex.schema.withSchema('public')
			.raw(
				'CREATE FUNCTION public.fn_check_server_template_upsert_is_valid () ' +
					'RETURNS trigger ' +
					'LANGUAGE plpgsql ' +
					'VOLATILE ' +
					'CALLED ON NULL INPUT ' +
					'SECURITY INVOKER ' +
					'COST 1 ' +
					'AS $$ ' +
				'DECLARE ' +
					'is_template	INTEGER; ' +
				'BEGIN ' +
					'is_template := 0; ' +
					'SELECT ' +
						'count(id) ' +
					'FROM ' +
						'modules ' +
					'WHERE ' +
						'id = NEW.module AND ' +
						'type = \'template\' ' +
					'INTO ' +
						'is_template; ' +

					'IF is_template = 0 ' +
					'THEN ' +
						'RAISE SQLSTATE \'2F003\' USING MESSAGE = \'This table is only for Server Templates\' ; ' +
						'RETURN NULL; ' +
					'END IF; ' +

					'RETURN NEW; ' +
				'END; ' +
				'$$; '
			)
		]);
	})
	// Step 11: Setup user-defined functions on Permissions table
	.then(function() {
		return Promise.all([
			knex.schema.withSchema('public')
			.raw(
				'CREATE FUNCTION public.fn_check_permission_insert_is_valid () ' +
					'RETURNS trigger ' +
					'LANGUAGE plpgsql ' +
					'VOLATILE ' +
					'CALLED ON NULL INPUT ' +
					'SECURITY INVOKER ' +
					'COST 1 ' +
					'AS $$ ' +

				'DECLARE ' +
					'is_component	INTEGER; ' +
				'BEGIN ' +
					'SELECT ' +
						'count(id) ' +
					'FROM ' +
						'modules ' +
					'WHERE ' +
						'id = NEW.module AND ' +
						'(type = \'component\' OR type = \'server\') ' +
					'INTO ' +
						'is_component; ' +

					'IF is_component <= 0 ' +
					'THEN ' +
						'RAISE SQLSTATE \'2F003\' USING MESSAGE = \'Permissions can be defined only for Servers and Components, and not for other types of modules\'; ' +
						'RETURN NULL; ' +
					'END IF; ' +

					'RETURN NEW; ' +
				'END; ' +
				'$$;'
			),
			knex.schema.withSchema('public')
			.raw(
				'CREATE FUNCTION public.fn_check_permission_update_is_valid () ' +
					'RETURNS trigger ' +
					'LANGUAGE plpgsql ' +
					'VOLATILE ' +
					'CALLED ON NULL INPUT ' +
					'SECURITY INVOKER ' +
					'COST 1 ' +
					'AS $$ ' +

				'BEGIN ' +
					'IF OLD.module <> NEW.module ' +
					'THEN ' +
						'RAISE SQLSTATE \'2F003\' USING MESSAGE = \'Module assigned to a permission is NOT mutable\'; ' +
						'RETURN NULL; ' +
					'END IF; ' +

					'IF OLD.name <> NEW.name ' +
					'THEN ' +
						'RAISE SQLSTATE \'2F003\' USING MESSAGE = \'Permission name is NOT mutable\'; ' +
						'RETURN NULL; ' +
					'END IF; ' +

					'RETURN NEW; ' +
				'END; ' +
				'$$;'
			),
			knex.schema.withSchema('public')
			.raw(
				'CREATE FUNCTION public.fn_assign_permission_to_tenants () ' +
					'RETURNS trigger ' +
					'LANGUAGE plpgsql ' +
					'VOLATILE  ' +
					'CALLED ON NULL INPUT ' +
					'SECURITY INVOKER ' +
					'COST 1 ' +
					'AS $$ ' +
				'BEGIN ' +
					'INSERT INTO tenant_group_permissions ( ' +
						'tenant, ' +
						'tenant_group, ' +
						'module, ' +
						'permission ' +
					') ' +
					'SELECT ' +
						'A.tenant, ' +
						'B.id, ' +
						'A.module, ' +
						'NEW.id ' +
					'FROM ' +
						'tenants_modules A ' +
						'INNER JOIN tenant_groups B ON (A.tenant = B.tenant) ' +
					'WHERE ' +
						'A.module = NEW.module AND ' +
						'B.parent IS NULL; ' +

					'RETURN NEW; ' +
				'END; ' +
				'$$;'
			)
		]);
	})
	// Step 12: Setup user-defined functions on Tenant Modules table
	.then(function() {
		return Promise.all([
			knex.schema.withSchema('public')
			.raw(
				'CREATE FUNCTION public.fn_check_tenant_module_upsert_is_valid () ' +
					'RETURNS trigger ' +
					'LANGUAGE plpgsql ' +
					'VOLATILE  ' +
					'CALLED ON NULL INPUT ' +
					'SECURITY INVOKER ' +
					'COST 1 ' +
					'AS $$ ' +

				'DECLARE ' +
					'is_component	INTEGER; ' +
					'component_parent	UUID; ' +
					'is_admin_only	BOOLEAN; ' +
					'tenant_sub_domain	TEXT; ' +
				'BEGIN ' +
					'is_component := 0; ' +
					'SELECT ' +
						'count(id) ' +
					'FROM ' +
						'modules ' +
					'WHERE ' +
						'id = NEW.module AND ' +
						'(type = \'component\' OR type = \'server\') ' +
					'INTO ' +
						'is_component; ' +

					'IF is_component <= 0 ' +
					'THEN ' +
						'RAISE SQLSTATE \'2F003\' USING MESSAGE = \'Only Servers and Components can be mapped to tenants\'; ' +
						'RETURN NULL; ' +
					'END IF; ' +

					'component_parent := NULL; ' +
					'SELECT  ' +
						'parent ' +
					'FROM ' +
						'modules ' +
					'WHERE ' +
						'id = NEW.module ' +
					'INTO ' +
						'component_parent; ' +

					'IF component_parent IS NULL ' +
					'THEN ' +
						'RETURN NEW; ' +
					'END IF; ' +

					'IF component_parent IS NOT NULL ' +
					'THEN ' +
						'is_component := 0; ' +
						'SELECT ' +
							'count(id) ' +
						'FROM ' +
							'tenants_modules ' +
						'WHERE ' +
							'tenant = NEW.tenant AND ' +
							'module = component_parent ' +
						'INTO ' +
							'is_component; ' +

						'IF is_component = 0 ' +
						'THEN ' +
							'RAISE WARNING SQLSTATE \'2F003\' USING MESSAGE = \'Parent component not mapped to this Tenant\'; ' +
						'END IF; ' +
					'END IF; ' +

					'is_admin_only := false; ' +
					'SELECT ' +
						'admin_only ' +
					'FROM ' +
						'modules ' +
					'WHERE ' +
						'id = NEW.module ' +
					'INTO ' +
						'is_admin_only; ' +

					'IF is_admin_only = false ' +
					'THEN ' +
						'RETURN NEW; ' +
					'END IF; ' +

					'tenant_sub_domain := \'\'; ' +
					'SELECT ' +
						'sub_domain ' +
					'FROM ' +
						'tenants ' +
					'WHERE ' +
						'id = NEW.tenant ' +
					'INTO ' +
						'tenant_sub_domain; ' +

					'IF tenant_sub_domain <> \'www\' ' +
					'THEN ' +
						'RAISE SQLSTATE \'2F003\' USING MESSAGE = \'Admin only components can be mapped only to root tenant\'; ' +
						'RETURN NULL; ' +
					'END IF; ' +

					'RETURN NEW; ' +
				'END; ' +
				'$$;'
			),
			knex.schema.withSchema('public')
			.raw(
				'CREATE FUNCTION public.fn_assign_permission_to_tenant_group () ' +
					'RETURNS trigger ' +
					'LANGUAGE plpgsql ' +
					'VOLATILE  ' +
					'CALLED ON NULL INPUT ' +
					'SECURITY INVOKER ' +
					'COST 1 ' +
					'AS $$ ' +

				'DECLARE ' +
					'tenant_root_tenant_group	UUID; ' +
				'BEGIN ' +
					'tenant_root_tenant_group := NULL; ' +
					'SELECT ' +
						'id ' +
					'FROM ' +
						'tenant_groups ' +
					'WHERE ' +
						'tenant = NEW.tenant AND ' +
						'parent IS NULL ' +
					'INTO ' +
						'tenant_root_tenant_group; ' +

					'IF tenant_root_tenant_group IS NULL ' +
					'THEN ' +
						'RETURN NEW; ' +
					'END IF; ' +

					'INSERT INTO tenant_group_permissions( ' +
						'tenant, ' +
						'tenant_group, ' +
						'module, ' +
						'permission ' +
					') ' +
					'SELECT ' +
						'NEW.tenant, ' +
						'tenant_root_tenant_group, ' +
						'module, ' +
						'id ' +
					'FROM ' +
						'component_permissions ' +
					'WHERE ' +
						'module = NEW.module; ' +

					'RETURN NEW; ' +
				'END; ' +
				'$$;'
			),
			knex.schema.withSchema('public')
			.raw(
				'CREATE FUNCTION public.fn_remove_descendant_module_from_tenant () ' +
					'RETURNS trigger ' +
					'LANGUAGE plpgsql ' +
					'VOLATILE  ' +
					'CALLED ON NULL INPUT ' +
					'SECURITY INVOKER ' +
					'COST 1 ' +
					'AS $$ ' +

				'BEGIN ' +
					'DELETE FROM ' +
						'tenants_modules ' +
					'WHERE ' +
						'tenant = OLD.tenant AND ' +
						'module IN (SELECT id FROM fn_get_module_descendants(OLD.module) WHERE level = 2); ' +

					'RETURN OLD; ' +
				'END; ' +
				'$$;'
			)
		]);
	})
	// Step 13: Setup user-defined functions on Groups & Group Permissions table
	.then(function() {
		return Promise.all([
			knex.schema.withSchema('public')
			.raw(
				'CREATE FUNCTION public.fn_get_group_ancestors (IN groupid uuid) ' +
					'RETURNS TABLE (level integer,  id uuid,  parent uuid,  name text) ' +
					'LANGUAGE plpgsql ' +
					'VOLATILE  ' +
					'CALLED ON NULL INPUT ' +
					'SECURITY INVOKER ' +
					'COST 1 ' +
					'AS $$ ' +
				'BEGIN ' +
					'RETURN QUERY ' +
					'WITH RECURSIVE q AS ( ' +
						'SELECT ' +
							'1 AS level, ' +
							'A.id, ' +
							'A.parent, ' +
							'A.name ' +
						'FROM ' +
							'tenant_groups A ' +
						'WHERE ' +
							'A.id = groupid ' +
						'UNION ALL ' +
						'SELECT ' +
							'q.level + 1, ' +
							'B.id, ' +
							'B.parent, ' +
							'B.name ' +
						'FROM ' +
							'q, ' +
							'tenant_groups B ' +
						'WHERE ' +
							'B.id = q.parent ' +
					') ' +
					'SELECT DISTINCT ' +
						'q.level, ' +
						'q.id, ' +
						'q.parent, ' +
						'q.name ' +
					'FROM ' +
						'q ' +
					'ORDER BY ' +
						'q.level, ' +
						'q.parent; ' +
				'END; ' +
				'$$;'
			),
			knex.schema.withSchema('public')
			.raw(
				'CREATE FUNCTION public.fn_get_group_descendants (IN groupid uuid) ' +
					'RETURNS TABLE (level integer,  id uuid,  parent uuid,  name text) ' +
					'LANGUAGE plpgsql ' +
					'VOLATILE  ' +
					'CALLED ON NULL INPUT ' +
					'SECURITY INVOKER ' +
					'COST 1 ' +
					'AS $$ ' +
				'BEGIN ' +
					'RETURN QUERY ' +
					'WITH RECURSIVE q AS ( ' +
						'SELECT ' +
							'1 AS level, ' +
							'A.id, ' +
							'A.parent, ' +
							'A.name ' +
						'FROM ' +
							'tenant_groups A ' +
						'WHERE ' +
							'A.id = groupid ' +
						'UNION ALL ' +
						'SELECT ' +
							'q.level + 1, ' +
							'B.id, ' +
							'B.parent, ' +
							'B.name ' +
						'FROM ' +
							'q, ' +
							'tenant_groups B ' +
						'WHERE ' +
							'B.parent = q.id ' +
					') ' +
					'SELECT DISTINCT ' +
						'q.level, ' +
						'q.id, ' +
						'q.parent, ' +
						'q.name ' +
					'FROM ' +
						'q ' +
					'ORDER BY ' +
						'q.level, ' +
						'q.parent; ' +
				'END; ' +
				'$$;'
			),
			knex.schema.withSchema('public')
			.raw(
				'CREATE FUNCTION public.fn_check_group_update_is_valid () ' +
					'RETURNS trigger ' +
					'LANGUAGE plpgsql ' +
					'VOLATILE ' +
					'CALLED ON NULL INPUT ' +
					'SECURITY INVOKER ' +
					'COST 1 ' +
					'AS $$ ' +

				'BEGIN ' +
					'IF OLD.parent <> NEW.parent ' +
					'THEN ' +
						'RAISE SQLSTATE \'2F003\' USING MESSAGE = \'Group cannot change parent\'; ' +
						'RETURN NULL; ' +
					'END IF; ' +

					'RETURN NEW; ' +
				'END; ' +
				'$$;'
			),
			knex.schema.withSchema('public')
			.raw(
				'CREATE FUNCTION public.fn_check_group_permission_insert_is_valid () ' +
					'RETURNS trigger ' +
					'LANGUAGE plpgsql ' +
					'VOLATILE  ' +
					'CALLED ON NULL INPUT ' +
					'SECURITY INVOKER ' +
					'COST 1 ' +
					'AS $$ ' +
				'DECLARE ' +
					'parent_tenant_group					UUID; ' +
					'does_parent_group_have_permission	INTEGER; ' +
				'BEGIN ' +
					'parent_tenant_group := NULL; ' +
					'SELECT ' +
						'parent ' +
					'FROM ' +
						'tenant_groups ' +
					'WHERE ' +
						'id = NEW.tenant_group ' +
					'INTO ' +
						'parent_tenant_group; ' +

					'IF parent_tenant_group IS NULL ' +
					'THEN ' +
						'RETURN NEW; ' +
					'END IF; ' +

					'does_parent_group_have_permission := 0; ' +
					'SELECT ' +
						'count(id) ' +
					'FROM ' +
						'tenant_group_permissions ' +
					'WHERE ' +
						'tenant_group = parent_tenant_group AND ' +
						'permission = NEW.permission ' +
					'INTO ' +
						'does_parent_group_have_permission; ' +

					'IF does_parent_group_have_permission > 0 ' +
					'THEN ' +
						'RETURN NEW; ' +
					'END IF; ' +

					'RAISE SQLSTATE \'2F003\' USING MESSAGE = \'Parent Group does not have this permission\'; ' +
					'RETURN NULL; ' +
				'END; ' +
				'$$;'
			),
			knex.schema.withSchema('public')
			.raw(
				'CREATE FUNCTION public.fn_remove_group_permission_from_descendants () ' +
					'RETURNS trigger ' +
					'LANGUAGE plpgsql ' +
					'VOLATILE  ' +
					'CALLED ON NULL INPUT ' +
					'SECURITY INVOKER ' +
					'COST 1 ' +
					'AS $$ ' +

				'BEGIN ' +
					'DELETE FROM ' +
						'tenant_group_permissions ' +
					'WHERE ' +
						'tenant_group IN (SELECT id FROM fn_get_group_descendants(OLD.tenant_group) WHERE level = 2) AND ' +
						'permission = OLD.permission; ' +

					'RETURN OLD; ' +
				'END; ' +
				'$$;'
			)
		]);
	})
	// Step 14: Setup user-defined functions on Tenants Users table
	.then(function() {
		return Promise.all([
			knex.schema.withSchema('public')
			.raw(
				'CREATE FUNCTION public.fn_assign_default_group_to_tenant_user () ' +
					'RETURNS trigger ' +
					'LANGUAGE plpgsql ' +
					'VOLATILE  ' +
					'CALLED ON NULL INPUT ' +
					'SECURITY INVOKER ' +
					'COST 1 ' +
					'AS $$ ' +

				'DECLARE ' +
					'default_tenant_group	UUID; ' +
				'BEGIN ' +
					'default_tenant_group := NULL; ' +
					'SELECT ' +
						'id ' +
					'FROM ' +
						'tenant_groups ' +
					'WHERE ' +
						'tenant = NEW.tenant AND ' +
						'default_for_new_user = true ' +
					'INTO ' +
						'default_tenant_group; ' +

					'IF default_tenant_group IS NULL ' +
					'THEN ' +
						'RETURN NEW; ' +
					'END IF; ' +

					'INSERT INTO tenants_users_groups ( ' +
						'tenant, ' +
						'tenant_group, ' +
						'tenant_user ' +
					') ' +
					'VALUES ( ' +
						'NEW.tenant, ' +
						'default_tenant_group, ' +
						'NEW.id ' +
					'); ' +

					'RETURN NEW; ' +
				'END; ' +
				'$$;'
			),
			knex.schema.withSchema('public')
			.raw(
				'CREATE FUNCTION public.fn_check_tenant_user_upsert_is_valid () ' +
					'RETURNS trigger ' +
					'LANGUAGE plpgsql ' +
					'VOLATILE  ' +
					'CALLED ON NULL INPUT ' +
					'SECURITY INVOKER ' +
					'COST 1 ' +
					'AS $$ ' +
				'DECLARE ' +
					'is_valid_default_tenant_application	INTEGER; ' +
					'is_valid_default_server_application	INTEGER; ' +
				'BEGIN ' +
					'IF TG_OP = \'UPDATE\' ' +
					'THEN ' +
						'IF OLD.tenant <> NEW.tenant ' +
						'THEN ' +
							'RAISE SQLSTATE \'2F003\' USING MESSAGE = \'Tenant is NOT mutable\'; ' +
							'RETURN NULL; ' +
						'END IF; ' +

						'IF OLD.login <> NEW.login ' +
						'THEN ' +
							'RAISE SQLSTATE \'2F003\' USING MESSAGE = \'Login is NOT mutable\'; ' +
							'RETURN NULL; ' +
						'END IF; ' +
					'END IF; ' +

					'IF NEW.default_tenant_application IS NOT NULL ' +
					'THEN ' +
						'is_valid_default_tenant_application := 0; ' +
						'is_valid_default_server_application := 0; ' +

						'SELECT ' +
							'count(id) ' +
						'FROM ' +
							'tenant_applications ' +
						'WHERE ' +
							'id = NEW.default_tenant_application AND ' +
							'tenant = NEW.tenant ' +
						'INTO ' +
							'is_valid_default_tenant_application; ' +

						'SELECT ' +
							'count(id) ' +
						'FROM ' +
							'server_applications ' +
						'WHERE ' +
							'id = NEW.default_tenant_application ' +
						'INTO ' +
							'is_valid_default_server_application; ' +

						'IF is_valid_default_tenant_application = 0 AND is_valid_default_server_application = 0 ' +
						'THEN ' +
							'RAISE SQLSTATE \'2F003\' USING MESSAGE = \'Invalid default application\'; ' +
							'RETURN NULL; ' +
						'END IF; ' +
					'END IF; ' +

					'RETURN NEW; ' +
				'END; ' +
				'$$;'
			)
		]);
	})
	// Step 15: Setup user-defined functions on Tenants Users Groups table
	.then(function() {
		return Promise.all([
			knex.schema.withSchema('public')
			.raw(
				'CREATE FUNCTION public.fn_check_tenant_user_group_upsert_is_valid () ' +
					'RETURNS trigger ' +
					'LANGUAGE plpgsql ' +
					'VOLATILE  ' +
					'CALLED ON NULL INPUT ' +
					'SECURITY INVOKER ' +
					'COST 1 ' +
					'AS $$ ' +
				'DECLARE ' +
					'is_member_of_ancestor_group	INTEGER; ' +
				'BEGIN ' +
					'is_member_of_ancestor_group := 0; ' +
					'SELECT ' +
						'count(id) ' +
					'FROM ' +
						'tenants_users_groups ' +
					'WHERE ' +
						'tenant = NEW.tenant AND ' +
						'tenant_group IN (SELECT id FROM fn_get_group_ancestors(NEW.tenant_group) WHERE level > 1) AND ' +
						'tenant_user = NEW.tenant_user ' +
					'INTO ' +
						'is_member_of_ancestor_group; ' +

					'IF is_member_of_ancestor_group = 0 ' +
					'THEN ' +
						'RETURN NEW; ' +
					'END IF; ' +

					'RAISE SQLSTATE \'2F003\' USING MESSAGE = \'User is already a member of a Parent Group\'; ' +
					'RETURN NULL; ' +
				'END; ' +
				'$$;'
			),
			knex.schema.withSchema('public')
			.raw(
				'CREATE FUNCTION public.fn_remove_descendant_group_from_tenant_user () ' +
					'RETURNS trigger ' +
					'LANGUAGE plpgsql ' +
					'VOLATILE  ' +
					'CALLED ON NULL INPUT ' +
					'SECURITY INVOKER ' +
					'COST 1 ' +
					'AS $$ ' +
				'BEGIN ' +
					'DELETE FROM ' +
						'tenants_users_groups ' +
					'WHERE ' +
						'tenant = NEW.tenant AND ' +
						'tenant_group IN (SELECT id FROM fn_get_group_descendants(NEW.tenant_group) WHERE level >= 2) AND ' +
						'tenant_user = NEW.tenant_user; ' +

					'RETURN NEW; ' +
				'END; ' +
				'$$;'
			)
		]);
	})
	// Step 16: Setup user-defined functions on Module Widgets table
	.then(function() {
		return Promise.all([
			knex.schema.withSchema('public')
			.raw(
				'CREATE FUNCTION public.fn_check_component_widget_upsert_is_valid () ' +
					'RETURNS trigger ' +
					'LANGUAGE plpgsql ' +
					'VOLATILE  ' +
					'CALLED ON NULL INPUT ' +
					'SECURITY INVOKER ' +
					'COST 1 ' +
					'AS $$ ' +

				'DECLARE ' +
					'is_component			INTEGER; ' +
					'is_permission_ok		INTEGER; ' +
				'BEGIN ' +
					'is_component := 0; ' +
					'SELECT ' +
						'count(id) ' +
					'FROM ' +
						'modules ' +
					'WHERE ' +
						'id = NEW.module AND ' +
						'(type = \'component\' OR type = \'server\') ' +
					'INTO ' +
						'is_component; ' +

					'IF is_component <= 0 ' +
					'THEN ' +
						'RAISE SQLSTATE \'2F003\' USING MESSAGE = \'Widgets can be assigned only to Servers and Components\'; ' +
						'RETURN NULL; ' +
					'END IF; ' +

					'is_permission_ok := 0; ' +
					'SELECT ' +
						'count(id) ' +
					'FROM ' +
						'component_permissions ' +
					'WHERE ' +
						'module IN (SELECT id FROM fn_get_module_ancestors(NEW.module)) AND ' +
						'id = NEW.permission ' +
					'INTO ' +
						'is_permission_ok; ' +

					'IF is_permission_ok <= 0 ' +
					'THEN ' +
						'RAISE SQLSTATE \'2F003\' USING MESSAGE = \'Widgets must use Permissions defined by the Component or one of its parents\'; ' +
						'RETURN NULL; ' +
					'END IF; ' +

					'RETURN NEW; ' +
				'END; ' +
				'$$;'
			)
		]);
	})
	// Step 17: Setup user-defined functions on Tenant Folders table
	.then(function() {
		return Promise.all([
			knex.schema.withSchema('public')
			.raw(
				'CREATE FUNCTION public.fn_get_folder_ancestors (IN folderid uuid) ' +
					'RETURNS TABLE ( level integer,  id uuid,  parent uuid,  name text) ' +
					'LANGUAGE plpgsql ' +
					'VOLATILE  ' +
					'CALLED ON NULL INPUT ' +
					'SECURITY INVOKER ' +
					'COST 1 ' +
					'AS $$ ' +
				'BEGIN ' +
					'RETURN QUERY ' +
					'WITH RECURSIVE q AS ( ' +
						'SELECT ' +
							'1 AS level, ' +
							'A.id, ' +
							'A.parent, ' +
							'A.name ' +
						'FROM ' +
							'tenant_folders A ' +
						'WHERE ' +
							'A.id = folderid ' +
						'UNION ALL ' +
						'SELECT ' +
							'q.level + 1, ' +
							'B.id, ' +
							'B.parent, ' +
							'B.name ' +
						'FROM ' +
							'q, ' +
							'tenant_folders B ' +
						'WHERE ' +
							'B.id = q.parent ' +
					') ' +
					'SELECT DISTINCT ' +
						'q.level, ' +
						'q.id, ' +
						'q.parent, ' +
						'q.name ' +
					'FROM ' +
						'q ' +
					'ORDER BY ' +
						'q.level, ' +
						'q.parent; ' +
				'END; ' +
				'$$;'
			),
			knex.schema.withSchema('public')
			.raw(
				'CREATE FUNCTION public.fn_get_folder_descendants (IN folderid uuid) ' +
					'RETURNS TABLE ( level integer,  id uuid,  parent uuid,  name text ) ' +
					'LANGUAGE plpgsql ' +
					'VOLATILE  ' +
					'CALLED ON NULL INPUT ' +
					'SECURITY INVOKER ' +
					'COST 1 ' +
					'AS $$ ' +
				'BEGIN ' +
					'RETURN QUERY ' +
					'WITH RECURSIVE q AS ( ' +
						'SELECT ' +
							'1 AS level, ' +
							'A.id, ' +
							'A.parent, ' +
							'A.name ' +
						'FROM ' +
							'tenant_folders A ' +
						'WHERE ' +
							'A.id = folderid ' +
						'UNION ALL ' +
						'SELECT ' +
							'q.level + 1, ' +
							'B.id, ' +
							'B.parent, ' +
							'B.name ' +
						'FROM ' +
							'q, ' +
							'tenant_folders B ' +
						'WHERE ' +
							'B.parent = q.id ' +
					') ' +
					'SELECT DISTINCT ' +
						'q.level, ' +
						'q.id, ' +
						'q.parent, ' +
						'q.name ' +
					'FROM ' +
						'q ' +
					'ORDER BY ' +
						'q.level, ' +
						'q.parent; ' +
				'END; ' +
				'$$;'
			),
			knex.schema.withSchema('public')
			.raw(
				'CREATE FUNCTION public.fn_check_folder_upsert_is_valid () ' +
					'RETURNS trigger ' +
					'LANGUAGE plpgsql ' +
					'VOLATILE  ' +
					'CALLED ON NULL INPUT ' +
					'SECURITY INVOKER ' +
					'COST 1 ' +
					'AS $$ ' +

				'DECLARE ' +
					'is_folder_in_tree	INTEGER; ' +
				'BEGIN ' +
					'IF TG_OP = \'UPDATE\' ' +
					'THEN ' +
						'IF OLD.tenant <> NEW.tenant ' +
						'THEN ' +
							'RAISE SQLSTATE \'2F003\' USING MESSAGE = \'Folders cannot be moved from one tenant to another\'; ' +
							'RETURN NULL; ' +
						'END IF; ' +
					'END IF; ' +

					'IF NEW.id = NEW.parent ' +
					'THEN ' +
						'RAISE SQLSTATE \'2F003\' USING MESSAGE = \'Folder cannot be its own parent\'; ' +
						'RETURN NULL; ' +
					'END IF; ' +

					'is_folder_in_tree := 0; ' +
					'SELECT ' +
						'COUNT(id) ' +
					'FROM ' +
						'fn_get_folder_ancestors(NEW.parent) ' +
					'WHERE ' +
						'id = NEW.id ' +
					'INTO ' +
						'is_folder_in_tree; ' +

					'IF is_folder_in_tree > 0 ' +
					'THEN ' +
						'RAISE SQLSTATE \'2F003\' USING MESSAGE = \'Folder cannot be its own ancestor\'; ' +
						'RETURN NULL; ' +
					'END IF; ' +

					'is_folder_in_tree := 0; ' +
					'SELECT ' +
						'COUNT(id) ' +
					'FROM ' +
						'fn_get_folder_descendants(NEW.id) ' +
					'WHERE ' +
						'id = NEW.id AND ' +
						'level > 1 ' +
					'INTO ' +
						'is_folder_in_tree; ' +

					'IF is_folder_in_tree > 0 ' +
					'THEN ' +
						'RAISE SQLSTATE \'2F003\' USING MESSAGE = \'Folder cannot be its own descendant\'; ' +
						'RETURN NULL; ' +
					'END IF; ' +

					'RETURN NEW; ' +
				'END; ' +
				'$$;'
			)
		]);
	})
	// Step 18: Setup user-defined functions on Tenant Application Menu Items table
	.then(function() {
		return Promise.all([
			knex.schema.withSchema('public')
			.raw(
				'CREATE FUNCTION public.fn_get_tenant_application_menu_item_ancestors (IN menuitemid uuid) ' +
					'RETURNS TABLE ( level integer,  id uuid,  parent uuid, tenant_application_menu uuid,  display_text text) ' +
					'LANGUAGE plpgsql ' +
					'VOLATILE  ' +
					'CALLED ON NULL INPUT ' +
					'SECURITY INVOKER ' +
					'COST 1 ' +
					'AS $$ ' +
				'BEGIN ' +
					'RETURN QUERY ' +
					'WITH RECURSIVE q AS ( ' +
						'SELECT ' +
							'1 AS level, ' +
							'A.id, ' +
							'A.parent, ' +
							'A.tenant_application_menu, ' +
							'A.display_text ' +
						'FROM ' +
							'tenant_application_menu_items A ' +
						'WHERE ' +
							'A.id = menuitemid ' +
						'UNION ALL ' +
						'SELECT ' +
							'q.level + 1, ' +
							'B.id, ' +
							'B.parent, ' +
							'B.tenant_application_menu, ' +
							'B.display_text ' +
						'FROM ' +
							'q, ' +
							'tenant_application_menu_items B ' +
						'WHERE ' +
							'B.id = q.parent ' +
					') ' +
					'SELECT DISTINCT ' +
						'q.level, ' +
						'q.id, ' +
						'q.parent, ' +
						'q.tenant_application_menu, ' +
						'q.display_text ' +
					'FROM ' +
						'q ' +
					'ORDER BY ' +
						'q.level, ' +
						'q.parent; ' +
				'END; ' +
				'$$;'
			),
			knex.schema.withSchema('public')
			.raw(
				'CREATE FUNCTION public.fn_get_tenant_application_menu_item_descendants (IN menuitemid uuid) ' +
					'RETURNS TABLE ( level integer,  id uuid,  parent uuid, tenant_application_menu uuid,  display_text text ) ' +
					'LANGUAGE plpgsql ' +
					'VOLATILE  ' +
					'CALLED ON NULL INPUT ' +
					'SECURITY INVOKER ' +
					'COST 1 ' +
					'AS $$ ' +
				'BEGIN ' +
					'RETURN QUERY ' +
					'WITH RECURSIVE q AS ( ' +
						'SELECT ' +
							'1 AS level, ' +
							'A.id, ' +
							'A.parent, ' +
							'A.tenant_application_menu, ' +
							'A.display_text ' +
						'FROM ' +
							'tenant_application_menu_items A ' +
						'WHERE ' +
							'A.id = menuitemid ' +
						'UNION ALL ' +
						'SELECT ' +
							'q.level + 1, ' +
							'B.id, ' +
							'B.parent, ' +
							'B.tenant_application_menu, ' +
							'B.display_text ' +
						'FROM ' +
							'q, ' +
							'tenant_application_menu_items B ' +
						'WHERE ' +
							'B.parent = q.id ' +
					') ' +
					'SELECT DISTINCT ' +
						'q.level, ' +
						'q.id, ' +
						'q.parent, ' +
						'q.tenant_application_menu, ' +
						'q.display_text ' +
					'FROM ' +
						'q ' +
					'ORDER BY ' +
						'q.level, ' +
						'q.parent; ' +
				'END; ' +
				'$$;'
			),
			knex.schema.withSchema('public')
			.raw(
				'CREATE FUNCTION public.fn_check_tenant_application_menu_item_upsert_is_valid () ' +
					'RETURNS trigger ' +
					'LANGUAGE plpgsql ' +
					'VOLATILE  ' +
					'CALLED ON NULL INPUT ' +
					'SECURITY INVOKER ' +
					'COST 1 ' +
					'AS $$ ' +

				'DECLARE ' +
					'is_menu_item_in_tree	INTEGER; ' +
				'BEGIN ' +
					'IF TG_OP = \'UPDATE\' ' +
					'THEN ' +
						'IF OLD.tenant_application_menu <> NEW.tenant_application_menu ' +
						'THEN ' +
							'RAISE SQLSTATE \'2F003\' USING MESSAGE = \'Menu Items cannot be moved from one Menu to another\'; ' +
							'RETURN NULL; ' +
						'END IF; ' +
					'END IF; ' +

					'IF NEW.id = NEW.parent ' +
					'THEN ' +
						'RAISE SQLSTATE \'2F003\' USING MESSAGE = \'Menu Item` cannot be its own parent\'; ' +
						'RETURN NULL; ' +
					'END IF; ' +

					'is_menu_item_in_tree := 0; ' +
					'SELECT ' +
						'COUNT(id) ' +
					'FROM ' +
						'fn_get_tenant_application_menu_item_ancestors(NEW.parent) ' +
					'WHERE ' +
						'id = NEW.id ' +
					'INTO ' +
						'is_menu_item_in_tree; ' +

					'IF is_menu_item_in_tree > 0 ' +
					'THEN ' +
						'RAISE SQLSTATE \'2F003\' USING MESSAGE = \'Menu Item cannot be its own ancestor\'; ' +
						'RETURN NULL; ' +
					'END IF; ' +

					'is_menu_item_in_tree := 0; ' +
					'SELECT ' +
						'COUNT(id) ' +
					'FROM ' +
						'fn_get_tenant_application_menu_item_descendants(NEW.id) ' +
					'WHERE ' +
						'id = NEW.id AND ' +
						'level > 1 ' +
					'INTO ' +
						'is_menu_item_in_tree; ' +

					'IF is_menu_item_in_tree > 0 ' +
					'THEN ' +
						'RAISE SQLSTATE \'2F003\' USING MESSAGE = \'Menu Item cannot be its own descendant\'; ' +
						'RETURN NULL; ' +
					'END IF; ' +

					'RETURN NEW; ' +
				'END; ' +
				'$$;'
			)
		]);
	})
	// Step 19: Setup user-defined functions on Server Application Menu Items table
	.then(function() {
		return Promise.all([
			knex.schema.withSchema('public')
			.raw(
				'CREATE FUNCTION public.fn_get_server_application_menu_item_ancestors (IN menuitemid uuid) ' +
					'RETURNS TABLE ( level integer,  id uuid,  parent uuid, server_application_menu uuid,  display_text text) ' +
					'LANGUAGE plpgsql ' +
					'VOLATILE  ' +
					'CALLED ON NULL INPUT ' +
					'SECURITY INVOKER ' +
					'COST 1 ' +
					'AS $$ ' +
				'BEGIN ' +
					'RETURN QUERY ' +
					'WITH RECURSIVE q AS ( ' +
						'SELECT ' +
							'1 AS level, ' +
							'A.id, ' +
							'A.parent, ' +
							'A.server_application_menu, ' +
							'A.display_text ' +
						'FROM ' +
							'server_application_menu_items A ' +
						'WHERE ' +
							'A.id = menuitemid ' +
						'UNION ALL ' +
						'SELECT ' +
							'q.level + 1, ' +
							'B.id, ' +
							'B.parent, ' +
							'B.server_application_menu, ' +
							'B.display_text ' +
						'FROM ' +
							'q, ' +
							'server_application_menu_items B ' +
						'WHERE ' +
							'B.id = q.parent ' +
					') ' +
					'SELECT DISTINCT ' +
						'q.level, ' +
						'q.id, ' +
						'q.parent, ' +
						'q.server_application_menu, ' +
						'q.display_text ' +
					'FROM ' +
						'q ' +
					'ORDER BY ' +
						'q.level, ' +
						'q.parent; ' +
				'END; ' +
				'$$;'
			),
			knex.schema.withSchema('public')
			.raw(
				'CREATE FUNCTION public.fn_get_server_application_menu_item_descendants (IN menuitemid uuid) ' +
					'RETURNS TABLE ( level integer,  id uuid,  parent uuid, server_application_menu uuid,  display_text text ) ' +
					'LANGUAGE plpgsql ' +
					'VOLATILE  ' +
					'CALLED ON NULL INPUT ' +
					'SECURITY INVOKER ' +
					'COST 1 ' +
					'AS $$ ' +
				'BEGIN ' +
					'RETURN QUERY ' +
					'WITH RECURSIVE q AS ( ' +
						'SELECT ' +
							'1 AS level, ' +
							'A.id, ' +
							'A.parent, ' +
							'A.server_application_menu, ' +
							'A.display_text ' +
						'FROM ' +
							'server_application_menu_items A ' +
						'WHERE ' +
							'A.id = menuitemid ' +
						'UNION ALL ' +
						'SELECT ' +
							'q.level + 1, ' +
							'B.id, ' +
							'B.parent, ' +
							'B.server_application_menu, ' +
							'B.display_text ' +
						'FROM ' +
							'q, ' +
							'server_application_menu_items B ' +
						'WHERE ' +
							'B.parent = q.id ' +
					') ' +
					'SELECT DISTINCT ' +
						'q.level, ' +
						'q.id, ' +
						'q.parent, ' +
						'q.server_application_menu, ' +
						'q.display_text ' +
					'FROM ' +
						'q ' +
					'ORDER BY ' +
						'q.level, ' +
						'q.parent; ' +
				'END; ' +
				'$$;'
			),
			knex.schema.withSchema('public')
			.raw(
				'CREATE FUNCTION public.fn_check_server_application_menu_item_upsert_is_valid () ' +
					'RETURNS trigger ' +
					'LANGUAGE plpgsql ' +
					'VOLATILE  ' +
					'CALLED ON NULL INPUT ' +
					'SECURITY INVOKER ' +
					'COST 1 ' +
					'AS $$ ' +

				'DECLARE ' +
					'is_menu_item_in_tree	INTEGER; ' +
				'BEGIN ' +
					'IF TG_OP = \'UPDATE\' ' +
					'THEN ' +
						'IF OLD.server_application_menu <> NEW.server_application_menu ' +
						'THEN ' +
							'RAISE SQLSTATE \'2F003\' USING MESSAGE = \'Menu Items cannot be moved from one Menu to another\'; ' +
							'RETURN NULL; ' +
						'END IF; ' +
					'END IF; ' +

					'IF NEW.id = NEW.parent ' +
					'THEN ' +
						'RAISE SQLSTATE \'2F003\' USING MESSAGE = \'Menu Item` cannot be its own parent\'; ' +
						'RETURN NULL; ' +
					'END IF; ' +

					'is_menu_item_in_tree := 0; ' +
					'SELECT ' +
						'COUNT(id) ' +
					'FROM ' +
						'fn_get_server_application_menu_item_ancestors(NEW.parent) ' +
					'WHERE ' +
						'id = NEW.id ' +
					'INTO ' +
						'is_menu_item_in_tree; ' +

					'IF is_menu_item_in_tree > 0 ' +
					'THEN ' +
						'RAISE SQLSTATE \'2F003\' USING MESSAGE = \'Menu Item cannot be its own ancestor\'; ' +
						'RETURN NULL; ' +
					'END IF; ' +

					'is_menu_item_in_tree := 0; ' +
					'SELECT ' +
						'COUNT(id) ' +
					'FROM ' +
						'fn_get_server_application_menu_item_descendants(NEW.id) ' +
					'WHERE ' +
						'id = NEW.id AND ' +
						'level > 1 ' +
					'INTO ' +
						'is_menu_item_in_tree; ' +

					'IF is_menu_item_in_tree > 0 ' +
					'THEN ' +
						'RAISE SQLSTATE \'2F003\' USING MESSAGE = \'Menu Item cannot be its own descendant\'; ' +
						'RETURN NULL; ' +
					'END IF; ' +

					'RETURN NEW; ' +
				'END; ' +
				'$$;'
			)
		]);
	})
	// Step 20: Miscellaneous stuff using knex.raw - for getting around random constraints
	.then(function() {
		return Promise.all([
			knex.raw('ALTER TABLE public.server_application_menu_items ADD CONSTRAINT fk_server_application_menu_items_server_application_menu FOREIGN KEY (server_application,server_application_menu) REFERENCES public.server_application_menus (server_application,id) MATCH FULL ON DELETE CASCADE ON UPDATE CASCADE'),
			knex.raw('ALTER TABLE public.server_application_menu_items ADD CONSTRAINT fk_server_application_menu_items_server_application_screen FOREIGN KEY (server_application,server_application_screen) REFERENCES public.server_application_screens (server_application,id) MATCH FULL ON DELETE CASCADE ON UPDATE CASCADE'),

			knex.raw('ALTER TABLE public.tenant_application_menu_items ADD CONSTRAINT fk_tenant_application_menu_items_tenant_application_menu FOREIGN KEY (tenant_application,tenant_application_menu) REFERENCES public.tenant_application_menus (tenant_application,id) MATCH FULL ON DELETE CASCADE ON UPDATE CASCADE'),
			knex.raw('ALTER TABLE public.tenant_application_menu_items ADD CONSTRAINT fk_tenant_application_menu_items_tenant_application_screen FOREIGN KEY (tenant_application,tenant_application_screen) REFERENCES public.tenant_application_screens (tenant_application,id) MATCH FULL ON DELETE CASCADE ON UPDATE CASCADE')
		]);
	})
	// Finally: Create the triggers on all the tables
	.then(function() {
		return Promise.all([
			knex.schema.withSchema('public').raw('CREATE TRIGGER trigger_notify_config_change AFTER UPDATE ON public.modules FOR EACH ROW EXECUTE PROCEDURE public.fn_notify_config_change();'),
			knex.schema.withSchema('public').raw('CREATE TRIGGER trigger_check_module_upsert_is_valid BEFORE INSERT OR UPDATE ON public.modules FOR EACH ROW EXECUTE PROCEDURE public.fn_check_module_upsert_is_valid();'),
			knex.schema.withSchema('public').raw('CREATE TRIGGER trigger_assign_module_to_tenant AFTER INSERT ON public.modules FOR EACH ROW EXECUTE PROCEDURE public.fn_assign_module_to_tenant();'),
			knex.schema.withSchema('public').raw('CREATE TRIGGER trigger_assign_defaults_to_tenant AFTER INSERT ON public.tenants FOR EACH ROW EXECUTE PROCEDURE public.fn_assign_defaults_to_tenant();'),
			knex.schema.withSchema('public').raw('CREATE TRIGGER trigger_check_server_template_upsert_is_valid BEFORE INSERT OR UPDATE ON public.server_templates FOR EACH ROW EXECUTE PROCEDURE public.fn_check_server_template_upsert_is_valid();'),
			knex.schema.withSchema('public').raw('CREATE TRIGGER trigger_check_permission_insert_is_valid BEFORE INSERT ON public.component_permissions FOR EACH ROW EXECUTE PROCEDURE public.fn_check_permission_insert_is_valid();'),
			knex.schema.withSchema('public').raw('CREATE TRIGGER trigger_check_permission_update_is_valid BEFORE UPDATE ON public.component_permissions FOR EACH ROW EXECUTE PROCEDURE public.fn_check_permission_update_is_valid();'),
			knex.schema.withSchema('public').raw('CREATE TRIGGER trigger_assign_default_group_to_tenant_user AFTER INSERT ON public.tenants_users FOR EACH ROW EXECUTE PROCEDURE public.fn_assign_default_group_to_tenant_user();'),
			knex.schema.withSchema('public').raw('CREATE TRIGGER trigger_check_tenant_user_upsert_is_valid BEFORE INSERT OR UPDATE ON public.tenants_users FOR EACH ROW EXECUTE PROCEDURE public.fn_check_tenant_user_upsert_is_valid();'),
			knex.schema.withSchema('public').raw('CREATE TRIGGER trigger_check_group_update_is_valid BEFORE UPDATE ON public.tenant_groups FOR EACH ROW EXECUTE PROCEDURE public.fn_check_group_update_is_valid();'),
			knex.schema.withSchema('public').raw('CREATE TRIGGER trigger_check_tenant_module_upsert_is_valid BEFORE INSERT OR UPDATE ON public.tenants_modules FOR EACH ROW EXECUTE PROCEDURE public.fn_check_tenant_module_upsert_is_valid();'),
			knex.schema.withSchema('public').raw('CREATE TRIGGER trigger_assign_permission_to_tenant_group AFTER INSERT OR UPDATE ON public.tenants_modules FOR EACH ROW EXECUTE PROCEDURE public.fn_assign_permission_to_tenant_group();'),
			knex.schema.withSchema('public').raw('CREATE TRIGGER trigger_remove_descendant_module_from_tenant AFTER DELETE ON public.tenants_modules FOR EACH ROW EXECUTE PROCEDURE public.fn_remove_descendant_module_from_tenant();'),
			knex.schema.withSchema('public').raw('CREATE TRIGGER trigger_remove_group_permission_from_descendants AFTER DELETE ON public.tenant_group_permissions FOR EACH ROW EXECUTE PROCEDURE public.fn_remove_group_permission_from_descendants();'),
			knex.schema.withSchema('public').raw('CREATE TRIGGER trigger_check_group_permission_insert_is_valid BEFORE INSERT OR UPDATE ON public.tenant_group_permissions FOR EACH ROW EXECUTE PROCEDURE public.fn_check_group_permission_insert_is_valid();'),
			knex.schema.withSchema('public').raw('CREATE TRIGGER trigger_assign_permission_to_tenants AFTER INSERT ON public.component_permissions FOR EACH ROW EXECUTE PROCEDURE public.fn_assign_permission_to_tenants();'),
			knex.schema.withSchema('public').raw('CREATE TRIGGER trigger_remove_descendant_group_from_tenant_user AFTER INSERT OR UPDATE ON public.tenants_users_groups FOR EACH ROW EXECUTE PROCEDURE public.fn_remove_descendant_group_from_tenant_user();'),
			knex.schema.withSchema('public').raw('CREATE TRIGGER trigger_check_tenant_user_group_upsert_is_valid BEFORE INSERT OR UPDATE ON public.tenants_users_groups FOR EACH ROW EXECUTE PROCEDURE public.fn_check_tenant_user_group_upsert_is_valid();'),
			knex.schema.withSchema('public').raw('CREATE TRIGGER trigger_check_folder_upsert_is_valid BEFORE INSERT OR UPDATE ON public.tenant_folders FOR EACH ROW EXECUTE PROCEDURE public.fn_check_folder_upsert_is_valid();'),
			knex.schema.withSchema('public').raw('CREATE TRIGGER trigger_check_tenant_application_menu_item_upsert_is_valid BEFORE INSERT OR UPDATE ON public.tenant_application_menu_items FOR EACH ROW EXECUTE PROCEDURE public.fn_check_tenant_application_menu_item_upsert_is_valid();'),
			knex.schema.withSchema('public').raw('CREATE TRIGGER trigger_check_server_application_menu_item_upsert_is_valid BEFORE INSERT OR UPDATE ON public.server_application_menu_items FOR EACH ROW EXECUTE PROCEDURE public.fn_check_server_application_menu_item_upsert_is_valid();')
		]);
	});
};

exports.down = function(knex) {
	return knex.schema.raw('DROP SCHEMA public CASCADE;')
	.then(function() {
		return knex.schema.raw('CREATE SCHEMA public;');
	});
};
