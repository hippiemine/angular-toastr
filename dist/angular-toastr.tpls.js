(function() {
  'use strict';

  angular.module('toastr', [])
    .factory('toastr', toastr);

  toastr.$inject = ['$animate', '$injector', '$document', '$rootScope', '$sce', 'toastrConfig', '$q'];

  function toastr($animate, $injector, $document, $rootScope, $sce, toastrConfig, $q) {
    var container;
    var index = 0;
    var toasts = [];

    var previousToastMessage = '';
    var openToasts = {};

    var containerDefer = $q.defer();

    var toast = {
      clear: clear,
      error: error,
      info: info,
      remove: remove,
      success: success,
      warning: warning,
      alert: alertInfo,
      danger: danger
    };

    return toast;

    /* Public API */
    function clear(toast) {
      // Bit of a hack, I will remove this soon with a BC
      if (arguments.length === 1 && !toast) { return; }

      if (toast) {
        remove(toast.toastId);
      } else {
        for (var i = 0; i < toasts.length; i++) {
          remove(toasts[i].toastId);
        }
      }
    }

    function error(message, title, optionsOverride) {
      var type = _getOptions().iconClasses.error;
      return _buildNotification(type, message, title, optionsOverride);
    }

    function info(message, title, optionsOverride) {
      var type = _getOptions().iconClasses.info;
      return _buildNotification(type, message, title, optionsOverride);
    }

    function success(message, title, optionsOverride) {
      var type = _getOptions().iconClasses.success;
      return _buildNotification(type, message, title, optionsOverride);
    }

    function warning(message, title, optionsOverride) {
      var type = _getOptions().iconClasses.warning;
      return _buildNotification(type, message, title, optionsOverride);
    }

    function alertInfo(message, title, optionsOverride) {
      var type = _getOptions().iconClasses.alert;
      return _buildNotification(type, message, title, optionsOverride);
    }

    function danger(message, title, optionsOverride) {
      var type = _getOptions().iconClasses.danger;
      return _buildNotification(type, message, title, optionsOverride);
    }

    function remove(toastId, wasClicked) {
      var toast = findToast(toastId);

      if (toast && ! toast.deleting) { // Avoid clicking when fading out
        toast.deleting = true;
        toast.isOpened = false;
        $animate.leave(toast.el).then(function() {
          if (toast.scope.options.onHidden) {
            toast.scope.options.onHidden(wasClicked);
          }
          toast.scope.$destroy();
          var index = toasts.indexOf(toast);
          delete openToasts[toast.scope.message];
          toasts.splice(index, 1);
          var maxOpened = toastrConfig.maxOpened;
          if (maxOpened && toasts.length >= maxOpened) {
            toasts[maxOpened - 1].open.resolve();
          }
          if (lastToast()) {
            container.remove();
            container = null;
            containerDefer = $q.defer();
          }
        });
      }

      function findToast(toastId) {
        for (var i = 0; i < toasts.length; i++) {
          if (toasts[i].toastId === toastId) {
            return toasts[i];
          }
        }
      }

      function lastToast() {
        return !toasts.length;
      }
    }

    /* Internal functions */
    function _buildNotification(type, message, title, optionsOverride)
    {
      if (angular.isObject(title)) {
        optionsOverride = title;
        title = null;
      }

      return _notify({
        iconClass: type,
        message: message,
        optionsOverride: optionsOverride,
        title: title
      });
    }

    function _getOptions() {
      return angular.extend({}, toastrConfig);
    }

    function _createOrGetContainer(options) {
      if(container) { return containerDefer.promise; }

      container = angular.element('<div></div>');
      container.attr('id', options.containerId);
      container.addClass(options.positionClass);
      container.css({'pointer-events': 'auto'});

      var target = angular.element(document.querySelector(options.target));

      if ( ! target || ! target.length) {
        throw 'Target for toasts doesn\'t exist';
      }

      $animate.enter(container, target).then(function() {
        containerDefer.resolve();
      });

      return containerDefer.promise;
    }

    function _notify(map) {
      var options = _getOptions();

      if (shouldExit()) { return; }

      var newToast = createToast();

      toasts.push(newToast);

      if (ifMaxOpenedAndAutoDismiss()) {
        var oldToasts = toasts.slice(0, (toasts.length - options.maxOpened));
        for (var i = 0, len = oldToasts.length; i < len; i++) {
          remove(oldToasts[i].toastId);
        }
      }

      if (maxOpenedNotReached()) {
        newToast.open.resolve();
      }

      newToast.open.promise.then(function() {
        _createOrGetContainer(options).then(function() {
          newToast.isOpened = true;
          if (options.newestOnTop) {
            $animate.enter(newToast.el, container).then(function() {
              newToast.scope.init();
            });
          } else {
            var sibling = container[0].lastChild ? angular.element(container[0].lastChild) : null;
            $animate.enter(newToast.el, container, sibling).then(function() {
              newToast.scope.init();
            });
          }
        });
      });

      return newToast;

      function ifMaxOpenedAndAutoDismiss() {
        return options.autoDismiss && options.maxOpened && toasts.length > options.maxOpened;
      }

      function createScope(toast, map, options) {
        if (options.allowHtml) {
          toast.scope.allowHtml = true;
          toast.scope.title = $sce.trustAsHtml(map.title);
          toast.scope.message = $sce.trustAsHtml(map.message);
        } else {
          toast.scope.title = map.title;
          toast.scope.message = map.message;
        }

        toast.scope.toastType = toast.iconClass;
        toast.scope.toastId = toast.toastId;

        toast.scope.options = {
          extendedTimeOut: options.extendedTimeOut,
          messageClass: options.messageClass,
          onHidden: options.onHidden,
          onShown: options.onShown,
          progressBar: options.progressBar,
          tapToDismiss: options.tapToDismiss,
          timeOut: options.timeOut,
          timeOutFunction: options.timeOutFunction,
          titleClass: options.titleClass,
          toastClass: options.toastClass,
          onClick: options.onClick,
          btnYesClick: options.btnYesClick,
          btnNoClick: options.btnNoClick,
          showBtnYesNo: options.showBtnYesNo,
          btnYesText: options.btnYesText,
          btnNoText: options.btnNoText
        };

        if (options.closeButton) {
          toast.scope.options.closeHtml = options.closeHtml;
        }
      }

      function createToast() {
        var newToast = {
          toastId: index++,
          isOpened: false,
          scope: $rootScope.$new(),
          open: $q.defer()
        };
        newToast.iconClass = map.iconClass;
        if (map.optionsOverride) {
          options = angular.extend(options, cleanOptionsOverride(map.optionsOverride));
          newToast.iconClass = map.optionsOverride.iconClass || newToast.iconClass;
        }

        createScope(newToast, map, options);

        newToast.el = createToastEl(newToast.scope);

        return newToast;

        function cleanOptionsOverride(options) {
          var badOptions = ['containerId', 'iconClasses', 'maxOpened', 'newestOnTop',
                            'positionClass', 'preventDuplicates', 'preventOpenDuplicates', 'templates'];
          for (var i = 0, l = badOptions.length; i < l; i++) {
            delete options[badOptions[i]];
          }

          return options;
        }
      }

      function createToastEl(scope) {
        var angularDomEl = angular.element('<div toast></div>'),
          $compile = $injector.get('$compile');
        return $compile(angularDomEl)(scope);
      }

      function maxOpenedNotReached() {
        return options.maxOpened && toasts.length <= options.maxOpened || !options.maxOpened;
      }

      function shouldExit() {
        var isDuplicateOfLast = options.preventDuplicates && map.message === previousToastMessage;
        var isDuplicateOpen = options.preventOpenDuplicates && openToasts[map.message];

        if (isDuplicateOfLast || isDuplicateOpen) {
          return true;
        }

        previousToastMessage = map.message;
        openToasts[map.message] = true;

        return false;
      }
    }
  }
}());

