/**
 * @file      index.js
 * @author    Vish Desai <vishwakarma_d@hotmail.com>
 * @version   1.8.3
 * @copyright Copyright&copy; 2014 - 2017 {@link https://twyr.github.io|Twy'r Project}
 * @license   {@link https://spdx.org/licenses/MITNFA.html|MITNFA}
 * @summary   Entry point into the Twy'r Web Application Framework
  *
 * @description
 * On process start, check to see if this process in the cluster is the master, or a slave.
 *
 * If this process is the master, then:
 * 1. Read the configuration to see what the load should be
 * 2. Fork the requisite number of processes
 * 3. Listen to the events on the cluster, and log appropriately
 * 4. Wait for the terminate command from the REPL (in the Development Environment), or Telnet (in other environments)
 * 5. Shutdown gracefully when the command is received
 *
 * Or, if this process is a slave, then:
 * 1. Construct the Application Class (defined in the configuration)
 * 2. Run through the startup lifecycle (Load, Initialize, and Start)
 * 3. Wait for the terminate command from the master process
 * 4. On receivng the command, run through the shutdown lifecycle (Stop, Uninitialize, and Unload)
 *
 */

'use strict';

/**
 * First things first... load the environment
 * @ignore
 */
require('dotenv').config();

/**
 * Module dependencies.
 * @ignore
 */
const path = require('path'),
	promises = require('bluebird');

/**
 * Get what we need - environment, and the configuration specific to that environment
 * @ignore
 */
const env = (process.env.NODE_ENV || 'development').toLowerCase();
const config = require(path.join(__dirname, 'config', env, 'index')).config;

/**
 * Setup the title to reflect what we're running in the OS Process Table
 * @ignore
 */
process.title = config.title;

/**
 * Generate a unique id for this entire cluster
 * @ignore
 */
const cluster = promises.promisifyAll(require('cluster'));
const uuid = require('uuid');

const clusterId = uuid.v4().toString().replace(/-/g, '');

/**
 * Master Process in the cluster.
 * @ignore
 */

