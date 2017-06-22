-- Database generated with pgModeler (PostgreSQL Database Modeler).
-- pgModeler  version: 0.8.1
-- PostgreSQL version: 9.4
-- Project Site: pgmodeler.com.br
-- Model Author: ---

SET check_function_bodies = false;
-- ddl-end --


-- Database creation must be done outside an multicommand file.
-- These commands were put in this file only for convenience.
-- -- object: "twyr-webapp-erd" | type: DATABASE --
-- -- DROP DATABASE IF EXISTS "twyr-webapp-erd";
-- CREATE DATABASE "twyr-webapp-erd"
-- ;
-- -- ddl-end --
-- 

-- object: public.module_type | type: TYPE --
-- DROP TYPE IF EXISTS public.module_type CASCADE;
CREATE TYPE public.module_type AS
 ENUM ('component','middleware','service','server','template');
-- ddl-end --
ALTER TYPE public.module_type OWNER TO postgres;
-- ddl-end --

-- object: "uuid-ossp" | type: EXTENSION --
-- DROP EXTENSION IF EXISTS "uuid-ossp" CASCADE;
CREATE EXTENSION "uuid-ossp"
      WITH SCHEMA public;
-- ddl-end --

-- object: public.fn_assign_module_to_tenant | type: FUNCTION --
-- DROP FUNCTION IF EXISTS public.fn_assign_module_to_tenant() CASCADE;
CREATE FUNCTION public.fn_assign_module_to_tenant ()
	RETURNS trigger
	LANGUAGE plpgsql
	VOLATILE 
	CALLED ON NULL INPUT
	SECURITY INVOKER
	COST 1
	AS $$

BEGIN
	IF NEW.type <> 'component' AND NEW.type <> 'server'
	THEN
		RETURN NEW;
	END IF;

	IF NEW.admin_only = false OR NEW.type = 'server'
	THEN
		INSERT INTO tenants_modules (
			tenant,
			module
		)
		SELECT
			id,
			NEW.id
		FROM
			tenants;
	END IF;

	IF NEW.admin_only = true AND NEW.type <> 'server'
	THEN
		INSERT INTO tenants_modules (
			tenant,
			module
		)
		SELECT
			id,
			NEW.id
		FROM
			tenants
		WHERE
			sub_domain = 'www';
	END IF;

	RETURN NEW;
END;
$$;
-- ddl-end --
ALTER FUNCTION public.fn_assign_module_to_tenant() OWNER TO postgres;
-- ddl-end --

-- object: public.fn_get_module_ancestors | type: FUNCTION --
-- DROP FUNCTION IF EXISTS public.fn_get_module_ancestors(IN uuid) CASCADE;
CREATE FUNCTION public.fn_get_module_ancestors (IN moduleid uuid)
	RETURNS TABLE ( level integer,  id uuid,  parent uuid,  name text,  type public.module_type)
	LANGUAGE plpgsql
	VOLATILE 
	CALLED ON NULL INPUT
	SECURITY INVOKER
	COST 1
	AS $$

BEGIN
	RETURN QUERY
	WITH RECURSIVE q AS (
		SELECT
			1 AS level,
			A.id,
			A.parent,
			A.name,
			A.type
		FROM
			modules A
		WHERE
			A.id = moduleid
		UNION ALL
		SELECT
			q.level + 1,
			B.id,
			B.parent,
			B.name,
			B.type
		FROM
			q,
			modules B
		WHERE
			B.id = q.parent
	)
	SELECT DISTINCT
		q.level,
		q.id,
		q.parent,
		q.name,
		q.type
	FROM
		q
	ORDER BY
		q.level,
		q.parent;
END;

$$;
-- ddl-end --
ALTER FUNCTION public.fn_get_module_ancestors(IN uuid) OWNER TO postgres;
-- ddl-end --

-- object: public.fn_get_module_descendants | type: FUNCTION --
-- DROP FUNCTION IF EXISTS public.fn_get_module_descendants(IN uuid) CASCADE;
CREATE FUNCTION public.fn_get_module_descendants (IN moduleid uuid)
	RETURNS TABLE ( level integer,  id uuid,  parent uuid,  name text,  type public.module_type,  enabled boolean)
	LANGUAGE plpgsql
	VOLATILE 
	CALLED ON NULL INPUT
	SECURITY INVOKER
	COST 1
	AS $$

BEGIN
	RETURN QUERY
	WITH RECURSIVE q AS (
		SELECT
			1 AS level,
			A.id,
			A.parent,
			A.name,
			A.type,
			fn_is_module_enabled(A.id) AS enabled
		FROM
			modules A
		WHERE
			A.id = moduleid
		UNION ALL
		SELECT
			q.level + 1,
			B.id,
			B.parent,
			B.name,
			B.type,
			fn_is_module_enabled(B.id) AS enabled
		FROM
			q,
			modules B
		WHERE
			B.parent = q.id
	)
	SELECT DISTINCT
		q.level,
		q.id,
		q.parent,
		q.name,
		q.type,
		q.enabled
	FROM
		q
	ORDER BY
		q.level,
		q.parent;
END;

$$;
-- ddl-end --
ALTER FUNCTION public.fn_get_module_descendants(IN uuid) OWNER TO postgres;
-- ddl-end --

-- object: public.fn_is_module_enabled | type: FUNCTION --
-- DROP FUNCTION IF EXISTS public.fn_is_module_enabled(IN uuid) CASCADE;
CREATE FUNCTION public.fn_is_module_enabled (IN moduleid uuid)
	RETURNS boolean
	LANGUAGE plpgsql
	VOLATILE 
	CALLED ON NULL INPUT
	SECURITY INVOKER
	COST 1
	AS $$

DECLARE
	is_disabled	integer;
BEGIN
	SELECT
		COUNT(*)
	FROM
		modules
	WHERE
		id IN  (SELECT id FROM fn_get_module_ancestors(moduleid)) AND
		enabled = false
	INTO
		is_disabled;

	RETURN is_disabled <= 0;
END;

$$;
-- ddl-end --
ALTER FUNCTION public.fn_is_module_enabled(IN uuid) OWNER TO postgres;
-- ddl-end --

-- object: public.fn_check_module_upsert_is_valid | type: FUNCTION --
-- DROP FUNCTION IF EXISTS public.fn_check_module_upsert_is_valid() CASCADE;
CREATE FUNCTION public.fn_check_module_upsert_is_valid ()
	RETURNS trigger
	LANGUAGE plpgsql
	VOLATILE 
	CALLED ON NULL INPUT
	SECURITY INVOKER
	COST 1
	AS $$
DECLARE
	parent_module_type	TEXT;
	is_module_in_tree	INTEGER;
BEGIN
	IF TG_OP = 'UPDATE'
	THEN
		IF OLD.name <> NEW.name
		THEN
			RAISE SQLSTATE '2F003' USING MESSAGE = 'Module name is NOT mutable';
			RETURN NULL;
		END IF;

		IF OLD.type <> NEW.type
		THEN
			RAISE SQLSTATE '2F003' USING MESSAGE = 'Module type is NOT mutable';
			RETURN NULL;
		END IF;
	END IF;

	IF NEW.type = 'server' AND NEW.parent IS NULL 
	THEN
		RETURN NEW;
	END IF;

	IF NEW.type = 'server' AND NEW.parent IS NOT NULL 
	THEN
		RAISE SQLSTATE '2F003' USING MESSAGE = 'Server Modules cannot have parents' ;
		RETURN NULL;
	END IF;

	IF NEW.type <> 'server' AND NEW.parent IS NULL 
	THEN
		RAISE SQLSTATE '2F003' USING MESSAGE = 'Only Server Modules cannot have parents - all other module types must belong to a Server' ;
		RETURN NULL;
	END IF;

	parent_module_type := '';
	SELECT
		type
	FROM
		modules
	WHERE
		id = NEW.parent
	INTO
		parent_module_type;

	IF parent_module_type = 'template'
	THEN
		RAISE SQLSTATE '2F003' USING MESSAGE = 'Only Server Templates cannot have sub-modules' ;
		RETURN NULL;
	END IF;

	IF parent_module_type = 'service' AND NEW.type <> 'service'
	THEN
		RAISE SQLSTATE '2F003' USING MESSAGE = 'Services cannot have sub-modules other than Services' ;
		RETURN NULL;
	END IF;

	IF NEW.id = NEW.parent
	THEN
		RAISE SQLSTATE '2F003' USING MESSAGE = 'Module cannot be its own parent';
		RETURN NULL;
	END IF;

	/* Check if the module is its own ancestor */
	is_module_in_tree := 0;
	SELECT
		COUNT(id)
	FROM
		fn_get_module_ancestors(NEW.parent)
	WHERE
		id = NEW.id
	INTO
		is_module_in_tree;

	IF is_module_in_tree > 0
	THEN
		RAISE SQLSTATE '2F003' USING MESSAGE = 'Module cannot be its own ancestor';
		RETURN NULL;
	END IF;

	/* Check if the module is its own descendant */
	is_module_in_tree := 0;
	SELECT
		COUNT(id)
	FROM
		fn_get_module_descendants(NEW.id)
	WHERE
		id = NEW.id AND
		level > 1
	INTO
		is_module_in_tree;

	IF is_module_in_tree > 0
	THEN
		RAISE SQLSTATE '2F003' USING MESSAGE = 'Module cannot be its own descendant';
		RETURN NULL;
	END IF;

	RETURN NEW;
END;

$$;
-- ddl-end --
ALTER FUNCTION public.fn_check_module_upsert_is_valid() OWNER TO postgres;
-- ddl-end --

-- object: public.fn_notify_config_change | type: FUNCTION --
-- DROP FUNCTION IF EXISTS public.fn_notify_config_change() CASCADE;
CREATE FUNCTION public.fn_notify_config_change ()
	RETURNS trigger
	LANGUAGE plpgsql
	VOLATILE 
	CALLED ON NULL INPUT
	SECURITY INVOKER
	COST 1
	AS $$

BEGIN
	IF OLD.configuration = NEW.configuration AND OLD.enabled = NEW.enabled
	THEN
		RETURN NEW;
	END IF;

	IF OLD.configuration <> NEW.configuration
	THEN
		PERFORM pg_notify('config-change', CAST(NEW.id AS text));
	END IF;

	IF OLD.enabled <> NEW.enabled
	THEN
		PERFORM pg_notify('state-change', CAST(NEW.id AS text));
	END IF;

	RETURN NEW;
END;
$$;
-- ddl-end --
ALTER FUNCTION public.fn_notify_config_change() OWNER TO postgres;
-- ddl-end --

-- object: public.modules | type: TABLE --
-- DROP TABLE IF EXISTS public.modules CASCADE;
CREATE TABLE public.modules(
	id uuid NOT NULL DEFAULT uuid_generate_v4(),
	parent uuid,
	type public.module_type NOT NULL DEFAULT 'component',
	name text NOT NULL,
	display_name text NOT NULL,
	description text NOT NULL DEFAULT 'Another Twyr Module',
	metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
	configuration jsonb NOT NULL DEFAULT '{}'::jsonb,
	configuration_schema jsonb NOT NULL DEFAULT '{}'::jsonb,
	admin_only boolean NOT NULL DEFAULT 'false'::boolean,
	enabled boolean NOT NULL DEFAULT true::boolean,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	CONSTRAINT pk_modules PRIMARY KEY (id)

);
-- ddl-end --
ALTER TABLE public.modules OWNER TO postgres;
-- ddl-end --

-- object: public.tenants | type: TABLE --
-- DROP TABLE IF EXISTS public.tenants CASCADE;
CREATE TABLE public.tenants(
	id uuid NOT NULL DEFAULT uuid_generate_v4(),
	name text NOT NULL,
	sub_domain text NOT NULL,
	enabled boolean NOT NULL DEFAULT true::boolean,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	CONSTRAINT pk_tenants PRIMARY KEY (id)

);
-- ddl-end --
ALTER TABLE public.tenants OWNER TO postgres;
-- ddl-end --

-- object: public.gender | type: TYPE --
-- DROP TYPE IF EXISTS public.gender CASCADE;
CREATE TYPE public.gender AS
 ENUM ('female','male','other');
-- ddl-end --
ALTER TYPE public.gender OWNER TO postgres;
-- ddl-end --

-- object: public.users | type: TABLE --
-- DROP TABLE IF EXISTS public.users CASCADE;
CREATE TABLE public.users(
	id uuid NOT NULL DEFAULT uuid_generate_v4(),
	email text NOT NULL,
	password text NOT NULL,
	first_name text NOT NULL,
	middle_names text,
	last_name text NOT NULL,
	nickname text,
	profile_image uuid,
	profile_image_metadata jsonb,
	gender public.gender NOT NULL DEFAULT 'male'::gender,
	dob timestamptz,
	enabled boolean NOT NULL DEFAULT true::boolean,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	CONSTRAINT pk_users PRIMARY KEY (id)

);
-- ddl-end --
ALTER TABLE public.users OWNER TO postgres;
-- ddl-end --

-- object: uidx_users | type: INDEX --
-- DROP INDEX IF EXISTS public.uidx_users CASCADE;
CREATE UNIQUE INDEX uidx_users ON public.users
	USING btree
	(
	  email ASC NULLS LAST
	);
-- ddl-end --

-- object: public.tenants_users | type: TABLE --
-- DROP TABLE IF EXISTS public.tenants_users CASCADE;
CREATE TABLE public.tenants_users(
	id uuid NOT NULL DEFAULT uuid_generate_v4(),
	tenant uuid NOT NULL,
	login uuid NOT NULL,
	default_tenant_application uuid,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	CONSTRAINT pk_tenants_users PRIMARY KEY (id)

);
-- ddl-end --
ALTER TABLE public.tenants_users OWNER TO postgres;
-- ddl-end --

-- object: uidx_tenants_users | type: INDEX --
-- DROP INDEX IF EXISTS public.uidx_tenants_users CASCADE;
CREATE UNIQUE INDEX uidx_tenants_users ON public.tenants_users
	USING btree
	(
	  tenant ASC NULLS LAST,
	  login ASC NULLS LAST
	);
-- ddl-end --

-- object: public.tenant_locations | type: TABLE --
-- DROP TABLE IF EXISTS public.tenant_locations CASCADE;
CREATE TABLE public.tenant_locations(
	id uuid NOT NULL DEFAULT uuid_generate_v4(),
	tenant uuid NOT NULL,
	name text NOT NULL,
	line1 text NOT NULL,
	line2 text,
	line3 text,
	area text,
	city text NOT NULL,
	state text NOT NULL,
	country text NOT NULL,
	postal_code text NOT NULL,
	latitude double precision NOT NULL,
	longitude double precision NOT NULL,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	CONSTRAINT pk_locations PRIMARY KEY (id)

);
-- ddl-end --
ALTER TABLE public.tenant_locations OWNER TO postgres;
-- ddl-end --

-- object: uidx_locations | type: INDEX --
-- DROP INDEX IF EXISTS public.uidx_locations CASCADE;
CREATE UNIQUE INDEX uidx_locations ON public.tenant_locations
	USING btree
	(
	  tenant ASC NULLS LAST,
	  id ASC NULLS LAST
	);
-- ddl-end --

-- object: public.tenant_groups_job_titles | type: TABLE --
-- DROP TABLE IF EXISTS public.tenant_groups_job_titles CASCADE;
CREATE TABLE public.tenant_groups_job_titles(
	id uuid NOT NULL DEFAULT uuid_generate_v4(),
	tenant uuid NOT NULL,
	tenant_group uuid NOT NULL DEFAULT uuid_generate_v4(),
	title text NOT NULL,
	description text,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	CONSTRAINT pk_job_titles PRIMARY KEY (id)

);
-- ddl-end --
ALTER TABLE public.tenant_groups_job_titles OWNER TO postgres;
-- ddl-end --