(function() {
  'use strict';

  angular.module('toastr')
    .constant('toastrConfig', {
      allowHtml: false,
      autoDismiss: false,
      closeButton: false,
      closeHtml: '<button>&times;</button>',
      containerId: 'toast-container',
      extendedTimeOut: 1000,
      iconClasses: {
        error: 'toast-error',
        info: 'toast-info',
        success: 'toast-success',
        warning: 'toast-warning',
        alert: 'toast-alert',
        danger: 'toast-danger'
      },
      maxOpened: 0,
      messageClass: 'toast-message',
      newestOnTop: true,
      onHidden: null,
      onShown: null,
      onClick: null,
      showBtnYesNo: false,
      btnYesClick: null,
      btnNoClick: null,
      btnYesText: '确定',
      btnNoText: '取消',
      positionClass: 'toast-top-right',
      preventDuplicates: false,
      preventOpenDuplicates: false,
      progressBar: false,
      tapToDismiss: true,
      target: 'body',
      templates: {
        toast: 'directives/toast/toast.html',
        progressbar: 'directives/progressbar/progressbar.html'
      },
      timeOut: 5000,
      timeOutFunction: null,
      titleClass: 'toast-title',
      toastClass: 'toast'
    });
}());

(function() {
  'use strict';

  angular.module('toastr')
    .directive('progressBar', progressBar);

  progressBar.$inject = ['toastrConfig'];

  function progressBar(toastrConfig) {
    return {
      replace: true,
      require: '^toast',
      templateUrl: function() {
        return toastrConfig.templates.progressbar;
      },
      link: linkFunction
    };

    function linkFunction(scope, element, attrs, toastCtrl) {
      var intervalId, currentTimeOut, hideTime;

      toastCtrl.progressBar = scope;

      scope.start = function(duration) {
        if (intervalId) {
          clearInterval(intervalId);
        }

        currentTimeOut = parseFloat(duration);
        hideTime = new Date().getTime() + currentTimeOut;
        intervalId = setInterval(updateProgress, 10);
      };

      scope.stop = function() {
        if (intervalId) {
          clearInterval(intervalId);
        }
      };

      function updateProgress() {
        var percentage = ((hideTime - (new Date().getTime())) / currentTimeOut) * 100;
        element.css('width', percentage + '%');
      }

      scope.$on('$destroy', function() {
        // Failsafe stop
        clearInterval(intervalId);
      });
    }
  }
}());

