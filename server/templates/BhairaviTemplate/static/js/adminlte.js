/* BoxWidget
* =========
* BoxWidget is a plugin to handle collapsing and
* removing boxes from the screen.
*
* @type Object
* @usage $.AdminLTE.boxWidget.activate()
*        Set all your options in the main $.AdminLTE.options object
*/
$.AdminLTE.boxWidget = {
	'selectors': $.AdminLTE.options.boxWidgetOptions.boxWidgetSelectors,
	'icons': $.AdminLTE.options.boxWidgetOptions.boxWidgetIcons,
	'animationSpeed': $.AdminLTE.options.animationSpeed,

	'activate': function (_box) {
		var _this = this;
		if (!_box) {
			_box = document; // activate all boxes per default
		}

		//Listen for collapse event triggers
		$(_box).on('click', _this.selectors.collapse, function (e) {
			e.preventDefault();
			_this.collapse($(this));
		});

		//Listen for remove event triggers
		$(_box).on('click', _this.selectors.remove, function (e) {
			e.preventDefault();
			_this.remove($(this));
		});
	},

	collapse: function (element) {
		var _this = this;

		//Find the box parent
		var box = element.parents(".box").first();

		//Find the body and the footer
		var box_content = box.find("> .box-body, > .box-footer, > form  >.box-body, > form > .box-footer");
		if (!box.hasClass("collapsed-box")) {
			//Convert minus into plus
			element.children(":first")
			.removeClass(_this.icons.collapse)
			.addClass(_this.icons.open);

			//Hide the content
			box_content.slideUp(_this.animationSpeed, function () {
			box.addClass("collapsed-box");
			});
		}
		else {
			//Convert plus into minus
			element.children(":first")
			.removeClass(_this.icons.open)
			.addClass(_this.icons.collapse);

			//Show the content
			box_content.slideDown(_this.animationSpeed, function () {
				box.removeClass("collapsed-box");
			});
		}
	},

	remove: function (element) {
		//Find the box parent
		var box = element.parents(".box").first();
		box.slideUp(this.animationSpeed);
	}
};

/*
 * EXPLICIT BOX CONTROLS
 * -----------------------
 * This is a custom plugin to use with the component BOX. It allows you to activate
 * a box inserted in the DOM after the app.js was loaded, toggle and remove box.
 *
 * @type plugin
 * @usage $("#box-widget").activateBox();
 * @usage $("#box-widget").toggleBox();
 * @usage $("#box-widget").removeBox();
 */
(function ($) {
	$.fn.activateBox = function () {
		$.AdminLTE.boxWidget.activate(this);
	};

	$.fn.toggleBox = function () {
		var button = $($.AdminLTE.boxWidget.selectors.collapse, this);
		$.AdminLTE.boxWidget.collapse(button);
	};

	$.fn.removeBox = function () {
		var button = $($.AdminLTE.boxWidget.selectors.remove, this);
		$.AdminLTE.boxWidget.remove(button);
	};
})(jQuery);