-- object: uidx_job_titles | type: INDEX --
-- DROP INDEX IF EXISTS public.uidx_job_titles CASCADE;
CREATE UNIQUE INDEX uidx_job_titles ON public.tenant_groups_job_titles
	USING btree
	(
	  id ASC NULLS LAST,
	  tenant_group ASC NULLS LAST
	);
-- ddl-end --

-- object: public.tenant_groups | type: TABLE --
-- DROP TABLE IF EXISTS public.tenant_groups CASCADE;
CREATE TABLE public.tenant_groups(
	id uuid NOT NULL DEFAULT uuid_generate_v4(),
	parent uuid,
	tenant uuid NOT NULL,
	name text NOT NULL,
	display_name text NOT NULL,
	description text,
	default_for_new_user boolean NOT NULL DEFAULT false::boolean,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	CONSTRAINT fk_groups PRIMARY KEY (id)

);
-- ddl-end --
ALTER TABLE public.tenant_groups OWNER TO postgres;
-- ddl-end --

-- object: uidx_group_parent_name | type: INDEX --
-- DROP INDEX IF EXISTS public.uidx_group_parent_name CASCADE;
CREATE UNIQUE INDEX uidx_group_parent_name ON public.tenant_groups
	USING btree
	(
	  parent ASC NULLS LAST,
	  name ASC NULLS LAST
	);
-- ddl-end --

-- object: uidx_group_tenant | type: INDEX --
-- DROP INDEX IF EXISTS public.uidx_group_tenant CASCADE;
CREATE UNIQUE INDEX uidx_group_tenant ON public.tenant_groups
	USING btree
	(
	  tenant ASC NULLS LAST,
	  id ASC NULLS LAST
	);
-- ddl-end --

-- object: public.tenants_users_groups | type: TABLE --
-- DROP TABLE IF EXISTS public.tenants_users_groups CASCADE;
CREATE TABLE public.tenants_users_groups(
	id uuid NOT NULL DEFAULT uuid_generate_v4(),
	tenant uuid NOT NULL,
	tenant_group uuid NOT NULL,
	tenant_user uuid NOT NULL,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	CONSTRAINT pk_tenant_user_groups PRIMARY KEY (id)

);
-- ddl-end --
ALTER TABLE public.tenants_users_groups OWNER TO postgres;
-- ddl-end --

-- object: public.component_permissions | type: TABLE --
-- DROP TABLE IF EXISTS public.component_permissions CASCADE;
CREATE TABLE public.component_permissions(
	id uuid NOT NULL DEFAULT uuid_generate_v4(),
	module uuid NOT NULL,
	name text NOT NULL,
	display_name text NOT NULL,
	description text NOT NULL DEFAULT 'Another Random Permission'::text,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	CONSTRAINT pk_permissions PRIMARY KEY (id)

);
-- ddl-end --
ALTER TABLE public.component_permissions OWNER TO postgres;
-- ddl-end --

-- object: public.fn_get_group_ancestors | type: FUNCTION --
-- DROP FUNCTION IF EXISTS public.fn_get_group_ancestors(IN uuid) CASCADE;
CREATE FUNCTION public.fn_get_group_ancestors (IN groupid uuid)
	RETURNS TABLE ( level integer,  id uuid,  parent uuid,  name text)
	LANGUAGE plpgsql
	VOLATILE 
	CALLED ON NULL INPUT
	SECURITY INVOKER
	COST 1
	AS $$

BEGIN
	RETURN QUERY
	WITH RECURSIVE q AS (
		SELECT
			1 AS level,
			A.id,
			A.parent,
			A.name
		FROM
			tenant_groups A
		WHERE
			A.id = groupid
		UNION ALL
		SELECT
			q.level + 1,
			B.id,
			B.parent,
			B.name
		FROM
			q,
			tenant_groups B
		WHERE
			B.id = q.parent
	)
	SELECT DISTINCT
		q.level,
		q.id,
		q.parent,
		q.name
	FROM
		q
	ORDER BY
		q.level,
		q.parent;
END;

$$;
-- ddl-end --
ALTER FUNCTION public.fn_get_group_ancestors(IN uuid) OWNER TO postgres;
-- ddl-end --

-- object: public.fn_get_group_descendants | type: FUNCTION --
-- DROP FUNCTION IF EXISTS public.fn_get_group_descendants(IN uuid) CASCADE;
CREATE FUNCTION public.fn_get_group_descendants (IN groupid uuid)
	RETURNS TABLE ( level integer,  id uuid,  parent uuid,  name text)
	LANGUAGE plpgsql
	VOLATILE 
	CALLED ON NULL INPUT
	SECURITY INVOKER
	COST 1
	AS $$

BEGIN
	RETURN QUERY
	WITH RECURSIVE q AS (
		SELECT
			1 AS level,
			A.id,
			A.parent,
			A.name
		FROM
			tenant_groups A
		WHERE
			A.id = groupid
		UNION ALL
		SELECT
			q.level + 1,
			B.id,
			B.parent,
			B.name
		FROM
			q,
			tenant_groups B
		WHERE
			B.parent = q.id
	)
	SELECT DISTINCT
		q.level,
		q.id,
		q.parent,
		q.name
	FROM
		q
	ORDER BY
		q.level,
		q.parent;
END;

$$;
-- ddl-end --
ALTER FUNCTION public.fn_get_group_descendants(IN uuid) OWNER TO postgres;
-- ddl-end --

-- object: public.fn_check_group_update_is_valid | type: FUNCTION --
-- DROP FUNCTION IF EXISTS public.fn_check_group_update_is_valid() CASCADE;
CREATE FUNCTION public.fn_check_group_update_is_valid ()
	RETURNS trigger
	LANGUAGE plpgsql
	VOLATILE 
	CALLED ON NULL INPUT
	SECURITY INVOKER
	COST 1
	AS $$
BEGIN
	IF OLD.parent <> NEW.parent
	THEN
		RAISE SQLSTATE '2F003' USING MESSAGE = 'Group cannot change parent';
		RETURN NULL;
	END IF;

	RETURN NEW;
END;
$$;
-- ddl-end --
ALTER FUNCTION public.fn_check_group_update_is_valid() OWNER TO postgres;
-- ddl-end --

-- object: trigger_check_group_update_is_valid | type: TRIGGER --
-- DROP TRIGGER IF EXISTS trigger_check_group_update_is_valid ON public.tenant_groups  ON public.tenant_groups CASCADE;
CREATE TRIGGER trigger_check_group_update_is_valid
	BEFORE UPDATE
	ON public.tenant_groups
	FOR EACH ROW
	EXECUTE PROCEDURE public.fn_check_group_update_is_valid();
-- ddl-end --

-- object: public.fn_assign_default_group_to_tenant_user | type: FUNCTION --
-- DROP FUNCTION IF EXISTS public.fn_assign_default_group_to_tenant_user() CASCADE;
CREATE FUNCTION public.fn_assign_default_group_to_tenant_user ()
	RETURNS trigger
	LANGUAGE plpgsql
	VOLATILE 
	CALLED ON NULL INPUT
	SECURITY INVOKER
	COST 1
	AS $$

DECLARE
	default_tenant_group	UUID;
BEGIN
	default_tenant_group := NULL;
	SELECT
		id
	FROM
		tenant_groups
	WHERE
		tenant = NEW.tenant AND
		default_for_new_user = true
	INTO
		default_tenant_group;

	IF default_tenant_group IS NULL
	THEN
		RETURN NEW;
	END IF;

	INSERT INTO tenants_users_groups (
		tenant,
		tenant_group,
		tenant_user
	)
	VALUES (
		NEW.tenant,
		default_tenant_group,
		NEW.id
	);

	RETURN NEW;
END;
$$;
-- ddl-end --
ALTER FUNCTION public.fn_assign_default_group_to_tenant_user() OWNER TO postgres;
-- ddl-end --

-- object: trigger_assign_default_group_to_tenant_user | type: TRIGGER --
-- DROP TRIGGER IF EXISTS trigger_assign_default_group_to_tenant_user ON public.tenants_users  ON public.tenants_users CASCADE;
CREATE TRIGGER trigger_assign_default_group_to_tenant_user
	AFTER INSERT 
	ON public.tenants_users
	FOR EACH ROW
	EXECUTE PROCEDURE public.fn_assign_default_group_to_tenant_user();
-- ddl-end --

-- object: public.fn_remove_group_permission_from_descendants | type: FUNCTION --
-- DROP FUNCTION IF EXISTS public.fn_remove_group_permission_from_descendants() CASCADE;
CREATE FUNCTION public.fn_remove_group_permission_from_descendants ()
	RETURNS trigger
	LANGUAGE plpgsql
	VOLATILE 
	CALLED ON NULL INPUT
	SECURITY INVOKER
	COST 1
	AS $$

BEGIN
	DELETE FROM
		tenant_group_permissions
	WHERE
		tenant_group IN (SELECT id FROM fn_get_group_descendants(OLD.tenant_group) WHERE level = 2) AND
		permission = OLD.permission;

	RETURN OLD;
END;
$$;
-- ddl-end --
ALTER FUNCTION public.fn_remove_group_permission_from_descendants() OWNER TO postgres;
-- ddl-end --

-- object: public.user_social_logins | type: TABLE --
-- DROP TABLE IF EXISTS public.user_social_logins CASCADE;
CREATE TABLE public.user_social_logins(
	id uuid NOT NULL DEFAULT uuid_generate_v4(),
	login uuid NOT NULL,
	provider text NOT NULL,
	provider_uid text NOT NULL,
	display_name text NOT NULL,
	social_data jsonb NOT NULL,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	CONSTRAINT pk_social_logins PRIMARY KEY (id)

);
-- ddl-end --
ALTER TABLE public.user_social_logins OWNER TO postgres;
-- ddl-end --

-- object: uidx_social_logins | type: INDEX --
-- DROP INDEX IF EXISTS public.uidx_social_logins CASCADE;
CREATE UNIQUE INDEX uidx_social_logins ON public.user_social_logins
	USING btree
	(
	  provider ASC NULLS LAST,
	  provider_uid ASC NULLS LAST
	);
-- ddl-end --

-- object: public.tenant_group_permissions | type: TABLE --
-- DROP TABLE IF EXISTS public.tenant_group_permissions CASCADE;
CREATE TABLE public.tenant_group_permissions(
	id uuid NOT NULL DEFAULT uuid_generate_v4(),
	tenant uuid NOT NULL,
	tenant_group uuid NOT NULL,
	module uuid NOT NULL,
	permission uuid NOT NULL,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	CONSTRAINT pk_group_permissions PRIMARY KEY (id)

);
-- ddl-end --
ALTER TABLE public.tenant_group_permissions OWNER TO postgres;
-- ddl-end --

-- object: public.fn_assign_defaults_to_tenant | type: FUNCTION --
-- DROP FUNCTION IF EXISTS public.fn_assign_defaults_to_tenant() CASCADE;
CREATE FUNCTION public.fn_assign_defaults_to_tenant ()
	RETURNS trigger
	LANGUAGE plpgsql
	VOLATILE 
	CALLED ON NULL INPUT
	SECURITY INVOKER
	COST 1
	AS $$
DECLARE
	admin_group_id	UUID;
	user_group_id	UUID;
	tenant_app_id	UUID;
	app_category_id	UUID;
BEGIN
	INSERT INTO tenant_groups (
		parent,
		tenant,
		name,
		display_name,
		description
	)
	VALUES (
		NULL,
		NEW.id,
		'administrators'
		NEW.name || ' Administrators',
		'The Administrator Group for ' || NEW.name
	)
	RETURNING
		id
	INTO
		admin_group_id;

	INSERT INTO tenant_groups (
		parent,
		tenant,
		name,
		display_name,
		description
	)
	VALUES (
		admin_group_id,
		NEW.id,
		'users',
		NEW.name || ' Users',
		'All Users Group for ' || NEW.name
	)
	RETURNING
		id
	INTO
		user_group_id;

	IF NEW.sub_domain = 'www'
	THEN
		INSERT INTO tenants_modules (
			tenant,
			module
		)
		SELECT
			NEW.id,
			id
		FROM
			modules
		WHERE
			type = 'server' OR type = 'component' ;
	END IF;

	IF NEW.sub_domain <> 'www'
	THEN
		INSERT INTO tenants_modules (
			tenant,
			module
		)
		SELECT
			NEW.id,
			id
		FROM
			modules
		WHERE
			type = 'server' OR
			(type = 'component' AND admin_only = false) ;
	END IF;

	tenant_app_id := NULL;
	INSERT INTO tenant_applications(
		tenant,
		name,
		media,
		is_default
	)
	VALUES (
		NEW.id,
		'Default Application',
		'desktop',
		true
	)
	RETURNING
		id
	INTO
		tenant_app_id;

	INSERT INTO tenant_application_screens(
		tenant_application,
		name
	)
	VALUES(
		tenant_app_id,
		'Screen #1'
	);

	tenant_app_id := NULL;
	INSERT INTO tenant_applications(
		tenant,
		name,
		media,
		is_default
	)
	VALUES (
		NEW.id,
		'Default Application',
		'tablet',
		true
	)
	RETURNING
		id
	INTO
		tenant_app_id;

	INSERT INTO tenant_application_screens(
		tenant_application,
		name
	)
	VALUES(
		tenant_app_id,
		'Screen #1'
	);

	tenant_app_id := NULL;
	INSERT INTO tenant_applications(
		tenant,
		name,
		media,
		is_default
	)
	VALUES (
		NEW.id,
		'Default Application',
		'phone',
		true
	)
	RETURNING
		id
	INTO
		tenant_app_id;

	INSERT INTO tenant_application_screens(
		tenant_application,
		name
	)
	VALUES(
		tenant_app_id,
		'Screen #1'
	);
	
	INSERT INTO tenant_group_permissions (
		tenant,
		tenant_group,
		module,
		permission
	)
	SELECT
		NEW.id,
		user_group_id,
		module,
		permission
	FROM
		tenant_group_permissions
	WHERE
		tenant_group = (SELECT id FROM tenant_groups WHERE tenant = (SELECT id FROM tenants WHERE sub_domain = 'www') AND default_for_new_user = true);

	IF NEW.sub_domain <> 'www'
	THEN
		INSERT INTO tenants_server_templates(
			tenant,
			server_template
		)
		SELECT
			NEW.id,
			server_template
		FROM
			tenants_server_templates
		WHERE
			tenant = (SELECT id FROM tenants WHERE sub_domain='www');
	END IF;

	IF NEW.sub_domain = 'www'
	THEN
		INSERT INTO tenants_server_templates(
			tenant,
			server_template
		)
		SELECT
			NEW.id,
			id
		FROM
			server_templates;
	END IF;

	INSERT INTO tenant_folders(
		tenant,
		name
	)
	VALUES (
		NEW.id,
		'Application Categories'
	)
	RETURNING
		id
	INTO
		app_category_id;

	INSERT INTO tenant_application_categories(
		tenant,
		tenant_application,
		tenant_folder
	)
	SELECT
		tenant,
		id,
		app_category_id
	FROM
		tenant_applications
	WHERE
		tenant = NEW.id;

	RETURN NEW;
END;
$$;
-- ddl-end --
ALTER FUNCTION public.fn_assign_defaults_to_tenant() OWNER TO postgres;
-- ddl-end --

-- object: trigger_assign_defaults_to_tenant | type: TRIGGER --
-- DROP TRIGGER IF EXISTS trigger_assign_defaults_to_tenant ON public.tenants  ON public.tenants CASCADE;
CREATE TRIGGER trigger_assign_defaults_to_tenant
	AFTER INSERT 
	ON public.tenants
	FOR EACH ROW
	EXECUTE PROCEDURE public.fn_assign_defaults_to_tenant();
-- ddl-end --