if(cluster.isMaster) {
	/**
	 * How many times are we going to fork today?
	 * @ignore
	 */
	let numForks = Math.floor(require('os').cpus().length * config.loadFactor);
	if(numForks < 1) numForks = 1;

	let onlineCount = 0,
		port = 0;

	/**
	 * @function forkIfRequired
	 * @returns  {null} Nothing.
	 * @summary  If the number of child processes is less than the number calculated, then fork
	 */
	const forkIfRequired = () => {
		if(onlineCount >= numForks)
			return;

		cluster.fork();
	};

	/**
	 * @function printNetworkInterfaceList
	 * @returns  {null} Nothing.
	 * @summary  If all child processes are online, then print a table with the list of interfaces being listened on
	 */
	const printNetworkInterfaceList = () => {
		onlineCount++;
		if(onlineCount < numForks)
			return;

		const forPrint = [],
			networkInterfaces = require('os').networkInterfaces();

		Object.keys(networkInterfaces).forEach((networkInterfaceName) => {
			const networkInterfaceAddresses = networkInterfaces[networkInterfaceName];

			for(const address of networkInterfaceAddresses) {
				forPrint.push({
					'Interface': networkInterfaceName,
					'Protocol': address.family,
					'Address': address.address,
					'Port': port ? port : 'NOT LISTENING'
				});
			}
		});

		if(forPrint.length) {
			const printf = require('node-print');

			console.log(`\n\n${process.title} Listening On:`);
			printf.printTable(forPrint);
			console.log('\n\n');
		}
	};

	/**
	 * @function terminateCluster
	 * @returns  {null} Nothing.
	 * @summary  Send message to all child processes to shutdown, wait until all of them disconnect, and then exit the process
	 */
	const terminateCluster = () => {
		if(env === 'development' || env === 'test') console.log(`Twy'r Web Application Master: Stopping now...`);
		config.restart = false;

		Object.keys(cluster.workers).forEach((workerId) => {
			cluster.workers[workerId].send('terminate');
		});

		cluster.disconnectAsync()
			.timeout(60000)
			.then(() => {
				if(env === 'development' || env === 'test') console.log(`Twy'r Web Application Master: Disconnected all workers. Exiting now...`);
				return null;
			})
			.catch((err) => {
				if(env === 'development' || env === 'test') console.error(`Twy'r Web Application Master Error: ${err.stack}\n\n`);

				const processExit = process.exit;
				processExit(0);
			});
	};

	const timeoutMonitor = {};

	cluster
		/**
		 * @function cluster:forkHandler
		 * @listens  {@link https://nodejs.org/api/cluster.html#cluster_event_fork|Event: 'fork'}
		 * @param    {cluster.Worker} worker Handle to a worker/child/slave process
		 * @summary  The event handler for the cluster#fork event
		 *
		 * @description
		 * Sets a timeout to listen to the online / listening / etc. events from the worker process. If the
		 * worker doesn't come online (or exits) within the timeout, the timeout handler kills the worker
		 * and tries to re-fork a new child/slave process
		 */
		.on('fork', (worker) => {
			if(env === 'development') console.log(`Twy'r Web Application #${worker.id}: Forked`);
			timeoutMonitor[worker.id] = setTimeout(() => {
				if(env === 'development') console.error(`Twy'r Web Application #${worker.id} did not start in time! KILL!!`);
				worker.kill();
			}, 300000);
		})
		/**
		 * @function cluster:onlineHandler
		 * @listens  {@link https://nodejs.org/api/cluster.html#cluster_event_online_1|Event: 'online'}
		 * @param    {cluster.Worker} worker Handle to a worker/child/slave process
		 * @summary  The event handler for the cluster#online event
		 *
		 * @description
		 * Clears the timeout set in the {@link cluster:forkHandler}
		 */
		.on('online', (worker) => {
			if(env === 'development') console.log(`Twy'r Web Application #${worker.id}: Online`);
			if(timeoutMonitor[worker.id]) {
				clearTimeout(timeoutMonitor[worker.id]);
				delete timeoutMonitor[worker.id];
			}
		})
		/**
		 * @function cluster:listeningHandler
		 * @listens  {@link https://nodejs.org/api/cluster.html#cluster_event_listening_1|Event: 'listening'}
		 * @param    {cluster.Worker} worker Handle to a worker/child/slave process
		 * @param    {Object} address Details of the Address Type / Port the worker is bound to
		 * @summary  The event handler for the cluster#listening event
		 *
		 * @description
		 * Clears the timeout set in the {@link cluster:forkHandler}, and prints out the list of
		 * all addresses this cluster is listening to if all the child/slave processes are online
		 */
		.on('listening', (worker, address) => {
			if(env === 'development') console.log(`Twy'r Web Application #${worker.id}: Listening`);
			if(timeoutMonitor[worker.id]) {
				clearTimeout(timeoutMonitor[worker.id]);
				delete timeoutMonitor[worker.id];
			}

			port = address.port;
			if(onlineCount >= numForks) printNetworkInterfaceList();
		})
		/**
		 * @function cluster:disconnectHandler
		 * @listens  {@link https://nodejs.org/api/cluster.html#cluster_event_disconnect_1|Event: 'disconnect'}
		 * @param    {cluster.Worker} worker Handle to a worker/child/slave process
		 * @param    {Object} address Details of the Address Type / Port the worker is bound to
		 * @summary  The event handler for the cluster#disconnect event
		 *
		 * @description
		 * Clears the timeout set in the {@link cluster:forkHandler}
		 */
		.on('disconnect', (worker) => {
			if(env === 'development') console.log(`Twy'r Web Application #${worker.id}: Disconnected`);
			if(timeoutMonitor[worker.id]) {
				clearTimeout(timeoutMonitor[worker.id]);
				delete timeoutMonitor[worker.id];
			}
		})
		/**
		 * @function cluster:exitHandler
		 * @listens  {@link https://nodejs.org/api/cluster.html#cluster_event_exit_1|Event: 'exit'}
		 * @param    {cluster.Worker} worker Handle to a worker/child/slave process
		 * @param    {number} code Worker Process' Exit Code
		 * @param    {signal} code OS Signal that caused the Worker to exit
		 * @summary  The event handler for the cluster#exit event
		 *
		 * @description
		 * Clears the timeout set in the {@link cluster:forkHandler}.
		 * If the worker stopped voluntarily, exit the process if required. Otherwise, re-fork a new
		 * Worker if required
		 */
		.on('exit', (worker, code, signal) => {
			if(env === 'development') console.log(`Twy'r Web Application #${worker.id}: Exit\nCode: ${code}\nSignal: ${signal}`);
			if(timeoutMonitor[worker.id]) {
				clearTimeout(timeoutMonitor[worker.id]);
				delete timeoutMonitor[worker.id];
			}

			if(!worker.exitedAfterDisconnect) {
				if(cluster.isMaster && config.restart)
					cluster.fork();
			}

			if(Object.keys(cluster.workers).length <= 0) {
				const processExit = process.exit;
				processExit(0);
			}
		})
		/**
		 * @function cluster:messageHandler
		 * @listens  {@link https://nodejs.org/api/cluster.html#cluster_event_message|Event: 'message'}
		 * @param    {cluster.Worker} worker Handle to a worker/child/slave process
		 * @param    {number} code Worker Process' Exit Code
		 * @param    {signal} code OS Signal that caused the Worker to exit
		 * @summary  The event handler for the cluster#message event
		 */
		.on('message', (worker, message) => {
			if(message !== 'worker-online')
				return;

			printNetworkInterfaceList();
			forkIfRequired();
		});

	// Fork workers.
	if(env === 'development') console.log(`Twy'r Web Application Master: Starting now...`);
	cluster.fork();

	// In development mode (i.e., start as "npm start"), wait for input from command line
	// In other environments, start a telnet server and listen for the exit command
	if(env === 'development' || env === 'test') {
		const repl = require('repl');
		const replConsole = repl.start(config.repl);

		replConsole.on('exit', terminateCluster);
	}
	else {
		const telnetServer = require('net').createServer((socket) => {
			config.repl.parameters.input = socket;
			config.repl.parameters.output = socket;

			const repl = require('repl');

			const replConsole = repl.start(config.repl.parameters);
			replConsole.context.socket = socket;

			replConsole.on('exit', terminateCluster);
		});

		telnetServer.listen(config.repl.controlPort, config.repl.controlHost);
	}
}