(function() {
  'use strict';

  angular.module('toastr')
    .controller('ToastController', ToastController);

  function ToastController() {
    this.progressBar = null;

    this.startProgressBar = function(duration) {
      if (this.progressBar) {
        this.progressBar.start(duration);
      }
    };

    this.stopProgressBar = function() {
      if (this.progressBar) {
        this.progressBar.stop();
      }
    };
  }
}());

(function() {
  'use strict';

  angular.module('toastr')
    .directive('toast', toast);

  toast.$inject = ['$injector', '$interval', 'toastrConfig', 'toastr'];

  function toast($injector, $interval, toastrConfig, toastr) {
    return {
      replace: true,
      templateUrl: function() {
        return toastrConfig.templates.toast;
      },
      controller: 'ToastController',
      link: toastLinkFunction
    };

    function toastLinkFunction(scope, element, attrs, toastCtrl) {
      var timeout;

      scope.toastClass = scope.options.toastClass;
      scope.titleClass = scope.options.titleClass;
      scope.messageClass = scope.options.messageClass;
      scope.progressBar = scope.options.progressBar;
      scope.showBtnYesNo = scope.options.showBtnYesNo;
      scope.btnYesText = scope.options.btnYesText;
      scope.btnNoText = scope.options.btnNoText;
      scope.timeOutFunction = scope.options.timeOutFunction;
      console.log(scope.options.timeOutFunction);

      if (wantsCloseButton()) {
        var button = angular.element(scope.options.closeHtml),
          $compile = $injector.get('$compile');
        button.addClass('toast-close-button');
        button.attr('ng-click', 'close()');
        $compile(button)(scope);
        element.prepend(button);
      }

      scope.init = function() {
        if (scope.options.timeOut) {
          timeout = createTimeout(scope.options.timeOut);
        }
        if (scope.options.onShown) {
          scope.options.onShown();
        }
      };

      element.on('mouseenter', function() {
        hideAndStopProgressBar();
        if (timeout) {
          $interval.cancel(timeout);
        }
      });

      scope.tapToast = function () {
        if (scope.options.tapToDismiss) {
          scope.close(true);
        }else{
          if(typeof scope.options.onClick === 'function'){
              scope.options.onClick();
            }
        }
      };

      scope.btnYesClick = function ($event) {
        if (angular.isFunction(scope.options.btnYesClick)) {
            scope.options.btnYesClick();
            $event.stopPropagation();
            toastr.remove(scope.toastId, true);
        }
      }

      scope.btnNoClick = function ($event) {
        if (angular.isFunction(scope.options.btnNoClick)) {
          scope.options.btnNoClick();
          $event.stopPropagation();
          toastr.remove(scope.toastId, true);
        }
      }

      scope.close = function (wasClicked) {
        toastr.remove(scope.toastId, wasClicked);
      };

      element.on('mouseleave', function() {
        if (scope.options.timeOut === 0 && scope.options.extendedTimeOut === 0) { return; }
        scope.$apply(function() {
          scope.progressBar = scope.options.progressBar;
        });
        timeout = createTimeout(scope.options.extendedTimeOut);
      });

      function createTimeout(time) {
        toastCtrl.startProgressBar(time);
        return $interval(function() {
          toastCtrl.stopProgressBar();
          toastr.remove(scope.toastId);
          if (typeof scope.timeOutFunction === 'function') {
            scope.timeOutFunction();
          }
        }, time, 1);
      }

      function hideAndStopProgressBar() {
        scope.progressBar = false;
        toastCtrl.stopProgressBar();
      }

      function wantsCloseButton() {
        return scope.options.closeHtml;
      }
    }
  }
}());