-- object: public.fn_check_permission_insert_is_valid | type: FUNCTION --
-- DROP FUNCTION IF EXISTS public.fn_check_permission_insert_is_valid() CASCADE;
CREATE FUNCTION public.fn_check_permission_insert_is_valid ()
	RETURNS trigger
	LANGUAGE plpgsql
	VOLATILE 
	CALLED ON NULL INPUT
	SECURITY INVOKER
	COST 1
	AS $$

DECLARE
	is_component	INTEGER;
BEGIN
	is_component := 0;
	SELECT
		count(id)
	FROM
		modules
	WHERE
		id = NEW.module AND
		(type = 'component' OR type = 'server')
	INTO
		is_component;

	IF is_component <= 0
	THEN
		RAISE SQLSTATE '2F003' USING MESSAGE = 'Permissions can be defined only for Servers and Components, and not for other types of modules';
		RETURN NULL;
	END IF;

	RETURN NEW;
END;
$$;
-- ddl-end --
ALTER FUNCTION public.fn_check_permission_insert_is_valid() OWNER TO postgres;
-- ddl-end --

-- object: trigger_check_permission_insert_is_valid | type: TRIGGER --
-- DROP TRIGGER IF EXISTS trigger_check_permission_insert_is_valid ON public.component_permissions  ON public.component_permissions CASCADE;
CREATE TRIGGER trigger_check_permission_insert_is_valid
	BEFORE INSERT 
	ON public.component_permissions
	FOR EACH STATEMENT
	EXECUTE PROCEDURE public.fn_check_permission_insert_is_valid();
-- ddl-end --

-- object: public.fn_check_permission_update_is_valid | type: FUNCTION --
-- DROP FUNCTION IF EXISTS public.fn_check_permission_update_is_valid() CASCADE;
CREATE FUNCTION public.fn_check_permission_update_is_valid ()
	RETURNS trigger
	LANGUAGE plpgsql
	VOLATILE 
	CALLED ON NULL INPUT
	SECURITY INVOKER
	COST 1
	AS $$

BEGIN
	IF OLD.module <> NEW.module
	THEN
		RAISE SQLSTATE '2F003' USING MESSAGE = 'Module assigned to a permission is NOT mutable';
		RETURN NULL;
	END IF;

	IF OLD.name <> NEW.name
	THEN
		RAISE SQLSTATE '2F003' USING MESSAGE = 'Permission name is NOT mutable';
		RETURN NULL;
	END IF;

	RETURN NEW;
END;
$$;
-- ddl-end --
ALTER FUNCTION public.fn_check_permission_update_is_valid() OWNER TO postgres;
-- ddl-end --

-- object: trigger_check_permission_update_is_valid | type: TRIGGER --
-- DROP TRIGGER IF EXISTS trigger_check_permission_update_is_valid ON public.component_permissions  ON public.component_permissions CASCADE;
CREATE TRIGGER trigger_check_permission_update_is_valid
	BEFORE UPDATE
	ON public.component_permissions
	FOR EACH ROW
	EXECUTE PROCEDURE public.fn_check_permission_update_is_valid();
-- ddl-end --

-- object: public.tenants_modules | type: TABLE --
-- DROP TABLE IF EXISTS public.tenants_modules CASCADE;
CREATE TABLE public.tenants_modules(
	id uuid NOT NULL DEFAULT uuid_generate_v4(),
	tenant uuid NOT NULL,
	module uuid NOT NULL,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	CONSTRAINT pk_tenant_modules PRIMARY KEY (id)

);
-- ddl-end --
ALTER TABLE public.tenants_modules OWNER TO postgres;
-- ddl-end --

-- object: public.fn_check_tenant_module_upsert_is_valid | type: FUNCTION --
-- DROP FUNCTION IF EXISTS public.fn_check_tenant_module_upsert_is_valid() CASCADE;
CREATE FUNCTION public.fn_check_tenant_module_upsert_is_valid ()
	RETURNS trigger
	LANGUAGE plpgsql
	VOLATILE 
	CALLED ON NULL INPUT
	SECURITY INVOKER
	COST 1
	AS $$

DECLARE
	is_component	INTEGER;
	is_admin_only	BOOLEAN;
	component_parent	UUID;
	tenant_sub_domain	TEXT;
BEGIN
	is_component := 0;
	SELECT
		count(id)
	FROM
		modules
	WHERE
		id = NEW.module AND
		(type = 'component' OR type = 'server')
	INTO
		is_component;

	IF is_component <= 0
	THEN
		RAISE SQLSTATE '2F003' USING MESSAGE = 'Only Servers and Components can be mapped to tenants';
		RETURN NULL;
	END IF;

	component_parent := NULL;
	SELECT
		parent
	FROM
		modules
	WHERE
		id = NEW.module
	INTO
		component_parent;

	IF component_parent IS NULL
	THEN
		RETURN NEW;
	END IF;

	IF component_parent IS NOT NULL
	THEN
		is_component := 0;
		SELECT
			count(id)
		FROM
			tenants_modules
		WHERE
			tenant = NEW.tenant AND
			module = component_parent
		INTO
			is_component;

		IF is_component = 0
		THEN
			RAISE WARNING SQLSTATE '2F003' USING MESSAGE = 'Parent component not mapped to this Tenant';
		END IF;
	END IF;

	is_admin_only := false;
	SELECT
		admin_only
	FROM
		modules
	WHERE
		id = NEW.module
	INTO
		is_admin_only;

	IF is_admin_only = false
	THEN
		RETURN NEW;
	END IF;

	tenant_sub_domain := '';
	SELECT
		sub_domain
	FROM
		tenants
	WHERE
		id = NEW.tenant
	INTO
		tenant_sub_domain;

	IF tenant_sub_domain <> 'www'
	THEN
		RAISE SQLSTATE '2F003' USING MESSAGE = 'Admin only components can be mapped only to root tenant';
		RETURN NULL;
	END IF;

	RETURN NEW;
END;
$$;
-- ddl-end --
ALTER FUNCTION public.fn_check_tenant_module_upsert_is_valid() OWNER TO postgres;
-- ddl-end --

-- object: trigger_check_tenant_module_upsert_is_valid | type: TRIGGER --
-- DROP TRIGGER IF EXISTS trigger_check_tenant_module_upsert_is_valid ON public.tenants_modules  ON public.tenants_modules CASCADE;
CREATE TRIGGER trigger_check_tenant_module_upsert_is_valid
	BEFORE INSERT OR UPDATE
	ON public.tenants_modules
	FOR EACH ROW
	EXECUTE PROCEDURE public.fn_check_tenant_module_upsert_is_valid();
-- ddl-end --

-- object: trigger_notify_config_change | type: TRIGGER --
-- DROP TRIGGER IF EXISTS trigger_notify_config_change ON public.modules  ON public.modules CASCADE;
CREATE TRIGGER trigger_notify_config_change
	AFTER UPDATE
	ON public.modules
	FOR EACH ROW
	EXECUTE PROCEDURE public.fn_notify_config_change();
-- ddl-end --

-- object: trigger_check_module_upsert_is_valid | type: TRIGGER --
-- DROP TRIGGER IF EXISTS trigger_check_module_upsert_is_valid ON public.modules  ON public.modules CASCADE;
CREATE TRIGGER trigger_check_module_upsert_is_valid
	BEFORE INSERT OR UPDATE
	ON public.modules
	FOR EACH ROW
	EXECUTE PROCEDURE public.fn_check_module_upsert_is_valid();
-- ddl-end --

-- object: trigger_assign_module_to_tenant | type: TRIGGER --
-- DROP TRIGGER IF EXISTS trigger_assign_module_to_tenant ON public.modules  ON public.modules CASCADE;
CREATE TRIGGER trigger_assign_module_to_tenant
	AFTER INSERT 
	ON public.modules
	FOR EACH ROW
	EXECUTE PROCEDURE public.fn_assign_module_to_tenant();
-- ddl-end --

-- object: uidx_module_parent_name | type: INDEX --
-- DROP INDEX IF EXISTS public.uidx_module_parent_name CASCADE;
CREATE UNIQUE INDEX uidx_module_parent_name ON public.modules
	USING btree
	(
	  parent ASC NULLS LAST,
	  name ASC NULLS LAST,
	  type ASC NULLS LAST
	);
-- ddl-end --

-- object: uidx_permissions | type: INDEX --
-- DROP INDEX IF EXISTS public.uidx_permissions CASCADE;
CREATE UNIQUE INDEX uidx_permissions ON public.component_permissions
	USING btree
	(
	  module ASC NULLS LAST,
	  name ASC NULLS LAST
	);
-- ddl-end --

-- object: trigger_remove_group_permission_from_descendants | type: TRIGGER --
-- DROP TRIGGER IF EXISTS trigger_remove_group_permission_from_descendants ON public.tenant_group_permissions  ON public.tenant_group_permissions CASCADE;
CREATE TRIGGER trigger_remove_group_permission_from_descendants
	AFTER DELETE 
	ON public.tenant_group_permissions
	FOR EACH ROW
	EXECUTE PROCEDURE public.fn_remove_group_permission_from_descendants();
-- ddl-end --

-- object: uidx_tenant_modules | type: INDEX --
-- DROP INDEX IF EXISTS public.uidx_tenant_modules CASCADE;
CREATE UNIQUE INDEX uidx_tenant_modules ON public.tenants_modules
	USING btree
	(
	  tenant ASC NULLS LAST,
	  module ASC NULLS LAST
	);
-- ddl-end --

-- object: uidx_permissions_modules | type: INDEX --
-- DROP INDEX IF EXISTS public.uidx_permissions_modules CASCADE;
CREATE UNIQUE INDEX uidx_permissions_modules ON public.component_permissions
	USING btree
	(
	  module ASC NULLS LAST,
	  id ASC NULLS LAST
	);
-- ddl-end --

-- object: public.fn_assign_permission_to_tenant_group | type: FUNCTION --
-- DROP FUNCTION IF EXISTS public.fn_assign_permission_to_tenant_group() CASCADE;
CREATE FUNCTION public.fn_assign_permission_to_tenant_group ()
	RETURNS trigger
	LANGUAGE plpgsql
	VOLATILE 
	CALLED ON NULL INPUT
	SECURITY INVOKER
	COST 1
	AS $$

DECLARE
	tenant_root_tenant_group	UUID;
BEGIN
	tenant_root_tenant_group := NULL;
	SELECT
		id
	FROM
		tenant_groups
	WHERE
		tenant = NEW.tenant AND
		parent IS NULL
	INTO
		tenant_root_tenant_group;

	IF tenant_root_tenant_group IS NULL
	THEN
		RETURN NEW;
	END IF;

	INSERT INTO tenant_group_permissions(
		tenant,
		tenant_group,
		module,
		permission
	)
	SELECT
		NEW.tenant,
		tenant_root_tenant_group,
		module,
		id
	FROM
		permissions
	WHERE
		module = NEW.module;

	RETURN NEW;
END;
$$;
-- ddl-end --
ALTER FUNCTION public.fn_assign_permission_to_tenant_group() OWNER TO postgres;
-- ddl-end --

-- object: trigger_assign_permission_to_tenant_group | type: TRIGGER --
-- DROP TRIGGER IF EXISTS trigger_assign_permission_to_tenant_group ON public.tenants_modules  ON public.tenants_modules CASCADE;
CREATE TRIGGER trigger_assign_permission_to_tenant_group
	AFTER INSERT OR UPDATE
	ON public.tenants_modules
	FOR EACH ROW
	EXECUTE PROCEDURE public.fn_assign_permission_to_tenant_group();
-- ddl-end --

-- object: uidx_group_permissions | type: INDEX --
-- DROP INDEX IF EXISTS public.uidx_group_permissions CASCADE;
CREATE UNIQUE INDEX uidx_group_permissions ON public.tenant_group_permissions
	USING btree
	(
	  tenant_group ASC NULLS LAST,
	  permission ASC NULLS LAST
	);
-- ddl-end --

-- object: public.fn_assign_permission_to_tenants | type: FUNCTION --
-- DROP FUNCTION IF EXISTS public.fn_assign_permission_to_tenants() CASCADE;
CREATE FUNCTION public.fn_assign_permission_to_tenants ()
	RETURNS trigger
	LANGUAGE plpgsql
	VOLATILE 
	CALLED ON NULL INPUT
	SECURITY INVOKER
	COST 1
	AS $$
BEGIN
	INSERT INTO tenant_group_permissions (
		tenant,
		tenant_group,
		module,
		permission
	)
	SELECT
		A.tenant,
		B.id,
		A.module,
		NEW.id
	FROM
		tenants_modules A
		INNER JOIN tenant_groups B ON (A.tenant = B.tenant AND B.parent IS NULL)
	WHERE
		module = NEW.module;

	RETURN NEW;
END;
$$;
-- ddl-end --
ALTER FUNCTION public.fn_assign_permission_to_tenants() OWNER TO postgres;
-- ddl-end --

-- object: trigger_assign_permission_to_tenants | type: TRIGGER --
-- DROP TRIGGER IF EXISTS trigger_assign_permission_to_tenants ON public.component_permissions  ON public.component_permissions CASCADE;
CREATE TRIGGER trigger_assign_permission_to_tenants
	AFTER INSERT 
	ON public.component_permissions
	FOR EACH ROW
	EXECUTE PROCEDURE public.fn_assign_permission_to_tenants();
-- ddl-end --

-- object: uidx_tenant_user_groups | type: INDEX --
-- DROP INDEX IF EXISTS public.uidx_tenant_user_groups CASCADE;
CREATE UNIQUE INDEX uidx_tenant_user_groups ON public.tenants_users_groups
	USING btree
	(
	  id ASC NULLS LAST,
	  tenant_group ASC NULLS LAST
	);
-- ddl-end --

-- object: public.fn_remove_descendant_group_from_tenant_user | type: FUNCTION --
-- DROP FUNCTION IF EXISTS public.fn_remove_descendant_group_from_tenant_user() CASCADE;
CREATE FUNCTION public.fn_remove_descendant_group_from_tenant_user ()
	RETURNS trigger
	LANGUAGE plpgsql
	VOLATILE 
	CALLED ON NULL INPUT
	SECURITY INVOKER
	COST 1
	AS $$
BEGIN
	DELETE FROM
		tenants_users_groups
	WHERE
		tenant = NEW.tenant AND
		tenant_group IN (SELECT id FROM fn_get_group_descendants(NEW.tenant_group) WHERE level >= 2) AND
		tenant_user = NEW.login;

	RETURN NEW;
END;
$$;
-- ddl-end --
ALTER FUNCTION public.fn_remove_descendant_group_from_tenant_user() OWNER TO postgres;
-- ddl-end --

-- object: trigger_remove_descendant_group_from_tenant_user | type: TRIGGER --
-- DROP TRIGGER IF EXISTS trigger_remove_descendant_group_from_tenant_user ON public.tenants_users_groups  ON public.tenants_users_groups CASCADE;
CREATE TRIGGER trigger_remove_descendant_group_from_tenant_user
	AFTER INSERT OR UPDATE
	ON public.tenants_users_groups
	FOR EACH ROW
	EXECUTE PROCEDURE public.fn_remove_descendant_group_from_tenant_user();
-- ddl-end --

-- object: public.fn_check_group_permission_insert_is_valid | type: FUNCTION --
-- DROP FUNCTION IF EXISTS public.fn_check_group_permission_insert_is_valid() CASCADE;
CREATE FUNCTION public.fn_check_group_permission_insert_is_valid ()
	RETURNS trigger
	LANGUAGE plpgsql
	VOLATILE 
	CALLED ON NULL INPUT
	SECURITY INVOKER
	COST 1
	AS $$
DECLARE
	parent_tenant_group			UUID;
	does_parent_group_have_permission	INTEGER;
