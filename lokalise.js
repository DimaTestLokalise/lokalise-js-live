var Lokalise = {

    token: null,
    project: null,
    locale: null,
    onSave: null,
    lokaliseUrl: 'https://lokalise.co',

    _enabled: false,
    _keysBound: false,
    _cookieAuthTokenName: 'lokalise_auth_token',
    _cookieTokenName: 'lokalise_token',
    _canHandle: false,
    _handleElement: null,
    _elements: [],
    _contentOnFocus: '',

    init: function (project, locale, classSelector, onSave) {
        if (project === undefined || locale === undefined) {
            console.error('Lokalise cannot be init without required parameters.');
            return null;
        }

        Lokalise.project = project;
        Lokalise.locale = locale;
        Lokalise._elements = document.getElementsByClassName(classSelector === undefined ? 'lokalise' : classSelector);
        Lokalise.onSave = onSave;
        Lokalise._keyMaster.init();

        Lokalise._keyMaster.assignKey('⌘+shift+e, ctrl+shift+e', function (event) {
            if (Lokalise._enabled) {
                Lokalise._enabled = false;
                for (var i = 0; i < Lokalise._elements.length; i++) {
                    Lokalise._setElementDisabled(Lokalise._elements[i]);
                }
            } else {
                var token = Lokalise._cookie.get(Lokalise._cookieTokenName);
                if (token && token != null && token != 'null') {
                    Lokalise._enabled = true;
                    Lokalise.enable(token);
                } else {
                    Lokalise._cookie.listen(Lokalise._cookieAuthTokenName, function (authToken) {
                        var xhr = Lokalise._request('POST', '/api/oauth', 'token=' + encodeURIComponent(authToken)
                            + '&id=' + encodeURIComponent(Lokalise.project) + '&ratelimit=0');
                        xhr.onreadystatechange = function () {
                            if (xhr.readyState == XMLHttpRequest.DONE) {
                                try {
                                    var response = JSON.parse(xhr.responseText);
                                } catch (e) {
                                    console.error('Could not connect with the server:\n' + e.toString());
                                }
                                if (response && typeof response.api_token !== 'undefined') {
                                    Lokalise._enabled = true;
                                    Lokalise.enable(response.api_token);
                                } else if (response && typeof response.response.message !== 'undefined') {
                                    alert(response.response.message);
                                    console.error(response);
                                } else {
                                    alert('Ops. Something went wrong. Please try again later.');
                                }
                            }
                        };
                    });
                    Lokalise._popup.open(Lokalise.lokaliseUrl + '/signin?oauth=1&referrer='
                        + encodeURIComponent(window.location.href.split('#')[0]), 'Lokalise');
                }
            }
        });

        // should redirect to user.site.com/some/uri#lokalise/{authCode}
        var hash = window.location.hash.substr(1).split('/');
        if (typeof hash[0] !== 'undefined' && hash[0] === 'lokalise' && typeof hash[1] !== 'undefined') {
            console.log(hash);
            Lokalise._cookie.set(Lokalise._cookieAuthTokenName, hash[1]);
            window.close();
        }

        return this;
    },
    enable: function (token) {
        if (!Lokalise._enabled) {
            return null;
        }
        if (token === undefined) {
            console.error('No api token given.');
            return null;
        }
        Lokalise.token = token;
        if (!Lokalise._keysBound) {
            Lokalise._bindKeys();
        }
        for (var i = 0; i < Lokalise._elements.length; i++) {
            if (!Lokalise._keysBound) {
                Lokalise._addElementListeners(Lokalise._elements[i]);
            }
            Lokalise._setElementEditable(Lokalise._elements[i]);
        }
        Lokalise._keysBound = true;

        return this;
    },
    _bindKeys: function () {
        Lokalise._keyMaster.assignKey('⌘+i, ctrl+i', function (event) {
            if (Lokalise._canHandle && Lokalise._enabled) {
                document.execCommand('italic', false, 'i');
                event.preventDefault();
            }
        });
        Lokalise._keyMaster.assignKey('⌘+b, ctrl+b', function (event) {
            if (Lokalise._canHandle && Lokalise._enabled) {
                document.execCommand('bold', false, 'b');
                event.preventDefault();
            }
        });
        Lokalise._keyMaster.assignKey('⌘+u, ctrl+u', function (event) {
            if (Lokalise._canHandle && Lokalise._enabled) {
                document.execCommand('underline', false, 'u');
                event.preventDefault();
            }
        });
        Lokalise._keyMaster.assignKey('⌘+h, ctrl+h', function (event) {
            if (Lokalise._canHandle && Lokalise._enabled) {
                var html = prompt('Enter HTML code:', '');
                if (html) {
                    document.execCommand('insertHTML', false, html);
                }
                event.preventDefault();
            }
        });
        Lokalise._keyMaster.assignKey('⌘+/, ctrl+/', function (event) {
            if (Lokalise._canHandle && Lokalise._enabled) {
                var url = prompt('Enter link URL:', 'http://');
                if (url) {
                    document.execCommand('createlink', false, url);
                }
                event.preventDefault();
            }
        });
        Lokalise._keyMaster.assignKey('⌘+s, ctrl+s', function (event) {
            if (Lokalise._canHandle && Lokalise._enabled) {
                Lokalise._handleElement.blur();
                event.preventDefault();
            }
        });
    },
    _setElementEditable: function (element) {
        element.setAttribute('contentEditable', 'true');
        element.setAttribute('spellCheck', 'true');
    },
    _setElementDisabled: function (element) {
        element.setAttribute('contentEditable', 'false');
    },
    _addElementListeners: function (element) {
        element.addEventListener('focus', function () {
            if (Lokalise._enabled) {
                Lokalise._contentOnFocus = this.innerHTML;
            }
        });
        element.addEventListener('blur', function () {
            if (Lokalise._enabled) {
                if (this.innerHTML != Lokalise._contentOnFocus) {
                    Lokalise._save(this);
                    Lokalise._contentOnFocus = '';
                }
            }
        });
        element.addEventListener('keydown', function () {
            if (Lokalise._enabled) {
                Lokalise._canHandle = true;
                Lokalise._handleElement = this;
            }
        });
        element.addEventListener('keyup', function () {
            if (Lokalise._enabled) {
                Lokalise._canHandle = false;
                Lokalise._handleElement = null;
            }
        });
        element.addEventListener('click', function (event) {
            if (Lokalise._enabled) {
                event.stopPropagation();
                event.preventDefault();
            }
        });
    },
    _request: function (method, url, data) {
        var xhr = new XMLHttpRequest();
        if (!xhr) {
            console.error("Could not create XMLHttpRequest object");
            return false;
        }
        try {
            xhr.open(method, Lokalise.lokaliseUrl + url);
            xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
            xhr.send(data);
            return xhr;
        } catch (e) {
            console.error('Could not connect with the server:\n' + e.toString());
        }
    },
    _save: function (element) {
        var key = element.getAttribute('data-key'),
            value = element.innerHTML,
            translations = [],
            translation = {},
            success = false;

        translation[Lokalise.locale] = value;
        translations.push(translation);

        if (Lokalise.token || Lokalise.project) {
            success = Lokalise._request('POST', '/api/string/set', 'api_token=' + encodeURIComponent(Lokalise.token)
                + '&id=' + encodeURIComponent(Lokalise.project) + '&ratelimit=0&data='
                + encodeURIComponent(JSON.stringify([{"key": key, "translations": translations}])));
            if (typeof Lokalise.onSave === 'function' && success) {
                Lokalise.onSave(key, value, Lokalise.locale);
                Lokalise._updateSimilar(key, value);
            }
        }

        if (!success) {
            console.error('Lokalise could not update translation string.');
        }
    },
    _updateSimilar: function (key, value) {
        var element;
        for (var i = 0; i < Lokalise._elements.length; i++) {
            element = Lokalise._elements[i];
            if (element.getAttribute('data-key') === key) {
                console.log('Found', element);
                element.innerHTML = value;
            }
        }
    },
    _popup: {
        open: function (url, name) {
            var width = window.innerWidth,
                height = window.innerHeight,
                winWidth = 640,
                winHeight = 480,
                winLeft = width > winWidth ? Math.floor((width - winWidth) / 2) : 0,
                winTop = height > winHeight ? Math.floor((height - winHeight) / 2) : 0,
                params = "menubar=no,location=no,resizable=no,scrollbars=no,status=no,height=" + winHeight + ",width=" + winWidth + ",title=no,toolbar=no,top=" + winTop + ",left=" + winLeft;

            var popup = window.open(url, name, params);
            popup.focus();
        }
    },
    _cookie: {
        listen: function (name, callback) {
            var listener = window.setInterval(function () {
                var cookie = Lokalise._cookie.get(name);
                if (cookie && typeof callback === 'function' && cookie != null && cookie != 'null') {
                    callback(cookie);
                    Lokalise._cookie.set(name, 'null');
                    window.clearInterval(listener);
                }
            }, 1000);
        },
        get: function (name) {
            var matches = document.cookie.match(new RegExp(
                "(?:^|; )" + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + "=([^;]*)"
            ));
            return matches ? decodeURIComponent(matches[1]) : undefined;
        },
        set: function (name, value, options) {
            options = options || {
                    expires: 86400,
                    path: '/'
                };

            var expires = options.expires;

            if (typeof expires == "number" && expires) {
                var d = new Date();
                d.setTime(d.getTime() + expires * 1000);
                expires = options.expires = d;
            }
            if (expires && expires.toUTCString) {
                options.expires = expires.toUTCString();
            }

            value = encodeURIComponent(value);

            var updatedCookie = name + "=" + value;

            for (var propName in options) {
                updatedCookie += "; " + propName;
                var propValue = options[propName];
                if (propValue !== true) {
                    updatedCookie += "=" + propValue;
                }
            }

            document.cookie = updatedCookie;
        }
    },
    _keyMaster: {
        k: null,
        modifierMap: {
            16: 'shiftKey',
            18: 'altKey',
            17: 'ctrlKey',
            91: 'metaKey'
        },
        _handlers: {},
        _mods: {16: false, 18: false, 17: false, 91: false},
        _scope: 'all',
        _MODIFIERS: {
            '⇧': 16, shift: 16,
            '⌥': 18, alt: 18, option: 18,
            '⌃': 17, ctrl: 17, control: 17,
            '⌘': 91, command: 91
        },
        _MAP: {
            backspace: 8, tab: 9, clear: 12,
            enter: 13, 'return': 13,
            esc: 27, escape: 27, space: 32,
            left: 37, up: 38,
            right: 39, down: 40,
            del: 46, 'delete': 46,
            home: 36, end: 35,
            pageup: 33, pagedown: 34,
            ',': 188, '.': 190, '/': 191,
            '`': 192, '-': 189, '=': 187,
            ';': 186, '\'': 222,
            '[': 219, ']': 221, '\\': 220
        },
        key: {},
        previousKey: {},
        code: function (x) {
            return Lokalise._keyMaster._MAP[x] || x.toUpperCase().charCodeAt(0);
        },
        _downKeys: [],
        init: function () {
            for (var k = 1; k < 20; k++) Lokalise._keyMaster._MAP['f' + k] = 111 + k;
            for (k in Lokalise._keyMaster._MODIFIERS) Lokalise._keyMaster.assignKey[k] = false;
            Lokalise._keyMaster.addEvent(document, 'keydown', function (event) {
                Lokalise._keyMaster.dispatch(event)
            });
            Lokalise._keyMaster.addEvent(document, 'keyup', Lokalise._keyMaster.clearModifier);
            Lokalise._keyMaster.addEvent(window, 'focus', Lokalise._keyMaster.resetModifiers);

            Lokalise._keyMaster.key.setScope = Lokalise._keyMaster.setScope;
            Lokalise._keyMaster.key.getScope = Lokalise._keyMaster.getScope;
            Lokalise._keyMaster.key.deleteScope = Lokalise._keyMaster.deleteScope;
            Lokalise._keyMaster.key.filter = Lokalise._keyMaster.filter;
            Lokalise._keyMaster.key.isPressed = Lokalise._keyMaster.isPressed;
            Lokalise._keyMaster.key.getPressedKeyCodes = Lokalise._keyMaster.getPressedKeyCodes;
            Lokalise._keyMaster.key.noConflict = Lokalise._keyMaster.noConflict;
            Lokalise._keyMaster.key.unbind = Lokalise._keyMaster.unbindKey;

            Lokalise._keyMaster.previousKey = Lokalise._keyMaster.key;

            if (typeof module !== 'undefined') module.exports = Lokalise._keyMaster.assignKey;
        },
        index: function (array, item) {
            var i = array.length;
            while (i--) if (array[i] === item) return i;
            return -1;
        },
        compareArray: function (a1, a2) {
            if (a1.length != a2.length) return false;
            for (var i = 0; i < a1.length; i++) {
                if (a1[i] !== a2[i]) return false;
            }
            return true;
        },
        updateModifierKey: function (event) {
            for (var k in Lokalise._keyMaster._mods) {
                Lokalise._keyMaster._mods[k] = event[Lokalise._keyMaster.modifierMap[k]];
            }
        },
        dispatch: function (event) {
            var key, handler, k, i, modifiersMatch, scope;
            key = event.keyCode;

            if (Lokalise._keyMaster.index(Lokalise._keyMaster._downKeys, key) == -1) {
                Lokalise._keyMaster._downKeys.push(key);
            }

            if (key == 93 || key == 224) key = 91;
            if (key in Lokalise._keyMaster._mods) {
                Lokalise._keyMaster._mods[key] = true;
                for (k in Lokalise._keyMaster._MODIFIERS) if (Lokalise._keyMaster._MODIFIERS[k] == key) Lokalise._keyMaster.assignKey[k] = true;
                return;
            }
            Lokalise._keyMaster.updateModifierKey(event);

            // @todo: commented due to object has no filter
            // if (!Lokalise._keyMaster.assignKey.filter.call(this, event)) return;
            if (!(key in Lokalise._keyMaster._handlers)) return;

            scope = Lokalise._keyMaster.getScope();

            for (i = 0; i < Lokalise._keyMaster._handlers[key].length; i++) {
                handler = Lokalise._keyMaster._handlers[key][i];

                if (handler.scope == scope || handler.scope == 'all') {
                    modifiersMatch = handler.mods.length > 0;
                    for (k in Lokalise._keyMaster._mods)
                        if ((!Lokalise._keyMaster._mods[k] && Lokalise._keyMaster.index(handler.mods, +k) > -1) ||
                            (Lokalise._keyMaster._mods[k] && Lokalise._keyMaster.index(handler.mods, +k) == -1)) modifiersMatch = false;
                    if ((handler.mods.length == 0 && !Lokalise._keyMaster._mods[16] && !Lokalise._keyMaster._mods[18] && !Lokalise._keyMaster._mods[17] && !Lokalise._keyMaster._mods[91]) || modifiersMatch) {
                        if (handler.method(event, handler) === false) {
                            if (event.preventDefault) event.preventDefault();
                            else event.returnValue = false;
                            if (event.stopPropagation) event.stopPropagation();
                            if (event.cancelBubble) event.cancelBubble = true;
                        }
                    }
                }
            }
        },
        clearModifier: function (event) {
            var key = event.keyCode, k,
                i = Lokalise._keyMaster.index(Lokalise._keyMaster._downKeys, key);

            if (i >= 0) {
                Lokalise._keyMaster._downKeys.splice(i, 1);
            }

            if (key == 93 || key == 224) key = 91;
            if (key in Lokalise._keyMaster._mods) {
                Lokalise._keyMaster._mods[key] = false;
                for (k in Lokalise._keyMaster._MODIFIERS) if (Lokalise._keyMaster._MODIFIERS[k] == key) Lokalise._keyMaster.assignKey[k] = false;
            }
        },
        resetModifiers: function () {
            var k;
            for (k in Lokalise._keyMaster._mods) Lokalise._keyMaster._mods[k] = false;
            for (k in Lokalise._keyMaster._MODIFIERS) Lokalise._keyMaster.assignKey[k] = false;
        },
        assignKey: function (key, scope, method) {
            var keys, mods;
            keys = Lokalise._keyMaster.getKeys(key);
            if (method === undefined) {
                method = scope;
                scope = 'all';
            }

            for (var i = 0; i < keys.length; i++) {
                mods = [];
                key = keys[i].split('+');
                if (key.length > 1) {
                    mods = Lokalise._keyMaster.getMods(key);
                    key = [key[key.length - 1]];
                }
                key = key[0];
                key = Lokalise._keyMaster.code(key);
                if (!(key in Lokalise._keyMaster._handlers)) Lokalise._keyMaster._handlers[key] = [];
                Lokalise._keyMaster._handlers[key].push({
                    shortcut: keys[i],
                    scope: scope,
                    method: method,
                    key: keys[i],
                    mods: mods
                });
            }
        },
        unbindKey: function (key, scope) {
            var multipleKeys, keys,
                mods = [],
                i, j, obj;

            multipleKeys = Lokalise._keyMaster.getKeys(key);

            for (j = 0; j < multipleKeys.length; j++) {
                keys = multipleKeys[j].split('+');

                if (keys.length > 1) {
                    mods = Lokalise._keyMaster.getMods(keys);
                }

                key = keys[keys.length - 1];
                key = Lokalise._keyMaster.code(key);

                if (scope === undefined) {
                    scope = Lokalise._keyMaster.getScope();
                }
                if (!Lokalise._keyMaster._handlers[key]) {
                    return;
                }
                for (i = 0; i < Lokalise._keyMaster._handlers[key].length; i++) {
                    obj = Lokalise._keyMaster._handlers[key][i];
                    if (obj.scope === scope && Lokalise._keyMaster.compareArray(obj.mods, mods)) {
                        Lokalise._keyMaster._handlers[key][i] = {};
                    }
                }
            }
        },
        isPressed: function (keyCode) {
            if (typeof(keyCode) == 'string') {
                keyCode = Lokalise._keyMaster.code(keyCode);
            }
            return Lokalise._keyMaster.index(Lokalise._keyMaster._downKeys, keyCode) != -1;
        },
        getPressedKeyCodes: function () {
            return Lokalise._keyMaster._downKeys.slice(0);
        },
        filter: function (event) {
            var tagName = (event.target || event.srcElement).tagName;
            return !(tagName == 'INPUT' || tagName == 'SELECT' || tagName == 'TEXTAREA');
        },
        setScope: function (scope) {
            Lokalise._keyMaster._scope = scope || 'all'
        },
        getScope: function () {
            return Lokalise._keyMaster._scope || 'all'
        },
        deleteScope: function (scope) {
            var key, handlers, i;

            for (key in Lokalise._keyMaster._handlers) {
                handlers = Lokalise._keyMaster._handlers[key];
                for (i = 0; i < handlers.length;) {
                    if (handlers[i].scope === scope) handlers.splice(i, 1);
                    else i++;
                }
            }
        },
        getKeys: function (key) {
            var keys;
            key = key.replace(/\s/g, '');
            keys = key.split(',');
            if ((keys[keys.length - 1]) == '') {
                keys[keys.length - 2] += ',';
            }
            return keys;
        },
        getMods: function (key) {
            var mods = key.slice(0, key.length - 1);
            for (var mi = 0; mi < mods.length; mi++)
                mods[mi] = Lokalise._keyMaster._MODIFIERS[mods[mi]];
            return mods;
        },
        addEvent: function (object, event, method) {
            if (object.addEventListener)
                object.addEventListener(event, method, false);
            else if (object.attachEvent)
                object.attachEvent('on' + event, function () {
                    method(window.event)
                });
        },
        noConflict: function () {
            var k = Lokalise._keyMaster.key;
            Lokalise._keyMaster.key = Lokalise._keyMaster.previousKey;
            return k;
        }
    }
};
