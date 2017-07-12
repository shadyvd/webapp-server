/**
 * @file      app/templates/TwyrBaseTemplate.js
 * @author    Vish Desai <vishwakarma_d@hotmail.com>
 * @version   1.8.3
 * @copyright Copyright&copy; 2014 - 2017 {@link https://twyr.github.io|Twy'r Project}
 * @license   {@link https://spdx.org/licenses/MITNFA.html|MITNFA}
 * @summary   The Twy'r Web Application Base Class for Templates - providing common functionality required for all templates
 *
 */

'use strict';

/**
 * Module dependencies, required for ALL Twy'r modules
 * @ignore
 */
const promises = require('bluebird');

/**
 * Module dependencies, required for this module
 * @ignore
 */
const TwyrBaseModule = require('./../TwyrBaseModule').TwyrBaseModule;

class TwyrBaseTemplate extends TwyrBaseModule {
	constructor(module, loader) {
		super(module, loader);
		this._addDependencies('ConfigurationService', 'ExpressService', 'LoggerService');

		const TwyrTemplateLoader = require('./TwyrTemplateLoader').TwyrTemplateLoader;
		const _loader = loader || promises.promisifyAll(new TwyrTemplateLoader(this), {
			'filter': function() {
				return true;
			}
		});

		this.$loader = _loader;
		this.$router = require('express').Router();
	}

	start(dependencies, callback) {
		this._dummyAsync()
		.then(() => {
			const superStartAsync = promises.promisify(super.start.bind(this));
			return superStartAsync(dependencies);
		})
		.then((status) => {
			return promises.all([status, this._setupRouterAsync()]);
		})
		.then((status) => {
			return promises.all([status[0], this._addRoutesAsync()]);
		})
		.then((status) => {
			if(callback) callback(null, status[0]);
			return null;
		})
		.catch((setupRouterErr) => {
			if(callback) callback(setupRouterErr);
		});
	}

	render(renderer, configuration, callback) {
		this._dummyAsync()
		.then(() => {
			const deepmerge = require('deepmerge'),
				path = require('path');

			configuration.renderConfig = deepmerge(this.$config.renderconfig || {}, configuration.renderConfig || {});
			configuration.file = path.join(this.basePath, configuration.file || this.$config.file || 'index.ejs');

			return renderer(configuration.file, configuration);
		})
		.then((renderedTmpl) => {
			return this._processExternalStyleTagsAsync(renderedTmpl);
		})
		.then((postRenderedTmpl) => {
			return this._processExternalScriptTagsAsync(postRenderedTmpl);
		})
		.then((postRenderedTmpl) => {
			return this._normalizeRenderedTemplateAsync(postRenderedTmpl);
		})
		.then((postRenderedTmpl) => {
			if(callback) callback(null, postRenderedTmpl);
		})
		.catch((err) => {
			if(callback) callback(err);
		});
	}

	stop(callback) {
		this._dummyAsync()
		.then(() => {
			const superStopAsync = promises.promisify(super.stop.bind(this));
			return superStopAsync();
		})
		.then((status) => {
			return promises.all([status, this._deleteRoutesAsync()]);
		})
		.then((status) => {
			if(callback) callback(null, status[0]);
			return null;
		})
		.catch((stopErr) => {
			if(callback) callback(stopErr);
		});
	}

	_setupRouter(callback) {
		const logger = require('morgan'),
			path = require('path'),
			serveStatic = require('serve-static');

		const loggerSrvc = this.$dependencies.LoggerService,
			router = this.$router;

		const loggerStream = {
			'write': (message) => {
				loggerSrvc.silly(message);
			}
		};

		router
		.use(logger('combined', {
			'stream': loggerStream
		}))
		.use((request, response, next) => {
			if(this.$enabled) {
				next();
				return;
			}

			next(new Error(`${this.name} is disabled`));
		});

		if(this.$config.static) {
			router.use(serveStatic(path.join(this.basePath, this.$config.static.path || 'static'), {
				'index': this.$config.static.index,
				'maxAge': this.$config.static.maxAge
			}));
		}

		if(callback) callback();
	}

	_addRoutes(callback) {
		if(callback) callback();
	}

	_deleteRoutes(callback) {
		// NOTICE: Undocumented ExpressJS API. Be careful upgrading :-)
		if(this.$router) this.$router.stack.length = 0;
		if(callback) callback();
	}