BEGIN
	parent_tenant_group := NULL;
	SELECT
		parent
	FROM
		tenant_groups
	WHERE
		id = NEW.tenant_group
	INTO
		parent_tenant_group;

	IF parent_tenant_group IS NULL
	THEN
		RETURN NEW;
	END IF;

	does_parent_group_have_permission := 0;
	SELECT
		count(id)
	FROM
		tenant_group_permissions
	WHERE
		tenant_group = parent_tenant_group AND
		permission = NEW.permission
	INTO
		does_parent_group_have_permission;

	IF does_parent_group_have_permission <= 0
	THEN
		RAISE SQLSTATE '2F003' USING MESSAGE = 'Parent Group does not have this permission';
		RETURN NULL;
	END IF;

	RETURN NEW;
END;
$$;
-- ddl-end --
ALTER FUNCTION public.fn_check_group_permission_insert_is_valid() OWNER TO postgres;
-- ddl-end --

-- object: trigger_check_group_permission_insert_is_valid | type: TRIGGER --
-- DROP TRIGGER IF EXISTS trigger_check_group_permission_insert_is_valid ON public.tenant_group_permissions  ON public.tenant_group_permissions CASCADE;
CREATE TRIGGER trigger_check_group_permission_insert_is_valid
	BEFORE INSERT OR UPDATE
	ON public.tenant_group_permissions
	FOR EACH ROW
	EXECUTE PROCEDURE public.fn_check_group_permission_insert_is_valid();
-- ddl-end --

-- object: public.fn_check_tenant_user_group_upsert_is_valid | type: FUNCTION --
-- DROP FUNCTION IF EXISTS public.fn_check_tenant_user_group_upsert_is_valid() CASCADE;
CREATE FUNCTION public.fn_check_tenant_user_group_upsert_is_valid ()
	RETURNS trigger
	LANGUAGE plpgsql
	VOLATILE 
	CALLED ON NULL INPUT
	SECURITY INVOKER
	COST 1
	AS $$
DECLARE
	is_member_of_ancestor_group	INTEGER;
BEGIN
	is_member_of_ancestor_group := 0;
	SELECT
		count(id)
	FROM
		tenants_users_groups
	WHERE
		tenant = NEW.tenant AND
		tenant_group IN (SELECT id FROM fn_get_group_ancestors(NEW.tenant_group) WHERE level > 1) AND
		tenant_user = NEW.tenant_user
	INTO
		is_member_of_ancestor_group;

	IF is_member_of_ancestor_group = 0
	THEN
		RETURN NEW;
	END IF;

	RAISE SQLSTATE '2F003' USING MESSAGE = 'User is already a member of a Parent Group';
	RETURN NULL;
END;
$$;
-- ddl-end --
ALTER FUNCTION public.fn_check_tenant_user_group_upsert_is_valid() OWNER TO postgres;
-- ddl-end --

-- object: trigger_check_tenant_user_group_upsert_is_valid | type: TRIGGER --
-- DROP TRIGGER IF EXISTS trigger_check_tenant_user_group_upsert_is_valid ON public.tenants_users_groups  ON public.tenants_users_groups CASCADE;
CREATE TRIGGER trigger_check_tenant_user_group_upsert_is_valid
	BEFORE INSERT OR UPDATE
	ON public.tenants_users_groups
	FOR EACH ROW
	EXECUTE PROCEDURE public.fn_check_tenant_user_group_upsert_is_valid();
-- ddl-end --

-- object: public.media_type | type: TYPE --
-- DROP TYPE IF EXISTS public.media_type CASCADE;
CREATE TYPE public.media_type AS
 ENUM ('desktop','tablet','tv','phone','other');
-- ddl-end --
ALTER TYPE public.media_type OWNER TO postgres;
-- ddl-end --

-- object: public.component_widgets | type: TABLE --
-- DROP TABLE IF EXISTS public.component_widgets CASCADE;
CREATE TABLE public.component_widgets(
	id uuid NOT NULL DEFAULT uuid_generate_v4(),
	module uuid NOT NULL,
	ember_component text NOT NULL,
	notification_area_only boolean NOT NULL DEFAULT false,
	display_name text NOT NULL,
	description text,
	metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	CONSTRAINT pk_component_widgets PRIMARY KEY (id)

);
-- ddl-end --
ALTER TABLE public.component_widgets OWNER TO postgres;
-- ddl-end --

-- object: uidx_component_widgets | type: INDEX --
-- DROP INDEX IF EXISTS public.uidx_component_widgets CASCADE;
CREATE UNIQUE INDEX uidx_component_widgets ON public.component_widgets
	USING btree
	(
	  ember_component ASC NULLS LAST
	);
-- ddl-end --

-- object: public.fn_check_component_widget_upsert_is_valid | type: FUNCTION --
-- DROP FUNCTION IF EXISTS public.fn_check_component_widget_upsert_is_valid() CASCADE;
CREATE FUNCTION public.fn_check_component_widget_upsert_is_valid ()
	RETURNS trigger
	LANGUAGE plpgsql
	VOLATILE 
	CALLED ON NULL INPUT
	SECURITY INVOKER
	COST 1
	AS $$
DECLARE
	is_component	INTEGER;
BEGIN
	is_component := 0;
	SELECT
		count(id)
	FROM
		modules
	WHERE
		id = NEW.module AND
		(type = 'component' OR type = 'server')
	INTO
		is_component;

	IF is_component <= 0
	THEN
		RAISE SQLSTATE '2F003' USING MESSAGE = 'Widgets can be assigned only to Servers and Components';
		RETURN NULL;
	END IF;

	RETURN NEW;
END;
$$;
-- ddl-end --
ALTER FUNCTION public.fn_check_component_widget_upsert_is_valid() OWNER TO postgres;
-- ddl-end --

-- object: public.fn_get_user_permissions | type: FUNCTION --
-- DROP FUNCTION IF EXISTS public.fn_get_user_permissions(IN text,IN uuid) CASCADE;
CREATE FUNCTION public.fn_get_user_permissions (IN tenantsubdomain text, IN userid uuid)
	RETURNS TABLE ( permission uuid)
	LANGUAGE plpgsql
	VOLATILE 
	CALLED ON NULL INPUT
	SECURITY INVOKER
	COST 1
	AS $$
BEGIN
	RETURN QUERY
	SELECT DISTINCT
		A.permission
	FROM
		tenant_group_permissions A
	WHERE
		A.tenant_group IN (
			SELECT 
				B.tenant_group
			FROM
				tenants_users_groups B
			WHERE
				B.tenant_user IN (
					SELECT
						C.id
					FROM
						tenants_users C
					WHERE
						C.login = userid AND 
						C.tenant = (SELECT id FROM tenants WHERE sub_domain = tenantsubdomain)
				)
			);
END;
$$;
-- ddl-end --
ALTER FUNCTION public.fn_get_user_permissions(IN text,IN uuid) OWNER TO postgres;
-- ddl-end --

-- object: trigger_check_component_widget_upsert_is_valid | type: TRIGGER --
-- DROP TRIGGER IF EXISTS trigger_check_component_widget_upsert_is_valid ON public.component_widgets  ON public.component_widgets CASCADE;
CREATE TRIGGER trigger_check_component_widget_upsert_is_valid
	BEFORE INSERT OR UPDATE
	ON public.component_widgets
	FOR EACH ROW
	EXECUTE PROCEDURE public.fn_check_component_widget_upsert_is_valid();
-- ddl-end --

-- object: public.contact_type | type: TYPE --
-- DROP TYPE IF EXISTS public.contact_type CASCADE;
CREATE TYPE public.contact_type AS
 ENUM ('email','landline','mobile','other');
-- ddl-end --
ALTER TYPE public.contact_type OWNER TO postgres;
-- ddl-end --

-- object: public.user_contacts | type: TABLE --
-- DROP TABLE IF EXISTS public.user_contacts CASCADE;
CREATE TABLE public.user_contacts(
	id uuid NOT NULL DEFAULT uuid_generate_v4(),
	login uuid NOT NULL,
	contact text NOT NULL,
	type public.contact_type NOT NULL DEFAULT 'other'::contact_type,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	CONSTRAINT pk_contacts PRIMARY KEY (id)

);
-- ddl-end --
ALTER TABLE public.user_contacts OWNER TO postgres;
-- ddl-end --

-- object: public.user_emergency_contacts | type: TABLE --
-- DROP TABLE IF EXISTS public.user_emergency_contacts CASCADE;
CREATE TABLE public.user_emergency_contacts(
	id uuid NOT NULL DEFAULT uuid_generate_v4(),
	login uuid NOT NULL,
	contact uuid NOT NULL,
	relationship text,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	CONSTRAINT pk_user_emergency_contacts PRIMARY KEY (id)

);
-- ddl-end --
ALTER TABLE public.user_emergency_contacts OWNER TO postgres;
-- ddl-end --

-- object: uidx_user_emergency_contacts | type: INDEX --
-- DROP INDEX IF EXISTS public.uidx_user_emergency_contacts CASCADE;
CREATE UNIQUE INDEX uidx_user_emergency_contacts ON public.user_emergency_contacts
	USING btree
	(
	  login ASC NULLS LAST,
	  contact ASC NULLS LAST
	);
-- ddl-end --

-- object: public.fn_remove_descendant_module_from_tenant | type: FUNCTION --
-- DROP FUNCTION IF EXISTS public.fn_remove_descendant_module_from_tenant() CASCADE;
CREATE FUNCTION public.fn_remove_descendant_module_from_tenant ()
	RETURNS trigger
	LANGUAGE plpgsql
	VOLATILE 
	CALLED ON NULL INPUT
	SECURITY INVOKER
	COST 1
	AS $$
BEGIN
	DELETE FROM
		tenants_modules
	WHERE
		tenant = OLD.tenant AND
		module IN (SELECT id FROM fn_get_module_descendants(OLD.module) WHERE level = 2);

	RETURN OLD;
END;
$$;
-- ddl-end --
ALTER FUNCTION public.fn_remove_descendant_module_from_tenant() OWNER TO postgres;
-- ddl-end --

-- object: trigger_remove_descendant_module_from_tenant | type: TRIGGER --
-- DROP TRIGGER IF EXISTS trigger_remove_descendant_module_from_tenant ON public.tenants_modules  ON public.tenants_modules CASCADE;
CREATE TRIGGER trigger_remove_descendant_module_from_tenant
	AFTER DELETE 
	ON public.tenants_modules
	FOR EACH ROW
	EXECUTE PROCEDURE public.fn_remove_descendant_module_from_tenant();
-- ddl-end --

-- object: uidx_tenant_id | type: INDEX --
-- DROP INDEX IF EXISTS public.uidx_tenant_id CASCADE;
CREATE UNIQUE INDEX uidx_tenant_id ON public.tenants_users
	USING btree
	(
	  tenant ASC NULLS LAST,
	  id ASC NULLS LAST
	);
-- ddl-end --

-- object: public.tenants_users_locations | type: TABLE --
-- DROP TABLE IF EXISTS public.tenants_users_locations CASCADE;
CREATE TABLE public.tenants_users_locations(
	id uuid NOT NULL DEFAULT uuid_generate_v4(),
	tenant uuid NOT NULL,
	tenant_location uuid NOT NULL,
	tenant_user uuid NOT NULL,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	CONSTRAINT pk_tenants_users_locations PRIMARY KEY (id)

);
-- ddl-end --
ALTER TABLE public.tenants_users_locations OWNER TO postgres;
-- ddl-end --

-- object: uidx_tenants_users_locations | type: INDEX --
-- DROP INDEX IF EXISTS public.uidx_tenants_users_locations CASCADE;
CREATE UNIQUE INDEX uidx_tenants_users_locations ON public.tenants_users_locations
	USING btree
	(
	  tenant_location ASC NULLS LAST,
	  tenant_user ASC NULLS LAST
	);
-- ddl-end --

-- object: public.tenants_users_groups_job_titles | type: TABLE --
-- DROP TABLE IF EXISTS public.tenants_users_groups_job_titles CASCADE;
CREATE TABLE public.tenants_users_groups_job_titles(
	id uuid NOT NULL DEFAULT uuid_generate_v4(),
	tenant_group uuid NOT NULL,
	tenant_group_job_title uuid NOT NULL,
	tenant_user_group uuid NOT NULL,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	CONSTRAINT pk_tenant_users_groups_job_titles PRIMARY KEY (id)

);
-- ddl-end --
ALTER TABLE public.tenants_users_groups_job_titles OWNER TO postgres;
-- ddl-end --

-- object: uidx_tenant_users_groups_job_titles | type: INDEX --
-- DROP INDEX IF EXISTS public.uidx_tenant_users_groups_job_titles CASCADE;
CREATE UNIQUE INDEX uidx_tenant_users_groups_job_titles ON public.tenants_users_groups_job_titles
	USING btree
	(
	  tenant_group_job_title ASC NULLS LAST,
	  tenant_user_group ASC NULLS LAST
	);
-- ddl-end --

-- object: public.component_widgets_permissions | type: TABLE --
-- DROP TABLE IF EXISTS public.component_widgets_permissions CASCADE;
CREATE TABLE public.component_widgets_permissions(
	id uuid NOT NULL DEFAULT uuid_generate_v4(),
	component_widget uuid NOT NULL,
	component_permission uuid NOT NULL,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	CONSTRAINT pk_component_widgets_permissions PRIMARY KEY (id)

);
-- ddl-end --
ALTER TABLE public.component_widgets_permissions OWNER TO postgres;
-- ddl-end --

-- object: uidx_component_widgets_permissions | type: INDEX --
-- DROP INDEX IF EXISTS public.uidx_component_widgets_permissions CASCADE;
CREATE UNIQUE INDEX uidx_component_widgets_permissions ON public.component_widgets_permissions
	USING btree
	(
	  component_widget ASC NULLS LAST,
	  component_permission ASC NULLS LAST
	);
-- ddl-end --

-- object: public.fn_check_component_widget_permission_upsert_is_valid | type: FUNCTION --
-- DROP FUNCTION IF EXISTS public.fn_check_component_widget_permission_upsert_is_valid() CASCADE;
CREATE FUNCTION public.fn_check_component_widget_permission_upsert_is_valid ()
	RETURNS trigger
	LANGUAGE plpgsql
	VOLATILE 
	CALLED ON NULL INPUT
	SECURITY INVOKER
	COST 1
	AS $$
DECLARE
	is_valid_permission INTEGER;
	module_id UUID;
BEGIN
	SELECT
		module
	FROM
		component_widgets
	WHERE
		id = NEW.component_widget
	INTO
		module_id;

	is_valid_permission := 0;
	SELECT
		count(id)
	FROM
		component_permissions
	WHERE
		id = NEW.component_permission AND
		module IN (SELECT id FROM fn_get_module_ancestors(module_id))
	INTO
		is_valid_permission;

	IF is_valid_permission <= 0 THEN
	BEGIN
		RAISE SQLSTATE '2F003' USING MESSAGE = 'Widgets must use permissions defined by the module or one of its parents';
		RETURN NULL;
	END;

	RETURN NEW;
END
$$;
-- ddl-end --
ALTER FUNCTION public.fn_check_component_widget_permission_upsert_is_valid() OWNER TO postgres;
-- ddl-end --

-- object: trigger_component_widgets_permissions | type: TRIGGER --
-- DROP TRIGGER IF EXISTS trigger_component_widgets_permissions ON public.component_widgets_permissions  ON public.component_widgets_permissions CASCADE;
CREATE TRIGGER trigger_component_widgets_permissions
	BEFORE INSERT OR UPDATE
	ON public.component_widgets_permissions
	FOR EACH ROW
	EXECUTE PROCEDURE public.fn_check_component_widget_permission_upsert_is_valid();
-- ddl-end --