angular.module("toastr").run(["$templateCache", function($templateCache) {$templateCache.put("directives/progressbar/progressbar.html","<div class=\"toast-progress\"></div>\r\n");
$templateCache.put("directives/toast/default.html","<div ng-click=\\ \"tapToast()\\\" class=\\ \"{{toastClass}} {{toastType}}\\\">\\n\r\n    <div ng-switch on=\\ \"allowHtml\\\">\\n\r\n        <div ng-switch-default ng-if=\\ \"title\\\" class=\\ \"{{titleClass}}\\\">{{title}}</div>\\n\r\n        <div ng-switch-default class=\\ \"{{messageClass}}\\\">{{message}}</div>\\n\r\n        <div ng-switch-when=\\ \"true\\\" ng-if=\\ \"title\\\" class=\\ \"{{titleClass}}\\\" ng-bind-html=\\ \"title\\\"></div>\\n\r\n        <div ng-switch-when=\\ \"true\\\" class=\\ \"{{messageClass}}\\\" ng-bind-html=\\ \"message\\\"></div>\\n </div>\\n\r\n    <progress-bar ng-if=\\ \"progressBar\\\"></progress-bar>\\n</div>\r\n");
$templateCache.put("directives/toast/toast.html","<div class=\"{{toastClass}} {{toastType}}\" ng-click=\"tapToast()\">\r\n  <div ng-switch on=\"allowHtml\">\r\n    <div ng-switch-default ng-if=\"title\" class=\"{{titleClass}}\">{{title}}</div>\r\n    <div ng-switch-default class=\"{{messageClass}}\">{{message}}</div>\r\n    <div ng-switch-when=\"true\" ng-if=\"title\" class=\"{{titleClass}}\" ng-bind-html=\"title\"></div>\r\n    <div ng-switch-when=\"true\" class=\"{{messageClass}}\" ng-bind-html=\"message\"></div>\r\n  </div>\r\n  <div class=\"toast-btn-group\" ng-show=\"showBtnYesNo\">\r\n  	<div class=\"toast-btn-box\">\r\n  		<input type=\"button\" value=\"{{btnYesText}}\" class=\"toast-btn\" ng-click=\"btnYesClick($event)\">\r\n  	</div>\r\n  	<div class=\"toast-btn-box\">\r\n  		<input type=\"button\" value=\"{{btnNoText}}\" class=\"toast-btn\" ng-click=\"btnNoClick($event)\">\r\n  	</div>\r\n  </div>\r\n  <progress-bar ng-if=\"progressBar\"></progress-bar>\r\n</div>\r\n");}]);