	_processExternalStyleTags(html, callback) {
		const htmlEntities = require('html-entities').AllHtmlEntities,
			path = require('path');

		const $ = require('cheerio').load(html);

		this._dummyAsync()
		.then(() => {
			const externalStyles = $('html').find('link[rel="stylesheet"]'),
				externalStylePaths = [],
				filePaths = [],
				validStyles = [];

			$(externalStyles).each((idx, style) => {
				style = $(style);
				if(!style.attr('href'))
					return;

				const srcPath = style.attr('href').trim().split('/'),
					template = this.$module.$templates[srcPath.shift()] || this.$module.$templates[srcPath.shift()];

				if(!template) {
					if(externalStylePaths.indexOf(style.attr('href').trim()) >= 0)
						style.remove();
					else
						externalStylePaths.push(style.attr('href').trim());

					return;
				}

				const styleFilePath = path.join(template.basePath, 'static', srcPath.join('/'));
				if(filePaths.indexOf(styleFilePath) >= 0) {
					style.remove();
					return;
				}

				validStyles.push(style);
				filePaths.push(styleFilePath);
			});

			const nonExcludedFilePaths = [],
				nonExcludedValidStyles = [];

			if(this.$config.styleExclusions && this.$config.styleExclusions.length) {
				filePaths.forEach((filePath, idx) => {
					this.$config.styleExclusions.forEach((exclusion) => {
						if(filePath.indexOf(exclusion) >= 0)
							return;

						nonExcludedValidStyles.push(validStyles[idx]);
						nonExcludedFilePaths.push(filePath);
					});
				});
			}

			const doFilesExist = [];
			doFilesExist.push(nonExcludedFilePaths);
			doFilesExist.push(nonExcludedValidStyles);

			nonExcludedFilePaths.forEach((filePath) => {
				doFilesExist.push(this._existsAsync(filePath));
			});

			return promises.all(doFilesExist);
		})
		.then((results) => {
			const filesystem = promises.promisifyAll(require('fs-extra')),
				nonExcludedFilePaths = results.shift(),
				nonExcludedValidStyles = results.shift(),
				readFilePromises = [];

			results.forEach((doesFileExist, idx) => {
				if(!doesFileExist) {
					readFilePromises.push(false);
					return;
				}

				readFilePromises.push(filesystem.readFileAsync(nonExcludedFilePaths[idx], 'utf8'));
			});

			readFilePromises.push(nonExcludedValidStyles);
			return promises.all(readFilePromises);
		})
		.then((readFiles) => {
			const nonExcludedValidStyles = readFiles.pop();

			readFiles.forEach((fileContent, idx) => {
				if(!fileContent) return;

				const newElement = $(`<style type="text/css">\n${fileContent}\n</style>`),
					style = nonExcludedValidStyles[idx];

				style.replaceWith(newElement);
			});

			if(callback) callback(null, htmlEntities.decode($.root().html()));
		})
		.catch((err) => {
			if(callback) callback(err);
		});
	}