-- object: uidx_tenants_users_groups_2 | type: INDEX --
-- DROP INDEX IF EXISTS public.uidx_tenants_users_groups_2 CASCADE;
CREATE UNIQUE INDEX uidx_tenants_users_groups_2 ON public.tenants_users_groups
	USING btree
	(
	  tenant_group ASC NULLS LAST,
	  tenant_user ASC NULLS LAST
	);
-- ddl-end --

-- object: uidx_tenant_sub_domain | type: INDEX --
-- DROP INDEX IF EXISTS public.uidx_tenant_sub_domain CASCADE;
CREATE UNIQUE INDEX uidx_tenant_sub_domain ON public.tenants
	USING btree
	(
	  sub_domain ASC NULLS LAST
	);
-- ddl-end --

-- object: public.component_widget_templates | type: TABLE --
-- DROP TABLE IF EXISTS public.component_widget_templates CASCADE;
CREATE TABLE public.component_widget_templates(
	id uuid NOT NULL DEFAULT uuid_generate_v4(),
	component_widget uuid NOT NULL,
	ember_template text NOT NULL,
	display_name text NOT NULL,
	description text,
	media public.media_type NOT NULL DEFAULT 'desktop'::media_type,
	metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
	is_default boolean NOT NULL DEFAULT 'false'::boolean,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	CONSTRAINT pk_component_widget_templates PRIMARY KEY (id)

);
-- ddl-end --
ALTER TABLE public.component_widget_templates OWNER TO postgres;
-- ddl-end --

-- object: uidx_component_widget_templates | type: INDEX --
-- DROP INDEX IF EXISTS public.uidx_component_widget_templates CASCADE;
CREATE UNIQUE INDEX uidx_component_widget_templates ON public.component_widget_templates
	USING btree
	(
	  ember_template ASC NULLS LAST,
	  media ASC NULLS LAST,
	  is_default ASC NULLS LAST
	);
-- ddl-end --

-- object: public.server_templates | type: TABLE --
-- DROP TABLE IF EXISTS public.server_templates CASCADE;
CREATE TABLE public.server_templates(
	id uuid NOT NULL DEFAULT uuid_generate_v4(),
	module uuid NOT NULL,
	media public.media_type NOT NULL DEFAULT 'desktop',
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	CONSTRAINT pk_server_templates PRIMARY KEY (id)

);
-- ddl-end --
ALTER TABLE public.server_templates OWNER TO postgres;
-- ddl-end --

-- object: public.fn_check_server_template_upsert_is_valid | type: FUNCTION --
-- DROP FUNCTION IF EXISTS public.fn_check_server_template_upsert_is_valid() CASCADE;
CREATE FUNCTION public.fn_check_server_template_upsert_is_valid ()
	RETURNS trigger
	LANGUAGE plpgsql
	VOLATILE 
	CALLED ON NULL INPUT
	SECURITY INVOKER
	COST 1
	AS $$
DECLARE
	is_template	INTEGER;
BEGIN
	is_template := 0;
	SELECT
		count(id)
	FROM
		modules
	WHERE
		id = NEW.module AND
		type = 'template'
	INTO
		is_template;

	IF is_template = 0
	THEN
		RAISE SQLSTATE '2F003' USING MESSAGE = 'Only Server Templates' ;
		RETURN NULL;
	END IF;

	RETURN NEW;
END;
$$;
-- ddl-end --
ALTER FUNCTION public.fn_check_server_template_upsert_is_valid() OWNER TO postgres;
-- ddl-end --

-- object: trigger_check_server_template_upsert_is_valid | type: TRIGGER --
-- DROP TRIGGER IF EXISTS trigger_check_server_template_upsert_is_valid ON public.server_templates  ON public.server_templates CASCADE;
CREATE TRIGGER trigger_check_server_template_upsert_is_valid
	BEFORE INSERT OR UPDATE
	ON public.server_templates
	FOR EACH ROW
	EXECUTE PROCEDURE public.fn_check_server_template_upsert_is_valid();
-- ddl-end --

-- object: public.tenant_folders | type: TABLE --
-- DROP TABLE IF EXISTS public.tenant_folders CASCADE;
CREATE TABLE public.tenant_folders(
	id uuid NOT NULL DEFAULT uuid_generate_v4(),
	tenant uuid NOT NULL,
	parent uuid,
	name text NOT NULL,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	CONSTRAINT pk_tenant_folders PRIMARY KEY (id)

);
-- ddl-end --
ALTER TABLE public.tenant_folders OWNER TO postgres;
-- ddl-end --

-- object: uidx_tenant_folders_1 | type: INDEX --
-- DROP INDEX IF EXISTS public.uidx_tenant_folders_1 CASCADE;
CREATE UNIQUE INDEX uidx_tenant_folders_1 ON public.tenant_folders
	USING btree
	(
	  parent ASC NULLS LAST,
	  name ASC NULLS LAST
	);
-- ddl-end --

-- object: public.tenant_applications | type: TABLE --
-- DROP TABLE IF EXISTS public.tenant_applications CASCADE;
CREATE TABLE public.tenant_applications(
	id uuid NOT NULL DEFAULT uuid_generate_v4(),
	tenant uuid NOT NULL,
	name text NOT NULL,
	media public.media_type NOT NULL DEFAULT 'desktop'::media_type,
	is_default boolean NOT NULL DEFAULT 'false'::boolean,
	description text,
	metadata jsonb DEFAULT '{}'::jsonb,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	CONSTRAINT pk_tenant_applications PRIMARY KEY (id)

);
-- ddl-end --
ALTER TABLE public.tenant_applications OWNER TO postgres;
-- ddl-end --

-- object: uidx_tenant_applications_1 | type: INDEX --
-- DROP INDEX IF EXISTS public.uidx_tenant_applications_1 CASCADE;
CREATE UNIQUE INDEX uidx_tenant_applications_1 ON public.tenant_applications
	USING btree
	(
	  tenant ASC NULLS LAST,
	  name ASC NULLS LAST,
	  media ASC NULLS LAST
	);
-- ddl-end --

-- object: public.tenant_application_screens | type: TABLE --
-- DROP TABLE IF EXISTS public.tenant_application_screens CASCADE;
CREATE TABLE public.tenant_application_screens(
	id uuid NOT NULL DEFAULT uuid_generate_v4(),
	tenant_application uuid NOT NULL,
	name text NOT NULL,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	CONSTRAINT pk_tenant_application_screens PRIMARY KEY (id)

);
-- ddl-end --
ALTER TABLE public.tenant_application_screens OWNER TO postgres;
-- ddl-end --

-- object: public.tenant_application_menus | type: TABLE --
-- DROP TABLE IF EXISTS public.tenant_application_menus CASCADE;
CREATE TABLE public.tenant_application_menus(
	id uuid NOT NULL DEFAULT uuid_generate_v4(),
	tenant_application uuid NOT NULL,
	name text NOT NULL,
	description text,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	CONSTRAINT pk_tenant_application_menus PRIMARY KEY (id)

);
-- ddl-end --
ALTER TABLE public.tenant_application_menus OWNER TO postgres;
-- ddl-end --

-- object: public.tenant_application_menu_items | type: TABLE --
-- DROP TABLE IF EXISTS public.tenant_application_menu_items CASCADE;
CREATE TABLE public.tenant_application_menu_items(
	id uuid NOT NULL DEFAULT uuid_generate_v4(),
	tenant_application uuid NOT NULL,
	tenant_application_menu uuid NOT NULL,
	tenant_application_screen uuid,
	parent uuid,
	display_text text NOT NULL,
	description text,
	is_home boolean NOT NULL DEFAULT 'false'::boolean,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	CONSTRAINT pk_tenant_application_menu_items PRIMARY KEY (id)

);
-- ddl-end --
ALTER TABLE public.tenant_application_menu_items OWNER TO postgres;
-- ddl-end --

-- object: uidx_tenant_application_menus | type: INDEX --
-- DROP INDEX IF EXISTS public.uidx_tenant_application_menus CASCADE;
CREATE UNIQUE INDEX uidx_tenant_application_menus ON public.tenant_application_menus
	USING btree
	(
	  tenant_application ASC NULLS LAST,
	  id ASC NULLS LAST
	);
-- ddl-end --

-- object: uidx_tenant_application_screens | type: INDEX --
-- DROP INDEX IF EXISTS public.uidx_tenant_application_screens CASCADE;
CREATE UNIQUE INDEX uidx_tenant_application_screens ON public.tenant_application_screens
	USING btree
	(
	  tenant_application ASC NULLS LAST,
	  id ASC NULLS LAST
	);
-- ddl-end --

-- object: public.fn_get_folder_ancestors | type: FUNCTION --
-- DROP FUNCTION IF EXISTS public.fn_get_folder_ancestors(IN uuid) CASCADE;
CREATE FUNCTION public.fn_get_folder_ancestors (IN folderid uuid)
	RETURNS TABLE ( level integer,  id uuid,  parent uuid,  name text)
	LANGUAGE plpgsql
	VOLATILE 
	CALLED ON NULL INPUT
	SECURITY INVOKER
	COST 1
	AS $$
BEGIN
	RETURN QUERY
	WITH RECURSIVE q AS (
		SELECT
			1 AS level,
			A.id,
			A.parent,
			A.name
		FROM
			tenant_folders A
		WHERE
			A.id = folderid
		UNION ALL
		SELECT
			q.level + 1,
			B.id,
			B.parent,
			B.name
		FROM
			q,
			tenant_folders B
		WHERE
			B.id = q.parent
	)
	SELECT DISTINCT
		q.level,
		q.id,
		q.parent,
		q.name
	FROM
		q
	ORDER BY
		q.level,
		q.parent;
END;

$$;
-- ddl-end --
ALTER FUNCTION public.fn_get_folder_ancestors(IN uuid) OWNER TO postgres;
-- ddl-end --

-- object: public.fn_get_folder_descendants | type: FUNCTION --
-- DROP FUNCTION IF EXISTS public.fn_get_folder_descendants(IN uuid) CASCADE;
CREATE FUNCTION public.fn_get_folder_descendants (IN folderid uuid)
	RETURNS TABLE ( level integer,  id uuid,  parent uuid,  name text)
	LANGUAGE plpgsql
	VOLATILE 
	CALLED ON NULL INPUT
	SECURITY INVOKER
	COST 1
	AS $$
BEGIN
	RETURN QUERY
	WITH RECURSIVE q AS (
		SELECT
			1 AS level,
			A.id,
			A.parent,
			A.name
		FROM
			tenant_folders A
		WHERE
			A.id = folderid
		UNION ALL
		SELECT
			q.level + 1,
			B.id,
			B.parent,
			B.name
		FROM
			q,
			tenant_folders B
		WHERE
			B.parent = q.id
	)
	SELECT DISTINCT
		q.level,
		q.id,
		q.parent,
		q.name
	FROM
		q
	ORDER BY
		q.level,
		q.parent;
END;

$$;
-- ddl-end --
ALTER FUNCTION public.fn_get_folder_descendants(IN uuid) OWNER TO postgres;
-- ddl-end --

-- object: public.fn_check_folder_upsert_is_valid | type: FUNCTION --
-- DROP FUNCTION IF EXISTS public.fn_check_folder_upsert_is_valid() CASCADE;
CREATE FUNCTION public.fn_check_folder_upsert_is_valid ()
	RETURNS trigger
	LANGUAGE plpgsql
	VOLATILE 
	CALLED ON NULL INPUT
	SECURITY INVOKER
	COST 1
	AS $$
DECLARE
	is_folder_in_tree	INTEGER;
BEGIN
	IF TG_OP = 'UPDATE'
	THEN
		IF OLD.tenant <> NEW.tenant
		THEN
			RAISE SQLSTATE '2F003' USING MESSAGE = 'Folders cannot be migrated from one Tenant to another';
			RETURN NULL;
		END IF;
	END IF;

	IF NEW.id = NEW.parent
	THEN
		RAISE SQLSTATE '2F003' USING MESSAGE = 'Folder cannot be its own parent';
		RETURN NULL;
	END IF;

	/* Check if the folder is its own ancestor */
	is_folder_in_tree := 0;
	SELECT
		COUNT(id)
	FROM
		fn_get_folder_ancestors(NEW.parent)
	WHERE
		id = NEW.id
	INTO
		is_folder_in_tree;

	IF is_folder_in_tree > 0
	THEN
		RAISE SQLSTATE '2F003' USING MESSAGE = 'Folder cannot be its own ancestor';
		RETURN NULL;
	END IF;

	/* Check if the folder is its own descendant */
	is_folder_in_tree := 0;
	SELECT
		COUNT(id)
	FROM
		fn_get_folder_descendants(NEW.id)
	WHERE
		id = NEW.id AND
		level > 1
	INTO
		is_folder_in_tree;

	IF is_folder_in_tree > 0
	THEN
		RAISE SQLSTATE '2F003' USING MESSAGE = 'Folder cannot be its own descendant';
		RETURN NULL;
	END IF;

	RETURN NEW;
END;

$$;
-- ddl-end --
ALTER FUNCTION public.fn_check_folder_upsert_is_valid() OWNER TO postgres;
-- ddl-end --

-- object: trigger_check_folder_upsert_is_valid | type: TRIGGER --
-- DROP TRIGGER IF EXISTS trigger_check_folder_upsert_is_valid ON public.tenant_folders  ON public.tenant_folders CASCADE;
CREATE TRIGGER trigger_check_folder_upsert_is_valid
	BEFORE INSERT OR UPDATE
	ON public.tenant_folders
	FOR EACH ROW
	EXECUTE PROCEDURE public.fn_check_folder_upsert_is_valid();
-- ddl-end --

-- object: public.fn_get_tenant_application_menu_item_ancestors | type: FUNCTION --
-- DROP FUNCTION IF EXISTS public.fn_get_tenant_application_menu_item_ancestors(IN uuid) CASCADE;
CREATE FUNCTION public.fn_get_tenant_application_menu_item_ancestors (IN menuitemid uuid)
	RETURNS TABLE ( level integer,  id uuid,  parent uuid,  tenant_application_menu uuid,  display_text text)
	LANGUAGE plpgsql
	VOLATILE 
	CALLED ON NULL INPUT
	SECURITY INVOKER
	COST 1
	AS $$
BEGIN
	RETURN QUERY
	WITH RECURSIVE q AS (
		SELECT
			1 AS level,
			A.id,
			A.parent,
			A.tenant_application_menu,
			A.display_text
		FROM
			tenant_application_menu_items A
		WHERE
			A.id = menuitemid
		UNION ALL
		SELECT
			q.level + 1,
			B.id,
			B.parent,
			B.tenant_application_menu,
			B.display_text
		FROM
			q,
			tenant_application_menu_items B
		WHERE
			B.id = q.parent
	)
	SELECT DISTINCT
		q.level,
		q.id,
		q.parent,
		q.tenant_application_menu,
		q.display_text
	FROM
		q
	ORDER BY
		q.level,
		q.parent;
END;

$$;
-- ddl-end --
ALTER FUNCTION public.fn_get_tenant_application_menu_item_ancestors(IN uuid) OWNER TO postgres;
-- ddl-end --

-- object: public.fn_get_tenant_application_menu_item_descendants | type: FUNCTION --
-- DROP FUNCTION IF EXISTS public.fn_get_tenant_application_menu_item_descendants(IN uuid) CASCADE;
CREATE FUNCTION public.fn_get_tenant_application_menu_item_descendants (IN menuitemid uuid)
	RETURNS TABLE ( level integer,  id uuid,  parent uuid,  tenant_application_menu uuid,  display_text text)
	LANGUAGE plpgsql
	VOLATILE 
	CALLED ON NULL INPUT
	SECURITY INVOKER
	COST 1
	AS $$
