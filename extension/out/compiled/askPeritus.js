var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        if (node.parentNode) {
            node.parentNode.removeChild(node);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, cancelable, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        // Do not reenter flush while dirty components are updated, as this can
        // result in an infinite loop. Instead, let the inner flush handle it.
        // Reentrancy is ok afterwards for bindings etc.
        if (flushidx !== 0) {
            return;
        }
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            try {
                while (flushidx < dirty_components.length) {
                    const component = dirty_components[flushidx];
                    flushidx++;
                    set_current_component(component);
                    update(component.$$);
                }
            }
            catch (e) {
                // reset dirty state to not end up in a deadlocked state and then rethrow
                dirty_components.length = 0;
                flushidx = 0;
                throw e;
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
        else if (callback) {
            callback();
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
                // if the component was destroyed immediately
                // it will update the `$$.on_destroy` reference to `null`.
                // the destructured on_destroy may still reference to the old array
                if (component.$$.on_destroy) {
                    component.$$.on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: [],
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            if (!is_function(callback)) {
                return noop;
            }
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.55.1' }, detail), { bubbles: true }));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

    var prismExports = {};
    var prism = {
      get exports(){ return prismExports; },
      set exports(v){ prismExports = v; },
    };

    (function (module) {
    	/* **********************************************
    	     Begin prism-core.js
    	********************************************** */

    	/// <reference lib="WebWorker"/>

    	var _self = (typeof window !== 'undefined')
    		? window   // if in browser
    		: (
    			(typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope)
    				? self // if in worker
    				: {}   // if in node js
    		);

    	/**
    	 * Prism: Lightweight, robust, elegant syntax highlighting
    	 *
    	 * @license MIT <https://opensource.org/licenses/MIT>
    	 * @author Lea Verou <https://lea.verou.me>
    	 * @namespace
    	 * @public
    	 */
    	var Prism = (function (_self) {

    		// Private helper vars
    		var lang = /(?:^|\s)lang(?:uage)?-([\w-]+)(?=\s|$)/i;
    		var uniqueId = 0;

    		// The grammar object for plaintext
    		var plainTextGrammar = {};


    		var _ = {
    			/**
    			 * By default, Prism will attempt to highlight all code elements (by calling {@link Prism.highlightAll}) on the
    			 * current page after the page finished loading. This might be a problem if e.g. you wanted to asynchronously load
    			 * additional languages or plugins yourself.
    			 *
    			 * By setting this value to `true`, Prism will not automatically highlight all code elements on the page.
    			 *
    			 * You obviously have to change this value before the automatic highlighting started. To do this, you can add an
    			 * empty Prism object into the global scope before loading the Prism script like this:
    			 *
    			 * ```js
    			 * window.Prism = window.Prism || {};
    			 * Prism.manual = true;
    			 * // add a new <script> to load Prism's script
    			 * ```
    			 *
    			 * @default false
    			 * @type {boolean}
    			 * @memberof Prism
    			 * @public
    			 */
    			manual: _self.Prism && _self.Prism.manual,
    			/**
    			 * By default, if Prism is in a web worker, it assumes that it is in a worker it created itself, so it uses
    			 * `addEventListener` to communicate with its parent instance. However, if you're using Prism manually in your
    			 * own worker, you don't want it to do this.
    			 *
    			 * By setting this value to `true`, Prism will not add its own listeners to the worker.
    			 *
    			 * You obviously have to change this value before Prism executes. To do this, you can add an
    			 * empty Prism object into the global scope before loading the Prism script like this:
    			 *
    			 * ```js
    			 * window.Prism = window.Prism || {};
    			 * Prism.disableWorkerMessageHandler = true;
    			 * // Load Prism's script
    			 * ```
    			 *
    			 * @default false
    			 * @type {boolean}
    			 * @memberof Prism
    			 * @public
    			 */
    			disableWorkerMessageHandler: _self.Prism && _self.Prism.disableWorkerMessageHandler,

    			/**
    			 * A namespace for utility methods.
    			 *
    			 * All function in this namespace that are not explicitly marked as _public_ are for __internal use only__ and may
    			 * change or disappear at any time.
    			 *
    			 * @namespace
    			 * @memberof Prism
    			 */
    			util: {
    				encode: function encode(tokens) {
    					if (tokens instanceof Token) {
    						return new Token(tokens.type, encode(tokens.content), tokens.alias);
    					} else if (Array.isArray(tokens)) {
    						return tokens.map(encode);
    					} else {
    						return tokens.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\u00a0/g, ' ');
    					}
    				},

    				/**
    				 * Returns the name of the type of the given value.
    				 *
    				 * @param {any} o
    				 * @returns {string}
    				 * @example
    				 * type(null)      === 'Null'
    				 * type(undefined) === 'Undefined'
    				 * type(123)       === 'Number'
    				 * type('foo')     === 'String'
    				 * type(true)      === 'Boolean'
    				 * type([1, 2])    === 'Array'
    				 * type({})        === 'Object'
    				 * type(String)    === 'Function'
    				 * type(/abc+/)    === 'RegExp'
    				 */
    				type: function (o) {
    					return Object.prototype.toString.call(o).slice(8, -1);
    				},

    				/**
    				 * Returns a unique number for the given object. Later calls will still return the same number.
    				 *
    				 * @param {Object} obj
    				 * @returns {number}
    				 */
    				objId: function (obj) {
    					if (!obj['__id']) {
    						Object.defineProperty(obj, '__id', { value: ++uniqueId });
    					}
    					return obj['__id'];
    				},

    				/**
    				 * Creates a deep clone of the given object.
    				 *
    				 * The main intended use of this function is to clone language definitions.
    				 *
    				 * @param {T} o
    				 * @param {Record<number, any>} [visited]
    				 * @returns {T}
    				 * @template T
    				 */
    				clone: function deepClone(o, visited) {
    					visited = visited || {};

    					var clone; var id;
    					switch (_.util.type(o)) {
    						case 'Object':
    							id = _.util.objId(o);
    							if (visited[id]) {
    								return visited[id];
    							}
    							clone = /** @type {Record<string, any>} */ ({});
    							visited[id] = clone;

    							for (var key in o) {
    								if (o.hasOwnProperty(key)) {
    									clone[key] = deepClone(o[key], visited);
    								}
    							}

    							return /** @type {any} */ (clone);

    						case 'Array':
    							id = _.util.objId(o);
    							if (visited[id]) {
    								return visited[id];
    							}
    							clone = [];
    							visited[id] = clone;

    							(/** @type {Array} */(/** @type {any} */(o))).forEach(function (v, i) {
    								clone[i] = deepClone(v, visited);
    							});

    							return /** @type {any} */ (clone);

    						default:
    							return o;
    					}
    				},

    				/**
    				 * Returns the Prism language of the given element set by a `language-xxxx` or `lang-xxxx` class.
    				 *
    				 * If no language is set for the element or the element is `null` or `undefined`, `none` will be returned.
    				 *
    				 * @param {Element} element
    				 * @returns {string}
    				 */
    				getLanguage: function (element) {
    					while (element) {
    						var m = lang.exec(element.className);
    						if (m) {
    							return m[1].toLowerCase();
    						}
    						element = element.parentElement;
    					}
    					return 'none';
    				},

    				/**
    				 * Sets the Prism `language-xxxx` class of the given element.
    				 *
    				 * @param {Element} element
    				 * @param {string} language
    				 * @returns {void}
    				 */
    				setLanguage: function (element, language) {
    					// remove all `language-xxxx` classes
    					// (this might leave behind a leading space)
    					element.className = element.className.replace(RegExp(lang, 'gi'), '');

    					// add the new `language-xxxx` class
    					// (using `classList` will automatically clean up spaces for us)
    					element.classList.add('language-' + language);
    				},

    				/**
    				 * Returns the script element that is currently executing.
    				 *
    				 * This does __not__ work for line script element.
    				 *
    				 * @returns {HTMLScriptElement | null}
    				 */
    				currentScript: function () {
    					if (typeof document === 'undefined') {
    						return null;
    					}
    					if ('currentScript' in document && 1 < 2 /* hack to trip TS' flow analysis */) {
    						return /** @type {any} */ (document.currentScript);
    					}

    					// IE11 workaround
    					// we'll get the src of the current script by parsing IE11's error stack trace
    					// this will not work for inline scripts

    					try {
    						throw new Error();
    					} catch (err) {
    						// Get file src url from stack. Specifically works with the format of stack traces in IE.
    						// A stack will look like this:
    						//
    						// Error
    						//    at _.util.currentScript (http://localhost/components/prism-core.js:119:5)
    						//    at Global code (http://localhost/components/prism-core.js:606:1)

    						var src = (/at [^(\r\n]*\((.*):[^:]+:[^:]+\)$/i.exec(err.stack) || [])[1];
    						if (src) {
    							var scripts = document.getElementsByTagName('script');
    							for (var i in scripts) {
    								if (scripts[i].src == src) {
    									return scripts[i];
    								}
    							}
    						}
    						return null;
    					}
    				},

    				/**
    				 * Returns whether a given class is active for `element`.
    				 *
    				 * The class can be activated if `element` or one of its ancestors has the given class and it can be deactivated
    				 * if `element` or one of its ancestors has the negated version of the given class. The _negated version_ of the
    				 * given class is just the given class with a `no-` prefix.
    				 *
    				 * Whether the class is active is determined by the closest ancestor of `element` (where `element` itself is
    				 * closest ancestor) that has the given class or the negated version of it. If neither `element` nor any of its
    				 * ancestors have the given class or the negated version of it, then the default activation will be returned.
    				 *
    				 * In the paradoxical situation where the closest ancestor contains __both__ the given class and the negated
    				 * version of it, the class is considered active.
    				 *
    				 * @param {Element} element
    				 * @param {string} className
    				 * @param {boolean} [defaultActivation=false]
    				 * @returns {boolean}
    				 */
    				isActive: function (element, className, defaultActivation) {
    					var no = 'no-' + className;

    					while (element) {
    						var classList = element.classList;
    						if (classList.contains(className)) {
    							return true;
    						}
    						if (classList.contains(no)) {
    							return false;
    						}
    						element = element.parentElement;
    					}
    					return !!defaultActivation;
    				}
    			},

    			/**
    			 * This namespace contains all currently loaded languages and the some helper functions to create and modify languages.
    			 *
    			 * @namespace
    			 * @memberof Prism
    			 * @public
    			 */
    			languages: {
    				/**
    				 * The grammar for plain, unformatted text.
    				 */
    				plain: plainTextGrammar,
    				plaintext: plainTextGrammar,
    				text: plainTextGrammar,
    				txt: plainTextGrammar,

    				/**
    				 * Creates a deep copy of the language with the given id and appends the given tokens.
    				 *
    				 * If a token in `redef` also appears in the copied language, then the existing token in the copied language
    				 * will be overwritten at its original position.
    				 *
    				 * ## Best practices
    				 *
    				 * Since the position of overwriting tokens (token in `redef` that overwrite tokens in the copied language)
    				 * doesn't matter, they can technically be in any order. However, this can be confusing to others that trying to
    				 * understand the language definition because, normally, the order of tokens matters in Prism grammars.
    				 *
    				 * Therefore, it is encouraged to order overwriting tokens according to the positions of the overwritten tokens.
    				 * Furthermore, all non-overwriting tokens should be placed after the overwriting ones.
    				 *
    				 * @param {string} id The id of the language to extend. This has to be a key in `Prism.languages`.
    				 * @param {Grammar} redef The new tokens to append.
    				 * @returns {Grammar} The new language created.
    				 * @public
    				 * @example
    				 * Prism.languages['css-with-colors'] = Prism.languages.extend('css', {
    				 *     // Prism.languages.css already has a 'comment' token, so this token will overwrite CSS' 'comment' token
    				 *     // at its original position
    				 *     'comment': { ... },
    				 *     // CSS doesn't have a 'color' token, so this token will be appended
    				 *     'color': /\b(?:red|green|blue)\b/
    				 * });
    				 */
    				extend: function (id, redef) {
    					var lang = _.util.clone(_.languages[id]);

    					for (var key in redef) {
    						lang[key] = redef[key];
    					}

    					return lang;
    				},

    				/**
    				 * Inserts tokens _before_ another token in a language definition or any other grammar.
    				 *
    				 * ## Usage
    				 *
    				 * This helper method makes it easy to modify existing languages. For example, the CSS language definition
    				 * not only defines CSS highlighting for CSS documents, but also needs to define highlighting for CSS embedded
    				 * in HTML through `<style>` elements. To do this, it needs to modify `Prism.languages.markup` and add the
    				 * appropriate tokens. However, `Prism.languages.markup` is a regular JavaScript object literal, so if you do
    				 * this:
    				 *
    				 * ```js
    				 * Prism.languages.markup.style = {
    				 *     // token
    				 * };
    				 * ```
    				 *
    				 * then the `style` token will be added (and processed) at the end. `insertBefore` allows you to insert tokens
    				 * before existing tokens. For the CSS example above, you would use it like this:
    				 *
    				 * ```js
    				 * Prism.languages.insertBefore('markup', 'cdata', {
    				 *     'style': {
    				 *         // token
    				 *     }
    				 * });
    				 * ```
    				 *
    				 * ## Special cases
    				 *
    				 * If the grammars of `inside` and `insert` have tokens with the same name, the tokens in `inside`'s grammar
    				 * will be ignored.
    				 *
    				 * This behavior can be used to insert tokens after `before`:
    				 *
    				 * ```js
    				 * Prism.languages.insertBefore('markup', 'comment', {
    				 *     'comment': Prism.languages.markup.comment,
    				 *     // tokens after 'comment'
    				 * });
    				 * ```
    				 *
    				 * ## Limitations
    				 *
    				 * The main problem `insertBefore` has to solve is iteration order. Since ES2015, the iteration order for object
    				 * properties is guaranteed to be the insertion order (except for integer keys) but some browsers behave
    				 * differently when keys are deleted and re-inserted. So `insertBefore` can't be implemented by temporarily
    				 * deleting properties which is necessary to insert at arbitrary positions.
    				 *
    				 * To solve this problem, `insertBefore` doesn't actually insert the given tokens into the target object.
    				 * Instead, it will create a new object and replace all references to the target object with the new one. This
    				 * can be done without temporarily deleting properties, so the iteration order is well-defined.
    				 *
    				 * However, only references that can be reached from `Prism.languages` or `insert` will be replaced. I.e. if
    				 * you hold the target object in a variable, then the value of the variable will not change.
    				 *
    				 * ```js
    				 * var oldMarkup = Prism.languages.markup;
    				 * var newMarkup = Prism.languages.insertBefore('markup', 'comment', { ... });
    				 *
    				 * assert(oldMarkup !== Prism.languages.markup);
    				 * assert(newMarkup === Prism.languages.markup);
    				 * ```
    				 *
    				 * @param {string} inside The property of `root` (e.g. a language id in `Prism.languages`) that contains the
    				 * object to be modified.
    				 * @param {string} before The key to insert before.
    				 * @param {Grammar} insert An object containing the key-value pairs to be inserted.
    				 * @param {Object<string, any>} [root] The object containing `inside`, i.e. the object that contains the
    				 * object to be modified.
    				 *
    				 * Defaults to `Prism.languages`.
    				 * @returns {Grammar} The new grammar object.
    				 * @public
    				 */
    				insertBefore: function (inside, before, insert, root) {
    					root = root || /** @type {any} */ (_.languages);
    					var grammar = root[inside];
    					/** @type {Grammar} */
    					var ret = {};

    					for (var token in grammar) {
    						if (grammar.hasOwnProperty(token)) {

    							if (token == before) {
    								for (var newToken in insert) {
    									if (insert.hasOwnProperty(newToken)) {
    										ret[newToken] = insert[newToken];
    									}
    								}
    							}

    							// Do not insert token which also occur in insert. See #1525
    							if (!insert.hasOwnProperty(token)) {
    								ret[token] = grammar[token];
    							}
    						}
    					}

    					var old = root[inside];
    					root[inside] = ret;

    					// Update references in other language definitions
    					_.languages.DFS(_.languages, function (key, value) {
    						if (value === old && key != inside) {
    							this[key] = ret;
    						}
    					});

    					return ret;
    				},

    				// Traverse a language definition with Depth First Search
    				DFS: function DFS(o, callback, type, visited) {
    					visited = visited || {};

    					var objId = _.util.objId;

    					for (var i in o) {
    						if (o.hasOwnProperty(i)) {
    							callback.call(o, i, o[i], type || i);

    							var property = o[i];
    							var propertyType = _.util.type(property);

    							if (propertyType === 'Object' && !visited[objId(property)]) {
    								visited[objId(property)] = true;
    								DFS(property, callback, null, visited);
    							} else if (propertyType === 'Array' && !visited[objId(property)]) {
    								visited[objId(property)] = true;
    								DFS(property, callback, i, visited);
    							}
    						}
    					}
    				}
    			},

    			plugins: {},

    			/**
    			 * This is the most high-level function in Prism’s API.
    			 * It fetches all the elements that have a `.language-xxxx` class and then calls {@link Prism.highlightElement} on
    			 * each one of them.
    			 *
    			 * This is equivalent to `Prism.highlightAllUnder(document, async, callback)`.
    			 *
    			 * @param {boolean} [async=false] Same as in {@link Prism.highlightAllUnder}.
    			 * @param {HighlightCallback} [callback] Same as in {@link Prism.highlightAllUnder}.
    			 * @memberof Prism
    			 * @public
    			 */
    			highlightAll: function (async, callback) {
    				_.highlightAllUnder(document, async, callback);
    			},

    			/**
    			 * Fetches all the descendants of `container` that have a `.language-xxxx` class and then calls
    			 * {@link Prism.highlightElement} on each one of them.
    			 *
    			 * The following hooks will be run:
    			 * 1. `before-highlightall`
    			 * 2. `before-all-elements-highlight`
    			 * 3. All hooks of {@link Prism.highlightElement} for each element.
    			 *
    			 * @param {ParentNode} container The root element, whose descendants that have a `.language-xxxx` class will be highlighted.
    			 * @param {boolean} [async=false] Whether each element is to be highlighted asynchronously using Web Workers.
    			 * @param {HighlightCallback} [callback] An optional callback to be invoked on each element after its highlighting is done.
    			 * @memberof Prism
    			 * @public
    			 */
    			highlightAllUnder: function (container, async, callback) {
    				var env = {
    					callback: callback,
    					container: container,
    					selector: 'code[class*="language-"], [class*="language-"] code, code[class*="lang-"], [class*="lang-"] code'
    				};

    				_.hooks.run('before-highlightall', env);

    				env.elements = Array.prototype.slice.apply(env.container.querySelectorAll(env.selector));

    				_.hooks.run('before-all-elements-highlight', env);

    				for (var i = 0, element; (element = env.elements[i++]);) {
    					_.highlightElement(element, async === true, env.callback);
    				}
    			},

    			/**
    			 * Highlights the code inside a single element.
    			 *
    			 * The following hooks will be run:
    			 * 1. `before-sanity-check`
    			 * 2. `before-highlight`
    			 * 3. All hooks of {@link Prism.highlight}. These hooks will be run by an asynchronous worker if `async` is `true`.
    			 * 4. `before-insert`
    			 * 5. `after-highlight`
    			 * 6. `complete`
    			 *
    			 * Some the above hooks will be skipped if the element doesn't contain any text or there is no grammar loaded for
    			 * the element's language.
    			 *
    			 * @param {Element} element The element containing the code.
    			 * It must have a class of `language-xxxx` to be processed, where `xxxx` is a valid language identifier.
    			 * @param {boolean} [async=false] Whether the element is to be highlighted asynchronously using Web Workers
    			 * to improve performance and avoid blocking the UI when highlighting very large chunks of code. This option is
    			 * [disabled by default](https://prismjs.com/faq.html#why-is-asynchronous-highlighting-disabled-by-default).
    			 *
    			 * Note: All language definitions required to highlight the code must be included in the main `prism.js` file for
    			 * asynchronous highlighting to work. You can build your own bundle on the
    			 * [Download page](https://prismjs.com/download.html).
    			 * @param {HighlightCallback} [callback] An optional callback to be invoked after the highlighting is done.
    			 * Mostly useful when `async` is `true`, since in that case, the highlighting is done asynchronously.
    			 * @memberof Prism
    			 * @public
    			 */
    			highlightElement: function (element, async, callback) {
    				// Find language
    				var language = _.util.getLanguage(element);
    				var grammar = _.languages[language];

    				// Set language on the element, if not present
    				_.util.setLanguage(element, language);

    				// Set language on the parent, for styling
    				var parent = element.parentElement;
    				if (parent && parent.nodeName.toLowerCase() === 'pre') {
    					_.util.setLanguage(parent, language);
    				}

    				var code = element.textContent;

    				var env = {
    					element: element,
    					language: language,
    					grammar: grammar,
    					code: code
    				};

    				function insertHighlightedCode(highlightedCode) {
    					env.highlightedCode = highlightedCode;

    					_.hooks.run('before-insert', env);

    					env.element.innerHTML = env.highlightedCode;

    					_.hooks.run('after-highlight', env);
    					_.hooks.run('complete', env);
    					callback && callback.call(env.element);
    				}

    				_.hooks.run('before-sanity-check', env);

    				// plugins may change/add the parent/element
    				parent = env.element.parentElement;
    				if (parent && parent.nodeName.toLowerCase() === 'pre' && !parent.hasAttribute('tabindex')) {
    					parent.setAttribute('tabindex', '0');
    				}

    				if (!env.code) {
    					_.hooks.run('complete', env);
    					callback && callback.call(env.element);
    					return;
    				}

    				_.hooks.run('before-highlight', env);

    				if (!env.grammar) {
    					insertHighlightedCode(_.util.encode(env.code));
    					return;
    				}

    				if (async && _self.Worker) {
    					var worker = new Worker(_.filename);

    					worker.onmessage = function (evt) {
    						insertHighlightedCode(evt.data);
    					};

    					worker.postMessage(JSON.stringify({
    						language: env.language,
    						code: env.code,
    						immediateClose: true
    					}));
    				} else {
    					insertHighlightedCode(_.highlight(env.code, env.grammar, env.language));
    				}
    			},

    			/**
    			 * Low-level function, only use if you know what you’re doing. It accepts a string of text as input
    			 * and the language definitions to use, and returns a string with the HTML produced.
    			 *
    			 * The following hooks will be run:
    			 * 1. `before-tokenize`
    			 * 2. `after-tokenize`
    			 * 3. `wrap`: On each {@link Token}.
    			 *
    			 * @param {string} text A string with the code to be highlighted.
    			 * @param {Grammar} grammar An object containing the tokens to use.
    			 *
    			 * Usually a language definition like `Prism.languages.markup`.
    			 * @param {string} language The name of the language definition passed to `grammar`.
    			 * @returns {string} The highlighted HTML.
    			 * @memberof Prism
    			 * @public
    			 * @example
    			 * Prism.highlight('var foo = true;', Prism.languages.javascript, 'javascript');
    			 */
    			highlight: function (text, grammar, language) {
    				var env = {
    					code: text,
    					grammar: grammar,
    					language: language
    				};
    				_.hooks.run('before-tokenize', env);
    				if (!env.grammar) {
    					throw new Error('The language "' + env.language + '" has no grammar.');
    				}
    				env.tokens = _.tokenize(env.code, env.grammar);
    				_.hooks.run('after-tokenize', env);
    				return Token.stringify(_.util.encode(env.tokens), env.language);
    			},

    			/**
    			 * This is the heart of Prism, and the most low-level function you can use. It accepts a string of text as input
    			 * and the language definitions to use, and returns an array with the tokenized code.
    			 *
    			 * When the language definition includes nested tokens, the function is called recursively on each of these tokens.
    			 *
    			 * This method could be useful in other contexts as well, as a very crude parser.
    			 *
    			 * @param {string} text A string with the code to be highlighted.
    			 * @param {Grammar} grammar An object containing the tokens to use.
    			 *
    			 * Usually a language definition like `Prism.languages.markup`.
    			 * @returns {TokenStream} An array of strings and tokens, a token stream.
    			 * @memberof Prism
    			 * @public
    			 * @example
    			 * let code = `var foo = 0;`;
    			 * let tokens = Prism.tokenize(code, Prism.languages.javascript);
    			 * tokens.forEach(token => {
    			 *     if (token instanceof Prism.Token && token.type === 'number') {
    			 *         console.log(`Found numeric literal: ${token.content}`);
    			 *     }
    			 * });
    			 */
    			tokenize: function (text, grammar) {
    				var rest = grammar.rest;
    				if (rest) {
    					for (var token in rest) {
    						grammar[token] = rest[token];
    					}

    					delete grammar.rest;
    				}

    				var tokenList = new LinkedList();
    				addAfter(tokenList, tokenList.head, text);

    				matchGrammar(text, tokenList, grammar, tokenList.head, 0);

    				return toArray(tokenList);
    			},

    			/**
    			 * @namespace
    			 * @memberof Prism
    			 * @public
    			 */
    			hooks: {
    				all: {},

    				/**
    				 * Adds the given callback to the list of callbacks for the given hook.
    				 *
    				 * The callback will be invoked when the hook it is registered for is run.
    				 * Hooks are usually directly run by a highlight function but you can also run hooks yourself.
    				 *
    				 * One callback function can be registered to multiple hooks and the same hook multiple times.
    				 *
    				 * @param {string} name The name of the hook.
    				 * @param {HookCallback} callback The callback function which is given environment variables.
    				 * @public
    				 */
    				add: function (name, callback) {
    					var hooks = _.hooks.all;

    					hooks[name] = hooks[name] || [];

    					hooks[name].push(callback);
    				},

    				/**
    				 * Runs a hook invoking all registered callbacks with the given environment variables.
    				 *
    				 * Callbacks will be invoked synchronously and in the order in which they were registered.
    				 *
    				 * @param {string} name The name of the hook.
    				 * @param {Object<string, any>} env The environment variables of the hook passed to all callbacks registered.
    				 * @public
    				 */
    				run: function (name, env) {
    					var callbacks = _.hooks.all[name];

    					if (!callbacks || !callbacks.length) {
    						return;
    					}

    					for (var i = 0, callback; (callback = callbacks[i++]);) {
    						callback(env);
    					}
    				}
    			},

    			Token: Token
    		};
    		_self.Prism = _;


    		// Typescript note:
    		// The following can be used to import the Token type in JSDoc:
    		//
    		//   @typedef {InstanceType<import("./prism-core")["Token"]>} Token

    		/**
    		 * Creates a new token.
    		 *
    		 * @param {string} type See {@link Token#type type}
    		 * @param {string | TokenStream} content See {@link Token#content content}
    		 * @param {string|string[]} [alias] The alias(es) of the token.
    		 * @param {string} [matchedStr=""] A copy of the full string this token was created from.
    		 * @class
    		 * @global
    		 * @public
    		 */
    		function Token(type, content, alias, matchedStr) {
    			/**
    			 * The type of the token.
    			 *
    			 * This is usually the key of a pattern in a {@link Grammar}.
    			 *
    			 * @type {string}
    			 * @see GrammarToken
    			 * @public
    			 */
    			this.type = type;
    			/**
    			 * The strings or tokens contained by this token.
    			 *
    			 * This will be a token stream if the pattern matched also defined an `inside` grammar.
    			 *
    			 * @type {string | TokenStream}
    			 * @public
    			 */
    			this.content = content;
    			/**
    			 * The alias(es) of the token.
    			 *
    			 * @type {string|string[]}
    			 * @see GrammarToken
    			 * @public
    			 */
    			this.alias = alias;
    			// Copy of the full string this token was created from
    			this.length = (matchedStr || '').length | 0;
    		}

    		/**
    		 * A token stream is an array of strings and {@link Token Token} objects.
    		 *
    		 * Token streams have to fulfill a few properties that are assumed by most functions (mostly internal ones) that process
    		 * them.
    		 *
    		 * 1. No adjacent strings.
    		 * 2. No empty strings.
    		 *
    		 *    The only exception here is the token stream that only contains the empty string and nothing else.
    		 *
    		 * @typedef {Array<string | Token>} TokenStream
    		 * @global
    		 * @public
    		 */

    		/**
    		 * Converts the given token or token stream to an HTML representation.
    		 *
    		 * The following hooks will be run:
    		 * 1. `wrap`: On each {@link Token}.
    		 *
    		 * @param {string | Token | TokenStream} o The token or token stream to be converted.
    		 * @param {string} language The name of current language.
    		 * @returns {string} The HTML representation of the token or token stream.
    		 * @memberof Token
    		 * @static
    		 */
    		Token.stringify = function stringify(o, language) {
    			if (typeof o == 'string') {
    				return o;
    			}
    			if (Array.isArray(o)) {
    				var s = '';
    				o.forEach(function (e) {
    					s += stringify(e, language);
    				});
    				return s;
    			}

    			var env = {
    				type: o.type,
    				content: stringify(o.content, language),
    				tag: 'span',
    				classes: ['token', o.type],
    				attributes: {},
    				language: language
    			};

    			var aliases = o.alias;
    			if (aliases) {
    				if (Array.isArray(aliases)) {
    					Array.prototype.push.apply(env.classes, aliases);
    				} else {
    					env.classes.push(aliases);
    				}
    			}

    			_.hooks.run('wrap', env);

    			var attributes = '';
    			for (var name in env.attributes) {
    				attributes += ' ' + name + '="' + (env.attributes[name] || '').replace(/"/g, '&quot;') + '"';
    			}

    			return '<' + env.tag + ' class="' + env.classes.join(' ') + '"' + attributes + '>' + env.content + '</' + env.tag + '>';
    		};

    		/**
    		 * @param {RegExp} pattern
    		 * @param {number} pos
    		 * @param {string} text
    		 * @param {boolean} lookbehind
    		 * @returns {RegExpExecArray | null}
    		 */
    		function matchPattern(pattern, pos, text, lookbehind) {
    			pattern.lastIndex = pos;
    			var match = pattern.exec(text);
    			if (match && lookbehind && match[1]) {
    				// change the match to remove the text matched by the Prism lookbehind group
    				var lookbehindLength = match[1].length;
    				match.index += lookbehindLength;
    				match[0] = match[0].slice(lookbehindLength);
    			}
    			return match;
    		}

    		/**
    		 * @param {string} text
    		 * @param {LinkedList<string | Token>} tokenList
    		 * @param {any} grammar
    		 * @param {LinkedListNode<string | Token>} startNode
    		 * @param {number} startPos
    		 * @param {RematchOptions} [rematch]
    		 * @returns {void}
    		 * @private
    		 *
    		 * @typedef RematchOptions
    		 * @property {string} cause
    		 * @property {number} reach
    		 */
    		function matchGrammar(text, tokenList, grammar, startNode, startPos, rematch) {
    			for (var token in grammar) {
    				if (!grammar.hasOwnProperty(token) || !grammar[token]) {
    					continue;
    				}

    				var patterns = grammar[token];
    				patterns = Array.isArray(patterns) ? patterns : [patterns];

    				for (var j = 0; j < patterns.length; ++j) {
    					if (rematch && rematch.cause == token + ',' + j) {
    						return;
    					}

    					var patternObj = patterns[j];
    					var inside = patternObj.inside;
    					var lookbehind = !!patternObj.lookbehind;
    					var greedy = !!patternObj.greedy;
    					var alias = patternObj.alias;

    					if (greedy && !patternObj.pattern.global) {
    						// Without the global flag, lastIndex won't work
    						var flags = patternObj.pattern.toString().match(/[imsuy]*$/)[0];
    						patternObj.pattern = RegExp(patternObj.pattern.source, flags + 'g');
    					}

    					/** @type {RegExp} */
    					var pattern = patternObj.pattern || patternObj;

    					for ( // iterate the token list and keep track of the current token/string position
    						var currentNode = startNode.next, pos = startPos;
    						currentNode !== tokenList.tail;
    						pos += currentNode.value.length, currentNode = currentNode.next
    					) {

    						if (rematch && pos >= rematch.reach) {
    							break;
    						}

    						var str = currentNode.value;

    						if (tokenList.length > text.length) {
    							// Something went terribly wrong, ABORT, ABORT!
    							return;
    						}

    						if (str instanceof Token) {
    							continue;
    						}

    						var removeCount = 1; // this is the to parameter of removeBetween
    						var match;

    						if (greedy) {
    							match = matchPattern(pattern, pos, text, lookbehind);
    							if (!match || match.index >= text.length) {
    								break;
    							}

    							var from = match.index;
    							var to = match.index + match[0].length;
    							var p = pos;

    							// find the node that contains the match
    							p += currentNode.value.length;
    							while (from >= p) {
    								currentNode = currentNode.next;
    								p += currentNode.value.length;
    							}
    							// adjust pos (and p)
    							p -= currentNode.value.length;
    							pos = p;

    							// the current node is a Token, then the match starts inside another Token, which is invalid
    							if (currentNode.value instanceof Token) {
    								continue;
    							}

    							// find the last node which is affected by this match
    							for (
    								var k = currentNode;
    								k !== tokenList.tail && (p < to || typeof k.value === 'string');
    								k = k.next
    							) {
    								removeCount++;
    								p += k.value.length;
    							}
    							removeCount--;

    							// replace with the new match
    							str = text.slice(pos, p);
    							match.index -= pos;
    						} else {
    							match = matchPattern(pattern, 0, str, lookbehind);
    							if (!match) {
    								continue;
    							}
    						}

    						// eslint-disable-next-line no-redeclare
    						var from = match.index;
    						var matchStr = match[0];
    						var before = str.slice(0, from);
    						var after = str.slice(from + matchStr.length);

    						var reach = pos + str.length;
    						if (rematch && reach > rematch.reach) {
    							rematch.reach = reach;
    						}

    						var removeFrom = currentNode.prev;

    						if (before) {
    							removeFrom = addAfter(tokenList, removeFrom, before);
    							pos += before.length;
    						}

    						removeRange(tokenList, removeFrom, removeCount);

    						var wrapped = new Token(token, inside ? _.tokenize(matchStr, inside) : matchStr, alias, matchStr);
    						currentNode = addAfter(tokenList, removeFrom, wrapped);

    						if (after) {
    							addAfter(tokenList, currentNode, after);
    						}

    						if (removeCount > 1) {
    							// at least one Token object was removed, so we have to do some rematching
    							// this can only happen if the current pattern is greedy

    							/** @type {RematchOptions} */
    							var nestedRematch = {
    								cause: token + ',' + j,
    								reach: reach
    							};
    							matchGrammar(text, tokenList, grammar, currentNode.prev, pos, nestedRematch);

    							// the reach might have been extended because of the rematching
    							if (rematch && nestedRematch.reach > rematch.reach) {
    								rematch.reach = nestedRematch.reach;
    							}
    						}
    					}
    				}
    			}
    		}

    		/**
    		 * @typedef LinkedListNode
    		 * @property {T} value
    		 * @property {LinkedListNode<T> | null} prev The previous node.
    		 * @property {LinkedListNode<T> | null} next The next node.
    		 * @template T
    		 * @private
    		 */

    		/**
    		 * @template T
    		 * @private
    		 */
    		function LinkedList() {
    			/** @type {LinkedListNode<T>} */
    			var head = { value: null, prev: null, next: null };
    			/** @type {LinkedListNode<T>} */
    			var tail = { value: null, prev: head, next: null };
    			head.next = tail;

    			/** @type {LinkedListNode<T>} */
    			this.head = head;
    			/** @type {LinkedListNode<T>} */
    			this.tail = tail;
    			this.length = 0;
    		}

    		/**
    		 * Adds a new node with the given value to the list.
    		 *
    		 * @param {LinkedList<T>} list
    		 * @param {LinkedListNode<T>} node
    		 * @param {T} value
    		 * @returns {LinkedListNode<T>} The added node.
    		 * @template T
    		 */
    		function addAfter(list, node, value) {
    			// assumes that node != list.tail && values.length >= 0
    			var next = node.next;

    			var newNode = { value: value, prev: node, next: next };
    			node.next = newNode;
    			next.prev = newNode;
    			list.length++;

    			return newNode;
    		}
    		/**
    		 * Removes `count` nodes after the given node. The given node will not be removed.
    		 *
    		 * @param {LinkedList<T>} list
    		 * @param {LinkedListNode<T>} node
    		 * @param {number} count
    		 * @template T
    		 */
    		function removeRange(list, node, count) {
    			var next = node.next;
    			for (var i = 0; i < count && next !== list.tail; i++) {
    				next = next.next;
    			}
    			node.next = next;
    			next.prev = node;
    			list.length -= i;
    		}
    		/**
    		 * @param {LinkedList<T>} list
    		 * @returns {T[]}
    		 * @template T
    		 */
    		function toArray(list) {
    			var array = [];
    			var node = list.head.next;
    			while (node !== list.tail) {
    				array.push(node.value);
    				node = node.next;
    			}
    			return array;
    		}


    		if (!_self.document) {
    			if (!_self.addEventListener) {
    				// in Node.js
    				return _;
    			}

    			if (!_.disableWorkerMessageHandler) {
    				// In worker
    				_self.addEventListener('message', function (evt) {
    					var message = JSON.parse(evt.data);
    					var lang = message.language;
    					var code = message.code;
    					var immediateClose = message.immediateClose;

    					_self.postMessage(_.highlight(code, _.languages[lang], lang));
    					if (immediateClose) {
    						_self.close();
    					}
    				}, false);
    			}

    			return _;
    		}

    		// Get current script and highlight
    		var script = _.util.currentScript();

    		if (script) {
    			_.filename = script.src;

    			if (script.hasAttribute('data-manual')) {
    				_.manual = true;
    			}
    		}

    		function highlightAutomaticallyCallback() {
    			if (!_.manual) {
    				_.highlightAll();
    			}
    		}

    		if (!_.manual) {
    			// If the document state is "loading", then we'll use DOMContentLoaded.
    			// If the document state is "interactive" and the prism.js script is deferred, then we'll also use the
    			// DOMContentLoaded event because there might be some plugins or languages which have also been deferred and they
    			// might take longer one animation frame to execute which can create a race condition where only some plugins have
    			// been loaded when Prism.highlightAll() is executed, depending on how fast resources are loaded.
    			// See https://github.com/PrismJS/prism/issues/2102
    			var readyState = document.readyState;
    			if (readyState === 'loading' || readyState === 'interactive' && script && script.defer) {
    				document.addEventListener('DOMContentLoaded', highlightAutomaticallyCallback);
    			} else {
    				if (window.requestAnimationFrame) {
    					window.requestAnimationFrame(highlightAutomaticallyCallback);
    				} else {
    					window.setTimeout(highlightAutomaticallyCallback, 16);
    				}
    			}
    		}

    		return _;

    	}(_self));

    	if (module.exports) {
    		module.exports = Prism;
    	}

    	// hack for components to work correctly in node.js
    	if (typeof commonjsGlobal !== 'undefined') {
    		commonjsGlobal.Prism = Prism;
    	}

    	// some additional documentation/types

    	/**
    	 * The expansion of a simple `RegExp` literal to support additional properties.
    	 *
    	 * @typedef GrammarToken
    	 * @property {RegExp} pattern The regular expression of the token.
    	 * @property {boolean} [lookbehind=false] If `true`, then the first capturing group of `pattern` will (effectively)
    	 * behave as a lookbehind group meaning that the captured text will not be part of the matched text of the new token.
    	 * @property {boolean} [greedy=false] Whether the token is greedy.
    	 * @property {string|string[]} [alias] An optional alias or list of aliases.
    	 * @property {Grammar} [inside] The nested grammar of this token.
    	 *
    	 * The `inside` grammar will be used to tokenize the text value of each token of this kind.
    	 *
    	 * This can be used to make nested and even recursive language definitions.
    	 *
    	 * Note: This can cause infinite recursion. Be careful when you embed different languages or even the same language into
    	 * each another.
    	 * @global
    	 * @public
    	 */

    	/**
    	 * @typedef Grammar
    	 * @type {Object<string, RegExp | GrammarToken | Array<RegExp | GrammarToken>>}
    	 * @property {Grammar} [rest] An optional grammar object that will be appended to this grammar.
    	 * @global
    	 * @public
    	 */

    	/**
    	 * A function which will invoked after an element was successfully highlighted.
    	 *
    	 * @callback HighlightCallback
    	 * @param {Element} element The element successfully highlighted.
    	 * @returns {void}
    	 * @global
    	 * @public
    	 */

    	/**
    	 * @callback HookCallback
    	 * @param {Object<string, any>} env The environment variables of the hook.
    	 * @returns {void}
    	 * @global
    	 * @public
    	 */


    	/* **********************************************
    	     Begin prism-markup.js
    	********************************************** */

    	Prism.languages.markup = {
    		'comment': {
    			pattern: /<!--(?:(?!<!--)[\s\S])*?-->/,
    			greedy: true
    		},
    		'prolog': {
    			pattern: /<\?[\s\S]+?\?>/,
    			greedy: true
    		},
    		'doctype': {
    			// https://www.w3.org/TR/xml/#NT-doctypedecl
    			pattern: /<!DOCTYPE(?:[^>"'[\]]|"[^"]*"|'[^']*')+(?:\[(?:[^<"'\]]|"[^"]*"|'[^']*'|<(?!!--)|<!--(?:[^-]|-(?!->))*-->)*\]\s*)?>/i,
    			greedy: true,
    			inside: {
    				'internal-subset': {
    					pattern: /(^[^\[]*\[)[\s\S]+(?=\]>$)/,
    					lookbehind: true,
    					greedy: true,
    					inside: null // see below
    				},
    				'string': {
    					pattern: /"[^"]*"|'[^']*'/,
    					greedy: true
    				},
    				'punctuation': /^<!|>$|[[\]]/,
    				'doctype-tag': /^DOCTYPE/i,
    				'name': /[^\s<>'"]+/
    			}
    		},
    		'cdata': {
    			pattern: /<!\[CDATA\[[\s\S]*?\]\]>/i,
    			greedy: true
    		},
    		'tag': {
    			pattern: /<\/?(?!\d)[^\s>\/=$<%]+(?:\s(?:\s*[^\s>\/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s'">=]+(?=[\s>]))|(?=[\s/>])))+)?\s*\/?>/,
    			greedy: true,
    			inside: {
    				'tag': {
    					pattern: /^<\/?[^\s>\/]+/,
    					inside: {
    						'punctuation': /^<\/?/,
    						'namespace': /^[^\s>\/:]+:/
    					}
    				},
    				'special-attr': [],
    				'attr-value': {
    					pattern: /=\s*(?:"[^"]*"|'[^']*'|[^\s'">=]+)/,
    					inside: {
    						'punctuation': [
    							{
    								pattern: /^=/,
    								alias: 'attr-equals'
    							},
    							{
    								pattern: /^(\s*)["']|["']$/,
    								lookbehind: true
    							}
    						]
    					}
    				},
    				'punctuation': /\/?>/,
    				'attr-name': {
    					pattern: /[^\s>\/]+/,
    					inside: {
    						'namespace': /^[^\s>\/:]+:/
    					}
    				}

    			}
    		},
    		'entity': [
    			{
    				pattern: /&[\da-z]{1,8};/i,
    				alias: 'named-entity'
    			},
    			/&#x?[\da-f]{1,8};/i
    		]
    	};

    	Prism.languages.markup['tag'].inside['attr-value'].inside['entity'] =
    		Prism.languages.markup['entity'];
    	Prism.languages.markup['doctype'].inside['internal-subset'].inside = Prism.languages.markup;

    	// Plugin to make entity title show the real entity, idea by Roman Komarov
    	Prism.hooks.add('wrap', function (env) {

    		if (env.type === 'entity') {
    			env.attributes['title'] = env.content.replace(/&amp;/, '&');
    		}
    	});

    	Object.defineProperty(Prism.languages.markup.tag, 'addInlined', {
    		/**
    		 * Adds an inlined language to markup.
    		 *
    		 * An example of an inlined language is CSS with `<style>` tags.
    		 *
    		 * @param {string} tagName The name of the tag that contains the inlined language. This name will be treated as
    		 * case insensitive.
    		 * @param {string} lang The language key.
    		 * @example
    		 * addInlined('style', 'css');
    		 */
    		value: function addInlined(tagName, lang) {
    			var includedCdataInside = {};
    			includedCdataInside['language-' + lang] = {
    				pattern: /(^<!\[CDATA\[)[\s\S]+?(?=\]\]>$)/i,
    				lookbehind: true,
    				inside: Prism.languages[lang]
    			};
    			includedCdataInside['cdata'] = /^<!\[CDATA\[|\]\]>$/i;

    			var inside = {
    				'included-cdata': {
    					pattern: /<!\[CDATA\[[\s\S]*?\]\]>/i,
    					inside: includedCdataInside
    				}
    			};
    			inside['language-' + lang] = {
    				pattern: /[\s\S]+/,
    				inside: Prism.languages[lang]
    			};

    			var def = {};
    			def[tagName] = {
    				pattern: RegExp(/(<__[^>]*>)(?:<!\[CDATA\[(?:[^\]]|\](?!\]>))*\]\]>|(?!<!\[CDATA\[)[\s\S])*?(?=<\/__>)/.source.replace(/__/g, function () { return tagName; }), 'i'),
    				lookbehind: true,
    				greedy: true,
    				inside: inside
    			};

    			Prism.languages.insertBefore('markup', 'cdata', def);
    		}
    	});
    	Object.defineProperty(Prism.languages.markup.tag, 'addAttribute', {
    		/**
    		 * Adds an pattern to highlight languages embedded in HTML attributes.
    		 *
    		 * An example of an inlined language is CSS with `style` attributes.
    		 *
    		 * @param {string} attrName The name of the tag that contains the inlined language. This name will be treated as
    		 * case insensitive.
    		 * @param {string} lang The language key.
    		 * @example
    		 * addAttribute('style', 'css');
    		 */
    		value: function (attrName, lang) {
    			Prism.languages.markup.tag.inside['special-attr'].push({
    				pattern: RegExp(
    					/(^|["'\s])/.source + '(?:' + attrName + ')' + /\s*=\s*(?:"[^"]*"|'[^']*'|[^\s'">=]+(?=[\s>]))/.source,
    					'i'
    				),
    				lookbehind: true,
    				inside: {
    					'attr-name': /^[^\s=]+/,
    					'attr-value': {
    						pattern: /=[\s\S]+/,
    						inside: {
    							'value': {
    								pattern: /(^=\s*(["']|(?!["'])))\S[\s\S]*(?=\2$)/,
    								lookbehind: true,
    								alias: [lang, 'language-' + lang],
    								inside: Prism.languages[lang]
    							},
    							'punctuation': [
    								{
    									pattern: /^=/,
    									alias: 'attr-equals'
    								},
    								/"|'/
    							]
    						}
    					}
    				}
    			});
    		}
    	});

    	Prism.languages.html = Prism.languages.markup;
    	Prism.languages.mathml = Prism.languages.markup;
    	Prism.languages.svg = Prism.languages.markup;

    	Prism.languages.xml = Prism.languages.extend('markup', {});
    	Prism.languages.ssml = Prism.languages.xml;
    	Prism.languages.atom = Prism.languages.xml;
    	Prism.languages.rss = Prism.languages.xml;


    	/* **********************************************
    	     Begin prism-css.js
    	********************************************** */

    	(function (Prism) {

    		var string = /(?:"(?:\\(?:\r\n|[\s\S])|[^"\\\r\n])*"|'(?:\\(?:\r\n|[\s\S])|[^'\\\r\n])*')/;

    		Prism.languages.css = {
    			'comment': /\/\*[\s\S]*?\*\//,
    			'atrule': {
    				pattern: RegExp('@[\\w-](?:' + /[^;{\s"']|\s+(?!\s)/.source + '|' + string.source + ')*?' + /(?:;|(?=\s*\{))/.source),
    				inside: {
    					'rule': /^@[\w-]+/,
    					'selector-function-argument': {
    						pattern: /(\bselector\s*\(\s*(?![\s)]))(?:[^()\s]|\s+(?![\s)])|\((?:[^()]|\([^()]*\))*\))+(?=\s*\))/,
    						lookbehind: true,
    						alias: 'selector'
    					},
    					'keyword': {
    						pattern: /(^|[^\w-])(?:and|not|only|or)(?![\w-])/,
    						lookbehind: true
    					}
    					// See rest below
    				}
    			},
    			'url': {
    				// https://drafts.csswg.org/css-values-3/#urls
    				pattern: RegExp('\\burl\\((?:' + string.source + '|' + /(?:[^\\\r\n()"']|\\[\s\S])*/.source + ')\\)', 'i'),
    				greedy: true,
    				inside: {
    					'function': /^url/i,
    					'punctuation': /^\(|\)$/,
    					'string': {
    						pattern: RegExp('^' + string.source + '$'),
    						alias: 'url'
    					}
    				}
    			},
    			'selector': {
    				pattern: RegExp('(^|[{}\\s])[^{}\\s](?:[^{};"\'\\s]|\\s+(?![\\s{])|' + string.source + ')*(?=\\s*\\{)'),
    				lookbehind: true
    			},
    			'string': {
    				pattern: string,
    				greedy: true
    			},
    			'property': {
    				pattern: /(^|[^-\w\xA0-\uFFFF])(?!\s)[-_a-z\xA0-\uFFFF](?:(?!\s)[-\w\xA0-\uFFFF])*(?=\s*:)/i,
    				lookbehind: true
    			},
    			'important': /!important\b/i,
    			'function': {
    				pattern: /(^|[^-a-z0-9])[-a-z0-9]+(?=\()/i,
    				lookbehind: true
    			},
    			'punctuation': /[(){};:,]/
    		};

    		Prism.languages.css['atrule'].inside.rest = Prism.languages.css;

    		var markup = Prism.languages.markup;
    		if (markup) {
    			markup.tag.addInlined('style', 'css');
    			markup.tag.addAttribute('style', 'css');
    		}

    	}(Prism));


    	/* **********************************************
    	     Begin prism-clike.js
    	********************************************** */

    	Prism.languages.clike = {
    		'comment': [
    			{
    				pattern: /(^|[^\\])\/\*[\s\S]*?(?:\*\/|$)/,
    				lookbehind: true,
    				greedy: true
    			},
    			{
    				pattern: /(^|[^\\:])\/\/.*/,
    				lookbehind: true,
    				greedy: true
    			}
    		],
    		'string': {
    			pattern: /(["'])(?:\\(?:\r\n|[\s\S])|(?!\1)[^\\\r\n])*\1/,
    			greedy: true
    		},
    		'class-name': {
    			pattern: /(\b(?:class|extends|implements|instanceof|interface|new|trait)\s+|\bcatch\s+\()[\w.\\]+/i,
    			lookbehind: true,
    			inside: {
    				'punctuation': /[.\\]/
    			}
    		},
    		'keyword': /\b(?:break|catch|continue|do|else|finally|for|function|if|in|instanceof|new|null|return|throw|try|while)\b/,
    		'boolean': /\b(?:false|true)\b/,
    		'function': /\b\w+(?=\()/,
    		'number': /\b0x[\da-f]+\b|(?:\b\d+(?:\.\d*)?|\B\.\d+)(?:e[+-]?\d+)?/i,
    		'operator': /[<>]=?|[!=]=?=?|--?|\+\+?|&&?|\|\|?|[?*/~^%]/,
    		'punctuation': /[{}[\];(),.:]/
    	};


    	/* **********************************************
    	     Begin prism-javascript.js
    	********************************************** */

    	Prism.languages.javascript = Prism.languages.extend('clike', {
    		'class-name': [
    			Prism.languages.clike['class-name'],
    			{
    				pattern: /(^|[^$\w\xA0-\uFFFF])(?!\s)[_$A-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\.(?:constructor|prototype))/,
    				lookbehind: true
    			}
    		],
    		'keyword': [
    			{
    				pattern: /((?:^|\})\s*)catch\b/,
    				lookbehind: true
    			},
    			{
    				pattern: /(^|[^.]|\.\.\.\s*)\b(?:as|assert(?=\s*\{)|async(?=\s*(?:function\b|\(|[$\w\xA0-\uFFFF]|$))|await|break|case|class|const|continue|debugger|default|delete|do|else|enum|export|extends|finally(?=\s*(?:\{|$))|for|from(?=\s*(?:['"]|$))|function|(?:get|set)(?=\s*(?:[#\[$\w\xA0-\uFFFF]|$))|if|implements|import|in|instanceof|interface|let|new|null|of|package|private|protected|public|return|static|super|switch|this|throw|try|typeof|undefined|var|void|while|with|yield)\b/,
    				lookbehind: true
    			},
    		],
    		// Allow for all non-ASCII characters (See http://stackoverflow.com/a/2008444)
    		'function': /#?(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*(?:\.\s*(?:apply|bind|call)\s*)?\()/,
    		'number': {
    			pattern: RegExp(
    				/(^|[^\w$])/.source +
    				'(?:' +
    				(
    					// constant
    					/NaN|Infinity/.source +
    					'|' +
    					// binary integer
    					/0[bB][01]+(?:_[01]+)*n?/.source +
    					'|' +
    					// octal integer
    					/0[oO][0-7]+(?:_[0-7]+)*n?/.source +
    					'|' +
    					// hexadecimal integer
    					/0[xX][\dA-Fa-f]+(?:_[\dA-Fa-f]+)*n?/.source +
    					'|' +
    					// decimal bigint
    					/\d+(?:_\d+)*n/.source +
    					'|' +
    					// decimal number (integer or float) but no bigint
    					/(?:\d+(?:_\d+)*(?:\.(?:\d+(?:_\d+)*)?)?|\.\d+(?:_\d+)*)(?:[Ee][+-]?\d+(?:_\d+)*)?/.source
    				) +
    				')' +
    				/(?![\w$])/.source
    			),
    			lookbehind: true
    		},
    		'operator': /--|\+\+|\*\*=?|=>|&&=?|\|\|=?|[!=]==|<<=?|>>>?=?|[-+*/%&|^!=<>]=?|\.{3}|\?\?=?|\?\.?|[~:]/
    	});

    	Prism.languages.javascript['class-name'][0].pattern = /(\b(?:class|extends|implements|instanceof|interface|new)\s+)[\w.\\]+/;

    	Prism.languages.insertBefore('javascript', 'keyword', {
    		'regex': {
    			pattern: RegExp(
    				// lookbehind
    				// eslint-disable-next-line regexp/no-dupe-characters-character-class
    				/((?:^|[^$\w\xA0-\uFFFF."'\])\s]|\b(?:return|yield))\s*)/.source +
    				// Regex pattern:
    				// There are 2 regex patterns here. The RegExp set notation proposal added support for nested character
    				// classes if the `v` flag is present. Unfortunately, nested CCs are both context-free and incompatible
    				// with the only syntax, so we have to define 2 different regex patterns.
    				/\//.source +
    				'(?:' +
    				/(?:\[(?:[^\]\\\r\n]|\\.)*\]|\\.|[^/\\\[\r\n])+\/[dgimyus]{0,7}/.source +
    				'|' +
    				// `v` flag syntax. This supports 3 levels of nested character classes.
    				/(?:\[(?:[^[\]\\\r\n]|\\.|\[(?:[^[\]\\\r\n]|\\.|\[(?:[^[\]\\\r\n]|\\.)*\])*\])*\]|\\.|[^/\\\[\r\n])+\/[dgimyus]{0,7}v[dgimyus]{0,7}/.source +
    				')' +
    				// lookahead
    				/(?=(?:\s|\/\*(?:[^*]|\*(?!\/))*\*\/)*(?:$|[\r\n,.;:})\]]|\/\/))/.source
    			),
    			lookbehind: true,
    			greedy: true,
    			inside: {
    				'regex-source': {
    					pattern: /^(\/)[\s\S]+(?=\/[a-z]*$)/,
    					lookbehind: true,
    					alias: 'language-regex',
    					inside: Prism.languages.regex
    				},
    				'regex-delimiter': /^\/|\/$/,
    				'regex-flags': /^[a-z]+$/,
    			}
    		},
    		// This must be declared before keyword because we use "function" inside the look-forward
    		'function-variable': {
    			pattern: /#?(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*[=:]\s*(?:async\s*)?(?:\bfunction\b|(?:\((?:[^()]|\([^()]*\))*\)|(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*)\s*=>))/,
    			alias: 'function'
    		},
    		'parameter': [
    			{
    				pattern: /(function(?:\s+(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*)?\s*\(\s*)(?!\s)(?:[^()\s]|\s+(?![\s)])|\([^()]*\))+(?=\s*\))/,
    				lookbehind: true,
    				inside: Prism.languages.javascript
    			},
    			{
    				pattern: /(^|[^$\w\xA0-\uFFFF])(?!\s)[_$a-z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*=>)/i,
    				lookbehind: true,
    				inside: Prism.languages.javascript
    			},
    			{
    				pattern: /(\(\s*)(?!\s)(?:[^()\s]|\s+(?![\s)])|\([^()]*\))+(?=\s*\)\s*=>)/,
    				lookbehind: true,
    				inside: Prism.languages.javascript
    			},
    			{
    				pattern: /((?:\b|\s|^)(?!(?:as|async|await|break|case|catch|class|const|continue|debugger|default|delete|do|else|enum|export|extends|finally|for|from|function|get|if|implements|import|in|instanceof|interface|let|new|null|of|package|private|protected|public|return|set|static|super|switch|this|throw|try|typeof|undefined|var|void|while|with|yield)(?![$\w\xA0-\uFFFF]))(?:(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*\s*)\(\s*|\]\s*\(\s*)(?!\s)(?:[^()\s]|\s+(?![\s)])|\([^()]*\))+(?=\s*\)\s*\{)/,
    				lookbehind: true,
    				inside: Prism.languages.javascript
    			}
    		],
    		'constant': /\b[A-Z](?:[A-Z_]|\dx?)*\b/
    	});

    	Prism.languages.insertBefore('javascript', 'string', {
    		'hashbang': {
    			pattern: /^#!.*/,
    			greedy: true,
    			alias: 'comment'
    		},
    		'template-string': {
    			pattern: /`(?:\\[\s\S]|\$\{(?:[^{}]|\{(?:[^{}]|\{[^}]*\})*\})+\}|(?!\$\{)[^\\`])*`/,
    			greedy: true,
    			inside: {
    				'template-punctuation': {
    					pattern: /^`|`$/,
    					alias: 'string'
    				},
    				'interpolation': {
    					pattern: /((?:^|[^\\])(?:\\{2})*)\$\{(?:[^{}]|\{(?:[^{}]|\{[^}]*\})*\})+\}/,
    					lookbehind: true,
    					inside: {
    						'interpolation-punctuation': {
    							pattern: /^\$\{|\}$/,
    							alias: 'punctuation'
    						},
    						rest: Prism.languages.javascript
    					}
    				},
    				'string': /[\s\S]+/
    			}
    		},
    		'string-property': {
    			pattern: /((?:^|[,{])[ \t]*)(["'])(?:\\(?:\r\n|[\s\S])|(?!\2)[^\\\r\n])*\2(?=\s*:)/m,
    			lookbehind: true,
    			greedy: true,
    			alias: 'property'
    		}
    	});

    	Prism.languages.insertBefore('javascript', 'operator', {
    		'literal-property': {
    			pattern: /((?:^|[,{])[ \t]*)(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*:)/m,
    			lookbehind: true,
    			alias: 'property'
    		},
    	});

    	if (Prism.languages.markup) {
    		Prism.languages.markup.tag.addInlined('script', 'javascript');

    		// add attribute support for all DOM events.
    		// https://developer.mozilla.org/en-US/docs/Web/Events#Standard_events
    		Prism.languages.markup.tag.addAttribute(
    			/on(?:abort|blur|change|click|composition(?:end|start|update)|dblclick|error|focus(?:in|out)?|key(?:down|up)|load|mouse(?:down|enter|leave|move|out|over|up)|reset|resize|scroll|select|slotchange|submit|unload|wheel)/.source,
    			'javascript'
    		);
    	}

    	Prism.languages.js = Prism.languages.javascript;


    	/* **********************************************
    	     Begin prism-file-highlight.js
    	********************************************** */

    	(function () {

    		if (typeof Prism === 'undefined' || typeof document === 'undefined') {
    			return;
    		}

    		// https://developer.mozilla.org/en-US/docs/Web/API/Element/matches#Polyfill
    		if (!Element.prototype.matches) {
    			Element.prototype.matches = Element.prototype.msMatchesSelector || Element.prototype.webkitMatchesSelector;
    		}

    		var LOADING_MESSAGE = 'Loading…';
    		var FAILURE_MESSAGE = function (status, message) {
    			return '✖ Error ' + status + ' while fetching file: ' + message;
    		};
    		var FAILURE_EMPTY_MESSAGE = '✖ Error: File does not exist or is empty';

    		var EXTENSIONS = {
    			'js': 'javascript',
    			'py': 'python',
    			'rb': 'ruby',
    			'ps1': 'powershell',
    			'psm1': 'powershell',
    			'sh': 'bash',
    			'bat': 'batch',
    			'h': 'c',
    			'tex': 'latex'
    		};

    		var STATUS_ATTR = 'data-src-status';
    		var STATUS_LOADING = 'loading';
    		var STATUS_LOADED = 'loaded';
    		var STATUS_FAILED = 'failed';

    		var SELECTOR = 'pre[data-src]:not([' + STATUS_ATTR + '="' + STATUS_LOADED + '"])'
    			+ ':not([' + STATUS_ATTR + '="' + STATUS_LOADING + '"])';

    		/**
    		 * Loads the given file.
    		 *
    		 * @param {string} src The URL or path of the source file to load.
    		 * @param {(result: string) => void} success
    		 * @param {(reason: string) => void} error
    		 */
    		function loadFile(src, success, error) {
    			var xhr = new XMLHttpRequest();
    			xhr.open('GET', src, true);
    			xhr.onreadystatechange = function () {
    				if (xhr.readyState == 4) {
    					if (xhr.status < 400 && xhr.responseText) {
    						success(xhr.responseText);
    					} else {
    						if (xhr.status >= 400) {
    							error(FAILURE_MESSAGE(xhr.status, xhr.statusText));
    						} else {
    							error(FAILURE_EMPTY_MESSAGE);
    						}
    					}
    				}
    			};
    			xhr.send(null);
    		}

    		/**
    		 * Parses the given range.
    		 *
    		 * This returns a range with inclusive ends.
    		 *
    		 * @param {string | null | undefined} range
    		 * @returns {[number, number | undefined] | undefined}
    		 */
    		function parseRange(range) {
    			var m = /^\s*(\d+)\s*(?:(,)\s*(?:(\d+)\s*)?)?$/.exec(range || '');
    			if (m) {
    				var start = Number(m[1]);
    				var comma = m[2];
    				var end = m[3];

    				if (!comma) {
    					return [start, start];
    				}
    				if (!end) {
    					return [start, undefined];
    				}
    				return [start, Number(end)];
    			}
    			return undefined;
    		}

    		Prism.hooks.add('before-highlightall', function (env) {
    			env.selector += ', ' + SELECTOR;
    		});

    		Prism.hooks.add('before-sanity-check', function (env) {
    			var pre = /** @type {HTMLPreElement} */ (env.element);
    			if (pre.matches(SELECTOR)) {
    				env.code = ''; // fast-path the whole thing and go to complete

    				pre.setAttribute(STATUS_ATTR, STATUS_LOADING); // mark as loading

    				// add code element with loading message
    				var code = pre.appendChild(document.createElement('CODE'));
    				code.textContent = LOADING_MESSAGE;

    				var src = pre.getAttribute('data-src');

    				var language = env.language;
    				if (language === 'none') {
    					// the language might be 'none' because there is no language set;
    					// in this case, we want to use the extension as the language
    					var extension = (/\.(\w+)$/.exec(src) || [, 'none'])[1];
    					language = EXTENSIONS[extension] || extension;
    				}

    				// set language classes
    				Prism.util.setLanguage(code, language);
    				Prism.util.setLanguage(pre, language);

    				// preload the language
    				var autoloader = Prism.plugins.autoloader;
    				if (autoloader) {
    					autoloader.loadLanguages(language);
    				}

    				// load file
    				loadFile(
    					src,
    					function (text) {
    						// mark as loaded
    						pre.setAttribute(STATUS_ATTR, STATUS_LOADED);

    						// handle data-range
    						var range = parseRange(pre.getAttribute('data-range'));
    						if (range) {
    							var lines = text.split(/\r\n?|\n/g);

    							// the range is one-based and inclusive on both ends
    							var start = range[0];
    							var end = range[1] == null ? lines.length : range[1];

    							if (start < 0) { start += lines.length; }
    							start = Math.max(0, Math.min(start - 1, lines.length));
    							if (end < 0) { end += lines.length; }
    							end = Math.max(0, Math.min(end, lines.length));

    							text = lines.slice(start, end).join('\n');

    							// add data-start for line numbers
    							if (!pre.hasAttribute('data-start')) {
    								pre.setAttribute('data-start', String(start + 1));
    							}
    						}

    						// highlight code
    						code.textContent = text;
    						Prism.highlightElement(code);
    					},
    					function (error) {
    						// mark as failed
    						pre.setAttribute(STATUS_ATTR, STATUS_FAILED);

    						code.textContent = error;
    					}
    				);
    			}
    		});

    		Prism.plugins.fileHighlight = {
    			/**
    			 * Executes the File Highlight plugin for all matching `pre` elements under the given container.
    			 *
    			 * Note: Elements which are already loaded or currently loading will not be touched by this method.
    			 *
    			 * @param {ParentNode} [container=document]
    			 */
    			highlight: function highlight(container) {
    				var elements = (container || document).querySelectorAll(SELECTOR);

    				for (var i = 0, element; (element = elements[i++]);) {
    					Prism.highlightElement(element);
    				}
    			}
    		};

    		var logged = false;
    		/** @deprecated Use `Prism.plugins.fileHighlight.highlight` instead. */
    		Prism.fileHighlight = function () {
    			if (!logged) {
    				console.warn('Prism.fileHighlight is deprecated. Use `Prism.plugins.fileHighlight.highlight` instead.');
    				logged = true;
    			}
    			Prism.plugins.fileHighlight.highlight.apply(this, arguments);
    		};

    	}());
    } (prism));

    var Prism$1 = prismExports;

    const parseNumber = parseFloat;

    function joinCss(obj, separator = ';') {
      let texts;
      if (Array.isArray(obj)) {
        texts = obj.filter((text) => text);
      } else {
        texts = [];
        for (const prop in obj) {
          if (obj[prop]) {
            texts.push(`${prop}:${obj[prop]}`);
          }
        }
      }
      return texts.join(separator);
    }

    function getStyles(style, size, pull, fw) {
      let float;
      let width;
      const height = '1em';
      let lineHeight;
      let fontSize;
      let textAlign;
      let verticalAlign = '-.125em';
      const overflow = 'visible';

      if (fw) {
        textAlign = 'center';
        width = '1.25em';
      }

      if (pull) {
        float = pull;
      }

      if (size) {
        if (size == 'lg') {
          fontSize = '1.33333em';
          lineHeight = '.75em';
          verticalAlign = '-.225em';
        } else if (size == 'xs') {
          fontSize = '.75em';
        } else if (size == 'sm') {
          fontSize = '.875em';
        } else {
          fontSize = size.replace('x', 'em');
        }
      }

      return joinCss([
        joinCss({
          float,
          width,
          height,
          'line-height': lineHeight,
          'font-size': fontSize,
          'text-align': textAlign,
          'vertical-align': verticalAlign,
          'transform-origin': 'center',
          overflow,
        }),
        style,
      ]);
    }

    function getTransform(
      scale,
      translateX,
      translateY,
      rotate,
      flip,
      translateTimes = 1,
      translateUnit = '',
      rotateUnit = '',
    ) {
      let flipX = 1;
      let flipY = 1;

      if (flip) {
        if (flip == 'horizontal') {
          flipX = -1;
        } else if (flip == 'vertical') {
          flipY = -1;
        } else {
          flipX = flipY = -1;
        }
      }

      return joinCss(
        [
          `translate(${parseNumber(translateX) * translateTimes}${translateUnit},${parseNumber(translateY) * translateTimes}${translateUnit})`,
          `scale(${flipX * parseNumber(scale)},${flipY * parseNumber(scale)})`,
          rotate && `rotate(${rotate}${rotateUnit})`,
        ],
        ' ',
      );
    }

    /* node_modules/svelte-fa/src/fa.svelte generated by Svelte v3.55.1 */
    const file$2 = "node_modules/svelte-fa/src/fa.svelte";

    // (66:0) {#if i[4]}
    function create_if_block$2(ctx) {
    	let svg;
    	let g1;
    	let g0;
    	let g1_transform_value;
    	let g1_transform_origin_value;
    	let svg_id_value;
    	let svg_class_value;
    	let svg_viewBox_value;

    	function select_block_type(ctx, dirty) {
    		if (typeof /*i*/ ctx[10][4] == 'string') return create_if_block_1;
    		return create_else_block$1;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			g1 = svg_element("g");
    			g0 = svg_element("g");
    			if_block.c();
    			attr_dev(g0, "transform", /*transform*/ ctx[12]);
    			add_location(g0, file$2, 81, 6, 1397);
    			attr_dev(g1, "transform", g1_transform_value = "translate(" + /*i*/ ctx[10][0] / 2 + " " + /*i*/ ctx[10][1] / 2 + ")");
    			attr_dev(g1, "transform-origin", g1_transform_origin_value = "" + (/*i*/ ctx[10][0] / 4 + " 0"));
    			add_location(g1, file$2, 77, 4, 1293);
    			attr_dev(svg, "id", svg_id_value = /*id*/ ctx[1] || undefined);
    			attr_dev(svg, "class", svg_class_value = "svelte-fa " + /*clazz*/ ctx[0] + " svelte-1cj2gr0");
    			attr_dev(svg, "style", /*s*/ ctx[11]);
    			attr_dev(svg, "viewBox", svg_viewBox_value = "0 0 " + /*i*/ ctx[10][0] + " " + /*i*/ ctx[10][1]);
    			attr_dev(svg, "aria-hidden", "true");
    			attr_dev(svg, "role", "img");
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			toggle_class(svg, "pulse", /*pulse*/ ctx[4]);
    			toggle_class(svg, "spin", /*spin*/ ctx[3]);
    			add_location(svg, file$2, 66, 2, 1071);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, g1);
    			append_dev(g1, g0);
    			if_block.m(g0, null);
    		},
    		p: function update(ctx, dirty) {
    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(g0, null);
    				}
    			}

    			if (dirty & /*transform*/ 4096) {
    				attr_dev(g0, "transform", /*transform*/ ctx[12]);
    			}

    			if (dirty & /*i*/ 1024 && g1_transform_value !== (g1_transform_value = "translate(" + /*i*/ ctx[10][0] / 2 + " " + /*i*/ ctx[10][1] / 2 + ")")) {
    				attr_dev(g1, "transform", g1_transform_value);
    			}

    			if (dirty & /*i*/ 1024 && g1_transform_origin_value !== (g1_transform_origin_value = "" + (/*i*/ ctx[10][0] / 4 + " 0"))) {
    				attr_dev(g1, "transform-origin", g1_transform_origin_value);
    			}

    			if (dirty & /*id*/ 2 && svg_id_value !== (svg_id_value = /*id*/ ctx[1] || undefined)) {
    				attr_dev(svg, "id", svg_id_value);
    			}

    			if (dirty & /*clazz*/ 1 && svg_class_value !== (svg_class_value = "svelte-fa " + /*clazz*/ ctx[0] + " svelte-1cj2gr0")) {
    				attr_dev(svg, "class", svg_class_value);
    			}

    			if (dirty & /*s*/ 2048) {
    				attr_dev(svg, "style", /*s*/ ctx[11]);
    			}

    			if (dirty & /*i*/ 1024 && svg_viewBox_value !== (svg_viewBox_value = "0 0 " + /*i*/ ctx[10][0] + " " + /*i*/ ctx[10][1])) {
    				attr_dev(svg, "viewBox", svg_viewBox_value);
    			}

    			if (dirty & /*clazz, pulse*/ 17) {
    				toggle_class(svg, "pulse", /*pulse*/ ctx[4]);
    			}

    			if (dirty & /*clazz, spin*/ 9) {
    				toggle_class(svg, "spin", /*spin*/ ctx[3]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    			if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(66:0) {#if i[4]}",
    		ctx
    	});

    	return block;
    }

    // (89:8) {:else}
    function create_else_block$1(ctx) {
    	let path0;
    	let path0_d_value;
    	let path0_fill_value;
    	let path0_fill_opacity_value;
    	let path0_transform_value;
    	let path1;
    	let path1_d_value;
    	let path1_fill_value;
    	let path1_fill_opacity_value;
    	let path1_transform_value;

    	const block = {
    		c: function create() {
    			path0 = svg_element("path");
    			path1 = svg_element("path");
    			attr_dev(path0, "d", path0_d_value = /*i*/ ctx[10][4][0]);
    			attr_dev(path0, "fill", path0_fill_value = /*secondaryColor*/ ctx[6] || /*color*/ ctx[2] || 'currentColor');

    			attr_dev(path0, "fill-opacity", path0_fill_opacity_value = /*swapOpacity*/ ctx[9] != false
    			? /*primaryOpacity*/ ctx[7]
    			: /*secondaryOpacity*/ ctx[8]);

    			attr_dev(path0, "transform", path0_transform_value = "translate(" + /*i*/ ctx[10][0] / -2 + " " + /*i*/ ctx[10][1] / -2 + ")");
    			add_location(path0, file$2, 90, 10, 1678);
    			attr_dev(path1, "d", path1_d_value = /*i*/ ctx[10][4][1]);
    			attr_dev(path1, "fill", path1_fill_value = /*primaryColor*/ ctx[5] || /*color*/ ctx[2] || 'currentColor');

    			attr_dev(path1, "fill-opacity", path1_fill_opacity_value = /*swapOpacity*/ ctx[9] != false
    			? /*secondaryOpacity*/ ctx[8]
    			: /*primaryOpacity*/ ctx[7]);

    			attr_dev(path1, "transform", path1_transform_value = "translate(" + /*i*/ ctx[10][0] / -2 + " " + /*i*/ ctx[10][1] / -2 + ")");
    			add_location(path1, file$2, 96, 10, 1935);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, path0, anchor);
    			insert_dev(target, path1, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*i*/ 1024 && path0_d_value !== (path0_d_value = /*i*/ ctx[10][4][0])) {
    				attr_dev(path0, "d", path0_d_value);
    			}

    			if (dirty & /*secondaryColor, color*/ 68 && path0_fill_value !== (path0_fill_value = /*secondaryColor*/ ctx[6] || /*color*/ ctx[2] || 'currentColor')) {
    				attr_dev(path0, "fill", path0_fill_value);
    			}

    			if (dirty & /*swapOpacity, primaryOpacity, secondaryOpacity*/ 896 && path0_fill_opacity_value !== (path0_fill_opacity_value = /*swapOpacity*/ ctx[9] != false
    			? /*primaryOpacity*/ ctx[7]
    			: /*secondaryOpacity*/ ctx[8])) {
    				attr_dev(path0, "fill-opacity", path0_fill_opacity_value);
    			}

    			if (dirty & /*i*/ 1024 && path0_transform_value !== (path0_transform_value = "translate(" + /*i*/ ctx[10][0] / -2 + " " + /*i*/ ctx[10][1] / -2 + ")")) {
    				attr_dev(path0, "transform", path0_transform_value);
    			}

    			if (dirty & /*i*/ 1024 && path1_d_value !== (path1_d_value = /*i*/ ctx[10][4][1])) {
    				attr_dev(path1, "d", path1_d_value);
    			}

    			if (dirty & /*primaryColor, color*/ 36 && path1_fill_value !== (path1_fill_value = /*primaryColor*/ ctx[5] || /*color*/ ctx[2] || 'currentColor')) {
    				attr_dev(path1, "fill", path1_fill_value);
    			}

    			if (dirty & /*swapOpacity, secondaryOpacity, primaryOpacity*/ 896 && path1_fill_opacity_value !== (path1_fill_opacity_value = /*swapOpacity*/ ctx[9] != false
    			? /*secondaryOpacity*/ ctx[8]
    			: /*primaryOpacity*/ ctx[7])) {
    				attr_dev(path1, "fill-opacity", path1_fill_opacity_value);
    			}

    			if (dirty & /*i*/ 1024 && path1_transform_value !== (path1_transform_value = "translate(" + /*i*/ ctx[10][0] / -2 + " " + /*i*/ ctx[10][1] / -2 + ")")) {
    				attr_dev(path1, "transform", path1_transform_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(path0);
    			if (detaching) detach_dev(path1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$1.name,
    		type: "else",
    		source: "(89:8) {:else}",
    		ctx
    	});

    	return block;
    }

    // (83:8) {#if typeof i[4] == 'string'}
    function create_if_block_1(ctx) {
    	let path;
    	let path_d_value;
    	let path_fill_value;
    	let path_transform_value;

    	const block = {
    		c: function create() {
    			path = svg_element("path");
    			attr_dev(path, "d", path_d_value = /*i*/ ctx[10][4]);
    			attr_dev(path, "fill", path_fill_value = /*color*/ ctx[2] || /*primaryColor*/ ctx[5] || 'currentColor');
    			attr_dev(path, "transform", path_transform_value = "translate(" + /*i*/ ctx[10][0] / -2 + " " + /*i*/ ctx[10][1] / -2 + ")");
    			add_location(path, file$2, 83, 10, 1461);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, path, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*i*/ 1024 && path_d_value !== (path_d_value = /*i*/ ctx[10][4])) {
    				attr_dev(path, "d", path_d_value);
    			}

    			if (dirty & /*color, primaryColor*/ 36 && path_fill_value !== (path_fill_value = /*color*/ ctx[2] || /*primaryColor*/ ctx[5] || 'currentColor')) {
    				attr_dev(path, "fill", path_fill_value);
    			}

    			if (dirty & /*i*/ 1024 && path_transform_value !== (path_transform_value = "translate(" + /*i*/ ctx[10][0] / -2 + " " + /*i*/ ctx[10][1] / -2 + ")")) {
    				attr_dev(path, "transform", path_transform_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(path);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(83:8) {#if typeof i[4] == 'string'}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let if_block_anchor;
    	let if_block = /*i*/ ctx[10][4] && create_if_block$2(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*i*/ ctx[10][4]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$2(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Fa', slots, []);
    	let { class: clazz = '' } = $$props;
    	let { id = '' } = $$props;
    	let { style = '' } = $$props;
    	let { icon } = $$props;
    	let { size = '' } = $$props;
    	let { color = '' } = $$props;
    	let { fw = false } = $$props;
    	let { pull = '' } = $$props;
    	let { scale = 1 } = $$props;
    	let { translateX = 0 } = $$props;
    	let { translateY = 0 } = $$props;
    	let { rotate = '' } = $$props;
    	let { flip = false } = $$props;
    	let { spin = false } = $$props;
    	let { pulse = false } = $$props;
    	let { primaryColor = '' } = $$props;
    	let { secondaryColor = '' } = $$props;
    	let { primaryOpacity = 1 } = $$props;
    	let { secondaryOpacity = 0.4 } = $$props;
    	let { swapOpacity = false } = $$props;
    	let i;
    	let s;
    	let transform;

    	$$self.$$.on_mount.push(function () {
    		if (icon === undefined && !('icon' in $$props || $$self.$$.bound[$$self.$$.props['icon']])) {
    			console.warn("<Fa> was created without expected prop 'icon'");
    		}
    	});

    	const writable_props = [
    		'class',
    		'id',
    		'style',
    		'icon',
    		'size',
    		'color',
    		'fw',
    		'pull',
    		'scale',
    		'translateX',
    		'translateY',
    		'rotate',
    		'flip',
    		'spin',
    		'pulse',
    		'primaryColor',
    		'secondaryColor',
    		'primaryOpacity',
    		'secondaryOpacity',
    		'swapOpacity'
    	];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Fa> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('class' in $$props) $$invalidate(0, clazz = $$props.class);
    		if ('id' in $$props) $$invalidate(1, id = $$props.id);
    		if ('style' in $$props) $$invalidate(13, style = $$props.style);
    		if ('icon' in $$props) $$invalidate(14, icon = $$props.icon);
    		if ('size' in $$props) $$invalidate(15, size = $$props.size);
    		if ('color' in $$props) $$invalidate(2, color = $$props.color);
    		if ('fw' in $$props) $$invalidate(16, fw = $$props.fw);
    		if ('pull' in $$props) $$invalidate(17, pull = $$props.pull);
    		if ('scale' in $$props) $$invalidate(18, scale = $$props.scale);
    		if ('translateX' in $$props) $$invalidate(19, translateX = $$props.translateX);
    		if ('translateY' in $$props) $$invalidate(20, translateY = $$props.translateY);
    		if ('rotate' in $$props) $$invalidate(21, rotate = $$props.rotate);
    		if ('flip' in $$props) $$invalidate(22, flip = $$props.flip);
    		if ('spin' in $$props) $$invalidate(3, spin = $$props.spin);
    		if ('pulse' in $$props) $$invalidate(4, pulse = $$props.pulse);
    		if ('primaryColor' in $$props) $$invalidate(5, primaryColor = $$props.primaryColor);
    		if ('secondaryColor' in $$props) $$invalidate(6, secondaryColor = $$props.secondaryColor);
    		if ('primaryOpacity' in $$props) $$invalidate(7, primaryOpacity = $$props.primaryOpacity);
    		if ('secondaryOpacity' in $$props) $$invalidate(8, secondaryOpacity = $$props.secondaryOpacity);
    		if ('swapOpacity' in $$props) $$invalidate(9, swapOpacity = $$props.swapOpacity);
    	};

    	$$self.$capture_state = () => ({
    		getStyles,
    		getTransform,
    		clazz,
    		id,
    		style,
    		icon,
    		size,
    		color,
    		fw,
    		pull,
    		scale,
    		translateX,
    		translateY,
    		rotate,
    		flip,
    		spin,
    		pulse,
    		primaryColor,
    		secondaryColor,
    		primaryOpacity,
    		secondaryOpacity,
    		swapOpacity,
    		i,
    		s,
    		transform
    	});

    	$$self.$inject_state = $$props => {
    		if ('clazz' in $$props) $$invalidate(0, clazz = $$props.clazz);
    		if ('id' in $$props) $$invalidate(1, id = $$props.id);
    		if ('style' in $$props) $$invalidate(13, style = $$props.style);
    		if ('icon' in $$props) $$invalidate(14, icon = $$props.icon);
    		if ('size' in $$props) $$invalidate(15, size = $$props.size);
    		if ('color' in $$props) $$invalidate(2, color = $$props.color);
    		if ('fw' in $$props) $$invalidate(16, fw = $$props.fw);
    		if ('pull' in $$props) $$invalidate(17, pull = $$props.pull);
    		if ('scale' in $$props) $$invalidate(18, scale = $$props.scale);
    		if ('translateX' in $$props) $$invalidate(19, translateX = $$props.translateX);
    		if ('translateY' in $$props) $$invalidate(20, translateY = $$props.translateY);
    		if ('rotate' in $$props) $$invalidate(21, rotate = $$props.rotate);
    		if ('flip' in $$props) $$invalidate(22, flip = $$props.flip);
    		if ('spin' in $$props) $$invalidate(3, spin = $$props.spin);
    		if ('pulse' in $$props) $$invalidate(4, pulse = $$props.pulse);
    		if ('primaryColor' in $$props) $$invalidate(5, primaryColor = $$props.primaryColor);
    		if ('secondaryColor' in $$props) $$invalidate(6, secondaryColor = $$props.secondaryColor);
    		if ('primaryOpacity' in $$props) $$invalidate(7, primaryOpacity = $$props.primaryOpacity);
    		if ('secondaryOpacity' in $$props) $$invalidate(8, secondaryOpacity = $$props.secondaryOpacity);
    		if ('swapOpacity' in $$props) $$invalidate(9, swapOpacity = $$props.swapOpacity);
    		if ('i' in $$props) $$invalidate(10, i = $$props.i);
    		if ('s' in $$props) $$invalidate(11, s = $$props.s);
    		if ('transform' in $$props) $$invalidate(12, transform = $$props.transform);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*icon*/ 16384) {
    			$$invalidate(10, i = icon && icon.icon || [0, 0, '', [], '']);
    		}

    		if ($$self.$$.dirty & /*style, size, pull, fw*/ 237568) {
    			$$invalidate(11, s = getStyles(style, size, pull, fw));
    		}

    		if ($$self.$$.dirty & /*scale, translateX, translateY, rotate, flip*/ 8126464) {
    			$$invalidate(12, transform = getTransform(scale, translateX, translateY, rotate, flip, 512));
    		}
    	};

    	return [
    		clazz,
    		id,
    		color,
    		spin,
    		pulse,
    		primaryColor,
    		secondaryColor,
    		primaryOpacity,
    		secondaryOpacity,
    		swapOpacity,
    		i,
    		s,
    		transform,
    		style,
    		icon,
    		size,
    		fw,
    		pull,
    		scale,
    		translateX,
    		translateY,
    		rotate,
    		flip
    	];
    }

    class Fa extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {
    			class: 0,
    			id: 1,
    			style: 13,
    			icon: 14,
    			size: 15,
    			color: 2,
    			fw: 16,
    			pull: 17,
    			scale: 18,
    			translateX: 19,
    			translateY: 20,
    			rotate: 21,
    			flip: 22,
    			spin: 3,
    			pulse: 4,
    			primaryColor: 5,
    			secondaryColor: 6,
    			primaryOpacity: 7,
    			secondaryOpacity: 8,
    			swapOpacity: 9
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Fa",
    			options,
    			id: create_fragment$2.name
    		});
    	}

    	get class() {
    		throw new Error("<Fa>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set class(value) {
    		throw new Error("<Fa>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get id() {
    		throw new Error("<Fa>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set id(value) {
    		throw new Error("<Fa>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get style() {
    		throw new Error("<Fa>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set style(value) {
    		throw new Error("<Fa>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get icon() {
    		throw new Error("<Fa>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set icon(value) {
    		throw new Error("<Fa>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get size() {
    		throw new Error("<Fa>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set size(value) {
    		throw new Error("<Fa>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get color() {
    		throw new Error("<Fa>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set color(value) {
    		throw new Error("<Fa>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get fw() {
    		throw new Error("<Fa>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set fw(value) {
    		throw new Error("<Fa>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get pull() {
    		throw new Error("<Fa>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set pull(value) {
    		throw new Error("<Fa>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get scale() {
    		throw new Error("<Fa>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set scale(value) {
    		throw new Error("<Fa>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get translateX() {
    		throw new Error("<Fa>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set translateX(value) {
    		throw new Error("<Fa>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get translateY() {
    		throw new Error("<Fa>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set translateY(value) {
    		throw new Error("<Fa>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get rotate() {
    		throw new Error("<Fa>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set rotate(value) {
    		throw new Error("<Fa>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get flip() {
    		throw new Error("<Fa>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set flip(value) {
    		throw new Error("<Fa>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get spin() {
    		throw new Error("<Fa>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set spin(value) {
    		throw new Error("<Fa>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get pulse() {
    		throw new Error("<Fa>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set pulse(value) {
    		throw new Error("<Fa>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get primaryColor() {
    		throw new Error("<Fa>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set primaryColor(value) {
    		throw new Error("<Fa>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get secondaryColor() {
    		throw new Error("<Fa>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set secondaryColor(value) {
    		throw new Error("<Fa>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get primaryOpacity() {
    		throw new Error("<Fa>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set primaryOpacity(value) {
    		throw new Error("<Fa>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get secondaryOpacity() {
    		throw new Error("<Fa>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set secondaryOpacity(value) {
    		throw new Error("<Fa>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get swapOpacity() {
    		throw new Error("<Fa>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set swapOpacity(value) {
    		throw new Error("<Fa>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    var faFileImport = {
      prefix: 'far',
      iconName: 'file-import',
      icon: [512, 512, ["arrow-right-to-file"], "f56f", "M448 464H192c-8.8 0-16-7.2-16-16V368H128v80c0 35.3 28.7 64 64 64H448c35.3 0 64-28.7 64-64V154.5c0-17-6.7-33.3-18.7-45.3L402.7 18.7C390.7 6.7 374.5 0 357.5 0H192c-35.3 0-64 28.7-64 64V256h48V64c0-8.8 7.2-16 16-16H352v80c0 17.7 14.3 32 32 32h80V448c0 8.8-7.2 16-16 16zM297 215c-9.4-9.4-24.6-9.4-33.9 0s-9.4 24.6 0 33.9l39 39H24c-13.3 0-24 10.7-24 24s10.7 24 24 24H302.1l-39 39c-9.4 9.4-9.4 24.6 0 33.9s24.6 9.4 33.9 0l80-80c9.4-9.4 9.4-24.6 0-33.9l-80-80z"]
    };
    var faCopy = {
      prefix: 'far',
      iconName: 'copy',
      icon: [512, 512, [], "f0c5", "M448 384H256c-35.3 0-64-28.7-64-64V64c0-35.3 28.7-64 64-64H396.1c12.7 0 24.9 5.1 33.9 14.1l67.9 67.9c9 9 14.1 21.2 14.1 33.9V320c0 35.3-28.7 64-64 64zM64 128h96v48H64c-8.8 0-16 7.2-16 16V448c0 8.8 7.2 16 16 16H256c8.8 0 16-7.2 16-16V416h48v32c0 35.3-28.7 64-64 64H64c-35.3 0-64-28.7-64-64V192c0-35.3 28.7-64 64-64z"]
    };

    // canvas-confetti v1.6.0 built on 2022-10-24T21:26:41.619Z
    var module = {};

    // source content
    (function main(global, module, isWorker, workerSize) {
      var canUseWorker = !!(
        global.Worker &&
        global.Blob &&
        global.Promise &&
        global.OffscreenCanvas &&
        global.OffscreenCanvasRenderingContext2D &&
        global.HTMLCanvasElement &&
        global.HTMLCanvasElement.prototype.transferControlToOffscreen &&
        global.URL &&
        global.URL.createObjectURL);

      function noop() {}

      // create a promise if it exists, otherwise, just
      // call the function directly
      function promise(func) {
        var ModulePromise = module.exports.Promise;
        var Prom = ModulePromise !== void 0 ? ModulePromise : global.Promise;

        if (typeof Prom === 'function') {
          return new Prom(func);
        }

        func(noop, noop);

        return null;
      }

      var raf = (function () {
        var TIME = Math.floor(1000 / 60);
        var frame, cancel;
        var frames = {};
        var lastFrameTime = 0;

        if (typeof requestAnimationFrame === 'function' && typeof cancelAnimationFrame === 'function') {
          frame = function (cb) {
            var id = Math.random();

            frames[id] = requestAnimationFrame(function onFrame(time) {
              if (lastFrameTime === time || lastFrameTime + TIME - 1 < time) {
                lastFrameTime = time;
                delete frames[id];

                cb();
              } else {
                frames[id] = requestAnimationFrame(onFrame);
              }
            });

            return id;
          };
          cancel = function (id) {
            if (frames[id]) {
              cancelAnimationFrame(frames[id]);
            }
          };
        } else {
          frame = function (cb) {
            return setTimeout(cb, TIME);
          };
          cancel = function (timer) {
            return clearTimeout(timer);
          };
        }

        return { frame: frame, cancel: cancel };
      }());

      var getWorker = (function () {
        var worker;
        var prom;
        var resolves = {};

        function decorate(worker) {
          function execute(options, callback) {
            worker.postMessage({ options: options || {}, callback: callback });
          }
          worker.init = function initWorker(canvas) {
            var offscreen = canvas.transferControlToOffscreen();
            worker.postMessage({ canvas: offscreen }, [offscreen]);
          };

          worker.fire = function fireWorker(options, size, done) {
            if (prom) {
              execute(options, null);
              return prom;
            }

            var id = Math.random().toString(36).slice(2);

            prom = promise(function (resolve) {
              function workerDone(msg) {
                if (msg.data.callback !== id) {
                  return;
                }

                delete resolves[id];
                worker.removeEventListener('message', workerDone);

                prom = null;
                done();
                resolve();
              }

              worker.addEventListener('message', workerDone);
              execute(options, id);

              resolves[id] = workerDone.bind(null, { data: { callback: id }});
            });

            return prom;
          };

          worker.reset = function resetWorker() {
            worker.postMessage({ reset: true });

            for (var id in resolves) {
              resolves[id]();
              delete resolves[id];
            }
          };
        }

        return function () {
          if (worker) {
            return worker;
          }

          if (!isWorker && canUseWorker) {
            var code = [
              'var CONFETTI, SIZE = {}, module = {};',
              '(' + main.toString() + ')(this, module, true, SIZE);',
              'onmessage = function(msg) {',
              '  if (msg.data.options) {',
              '    CONFETTI(msg.data.options).then(function () {',
              '      if (msg.data.callback) {',
              '        postMessage({ callback: msg.data.callback });',
              '      }',
              '    });',
              '  } else if (msg.data.reset) {',
              '    CONFETTI && CONFETTI.reset();',
              '  } else if (msg.data.resize) {',
              '    SIZE.width = msg.data.resize.width;',
              '    SIZE.height = msg.data.resize.height;',
              '  } else if (msg.data.canvas) {',
              '    SIZE.width = msg.data.canvas.width;',
              '    SIZE.height = msg.data.canvas.height;',
              '    CONFETTI = module.exports.create(msg.data.canvas);',
              '  }',
              '}',
            ].join('\n');
            try {
              worker = new Worker(URL.createObjectURL(new Blob([code])));
            } catch (e) {
              // eslint-disable-next-line no-console
              typeof console !== undefined && typeof console.warn === 'function' ? console.warn('🎊 Could not load worker', e) : null;

              return null;
            }

            decorate(worker);
          }

          return worker;
        };
      })();

      var defaults = {
        particleCount: 50,
        angle: 90,
        spread: 45,
        startVelocity: 45,
        decay: 0.9,
        gravity: 1,
        drift: 0,
        ticks: 200,
        x: 0.5,
        y: 0.5,
        shapes: ['square', 'circle'],
        zIndex: 100,
        colors: [
          '#26ccff',
          '#a25afd',
          '#ff5e7e',
          '#88ff5a',
          '#fcff42',
          '#ffa62d',
          '#ff36ff'
        ],
        // probably should be true, but back-compat
        disableForReducedMotion: false,
        scalar: 1
      };

      function convert(val, transform) {
        return transform ? transform(val) : val;
      }

      function isOk(val) {
        return !(val === null || val === undefined);
      }

      function prop(options, name, transform) {
        return convert(
          options && isOk(options[name]) ? options[name] : defaults[name],
          transform
        );
      }

      function onlyPositiveInt(number){
        return number < 0 ? 0 : Math.floor(number);
      }

      function randomInt(min, max) {
        // [min, max)
        return Math.floor(Math.random() * (max - min)) + min;
      }

      function toDecimal(str) {
        return parseInt(str, 16);
      }

      function colorsToRgb(colors) {
        return colors.map(hexToRgb);
      }

      function hexToRgb(str) {
        var val = String(str).replace(/[^0-9a-f]/gi, '');

        if (val.length < 6) {
            val = val[0]+val[0]+val[1]+val[1]+val[2]+val[2];
        }

        return {
          r: toDecimal(val.substring(0,2)),
          g: toDecimal(val.substring(2,4)),
          b: toDecimal(val.substring(4,6))
        };
      }

      function getOrigin(options) {
        var origin = prop(options, 'origin', Object);
        origin.x = prop(origin, 'x', Number);
        origin.y = prop(origin, 'y', Number);

        return origin;
      }

      function setCanvasWindowSize(canvas) {
        canvas.width = document.documentElement.clientWidth;
        canvas.height = document.documentElement.clientHeight;
      }

      function setCanvasRectSize(canvas) {
        var rect = canvas.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
      }

      function getCanvas(zIndex) {
        var canvas = document.createElement('canvas');

        canvas.style.position = 'fixed';
        canvas.style.top = '0px';
        canvas.style.left = '0px';
        canvas.style.pointerEvents = 'none';
        canvas.style.zIndex = zIndex;

        return canvas;
      }

      function ellipse(context, x, y, radiusX, radiusY, rotation, startAngle, endAngle, antiClockwise) {
        context.save();
        context.translate(x, y);
        context.rotate(rotation);
        context.scale(radiusX, radiusY);
        context.arc(0, 0, 1, startAngle, endAngle, antiClockwise);
        context.restore();
      }

      function randomPhysics(opts) {
        var radAngle = opts.angle * (Math.PI / 180);
        var radSpread = opts.spread * (Math.PI / 180);

        return {
          x: opts.x,
          y: opts.y,
          wobble: Math.random() * 10,
          wobbleSpeed: Math.min(0.11, Math.random() * 0.1 + 0.05),
          velocity: (opts.startVelocity * 0.5) + (Math.random() * opts.startVelocity),
          angle2D: -radAngle + ((0.5 * radSpread) - (Math.random() * radSpread)),
          tiltAngle: (Math.random() * (0.75 - 0.25) + 0.25) * Math.PI,
          color: opts.color,
          shape: opts.shape,
          tick: 0,
          totalTicks: opts.ticks,
          decay: opts.decay,
          drift: opts.drift,
          random: Math.random() + 2,
          tiltSin: 0,
          tiltCos: 0,
          wobbleX: 0,
          wobbleY: 0,
          gravity: opts.gravity * 3,
          ovalScalar: 0.6,
          scalar: opts.scalar
        };
      }

      function updateFetti(context, fetti) {
        fetti.x += Math.cos(fetti.angle2D) * fetti.velocity + fetti.drift;
        fetti.y += Math.sin(fetti.angle2D) * fetti.velocity + fetti.gravity;
        fetti.wobble += fetti.wobbleSpeed;
        fetti.velocity *= fetti.decay;
        fetti.tiltAngle += 0.1;
        fetti.tiltSin = Math.sin(fetti.tiltAngle);
        fetti.tiltCos = Math.cos(fetti.tiltAngle);
        fetti.random = Math.random() + 2;
        fetti.wobbleX = fetti.x + ((10 * fetti.scalar) * Math.cos(fetti.wobble));
        fetti.wobbleY = fetti.y + ((10 * fetti.scalar) * Math.sin(fetti.wobble));

        var progress = (fetti.tick++) / fetti.totalTicks;

        var x1 = fetti.x + (fetti.random * fetti.tiltCos);
        var y1 = fetti.y + (fetti.random * fetti.tiltSin);
        var x2 = fetti.wobbleX + (fetti.random * fetti.tiltCos);
        var y2 = fetti.wobbleY + (fetti.random * fetti.tiltSin);

        context.fillStyle = 'rgba(' + fetti.color.r + ', ' + fetti.color.g + ', ' + fetti.color.b + ', ' + (1 - progress) + ')';
        context.beginPath();

        if (fetti.shape === 'circle') {
          context.ellipse ?
            context.ellipse(fetti.x, fetti.y, Math.abs(x2 - x1) * fetti.ovalScalar, Math.abs(y2 - y1) * fetti.ovalScalar, Math.PI / 10 * fetti.wobble, 0, 2 * Math.PI) :
            ellipse(context, fetti.x, fetti.y, Math.abs(x2 - x1) * fetti.ovalScalar, Math.abs(y2 - y1) * fetti.ovalScalar, Math.PI / 10 * fetti.wobble, 0, 2 * Math.PI);
        } else if (fetti.shape === 'star') {
          var rot = Math.PI / 2 * 3;
          var innerRadius = 4 * fetti.scalar;
          var outerRadius = 8 * fetti.scalar;
          var x = fetti.x;
          var y = fetti.y;
          var spikes = 5;
          var step = Math.PI / spikes;

          while (spikes--) {
            x = fetti.x + Math.cos(rot) * outerRadius;
            y = fetti.y + Math.sin(rot) * outerRadius;
            context.lineTo(x, y);
            rot += step;

            x = fetti.x + Math.cos(rot) * innerRadius;
            y = fetti.y + Math.sin(rot) * innerRadius;
            context.lineTo(x, y);
            rot += step;
          }
        } else {
          context.moveTo(Math.floor(fetti.x), Math.floor(fetti.y));
          context.lineTo(Math.floor(fetti.wobbleX), Math.floor(y1));
          context.lineTo(Math.floor(x2), Math.floor(y2));
          context.lineTo(Math.floor(x1), Math.floor(fetti.wobbleY));
        }

        context.closePath();
        context.fill();

        return fetti.tick < fetti.totalTicks;
      }

      function animate(canvas, fettis, resizer, size, done) {
        var animatingFettis = fettis.slice();
        var context = canvas.getContext('2d');
        var animationFrame;
        var destroy;

        var prom = promise(function (resolve) {
          function onDone() {
            animationFrame = destroy = null;

            context.clearRect(0, 0, size.width, size.height);

            done();
            resolve();
          }

          function update() {
            if (isWorker && !(size.width === workerSize.width && size.height === workerSize.height)) {
              size.width = canvas.width = workerSize.width;
              size.height = canvas.height = workerSize.height;
            }

            if (!size.width && !size.height) {
              resizer(canvas);
              size.width = canvas.width;
              size.height = canvas.height;
            }

            context.clearRect(0, 0, size.width, size.height);

            animatingFettis = animatingFettis.filter(function (fetti) {
              return updateFetti(context, fetti);
            });

            if (animatingFettis.length) {
              animationFrame = raf.frame(update);
            } else {
              onDone();
            }
          }

          animationFrame = raf.frame(update);
          destroy = onDone;
        });

        return {
          addFettis: function (fettis) {
            animatingFettis = animatingFettis.concat(fettis);

            return prom;
          },
          canvas: canvas,
          promise: prom,
          reset: function () {
            if (animationFrame) {
              raf.cancel(animationFrame);
            }

            if (destroy) {
              destroy();
            }
          }
        };
      }

      function confettiCannon(canvas, globalOpts) {
        var isLibCanvas = !canvas;
        var allowResize = !!prop(globalOpts || {}, 'resize');
        var globalDisableForReducedMotion = prop(globalOpts, 'disableForReducedMotion', Boolean);
        var shouldUseWorker = canUseWorker && !!prop(globalOpts || {}, 'useWorker');
        var worker = shouldUseWorker ? getWorker() : null;
        var resizer = isLibCanvas ? setCanvasWindowSize : setCanvasRectSize;
        var initialized = (canvas && worker) ? !!canvas.__confetti_initialized : false;
        var preferLessMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion)').matches;
        var animationObj;

        function fireLocal(options, size, done) {
          var particleCount = prop(options, 'particleCount', onlyPositiveInt);
          var angle = prop(options, 'angle', Number);
          var spread = prop(options, 'spread', Number);
          var startVelocity = prop(options, 'startVelocity', Number);
          var decay = prop(options, 'decay', Number);
          var gravity = prop(options, 'gravity', Number);
          var drift = prop(options, 'drift', Number);
          var colors = prop(options, 'colors', colorsToRgb);
          var ticks = prop(options, 'ticks', Number);
          var shapes = prop(options, 'shapes');
          var scalar = prop(options, 'scalar');
          var origin = getOrigin(options);

          var temp = particleCount;
          var fettis = [];

          var startX = canvas.width * origin.x;
          var startY = canvas.height * origin.y;

          while (temp--) {
            fettis.push(
              randomPhysics({
                x: startX,
                y: startY,
                angle: angle,
                spread: spread,
                startVelocity: startVelocity,
                color: colors[temp % colors.length],
                shape: shapes[randomInt(0, shapes.length)],
                ticks: ticks,
                decay: decay,
                gravity: gravity,
                drift: drift,
                scalar: scalar
              })
            );
          }

          // if we have a previous canvas already animating,
          // add to it
          if (animationObj) {
            return animationObj.addFettis(fettis);
          }

          animationObj = animate(canvas, fettis, resizer, size , done);

          return animationObj.promise;
        }

        function fire(options) {
          var disableForReducedMotion = globalDisableForReducedMotion || prop(options, 'disableForReducedMotion', Boolean);
          var zIndex = prop(options, 'zIndex', Number);

          if (disableForReducedMotion && preferLessMotion) {
            return promise(function (resolve) {
              resolve();
            });
          }

          if (isLibCanvas && animationObj) {
            // use existing canvas from in-progress animation
            canvas = animationObj.canvas;
          } else if (isLibCanvas && !canvas) {
            // create and initialize a new canvas
            canvas = getCanvas(zIndex);
            document.body.appendChild(canvas);
          }

          if (allowResize && !initialized) {
            // initialize the size of a user-supplied canvas
            resizer(canvas);
          }

          var size = {
            width: canvas.width,
            height: canvas.height
          };

          if (worker && !initialized) {
            worker.init(canvas);
          }

          initialized = true;

          if (worker) {
            canvas.__confetti_initialized = true;
          }

          function onResize() {
            if (worker) {
              // TODO this really shouldn't be immediate, because it is expensive
              var obj = {
                getBoundingClientRect: function () {
                  if (!isLibCanvas) {
                    return canvas.getBoundingClientRect();
                  }
                }
              };

              resizer(obj);

              worker.postMessage({
                resize: {
                  width: obj.width,
                  height: obj.height
                }
              });
              return;
            }

            // don't actually query the size here, since this
            // can execute frequently and rapidly
            size.width = size.height = null;
          }

          function done() {
            animationObj = null;

            if (allowResize) {
              global.removeEventListener('resize', onResize);
            }

            if (isLibCanvas && canvas) {
              document.body.removeChild(canvas);
              canvas = null;
              initialized = false;
            }
          }

          if (allowResize) {
            global.addEventListener('resize', onResize, false);
          }

          if (worker) {
            return worker.fire(options, size, done);
          }

          return fireLocal(options, size, done);
        }

        fire.reset = function () {
          if (worker) {
            worker.reset();
          }

          if (animationObj) {
            animationObj.reset();
          }
        };

        return fire;
      }

      // Make default export lazy to defer worker creation until called.
      var defaultFire;
      function getDefaultFire() {
        if (!defaultFire) {
          defaultFire = confettiCannon(null, { useWorker: true, resize: true });
        }
        return defaultFire;
      }

      module.exports = function() {
        return getDefaultFire().apply(this, arguments);
      };
      module.exports.reset = function() {
        getDefaultFire().reset();
      };
      module.exports.create = confettiCannon;
    }((function () {
      if (typeof window !== 'undefined') {
        return window;
      }

      if (typeof self !== 'undefined') {
        return self;
      }

      return this || {};
    })(), module, false));

    // end source content

    var confetti = module.exports;
    module.exports.create;

    Prism.languages.python = {
    	'comment': {
    		pattern: /(^|[^\\])#.*/,
    		lookbehind: true,
    		greedy: true
    	},
    	'string-interpolation': {
    		pattern: /(?:f|fr|rf)(?:("""|''')[\s\S]*?\1|("|')(?:\\.|(?!\2)[^\\\r\n])*\2)/i,
    		greedy: true,
    		inside: {
    			'interpolation': {
    				// "{" <expression> <optional "!s", "!r", or "!a"> <optional ":" format specifier> "}"
    				pattern: /((?:^|[^{])(?:\{\{)*)\{(?!\{)(?:[^{}]|\{(?!\{)(?:[^{}]|\{(?!\{)(?:[^{}])+\})+\})+\}/,
    				lookbehind: true,
    				inside: {
    					'format-spec': {
    						pattern: /(:)[^:(){}]+(?=\}$)/,
    						lookbehind: true
    					},
    					'conversion-option': {
    						pattern: /![sra](?=[:}]$)/,
    						alias: 'punctuation'
    					},
    					rest: null
    				}
    			},
    			'string': /[\s\S]+/
    		}
    	},
    	'triple-quoted-string': {
    		pattern: /(?:[rub]|br|rb)?("""|''')[\s\S]*?\1/i,
    		greedy: true,
    		alias: 'string'
    	},
    	'string': {
    		pattern: /(?:[rub]|br|rb)?("|')(?:\\.|(?!\1)[^\\\r\n])*\1/i,
    		greedy: true
    	},
    	'function': {
    		pattern: /((?:^|\s)def[ \t]+)[a-zA-Z_]\w*(?=\s*\()/g,
    		lookbehind: true
    	},
    	'class-name': {
    		pattern: /(\bclass\s+)\w+/i,
    		lookbehind: true
    	},
    	'decorator': {
    		pattern: /(^[\t ]*)@\w+(?:\.\w+)*/m,
    		lookbehind: true,
    		alias: ['annotation', 'punctuation'],
    		inside: {
    			'punctuation': /\./
    		}
    	},
    	'keyword': /\b(?:_(?=\s*:)|and|as|assert|async|await|break|case|class|continue|def|del|elif|else|except|exec|finally|for|from|global|if|import|in|is|lambda|match|nonlocal|not|or|pass|print|raise|return|try|while|with|yield)\b/,
    	'builtin': /\b(?:__import__|abs|all|any|apply|ascii|basestring|bin|bool|buffer|bytearray|bytes|callable|chr|classmethod|cmp|coerce|compile|complex|delattr|dict|dir|divmod|enumerate|eval|execfile|file|filter|float|format|frozenset|getattr|globals|hasattr|hash|help|hex|id|input|int|intern|isinstance|issubclass|iter|len|list|locals|long|map|max|memoryview|min|next|object|oct|open|ord|pow|property|range|raw_input|reduce|reload|repr|reversed|round|set|setattr|slice|sorted|staticmethod|str|sum|super|tuple|type|unichr|unicode|vars|xrange|zip)\b/,
    	'boolean': /\b(?:False|None|True)\b/,
    	'number': /\b0(?:b(?:_?[01])+|o(?:_?[0-7])+|x(?:_?[a-f0-9])+)\b|(?:\b\d+(?:_\d+)*(?:\.(?:\d+(?:_\d+)*)?)?|\B\.\d+(?:_\d+)*)(?:e[+-]?\d+(?:_\d+)*)?j?(?!\w)/i,
    	'operator': /[-+%=]=?|!=|:=|\*\*?=?|\/\/?=?|<[<=>]?|>[=>]?|[&|^~]/,
    	'punctuation': /[{}[\];(),.:]/
    };

    Prism.languages.python['string-interpolation'].inside['interpolation'].inside.rest = Prism.languages.python;

    Prism.languages.py = Prism.languages.python;

    Prism.languages.javascript = Prism.languages.extend('clike', {
    	'class-name': [
    		Prism.languages.clike['class-name'],
    		{
    			pattern: /(^|[^$\w\xA0-\uFFFF])(?!\s)[_$A-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\.(?:constructor|prototype))/,
    			lookbehind: true
    		}
    	],
    	'keyword': [
    		{
    			pattern: /((?:^|\})\s*)catch\b/,
    			lookbehind: true
    		},
    		{
    			pattern: /(^|[^.]|\.\.\.\s*)\b(?:as|assert(?=\s*\{)|async(?=\s*(?:function\b|\(|[$\w\xA0-\uFFFF]|$))|await|break|case|class|const|continue|debugger|default|delete|do|else|enum|export|extends|finally(?=\s*(?:\{|$))|for|from(?=\s*(?:['"]|$))|function|(?:get|set)(?=\s*(?:[#\[$\w\xA0-\uFFFF]|$))|if|implements|import|in|instanceof|interface|let|new|null|of|package|private|protected|public|return|static|super|switch|this|throw|try|typeof|undefined|var|void|while|with|yield)\b/,
    			lookbehind: true
    		},
    	],
    	// Allow for all non-ASCII characters (See http://stackoverflow.com/a/2008444)
    	'function': /#?(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*(?:\.\s*(?:apply|bind|call)\s*)?\()/,
    	'number': {
    		pattern: RegExp(
    			/(^|[^\w$])/.source +
    			'(?:' +
    			(
    				// constant
    				/NaN|Infinity/.source +
    				'|' +
    				// binary integer
    				/0[bB][01]+(?:_[01]+)*n?/.source +
    				'|' +
    				// octal integer
    				/0[oO][0-7]+(?:_[0-7]+)*n?/.source +
    				'|' +
    				// hexadecimal integer
    				/0[xX][\dA-Fa-f]+(?:_[\dA-Fa-f]+)*n?/.source +
    				'|' +
    				// decimal bigint
    				/\d+(?:_\d+)*n/.source +
    				'|' +
    				// decimal number (integer or float) but no bigint
    				/(?:\d+(?:_\d+)*(?:\.(?:\d+(?:_\d+)*)?)?|\.\d+(?:_\d+)*)(?:[Ee][+-]?\d+(?:_\d+)*)?/.source
    			) +
    			')' +
    			/(?![\w$])/.source
    		),
    		lookbehind: true
    	},
    	'operator': /--|\+\+|\*\*=?|=>|&&=?|\|\|=?|[!=]==|<<=?|>>>?=?|[-+*/%&|^!=<>]=?|\.{3}|\?\?=?|\?\.?|[~:]/
    });

    Prism.languages.javascript['class-name'][0].pattern = /(\b(?:class|extends|implements|instanceof|interface|new)\s+)[\w.\\]+/;

    Prism.languages.insertBefore('javascript', 'keyword', {
    	'regex': {
    		pattern: RegExp(
    			// lookbehind
    			// eslint-disable-next-line regexp/no-dupe-characters-character-class
    			/((?:^|[^$\w\xA0-\uFFFF."'\])\s]|\b(?:return|yield))\s*)/.source +
    			// Regex pattern:
    			// There are 2 regex patterns here. The RegExp set notation proposal added support for nested character
    			// classes if the `v` flag is present. Unfortunately, nested CCs are both context-free and incompatible
    			// with the only syntax, so we have to define 2 different regex patterns.
    			/\//.source +
    			'(?:' +
    			/(?:\[(?:[^\]\\\r\n]|\\.)*\]|\\.|[^/\\\[\r\n])+\/[dgimyus]{0,7}/.source +
    			'|' +
    			// `v` flag syntax. This supports 3 levels of nested character classes.
    			/(?:\[(?:[^[\]\\\r\n]|\\.|\[(?:[^[\]\\\r\n]|\\.|\[(?:[^[\]\\\r\n]|\\.)*\])*\])*\]|\\.|[^/\\\[\r\n])+\/[dgimyus]{0,7}v[dgimyus]{0,7}/.source +
    			')' +
    			// lookahead
    			/(?=(?:\s|\/\*(?:[^*]|\*(?!\/))*\*\/)*(?:$|[\r\n,.;:})\]]|\/\/))/.source
    		),
    		lookbehind: true,
    		greedy: true,
    		inside: {
    			'regex-source': {
    				pattern: /^(\/)[\s\S]+(?=\/[a-z]*$)/,
    				lookbehind: true,
    				alias: 'language-regex',
    				inside: Prism.languages.regex
    			},
    			'regex-delimiter': /^\/|\/$/,
    			'regex-flags': /^[a-z]+$/,
    		}
    	},
    	// This must be declared before keyword because we use "function" inside the look-forward
    	'function-variable': {
    		pattern: /#?(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*[=:]\s*(?:async\s*)?(?:\bfunction\b|(?:\((?:[^()]|\([^()]*\))*\)|(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*)\s*=>))/,
    		alias: 'function'
    	},
    	'parameter': [
    		{
    			pattern: /(function(?:\s+(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*)?\s*\(\s*)(?!\s)(?:[^()\s]|\s+(?![\s)])|\([^()]*\))+(?=\s*\))/,
    			lookbehind: true,
    			inside: Prism.languages.javascript
    		},
    		{
    			pattern: /(^|[^$\w\xA0-\uFFFF])(?!\s)[_$a-z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*=>)/i,
    			lookbehind: true,
    			inside: Prism.languages.javascript
    		},
    		{
    			pattern: /(\(\s*)(?!\s)(?:[^()\s]|\s+(?![\s)])|\([^()]*\))+(?=\s*\)\s*=>)/,
    			lookbehind: true,
    			inside: Prism.languages.javascript
    		},
    		{
    			pattern: /((?:\b|\s|^)(?!(?:as|async|await|break|case|catch|class|const|continue|debugger|default|delete|do|else|enum|export|extends|finally|for|from|function|get|if|implements|import|in|instanceof|interface|let|new|null|of|package|private|protected|public|return|set|static|super|switch|this|throw|try|typeof|undefined|var|void|while|with|yield)(?![$\w\xA0-\uFFFF]))(?:(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*\s*)\(\s*|\]\s*\(\s*)(?!\s)(?:[^()\s]|\s+(?![\s)])|\([^()]*\))+(?=\s*\)\s*\{)/,
    			lookbehind: true,
    			inside: Prism.languages.javascript
    		}
    	],
    	'constant': /\b[A-Z](?:[A-Z_]|\dx?)*\b/
    });

    Prism.languages.insertBefore('javascript', 'string', {
    	'hashbang': {
    		pattern: /^#!.*/,
    		greedy: true,
    		alias: 'comment'
    	},
    	'template-string': {
    		pattern: /`(?:\\[\s\S]|\$\{(?:[^{}]|\{(?:[^{}]|\{[^}]*\})*\})+\}|(?!\$\{)[^\\`])*`/,
    		greedy: true,
    		inside: {
    			'template-punctuation': {
    				pattern: /^`|`$/,
    				alias: 'string'
    			},
    			'interpolation': {
    				pattern: /((?:^|[^\\])(?:\\{2})*)\$\{(?:[^{}]|\{(?:[^{}]|\{[^}]*\})*\})+\}/,
    				lookbehind: true,
    				inside: {
    					'interpolation-punctuation': {
    						pattern: /^\$\{|\}$/,
    						alias: 'punctuation'
    					},
    					rest: Prism.languages.javascript
    				}
    			},
    			'string': /[\s\S]+/
    		}
    	},
    	'string-property': {
    		pattern: /((?:^|[,{])[ \t]*)(["'])(?:\\(?:\r\n|[\s\S])|(?!\2)[^\\\r\n])*\2(?=\s*:)/m,
    		lookbehind: true,
    		greedy: true,
    		alias: 'property'
    	}
    });

    Prism.languages.insertBefore('javascript', 'operator', {
    	'literal-property': {
    		pattern: /((?:^|[,{])[ \t]*)(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*:)/m,
    		lookbehind: true,
    		alias: 'property'
    	},
    });

    if (Prism.languages.markup) {
    	Prism.languages.markup.tag.addInlined('script', 'javascript');

    	// add attribute support for all DOM events.
    	// https://developer.mozilla.org/en-US/docs/Web/Events#Standard_events
    	Prism.languages.markup.tag.addAttribute(
    		/on(?:abort|blur|change|click|composition(?:end|start|update)|dblclick|error|focus(?:in|out)?|key(?:down|up)|load|mouse(?:down|enter|leave|move|out|over|up)|reset|resize|scroll|select|slotchange|submit|unload|wheel)/.source,
    		'javascript'
    	);
    }

    Prism.languages.js = Prism.languages.javascript;

    (function (Prism) {

    	Prism.languages.typescript = Prism.languages.extend('javascript', {
    		'class-name': {
    			pattern: /(\b(?:class|extends|implements|instanceof|interface|new|type)\s+)(?!keyof\b)(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?:\s*<(?:[^<>]|<(?:[^<>]|<[^<>]*>)*>)*>)?/,
    			lookbehind: true,
    			greedy: true,
    			inside: null // see below
    		},
    		'builtin': /\b(?:Array|Function|Promise|any|boolean|console|never|number|string|symbol|unknown)\b/,
    	});

    	// The keywords TypeScript adds to JavaScript
    	Prism.languages.typescript.keyword.push(
    		/\b(?:abstract|declare|is|keyof|readonly|require)\b/,
    		// keywords that have to be followed by an identifier
    		/\b(?:asserts|infer|interface|module|namespace|type)\b(?=\s*(?:[{_$a-zA-Z\xA0-\uFFFF]|$))/,
    		// This is for `import type *, {}`
    		/\btype\b(?=\s*(?:[\{*]|$))/
    	);

    	// doesn't work with TS because TS is too complex
    	delete Prism.languages.typescript['parameter'];
    	delete Prism.languages.typescript['literal-property'];

    	// a version of typescript specifically for highlighting types
    	var typeInside = Prism.languages.extend('typescript', {});
    	delete typeInside['class-name'];

    	Prism.languages.typescript['class-name'].inside = typeInside;

    	Prism.languages.insertBefore('typescript', 'function', {
    		'decorator': {
    			pattern: /@[$\w\xA0-\uFFFF]+/,
    			inside: {
    				'at': {
    					pattern: /^@/,
    					alias: 'operator'
    				},
    				'function': /^[\s\S]+/
    			}
    		},
    		'generic-function': {
    			// e.g. foo<T extends "bar" | "baz">( ...
    			pattern: /#?(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*\s*<(?:[^<>]|<(?:[^<>]|<[^<>]*>)*>)*>(?=\s*\()/,
    			greedy: true,
    			inside: {
    				'function': /^#?(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*/,
    				'generic': {
    					pattern: /<[\s\S]+/, // everything after the first <
    					alias: 'class-name',
    					inside: typeInside
    				}
    			}
    		}
    	});

    	Prism.languages.ts = Prism.languages.typescript;

    }(Prism));

    (function (Prism) {

    	var keywords = /\b(?:abstract|assert|boolean|break|byte|case|catch|char|class|const|continue|default|do|double|else|enum|exports|extends|final|finally|float|for|goto|if|implements|import|instanceof|int|interface|long|module|native|new|non-sealed|null|open|opens|package|permits|private|protected|provides|public|record(?!\s*[(){}[\]<>=%~.:,;?+\-*/&|^])|requires|return|sealed|short|static|strictfp|super|switch|synchronized|this|throw|throws|to|transient|transitive|try|uses|var|void|volatile|while|with|yield)\b/;

    	// full package (optional) + parent classes (optional)
    	var classNamePrefix = /(?:[a-z]\w*\s*\.\s*)*(?:[A-Z]\w*\s*\.\s*)*/.source;

    	// based on the java naming conventions
    	var className = {
    		pattern: RegExp(/(^|[^\w.])/.source + classNamePrefix + /[A-Z](?:[\d_A-Z]*[a-z]\w*)?\b/.source),
    		lookbehind: true,
    		inside: {
    			'namespace': {
    				pattern: /^[a-z]\w*(?:\s*\.\s*[a-z]\w*)*(?:\s*\.)?/,
    				inside: {
    					'punctuation': /\./
    				}
    			},
    			'punctuation': /\./
    		}
    	};

    	Prism.languages.java = Prism.languages.extend('clike', {
    		'string': {
    			pattern: /(^|[^\\])"(?:\\.|[^"\\\r\n])*"/,
    			lookbehind: true,
    			greedy: true
    		},
    		'class-name': [
    			className,
    			{
    				// variables, parameters, and constructor references
    				// this to support class names (or generic parameters) which do not contain a lower case letter (also works for methods)
    				pattern: RegExp(/(^|[^\w.])/.source + classNamePrefix + /[A-Z]\w*(?=\s+\w+\s*[;,=()]|\s*(?:\[[\s,]*\]\s*)?::\s*new\b)/.source),
    				lookbehind: true,
    				inside: className.inside
    			},
    			{
    				// class names based on keyword
    				// this to support class names (or generic parameters) which do not contain a lower case letter (also works for methods)
    				pattern: RegExp(/(\b(?:class|enum|extends|implements|instanceof|interface|new|record|throws)\s+)/.source + classNamePrefix + /[A-Z]\w*\b/.source),
    				lookbehind: true,
    				inside: className.inside
    			}
    		],
    		'keyword': keywords,
    		'function': [
    			Prism.languages.clike.function,
    			{
    				pattern: /(::\s*)[a-z_]\w*/,
    				lookbehind: true
    			}
    		],
    		'number': /\b0b[01][01_]*L?\b|\b0x(?:\.[\da-f_p+-]+|[\da-f_]+(?:\.[\da-f_p+-]+)?)\b|(?:\b\d[\d_]*(?:\.[\d_]*)?|\B\.\d[\d_]*)(?:e[+-]?\d[\d_]*)?[dfl]?/i,
    		'operator': {
    			pattern: /(^|[^.])(?:<<=?|>>>?=?|->|--|\+\+|&&|\|\||::|[?:~]|[-+*/%&|^!=<>]=?)/m,
    			lookbehind: true
    		},
    		'constant': /\b[A-Z][A-Z_\d]+\b/
    	});

    	Prism.languages.insertBefore('java', 'string', {
    		'triple-quoted-string': {
    			// http://openjdk.java.net/jeps/355#Description
    			pattern: /"""[ \t]*[\r\n](?:(?:"|"")?(?:\\.|[^"\\]))*"""/,
    			greedy: true,
    			alias: 'string'
    		},
    		'char': {
    			pattern: /'(?:\\.|[^'\\\r\n]){1,6}'/,
    			greedy: true
    		}
    	});

    	Prism.languages.insertBefore('java', 'class-name', {
    		'annotation': {
    			pattern: /(^|[^.])@\w+(?:\s*\.\s*\w+)*/,
    			lookbehind: true,
    			alias: 'punctuation'
    		},
    		'generics': {
    			pattern: /<(?:[\w\s,.?]|&(?!&)|<(?:[\w\s,.?]|&(?!&)|<(?:[\w\s,.?]|&(?!&)|<(?:[\w\s,.?]|&(?!&))*>)*>)*>)*>/,
    			inside: {
    				'class-name': className,
    				'keyword': keywords,
    				'punctuation': /[<>(),.:]/,
    				'operator': /[?&|]/
    			}
    		},
    		'import': [
    			{
    				pattern: RegExp(/(\bimport\s+)/.source + classNamePrefix + /(?:[A-Z]\w*|\*)(?=\s*;)/.source),
    				lookbehind: true,
    				inside: {
    					'namespace': className.inside.namespace,
    					'punctuation': /\./,
    					'operator': /\*/,
    					'class-name': /\w+/
    				}
    			},
    			{
    				pattern: RegExp(/(\bimport\s+static\s+)/.source + classNamePrefix + /(?:\w+|\*)(?=\s*;)/.source),
    				lookbehind: true,
    				alias: 'static',
    				inside: {
    					'namespace': className.inside.namespace,
    					'static': /\b\w+$/,
    					'punctuation': /\./,
    					'operator': /\*/,
    					'class-name': /\w+/
    				}
    			}
    		],
    		'namespace': {
    			pattern: RegExp(
    				/(\b(?:exports|import(?:\s+static)?|module|open|opens|package|provides|requires|to|transitive|uses|with)\s+)(?!<keyword>)[a-z]\w*(?:\.[a-z]\w*)*\.?/
    					.source.replace(/<keyword>/g, function () { return keywords.source; })),
    			lookbehind: true,
    			inside: {
    				'punctuation': /\./,
    			}
    		}
    	});
    }(Prism));

    (function (Prism) {

    	var string = /(?:"(?:\\(?:\r\n|[\s\S])|[^"\\\r\n])*"|'(?:\\(?:\r\n|[\s\S])|[^'\\\r\n])*')/;

    	Prism.languages.css = {
    		'comment': /\/\*[\s\S]*?\*\//,
    		'atrule': {
    			pattern: RegExp('@[\\w-](?:' + /[^;{\s"']|\s+(?!\s)/.source + '|' + string.source + ')*?' + /(?:;|(?=\s*\{))/.source),
    			inside: {
    				'rule': /^@[\w-]+/,
    				'selector-function-argument': {
    					pattern: /(\bselector\s*\(\s*(?![\s)]))(?:[^()\s]|\s+(?![\s)])|\((?:[^()]|\([^()]*\))*\))+(?=\s*\))/,
    					lookbehind: true,
    					alias: 'selector'
    				},
    				'keyword': {
    					pattern: /(^|[^\w-])(?:and|not|only|or)(?![\w-])/,
    					lookbehind: true
    				}
    				// See rest below
    			}
    		},
    		'url': {
    			// https://drafts.csswg.org/css-values-3/#urls
    			pattern: RegExp('\\burl\\((?:' + string.source + '|' + /(?:[^\\\r\n()"']|\\[\s\S])*/.source + ')\\)', 'i'),
    			greedy: true,
    			inside: {
    				'function': /^url/i,
    				'punctuation': /^\(|\)$/,
    				'string': {
    					pattern: RegExp('^' + string.source + '$'),
    					alias: 'url'
    				}
    			}
    		},
    		'selector': {
    			pattern: RegExp('(^|[{}\\s])[^{}\\s](?:[^{};"\'\\s]|\\s+(?![\\s{])|' + string.source + ')*(?=\\s*\\{)'),
    			lookbehind: true
    		},
    		'string': {
    			pattern: string,
    			greedy: true
    		},
    		'property': {
    			pattern: /(^|[^-\w\xA0-\uFFFF])(?!\s)[-_a-z\xA0-\uFFFF](?:(?!\s)[-\w\xA0-\uFFFF])*(?=\s*:)/i,
    			lookbehind: true
    		},
    		'important': /!important\b/i,
    		'function': {
    			pattern: /(^|[^-a-z0-9])[-a-z0-9]+(?=\()/i,
    			lookbehind: true
    		},
    		'punctuation': /[(){};:,]/
    	};

    	Prism.languages.css['atrule'].inside.rest = Prism.languages.css;

    	var markup = Prism.languages.markup;
    	if (markup) {
    		markup.tag.addInlined('style', 'css');
    		markup.tag.addAttribute('style', 'css');
    	}

    }(Prism));

    Prism.languages.c = Prism.languages.extend('clike', {
    	'comment': {
    		pattern: /\/\/(?:[^\r\n\\]|\\(?:\r\n?|\n|(?![\r\n])))*|\/\*[\s\S]*?(?:\*\/|$)/,
    		greedy: true
    	},
    	'string': {
    		// https://en.cppreference.com/w/c/language/string_literal
    		pattern: /"(?:\\(?:\r\n|[\s\S])|[^"\\\r\n])*"/,
    		greedy: true
    	},
    	'class-name': {
    		pattern: /(\b(?:enum|struct)\s+(?:__attribute__\s*\(\([\s\S]*?\)\)\s*)?)\w+|\b[a-z]\w*_t\b/,
    		lookbehind: true
    	},
    	'keyword': /\b(?:_Alignas|_Alignof|_Atomic|_Bool|_Complex|_Generic|_Imaginary|_Noreturn|_Static_assert|_Thread_local|__attribute__|asm|auto|break|case|char|const|continue|default|do|double|else|enum|extern|float|for|goto|if|inline|int|long|register|return|short|signed|sizeof|static|struct|switch|typedef|typeof|union|unsigned|void|volatile|while)\b/,
    	'function': /\b[a-z_]\w*(?=\s*\()/i,
    	'number': /(?:\b0x(?:[\da-f]+(?:\.[\da-f]*)?|\.[\da-f]+)(?:p[+-]?\d+)?|(?:\b\d+(?:\.\d*)?|\B\.\d+)(?:e[+-]?\d+)?)[ful]{0,4}/i,
    	'operator': />>=?|<<=?|->|([-+&|:])\1|[?:~]|[-+*/%&|^!=<>]=?/
    });

    Prism.languages.insertBefore('c', 'string', {
    	'char': {
    		// https://en.cppreference.com/w/c/language/character_constant
    		pattern: /'(?:\\(?:\r\n|[\s\S])|[^'\\\r\n]){0,32}'/,
    		greedy: true
    	}
    });

    Prism.languages.insertBefore('c', 'string', {
    	'macro': {
    		// allow for multiline macro definitions
    		// spaces after the # character compile fine with gcc
    		pattern: /(^[\t ]*)#\s*[a-z](?:[^\r\n\\/]|\/(?!\*)|\/\*(?:[^*]|\*(?!\/))*\*\/|\\(?:\r\n|[\s\S]))*/im,
    		lookbehind: true,
    		greedy: true,
    		alias: 'property',
    		inside: {
    			'string': [
    				{
    					// highlight the path of the include statement as a string
    					pattern: /^(#\s*include\s*)<[^>]+>/,
    					lookbehind: true
    				},
    				Prism.languages.c['string']
    			],
    			'char': Prism.languages.c['char'],
    			'comment': Prism.languages.c['comment'],
    			'macro-name': [
    				{
    					pattern: /(^#\s*define\s+)\w+\b(?!\()/i,
    					lookbehind: true
    				},
    				{
    					pattern: /(^#\s*define\s+)\w+\b(?=\()/i,
    					lookbehind: true,
    					alias: 'function'
    				}
    			],
    			// highlight macro directives as keywords
    			'directive': {
    				pattern: /^(#\s*)[a-z]+/,
    				lookbehind: true,
    				alias: 'keyword'
    			},
    			'directive-hash': /^#/,
    			'punctuation': /##|\\(?=[\r\n])/,
    			'expression': {
    				pattern: /\S[\s\S]*/,
    				inside: Prism.languages.c
    			}
    		}
    	}
    });

    Prism.languages.insertBefore('c', 'function', {
    	// highlight predefined macros as constants
    	'constant': /\b(?:EOF|NULL|SEEK_CUR|SEEK_END|SEEK_SET|__DATE__|__FILE__|__LINE__|__TIMESTAMP__|__TIME__|__func__|stderr|stdin|stdout)\b/
    });

    delete Prism.languages.c['boolean'];

    (function (Prism) {

    	var keyword = /\b(?:alignas|alignof|asm|auto|bool|break|case|catch|char|char16_t|char32_t|char8_t|class|co_await|co_return|co_yield|compl|concept|const|const_cast|consteval|constexpr|constinit|continue|decltype|default|delete|do|double|dynamic_cast|else|enum|explicit|export|extern|final|float|for|friend|goto|if|import|inline|int|int16_t|int32_t|int64_t|int8_t|long|module|mutable|namespace|new|noexcept|nullptr|operator|override|private|protected|public|register|reinterpret_cast|requires|return|short|signed|sizeof|static|static_assert|static_cast|struct|switch|template|this|thread_local|throw|try|typedef|typeid|typename|uint16_t|uint32_t|uint64_t|uint8_t|union|unsigned|using|virtual|void|volatile|wchar_t|while)\b/;
    	var modName = /\b(?!<keyword>)\w+(?:\s*\.\s*\w+)*\b/.source.replace(/<keyword>/g, function () { return keyword.source; });

    	Prism.languages.cpp = Prism.languages.extend('c', {
    		'class-name': [
    			{
    				pattern: RegExp(/(\b(?:class|concept|enum|struct|typename)\s+)(?!<keyword>)\w+/.source
    					.replace(/<keyword>/g, function () { return keyword.source; })),
    				lookbehind: true
    			},
    			// This is intended to capture the class name of method implementations like:
    			//   void foo::bar() const {}
    			// However! The `foo` in the above example could also be a namespace, so we only capture the class name if
    			// it starts with an uppercase letter. This approximation should give decent results.
    			/\b[A-Z]\w*(?=\s*::\s*\w+\s*\()/,
    			// This will capture the class name before destructors like:
    			//   Foo::~Foo() {}
    			/\b[A-Z_]\w*(?=\s*::\s*~\w+\s*\()/i,
    			// This also intends to capture the class name of method implementations but here the class has template
    			// parameters, so it can't be a namespace (until C++ adds generic namespaces).
    			/\b\w+(?=\s*<(?:[^<>]|<(?:[^<>]|<[^<>]*>)*>)*>\s*::\s*\w+\s*\()/
    		],
    		'keyword': keyword,
    		'number': {
    			pattern: /(?:\b0b[01']+|\b0x(?:[\da-f']+(?:\.[\da-f']*)?|\.[\da-f']+)(?:p[+-]?[\d']+)?|(?:\b[\d']+(?:\.[\d']*)?|\B\.[\d']+)(?:e[+-]?[\d']+)?)[ful]{0,4}/i,
    			greedy: true
    		},
    		'operator': />>=?|<<=?|->|--|\+\+|&&|\|\||[?:~]|<=>|[-+*/%&|^!=<>]=?|\b(?:and|and_eq|bitand|bitor|not|not_eq|or|or_eq|xor|xor_eq)\b/,
    		'boolean': /\b(?:false|true)\b/
    	});

    	Prism.languages.insertBefore('cpp', 'string', {
    		'module': {
    			// https://en.cppreference.com/w/cpp/language/modules
    			pattern: RegExp(
    				/(\b(?:import|module)\s+)/.source +
    				'(?:' +
    				// header-name
    				/"(?:\\(?:\r\n|[\s\S])|[^"\\\r\n])*"|<[^<>\r\n]*>/.source +
    				'|' +
    				// module name or partition or both
    				/<mod-name>(?:\s*:\s*<mod-name>)?|:\s*<mod-name>/.source.replace(/<mod-name>/g, function () { return modName; }) +
    				')'
    			),
    			lookbehind: true,
    			greedy: true,
    			inside: {
    				'string': /^[<"][\s\S]+/,
    				'operator': /:/,
    				'punctuation': /\./
    			}
    		},
    		'raw-string': {
    			pattern: /R"([^()\\ ]{0,16})\([\s\S]*?\)\1"/,
    			alias: 'string',
    			greedy: true
    		}
    	});

    	Prism.languages.insertBefore('cpp', 'keyword', {
    		'generic-function': {
    			pattern: /\b(?!operator\b)[a-z_]\w*\s*<(?:[^<>]|<[^<>]*>)*>(?=\s*\()/i,
    			inside: {
    				'function': /^\w+/,
    				'generic': {
    					pattern: /<[\s\S]+/,
    					alias: 'class-name',
    					inside: Prism.languages.cpp
    				}
    			}
    		}
    	});

    	Prism.languages.insertBefore('cpp', 'operator', {
    		'double-colon': {
    			pattern: /::/,
    			alias: 'punctuation'
    		}
    	});

    	Prism.languages.insertBefore('cpp', 'class-name', {
    		// the base clause is an optional list of parent classes
    		// https://en.cppreference.com/w/cpp/language/class
    		'base-clause': {
    			pattern: /(\b(?:class|struct)\s+\w+\s*:\s*)[^;{}"'\s]+(?:\s+[^;{}"'\s]+)*(?=\s*[;{])/,
    			lookbehind: true,
    			greedy: true,
    			inside: Prism.languages.extend('cpp', {})
    		}
    	});

    	Prism.languages.insertBefore('inside', 'double-colon', {
    		// All untokenized words that are not namespaces should be class names
    		'class-name': /\b[a-z_]\w*\b(?!\s*::)/i
    	}, Prism.languages.cpp['base-clause']);

    }(Prism));

    (function (Prism) {
    	// $ set | grep '^[A-Z][^[:space:]]*=' | cut -d= -f1 | tr '\n' '|'
    	// + LC_ALL, RANDOM, REPLY, SECONDS.
    	// + make sure PS1..4 are here as they are not always set,
    	// - some useless things.
    	var envVars = '\\b(?:BASH|BASHOPTS|BASH_ALIASES|BASH_ARGC|BASH_ARGV|BASH_CMDS|BASH_COMPLETION_COMPAT_DIR|BASH_LINENO|BASH_REMATCH|BASH_SOURCE|BASH_VERSINFO|BASH_VERSION|COLORTERM|COLUMNS|COMP_WORDBREAKS|DBUS_SESSION_BUS_ADDRESS|DEFAULTS_PATH|DESKTOP_SESSION|DIRSTACK|DISPLAY|EUID|GDMSESSION|GDM_LANG|GNOME_KEYRING_CONTROL|GNOME_KEYRING_PID|GPG_AGENT_INFO|GROUPS|HISTCONTROL|HISTFILE|HISTFILESIZE|HISTSIZE|HOME|HOSTNAME|HOSTTYPE|IFS|INSTANCE|JOB|LANG|LANGUAGE|LC_ADDRESS|LC_ALL|LC_IDENTIFICATION|LC_MEASUREMENT|LC_MONETARY|LC_NAME|LC_NUMERIC|LC_PAPER|LC_TELEPHONE|LC_TIME|LESSCLOSE|LESSOPEN|LINES|LOGNAME|LS_COLORS|MACHTYPE|MAILCHECK|MANDATORY_PATH|NO_AT_BRIDGE|OLDPWD|OPTERR|OPTIND|ORBIT_SOCKETDIR|OSTYPE|PAPERSIZE|PATH|PIPESTATUS|PPID|PS1|PS2|PS3|PS4|PWD|RANDOM|REPLY|SECONDS|SELINUX_INIT|SESSION|SESSIONTYPE|SESSION_MANAGER|SHELL|SHELLOPTS|SHLVL|SSH_AUTH_SOCK|TERM|UID|UPSTART_EVENTS|UPSTART_INSTANCE|UPSTART_JOB|UPSTART_SESSION|USER|WINDOWID|XAUTHORITY|XDG_CONFIG_DIRS|XDG_CURRENT_DESKTOP|XDG_DATA_DIRS|XDG_GREETER_DATA_DIR|XDG_MENU_PREFIX|XDG_RUNTIME_DIR|XDG_SEAT|XDG_SEAT_PATH|XDG_SESSION_DESKTOP|XDG_SESSION_ID|XDG_SESSION_PATH|XDG_SESSION_TYPE|XDG_VTNR|XMODIFIERS)\\b';

    	var commandAfterHeredoc = {
    		pattern: /(^(["']?)\w+\2)[ \t]+\S.*/,
    		lookbehind: true,
    		alias: 'punctuation', // this looks reasonably well in all themes
    		inside: null // see below
    	};

    	var insideString = {
    		'bash': commandAfterHeredoc,
    		'environment': {
    			pattern: RegExp('\\$' + envVars),
    			alias: 'constant'
    		},
    		'variable': [
    			// [0]: Arithmetic Environment
    			{
    				pattern: /\$?\(\([\s\S]+?\)\)/,
    				greedy: true,
    				inside: {
    					// If there is a $ sign at the beginning highlight $(( and )) as variable
    					'variable': [
    						{
    							pattern: /(^\$\(\([\s\S]+)\)\)/,
    							lookbehind: true
    						},
    						/^\$\(\(/
    					],
    					'number': /\b0x[\dA-Fa-f]+\b|(?:\b\d+(?:\.\d*)?|\B\.\d+)(?:[Ee]-?\d+)?/,
    					// Operators according to https://www.gnu.org/software/bash/manual/bashref.html#Shell-Arithmetic
    					'operator': /--|\+\+|\*\*=?|<<=?|>>=?|&&|\|\||[=!+\-*/%<>^&|]=?|[?~:]/,
    					// If there is no $ sign at the beginning highlight (( and )) as punctuation
    					'punctuation': /\(\(?|\)\)?|,|;/
    				}
    			},
    			// [1]: Command Substitution
    			{
    				pattern: /\$\((?:\([^)]+\)|[^()])+\)|`[^`]+`/,
    				greedy: true,
    				inside: {
    					'variable': /^\$\(|^`|\)$|`$/
    				}
    			},
    			// [2]: Brace expansion
    			{
    				pattern: /\$\{[^}]+\}/,
    				greedy: true,
    				inside: {
    					'operator': /:[-=?+]?|[!\/]|##?|%%?|\^\^?|,,?/,
    					'punctuation': /[\[\]]/,
    					'environment': {
    						pattern: RegExp('(\\{)' + envVars),
    						lookbehind: true,
    						alias: 'constant'
    					}
    				}
    			},
    			/\$(?:\w+|[#?*!@$])/
    		],
    		// Escape sequences from echo and printf's manuals, and escaped quotes.
    		'entity': /\\(?:[abceEfnrtv\\"]|O?[0-7]{1,3}|U[0-9a-fA-F]{8}|u[0-9a-fA-F]{4}|x[0-9a-fA-F]{1,2})/
    	};

    	Prism.languages.bash = {
    		'shebang': {
    			pattern: /^#!\s*\/.*/,
    			alias: 'important'
    		},
    		'comment': {
    			pattern: /(^|[^"{\\$])#.*/,
    			lookbehind: true
    		},
    		'function-name': [
    			// a) function foo {
    			// b) foo() {
    			// c) function foo() {
    			// but not “foo {”
    			{
    				// a) and c)
    				pattern: /(\bfunction\s+)[\w-]+(?=(?:\s*\(?:\s*\))?\s*\{)/,
    				lookbehind: true,
    				alias: 'function'
    			},
    			{
    				// b)
    				pattern: /\b[\w-]+(?=\s*\(\s*\)\s*\{)/,
    				alias: 'function'
    			}
    		],
    		// Highlight variable names as variables in for and select beginnings.
    		'for-or-select': {
    			pattern: /(\b(?:for|select)\s+)\w+(?=\s+in\s)/,
    			alias: 'variable',
    			lookbehind: true
    		},
    		// Highlight variable names as variables in the left-hand part
    		// of assignments (“=” and “+=”).
    		'assign-left': {
    			pattern: /(^|[\s;|&]|[<>]\()\w+(?:\.\w+)*(?=\+?=)/,
    			inside: {
    				'environment': {
    					pattern: RegExp('(^|[\\s;|&]|[<>]\\()' + envVars),
    					lookbehind: true,
    					alias: 'constant'
    				}
    			},
    			alias: 'variable',
    			lookbehind: true
    		},
    		// Highlight parameter names as variables
    		'parameter': {
    			pattern: /(^|\s)-{1,2}(?:\w+:[+-]?)?\w+(?:\.\w+)*(?=[=\s]|$)/,
    			alias: 'variable',
    			lookbehind: true
    		},
    		'string': [
    			// Support for Here-documents https://en.wikipedia.org/wiki/Here_document
    			{
    				pattern: /((?:^|[^<])<<-?\s*)(\w+)\s[\s\S]*?(?:\r?\n|\r)\2/,
    				lookbehind: true,
    				greedy: true,
    				inside: insideString
    			},
    			// Here-document with quotes around the tag
    			// → No expansion (so no “inside”).
    			{
    				pattern: /((?:^|[^<])<<-?\s*)(["'])(\w+)\2\s[\s\S]*?(?:\r?\n|\r)\3/,
    				lookbehind: true,
    				greedy: true,
    				inside: {
    					'bash': commandAfterHeredoc
    				}
    			},
    			// “Normal” string
    			{
    				// https://www.gnu.org/software/bash/manual/html_node/Double-Quotes.html
    				pattern: /(^|[^\\](?:\\\\)*)"(?:\\[\s\S]|\$\([^)]+\)|\$(?!\()|`[^`]+`|[^"\\`$])*"/,
    				lookbehind: true,
    				greedy: true,
    				inside: insideString
    			},
    			{
    				// https://www.gnu.org/software/bash/manual/html_node/Single-Quotes.html
    				pattern: /(^|[^$\\])'[^']*'/,
    				lookbehind: true,
    				greedy: true
    			},
    			{
    				// https://www.gnu.org/software/bash/manual/html_node/ANSI_002dC-Quoting.html
    				pattern: /\$'(?:[^'\\]|\\[\s\S])*'/,
    				greedy: true,
    				inside: {
    					'entity': insideString.entity
    				}
    			}
    		],
    		'environment': {
    			pattern: RegExp('\\$?' + envVars),
    			alias: 'constant'
    		},
    		'variable': insideString.variable,
    		'function': {
    			pattern: /(^|[\s;|&]|[<>]\()(?:add|apropos|apt|apt-cache|apt-get|aptitude|aspell|automysqlbackup|awk|basename|bash|bc|bconsole|bg|bzip2|cal|cargo|cat|cfdisk|chgrp|chkconfig|chmod|chown|chroot|cksum|clear|cmp|column|comm|composer|cp|cron|crontab|csplit|curl|cut|date|dc|dd|ddrescue|debootstrap|df|diff|diff3|dig|dir|dircolors|dirname|dirs|dmesg|docker|docker-compose|du|egrep|eject|env|ethtool|expand|expect|expr|fdformat|fdisk|fg|fgrep|file|find|fmt|fold|format|free|fsck|ftp|fuser|gawk|git|gparted|grep|groupadd|groupdel|groupmod|groups|grub-mkconfig|gzip|halt|head|hg|history|host|hostname|htop|iconv|id|ifconfig|ifdown|ifup|import|install|ip|java|jobs|join|kill|killall|less|link|ln|locate|logname|logrotate|look|lpc|lpr|lprint|lprintd|lprintq|lprm|ls|lsof|lynx|make|man|mc|mdadm|mkconfig|mkdir|mke2fs|mkfifo|mkfs|mkisofs|mknod|mkswap|mmv|more|most|mount|mtools|mtr|mutt|mv|nano|nc|netstat|nice|nl|node|nohup|notify-send|npm|nslookup|op|open|parted|passwd|paste|pathchk|ping|pkill|pnpm|podman|podman-compose|popd|pr|printcap|printenv|ps|pushd|pv|quota|quotacheck|quotactl|ram|rar|rcp|reboot|remsync|rename|renice|rev|rm|rmdir|rpm|rsync|scp|screen|sdiff|sed|sendmail|seq|service|sftp|sh|shellcheck|shuf|shutdown|sleep|slocate|sort|split|ssh|stat|strace|su|sudo|sum|suspend|swapon|sync|sysctl|tac|tail|tar|tee|time|timeout|top|touch|tr|traceroute|tsort|tty|umount|uname|unexpand|uniq|units|unrar|unshar|unzip|update-grub|uptime|useradd|userdel|usermod|users|uudecode|uuencode|v|vcpkg|vdir|vi|vim|virsh|vmstat|wait|watch|wc|wget|whereis|which|who|whoami|write|xargs|xdg-open|yarn|yes|zenity|zip|zsh|zypper)(?=$|[)\s;|&])/,
    			lookbehind: true
    		},
    		'keyword': {
    			pattern: /(^|[\s;|&]|[<>]\()(?:case|do|done|elif|else|esac|fi|for|function|if|in|select|then|until|while)(?=$|[)\s;|&])/,
    			lookbehind: true
    		},
    		// https://www.gnu.org/software/bash/manual/html_node/Shell-Builtin-Commands.html
    		'builtin': {
    			pattern: /(^|[\s;|&]|[<>]\()(?:\.|:|alias|bind|break|builtin|caller|cd|command|continue|declare|echo|enable|eval|exec|exit|export|getopts|hash|help|let|local|logout|mapfile|printf|pwd|read|readarray|readonly|return|set|shift|shopt|source|test|times|trap|type|typeset|ulimit|umask|unalias|unset)(?=$|[)\s;|&])/,
    			lookbehind: true,
    			// Alias added to make those easier to distinguish from strings.
    			alias: 'class-name'
    		},
    		'boolean': {
    			pattern: /(^|[\s;|&]|[<>]\()(?:false|true)(?=$|[)\s;|&])/,
    			lookbehind: true
    		},
    		'file-descriptor': {
    			pattern: /\B&\d\b/,
    			alias: 'important'
    		},
    		'operator': {
    			// Lots of redirections here, but not just that.
    			pattern: /\d?<>|>\||\+=|=[=~]?|!=?|<<[<-]?|[&\d]?>>|\d[<>]&?|[<>][&=]?|&[>&]?|\|[&|]?/,
    			inside: {
    				'file-descriptor': {
    					pattern: /^\d/,
    					alias: 'important'
    				}
    			}
    		},
    		'punctuation': /\$?\(\(?|\)\)?|\.\.|[{}[\];\\]/,
    		'number': {
    			pattern: /(^|\s)(?:[1-9]\d*|0)(?:[.,]\d+)?\b/,
    			lookbehind: true
    		}
    	};

    	commandAfterHeredoc.inside = Prism.languages.bash;

    	/* Patterns in command substitution. */
    	var toBeCopied = [
    		'comment',
    		'function-name',
    		'for-or-select',
    		'assign-left',
    		'parameter',
    		'string',
    		'environment',
    		'function',
    		'keyword',
    		'builtin',
    		'boolean',
    		'file-descriptor',
    		'operator',
    		'punctuation',
    		'number'
    	];
    	var inside = insideString.variable[1].inside;
    	for (var i = 0; i < toBeCopied.length; i++) {
    		inside[toBeCopied[i]] = Prism.languages.bash[toBeCopied[i]];
    	}

    	Prism.languages.sh = Prism.languages.bash;
    	Prism.languages.shell = Prism.languages.bash;
    }(Prism));

    (function (Prism) {

    	var javascript = Prism.util.clone(Prism.languages.javascript);

    	var space = /(?:\s|\/\/.*(?!.)|\/\*(?:[^*]|\*(?!\/))\*\/)/.source;
    	var braces = /(?:\{(?:\{(?:\{[^{}]*\}|[^{}])*\}|[^{}])*\})/.source;
    	var spread = /(?:\{<S>*\.{3}(?:[^{}]|<BRACES>)*\})/.source;

    	/**
    	 * @param {string} source
    	 * @param {string} [flags]
    	 */
    	function re(source, flags) {
    		source = source
    			.replace(/<S>/g, function () { return space; })
    			.replace(/<BRACES>/g, function () { return braces; })
    			.replace(/<SPREAD>/g, function () { return spread; });
    		return RegExp(source, flags);
    	}

    	spread = re(spread).source;


    	Prism.languages.jsx = Prism.languages.extend('markup', javascript);
    	Prism.languages.jsx.tag.pattern = re(
    		/<\/?(?:[\w.:-]+(?:<S>+(?:[\w.:$-]+(?:=(?:"(?:\\[\s\S]|[^\\"])*"|'(?:\\[\s\S]|[^\\'])*'|[^\s{'"/>=]+|<BRACES>))?|<SPREAD>))*<S>*\/?)?>/.source
    	);

    	Prism.languages.jsx.tag.inside['tag'].pattern = /^<\/?[^\s>\/]*/;
    	Prism.languages.jsx.tag.inside['attr-value'].pattern = /=(?!\{)(?:"(?:\\[\s\S]|[^\\"])*"|'(?:\\[\s\S]|[^\\'])*'|[^\s'">]+)/;
    	Prism.languages.jsx.tag.inside['tag'].inside['class-name'] = /^[A-Z]\w*(?:\.[A-Z]\w*)*$/;
    	Prism.languages.jsx.tag.inside['comment'] = javascript['comment'];

    	Prism.languages.insertBefore('inside', 'attr-name', {
    		'spread': {
    			pattern: re(/<SPREAD>/.source),
    			inside: Prism.languages.jsx
    		}
    	}, Prism.languages.jsx.tag);

    	Prism.languages.insertBefore('inside', 'special-attr', {
    		'script': {
    			// Allow for two levels of nesting
    			pattern: re(/=<BRACES>/.source),
    			alias: 'language-javascript',
    			inside: {
    				'script-punctuation': {
    					pattern: /^=(?=\{)/,
    					alias: 'punctuation'
    				},
    				rest: Prism.languages.jsx
    			},
    		}
    	}, Prism.languages.jsx.tag);

    	// The following will handle plain text inside tags
    	var stringifyToken = function (token) {
    		if (!token) {
    			return '';
    		}
    		if (typeof token === 'string') {
    			return token;
    		}
    		if (typeof token.content === 'string') {
    			return token.content;
    		}
    		return token.content.map(stringifyToken).join('');
    	};

    	var walkTokens = function (tokens) {
    		var openedTags = [];
    		for (var i = 0; i < tokens.length; i++) {
    			var token = tokens[i];
    			var notTagNorBrace = false;

    			if (typeof token !== 'string') {
    				if (token.type === 'tag' && token.content[0] && token.content[0].type === 'tag') {
    					// We found a tag, now find its kind

    					if (token.content[0].content[0].content === '</') {
    						// Closing tag
    						if (openedTags.length > 0 && openedTags[openedTags.length - 1].tagName === stringifyToken(token.content[0].content[1])) {
    							// Pop matching opening tag
    							openedTags.pop();
    						}
    					} else {
    						if (token.content[token.content.length - 1].content === '/>') ; else {
    							// Opening tag
    							openedTags.push({
    								tagName: stringifyToken(token.content[0].content[1]),
    								openedBraces: 0
    							});
    						}
    					}
    				} else if (openedTags.length > 0 && token.type === 'punctuation' && token.content === '{') {

    					// Here we might have entered a JSX context inside a tag
    					openedTags[openedTags.length - 1].openedBraces++;

    				} else if (openedTags.length > 0 && openedTags[openedTags.length - 1].openedBraces > 0 && token.type === 'punctuation' && token.content === '}') {

    					// Here we might have left a JSX context inside a tag
    					openedTags[openedTags.length - 1].openedBraces--;

    				} else {
    					notTagNorBrace = true;
    				}
    			}
    			if (notTagNorBrace || typeof token === 'string') {
    				if (openedTags.length > 0 && openedTags[openedTags.length - 1].openedBraces === 0) {
    					// Here we are inside a tag, and not inside a JSX context.
    					// That's plain text: drop any tokens matched.
    					var plainText = stringifyToken(token);

    					// And merge text with adjacent text
    					if (i < tokens.length - 1 && (typeof tokens[i + 1] === 'string' || tokens[i + 1].type === 'plain-text')) {
    						plainText += stringifyToken(tokens[i + 1]);
    						tokens.splice(i + 1, 1);
    					}
    					if (i > 0 && (typeof tokens[i - 1] === 'string' || tokens[i - 1].type === 'plain-text')) {
    						plainText = stringifyToken(tokens[i - 1]) + plainText;
    						tokens.splice(i - 1, 1);
    						i--;
    					}

    					tokens[i] = new Prism.Token('plain-text', plainText, null, plainText);
    				}
    			}

    			if (token.content && typeof token.content !== 'string') {
    				walkTokens(token.content);
    			}
    		}
    	};

    	Prism.hooks.add('after-tokenize', function (env) {
    		if (env.language !== 'jsx' && env.language !== 'tsx') {
    			return;
    		}
    		walkTokens(env.tokens);
    	});

    }(Prism));

    Prism.languages.go = Prism.languages.extend('clike', {
    	'string': {
    		pattern: /(^|[^\\])"(?:\\.|[^"\\\r\n])*"|`[^`]*`/,
    		lookbehind: true,
    		greedy: true
    	},
    	'keyword': /\b(?:break|case|chan|const|continue|default|defer|else|fallthrough|for|func|go(?:to)?|if|import|interface|map|package|range|return|select|struct|switch|type|var)\b/,
    	'boolean': /\b(?:_|false|iota|nil|true)\b/,
    	'number': [
    		// binary and octal integers
    		/\b0(?:b[01_]+|o[0-7_]+)i?\b/i,
    		// hexadecimal integers and floats
    		/\b0x(?:[a-f\d_]+(?:\.[a-f\d_]*)?|\.[a-f\d_]+)(?:p[+-]?\d+(?:_\d+)*)?i?(?!\w)/i,
    		// decimal integers and floats
    		/(?:\b\d[\d_]*(?:\.[\d_]*)?|\B\.\d[\d_]*)(?:e[+-]?[\d_]+)?i?(?!\w)/i
    	],
    	'operator': /[*\/%^!=]=?|\+[=+]?|-[=-]?|\|[=|]?|&(?:=|&|\^=?)?|>(?:>=?|=)?|<(?:<=?|=|-)?|:=|\.\.\./,
    	'builtin': /\b(?:append|bool|byte|cap|close|complex|complex(?:64|128)|copy|delete|error|float(?:32|64)|u?int(?:8|16|32|64)?|imag|len|make|new|panic|print(?:ln)?|real|recover|rune|string|uintptr)\b/
    });

    Prism.languages.insertBefore('go', 'string', {
    	'char': {
    		pattern: /'(?:\\.|[^'\\\r\n]){0,10}'/,
    		greedy: true
    	}
    });

    delete Prism.languages.go['class-name'];

    /* webviews/components/Code.svelte generated by Svelte v3.55.1 */
    const file$1 = "webviews/components/Code.svelte";

    // (103:2) {#if asResponse && showButtons}
    function create_if_block$1(ctx) {
    	let div;
    	let button0;
    	let fa0;
    	let t;
    	let button1;
    	let fa1;
    	let current;
    	let mounted;
    	let dispose;

    	fa0 = new Fa({
    			props: {
    				icon: faCopy,
    				size: "1.5x",
    				color: "lightgrey"
    			},
    			$$inline: true
    		});

    	fa1 = new Fa({
    			props: {
    				icon: faFileImport,
    				size: "1.5x",
    				color: "lightgrey"
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div = element("div");
    			button0 = element("button");
    			create_component(fa0.$$.fragment);
    			t = space();
    			button1 = element("button");
    			create_component(fa1.$$.fragment);
    			attr_dev(button0, "class", "btn svelte-1236kzm");
    			add_location(button0, file$1, 104, 6, 2811);
    			attr_dev(button1, "class", "btn svelte-1236kzm");
    			add_location(button1, file$1, 107, 6, 2936);
    			attr_dev(div, "class", "btn-container svelte-1236kzm");
    			add_location(div, file$1, 103, 4, 2777);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, button0);
    			mount_component(fa0, button0, null);
    			append_dev(div, t);
    			append_dev(div, button1);
    			mount_component(fa1, button1, null);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(
    						button0,
    						"click",
    						function () {
    							if (is_function(/*onCopy*/ ctx[2](/*code*/ ctx[0]))) /*onCopy*/ ctx[2](/*code*/ ctx[0]).apply(this, arguments);
    						},
    						false,
    						false,
    						false
    					),
    					listen_dev(button1, "click", /*click_handler*/ ctx[8], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(fa0.$$.fragment, local);
    			transition_in(fa1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(fa0.$$.fragment, local);
    			transition_out(fa1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(fa0);
    			destroy_component(fa1);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(103:2) {#if asResponse && showButtons}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let div2;
    	let t;
    	let div1;
    	let div0;
    	let code_1;
    	let raw_value = Prism$1.highlight(/*code*/ ctx[0], Prism$1.languages[/*language*/ ctx[4]]) + "";
    	let current;
    	let mounted;
    	let dispose;
    	let if_block = /*asResponse*/ ctx[1] && /*showButtons*/ ctx[3] && create_if_block$1(ctx);

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			if (if_block) if_block.c();
    			t = space();
    			div1 = element("div");
    			div0 = element("div");
    			code_1 = element("code");
    			attr_dev(code_1, "class", "svelte-1236kzm");
    			add_location(code_1, file$1, 114, 6, 3174);
    			attr_dev(div0, "class", "inner-container svelte-1236kzm");
    			add_location(div0, file$1, 113, 4, 3138);
    			attr_dev(div1, "class", "svelte-1236kzm");
    			toggle_class(div1, "border-radius", /*asResponse*/ ctx[1]);
    			add_location(div1, file$1, 112, 2, 3093);
    			attr_dev(div2, "class", "outer-container svelte-1236kzm");
    			add_location(div2, file$1, 101, 0, 2655);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			if (if_block) if_block.m(div2, null);
    			append_dev(div2, t);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    			append_dev(div0, code_1);
    			code_1.innerHTML = raw_value;
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(div2, "mouseenter", /*toggleShow*/ ctx[5], false, false, false),
    					listen_dev(div2, "mouseleave", /*toggleShow*/ ctx[5], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*asResponse*/ ctx[1] && /*showButtons*/ ctx[3]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*asResponse, showButtons*/ 10) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$1(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(div2, t);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}

    			if ((!current || dirty & /*code, language*/ 17) && raw_value !== (raw_value = Prism$1.highlight(/*code*/ ctx[0], Prism$1.languages[/*language*/ ctx[4]]) + "")) code_1.innerHTML = raw_value;
    			if (!current || dirty & /*asResponse*/ 2) {
    				toggle_class(div1, "border-radius", /*asResponse*/ ctx[1]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			if (if_block) if_block.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Code', slots, []);
    	let { code = "" } = $$props;
    	let { asResponse } = $$props;
    	let { onReplace } = $$props;
    	let { onCopy } = $$props;
    	let showButtons = false;

    	const toggleShow = () => {
    		$$invalidate(3, showButtons = !showButtons);
    	};

    	const handleReplace = async event => {
    		// const success = await onReplace(code);
    		// if (!success) {
    		//   // confetti(createConfettiOptions(event));
    		//   return;
    		// }
    		onReplace(code);

    		await confetti(createConfettiOptions(event));
    	};

    	const createConfettiOptions = event => {
    		const button = event.currentTarget;
    		const buttonRect = button.getBoundingClientRect();
    		const originX = buttonRect.left + buttonRect.width / 2;
    		const originY = buttonRect.top + buttonRect.height / 2;

    		return {
    			particleCount: 50,
    			startVelocity: 15,
    			ticks: 50,
    			spread: 360,
    			origin: {
    				x: originX / window.innerWidth,
    				y: originY / window.innerHeight
    			}
    		};
    	};

    	let language = "javascript";

    	// TODO: c causes some problems
    	// TODO: remove redundant languages
    	const language_mappings = {
    		"python": "python",
    		"Python": "python",
    		"javascript": "javascript",
    		"JavaScript": "javascript",
    		"typescript": "typescript",
    		"TypeScript": "typescript",
    		"ts": "typescript",
    		"java": "java",
    		"Java": "java",
    		"html": "html",
    		"css": "css",
    		"c++": "cpp",
    		"C++": "cpp",
    		"cpp": "cpp",
    		"bash": "bash",
    		"Bash": "bash",
    		"jsx": "jsx",
    		"js": "javascript",
    		"golang": "go",
    		"Golang": "go",
    		"go": "go",
    		"Go": "go"
    	};

    	$$self.$$.on_mount.push(function () {
    		if (asResponse === undefined && !('asResponse' in $$props || $$self.$$.bound[$$self.$$.props['asResponse']])) {
    			console.warn("<Code> was created without expected prop 'asResponse'");
    		}

    		if (onReplace === undefined && !('onReplace' in $$props || $$self.$$.bound[$$self.$$.props['onReplace']])) {
    			console.warn("<Code> was created without expected prop 'onReplace'");
    		}

    		if (onCopy === undefined && !('onCopy' in $$props || $$self.$$.bound[$$self.$$.props['onCopy']])) {
    			console.warn("<Code> was created without expected prop 'onCopy'");
    		}
    	});

    	const writable_props = ['code', 'asResponse', 'onReplace', 'onCopy'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Code> was created with unknown prop '${key}'`);
    	});

    	const click_handler = e => handleReplace(e);

    	$$self.$$set = $$props => {
    		if ('code' in $$props) $$invalidate(0, code = $$props.code);
    		if ('asResponse' in $$props) $$invalidate(1, asResponse = $$props.asResponse);
    		if ('onReplace' in $$props) $$invalidate(7, onReplace = $$props.onReplace);
    		if ('onCopy' in $$props) $$invalidate(2, onCopy = $$props.onCopy);
    	};

    	$$self.$capture_state = () => ({
    		Prism: Prism$1,
    		Fa,
    		faCopy,
    		faFileImport,
    		confetti,
    		code,
    		asResponse,
    		onReplace,
    		onCopy,
    		showButtons,
    		toggleShow,
    		handleReplace,
    		createConfettiOptions,
    		language,
    		language_mappings
    	});

    	$$self.$inject_state = $$props => {
    		if ('code' in $$props) $$invalidate(0, code = $$props.code);
    		if ('asResponse' in $$props) $$invalidate(1, asResponse = $$props.asResponse);
    		if ('onReplace' in $$props) $$invalidate(7, onReplace = $$props.onReplace);
    		if ('onCopy' in $$props) $$invalidate(2, onCopy = $$props.onCopy);
    		if ('showButtons' in $$props) $$invalidate(3, showButtons = $$props.showButtons);
    		if ('language' in $$props) $$invalidate(4, language = $$props.language);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*code, asResponse*/ 3) {
    			{
    				for (let lang in language_mappings) {
    					if (code.startsWith(lang) || code.startsWith(lang.toUpperCase())) {
    						$$invalidate(0, code = code.slice(lang.length));
    						$$invalidate(4, language = language_mappings[lang]);
    						break;
    					}
    				}

    				if (asResponse) {
    					$$invalidate(0, code = code.trim());
    				}
    			} // console.log(code);
    		}
    	};

    	return [
    		code,
    		asResponse,
    		onCopy,
    		showButtons,
    		language,
    		toggleShow,
    		handleReplace,
    		onReplace,
    		click_handler
    	];
    }

    class Code extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {
    			code: 0,
    			asResponse: 1,
    			onReplace: 7,
    			onCopy: 2
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Code",
    			options,
    			id: create_fragment$1.name
    		});
    	}

    	get code() {
    		throw new Error("<Code>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set code(value) {
    		throw new Error("<Code>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get asResponse() {
    		throw new Error("<Code>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set asResponse(value) {
    		throw new Error("<Code>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get onReplace() {
    		throw new Error("<Code>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set onReplace(value) {
    		throw new Error("<Code>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get onCopy() {
    		throw new Error("<Code>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set onCopy(value) {
    		throw new Error("<Code>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* webviews/components/AskPeritus.svelte generated by Svelte v3.55.1 */
    const file = "webviews/components/AskPeritus.svelte";

    // (69:4) {:else}
    function create_else_block(ctx) {
    	let input;
    	let t;
    	let div;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			input = element("input");
    			t = space();
    			div = element("div");
    			attr_dev(input, "type", "text");
    			attr_dev(input, "class", "input-box svelte-4ulx3l");
    			attr_dev(input, "placeholder", "Ask Peritus...");
    			add_location(input, file, 69, 4, 1369);
    			attr_dev(div, "class", "white-box svelte-4ulx3l");
    			add_location(div, file, 70, 4, 1463);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, input, anchor);
    			insert_dev(target, t, anchor);
    			insert_dev(target, div, anchor);

    			if (!mounted) {
    				dispose = listen_dev(input, "input", /*handleInput*/ ctx[1], false, false, false);
    				mounted = true;
    			}
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(input);
    			if (detaching) detach_dev(t);
    			if (detaching) detach_dev(div);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(69:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (65:4) {#if showAskPeritus}
    function create_if_block(ctx) {
    	let div0;
    	let t1;
    	let input;
    	let t2;
    	let div1;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			div0.textContent = "Peritus";
    			t1 = space();
    			input = element("input");
    			t2 = space();
    			div1 = element("div");
    			attr_dev(div0, "class", "header svelte-4ulx3l");
    			add_location(div0, file, 65, 4, 1191);
    			attr_dev(input, "type", "text");
    			attr_dev(input, "class", "input-box svelte-4ulx3l");
    			attr_dev(input, "placeholder", "Ask Peritus...");
    			add_location(input, file, 66, 4, 1229);
    			attr_dev(div1, "class", "white-box svelte-4ulx3l");
    			add_location(div1, file, 67, 4, 1323);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, input, anchor);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, div1, anchor);

    			if (!mounted) {
    				dispose = listen_dev(input, "input", /*handleInput*/ ctx[1], false, false, false);
    				mounted = true;
    			}
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(input);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(div1);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(65:4) {#if showAskPeritus}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let div;

    	function select_block_type(ctx, dirty) {
    		if (/*showAskPeritus*/ ctx[0]) return create_if_block;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if_block.c();
    			attr_dev(div, "class", "black-box svelte-4ulx3l");
    			add_location(div, file, 63, 2, 1138);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			if_block.m(div, null);
    		},
    		p: function update(ctx, [dirty]) {
    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(div, null);
    				}
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('AskPeritus', slots, []);
    	let inputText = "";
    	let showAskPeritus = true;

    	function handleInput(event) {
    		inputText = event.target.value;
    		$$invalidate(0, showAskPeritus = false);
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<AskPeritus> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		Code,
    		inputText,
    		showAskPeritus,
    		handleInput
    	});

    	$$self.$inject_state = $$props => {
    		if ('inputText' in $$props) inputText = $$props.inputText;
    		if ('showAskPeritus' in $$props) $$invalidate(0, showAskPeritus = $$props.showAskPeritus);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [showAskPeritus, handleInput];
    }

    class AskPeritus extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "AskPeritus",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new AskPeritus({
        target: document.body,
    });

    return app;

})();
//# sourceMappingURL=askPeritus.js.map