/**
 * Slave Processes in the cluster.
 * @ignore
 */
else {
	/**
	 * Require the Application class as defined in the configuration, construct it, and promisify all the methods
	 * @ignore
	 */
	const Application = require(config.main).Application;
	const application = promises.promisifyAll(new Application(config.application, clusterId, cluster.worker.id), {
		'filter': function() {
			return true;
		}
	});

	/**
	 * @function startupFn
	 * @returns  {null} Nothing.
	 * @summary  Runs the Application through the startup lifecycle - load, initialize, and start
	 */
	const startupFn = () => {
		const allStatuses = [];
		if(!application) return;

		// Call load / initialize / start...
		application.loadAsync(null)
			.timeout(60000)
			.then((status) => {
				allStatuses.push(`Twy'r Web Application #${cluster.worker.id}::Load status: ${JSON.stringify(status, null, '\t')}\n\n`);
				return application.initializeAsync();
			})
			.timeout(60000)
			.then((status) => {
				allStatuses.push(`Twy'r Web Application #${cluster.worker.id}::Initialize status: ${JSON.stringify(status, null, '\t')}\n\n`);
				return application.startAsync(null);
			})
			.timeout(60000)
			.then((status) => {
				allStatuses.push(`Twy'r Web Application #${cluster.worker.id}::Start Status: ${JSON.stringify(status, null, '\t')}\n\n`);
				return null;
			})
			.timeout(60000)
			.catch((err) => {
				if(env === 'development') console.error(`\n\nTwy'r Web Application #${cluster.worker.id}::Startup Error: ${err.toString()}\n\n`);
				cluster.worker.disconnect();
			})
			.finally(() => {
				if(env === 'development') console.log(`\n\n${allStatuses.join('\n')}\n\n`);
				process.send('worker-online');
				return null;
			});
	};

	/**
	 * @function shutdownFn
	 * @returns  {null} Nothing.
	 * @summary  Runs the Application through the shutdown lifecycle - stop, uninitialize, and unload
	 */
	const shutdownFn = () => {
		const allStatuses = [];
		if(!application) return;

		// Call stop / uninitialize / unload...
		application.stopAsync()
			.timeout(60000)
			.then((status) => {
				allStatuses.push(`Twy'r Web Application #${cluster.worker.id}::Stop Status: ${JSON.stringify(status, null, '\t')}\n\n`);
				return application.uninitializeAsync();
			})
			.timeout(60000)
			.then((status) => {
				allStatuses.push(`Twy'r Web Application #${cluster.worker.id}::Uninitialize Status: ${JSON.stringify(status, null, '\t')}\n\n`);
				return application.unloadAsync();
			})
			.timeout(60000)
			.then((status) => {
				allStatuses.push(`Twy'r Web Application #${cluster.worker.id}::Unload Status: ${JSON.stringify(status, null, '\t')}\n\n`);
				return null;
			})
			.timeout(60000)
			.then(() => {
				cluster.worker.disconnect();
				return null;
			})
			.catch((err) => {
				console.error(`\n\nTwy'r Web Application #${cluster.worker.id}::Shutdown Error: ${err.stack}\n\n`);
			})
			.finally(() => {
				if(env === 'development') console.log(`\n\n${allStatuses.join('\n')}\n\n`);
				return null;
			});
	};

	// Listen for messages from master, and shutdown when termination is received
	process.on('message', (message) => {
		if(message !== 'terminate') return;
		shutdownFn();
	});

	// Listen for uncaught exceptions, and shutdown when they occur...
	process.on('uncaughtException', (err) => {
		if(env === 'development') console.error(`Twy'r Web Application #${cluster.worker.id}::Process Error: ${err.stack}`);
		shutdownFn();
	});

	// Startup...
	startupFn();
}