BEGIN
	RETURN QUERY
	WITH RECURSIVE q AS (
		SELECT
			1 AS level,
			A.id,
			A.parent,
			A.tenant_application_menu,
			A.display_text
		FROM
			tenant_application_menu_items A
		WHERE
			A.id = menuitemid
		UNION ALL
		SELECT
			q.level + 1,
			B.id,
			B.parent,
			B.tenant_application_menu,
			B.display_text
		FROM
			q,
			tenant_application_menu_items B
		WHERE
			B.parent = q.id
	)
	SELECT DISTINCT
		q.level,
		q.id,
		q.parent,
		q.tenant_application_menu,
		q.display_text
	FROM
		q
	ORDER BY
		q.level,
		q.parent;
END;

$$;
-- ddl-end --
ALTER FUNCTION public.fn_get_tenant_application_menu_item_descendants(IN uuid) OWNER TO postgres;
-- ddl-end --

-- object: public.fn_check_tenant_application_menu_item_upsert_is_valid | type: FUNCTION --
-- DROP FUNCTION IF EXISTS public.fn_check_tenant_application_menu_item_upsert_is_valid() CASCADE;
CREATE FUNCTION public.fn_check_tenant_application_menu_item_upsert_is_valid ()
	RETURNS trigger
	LANGUAGE plpgsql
	VOLATILE 
	CALLED ON NULL INPUT
	SECURITY INVOKER
	COST 1
	AS $$
DECLARE
	is_menu_item_in_tree	INTEGER;
BEGIN
	IF TG_OP = 'UPDATE'
	THEN
		IF OLD.tenant_application_menu <> NEW.tenant_application_menu
		THEN
			RAISE SQLSTATE '2F003' USING MESSAGE = 'Menu Item cannot be moved across Menus';
			RETURN NULL;
		END IF;
	END IF;

	IF NEW.id = NEW.parent
	THEN
		RAISE SQLSTATE '2F003' USING MESSAGE = 'Menu Item cannot be its own parent';
		RETURN NULL;
	END IF;

	/* Check if the menu item is its own ancestor */
	is_menu_item_in_tree := 0;
	SELECT
		COUNT(id)
	FROM
		fn_get_tenant_application_menu_item_ancestors(NEW.parent)
	WHERE
		id = NEW.id
	INTO
		is_menu_item_in_tree;

	IF is_menu_item_in_tree > 0
	THEN
		RAISE SQLSTATE '2F003' USING MESSAGE = 'Menu Item cannot be its own ancestor';
		RETURN NULL;
	END IF;

	/* Check if the menu item is its own descendant */
	is_menu_item_in_tree := 0;
	SELECT
		COUNT(id)
	FROM
		fn_get_tenant_application_menu_item_descendants(NEW.id)
	WHERE
		id = NEW.id AND
		level > 1
	INTO
		is_menu_item_in_tree;

	IF is_menu_item_in_tree > 0
	THEN
		RAISE SQLSTATE '2F003' USING MESSAGE = 'Menu Item cannot be its own descendant';
		RETURN NULL;
	END IF;

	RETURN NEW;
END;

$$;
-- ddl-end --
ALTER FUNCTION public.fn_check_tenant_application_menu_item_upsert_is_valid() OWNER TO postgres;
-- ddl-end --

-- object: uidx_tenant_application_menu_items | type: INDEX --
-- DROP INDEX IF EXISTS public.uidx_tenant_application_menu_items CASCADE;
CREATE UNIQUE INDEX uidx_tenant_application_menu_items ON public.tenant_application_menu_items
	USING btree
	(
	  parent ASC NULLS LAST,
	  display_text ASC NULLS LAST
	);
-- ddl-end --

-- object: trigger_check_tenant_application_menu_item_upsert_is_valid | type: TRIGGER --
-- DROP TRIGGER IF EXISTS trigger_check_tenant_application_menu_item_upsert_is_valid ON public.tenant_application_menu_items  ON public.tenant_application_menu_items CASCADE;
CREATE TRIGGER trigger_check_tenant_application_menu_item_upsert_is_valid
	BEFORE INSERT OR UPDATE
	ON public.tenant_application_menu_items
	FOR EACH ROW
	EXECUTE PROCEDURE public.fn_check_tenant_application_menu_item_upsert_is_valid();
-- ddl-end --

-- object: public.fn_check_tenant_user_upsert_is_valid | type: FUNCTION --
-- DROP FUNCTION IF EXISTS public.fn_check_tenant_user_upsert_is_valid() CASCADE;
CREATE FUNCTION public.fn_check_tenant_user_upsert_is_valid ()
	RETURNS trigger
	LANGUAGE plpgsql
	VOLATILE 
	CALLED ON NULL INPUT
	SECURITY INVOKER
	COST 1
	AS $$
DECLARE
	is_valid_default_tenant_application	INTEGER;
	is_valid_default_server_application	INTEGER;
BEGIN
	IF TG_OP = 'UPDATE'
	THEN
		IF OLD.tenant <> NEW.tenant
		THEN
			RAISE SQLSTATE '2F003' USING MESSAGE = 'Tenant is NOT mutable';
			RETURN NULL;
		END IF;

		IF OLD.login <> NEW.login
		THEN
			RAISE SQLSTATE '2F003' USING MESSAGE = 'Login is NOT mutable';
			RETURN NULL;
		END IF;
	END IF;

	IF NEW.default_tenant_application IS NOT NULL
	THEN
		is_valid_default_tenant_application := 0;
		is_valid_default_server_application := 0;

		SELECT
			count(id)
		FROM
			tenant_applications
		WHERE
			id = NEW.default_tenant_application AND
			tenant = NEW.tenant
		INTO
			is_valid_default_tenant_application;

		SELECT
			count(id)
		FROM
			server_applications
		WHERE
			id = NEW.default_tenant_application
		INTO
			is_valid_default_server_application;

		IF is_valid_default_tenant_application = 0 AND is_valid_default_server_application = 0
		THEN
			RAISE SQLSTATE '2F003' USING MESSAGE = 'Invalid default applciation';
			RETURN NULL;
		END IF;
	END IF;

	RETURN NEW;
END;

$$;
-- ddl-end --
ALTER FUNCTION public.fn_check_tenant_user_upsert_is_valid() OWNER TO postgres;
-- ddl-end --

-- object: trigger_check_tenant_user_upsert_is_valid | type: TRIGGER --
-- DROP TRIGGER IF EXISTS trigger_check_tenant_user_upsert_is_valid ON public.tenants_users  ON public.tenants_users CASCADE;
CREATE TRIGGER trigger_check_tenant_user_upsert_is_valid
	BEFORE INSERT OR UPDATE
	ON public.tenants_users
	FOR EACH ROW
	EXECUTE PROCEDURE public.fn_check_tenant_user_upsert_is_valid();
-- ddl-end --

-- object: public.tenants_server_templates | type: TABLE --
-- DROP TABLE IF EXISTS public.tenants_server_templates CASCADE;
CREATE TABLE public.tenants_server_templates(
	id uuid NOT NULL DEFAULT uuid_generate_v4(),
	tenant uuid NOT NULL,
	server_template uuid NOT NULL,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	CONSTRAINT pk_tenants_server_templates PRIMARY KEY (id)

);
-- ddl-end --
ALTER TABLE public.tenants_server_templates OWNER TO postgres;
-- ddl-end --

-- object: uidx_tenants_server_templates | type: INDEX --
-- DROP INDEX IF EXISTS public.uidx_tenants_server_templates CASCADE;
CREATE UNIQUE INDEX uidx_tenants_server_templates ON public.tenants_server_templates
	USING btree
	(
	  tenant ASC NULLS LAST,
	  server_template ASC NULLS LAST
	);
-- ddl-end --

-- object: public.server_application_category | type: TYPE --
-- DROP TYPE IF EXISTS public.server_application_category CASCADE;
CREATE TYPE public.server_application_category AS
 ENUM ('Applications','Settings');
-- ddl-end --
ALTER TYPE public.server_application_category OWNER TO postgres;
-- ddl-end --

-- object: public.fn_check_server_application_upsert_is_valid | type: FUNCTION --
-- DROP FUNCTION IF EXISTS public.fn_check_server_application_upsert_is_valid() CASCADE;
CREATE FUNCTION public.fn_check_server_application_upsert_is_valid ()
	RETURNS trigger
	LANGUAGE plpgsql
	VOLATILE 
	CALLED ON NULL INPUT
	SECURITY INVOKER
	COST 1
	AS $$
DECLARE
	is_application	INTEGER;
BEGIN
	is_application := 0;
	SELECT
		count(id)
	FROM
		modules
	WHERE
		id = NEW.server AND
		type = 'server'
	INTO
		is_application;

	IF is_application = 0
	THEN
		RAISE SQLSTATE '2F003' USING MESSAGE = 'Only Server Applications' ;
		RETURN NULL;
	END IF;

	RETURN NEW;
END;
$$;
-- ddl-end --
ALTER FUNCTION public.fn_check_server_application_upsert_is_valid() OWNER TO postgres;
-- ddl-end --

-- object: public.server_applications | type: TABLE --
-- DROP TABLE IF EXISTS public.server_applications CASCADE;
CREATE TABLE public.server_applications(
	id uuid NOT NULL DEFAULT uuid_generate_v4(),
	server uuid NOT NULL,
	name text NOT NULL,
	media public.media_type NOT NULL,
	category public.server_application_category NOT NULL,
	is_default boolean NOT NULL DEFAULT false,
	description text,
	metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	CONSTRAINT pk_server_applications PRIMARY KEY (id)

);
-- ddl-end --
ALTER TABLE public.server_applications OWNER TO postgres;
-- ddl-end --

-- object: public.server_application_menus | type: TABLE --
-- DROP TABLE IF EXISTS public.server_application_menus CASCADE;
CREATE TABLE public.server_application_menus(
	id uuid NOT NULL DEFAULT uuid_generate_v4(),
	server_application uuid NOT NULL,
	name text NOT NULL,
	description text,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	CONSTRAINT pk_server_application_menus PRIMARY KEY (id)

);
-- ddl-end --
ALTER TABLE public.server_application_menus OWNER TO postgres;
-- ddl-end --

-- object: uidx_server_application_menus | type: INDEX --
-- DROP INDEX IF EXISTS public.uidx_server_application_menus CASCADE;
CREATE UNIQUE INDEX uidx_server_application_menus ON public.server_application_menus
	USING btree
	(
	  server_application ASC NULLS LAST,
	  id ASC NULLS LAST
	);
-- ddl-end --

-- object: uidx_tenant_application_menus_2 | type: INDEX --
-- DROP INDEX IF EXISTS public.uidx_tenant_application_menus_2 CASCADE;
CREATE UNIQUE INDEX uidx_tenant_application_menus_2 ON public.tenant_application_menus
	USING btree
	(
	  tenant_application ASC NULLS LAST,
	  name ASC NULLS LAST
	);
-- ddl-end --

-- object: uidx_tenant_application_screens_2 | type: INDEX --
-- DROP INDEX IF EXISTS public.uidx_tenant_application_screens_2 CASCADE;
CREATE UNIQUE INDEX uidx_tenant_application_screens_2 ON public.tenant_application_screens
	USING btree
	(
	  tenant_application ASC NULLS LAST,
	  name ASC NULLS LAST
	);
-- ddl-end --

-- object: uidx_server_application_menus_2 | type: INDEX --
-- DROP INDEX IF EXISTS public.uidx_server_application_menus_2 CASCADE;
CREATE UNIQUE INDEX uidx_server_application_menus_2 ON public.server_application_menus
	USING btree
	(
	  server_application ASC NULLS LAST,
	  name ASC NULLS LAST
	);
-- ddl-end --

-- object: public.server_application_screens | type: TABLE --
-- DROP TABLE IF EXISTS public.server_application_screens CASCADE;
CREATE TABLE public.server_application_screens(
	id uuid NOT NULL DEFAULT uuid_generate_v4(),
	server_application uuid NOT NULL,
	name text NOT NULL,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	CONSTRAINT pk_server_application_screens PRIMARY KEY (id)

);
-- ddl-end --
ALTER TABLE public.server_application_screens OWNER TO postgres;
-- ddl-end --

-- object: public.fn_check_server_application_menu_item_upsert_is_valid | type: FUNCTION --
-- DROP FUNCTION IF EXISTS public.fn_check_server_application_menu_item_upsert_is_valid() CASCADE;
CREATE FUNCTION public.fn_check_server_application_menu_item_upsert_is_valid ()
	RETURNS trigger
	LANGUAGE plpgsql
	VOLATILE 
	CALLED ON NULL INPUT
	SECURITY INVOKER
	COST 1
	AS $$
DECLARE
	is_menu_item_in_tree	INTEGER;
BEGIN
	IF TG_OP = 'UPDATE'
	THEN
		IF OLD.server_application_menu <> NEW.server_application_menu
		THEN
			RAISE SQLSTATE '2F003' USING MESSAGE = 'Menu Item cannot be moved across Menus';
			RETURN NULL;
		END IF;
	END IF;

	IF NEW.id = NEW.parent
	THEN
		RAISE SQLSTATE '2F003' USING MESSAGE = 'Menu Item cannot be its own parent';
		RETURN NULL;
	END IF;

	/* Check if the menu item is its own ancestor */
	is_menu_item_in_tree := 0;
	SELECT
		COUNT(id)
	FROM
		fn_get_server_application_menu_item_ancestors(NEW.parent)
	WHERE
		id = NEW.id
	INTO
		is_menu_item_in_tree;

	IF is_menu_item_in_tree > 0
	THEN
		RAISE SQLSTATE '2F003' USING MESSAGE = 'Menu Item cannot be its own ancestor';
		RETURN NULL;
	END IF;

	/* Check if the menu item is its own descendant */
	is_menu_item_in_tree := 0;
	SELECT
		COUNT(id)
	FROM
		fn_get_server_application_menu_item_descendants(NEW.id)
	WHERE
		id = NEW.id AND
		level > 1
	INTO
		is_menu_item_in_tree;

	IF is_menu_item_in_tree > 0
	THEN
		RAISE SQLSTATE '2F003' USING MESSAGE = 'Menu Item cannot be its own descendant';
		RETURN NULL;
	END IF;

	RETURN NEW;
END;

$$;
-- ddl-end --
ALTER FUNCTION public.fn_check_server_application_menu_item_upsert_is_valid() OWNER TO postgres;
-- ddl-end --

-- object: public.fn_get_server_application_menu_item_ancestors | type: FUNCTION --
-- DROP FUNCTION IF EXISTS public.fn_get_server_application_menu_item_ancestors(IN uuid) CASCADE;
CREATE FUNCTION public.fn_get_server_application_menu_item_ancestors (IN menuitemid uuid)
	RETURNS TABLE ( level integer,  id uuid,  parent uuid,  server_application_menu uuid,  display_text text)
	LANGUAGE plpgsql
	VOLATILE 
	CALLED ON NULL INPUT
	SECURITY INVOKER
	COST 1
	AS $$
BEGIN
	RETURN QUERY
	WITH RECURSIVE q AS (
		SELECT
			1 AS level,
			A.id,
			A.parent,
			A.server_application_menu,
			A.display_text
		FROM
			server_application_menu_items A
		WHERE
			A.id = menuitemid
		UNION ALL
		SELECT
			q.level + 1,
			B.id,
			B.parent,
			B.server_application_menu,
			B.display_text
		FROM
			q,
			server_application_menu_items B
		WHERE
			B.id = q.parent
	)
	SELECT DISTINCT
		q.level,
		q.id,
		q.parent,
		q.server_application_menu,
		q.display_text
	FROM
		q
	ORDER BY
		q.level,
		q.parent;
END;

$$;
-- ddl-end --
ALTER FUNCTION public.fn_get_server_application_menu_item_ancestors(IN uuid) OWNER TO postgres;
-- ddl-end --