	_processExternalScriptTags(html, callback) {
		const htmlEntities = require('html-entities').AllHtmlEntities,
			path = require('path');

		const $ = require('cheerio').load(html);

		this._dummyAsync()
		.then(() => {
			const externalScripts = $('html').find('script'),
				externalScriptPaths = [],
				filePaths = [],
				validScripts = [];

			$(externalScripts).each((idx, script) => {
				script = $(script);
				if(!script.attr('src'))
					return;

				if(script.attr('src')[0] !== '/')
					return;

				const srcPath = script.attr('src').trim().split('/'),
					template = this.$module.$templates[srcPath.shift()] || this.$module.$templates[srcPath.shift()];

				if(!template) {
					if(externalScriptPaths.indexOf(script.attr('src').trim()) >= 0)
						script.remove();
					else
						externalScriptPaths.push(script.attr('src').trim());

					return;
				}

				const scriptFilePath = path.join(template.basePath, 'static', srcPath.join('/'));
				if(filePaths.indexOf(scriptFilePath) >= 0) {
					script.remove();
					return;
				}

				validScripts.push(script);
				filePaths.push(scriptFilePath);
			});

			const nonExcludedFilePaths = [],
				nonExcludedValidScripts = [];

			if(this.$config.scriptExclusions && this.$config.scriptExclusions.length) {
				filePaths.forEach((filePath, idx) => {
					this.$config.scriptExclusions.forEach((exclusion) => {
						if(filePath.indexOf(exclusion) >= 0)
							return;

						nonExcludedValidScripts.push(validScripts[idx]);
						nonExcludedFilePaths.push(filePath);
					});
				});
			}

			const doFilesExist = [];
			doFilesExist.push(nonExcludedFilePaths);
			doFilesExist.push(nonExcludedValidScripts);

			nonExcludedFilePaths.forEach((filePath) => {
				doFilesExist.push(this._existsAsync(filePath));
			});

			return promises.all(doFilesExist);
		})
		.then((results) => {
			const filesystem = promises.promisifyAll(require('fs-extra')),
				nonExcludedFilePaths = results.shift(),
				nonExcludedValidScripts = results.shift(),
				readFilePromises = [];

			results.forEach((doesFileExist, idx) => {
				if(!doesFileExist) {
					readFilePromises.push(false);
					return;
				}

				readFilePromises.push(filesystem.readFileAsync(nonExcludedFilePaths[idx], 'utf8'));
			});

			readFilePromises.push(nonExcludedValidScripts);
			return promises.all(readFilePromises);
		})
		.then((readFiles) => {
			const nonExcludedValidScripts = readFiles.pop();

			readFiles.forEach((fileContent, idx) => {
				if(!fileContent) return;

				const script = nonExcludedValidScripts[idx];
				script.removeAttr('src');
				script.text(`\n${fileContent}\n`);
			});

			if(callback) callback(null, htmlEntities.decode($.root().html()));
		})
		.catch((err) => {
			if(callback) callback(err);
		});
	}

