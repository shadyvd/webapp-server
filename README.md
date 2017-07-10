## The Twy'r Web Application Server Framework
The Twy'r Web Application Server - the browser & desktop front-end for Twy'r.



## Using the Twy'r Web Application Server for your pwn purposes

### Development Environment Setup (Basic)
Setting up the development environment, from scratch and with defaults, is detailed in the [Development Environment Setup](../../wiki/Development-Environment-Setup) page in the wiki.


### My PostgreSQL credentials are different! What should I do?
Changing the username, password, database name in PostgreSQL during setup is given in the [Custom Database Credentials During Setup](../../wiki/Custom-Database-Credentials-During-Setup) page in the wiki.

### How do I change the name of the Server?
By default, the Twy'r Web Application Server registers itself in the database with the name **TwyrWebApp** - which is fine if you are developing only one codebase (irrespective of the number of servers that are running it).

However, consider the case where you are developing two completely different servers (say, a CRM System and a HRM System) - but would like to use the same database for Tenants, Users, and Tenant-User combinations. In this case, you *may* want to copy the base code *twice*, change the names to CRMServer and HRMServer respectively, and then proceed developing the two codebases independently of each other.

The procedure to change the name of the server is given in the [Changing the Server Name](../../wiki/Changing-the-Server-Name) page in the wiki.