-- object: public.fn_get_server_application_menu_item_descendants | type: FUNCTION --
-- DROP FUNCTION IF EXISTS public.fn_get_server_application_menu_item_descendants(IN uuid) CASCADE;
CREATE FUNCTION public.fn_get_server_application_menu_item_descendants (IN menuitemid uuid)
	RETURNS TABLE ( level integer,  id uuid,  parent uuid,  server_application_menu uuid,  display_text text)
	LANGUAGE plpgsql
	VOLATILE 
	CALLED ON NULL INPUT
	SECURITY INVOKER
	COST 1
	AS $$
BEGIN
	RETURN QUERY
	WITH RECURSIVE q AS (
		SELECT
			1 AS level,
			A.id,
			A.parent,
			A.server_application_menu,
			A.display_text
		FROM
			server_application_menu_items A
		WHERE
			A.id = menuitemid
		UNION ALL
		SELECT
			q.level + 1,
			B.id,
			B.parent,
			B.server_application_menu,
			B.display_text
		FROM
			q,
			server_application_menu_items B
		WHERE
			B.parent = q.id
	)
	SELECT DISTINCT
		q.level,
		q.id,
		q.parent,
		q.server_application_menu,
		q.display_text
	FROM
		q
	ORDER BY
		q.level,
		q.parent;
END;

$$;
-- ddl-end --
ALTER FUNCTION public.fn_get_server_application_menu_item_descendants(IN uuid) OWNER TO postgres;
-- ddl-end --

-- object: public.server_application_menu_items | type: TABLE --
-- DROP TABLE IF EXISTS public.server_application_menu_items CASCADE;
CREATE TABLE public.server_application_menu_items(
	id uuid NOT NULL DEFAULT uuid_generate_v4(),
	server_application uuid NOT NULL,
	server_application_menu uuid NOT NULL,
	server_application_screen uuid,
	parent uuid,
	display_text text NOT NULL,
	description text,
	is_home boolean NOT NULL DEFAULT false,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	CONSTRAINT pk_server_application_menu_items PRIMARY KEY (id)

);
-- ddl-end --
ALTER TABLE public.server_application_menu_items OWNER TO postgres;
-- ddl-end --

-- object: trigger_check_server_application_upsert_is_valid | type: TRIGGER --
-- DROP TRIGGER IF EXISTS trigger_check_server_application_upsert_is_valid ON public.server_applications  ON public.server_applications CASCADE;
CREATE TRIGGER trigger_check_server_application_upsert_is_valid
	BEFORE INSERT OR UPDATE
	ON public.server_applications
	FOR EACH ROW
	EXECUTE PROCEDURE public.fn_check_server_application_upsert_is_valid();
-- ddl-end --

-- object: uidx_server_applications | type: INDEX --
-- DROP INDEX IF EXISTS public.uidx_server_applications CASCADE;
CREATE UNIQUE INDEX uidx_server_applications ON public.server_applications
	USING btree
	(
	  server ASC NULLS LAST,
	  name ASC NULLS LAST,
	  media ASC NULLS LAST
	);
-- ddl-end --

-- object: uidx_server_application_screens | type: INDEX --
-- DROP INDEX IF EXISTS public.uidx_server_application_screens CASCADE;
CREATE UNIQUE INDEX uidx_server_application_screens ON public.server_application_screens
	USING btree
	(
	  server_application ASC NULLS LAST,
	  id ASC NULLS LAST
	);
-- ddl-end --

-- object: uidx_server_application_screens_2 | type: INDEX --
-- DROP INDEX IF EXISTS public.uidx_server_application_screens_2 CASCADE;
CREATE UNIQUE INDEX uidx_server_application_screens_2 ON public.server_application_screens
	USING btree
	(
	  server_application ASC NULLS LAST,
	  name ASC NULLS LAST
	);
-- ddl-end --

-- object: trigger_check_server_application_menu_item_upsert_is_valid | type: TRIGGER --
-- DROP TRIGGER IF EXISTS trigger_check_server_application_menu_item_upsert_is_valid ON public.server_application_menu_items  ON public.server_application_menu_items CASCADE;
CREATE TRIGGER trigger_check_server_application_menu_item_upsert_is_valid
	BEFORE INSERT OR UPDATE
	ON public.server_application_menu_items
	FOR EACH ROW
	EXECUTE PROCEDURE public.fn_check_server_application_menu_item_upsert_is_valid();
-- ddl-end --

-- object: uidx_server_application_menu_items | type: INDEX --
-- DROP INDEX IF EXISTS public.uidx_server_application_menu_items CASCADE;
CREATE UNIQUE INDEX uidx_server_application_menu_items ON public.server_application_menu_items
	USING btree
	(
	  parent ASC NULLS LAST,
	  display_text ASC NULLS LAST
	);
-- ddl-end --

-- object: public.tenant_application_categories | type: TABLE --
-- DROP TABLE IF EXISTS public.tenant_application_categories CASCADE;
CREATE TABLE public.tenant_application_categories(
	id uuid NOT NULL DEFAULT uuid_generate_v4(),
	tenant uuid NOT NULL,
	tenant_application uuid NOT NULL,
	tenant_folder uuid NOT NULL,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	CONSTRAINT pk_tenant_application_categories PRIMARY KEY (id)

);
-- ddl-end --
ALTER TABLE public.tenant_application_categories OWNER TO postgres;
-- ddl-end --

-- object: uidx_tenant_application_categories_1 | type: INDEX --
-- DROP INDEX IF EXISTS public.uidx_tenant_application_categories_1 CASCADE;
CREATE UNIQUE INDEX uidx_tenant_application_categories_1 ON public.tenant_application_categories
	USING btree
	(
	  tenant_application ASC NULLS LAST,
	  tenant_folder ASC NULLS LAST
	);
-- ddl-end --

-- object: uidx_tenant_folders_2 | type: INDEX --
-- DROP INDEX IF EXISTS public.uidx_tenant_folders_2 CASCADE;
CREATE UNIQUE INDEX uidx_tenant_folders_2 ON public.tenant_folders
	USING btree
	(
	  tenant ASC NULLS LAST,
	  id ASC NULLS LAST
	);
-- ddl-end --

-- object: uidx_tenant_applications_2 | type: INDEX --
-- DROP INDEX IF EXISTS public.uidx_tenant_applications_2 CASCADE;
CREATE UNIQUE INDEX uidx_tenant_applications_2 ON public.tenant_applications
	USING btree
	(
	  tenant ASC NULLS LAST,
	  id ASC NULLS LAST
	);
-- ddl-end --

-- object: public.fn_check_tenant_application_category_mapping_is_valid | type: FUNCTION --
-- DROP FUNCTION IF EXISTS public.fn_check_tenant_application_category_mapping_is_valid() CASCADE;
CREATE FUNCTION public.fn_check_tenant_application_category_mapping_is_valid ()
	RETURNS trigger
	LANGUAGE plpgsql
	VOLATILE 
	CALLED ON NULL INPUT
	SECURITY INVOKER
	COST 1
	AS $$
DECLARE
	is_valid_category	INTEGER;
BEGIN
	is_valid_category := 0;
	SELECT
		count(id)
	FROM
		fn_get_folder_ancestors(NEW.tenant_folder)
	WHERE
		parent IS NULL AND
		name = 'Application Categories'
	INTO
		is_valid_category;

	IF is_valid_category <= 0
	THEN
		RAISE SQLSTATE '2F003' USING MESSAGE = 'Invalid Tenant Application Category' ;
		RETURN NULL;
	END IF;

	RETURN NEW;
END;
$$;
-- ddl-end --
ALTER FUNCTION public.fn_check_tenant_application_category_mapping_is_valid() OWNER TO postgres;
-- ddl-end --

-- object: trigger_check_tenant_application_category_mapping_is_valid | type: TRIGGER --
-- DROP TRIGGER IF EXISTS trigger_check_tenant_application_category_mapping_is_valid ON public.tenant_application_categories  ON public.tenant_application_categories CASCADE;
CREATE TRIGGER trigger_check_tenant_application_category_mapping_is_valid
	BEFORE INSERT OR UPDATE
	ON public.tenant_application_categories
	FOR EACH ROW
	EXECUTE PROCEDURE public.fn_check_tenant_application_category_mapping_is_valid();
-- ddl-end --

-- object: fk_modules_modules | type: CONSTRAINT --
-- ALTER TABLE public.modules DROP CONSTRAINT IF EXISTS fk_modules_modules CASCADE;
ALTER TABLE public.modules ADD CONSTRAINT fk_modules_modules FOREIGN KEY (parent)
REFERENCES public.modules (id) MATCH FULL
ON DELETE NO ACTION ON UPDATE NO ACTION;
-- ddl-end --

-- object: fk_tenants_users_users | type: CONSTRAINT --
-- ALTER TABLE public.tenants_users DROP CONSTRAINT IF EXISTS fk_tenants_users_users CASCADE;
ALTER TABLE public.tenants_users ADD CONSTRAINT fk_tenants_users_users FOREIGN KEY (login)
REFERENCES public.users (id) MATCH FULL
ON DELETE CASCADE ON UPDATE CASCADE;
-- ddl-end --

-- object: fk_tenants_users_tenants | type: CONSTRAINT --
-- ALTER TABLE public.tenants_users DROP CONSTRAINT IF EXISTS fk_tenants_users_tenants CASCADE;
ALTER TABLE public.tenants_users ADD CONSTRAINT fk_tenants_users_tenants FOREIGN KEY (tenant)
REFERENCES public.tenants (id) MATCH FULL
ON DELETE CASCADE ON UPDATE CASCADE;
-- ddl-end --

-- object: fk_locations_tenants | type: CONSTRAINT --
-- ALTER TABLE public.tenant_locations DROP CONSTRAINT IF EXISTS fk_locations_tenants CASCADE;
ALTER TABLE public.tenant_locations ADD CONSTRAINT fk_locations_tenants FOREIGN KEY (tenant)
REFERENCES public.tenants (id) MATCH FULL
ON DELETE CASCADE ON UPDATE CASCADE;
-- ddl-end --

-- object: fk_job_titles_tenant_group | type: CONSTRAINT --
-- ALTER TABLE public.tenant_groups_job_titles DROP CONSTRAINT IF EXISTS fk_job_titles_tenant_group CASCADE;
ALTER TABLE public.tenant_groups_job_titles ADD CONSTRAINT fk_job_titles_tenant_group FOREIGN KEY (tenant,tenant_group)
REFERENCES public.tenant_groups (tenant,id) MATCH FULL
ON DELETE CASCADE ON UPDATE CASCADE;
-- ddl-end --

-- object: fk_group_tenant | type: CONSTRAINT --
-- ALTER TABLE public.tenant_groups DROP CONSTRAINT IF EXISTS fk_group_tenant CASCADE;
ALTER TABLE public.tenant_groups ADD CONSTRAINT fk_group_tenant FOREIGN KEY (tenant)
REFERENCES public.tenants (id) MATCH FULL
ON DELETE CASCADE ON UPDATE CASCADE;
-- ddl-end --

-- object: fk_groups_groups | type: CONSTRAINT --
-- ALTER TABLE public.tenant_groups DROP CONSTRAINT IF EXISTS fk_groups_groups CASCADE;
ALTER TABLE public.tenant_groups ADD CONSTRAINT fk_groups_groups FOREIGN KEY (parent)
REFERENCES public.tenant_groups (id) MATCH FULL
ON DELETE CASCADE ON UPDATE CASCADE;
-- ddl-end --

-- object: fk_tenant_user_groups_groups | type: CONSTRAINT --
-- ALTER TABLE public.tenants_users_groups DROP CONSTRAINT IF EXISTS fk_tenant_user_groups_groups CASCADE;
ALTER TABLE public.tenants_users_groups ADD CONSTRAINT fk_tenant_user_groups_groups FOREIGN KEY (tenant,tenant_group)
REFERENCES public.tenant_groups (tenant,id) MATCH FULL
ON DELETE CASCADE ON UPDATE CASCADE;
-- ddl-end --

-- object: fk_tenant_user_groups_tenant_users | type: CONSTRAINT --
-- ALTER TABLE public.tenants_users_groups DROP CONSTRAINT IF EXISTS fk_tenant_user_groups_tenant_users CASCADE;
ALTER TABLE public.tenants_users_groups ADD CONSTRAINT fk_tenant_user_groups_tenant_users FOREIGN KEY (tenant_user,tenant)
REFERENCES public.tenants_users (id,tenant) MATCH FULL
ON DELETE CASCADE ON UPDATE CASCADE;
-- ddl-end --

-- object: fk_permissions_modules | type: CONSTRAINT --
-- ALTER TABLE public.component_permissions DROP CONSTRAINT IF EXISTS fk_permissions_modules CASCADE;
ALTER TABLE public.component_permissions ADD CONSTRAINT fk_permissions_modules FOREIGN KEY (module)
REFERENCES public.modules (id) MATCH FULL
ON DELETE CASCADE ON UPDATE CASCADE;
-- ddl-end --

-- object: fk_social_logins_users | type: CONSTRAINT --
-- ALTER TABLE public.user_social_logins DROP CONSTRAINT IF EXISTS fk_social_logins_users CASCADE;
ALTER TABLE public.user_social_logins ADD CONSTRAINT fk_social_logins_users FOREIGN KEY (login)
REFERENCES public.users (id) MATCH FULL
ON DELETE CASCADE ON UPDATE CASCADE;
-- ddl-end --

-- object: fk_group_permissions_groups | type: CONSTRAINT --
-- ALTER TABLE public.tenant_group_permissions DROP CONSTRAINT IF EXISTS fk_group_permissions_groups CASCADE;
ALTER TABLE public.tenant_group_permissions ADD CONSTRAINT fk_group_permissions_groups FOREIGN KEY (tenant,tenant_group)
REFERENCES public.tenant_groups (tenant,id) MATCH FULL
ON DELETE CASCADE ON UPDATE CASCADE;
-- ddl-end --

-- object: fk_group_permissions_permissions | type: CONSTRAINT --
-- ALTER TABLE public.tenant_group_permissions DROP CONSTRAINT IF EXISTS fk_group_permissions_permissions CASCADE;
ALTER TABLE public.tenant_group_permissions ADD CONSTRAINT fk_group_permissions_permissions FOREIGN KEY (module,permission)
REFERENCES public.component_permissions (module,id) MATCH FULL
ON DELETE CASCADE ON UPDATE CASCADE;
-- ddl-end --

-- object: fk_group_permissions_tenant_modules | type: CONSTRAINT --
-- ALTER TABLE public.tenant_group_permissions DROP CONSTRAINT IF EXISTS fk_group_permissions_tenant_modules CASCADE;
ALTER TABLE public.tenant_group_permissions ADD CONSTRAINT fk_group_permissions_tenant_modules FOREIGN KEY (tenant,module)
REFERENCES public.tenants_modules (tenant,module) MATCH FULL
ON DELETE CASCADE ON UPDATE CASCADE;
-- ddl-end --

-- object: fk_tenant_modules_tenants | type: CONSTRAINT --
-- ALTER TABLE public.tenants_modules DROP CONSTRAINT IF EXISTS fk_tenant_modules_tenants CASCADE;
ALTER TABLE public.tenants_modules ADD CONSTRAINT fk_tenant_modules_tenants FOREIGN KEY (tenant)
REFERENCES public.tenants (id) MATCH FULL
ON DELETE CASCADE ON UPDATE CASCADE;
-- ddl-end --

-- object: fk_tenant_modules_modules | type: CONSTRAINT --
-- ALTER TABLE public.tenants_modules DROP CONSTRAINT IF EXISTS fk_tenant_modules_modules CASCADE;
ALTER TABLE public.tenants_modules ADD CONSTRAINT fk_tenant_modules_modules FOREIGN KEY (module)
REFERENCES public.modules (id) MATCH FULL
ON DELETE CASCADE ON UPDATE CASCADE;
-- ddl-end --