	_normalizeRenderedTemplate(html, callback) {
		const cheerio = require('cheerio'),
			htmlEntities = require('html-entities').AllHtmlEntities;

		const fillUpRow = (data) => {
			let maxCol = 0;

			const used = data.reduce((total, thisCol) => {
				if(thisCol.usedCols > maxCol)
					maxCol = thisCol.usedCols;

				return total + thisCol.usedCols;
			}, 0);

			if(used === 12)
				return;

			if(data.length === 1) {
				let newClass = data[0].colClass.split('-');
				newClass[2] = '12';
				newClass = newClass.join('-');

				data[0].element.removeClass(data[0].colClass);
				data[0].element.addClass(newClass);

				return;
			}

			let colsRemaining = 12 - used;
			data.forEach((thisColData, idx) => {
				let colToAdd = 0;

				if(thisColData.usedCols === maxCol)
					colToAdd = Math.ceil((12 - used) * (thisColData.usedCols / 12));
				else
					colToAdd = Math.floor((12 - used) * (thisColData.usedCols / 12));

				if(colToAdd < 1) colToAdd = 1;
				if(colToAdd > colsRemaining) colToAdd = colsRemaining;
				if(idx === data.length - 1) colToAdd = colsRemaining;

				let newClass = thisColData.colClass.split('-');
				newClass[2] = thisColData.usedCols + colToAdd;
				newClass = newClass.join('-');

				thisColData.element.removeClass(thisColData.colClass);
				thisColData.element.addClass(newClass);

				colsRemaining -= colToAdd;
			});
		};

		this._dummyAsync()
		.then(() => {
			const componentSelectorRegex = new RegExp(/\{\{component ([^}]+)\}\}/, 'gi'),
				componentsInMarkup = [];

			let decodedHTML = htmlEntities.decode(html),
				htmlComponents;

			const $ = cheerio.load(decodedHTML);

			while((htmlComponents = componentSelectorRegex.exec(decodedHTML)) !== null) {
				htmlComponents.forEach((htmlComponent) => {
					if(htmlComponent.trim().indexOf('{{') < 0)
						return;

					const htmlComponentName = htmlComponent.replace(/"/g, '').split(' ')[1];
					componentsInMarkup.push({
						'componentName': htmlComponentName,
						'componentString': htmlComponent
					});
				});
			}

			const componentsToBeRemoved = [];
			componentsInMarkup.forEach((componentInMarkup, idx) => {
				const componentSelector = `script[type="text/x-handlebars"][data-template-name="components/${componentInMarkup.componentName}"]`,
					isComponentPresent = $(componentSelector).length;

				if(isComponentPresent)
					return;

				componentsToBeRemoved.push(idx);
			});

			componentsToBeRemoved.forEach((componentToBeRemoved) => {
				decodedHTML = decodedHTML.replace(componentsInMarkup[componentToBeRemoved].componentString, '');
			});

			return decodedHTML;
		})
		.then((decodedHTML) => {
			const $ = cheerio.load(decodedHTML);
			let removedCount = 1;

			const removeFunc = (idx, divElement) => {
				divElement = $(divElement);

				const contentNodeLength = divElement.contents().length,
					htmlContent = divElement.html().trim(),
					textContent = divElement.text().trim();

				const retContent = (contentNodeLength ? (((htmlContent !== '') || (textContent !== '')) ? htmlContent : null) : null);

				if(!retContent) {
					divElement.remove();
					removedCount++;
				}
			};

			while(removedCount > 0) {
				removedCount = 0;
				$('div').each(removeFunc);
			}

			return htmlEntities.decode($.root().html());
		})
		.then((decodedHTML) => {
			const $ = cheerio.load(decodedHTML);

			$('div.row').each((idx, rowDiv) => {
				rowDiv = $(rowDiv);

				// TODO: Change when we move to BS4
				const lgFilled = [],
					mdFilled = [],
					smFilled = [],
					xsFilled = [];

				rowDiv.children('div').each((childIdx, colDiv) => {
					colDiv = $(colDiv);

					const classNames = colDiv.attr('class').split(' ');
					classNames.forEach((className) => {
						className = className.split('-');
						if(className[0] !== 'col') return;
						if(className.length !== 3) return;

						const dataObject = {
							'usedCols': Number(className[2]),
							'colClass': className.join('-'),
							'element': colDiv
						};

						if(className[1] === 'xs')
							xsFilled.push(dataObject);

						if(className[1] === 'sm')
							smFilled.push(dataObject);

						if(className[1] === 'md')
							mdFilled.push(dataObject);

						if(className[1] === 'lg')
							lgFilled.push(dataObject);
					});
				});

				[xsFilled, smFilled, mdFilled, lgFilled].forEach((data) => {
					fillUpRow(data);
				});
			});

			return htmlEntities.decode($.root().html());
		})
		.then((decodedHTML) => {
			const $ = cheerio.load(decodedHTML),
				relevantElements = $('div[type="text/x-handlebars"]');

			relevantElements.each((idx, relevantElement) => {
				relevantElement = $(relevantElement);

				const content = htmlEntities.decode(relevantElement.html()),
					templateName = relevantElement.attr('data-template-name');

				relevantElement.replaceWith(`<script type="text/x-handlebars" data-template-name="${templateName}">${content}</script>`);
			});

			return htmlEntities.decode($.root().html());
		})
		.then((decodedHTML) => {
			const $ = require('cheerio').load(decodedHTML),
				componentSelectorRegex = new RegExp(/\{\{component ([^}]+)\}\}/, 'gi'),
				layoutsInMarkup = [];

			let htmlComponents;
			while((htmlComponents = componentSelectorRegex.exec(decodedHTML)) !== null) {
				htmlComponents.forEach((htmlComponent) => {
					if(htmlComponent.trim().indexOf('{{') < 0)
						return;

					htmlComponent = htmlComponent.split(' ');
					htmlComponent.forEach((componentPart) => {
						if(componentPart.indexOf('layout') < 0)
							return;

						componentPart = componentPart.trim().replace(/"/g, '').split('=');
						if(layoutsInMarkup.indexOf(componentPart[1]) >= 0)
							return;

						layoutsInMarkup.push(componentPart[1]);
					});
				});
			}

			$('script[type="text/x-handlebars"]').each((idx, scriptElem) => {
				scriptElem = $(scriptElem);

				let dataTmplName = scriptElem.attr('data-template-name');
				if(!dataTmplName) return;

				if(dataTmplName.indexOf('components/') < 0)
					return;

				dataTmplName = dataTmplName.replace('components/', '');
				if(layoutsInMarkup.indexOf(dataTmplName) >= 0)
					return;

				scriptElem.remove();
			});

			if(callback) callback(null, htmlEntities.decode($.root().html()));
		})
		.catch((err) => {
			if(callback) callback(err);
		});
	}

	get Router() { return this.$router; }
	get basePath() { return __dirname; }
}

exports.TwyrBaseTemplate = TwyrBaseTemplate;