-- object: fk_component_widgets_modules | type: CONSTRAINT --
-- ALTER TABLE public.component_widgets DROP CONSTRAINT IF EXISTS fk_component_widgets_modules CASCADE;
ALTER TABLE public.component_widgets ADD CONSTRAINT fk_component_widgets_modules FOREIGN KEY (module)
REFERENCES public.modules (id) MATCH FULL
ON DELETE CASCADE ON UPDATE CASCADE;
-- ddl-end --

-- object: fk_contacts_users | type: CONSTRAINT --
-- ALTER TABLE public.user_contacts DROP CONSTRAINT IF EXISTS fk_contacts_users CASCADE;
ALTER TABLE public.user_contacts ADD CONSTRAINT fk_contacts_users FOREIGN KEY (login)
REFERENCES public.users (id) MATCH FULL
ON DELETE CASCADE ON UPDATE CASCADE;
-- ddl-end --

-- object: fk_user_emergency_contacts_users | type: CONSTRAINT --
-- ALTER TABLE public.user_emergency_contacts DROP CONSTRAINT IF EXISTS fk_user_emergency_contacts_users CASCADE;
ALTER TABLE public.user_emergency_contacts ADD CONSTRAINT fk_user_emergency_contacts_users FOREIGN KEY (login)
REFERENCES public.users (id) MATCH FULL
ON DELETE CASCADE ON UPDATE CASCADE;
-- ddl-end --

-- object: fk_user_emergency_contacts_contacts | type: CONSTRAINT --
-- ALTER TABLE public.user_emergency_contacts DROP CONSTRAINT IF EXISTS fk_user_emergency_contacts_contacts CASCADE;
ALTER TABLE public.user_emergency_contacts ADD CONSTRAINT fk_user_emergency_contacts_contacts FOREIGN KEY (contact)
REFERENCES public.users (id) MATCH FULL
ON DELETE CASCADE ON UPDATE CASCADE;
-- ddl-end --

-- object: fk_tenants_users_locations_tenant_users | type: CONSTRAINT --
-- ALTER TABLE public.tenants_users_locations DROP CONSTRAINT IF EXISTS fk_tenants_users_locations_tenant_users CASCADE;
ALTER TABLE public.tenants_users_locations ADD CONSTRAINT fk_tenants_users_locations_tenant_users FOREIGN KEY (tenant,tenant_user)
REFERENCES public.tenants_users (tenant,id) MATCH FULL
ON DELETE CASCADE ON UPDATE CASCADE;
-- ddl-end --

-- object: fk_tenants_users_locations_tenant_locations | type: CONSTRAINT --
-- ALTER TABLE public.tenants_users_locations DROP CONSTRAINT IF EXISTS fk_tenants_users_locations_tenant_locations CASCADE;
ALTER TABLE public.tenants_users_locations ADD CONSTRAINT fk_tenants_users_locations_tenant_locations FOREIGN KEY (tenant,tenant_location)
REFERENCES public.tenant_locations (tenant,id) MATCH FULL
ON DELETE CASCADE ON UPDATE CASCADE;
-- ddl-end --

-- object: fk_tenant_users_groups_job_titles_job_titles | type: CONSTRAINT --
-- ALTER TABLE public.tenants_users_groups_job_titles DROP CONSTRAINT IF EXISTS fk_tenant_users_groups_job_titles_job_titles CASCADE;
ALTER TABLE public.tenants_users_groups_job_titles ADD CONSTRAINT fk_tenant_users_groups_job_titles_job_titles FOREIGN KEY (tenant_group_job_title,tenant_group)
REFERENCES public.tenant_groups_job_titles (id,tenant_group) MATCH FULL
ON DELETE CASCADE ON UPDATE CASCADE;
-- ddl-end --

-- object: fk_tenant_users_groups_job_titles_tenant_user_group | type: CONSTRAINT --
-- ALTER TABLE public.tenants_users_groups_job_titles DROP CONSTRAINT IF EXISTS fk_tenant_users_groups_job_titles_tenant_user_group CASCADE;
ALTER TABLE public.tenants_users_groups_job_titles ADD CONSTRAINT fk_tenant_users_groups_job_titles_tenant_user_group FOREIGN KEY (tenant_user_group,tenant_group)
REFERENCES public.tenants_users_groups (id,tenant_group) MATCH FULL
ON DELETE CASCADE ON UPDATE CASCADE;
-- ddl-end --

-- object: fk_component_widgets_permissions_component_widgets | type: CONSTRAINT --
-- ALTER TABLE public.component_widgets_permissions DROP CONSTRAINT IF EXISTS fk_component_widgets_permissions_component_widgets CASCADE;
ALTER TABLE public.component_widgets_permissions ADD CONSTRAINT fk_component_widgets_permissions_component_widgets FOREIGN KEY (component_widget)
REFERENCES public.component_widgets (id) MATCH FULL
ON DELETE CASCADE ON UPDATE CASCADE;
-- ddl-end --

-- object: fk_component_widgets_permissions_component_permissions | type: CONSTRAINT --
-- ALTER TABLE public.component_widgets_permissions DROP CONSTRAINT IF EXISTS fk_component_widgets_permissions_component_permissions CASCADE;
ALTER TABLE public.component_widgets_permissions ADD CONSTRAINT fk_component_widgets_permissions_component_permissions FOREIGN KEY (component_permission)
REFERENCES public.component_permissions (id) MATCH FULL
ON DELETE CASCADE ON UPDATE CASCADE;
-- ddl-end --

-- object: fk_component_widget_templates_component_widgets | type: CONSTRAINT --
-- ALTER TABLE public.component_widget_templates DROP CONSTRAINT IF EXISTS fk_component_widget_templates_component_widgets CASCADE;
ALTER TABLE public.component_widget_templates ADD CONSTRAINT fk_component_widget_templates_component_widgets FOREIGN KEY (component_widget)
REFERENCES public.component_widgets (id) MATCH FULL
ON DELETE CASCADE ON UPDATE CASCADE;
-- ddl-end --

-- object: fk_server_templates_module | type: CONSTRAINT --
-- ALTER TABLE public.server_templates DROP CONSTRAINT IF EXISTS fk_server_templates_module CASCADE;
ALTER TABLE public.server_templates ADD CONSTRAINT fk_server_templates_module FOREIGN KEY (module)
REFERENCES public.modules (id) MATCH FULL
ON DELETE CASCADE ON UPDATE CASCADE;
-- ddl-end --

-- object: fk_tenant_folders_tenants | type: CONSTRAINT --
-- ALTER TABLE public.tenant_folders DROP CONSTRAINT IF EXISTS fk_tenant_folders_tenants CASCADE;
ALTER TABLE public.tenant_folders ADD CONSTRAINT fk_tenant_folders_tenants FOREIGN KEY (tenant)
REFERENCES public.tenants (id) MATCH FULL
ON DELETE CASCADE ON UPDATE CASCADE;
-- ddl-end --

-- object: fk_tenant_folders_parent | type: CONSTRAINT --
-- ALTER TABLE public.tenant_folders DROP CONSTRAINT IF EXISTS fk_tenant_folders_parent CASCADE;
ALTER TABLE public.tenant_folders ADD CONSTRAINT fk_tenant_folders_parent FOREIGN KEY (parent)
REFERENCES public.tenant_folders (id) MATCH FULL
ON DELETE CASCADE ON UPDATE CASCADE;
-- ddl-end --

-- object: fk_tenant_applications_tenant | type: CONSTRAINT --
-- ALTER TABLE public.tenant_applications DROP CONSTRAINT IF EXISTS fk_tenant_applications_tenant CASCADE;
ALTER TABLE public.tenant_applications ADD CONSTRAINT fk_tenant_applications_tenant FOREIGN KEY (tenant)
REFERENCES public.tenants (id) MATCH FULL
ON DELETE CASCADE ON UPDATE CASCADE;
-- ddl-end --

-- object: fk_tenant_application_screens_tenant_application | type: CONSTRAINT --
-- ALTER TABLE public.tenant_application_screens DROP CONSTRAINT IF EXISTS fk_tenant_application_screens_tenant_application CASCADE;
ALTER TABLE public.tenant_application_screens ADD CONSTRAINT fk_tenant_application_screens_tenant_application FOREIGN KEY (tenant_application)
REFERENCES public.tenant_applications (id) MATCH FULL
ON DELETE CASCADE ON UPDATE CASCADE;
-- ddl-end --

-- object: fk_tenant_application_menus_tenant_application | type: CONSTRAINT --
-- ALTER TABLE public.tenant_application_menus DROP CONSTRAINT IF EXISTS fk_tenant_application_menus_tenant_application CASCADE;
ALTER TABLE public.tenant_application_menus ADD CONSTRAINT fk_tenant_application_menus_tenant_application FOREIGN KEY (tenant_application)
REFERENCES public.tenant_applications (id) MATCH FULL
ON DELETE CASCADE ON UPDATE CASCADE;
-- ddl-end --

-- object: fk_tenant_application_menu_items_tenant_application_menu | type: CONSTRAINT --
-- ALTER TABLE public.tenant_application_menu_items DROP CONSTRAINT IF EXISTS fk_tenant_application_menu_items_tenant_application_menu CASCADE;
ALTER TABLE public.tenant_application_menu_items ADD CONSTRAINT fk_tenant_application_menu_items_tenant_application_menu FOREIGN KEY (tenant_application,tenant_application_menu)
REFERENCES public.tenant_application_menus (tenant_application,id) MATCH FULL
ON DELETE CASCADE ON UPDATE CASCADE;
-- ddl-end --

-- object: fk_tenant_application_menu_items_tenant_application_screens | type: CONSTRAINT --
-- ALTER TABLE public.tenant_application_menu_items DROP CONSTRAINT IF EXISTS fk_tenant_application_menu_items_tenant_application_screens CASCADE;
ALTER TABLE public.tenant_application_menu_items ADD CONSTRAINT fk_tenant_application_menu_items_tenant_application_screens FOREIGN KEY (tenant_application,tenant_application_screen)
REFERENCES public.tenant_application_screens (tenant_application,id) MATCH FULL
ON DELETE CASCADE ON UPDATE CASCADE;
-- ddl-end --

-- object: fk_tenant_application_menu_items_parent | type: CONSTRAINT --
-- ALTER TABLE public.tenant_application_menu_items DROP CONSTRAINT IF EXISTS fk_tenant_application_menu_items_parent CASCADE;
ALTER TABLE public.tenant_application_menu_items ADD CONSTRAINT fk_tenant_application_menu_items_parent FOREIGN KEY (parent)
REFERENCES public.tenant_application_menu_items (id) MATCH FULL
ON DELETE CASCADE ON UPDATE CASCADE;
-- ddl-end --

-- object: fk_tenants_server_templates_tenant | type: CONSTRAINT --
-- ALTER TABLE public.tenants_server_templates DROP CONSTRAINT IF EXISTS fk_tenants_server_templates_tenant CASCADE;
ALTER TABLE public.tenants_server_templates ADD CONSTRAINT fk_tenants_server_templates_tenant FOREIGN KEY (tenant)
REFERENCES public.tenants (id) MATCH FULL
ON DELETE CASCADE ON UPDATE CASCADE;
-- ddl-end --

-- object: fk_tenants_server_templates_server_template | type: CONSTRAINT --
-- ALTER TABLE public.tenants_server_templates DROP CONSTRAINT IF EXISTS fk_tenants_server_templates_server_template CASCADE;
ALTER TABLE public.tenants_server_templates ADD CONSTRAINT fk_tenants_server_templates_server_template FOREIGN KEY (server_template)
REFERENCES public.server_templates (id) MATCH FULL
ON DELETE CASCADE ON UPDATE CASCADE;
-- ddl-end --

-- object: fk_server_applications_server | type: CONSTRAINT --
-- ALTER TABLE public.server_applications DROP CONSTRAINT IF EXISTS fk_server_applications_server CASCADE;
ALTER TABLE public.server_applications ADD CONSTRAINT fk_server_applications_server FOREIGN KEY (server)
REFERENCES public.modules (id) MATCH FULL
ON DELETE CASCADE ON UPDATE CASCADE;
-- ddl-end --

-- object: fk_server_application_menus_server_application | type: CONSTRAINT --
-- ALTER TABLE public.server_application_menus DROP CONSTRAINT IF EXISTS fk_server_application_menus_server_application CASCADE;
ALTER TABLE public.server_application_menus ADD CONSTRAINT fk_server_application_menus_server_application FOREIGN KEY (server_application)
REFERENCES public.server_applications (id) MATCH FULL
ON DELETE CASCADE ON UPDATE CASCADE;
-- ddl-end --

-- object: fk_server_application_screens_server_applications | type: CONSTRAINT --
-- ALTER TABLE public.server_application_screens DROP CONSTRAINT IF EXISTS fk_server_application_screens_server_applications CASCADE;
ALTER TABLE public.server_application_screens ADD CONSTRAINT fk_server_application_screens_server_applications FOREIGN KEY (server_application)
REFERENCES public.server_applications (id) MATCH FULL
ON DELETE CASCADE ON UPDATE CASCADE;
-- ddl-end --

-- object: fk_server_application_menu_items_server_application_menu | type: CONSTRAINT --
-- ALTER TABLE public.server_application_menu_items DROP CONSTRAINT IF EXISTS fk_server_application_menu_items_server_application_menu CASCADE;
ALTER TABLE public.server_application_menu_items ADD CONSTRAINT fk_server_application_menu_items_server_application_menu FOREIGN KEY (server_application,server_application_menu)
REFERENCES public.server_application_menus (server_application,id) MATCH FULL
ON DELETE CASCADE ON UPDATE CASCADE;
-- ddl-end --

-- object: fk_server_application_menu_items_server_application_screen | type: CONSTRAINT --
-- ALTER TABLE public.server_application_menu_items DROP CONSTRAINT IF EXISTS fk_server_application_menu_items_server_application_screen CASCADE;
ALTER TABLE public.server_application_menu_items ADD CONSTRAINT fk_server_application_menu_items_server_application_screen FOREIGN KEY (server_application,server_application_screen)
REFERENCES public.server_application_screens (server_application,id) MATCH FULL
ON DELETE CASCADE ON UPDATE CASCADE;
-- ddl-end --

-- object: fk_server_application_menu_items_parent | type: CONSTRAINT --
-- ALTER TABLE public.server_application_menu_items DROP CONSTRAINT IF EXISTS fk_server_application_menu_items_parent CASCADE;
ALTER TABLE public.server_application_menu_items ADD CONSTRAINT fk_server_application_menu_items_parent FOREIGN KEY (parent)
REFERENCES public.server_application_menu_items (id) MATCH FULL
ON DELETE CASCADE ON UPDATE CASCADE;
-- ddl-end --

-- object: fk_tenant_application_categories_tenant_application | type: CONSTRAINT --
-- ALTER TABLE public.tenant_application_categories DROP CONSTRAINT IF EXISTS fk_tenant_application_categories_tenant_application CASCADE;
ALTER TABLE public.tenant_application_categories ADD CONSTRAINT fk_tenant_application_categories_tenant_application FOREIGN KEY (tenant,tenant_application)
REFERENCES public.tenant_applications (tenant,id) MATCH FULL
ON DELETE CASCADE ON UPDATE CASCADE;
-- ddl-end --

-- object: fk_tenant_application_categories_tenant_folders | type: CONSTRAINT --
-- ALTER TABLE public.tenant_application_categories DROP CONSTRAINT IF EXISTS fk_tenant_application_categories_tenant_folders CASCADE;
ALTER TABLE public.tenant_application_categories ADD CONSTRAINT fk_tenant_application_categories_tenant_folders FOREIGN KEY (tenant,tenant_folder)
REFERENCES public.tenant_folders (tenant,id) MATCH FULL
ON DELETE CASCADE ON UPDATE CASCADE;
-- ddl-end --


