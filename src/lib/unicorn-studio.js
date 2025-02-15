var Ze = (b, B) => () => (B || b((B = { exports: {} }).exports, B), B.exports);
var Je = Ze((bt, Xt) => {
	(function (b, B) {
		typeof bt == 'object' && typeof Xt < 'u'
			? B(bt)
			: typeof define == 'function' && define.amd
				? define(['exports'], B)
				: ((b = typeof globalThis < 'u' ? globalThis : b || self), B((b.UnicornStudio = {})));
	})(void 0, function (b) {
		var B = Object.defineProperty,
			Yt = (a, t, e) =>
				t in a ? B(a, t, { enumerable: !0, configurable: !0, writable: !0, value: e }) : (a[t] = e),
			D = (a, t, e) => (Yt(a, typeof t != 'symbol' ? t + '' : t, e), e);
		let ut = 0;
		function m() {
			if (!(ut > 100)) {
				if (ut === 100) console.warn('Curtains: too many warnings thrown, stop logging.');
				else {
					const a = Array.prototype.slice.call(arguments);
					console.warn.apply(console, a);
				}
				ut++;
			}
		}
		function k() {
			const a = Array.prototype.slice.call(arguments);
			console.error.apply(console, a);
		}
		function pt() {
			return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (a) => {
				let t = (Math.random() * 16) | 0;
				return (a === 'x' ? t : (t & 3) | 8).toString(16).toUpperCase();
			});
		}
		function W(a) {
			return (a & (a - 1)) === 0;
		}
		function qt(a, t, e) {
			return (1 - e) * a + e * t;
		}
		let Qt = class {
			constructor(a) {
				if (((this.type = 'Scene'), !a || a.type !== 'Renderer'))
					k(this.type + ': Renderer not passed as first argument', a);
				else if (!a.gl) {
					k(this.type + ': Renderer WebGL context is undefined', a);
					return;
				}
				(this.renderer = a), (this.gl = a.gl), this.initStacks();
			}
			initStacks() {
				this.stacks = {
					pingPong: [],
					renderTargets: [],
					opaque: [],
					transparent: [],
					renderPasses: [],
					scenePasses: []
				};
			}
			resetPlaneStacks() {
				(this.stacks.pingPong = []),
					(this.stacks.renderTargets = []),
					(this.stacks.opaque = []),
					(this.stacks.transparent = []);
				for (let a = 0; a < this.renderer.planes.length; a++)
					this.addPlane(this.renderer.planes[a]);
			}
			resetShaderPassStacks() {
				(this.stacks.scenePasses = []), (this.stacks.renderPasses = []);
				for (let a = 0; a < this.renderer.shaderPasses.length; a++)
					(this.renderer.shaderPasses[a].index = a),
						this.renderer.shaderPasses[a]._isScenePass
							? this.stacks.scenePasses.push(this.renderer.shaderPasses[a])
							: this.stacks.renderPasses.push(this.renderer.shaderPasses[a]);
				this.stacks.scenePasses.length === 0 && (this.renderer.state.scenePassIndex = null);
			}
			addToRenderTargetsStack(a) {
				const t = this.renderer.planes.filter(
					(s) => s.type !== 'PingPongPlane' && s.target && s.uuid !== a.uuid
				);
				let e = -1;
				if (a.target._depth) {
					for (let s = t.length - 1; s >= 0; s--)
						if (t[s].target.uuid === a.target.uuid) {
							e = s + 1;
							break;
						}
				} else e = t.findIndex((s) => s.target.uuid === a.target.uuid);
				(e = Math.max(0, e)),
					t.splice(e, 0, a),
					a.target._depth
						? (t.sort((s, i) => s.index - i.index), t.sort((s, i) => i.renderOrder - s.renderOrder))
						: (t.sort((s, i) => i.index - s.index),
							t.sort((s, i) => s.renderOrder - i.renderOrder)),
					t.sort((s, i) => s.target.index - i.target.index),
					(this.stacks.renderTargets = t);
			}
			addToRegularPlaneStack(a) {
				const t = this.renderer.planes.filter(
					(s) =>
						s.type !== 'PingPongPlane' &&
						!s.target &&
						s._transparent === a._transparent &&
						s.uuid !== a.uuid
				);
				let e = -1;
				for (let s = t.length - 1; s >= 0; s--)
					if (t[s]._geometry.definition.id === a._geometry.definition.id) {
						e = s + 1;
						break;
					}
				return (e = Math.max(0, e)), t.splice(e, 0, a), t.sort((s, i) => s.index - i.index), t;
			}
			addPlane(a) {
				if (a.type === 'PingPongPlane') this.stacks.pingPong.push(a);
				else if (a.target) this.addToRenderTargetsStack(a);
				else if (a._transparent) {
					const t = this.addToRegularPlaneStack(a);
					t.sort((e, s) => s.relativeTranslation.z - e.relativeTranslation.z),
						t.sort((e, s) => s.renderOrder - e.renderOrder),
						(this.stacks.transparent = t);
				} else {
					const t = this.addToRegularPlaneStack(a);
					t.sort((e, s) => s.renderOrder - e.renderOrder), (this.stacks.opaque = t);
				}
			}
			removePlane(a) {
				a.type === 'PingPongPlane'
					? (this.stacks.pingPong = this.stacks.pingPong.filter((t) => t.uuid !== a.uuid))
					: a.target
						? (this.stacks.renderTargets = this.stacks.renderTargets.filter(
								(t) => t.uuid !== a.uuid
							))
						: a._transparent
							? (this.stacks.transparent = this.stacks.transparent.filter((t) => t.uuid !== a.uuid))
							: (this.stacks.opaque = this.stacks.opaque.filter((t) => t.uuid !== a.uuid));
			}
			setPlaneRenderOrder(a) {
				if (a.type === 'ShaderPass')
					this.sortShaderPassStack(
						a._isScenePass ? this.stacks.scenePasses : this.stacks.renderPasses
					);
				else if (a.type === 'PingPongPlane') return;
				if (a.target)
					a.target._depth
						? (this.stacks.renderTargets.sort((t, e) => t.index - e.index),
							this.stacks.renderTargets.sort((t, e) => e.renderOrder - t.renderOrder))
						: (this.stacks.renderTargets.sort((t, e) => e.index - t.index),
							this.stacks.renderTargets.sort((t, e) => t.renderOrder - e.renderOrder)),
						this.stacks.renderTargets.sort((t, e) => t.target.index - e.target.index);
				else {
					const t = a._transparent ? this.stacks.transparent : this.stacks.opaque,
						e = this.stacks.scenePasses.find((s, i) => s._isScenePass && !s._depth && i === 0);
					!this.renderer.depth || e
						? (t.sort((s, i) => i.index - s.index),
							a._transparent && t.sort((s, i) => s.relativeTranslation.z - i.relativeTranslation.z),
							t.sort((s, i) => s.renderOrder - i.renderOrder))
						: (t.sort((s, i) => s.index - i.index),
							a._transparent && t.sort((s, i) => i.relativeTranslation.z - s.relativeTranslation.z),
							t.sort((s, i) => i.renderOrder - s.renderOrder));
				}
			}
			addShaderPass(a) {
				a._isScenePass
					? (this.stacks.scenePasses.push(a), this.sortShaderPassStack(this.stacks.scenePasses))
					: (this.stacks.renderPasses.push(a), this.sortShaderPassStack(this.stacks.renderPasses));
			}
			removeShaderPass(a) {
				this.resetShaderPassStacks();
			}
			sortShaderPassStack(a) {
				a.sort((t, e) => t.index - e.index), a.sort((t, e) => t.renderOrder - e.renderOrder);
			}
			enableShaderPass() {
				this.stacks.scenePasses.length &&
					this.stacks.renderPasses.length === 0 &&
					this.renderer.planes.length &&
					((this.renderer.state.scenePassIndex = 0),
					this.renderer.bindFrameBuffer(this.stacks.scenePasses[0].target));
			}
			drawRenderPasses() {
				this.stacks.scenePasses.length &&
					this.stacks.renderPasses.length &&
					this.renderer.planes.length &&
					((this.renderer.state.scenePassIndex = 0),
					this.renderer.bindFrameBuffer(this.stacks.scenePasses[0].target));
				for (let a = 0; a < this.stacks.renderPasses.length; a++)
					this.stacks.renderPasses[a]._startDrawing(), this.renderer.clearDepth();
			}
			drawScenePasses() {
				for (let a = 0; a < this.stacks.scenePasses.length; a++)
					this.stacks.scenePasses[a]._startDrawing();
			}
			drawPingPongStack() {
				for (let a = 0; a < this.stacks.pingPong.length; a++) {
					const t = this.stacks.pingPong[a];
					t && t._startDrawing();
				}
			}
			drawStack(a) {
				for (let t = 0; t < this.stacks[a].length; t++) {
					const e = this.stacks[a][t];
					e && e._startDrawing();
				}
			}
			draw() {
				this.drawPingPongStack(),
					this.enableShaderPass(),
					this.drawStack('renderTargets'),
					this.drawRenderPasses(),
					this.renderer.setBlending(!1),
					this.drawStack('opaque'),
					this.stacks.transparent.length &&
						(this.renderer.setBlending(!0), this.drawStack('transparent')),
					this.drawScenePasses();
			}
		};
		class $t {
			constructor() {
				(this.geometries = []), this.clear();
			}
			clear() {
				(this.textures = []), (this.programs = []);
			}
			getGeometryFromID(t) {
				return this.geometries.find((e) => e.id === t);
			}
			addGeometry(t, e, s) {
				this.geometries.push({ id: t, vertices: e, uvs: s });
			}
			isSameShader(t, e) {
				return t.localeCompare(e) === 0;
			}
			getProgramFromShaders(t, e) {
				return this.programs.find(
					(s) => this.isSameShader(s.vsCode, t) && this.isSameShader(s.fsCode, e)
				);
			}
			addProgram(t) {
				this.programs.push(t);
			}
			getTextureFromSource(t) {
				const e = typeof t == 'string' ? t : t.src;
				return this.textures.find((s) => s.source && s.source.src === e);
			}
			addTexture(t) {
				this.getTextureFromSource(t.source) || this.textures.push(t);
			}
			removeTexture(t) {
				this.textures = this.textures.filter((e) => e.uuid !== t.uuid);
			}
		}
		class Zt {
			constructor() {
				this.clear();
			}
			clear() {
				this.queue = [];
			}
			add(t, e = !1) {
				const s = { callback: t, keep: e, timeout: null };
				return (
					(s.timeout = setTimeout(() => {
						this.queue.push(s);
					}, 0)),
					s
				);
			}
			execute() {
				this.queue.map((t) => {
					t.callback && t.callback(), clearTimeout(this.queue.timeout);
				}),
					(this.queue = this.queue.filter((t) => t.keep));
			}
		}
		class Jt {
			constructor({
				alpha: t,
				antialias: e,
				premultipliedAlpha: s,
				depth: i,
				failIfMajorPerformanceCaveat: r,
				preserveDrawingBuffer: n,
				stencil: h,
				container: o,
				pixelRatio: l,
				renderingScale: d,
				production: c,
				onError: u,
				onSuccess: p,
				onContextLost: g,
				onContextRestored: x,
				onDisposed: E,
				onSceneChange: _
			}) {
				(this.type = 'Renderer'),
					(this.alpha = t),
					(this.antialias = e),
					(this.premultipliedAlpha = s),
					(this.depth = i),
					(this.failIfMajorPerformanceCaveat = r),
					(this.preserveDrawingBuffer = n),
					(this.stencil = h),
					(this.container = o),
					(this.pixelRatio = l),
					(this._renderingScale = d),
					(this.production = c),
					(this.onError = u),
					(this.onSuccess = p),
					(this.onContextLost = g),
					(this.onContextRestored = x),
					(this.onDisposed = E),
					(this.onSceneChange = _),
					this.initState(),
					(this.canvas = document.createElement('canvas'));
				const f = {
					alpha: this.alpha,
					premultipliedAlpha: this.premultipliedAlpha,
					antialias: this.antialias,
					depth: this.depth,
					failIfMajorPerformanceCaveat: this.failIfMajorPerformanceCaveat,
					preserveDrawingBuffer: this.preserveDrawingBuffer,
					stencil: this.stencil
				};
				if (
					((this.gl = this.canvas.getContext('webgl2', f)),
					(this._isWebGL2 = !!this.gl),
					this.gl ||
						(this.gl =
							this.canvas.getContext('webgl', f) ||
							this.canvas.getContext('experimental-webgl', f)),
					this.gl)
				)
					this.onSuccess && this.onSuccess();
				else {
					this.production || m(this.type + ': WebGL context could not be created'),
						(this.state.isActive = !1),
						this.onError && this.onError();
					return;
				}
				this.initRenderer();
			}
			initState() {
				this.state = {
					isActive: !0,
					isContextLost: !0,
					drawingEnabled: !0,
					forceRender: !1,
					currentProgramID: null,
					currentGeometryID: null,
					forceBufferUpdate: !1,
					depthTest: null,
					blending: null,
					cullFace: null,
					frameBufferID: null,
					scenePassIndex: null,
					activeTexture: null,
					unpackAlignment: null,
					flipY: null,
					premultiplyAlpha: null
				};
			}
			initCallbackQueueManager() {
				this.nextRender = new Zt();
			}
			initRenderer() {
				(this.planes = []),
					(this.renderTargets = []),
					(this.shaderPasses = []),
					(this.state.isContextLost = !1),
					(this.state.maxTextureSize = this.gl.getParameter(this.gl.MAX_TEXTURE_SIZE)),
					this.initCallbackQueueManager(),
					this.setBlendFunc(),
					this.setDepthFunc(),
					this.setDepthTest(!0),
					(this.cache = new $t()),
					(this.scene = new Qt(this)),
					this.getExtensions(),
					(this._contextLostHandler = this.contextLost.bind(this)),
					this.canvas.addEventListener('webglcontextlost', this._contextLostHandler, !1),
					(this._contextRestoredHandler = this.contextRestored.bind(this)),
					this.canvas.addEventListener('webglcontextrestored', this._contextRestoredHandler, !1);
			}
			getExtensions() {
				(this.extensions = []),
					this._isWebGL2
						? ((this.extensions.EXT_color_buffer_float =
								this.gl.getExtension('EXT_color_buffer_float')),
							(this.extensions.OES_texture_float_linear = this.gl.getExtension(
								'OES_texture_float_linear'
							)),
							(this.extensions.EXT_texture_filter_anisotropic = this.gl.getExtension(
								'EXT_texture_filter_anisotropic'
							)),
							(this.extensions.WEBGL_lose_context = this.gl.getExtension('WEBGL_lose_context')))
						: ((this.extensions.OES_vertex_array_object =
								this.gl.getExtension('OES_vertex_array_object')),
							(this.extensions.OES_texture_float = this.gl.getExtension('OES_texture_float')),
							(this.extensions.OES_texture_float_linear = this.gl.getExtension(
								'OES_texture_float_linear'
							)),
							(this.extensions.OES_texture_half_float =
								this.gl.getExtension('OES_texture_half_float')),
							(this.extensions.OES_texture_half_float_linear = this.gl.getExtension(
								'OES_texture_half_float_linear'
							)),
							(this.extensions.EXT_texture_filter_anisotropic = this.gl.getExtension(
								'EXT_texture_filter_anisotropic'
							)),
							(this.extensions.OES_element_index_uint =
								this.gl.getExtension('OES_element_index_uint')),
							(this.extensions.OES_standard_derivatives = this.gl.getExtension(
								'OES_standard_derivatives'
							)),
							(this.extensions.EXT_sRGB = this.gl.getExtension('EXT_sRGB')),
							(this.extensions.WEBGL_depth_texture = this.gl.getExtension('WEBGL_depth_texture')),
							(this.extensions.WEBGL_draw_buffers = this.gl.getExtension('WEBGL_draw_buffers')),
							(this.extensions.WEBGL_lose_context = this.gl.getExtension('WEBGL_lose_context')));
			}
			contextLost(t) {
				(this.state.isContextLost = !0),
					this.state.isActive &&
						(t.preventDefault(),
						this.nextRender.add(() => this.onContextLost && this.onContextLost()));
			}
			restoreContext() {
				this.state.isActive &&
					(this.initState(),
					this.gl && this.extensions.WEBGL_lose_context
						? this.extensions.WEBGL_lose_context.restoreContext()
						: (!this.gl && !this.production
								? m(
										this.type + ': Could not restore the context because the context is not defined'
									)
								: !this.extensions.WEBGL_lose_context &&
									!this.production &&
									m(
										this.type +
											': Could not restore the context because the restore context extension is not defined'
									),
							this.onError && this.onError()));
			}
			isContextexFullyRestored() {
				let t = !0;
				for (let e = 0; e < this.renderTargets.length; e++) {
					this.renderTargets[e].textures[0]._canDraw || (t = !1);
					break;
				}
				if (t)
					for (let e = 0; e < this.planes.length; e++)
						if (this.planes[e]._canDraw) {
							for (let s = 0; s < this.planes[e].textures.length; s++)
								if (!this.planes[e].textures[s]._canDraw) {
									t = !1;
									break;
								}
						} else {
							t = !1;
							break;
						}
				if (t)
					for (let e = 0; e < this.shaderPasses.length; e++)
						if (this.shaderPasses[e]._canDraw) {
							for (let s = 0; s < this.shaderPasses[e].textures.length; s++)
								if (!this.shaderPasses[e].textures[s]._canDraw) {
									t = !1;
									break;
								}
						} else {
							t = !1;
							break;
						}
				return t;
			}
			contextRestored() {
				this.getExtensions(),
					this.setBlendFunc(),
					this.setDepthFunc(),
					this.setDepthTest(!0),
					this.cache.clear(),
					this.scene.initStacks();
				for (let e = 0; e < this.renderTargets.length; e++) this.renderTargets[e]._restoreContext();
				for (let e = 0; e < this.planes.length; e++) this.planes[e]._restoreContext();
				for (let e = 0; e < this.shaderPasses.length; e++) this.shaderPasses[e]._restoreContext();
				const t = this.nextRender.add(() => {
					this.isContextexFullyRestored() &&
						((t.keep = !1),
						(this.state.isContextLost = !1),
						this.onContextRestored && this.onContextRestored(),
						this.onSceneChange(),
						this.needRender());
				}, !0);
			}
			setPixelRatio(t) {
				this.pixelRatio = t;
			}
			setSize() {
				if (!this.gl) return;
				const t = this.container.getBoundingClientRect();
				(this._boundingRect = {
					width: t.width * this.pixelRatio,
					height: t.height * this.pixelRatio,
					top: t.top * this.pixelRatio,
					left: t.left * this.pixelRatio
				}),
					(this.canvas.style.width = Math.floor(this._boundingRect.width / this.pixelRatio) + 'px'),
					(this.canvas.style.height =
						Math.floor(this._boundingRect.height / this.pixelRatio) + 'px'),
					(this.canvas.width = Math.floor(this._boundingRect.width * this._renderingScale)),
					(this.canvas.height = Math.floor(this._boundingRect.height * this._renderingScale)),
					this.gl.viewport(0, 0, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);
			}
			resize() {
				for (let t = 0; t < this.planes.length; t++)
					this.planes[t]._canDraw && this.planes[t].resize();
				for (let t = 0; t < this.shaderPasses.length; t++)
					this.shaderPasses[t]._canDraw && this.shaderPasses[t].resize();
				for (let t = 0; t < this.renderTargets.length; t++) this.renderTargets[t].resize();
				this.needRender();
			}
			clear() {
				this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
			}
			clearDepth() {
				this.gl.clear(this.gl.DEPTH_BUFFER_BIT);
			}
			clearColor() {
				this.gl.clear(this.gl.COLOR_BUFFER_BIT);
			}
			bindFrameBuffer(t, e) {
				let s = null;
				t
					? ((s = t.index),
						s !== this.state.frameBufferID &&
							(this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, t._frameBuffer),
							this.gl.viewport(0, 0, t._size.width, t._size.height),
							t._shouldClear && !e && this.clear()))
					: this.state.frameBufferID !== null &&
						(this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null),
						this.gl.viewport(0, 0, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight)),
					(this.state.frameBufferID = s);
			}
			setDepthTest(t) {
				t && !this.state.depthTest
					? ((this.state.depthTest = t), this.gl.enable(this.gl.DEPTH_TEST))
					: !t &&
						this.state.depthTest &&
						((this.state.depthTest = t), this.gl.disable(this.gl.DEPTH_TEST));
			}
			setDepthFunc() {
				this.gl.depthFunc(this.gl.LEQUAL);
			}
			setBlending(t = !1) {
				t && !this.state.blending
					? ((this.state.blending = t), this.gl.enable(this.gl.BLEND))
					: !t &&
						this.state.blending &&
						((this.state.blending = t), this.gl.disable(this.gl.BLEND));
			}
			setBlendFunc() {
				this.gl.enable(this.gl.BLEND),
					this.premultipliedAlpha
						? this.gl.blendFuncSeparate(
								this.gl.ONE,
								this.gl.ONE_MINUS_SRC_ALPHA,
								this.gl.ONE,
								this.gl.ONE_MINUS_SRC_ALPHA
							)
						: this.gl.blendFuncSeparate(
								this.gl.SRC_ALPHA,
								this.gl.ONE_MINUS_SRC_ALPHA,
								this.gl.ONE,
								this.gl.ONE_MINUS_SRC_ALPHA
							);
			}
			setFaceCulling(t) {
				if (this.state.cullFace !== t)
					if (((this.state.cullFace = t), t === 'none')) this.gl.disable(this.gl.CULL_FACE);
					else {
						const e = t === 'front' ? this.gl.FRONT : this.gl.BACK;
						this.gl.enable(this.gl.CULL_FACE), this.gl.cullFace(e);
					}
			}
			useProgram(t) {
				(this.state.currentProgramID === null || this.state.currentProgramID !== t.id) &&
					(this.gl.useProgram(t.program), (this.state.currentProgramID = t.id));
			}
			removePlane(t) {
				this.gl &&
					((this.planes = this.planes.filter((e) => e.uuid !== t.uuid)),
					this.scene.removePlane(t),
					(t = null),
					this.gl && this.clear(),
					this.onSceneChange());
			}
			removeRenderTarget(t) {
				if (!this.gl) return;
				let e = this.planes.find(
					(s) => s.type !== 'PingPongPlane' && s.target && s.target.uuid === t.uuid
				);
				for (let s = 0; s < this.planes.length; s++)
					this.planes[s].target &&
						this.planes[s].target.uuid === t.uuid &&
						(this.planes[s].target = null);
				this.renderTargets = this.renderTargets.filter((s) => s.uuid !== t.uuid);
				for (let s = 0; s < this.renderTargets.length; s++) this.renderTargets[s].index = s;
				(t = null),
					this.gl && this.clear(),
					e && this.scene.resetPlaneStacks(),
					this.onSceneChange();
			}
			removeShaderPass(t) {
				this.gl &&
					((this.shaderPasses = this.shaderPasses.filter((e) => e.uuid !== t.uuid)),
					this.scene.removeShaderPass(t),
					(t = null),
					this.gl && this.clear(),
					this.onSceneChange());
			}
			enableDrawing() {
				this.state.drawingEnabled = !0;
			}
			disableDrawing() {
				this.state.drawingEnabled = !1;
			}
			needRender() {
				this.state.forceRender = !0;
			}
			render() {
				this.gl && (this.clear(), (this.state.currentGeometryID = null), this.scene.draw());
			}
			deletePrograms() {
				for (let t = 0; t < this.cache.programs.length; t++) {
					const e = this.cache.programs[t];
					this.gl.deleteProgram(e.program);
				}
			}
			dispose() {
				if (!this.gl) return;
				for (this.state.isActive = !1; this.planes.length > 0; ) this.removePlane(this.planes[0]);
				for (; this.shaderPasses.length > 0; ) this.removeShaderPass(this.shaderPasses[0]);
				for (; this.renderTargets.length > 0; ) this.removeRenderTarget(this.renderTargets[0]);
				let t = this.nextRender.add(() => {
					this.planes.length === 0 &&
						this.shaderPasses.length === 0 &&
						this.renderTargets.length === 0 &&
						((t.keep = !1),
						this.deletePrograms(),
						this.clear(),
						this.canvas.removeEventListener('webgllost', this._contextLostHandler, !1),
						this.canvas.removeEventListener('webglrestored', this._contextRestoredHandler, !1),
						this.gl &&
							this.extensions.WEBGL_lose_context &&
							this.extensions.WEBGL_lose_context.loseContext(),
						(this.canvas.width = this.canvas.width),
						(this.gl = null),
						this.container.removeChild(this.canvas),
						(this.container = null),
						(this.canvas = null),
						this.onDisposed && this.onDisposed());
				}, !0);
			}
		}
		class Kt {
			constructor({
				xOffset: t = 0,
				yOffset: e = 0,
				lastXDelta: s = 0,
				lastYDelta: i = 0,
				shouldWatch: r = !0,
				onScroll: n = () => {}
			} = {}) {
				(this.xOffset = t),
					(this.yOffset = e),
					(this.lastXDelta = s),
					(this.lastYDelta = i),
					(this.shouldWatch = r),
					(this.onScroll = n),
					(this.handler = this.scroll.bind(this, !0)),
					this.shouldWatch && window.addEventListener('scroll', this.handler, { passive: !0 });
			}
			scroll() {
				this.updateScrollValues(window.pageXOffset, window.pageYOffset);
			}
			updateScrollValues(t, e) {
				const s = this.xOffset;
				(this.xOffset = t), (this.lastXDelta = s - this.xOffset);
				const i = this.yOffset;
				(this.yOffset = e),
					(this.lastYDelta = i - this.yOffset),
					this.onScroll && this.onScroll(this.lastXDelta, this.lastYDelta);
			}
			dispose() {
				this.shouldWatch && window.removeEventListener('scroll', this.handler, { passive: !0 });
			}
		}
		class te {
			constructor({
				container: t,
				alpha: e = !0,
				premultipliedAlpha: s = !1,
				antialias: i = !0,
				depth: r = !0,
				failIfMajorPerformanceCaveat: n = !0,
				preserveDrawingBuffer: h = !1,
				stencil: o = !1,
				autoResize: l = !0,
				autoRender: d = !0,
				watchScroll: c = !0,
				pixelRatio: u = window.devicePixelRatio || 1,
				renderingScale: p = 1,
				production: g = !1
			} = {}) {
				(this.type = 'Curtains'),
					(this._autoResize = l),
					(this._autoRender = d),
					(this._watchScroll = c),
					(this.pixelRatio = u),
					(p = isNaN(p) ? 1 : parseFloat(p)),
					(this._renderingScale = Math.max(0.25, Math.min(1, p))),
					(this.premultipliedAlpha = s),
					(this.alpha = e),
					(this.antialias = i),
					(this.depth = r),
					(this.failIfMajorPerformanceCaveat = n),
					(this.preserveDrawingBuffer = h),
					(this.stencil = o),
					(this.production = g),
					(this.errors = !1),
					t
						? this.setContainer(t)
						: this.production ||
							m(
								this.type +
									': no container provided in the initial parameters. Use setContainer() method to set one later and initialize the WebGL context'
							);
			}
			setContainer(t) {
				if (t)
					if (typeof t == 'string')
						if (((t = document.getElementById(t)), t)) this.container = t;
						else {
							let e = document.createElement('div');
							e.setAttribute('id', 'curtains-canvas'),
								document.body.appendChild(e),
								(this.container = e),
								this.production ||
									m(
										'Curtains: no valid container HTML element or ID provided, created a div with "curtains-canvas" ID instead'
									);
						}
					else t instanceof Element && (this.container = t);
				else {
					let e = document.createElement('div');
					e.setAttribute('id', 'curtains-canvas'),
						document.body.appendChild(e),
						(this.container = e),
						this.production ||
							m(
								'Curtains: no valid container HTML element or ID provided, created a div with "curtains-canvas" ID instead'
							);
				}
				this._initCurtains();
			}
			_initCurtains() {
				(this.planes = []),
					(this.renderTargets = []),
					(this.shaderPasses = []),
					this._initRenderer(),
					this.gl &&
						(this._initScroll(),
						this._setSize(),
						this._addListeners(),
						this.container.appendChild(this.canvas),
						(this._animationFrameID = null),
						this._autoRender && this._animate());
			}
			_initRenderer() {
				(this.renderer = new Jt({
					alpha: this.alpha,
					antialias: this.antialias,
					premultipliedAlpha: this.premultipliedAlpha,
					depth: this.depth,
					failIfMajorPerformanceCaveat: this.failIfMajorPerformanceCaveat,
					preserveDrawingBuffer: this.preserveDrawingBuffer,
					stencil: this.stencil,
					container: this.container,
					pixelRatio: this.pixelRatio,
					renderingScale: this._renderingScale,
					production: this.production,
					onError: () => this._onRendererError(),
					onSuccess: () => this._onRendererSuccess(),
					onContextLost: () => this._onRendererContextLost(),
					onContextRestored: () => this._onRendererContextRestored(),
					onDisposed: () => this._onRendererDisposed(),
					onSceneChange: () => this._keepSync()
				})),
					(this.gl = this.renderer.gl),
					(this.canvas = this.renderer.canvas);
			}
			restoreContext() {
				this.renderer.restoreContext();
			}
			_animate() {
				this.render(),
					(this._animationFrameID = window.requestAnimationFrame(this._animate.bind(this)));
			}
			enableDrawing() {
				this.renderer.enableDrawing();
			}
			disableDrawing() {
				this.renderer.disableDrawing();
			}
			needRender() {
				this.renderer.needRender();
			}
			nextRender(t, e = !1) {
				return this.renderer.nextRender.add(t, e);
			}
			clear() {
				this.renderer && this.renderer.clear();
			}
			clearDepth() {
				this.renderer && this.renderer.clearDepth();
			}
			clearColor() {
				this.renderer && this.renderer.clearColor();
			}
			isWebGL2() {
				return this.gl ? this.renderer._isWebGL2 : !1;
			}
			render() {
				this.renderer.nextRender.execute(),
					!(!this.renderer.state.drawingEnabled && !this.renderer.state.forceRender) &&
						(this.renderer.state.forceRender && (this.renderer.state.forceRender = !1),
						this._onRenderCallback && this._onRenderCallback(),
						this.renderer.render());
			}
			_addListeners() {
				(this._resizeHandler = null),
					this._autoResize &&
						((this._resizeHandler = this.resize.bind(this, !0)),
						window.addEventListener('resize', this._resizeHandler, !1));
			}
			setPixelRatio(t, e) {
				(this.pixelRatio = parseFloat(Math.max(t, 1)) || 1),
					this.renderer.setPixelRatio(t),
					this.resize(e);
			}
			_setSize() {
				this.renderer.setSize(),
					this._scrollManager.shouldWatch &&
						((this._scrollManager.xOffset = window.pageXOffset),
						(this._scrollManager.yOffset = window.pageYOffset));
			}
			getBoundingRect() {
				return this.renderer._boundingRect;
			}
			resize(t) {
				this.gl &&
					(this._setSize(),
					this.renderer.resize(),
					this.nextRender(() => {
						this._onAfterResizeCallback && t && this._onAfterResizeCallback();
					}));
			}
			_initScroll() {
				this._scrollManager = new Kt({
					xOffset: window.pageXOffset,
					yOffset: 0,
					lastXDelta: 0,
					lastYDelta: 0,
					shouldWatch: this._watchScroll,
					onScroll: (t, e) => this._updateScroll(t, e)
				});
			}
			_updateScroll(t, e) {
				for (let s = 0; s < this.planes.length; s++)
					this.planes[s].watchScroll && this.planes[s].updateScrollPosition(t, e);
				this.renderer.needRender(), this._onScrollCallback && this._onScrollCallback();
			}
			updateScrollValues(t, e) {
				this._scrollManager.updateScrollValues(t, e);
			}
			getScrollDeltas() {
				return { x: this._scrollManager.lastXDelta, y: this._scrollManager.lastYDelta };
			}
			getScrollValues() {
				return { x: this._scrollManager.xOffset, y: this._scrollManager.yOffset };
			}
			_keepSync() {
				(this.planes = this.renderer.planes),
					(this.shaderPasses = this.renderer.shaderPasses),
					(this.renderTargets = this.renderer.renderTargets);
			}
			lerp(t, e, s) {
				return qt(t, e, s);
			}
			onAfterResize(t) {
				return t && (this._onAfterResizeCallback = t), this;
			}
			onError(t) {
				return t && (this._onErrorCallback = t), this;
			}
			_onRendererError() {
				setTimeout(() => {
					this._onErrorCallback && !this.errors && this._onErrorCallback(), (this.errors = !0);
				}, 0);
			}
			onSuccess(t) {
				return t && (this._onSuccessCallback = t), this;
			}
			_onRendererSuccess() {
				setTimeout(() => {
					this._onSuccessCallback && this._onSuccessCallback();
				}, 0);
			}
			onContextLost(t) {
				return t && (this._onContextLostCallback = t), this;
			}
			_onRendererContextLost() {
				this._onContextLostCallback && this._onContextLostCallback();
			}
			onContextRestored(t) {
				return t && (this._onContextRestoredCallback = t), this;
			}
			_onRendererContextRestored() {
				this._onContextRestoredCallback && this._onContextRestoredCallback();
			}
			onRender(t) {
				return t && (this._onRenderCallback = t), this;
			}
			onScroll(t) {
				return t && (this._onScrollCallback = t), this;
			}
			dispose() {
				this.renderer.dispose();
			}
			_onRendererDisposed() {
				this._animationFrameID && window.cancelAnimationFrame(this._animationFrameID),
					this._resizeHandler && window.removeEventListener('resize', this._resizeHandler, !1),
					this._scrollManager && this._scrollManager.dispose();
			}
		}
		class ee {
			constructor(t, e, s) {
				if (((this.type = 'Uniforms'), !t || t.type !== 'Renderer'))
					k(this.type + ': Renderer not passed as first argument', t);
				else if (!t.gl) {
					k(this.type + ': Renderer WebGL context is undefined', t);
					return;
				}
				if (((this.renderer = t), (this.gl = t.gl), (this.program = e), (this.uniforms = {}), s))
					for (const i in s) {
						const r = s[i];
						this.uniforms[i] = {
							name: r.name,
							type: r.type,
							value:
								r.value.clone && typeof r.value.clone == 'function' ? r.value.clone() : r.value,
							update: null
						};
					}
			}
			handleUniformSetting(t) {
				switch (t.type) {
					case '1i':
						t.update = this.setUniform1i.bind(this);
						break;
					case '1iv':
						t.update = this.setUniform1iv.bind(this);
						break;
					case '1f':
						t.update = this.setUniform1f.bind(this);
						break;
					case '1fv':
						t.update = this.setUniform1fv.bind(this);
						break;
					case '2i':
						t.update = this.setUniform2i.bind(this);
						break;
					case '2iv':
						t.update = this.setUniform2iv.bind(this);
						break;
					case '2f':
						t.update = this.setUniform2f.bind(this);
						break;
					case '2fv':
						t.update = this.setUniform2fv.bind(this);
						break;
					case '3i':
						t.update = this.setUniform3i.bind(this);
						break;
					case '3iv':
						t.update = this.setUniform3iv.bind(this);
						break;
					case '3f':
						t.update = this.setUniform3f.bind(this);
						break;
					case '3fv':
						t.update = this.setUniform3fv.bind(this);
						break;
					case '4i':
						t.update = this.setUniform4i.bind(this);
						break;
					case '4iv':
						t.update = this.setUniform4iv.bind(this);
						break;
					case '4f':
						t.update = this.setUniform4f.bind(this);
						break;
					case '4fv':
						t.update = this.setUniform4fv.bind(this);
						break;
					case 'mat2':
						t.update = this.setUniformMatrix2fv.bind(this);
						break;
					case 'mat3':
						t.update = this.setUniformMatrix3fv.bind(this);
						break;
					case 'mat4':
						t.update = this.setUniformMatrix4fv.bind(this);
						break;
					default:
						this.renderer.production ||
							m(this.type + ': This uniform type is not handled : ', t.type);
				}
			}
			setInternalFormat(t) {
				t.value.type === 'Vec2'
					? ((t._internalFormat = 'Vec2'), (t.lastValue = t.value.clone()))
					: t.value.type === 'Vec3'
						? ((t._internalFormat = 'Vec3'), (t.lastValue = t.value.clone()))
						: t.value.type === 'Mat4'
							? ((t._internalFormat = 'Mat4'), (t.lastValue = t.value.clone()))
							: t.value.type === 'Quat'
								? ((t._internalFormat = 'Quat'), (t.lastValue = t.value.clone()))
								: Array.isArray(t.value)
									? ((t._internalFormat = 'array'), (t.lastValue = Array.from(t.value)))
									: t.value.constructor === Float32Array
										? ((t._internalFormat = 'mat'), (t.lastValue = t.value))
										: ((t._internalFormat = 'float'), (t.lastValue = t.value));
			}
			setUniforms() {
				if (this.uniforms)
					for (const t in this.uniforms) {
						let e = this.uniforms[t];
						(e.location = this.gl.getUniformLocation(this.program, e.name)),
							e._internalFormat || this.setInternalFormat(e),
							e.type ||
								(e._internalFormat === 'Vec2'
									? (e.type = '2f')
									: e._internalFormat === 'Vec3'
										? (e.type = '3f')
										: e._internalFormat === 'Mat4'
											? (e.type = 'mat4')
											: e._internalFormat === 'array'
												? e.value.length === 4
													? ((e.type = '4f'),
														this.renderer.production ||
															m(
																this.type +
																	': No uniform type declared for ' +
																	e.name +
																	', applied a 4f (array of 4 floats) uniform type'
															))
													: e.value.length === 3
														? ((e.type = '3f'),
															this.renderer.production ||
																m(
																	this.type +
																		': No uniform type declared for ' +
																		e.name +
																		', applied a 3f (array of 3 floats) uniform type'
																))
														: e.value.length === 2 &&
															((e.type = '2f'),
															this.renderer.production ||
																m(
																	this.type +
																		': No uniform type declared for ' +
																		e.name +
																		', applied a 2f (array of 2 floats) uniform type'
																))
												: e._internalFormat === 'mat'
													? e.value.length === 16
														? ((e.type = 'mat4'),
															this.renderer.production ||
																m(
																	this.type +
																		': No uniform type declared for ' +
																		e.name +
																		', applied a mat4 (4x4 matrix array) uniform type'
																))
														: e.value.length === 9
															? ((e.type = 'mat3'),
																this.renderer.production ||
																	m(
																		this.type +
																			': No uniform type declared for ' +
																			e.name +
																			', applied a mat3 (3x3 matrix array) uniform type'
																	))
															: e.value.length === 4 &&
																((e.type = 'mat2'),
																this.renderer.production ||
																	m(
																		this.type +
																			': No uniform type declared for ' +
																			e.name +
																			', applied a mat2 (2x2 matrix array) uniform type'
																	))
													: ((e.type = '1f'),
														this.renderer.production ||
															m(
																this.type +
																	': No uniform type declared for ' +
																	e.name +
																	', applied a 1f (float) uniform type'
															))),
							this.handleUniformSetting(e),
							e.update && e.update(e);
					}
			}
			updateUniforms() {
				if (this.uniforms)
					for (const t in this.uniforms) {
						const e = this.uniforms[t];
						let s = !1;
						e._internalFormat === 'Vec2' ||
						e._internalFormat === 'Vec3' ||
						e._internalFormat === 'Quat'
							? e.value.equals(e.lastValue) || ((s = !0), e.lastValue.copy(e.value))
							: e.value.length
								? JSON.stringify(e.value) !== JSON.stringify(e.lastValue) &&
									((s = !0), (e.lastValue = Array.from(e.value)))
								: e.value !== e.lastValue && ((s = !0), (e.lastValue = e.value)),
							s && e.update && e.update(e);
					}
			}
			setUniform1i(t) {
				this.gl.uniform1i(t.location, t.value);
			}
			setUniform1iv(t) {
				this.gl.uniform1iv(t.location, t.value);
			}
			setUniform1f(t) {
				this.gl.uniform1f(t.location, t.value);
			}
			setUniform1fv(t) {
				this.gl.uniform1fv(t.location, t.value);
			}
			setUniform2i(t) {
				t._internalFormat === 'Vec2'
					? this.gl.uniform2i(t.location, t.value.x, t.value.y)
					: this.gl.uniform2i(t.location, t.value[0], t.value[1]);
			}
			setUniform2iv(t) {
				t._internalFormat === 'Vec2'
					? this.gl.uniform2iv(t.location, [t.value.x, t.value.y])
					: this.gl.uniform2iv(t.location, t.value);
			}
			setUniform2f(t) {
				t._internalFormat === 'Vec2'
					? this.gl.uniform2f(t.location, t.value.x, t.value.y)
					: this.gl.uniform2f(t.location, t.value[0], t.value[1]);
			}
			setUniform2fv(t) {
				t._internalFormat === 'Vec2'
					? this.gl.uniform2fv(t.location, [t.value.x, t.value.y])
					: this.gl.uniform2fv(t.location, t.value);
			}
			setUniform3i(t) {
				t._internalFormat === 'Vec3'
					? this.gl.uniform3i(t.location, t.value.x, t.value.y, t.value.z)
					: this.gl.uniform3i(t.location, t.value[0], t.value[1], t.value[2]);
			}
			setUniform3iv(t) {
				t._internalFormat === 'Vec3'
					? this.gl.uniform3iv(t.location, [t.value.x, t.value.y, t.value.z])
					: this.gl.uniform3iv(t.location, t.value);
			}
			setUniform3f(t) {
				t._internalFormat === 'Vec3'
					? this.gl.uniform3f(t.location, t.value.x, t.value.y, t.value.z)
					: this.gl.uniform3f(t.location, t.value[0], t.value[1], t.value[2]);
			}
			setUniform3fv(t) {
				t._internalFormat === 'Vec3'
					? this.gl.uniform3fv(t.location, [t.value.x, t.value.y, t.value.z])
					: this.gl.uniform3fv(t.location, t.value);
			}
			setUniform4i(t) {
				t._internalFormat === 'Quat'
					? this.gl.uniform4i(
							t.location,
							t.value.elements[0],
							t.value.elements[1],
							t.value.elements[2],
							t.value[3]
						)
					: this.gl.uniform4i(t.location, t.value[0], t.value[1], t.value[2], t.value[3]);
			}
			setUniform4iv(t) {
				t._internalFormat === 'Quat'
					? this.gl.uniform4iv(t.location, [
							t.value.elements[0],
							t.value.elements[1],
							t.value.elements[2],
							t.value[3]
						])
					: this.gl.uniform4iv(t.location, t.value);
			}
			setUniform4f(t) {
				t._internalFormat === 'Quat'
					? this.gl.uniform4f(
							t.location,
							t.value.elements[0],
							t.value.elements[1],
							t.value.elements[2],
							t.value[3]
						)
					: this.gl.uniform4f(t.location, t.value[0], t.value[1], t.value[2], t.value[3]);
			}
			setUniform4fv(t) {
				t._internalFormat === 'Quat'
					? this.gl.uniform4fv(t.location, [
							t.value.elements[0],
							t.value.elements[1],
							t.value.elements[2],
							t.value[3]
						])
					: this.gl.uniform4fv(t.location, t.value);
			}
			setUniformMatrix2fv(t) {
				this.gl.uniformMatrix2fv(t.location, !1, t.value);
			}
			setUniformMatrix3fv(t) {
				this.gl.uniformMatrix3fv(t.location, !1, t.value);
			}
			setUniformMatrix4fv(t) {
				t._internalFormat === 'Mat4'
					? this.gl.uniformMatrix4fv(t.location, !1, t.value.elements)
					: this.gl.uniformMatrix4fv(t.location, !1, t.value);
			}
		}
		const rt = `
precision mediump float;
`.replace(/\n/g, ''),
			wt = `
attribute vec3 aVertexPosition;
attribute vec2 aTextureCoord;
`.replace(/\n/g, ''),
			at = `
varying vec3 vVertexPosition;
varying vec2 vTextureCoord;
`.replace(/\n/g, ''),
			se = (
				rt +
				wt +
				at +
				`
uniform mat4 uMVMatrix;
uniform mat4 uPMatrix;

void main() {
    vTextureCoord = aTextureCoord;
    vVertexPosition = aVertexPosition;
    
    gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);
}
`
			).replace(/\n/g, ''),
			ie = (
				rt +
				at +
				`
void main() {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
}
`
			).replace(/\n/g, ''),
			re = (
				rt +
				wt +
				at +
				`
void main() {
    vTextureCoord = aTextureCoord;
    vVertexPosition = aVertexPosition;
    
    gl_Position = vec4(aVertexPosition, 1.0);
}
`
			).replace(/\n/g, ''),
			ae = (
				rt +
				at +
				`
uniform sampler2D uRenderTexture;

void main() {
    gl_FragColor = texture2D(uRenderTexture, vTextureCoord);
}
`
			).replace(/\n/g, '');
		let Pt = 0;
		class Tt {
			constructor(t, { parent: e, vertexShader: s, fragmentShader: i } = {}) {
				if (((this.type = 'Program'), !t || t.type !== 'Renderer'))
					k(this.type + ': Renderer not passed as first argument', t);
				else if (!t.gl) {
					k(this.type + ': Renderer WebGL context is undefined', t);
					return;
				}
				(this.renderer = t),
					(this.gl = this.renderer.gl),
					(this.parent = e),
					(this.defaultVsCode = this.parent.type === 'Plane' ? se : re),
					(this.defaultFsCode = this.parent.type === 'Plane' ? ie : ae),
					s
						? (this.vsCode = s)
						: (!this.renderer.production &&
								this.parent.type === 'Plane' &&
								m(this.parent.type + ': No vertex shader provided, will use a default one'),
							(this.vsCode = this.defaultVsCode)),
					i
						? (this.fsCode = i)
						: (this.renderer.production ||
								m(this.parent.type + ': No fragment shader provided, will use a default one'),
							(this.fsCode = this.defaultFsCode)),
					(this.compiled = !0),
					this.setupProgram();
			}
			createShader(t, e) {
				const s = this.gl.createShader(e);
				if (
					(this.gl.shaderSource(s, t),
					this.gl.compileShader(s),
					!this.renderer.production && !this.gl.getShaderParameter(s, this.gl.COMPILE_STATUS))
				) {
					const i = e === this.gl.VERTEX_SHADER ? 'vertex shader' : 'fragment shader';
					let r = this.gl.getShaderSource(s).split(`
`);
					for (let n = 0; n < r.length; n++) r[n] = n + 1 + ': ' + r[n];
					return (
						(r = r.join(`
`)),
						m(
							this.type + ': Errors occurred while compiling the',
							i,
							`:
`,
							this.gl.getShaderInfoLog(s)
						),
						k(r),
						m(this.type + ': Will use a default', i),
						this.createShader(
							e === this.gl.VERTEX_SHADER ? this.defaultVsCode : this.defaultFsCode,
							e
						)
					);
				}
				return s;
			}
			useNewShaders() {
				(this.vertexShader = this.createShader(this.vsCode, this.gl.VERTEX_SHADER)),
					(this.fragmentShader = this.createShader(this.fsCode, this.gl.FRAGMENT_SHADER)),
					(!this.vertexShader || !this.fragmentShader) &&
						(this.renderer.production ||
							m(this.type + ': Unable to find or compile the vertex or fragment shader'));
			}
			setupProgram() {
				let t = this.renderer.cache.getProgramFromShaders(this.vsCode, this.fsCode);
				t
					? ((this.vertexShader = t.vertexShader),
						(this.fragmentShader = t.fragmentShader),
						(this.activeUniforms = t.activeUniforms),
						(this.activeAttributes = t.activeAttributes),
						this.createProgram())
					: (this.useNewShaders(),
						this.compiled && (this.createProgram(), this.renderer.cache.addProgram(this)));
			}
			createProgram() {
				if (
					(Pt++,
					(this.id = Pt),
					(this.program = this.gl.createProgram()),
					this.gl.attachShader(this.program, this.vertexShader),
					this.gl.attachShader(this.program, this.fragmentShader),
					this.gl.linkProgram(this.program),
					!this.renderer.production &&
						!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS))
				) {
					m(
						this.type +
							': Unable to initialize the shader program: ' +
							this.gl.getProgramInfoLog(this.program)
					),
						m(this.type + ': Will use default vertex and fragment shaders'),
						(this.vertexShader = this.createShader(this.defaultVsCode, this.gl.VERTEX_SHADER)),
						(this.fragmentShader = this.createShader(this.defaultFsCode, this.gl.FRAGMENT_SHADER)),
						this.createProgram();
					return;
				}
				if (
					(this.gl.deleteShader(this.vertexShader),
					this.gl.deleteShader(this.fragmentShader),
					!this.activeUniforms || !this.activeAttributes)
				) {
					this.activeUniforms = { textures: [], textureMatrices: [] };
					const t = this.gl.getProgramParameter(this.program, this.gl.ACTIVE_UNIFORMS);
					for (let s = 0; s < t; s++) {
						const i = this.gl.getActiveUniform(this.program, s);
						i.type === this.gl.SAMPLER_2D && this.activeUniforms.textures.push(i.name),
							i.type === this.gl.FLOAT_MAT4 &&
								i.name !== 'uMVMatrix' &&
								i.name !== 'uPMatrix' &&
								this.activeUniforms.textureMatrices.push(i.name);
					}
					this.activeAttributes = [];
					const e = this.gl.getProgramParameter(this.program, this.gl.ACTIVE_ATTRIBUTES);
					for (let s = 0; s < e; s++) {
						const i = this.gl.getActiveAttrib(this.program, s);
						this.activeAttributes.push(i.name);
					}
				}
			}
			createUniforms(t) {
				(this.uniformsManager = new ee(this.renderer, this.program, t)), this.setUniforms();
			}
			setUniforms() {
				this.renderer.useProgram(this), this.uniformsManager.setUniforms();
			}
			updateUniforms() {
				this.renderer.useProgram(this), this.uniformsManager.updateUniforms();
			}
		}
		class ne {
			constructor(t, { program: e = null, width: s = 1, height: i = 1 } = {}) {
				if (((this.type = 'Geometry'), !t || t.type !== 'Renderer'))
					k(this.type + ': Renderer not passed as first argument', t);
				else if (!t.gl) {
					k(this.type + ': Renderer WebGL context is undefined', t);
					return;
				}
				(this.renderer = t),
					(this.gl = this.renderer.gl),
					(this.definition = { id: s * i + s, width: s, height: i }),
					this.setDefaultAttributes(),
					this.setVerticesUVs();
			}
			restoreContext(t) {
				(this.program = null),
					this.setDefaultAttributes(),
					this.setVerticesUVs(),
					this.setProgram(t);
			}
			setDefaultAttributes() {
				this.attributes = {
					vertexPosition: { name: 'aVertexPosition', size: 3, isActive: !1 },
					textureCoord: { name: 'aTextureCoord', size: 3, isActive: !1 }
				};
			}
			setVerticesUVs() {
				const t = this.renderer.cache.getGeometryFromID(this.definition.id);
				t
					? ((this.attributes.vertexPosition.array = t.vertices),
						(this.attributes.textureCoord.array = t.uvs))
					: (this.computeVerticesUVs(),
						this.renderer.cache.addGeometry(
							this.definition.id,
							this.attributes.vertexPosition.array,
							this.attributes.textureCoord.array
						));
			}
			setProgram(t) {
				(this.program = t),
					this.initAttributes(),
					this.renderer._isWebGL2
						? ((this._vao = this.gl.createVertexArray()), this.gl.bindVertexArray(this._vao))
						: this.renderer.extensions.OES_vertex_array_object &&
							((this._vao =
								this.renderer.extensions.OES_vertex_array_object.createVertexArrayOES()),
							this.renderer.extensions.OES_vertex_array_object.bindVertexArrayOES(this._vao)),
					this.initializeBuffers();
			}
			initAttributes() {
				for (const t in this.attributes) {
					if (
						((this.attributes[t].isActive = this.program.activeAttributes.includes(
							this.attributes[t].name
						)),
						!this.attributes[t].isActive)
					)
						return;
					(this.attributes[t].location = this.gl.getAttribLocation(
						this.program.program,
						this.attributes[t].name
					)),
						(this.attributes[t].buffer = this.gl.createBuffer()),
						(this.attributes[t].numberOfItems =
							this.definition.width * this.definition.height * this.attributes[t].size * 2);
				}
			}
			computeVerticesUVs() {
				(this.attributes.vertexPosition.array = []), (this.attributes.textureCoord.array = []);
				const t = this.attributes.vertexPosition.array,
					e = this.attributes.textureCoord.array;
				for (let s = 0; s < this.definition.height; s++) {
					const i = s / this.definition.height;
					for (let r = 0; r < this.definition.width; r++) {
						const n = r / this.definition.width;
						e.push(n),
							e.push(i),
							e.push(0),
							t.push((n - 0.5) * 2),
							t.push((i - 0.5) * 2),
							t.push(0),
							e.push(n + 1 / this.definition.width),
							e.push(i),
							e.push(0),
							t.push((n + 1 / this.definition.width - 0.5) * 2),
							t.push((i - 0.5) * 2),
							t.push(0),
							e.push(n),
							e.push(i + 1 / this.definition.height),
							e.push(0),
							t.push((n - 0.5) * 2),
							t.push((i + 1 / this.definition.height - 0.5) * 2),
							t.push(0),
							e.push(n),
							e.push(i + 1 / this.definition.height),
							e.push(0),
							t.push((n - 0.5) * 2),
							t.push((i + 1 / this.definition.height - 0.5) * 2),
							t.push(0),
							e.push(n + 1 / this.definition.width),
							e.push(i),
							e.push(0),
							t.push((n + 1 / this.definition.width - 0.5) * 2),
							t.push((i - 0.5) * 2),
							t.push(0),
							e.push(n + 1 / this.definition.width),
							e.push(i + 1 / this.definition.height),
							e.push(0),
							t.push((n + 1 / this.definition.width - 0.5) * 2),
							t.push((i + 1 / this.definition.height - 0.5) * 2),
							t.push(0);
					}
				}
			}
			initializeBuffers() {
				if (this.attributes) {
					for (const t in this.attributes) {
						if (!this.attributes[t].isActive) return;
						this.gl.enableVertexAttribArray(this.attributes[t].location),
							this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.attributes[t].buffer),
							this.gl.bufferData(
								this.gl.ARRAY_BUFFER,
								new Float32Array(this.attributes[t].array),
								this.gl.STATIC_DRAW
							),
							this.gl.vertexAttribPointer(
								this.attributes[t].location,
								this.attributes[t].size,
								this.gl.FLOAT,
								!1,
								0,
								0
							);
					}
					this.renderer.state.currentGeometryID = this.definition.id;
				}
			}
			bindBuffers() {
				if (this._vao)
					this.renderer._isWebGL2
						? this.gl.bindVertexArray(this._vao)
						: this.renderer.extensions.OES_vertex_array_object.bindVertexArrayOES(this._vao);
				else
					for (const t in this.attributes) {
						if (!this.attributes[t].isActive) return;
						this.gl.enableVertexAttribArray(this.attributes[t].location),
							this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.attributes[t].buffer),
							this.gl.vertexAttribPointer(
								this.attributes[t].location,
								this.attributes[t].size,
								this.gl.FLOAT,
								!1,
								0,
								0
							);
					}
				this.renderer.state.currentGeometryID = this.definition.id;
			}
			draw() {
				this.gl.drawArrays(this.gl.TRIANGLES, 0, this.attributes.vertexPosition.numberOfItems);
			}
			dispose() {
				this._vao &&
					(this.renderer._isWebGL2
						? this.gl.deleteVertexArray(this._vao)
						: this.renderer.extensions.OES_vertex_array_object.deleteVertexArrayOES(this._vao));
				for (const t in this.attributes) {
					if (!this.attributes[t].isActive) return;
					this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.attributes[t].buffer),
						this.gl.bufferData(this.gl.ARRAY_BUFFER, 1, this.gl.STATIC_DRAW),
						this.gl.deleteBuffer(this.attributes[t].buffer);
				}
				(this.attributes = null), (this.renderer.state.currentGeometryID = null);
			}
		}
		class N {
			constructor(t = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1])) {
				(this.type = 'Mat4'), (this.elements = t);
			}
			setFromArray(t) {
				for (let e = 0; e < this.elements.length; e++) this.elements[e] = t[e];
				return this;
			}
			copy(t) {
				const e = t.elements;
				return (
					(this.elements[0] = e[0]),
					(this.elements[1] = e[1]),
					(this.elements[2] = e[2]),
					(this.elements[3] = e[3]),
					(this.elements[4] = e[4]),
					(this.elements[5] = e[5]),
					(this.elements[6] = e[6]),
					(this.elements[7] = e[7]),
					(this.elements[8] = e[8]),
					(this.elements[9] = e[9]),
					(this.elements[10] = e[10]),
					(this.elements[11] = e[11]),
					(this.elements[12] = e[12]),
					(this.elements[13] = e[13]),
					(this.elements[14] = e[14]),
					(this.elements[15] = e[15]),
					this
				);
			}
			clone() {
				return new N().copy(this);
			}
			multiply(t) {
				const e = this.elements,
					s = t.elements;
				let i = new N();
				return (
					(i.elements[0] = s[0] * e[0] + s[1] * e[4] + s[2] * e[8] + s[3] * e[12]),
					(i.elements[1] = s[0] * e[1] + s[1] * e[5] + s[2] * e[9] + s[3] * e[13]),
					(i.elements[2] = s[0] * e[2] + s[1] * e[6] + s[2] * e[10] + s[3] * e[14]),
					(i.elements[3] = s[0] * e[3] + s[1] * e[7] + s[2] * e[11] + s[3] * e[15]),
					(i.elements[4] = s[4] * e[0] + s[5] * e[4] + s[6] * e[8] + s[7] * e[12]),
					(i.elements[5] = s[4] * e[1] + s[5] * e[5] + s[6] * e[9] + s[7] * e[13]),
					(i.elements[6] = s[4] * e[2] + s[5] * e[6] + s[6] * e[10] + s[7] * e[14]),
					(i.elements[7] = s[4] * e[3] + s[5] * e[7] + s[6] * e[11] + s[7] * e[15]),
					(i.elements[8] = s[8] * e[0] + s[9] * e[4] + s[10] * e[8] + s[11] * e[12]),
					(i.elements[9] = s[8] * e[1] + s[9] * e[5] + s[10] * e[9] + s[11] * e[13]),
					(i.elements[10] = s[8] * e[2] + s[9] * e[6] + s[10] * e[10] + s[11] * e[14]),
					(i.elements[11] = s[8] * e[3] + s[9] * e[7] + s[10] * e[11] + s[11] * e[15]),
					(i.elements[12] = s[12] * e[0] + s[13] * e[4] + s[14] * e[8] + s[15] * e[12]),
					(i.elements[13] = s[12] * e[1] + s[13] * e[5] + s[14] * e[9] + s[15] * e[13]),
					(i.elements[14] = s[12] * e[2] + s[13] * e[6] + s[14] * e[10] + s[15] * e[14]),
					(i.elements[15] = s[12] * e[3] + s[13] * e[7] + s[14] * e[11] + s[15] * e[15]),
					i
				);
			}
			getInverse() {
				const t = this.elements,
					e = new N(),
					s = e.elements;
				let i = t[0],
					r = t[1],
					n = t[2],
					h = t[3],
					o = t[4],
					l = t[5],
					d = t[6],
					c = t[7],
					u = t[8],
					p = t[9],
					g = t[10],
					x = t[11],
					E = t[12],
					_ = t[13],
					f = t[14],
					y = t[15],
					v = i * l - r * o,
					T = i * d - n * o,
					R = i * c - h * o,
					w = r * d - n * l,
					I = r * c - h * l,
					M = n * c - h * d,
					S = u * _ - p * E,
					O = u * f - g * E,
					j = u * y - x * E,
					X = p * f - g * _,
					Y = p * y - x * _,
					q = g * y - x * f,
					C = v * q - T * Y + R * X + w * j - I * O + M * S;
				return C
					? ((C = 1 / C),
						(s[0] = (l * q - d * Y + c * X) * C),
						(s[1] = (n * Y - r * q - h * X) * C),
						(s[2] = (_ * M - f * I + y * w) * C),
						(s[3] = (g * I - p * M - x * w) * C),
						(s[4] = (d * j - o * q - c * O) * C),
						(s[5] = (i * q - n * j + h * O) * C),
						(s[6] = (f * R - E * M - y * T) * C),
						(s[7] = (u * M - g * R + x * T) * C),
						(s[8] = (o * Y - l * j + c * S) * C),
						(s[9] = (r * j - i * Y - h * S) * C),
						(s[10] = (E * I - _ * R + y * v) * C),
						(s[11] = (p * R - u * I - x * v) * C),
						(s[12] = (l * O - o * X - d * S) * C),
						(s[13] = (i * X - r * O + n * S) * C),
						(s[14] = (_ * T - E * w - f * v) * C),
						(s[15] = (u * w - p * T + g * v) * C),
						e)
					: null;
			}
			scale(t) {
				let e = this.elements;
				return (
					(e[0] *= t.x),
					(e[1] *= t.x),
					(e[2] *= t.x),
					(e[3] *= t.x),
					(e[4] *= t.y),
					(e[5] *= t.y),
					(e[6] *= t.y),
					(e[7] *= t.y),
					(e[8] *= t.z),
					(e[9] *= t.z),
					(e[10] *= t.z),
					(e[11] *= t.z),
					this
				);
			}
			compose(t, e, s) {
				let i = this.elements;
				const r = e.elements[0],
					n = e.elements[1],
					h = e.elements[2],
					o = e.elements[3],
					l = r + r,
					d = n + n,
					c = h + h,
					u = r * l,
					p = r * d,
					g = r * c,
					x = n * d,
					E = n * c,
					_ = h * c,
					f = o * l,
					y = o * d,
					v = o * c,
					T = s.x,
					R = s.y,
					w = s.z;
				return (
					(i[0] = (1 - (x + _)) * T),
					(i[1] = (p + v) * T),
					(i[2] = (g - y) * T),
					(i[3] = 0),
					(i[4] = (p - v) * R),
					(i[5] = (1 - (u + _)) * R),
					(i[6] = (E + f) * R),
					(i[7] = 0),
					(i[8] = (g + y) * w),
					(i[9] = (E - f) * w),
					(i[10] = (1 - (u + x)) * w),
					(i[11] = 0),
					(i[12] = t.x),
					(i[13] = t.y),
					(i[14] = t.z),
					(i[15] = 1),
					this
				);
			}
			composeFromOrigin(t, e, s, i) {
				let r = this.elements;
				const n = e.elements[0],
					h = e.elements[1],
					o = e.elements[2],
					l = e.elements[3],
					d = n + n,
					c = h + h,
					u = o + o,
					p = n * d,
					g = n * c,
					x = n * u,
					E = h * c,
					_ = h * u,
					f = o * u,
					y = l * d,
					v = l * c,
					T = l * u,
					R = s.x,
					w = s.y,
					I = s.z,
					M = i.x,
					S = i.y,
					O = i.z,
					j = (1 - (E + f)) * R,
					X = (g + T) * R,
					Y = (x - v) * R,
					q = (g - T) * w,
					C = (1 - (p + f)) * w,
					Nt = (_ + y) * w,
					Ht = (x + v) * I,
					jt = (_ - y) * I,
					Gt = (1 - (p + E)) * I;
				return (
					(r[0] = j),
					(r[1] = X),
					(r[2] = Y),
					(r[3] = 0),
					(r[4] = q),
					(r[5] = C),
					(r[6] = Nt),
					(r[7] = 0),
					(r[8] = Ht),
					(r[9] = jt),
					(r[10] = Gt),
					(r[11] = 0),
					(r[12] = t.x + M - (j * M + q * S + Ht * O)),
					(r[13] = t.y + S - (X * M + C * S + jt * O)),
					(r[14] = t.z + O - (Y * M + Nt * S + Gt * O)),
					(r[15] = 1),
					this
				);
			}
		}
		class F {
			constructor(t = 0, e = t) {
				(this.type = 'Vec2'), (this._x = t), (this._y = e);
			}
			get x() {
				return this._x;
			}
			get y() {
				return this._y;
			}
			set x(t) {
				const e = t !== this._x;
				(this._x = t), e && this._onChangeCallback && this._onChangeCallback();
			}
			set y(t) {
				const e = t !== this._y;
				(this._y = t), e && this._onChangeCallback && this._onChangeCallback();
			}
			onChange(t) {
				return t && (this._onChangeCallback = t), this;
			}
			set(t, e) {
				return (this._x = t), (this._y = e), this;
			}
			add(t) {
				return (this._x += t.x), (this._y += t.y), this;
			}
			addScalar(t) {
				return (this._x += t), (this._y += t), this;
			}
			sub(t) {
				return (this._x -= t.x), (this._y -= t.y), this;
			}
			subScalar(t) {
				return (this._x -= t), (this._y -= t), this;
			}
			multiply(t) {
				return (this._x *= t.x), (this._y *= t.y), this;
			}
			multiplyScalar(t) {
				return (this._x *= t), (this._y *= t), this;
			}
			copy(t) {
				return (this._x = t.x), (this._y = t.y), this;
			}
			clone() {
				return new F(this._x, this._y);
			}
			sanitizeNaNValuesWith(t) {
				return (
					(this._x = isNaN(this._x) ? t.x : parseFloat(this._x)),
					(this._y = isNaN(this._y) ? t.y : parseFloat(this._y)),
					this
				);
			}
			max(t) {
				return (this._x = Math.max(this._x, t.x)), (this._y = Math.max(this._y, t.y)), this;
			}
			min(t) {
				return (this._x = Math.min(this._x, t.x)), (this._y = Math.min(this._y, t.y)), this;
			}
			equals(t) {
				return this._x === t.x && this._y === t.y;
			}
			normalize() {
				let t = this._x * this._x + this._y * this._y;
				return t > 0 && (t = 1 / Math.sqrt(t)), (this._x *= t), (this._y *= t), this;
			}
			dot(t) {
				return this._x * t.x + this._y * t.y;
			}
		}
		class P {
			constructor(t = 0, e = t, s = t) {
				(this.type = 'Vec3'), (this._x = t), (this._y = e), (this._z = s);
			}
			get x() {
				return this._x;
			}
			get y() {
				return this._y;
			}
			get z() {
				return this._z;
			}
			set x(t) {
				const e = t !== this._x;
				(this._x = t), e && this._onChangeCallback && this._onChangeCallback();
			}
			set y(t) {
				const e = t !== this._y;
				(this._y = t), e && this._onChangeCallback && this._onChangeCallback();
			}
			set z(t) {
				const e = t !== this._z;
				(this._z = t), e && this._onChangeCallback && this._onChangeCallback();
			}
			onChange(t) {
				return t && (this._onChangeCallback = t), this;
			}
			set(t, e, s) {
				return (this._x = t), (this._y = e), (this._z = s), this;
			}
			add(t) {
				return (this._x += t.x), (this._y += t.y), (this._z += t.z), this;
			}
			addScalar(t) {
				return (this._x += t), (this._y += t), (this._z += t), this;
			}
			sub(t) {
				return (this._x -= t.x), (this._y -= t.y), (this._z -= t.z), this;
			}
			subScalar(t) {
				return (this._x -= t), (this._y -= t), (this._z -= t), this;
			}
			multiply(t) {
				return (this._x *= t.x), (this._y *= t.y), (this._z *= t.z), this;
			}
			multiplyScalar(t) {
				return (this._x *= t), (this._y *= t), (this._z *= t), this;
			}
			copy(t) {
				return (this._x = t.x), (this._y = t.y), (this._z = t.z), this;
			}
			clone() {
				return new P(this._x, this._y, this._z);
			}
			sanitizeNaNValuesWith(t) {
				return (
					(this._x = isNaN(this._x) ? t.x : parseFloat(this._x)),
					(this._y = isNaN(this._y) ? t.y : parseFloat(this._y)),
					(this._z = isNaN(this._z) ? t.z : parseFloat(this._z)),
					this
				);
			}
			max(t) {
				return (
					(this._x = Math.max(this._x, t.x)),
					(this._y = Math.max(this._y, t.y)),
					(this._z = Math.max(this._z, t.z)),
					this
				);
			}
			min(t) {
				return (
					(this._x = Math.min(this._x, t.x)),
					(this._y = Math.min(this._y, t.y)),
					(this._z = Math.min(this._z, t.z)),
					this
				);
			}
			equals(t) {
				return this._x === t.x && this._y === t.y && this._z === t.z;
			}
			normalize() {
				let t = this._x * this._x + this._y * this._y + this._z * this._z;
				return (
					t > 0 && (t = 1 / Math.sqrt(t)), (this._x *= t), (this._y *= t), (this._z *= t), this
				);
			}
			dot(t) {
				return this._x * t.x + this._y * t.y + this._z * t.z;
			}
			applyMat4(t) {
				const e = this._x,
					s = this._y,
					i = this._z,
					r = t.elements;
				let n = r[3] * e + r[7] * s + r[11] * i + r[15];
				return (
					(n = n || 1),
					(this._x = (r[0] * e + r[4] * s + r[8] * i + r[12]) / n),
					(this._y = (r[1] * e + r[5] * s + r[9] * i + r[13]) / n),
					(this._z = (r[2] * e + r[6] * s + r[10] * i + r[14]) / n),
					this
				);
			}
			applyQuat(t) {
				const e = this._x,
					s = this._y,
					i = this._z,
					r = t.elements[0],
					n = t.elements[1],
					h = t.elements[2],
					o = t.elements[3],
					l = o * e + n * i - h * s,
					d = o * s + h * e - r * i,
					c = o * i + r * s - n * e,
					u = -r * e - n * s - h * i;
				return (
					(this._x = l * o + u * -r + d * -h - c * -n),
					(this._y = d * o + u * -n + c * -r - l * -h),
					(this._z = c * o + u * -h + l * -n - d * -r),
					this
				);
			}
			project(t) {
				return this.applyMat4(t.viewMatrix).applyMat4(t.projectionMatrix), this;
			}
			unproject(t) {
				return this.applyMat4(t.projectionMatrix.getInverse()).applyMat4(t.worldMatrix), this;
			}
		}
		const gt = new F(),
			he = new P(),
			oe = new N();
		class Z {
			constructor(
				t,
				{
					isFBOTexture: e = !1,
					fromTexture: s = !1,
					loader: i,
					sampler: r,
					floatingPoint: n = 'none',
					premultiplyAlpha: h = !1,
					anisotropy: o = 1,
					generateMipmap: l = null,
					wrapS: d,
					wrapT: c,
					minFilter: u,
					magFilter: p
				} = {}
			) {
				if (((this.type = 'Texture'), (t = (t && t.renderer) || t), !t || t.type !== 'Renderer'))
					k(this.type + ': Renderer not passed as first argument', t);
				else if (!t.gl) {
					t.production ||
						k(
							this.type +
								': Unable to create a ' +
								this.type +
								' because the Renderer WebGL context is not defined'
						);
					return;
				}
				if (
					((this.renderer = t),
					(this.gl = this.renderer.gl),
					(this.uuid = pt()),
					(this._globalParameters = {
						unpackAlignment: 4,
						flipY: !e,
						premultiplyAlpha: !1,
						shouldPremultiplyAlpha: h,
						floatingPoint: n,
						type: this.gl.UNSIGNED_BYTE,
						internalFormat: this.gl.RGBA,
						format: this.gl.RGBA
					}),
					(this.parameters = {
						anisotropy: o,
						generateMipmap: l,
						wrapS: d || this.gl.CLAMP_TO_EDGE,
						wrapT: c || this.gl.CLAMP_TO_EDGE,
						minFilter: u || this.gl.LINEAR,
						magFilter: p || this.gl.LINEAR,
						_shouldUpdate: !0
					}),
					this._initState(),
					(this.sourceType = e ? 'fbo' : 'empty'),
					(this._useCache = !0),
					(this._samplerName = r),
					(this._sampler = { isActive: !1, isTextureBound: !1, texture: this.gl.createTexture() }),
					(this._textureMatrix = { matrix: new N(), isActive: !1 }),
					(this._size = { width: 1, height: 1 }),
					(this.scale = new F(1)),
					this.scale.onChange(() => this.resize()),
					(this.offset = new F()),
					this.offset.onChange(() => this.resize()),
					(this._loader = i),
					(this._sourceLoaded = !1),
					(this._uploaded = !1),
					(this._willUpdate = !1),
					(this.shouldUpdate = !1),
					(this._forceUpdate = !1),
					(this.userData = {}),
					(this._canDraw = !1),
					s)
				) {
					(this._copyOnInit = !0), (this._copiedFrom = s);
					return;
				}
				(this._copyOnInit = !1), this._initTexture();
			}
			_initState() {
				this._state = {
					anisotropy: 1,
					generateMipmap: !1,
					wrapS: null,
					wrapT: null,
					minFilter: null,
					magFilter: this.gl.LINEAR
				};
			}
			_initTexture() {
				this.gl.bindTexture(this.gl.TEXTURE_2D, this._sampler.texture),
					this.sourceType === 'empty' &&
						((this._globalParameters.flipY = !1),
						this._updateGlobalTexParameters(),
						this.gl.texImage2D(
							this.gl.TEXTURE_2D,
							0,
							this.gl.RGBA,
							1,
							1,
							0,
							this.gl.RGBA,
							this.gl.UNSIGNED_BYTE,
							new Uint8Array([0, 0, 0, 255])
						),
						(this._canDraw = !0));
			}
			_restoreFromTexture() {
				this._copyOnInit || this._initTexture(),
					this._parent && (this._setTextureUniforms(), this._setSize()),
					this.copy(this._copiedFrom),
					(this._canDraw = !0);
			}
			_restoreContext() {
				if (
					((this._canDraw = !1),
					(this._sampler.texture = this.gl.createTexture()),
					(this._sampler.isActive = !1),
					(this._sampler.isTextureBound = !1),
					(this._textureMatrix.isActive = !1),
					this._initState(),
					(this._state.generateMipmap = !1),
					(this.parameters._shouldUpdate = !0),
					!this._copiedFrom)
				)
					this._initTexture(),
						this._parent && this._setParent(),
						this.source &&
							(this.setSource(this.source),
							this.sourceType === 'image'
								? this.renderer.cache.addTexture(this)
								: this.needUpdate()),
						(this._canDraw = !0);
				else {
					const t = this.renderer.nextRender.add(() => {
						this._copiedFrom._canDraw && (this._restoreFromTexture(), (t.keep = !1));
					}, !0);
				}
			}
			addParent(t) {
				if (
					!t ||
					(t.type !== 'Plane' &&
						t.type !== 'PingPongPlane' &&
						t.type !== 'ShaderPass' &&
						t.type !== 'RenderTarget')
				) {
					this.renderer.production ||
						m(
							this.type + ': cannot add texture as a child of ',
							t,
							' because it is not a valid parent'
						);
					return;
				}
				(this._parent = t),
					(this.index = this._parent.textures.length),
					this._parent.textures.push(this),
					this._setParent();
			}
			_setParent() {
				if (
					((this._sampler.name = this._samplerName || 'uSampler' + this.index),
					(this._textureMatrix.name = this._samplerName
						? this._samplerName + 'Matrix'
						: 'uTextureMatrix' + this.index),
					this._parent._program)
				) {
					if (!this._parent._program.compiled) {
						this.renderer.production ||
							m(this.type + ': Unable to create the texture because the program is not valid');
						return;
					}
					if ((this._setTextureUniforms(), this._copyOnInit)) {
						const t = this.renderer.nextRender.add(() => {
							this._copiedFrom._canDraw &&
								this._copiedFrom._uploaded &&
								(this.copy(this._copiedFrom), (t.keep = !1));
						}, !0);
						return;
					}
					this.source
						? this._parent.loader &&
							this._parent.loader._addSourceToParent(this.source, this.sourceType)
						: (this._size = {
								width: this._parent._boundingRect.document.width,
								height: this._parent._boundingRect.document.height
							}),
						this._setSize();
				} else
					this._parent.type === 'RenderTarget' &&
						((this._size = {
							width:
								(this._parent._size && this._parent._size.width) ||
								this.renderer._boundingRect.width,
							height:
								(this._parent._size && this._parent._size.height) ||
								this.renderer._boundingRect.height
						}),
						this._upload(),
						this._updateTexParameters(),
						(this._canDraw = !0));
			}
			hasParent() {
				return !!this._parent;
			}
			_setTextureUniforms() {
				const t = this._parent._program.activeUniforms;
				for (let e = 0; e < t.textures.length; e++)
					t.textures[e] === this._sampler.name &&
						((this._sampler.isActive = !0),
						this.renderer.useProgram(this._parent._program),
						(this._sampler.location = this.gl.getUniformLocation(
							this._parent._program.program,
							this._sampler.name
						)),
						t.textureMatrices.find((s) => s === this._textureMatrix.name) &&
							((this._textureMatrix.isActive = !0),
							(this._textureMatrix.location = this.gl.getUniformLocation(
								this._parent._program.program,
								this._textureMatrix.name
							))),
						this.gl.uniform1i(this._sampler.location, this.index));
			}
			copy(t) {
				if (!t || t.type !== 'Texture') {
					this.renderer.production || m(this.type + ': Unable to set the texture from texture:', t);
					return;
				}
				(this._globalParameters = Object.assign({}, t._globalParameters)),
					(this._state = Object.assign({}, t._state)),
					(this.parameters.generateMipmap = t.parameters.generateMipmap),
					(this._state.generateMipmap = null),
					(this._size = t._size),
					!this._sourceLoaded &&
						t._sourceLoaded &&
						this._onSourceLoadedCallback &&
						this._onSourceLoadedCallback(),
					(this._sourceLoaded = t._sourceLoaded),
					!this._uploaded &&
						t._uploaded &&
						this._onSourceUploadedCallback &&
						this._onSourceUploadedCallback(),
					(this._uploaded = t._uploaded),
					(this.sourceType = t.sourceType),
					(this.source = t.source),
					(this._videoFrameCallbackID = t._videoFrameCallbackID),
					(this._sampler.texture = t._sampler.texture),
					(this._copiedFrom = t),
					this._parent &&
						this._parent._program &&
						(!this._canDraw || !this._textureMatrix.matrix) &&
						(this._setSize(), (this._canDraw = !0)),
					this._updateTexParameters(),
					this.renderer.needRender();
			}
			setSource(t) {
				this._sourceLoaded ||
					this.renderer.nextRender.add(
						() => this._onSourceLoadedCallback && this._onSourceLoadedCallback()
					);
				const e = t.tagName.toUpperCase() === 'IMG' ? 'image' : t.tagName.toLowerCase();
				if (((e === 'video' || e === 'canvas') && (this._useCache = !1), this._useCache)) {
					const s = this.renderer.cache.getTextureFromSource(t);
					if (s && s.uuid !== this.uuid) {
						this._uploaded ||
							(this.renderer.nextRender.add(
								() => this._onSourceUploadedCallback && this._onSourceUploadedCallback()
							),
							(this._uploaded = !0)),
							this.copy(s),
							this.resize();
						return;
					}
				}
				if (this.sourceType === 'empty' || this.sourceType !== e)
					if (e === 'video') (this._willUpdate = !1), (this.shouldUpdate = !0);
					else if (e === 'canvas') (this._willUpdate = !0), (this.shouldUpdate = !0);
					else if (e === 'image') (this._willUpdate = !1), (this.shouldUpdate = !1);
					else {
						this.renderer.production ||
							m(this.type + ': this HTML tag could not be converted into a texture:', t.tagName);
						return;
					}
				(this.source = t),
					(this.sourceType = e),
					(this._size = {
						width: this.source.naturalWidth || this.source.width || this.source.videoWidth,
						height: this.source.naturalHeight || this.source.height || this.source.videoHeight
					}),
					(this._sourceLoaded = !0),
					this.gl.bindTexture(this.gl.TEXTURE_2D, this._sampler.texture),
					this.resize(),
					(this._globalParameters.flipY = !0),
					(this._globalParameters.premultiplyAlpha = this._globalParameters.shouldPremultiplyAlpha),
					this.sourceType === 'image' &&
						((this.parameters.generateMipmap =
							this.parameters.generateMipmap || this.parameters.generateMipmap === null),
						(this.parameters._shouldUpdate = this.parameters.generateMipmap),
						(this._state.generateMipmap = !1),
						this._upload()),
					this.renderer.needRender();
			}
			_updateGlobalTexParameters() {
				this.renderer.state.unpackAlignment !== this._globalParameters.unpackAlignment &&
					(this.gl.pixelStorei(this.gl.UNPACK_ALIGNMENT, this._globalParameters.unpackAlignment),
					(this.renderer.state.unpackAlignment = this._globalParameters.unpackAlignment)),
					this.renderer.state.flipY !== this._globalParameters.flipY &&
						(this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, this._globalParameters.flipY),
						(this.renderer.state.flipY = this._globalParameters.flipY)),
					this.renderer.state.premultiplyAlpha !== this._globalParameters.premultiplyAlpha &&
						(this.gl.pixelStorei(
							this.gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,
							this._globalParameters.premultiplyAlpha
						),
						(this.renderer.state.premultiplyAlpha = this._globalParameters.premultiplyAlpha)),
					this._globalParameters.floatingPoint === 'half-float'
						? this.renderer._isWebGL2 && this.renderer.extensions.EXT_color_buffer_float
							? ((this._globalParameters.internalFormat = this.gl.RGBA16F),
								(this._globalParameters.type = this.gl.HALF_FLOAT))
							: this.renderer.extensions.OES_texture_half_float
								? (this._globalParameters.type =
										this.renderer.extensions.OES_texture_half_float.HALF_FLOAT_OES)
								: this.renderer.production ||
									m(
										this.type +
											': could not use half-float textures because the extension is not available'
									)
						: this._globalParameters.floatingPoint === 'float' &&
							(this.renderer._isWebGL2 && this.renderer.extensions.EXT_color_buffer_float
								? ((this._globalParameters.internalFormat = this.gl.RGBA16F),
									(this._globalParameters.type = this.gl.FLOAT))
								: this.renderer.extensions.OES_texture_float
									? (this._globalParameters.type =
											this.renderer.extensions.OES_texture_half_float.FLOAT)
									: this.renderer.production ||
										m(
											this.type +
												': could not use float textures because the extension is not available'
										));
			}
			_updateTexParameters() {
				this.index && this.renderer.state.activeTexture !== this.index && this._bindTexture(),
					this.parameters.wrapS !== this._state.wrapS &&
						(!this.renderer._isWebGL2 &&
							(!W(this._size.width) || !W(this._size.height)) &&
							(this.parameters.wrapS = this.gl.CLAMP_TO_EDGE),
						this.parameters.wrapS !== this.gl.REPEAT &&
							this.parameters.wrapS !== this.gl.CLAMP_TO_EDGE &&
							this.parameters.wrapS !== this.gl.MIRRORED_REPEAT &&
							(this.renderer.production ||
								m(
									this.type + ': Wrong wrapS value',
									this.parameters.wrapS,
									'for this texture:',
									this,
									`
gl.CLAMP_TO_EDGE wrapping will be used instead`
								),
							(this.parameters.wrapS = this.gl.CLAMP_TO_EDGE)),
						this.gl.texParameteri(
							this.gl.TEXTURE_2D,
							this.gl.TEXTURE_WRAP_S,
							this.parameters.wrapS
						),
						(this._state.wrapS = this.parameters.wrapS)),
					this.parameters.wrapT !== this._state.wrapT &&
						(!this.renderer._isWebGL2 &&
							(!W(this._size.width) || !W(this._size.height)) &&
							(this.parameters.wrapT = this.gl.CLAMP_TO_EDGE),
						this.parameters.wrapT !== this.gl.REPEAT &&
							this.parameters.wrapT !== this.gl.CLAMP_TO_EDGE &&
							this.parameters.wrapT !== this.gl.MIRRORED_REPEAT &&
							(this.renderer.production ||
								m(
									this.type + ': Wrong wrapT value',
									this.parameters.wrapT,
									'for this texture:',
									this,
									`
gl.CLAMP_TO_EDGE wrapping will be used instead`
								),
							(this.parameters.wrapT = this.gl.CLAMP_TO_EDGE)),
						this.gl.texParameteri(
							this.gl.TEXTURE_2D,
							this.gl.TEXTURE_WRAP_T,
							this.parameters.wrapT
						),
						(this._state.wrapT = this.parameters.wrapT)),
					this.parameters.generateMipmap &&
						!this._state.generateMipmap &&
						this.source &&
						(!this.renderer._isWebGL2 && (!W(this._size.width) || !W(this._size.height))
							? (this.parameters.generateMipmap = !1)
							: this.gl.generateMipmap(this.gl.TEXTURE_2D),
						(this._state.generateMipmap = this.parameters.generateMipmap)),
					this.parameters.minFilter !== this._state.minFilter &&
						(!this.renderer._isWebGL2 &&
							(!W(this._size.width) || !W(this._size.height)) &&
							(this.parameters.minFilter = this.gl.LINEAR),
						!this.parameters.generateMipmap &&
							this.parameters.generateMipmap !== null &&
							(this.parameters.minFilter = this.gl.LINEAR),
						this.parameters.minFilter !== this.gl.LINEAR &&
							this.parameters.minFilter !== this.gl.NEAREST &&
							this.parameters.minFilter !== this.gl.NEAREST_MIPMAP_NEAREST &&
							this.parameters.minFilter !== this.gl.LINEAR_MIPMAP_NEAREST &&
							this.parameters.minFilter !== this.gl.NEAREST_MIPMAP_LINEAR &&
							this.parameters.minFilter !== this.gl.LINEAR_MIPMAP_LINEAR &&
							(this.renderer.production ||
								m(
									this.type + ': Wrong minFilter value',
									this.parameters.minFilter,
									'for this texture:',
									this,
									`
gl.LINEAR filtering will be used instead`
								),
							(this.parameters.minFilter = this.gl.LINEAR)),
						this.gl.texParameteri(
							this.gl.TEXTURE_2D,
							this.gl.TEXTURE_MIN_FILTER,
							this.parameters.minFilter
						),
						(this._state.minFilter = this.parameters.minFilter)),
					this.parameters.magFilter !== this._state.magFilter &&
						(!this.renderer._isWebGL2 &&
							(!W(this._size.width) || !W(this._size.height)) &&
							(this.parameters.magFilter = this.gl.LINEAR),
						this.parameters.magFilter !== this.gl.LINEAR &&
							this.parameters.magFilter !== this.gl.NEAREST &&
							(this.renderer.production ||
								m(
									this.type + ': Wrong magFilter value',
									this.parameters.magFilter,
									'for this texture:',
									this,
									`
gl.LINEAR filtering will be used instead`
								),
							(this.parameters.magFilter = this.gl.LINEAR)),
						this.gl.texParameteri(
							this.gl.TEXTURE_2D,
							this.gl.TEXTURE_MAG_FILTER,
							this.parameters.magFilter
						),
						(this._state.magFilter = this.parameters.magFilter));
				const t = this.renderer.extensions.EXT_texture_filter_anisotropic;
				if (t && this.parameters.anisotropy !== this._state.anisotropy) {
					const e = this.gl.getParameter(t.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
					(this.parameters.anisotropy = Math.max(1, Math.min(this.parameters.anisotropy, e))),
						this.gl.texParameterf(
							this.gl.TEXTURE_2D,
							t.TEXTURE_MAX_ANISOTROPY_EXT,
							this.parameters.anisotropy
						),
						(this._state.anisotropy = this.parameters.anisotropy);
				}
			}
			setWrapS(t) {
				this.parameters.wrapS !== t &&
					((this.parameters.wrapS = t), (this.parameters._shouldUpdate = !0));
			}
			setWrapT(t) {
				this.parameters.wrapT !== t &&
					((this.parameters.wrapT = t), (this.parameters._shouldUpdate = !0));
			}
			setMinFilter(t) {
				this.parameters.minFilter !== t &&
					((this.parameters.minFilter = t), (this.parameters._shouldUpdate = !0));
			}
			setMagFilter(t) {
				this.parameters.magFilter !== t &&
					((this.parameters.magFilter = t), (this.parameters._shouldUpdate = !0));
			}
			setAnisotropy(t) {
				(t = isNaN(t) ? this.parameters.anisotropy : t),
					this.parameters.anisotropy !== t &&
						((this.parameters.anisotropy = t), (this.parameters._shouldUpdate = !0));
			}
			needUpdate() {
				this._forceUpdate = !0;
			}
			_videoFrameCallback() {
				if (((this._willUpdate = !0), this.source))
					this.source.requestVideoFrameCallback(() => this._videoFrameCallback());
				else {
					const t = this.renderer.nextRender.add(() => {
						this.source &&
							((t.keep = !1),
							this.source.requestVideoFrameCallback(() => this._videoFrameCallback()));
					}, !0);
				}
			}
			_upload() {
				this._updateGlobalTexParameters(),
					this.source
						? this.gl.texImage2D(
								this.gl.TEXTURE_2D,
								0,
								this._globalParameters.internalFormat,
								this._globalParameters.format,
								this._globalParameters.type,
								this.source
							)
						: this.sourceType === 'fbo' &&
							this.gl.texImage2D(
								this.gl.TEXTURE_2D,
								0,
								this._globalParameters.internalFormat,
								this._size.width,
								this._size.height,
								0,
								this._globalParameters.format,
								this._globalParameters.type,
								this.source || null
							),
					this._uploaded ||
						(this.renderer.nextRender.add(
							() => this._onSourceUploadedCallback && this._onSourceUploadedCallback()
						),
						(this._uploaded = !0));
			}
			_getSizes() {
				if (this.sourceType === 'fbo')
					return {
						parentWidth: this._parent._boundingRect.document.width,
						parentHeight: this._parent._boundingRect.document.height,
						sourceWidth: this._parent._boundingRect.document.width,
						sourceHeight: this._parent._boundingRect.document.height,
						xOffset: 0,
						yOffset: 0
					};
				const t = this._parent.scale
						? gt.set(this._parent.scale.x, this._parent.scale.y)
						: gt.set(1, 1),
					e = this._parent._boundingRect.document.width * t.x,
					s = this._parent._boundingRect.document.height * t.y,
					i = this._size.width,
					r = this._size.height,
					n = i / r,
					h = e / s;
				let o = 0,
					l = 0;
				return (
					h > n ? (l = Math.min(0, s - e * (1 / n))) : h < n && (o = Math.min(0, e - s * n)),
					{
						parentWidth: e,
						parentHeight: s,
						sourceWidth: i,
						sourceHeight: r,
						xOffset: o,
						yOffset: l
					}
				);
			}
			setScale(t) {
				if (!t.type || t.type !== 'Vec2') {
					this.renderer.production ||
						m(
							this.type + ': Cannot set scale because the parameter passed is not of Vec2 type:',
							t
						);
					return;
				}
				t.sanitizeNaNValuesWith(this.scale).max(gt.set(0.001, 0.001)),
					t.equals(this.scale) || (this.scale.copy(t), this.resize());
			}
			setOffset(t) {
				if (!t.type || t.type !== 'Vec2') {
					this.renderer.production ||
						m(
							this.type + ': Cannot set offset because the parameter passed is not of Vec2 type:',
							scale
						);
					return;
				}
				t.sanitizeNaNValuesWith(this.offset),
					t.equals(this.offset) || (this.offset.copy(t), this.resize());
			}
			_setSize() {
				if (this._parent && this._parent._program) {
					const t = this._getSizes();
					this._updateTextureMatrix(t);
				}
			}
			resize() {
				this.sourceType === 'fbo'
					? ((this._size = {
							width:
								(this._parent._size && this._parent._size.width) ||
								this._parent._boundingRect.document.width,
							height:
								(this._parent._size && this._parent._size.height) ||
								this._parent._boundingRect.document.height
						}),
						this._copiedFrom ||
							(this.gl.bindTexture(this.gl.TEXTURE_2D, this._sampler.texture),
							this.gl.texImage2D(
								this.gl.TEXTURE_2D,
								0,
								this._globalParameters.internalFormat,
								this._size.width,
								this._size.height,
								0,
								this._globalParameters.format,
								this._globalParameters.type,
								null
							)))
					: this.source &&
						(this._size = {
							width: this.source.naturalWidth || this.source.width || this.source.videoWidth,
							height: this.source.naturalHeight || this.source.height || this.source.videoHeight
						}),
					this._setSize();
			}
			_updateTextureMatrix(t) {
				const e = he.set(
					t.parentWidth / (t.parentWidth - t.xOffset),
					t.parentHeight / (t.parentHeight - t.yOffset),
					1
				);
				(e.x /= this.scale.x),
					(e.y /= this.scale.y),
					(this._textureMatrix.matrix = oe.setFromArray([
						e.x,
						0,
						0,
						0,
						0,
						e.y,
						0,
						0,
						0,
						0,
						1,
						0,
						(1 - e.x) / 2 + this.offset.x,
						(1 - e.y) / 2 + this.offset.y,
						0,
						1
					])),
					this._updateMatrixUniform();
			}
			_updateMatrixUniform() {
				this._textureMatrix.isActive &&
					(this.renderer.useProgram(this._parent._program),
					this.gl.uniformMatrix4fv(
						this._textureMatrix.location,
						!1,
						this._textureMatrix.matrix.elements
					));
			}
			_onSourceLoaded(t) {
				this.setSource(t), this.sourceType === 'image' && this.renderer.cache.addTexture(this);
			}
			_bindTexture() {
				this._canDraw &&
					(this.renderer.state.activeTexture !== this.index &&
						(this.gl.activeTexture(this.gl.TEXTURE0 + this.index),
						(this.renderer.state.activeTexture = this.index)),
					this.gl.bindTexture(this.gl.TEXTURE_2D, this._sampler.texture),
					this._sampler.isTextureBound ||
						((this._sampler.isTextureBound = !!this.gl.getParameter(this.gl.TEXTURE_BINDING_2D)),
						this._sampler.isTextureBound && this.renderer.needRender()));
			}
			_draw() {
				this._sampler.isActive &&
					(this._bindTexture(),
					this.sourceType === 'video' &&
						this.source &&
						!this._videoFrameCallbackID &&
						this.source.readyState >= this.source.HAVE_CURRENT_DATA &&
						!this.source.paused &&
						(this._willUpdate = !0),
					(this._forceUpdate || (this._willUpdate && this.shouldUpdate)) &&
						((this._state.generateMipmap = !1), this._upload()),
					this.sourceType === 'video' && (this._willUpdate = !1),
					(this._forceUpdate = !1)),
					this.parameters._shouldUpdate &&
						(this._updateTexParameters(), (this.parameters._shouldUpdate = !1));
			}
			onSourceLoaded(t) {
				return t && (this._onSourceLoadedCallback = t), this;
			}
			onSourceUploaded(t) {
				return t && (this._onSourceUploadedCallback = t), this;
			}
			_dispose(t = !1) {
				var e;
				this.sourceType === 'video' ||
				(this.sourceType === 'image' && !this.renderer.state.isActive)
					? (this._loader && this._loader._removeSource(this), (this.source = null))
					: this.sourceType === 'canvas' &&
						this.source &&
						((this.source.width = (e = this.source) == null ? void 0 : e.width),
						(this.source = null)),
					(this._parent = null),
					this.gl &&
						!this._copiedFrom &&
						(t || this.sourceType !== 'image' || !this.renderer.state.isActive) &&
						((this._canDraw = !1),
						this.renderer.cache.removeTexture(this),
						this.gl.activeTexture(this.gl.TEXTURE0 + this.index),
						this.gl.bindTexture(this.gl.TEXTURE_2D, null),
						this.gl.deleteTexture(this._sampler.texture));
			}
		}
		class le {
			constructor(t, e = 'anonymous') {
				if (
					((this.type = 'TextureLoader'), (t = (t && t.renderer) || t), !t || t.type !== 'Renderer')
				)
					k(this.type + ': Renderer not passed as first argument', t);
				else if (!t.gl) {
					k(this.type + ': Renderer WebGL context is undefined', t);
					return;
				}
				(this.renderer = t),
					(this.gl = this.renderer.gl),
					(this.crossOrigin = e),
					(this.elements = []);
			}
			_addElement(t, e, s, i) {
				const r = {
					source: t,
					texture: e,
					load: this._sourceLoaded.bind(this, t, e, s),
					error: this._sourceLoadError.bind(this, t, i)
				};
				return this.elements.push(r), r;
			}
			_sourceLoadError(t, e, s) {
				e && e(t, s);
			}
			_sourceLoaded(t, e, s) {
				e._sourceLoaded ||
					(e._onSourceLoaded(t),
					this._parent &&
						(this._increment && this._increment(),
						this.renderer.nextRender.add(
							() => this._parent._onLoadingCallback && this._parent._onLoadingCallback(e)
						)),
					s && s(e));
			}
			_getSourceType(t) {
				let e;
				return (
					typeof t == 'string'
						? t.match(/\.(jpeg|jpg|jfif|pjpeg|pjp|gif|bmp|png|webp|svg|avif|apng)$/) !== null
							? (e = 'image')
							: t.match(/\.(webm|mp4|mpg|mpeg|avi|ogg|ogm|ogv|mov|av1)$/) !== null && (e = 'video')
						: t.tagName.toUpperCase() === 'IMG'
							? (e = 'image')
							: t.tagName.toUpperCase() === 'VIDEO'
								? (e = 'video')
								: t.tagName.toUpperCase() === 'CANVAS' && (e = 'canvas'),
					e
				);
			}
			_createImage(t) {
				if (typeof t == 'string' || !t.hasAttribute('crossOrigin')) {
					const e = new Image();
					return (
						(e.crossOrigin = this.crossOrigin),
						typeof t == 'string'
							? (e.src = t)
							: ((e.src = t.src),
								t.hasAttribute('data-sampler') &&
									e.setAttribute('data-sampler', t.getAttribute('data-sampler'))),
						e
					);
				} else return t;
			}
			_createVideo(t) {
				if (typeof t == 'string' || t.getAttribute('crossOrigin') === null) {
					const e = document.createElement('video');
					return (
						(e.crossOrigin = this.crossOrigin),
						typeof t == 'string'
							? (e.src = t)
							: ((e.src = t.src),
								t.hasAttribute('data-sampler') &&
									e.setAttribute('data-sampler', t.getAttribute('data-sampler'))),
						e
					);
				} else return t;
			}
			loadSource(t, e, s, i) {
				switch (this._getSourceType(t)) {
					case 'image':
						this.loadImage(t, e, s, i);
						break;
					case 'video':
						this.loadVideo(t, e, s, i);
						break;
					case 'canvas':
						this.loadCanvas(t, e, s);
						break;
					default:
						this._sourceLoadError(t, i, 'this source could not be converted into a texture: ' + t);
						break;
				}
			}
			loadSources(t, e, s, i) {
				for (let r = 0; r < t.length; r++) this.loadSource(t[r], e, s, i);
			}
			loadImage(t, e = {}, s, i) {
				const r = this.renderer.cache.getTextureFromSource(t);
				let n = Object.assign({}, e);
				if (
					(this._parent && (n = Object.assign(n, this._parent._texturesOptions)),
					(n.loader = this),
					r)
				) {
					(n.sampler =
						typeof t != 'string' && t.hasAttribute('data-sampler')
							? t.getAttribute('data-sampler')
							: n.sampler),
						(n.fromTexture = r);
					const d = new Z(this.renderer, n);
					this._sourceLoaded(r.source, d, s),
						this._parent && this._addToParent(d, r.source, 'image');
					return;
				}
				const h = this._createImage(t);
				n.sampler = h.hasAttribute('data-sampler') ? h.getAttribute('data-sampler') : n.sampler;
				const o = new Z(this.renderer, n),
					l = this._addElement(h, o, s, i);
				h.complete
					? this._sourceLoaded(h, o, s)
					: h.decode
						? h
								.decode()
								.then(this._sourceLoaded.bind(this, h, o, s))
								.catch(() => {
									h.addEventListener('load', l.load, !1), h.addEventListener('error', l.error, !1);
								})
						: (h.addEventListener('load', l.load, !1), h.addEventListener('error', l.error, !1)),
					this._parent && this._addToParent(o, h, 'image');
			}
			loadImages(t, e, s, i) {
				for (let r = 0; r < t.length; r++) this.loadImage(t[r], e, s, i);
			}
			loadVideo(t, e = {}, s, i) {
				const r = this._createVideo(t);
				(r.preload = !0),
					(r.muted = !0),
					(r.loop = !0),
					r.setAttribute('playsinline', ''),
					(r.crossOrigin = this.crossOrigin);
				let n = Object.assign({}, e);
				this._parent && (n = Object.assign(e, this._parent._texturesOptions)),
					(n.loader = this),
					(n.sampler = r.hasAttribute('data-sampler') ? r.getAttribute('data-sampler') : n.sampler);
				const h = new Z(this.renderer, n),
					o = this._addElement(r, h, s, i);
				r.addEventListener('canplaythrough', o.load, !1),
					r.addEventListener('error', o.error, !1),
					r.readyState >= r.HAVE_FUTURE_DATA && s && this._sourceLoaded(r, h, s),
					r.load(),
					this._addToParent && this._addToParent(h, r, 'video'),
					'requestVideoFrameCallback' in HTMLVideoElement.prototype &&
						((o.videoFrameCallback = h._videoFrameCallback.bind(h)),
						(h._videoFrameCallbackID = r.requestVideoFrameCallback(o.videoFrameCallback)));
			}
			loadVideos(t, e, s, i) {
				for (let r = 0; r < t.length; r++) this.loadVideo(t[r], e, s, i);
			}
			loadCanvas(t, e = {}, s) {
				let i = Object.assign({}, e);
				this._parent && (i = Object.assign(e, this._parent._texturesOptions)),
					(i.loader = this),
					(i.sampler = t.hasAttribute('data-sampler') ? t.getAttribute('data-sampler') : i.sampler);
				const r = new Z(this.renderer, i);
				this._addElement(t, r, s, null),
					this._sourceLoaded(t, r, s),
					this._parent && this._addToParent(r, t, 'canvas');
			}
			loadCanvases(t, e, s) {
				for (let i = 0; i < t.length; i++) this.loadCanvas(t[i], e, s);
			}
			_removeSource(t) {
				const e = this.elements.find((s) => s.texture.uuid === t.uuid);
				e &&
					(t.sourceType === 'image'
						? e.source.removeEventListener('load', e.load, !1)
						: t.sourceType === 'video' &&
							(e.videoFrameCallback &&
								t._videoFrameCallbackID &&
								e.source.cancelVideoFrameCallback(t._videoFrameCallbackID),
							e.source.removeEventListener('canplaythrough', e.load, !1),
							e.source.pause(),
							e.source.removeAttribute('src'),
							e.source.load()),
					e.source.removeEventListener('error', e.error, !1));
			}
		}
		class de extends le {
			constructor(
				t,
				e,
				{
					sourcesLoaded: s = 0,
					sourcesToLoad: i = 0,
					complete: r = !1,
					onComplete: n = () => {}
				} = {}
			) {
				super(t, e.crossOrigin),
					(this.type = 'PlaneTextureLoader'),
					(this._parent = e),
					this._parent.type !== 'Plane' &&
						this._parent.type !== 'PingPongPlane' &&
						this._parent.type !== 'ShaderPass' &&
						(m(this.type + ': Wrong parent type assigned to this loader'), (this._parent = null)),
					(this.sourcesLoaded = s),
					(this.sourcesToLoad = i),
					(this.complete = r),
					(this.onComplete = n);
			}
			_setLoaderSize(t) {
				(this.sourcesToLoad = t),
					this.sourcesToLoad === 0 &&
						((this.complete = !0),
						this.renderer.nextRender.add(() => this.onComplete && this.onComplete()));
			}
			_increment() {
				this.sourcesLoaded++,
					this.sourcesLoaded >= this.sourcesToLoad &&
						!this.complete &&
						((this.complete = !0),
						this.renderer.nextRender.add(() => this.onComplete && this.onComplete()));
			}
			_addSourceToParent(t, e) {
				if (e === 'image') {
					const s = this._parent.images;
					!s.find((i) => i.src === t.src) && s.push(t);
				} else if (e === 'video') {
					const s = this._parent.videos;
					!s.find((i) => i.src === t.src) && s.push(t);
				} else if (e === 'canvas') {
					const s = this._parent.canvases;
					!s.find((i) => i.isSameNode(t)) && s.push(t);
				}
			}
			_addToParent(t, e, s) {
				this._addSourceToParent(e, s), this._parent && t.addParent(this._parent);
			}
		}
		class ce {
			constructor(
				t,
				e = 'Mesh',
				{
					vertexShaderID: s,
					fragmentShaderID: i,
					vertexShader: r,
					fragmentShader: n,
					uniforms: h = {},
					widthSegments: o = 1,
					heightSegments: l = 1,
					renderOrder: d = 0,
					depthTest: c = !0,
					cullFace: u = 'back',
					texturesOptions: p = {},
					crossOrigin: g = 'anonymous'
				} = {}
			) {
				if (
					((this.type = e),
					(t = (t && t.renderer) || t),
					(!t || t.type !== 'Renderer') &&
						(k(
							this.type + ': Curtains not passed as first argument or Curtains Renderer is missing',
							t
						),
						setTimeout(() => {
							this._onErrorCallback && this._onErrorCallback();
						}, 0)),
					(this.renderer = t),
					(this.gl = this.renderer.gl),
					!this.gl)
				) {
					this.renderer.production ||
						k(
							this.type +
								': Unable to create a ' +
								this.type +
								' because the Renderer WebGL context is not defined'
						),
						setTimeout(() => {
							this._onErrorCallback && this._onErrorCallback();
						}, 0);
					return;
				}
				(this._canDraw = !1),
					(this.renderOrder = d),
					(this._depthTest = c),
					(this.cullFace = u),
					this.cullFace !== 'back' &&
						this.cullFace !== 'front' &&
						this.cullFace !== 'none' &&
						(this.cullFace = 'back'),
					(this.textures = []),
					(this._texturesOptions = Object.assign(
						{
							premultiplyAlpha: !1,
							anisotropy: 1,
							floatingPoint: 'none',
							wrapS: this.gl.CLAMP_TO_EDGE,
							wrapT: this.gl.CLAMP_TO_EDGE,
							minFilter: this.gl.LINEAR,
							magFilter: this.gl.LINEAR
						},
						p
					)),
					(this.crossOrigin = g),
					!r && s && document.getElementById(s) && (r = document.getElementById(s).innerHTML),
					!n && i && document.getElementById(i) && (n = document.getElementById(i).innerHTML),
					this._initMesh(),
					(o = parseInt(o)),
					(l = parseInt(l)),
					(this._geometry = new ne(this.renderer, { width: o, height: l })),
					(this._program = new Tt(this.renderer, {
						parent: this,
						vertexShader: r,
						fragmentShader: n
					})),
					this._program.compiled
						? (this._program.createUniforms(h),
							(this.uniforms = this._program.uniformsManager.uniforms),
							this._geometry.setProgram(this._program),
							this.renderer.onSceneChange())
						: this.renderer.nextRender.add(() => this._onErrorCallback && this._onErrorCallback());
			}
			_initMesh() {
				(this.uuid = pt()),
					(this.loader = new de(this.renderer, this, {
						sourcesLoaded: 0,
						initSourcesToLoad: 0,
						complete: !1,
						onComplete: () => {
							this._onReadyCallback && this._onReadyCallback(), this.renderer.needRender();
						}
					})),
					(this.images = []),
					(this.videos = []),
					(this.canvases = []),
					(this.userData = {}),
					(this._canDraw = !0);
			}
			_restoreContext() {
				(this._canDraw = !1),
					this._matrices && (this._matrices = null),
					(this._program = new Tt(this.renderer, {
						parent: this,
						vertexShader: this._program.vsCode,
						fragmentShader: this._program.fsCode
					})),
					this._program.compiled &&
						(this._geometry.restoreContext(this._program),
						this._program.createUniforms(this.uniforms),
						(this.uniforms = this._program.uniformsManager.uniforms),
						this._programRestored());
			}
			setRenderTarget(t) {
				if (!t || t.type !== 'RenderTarget') {
					this.renderer.production ||
						m(
							this.type +
								': Could not set the render target because the argument passed is not a RenderTarget class object',
							t
						);
					return;
				}
				this.type === 'Plane' && this.renderer.scene.removePlane(this),
					(this.target = t),
					this.type === 'Plane' && this.renderer.scene.addPlane(this);
			}
			setRenderOrder(t = 0) {
				(t = isNaN(t) ? this.renderOrder : parseInt(t)),
					t !== this.renderOrder &&
						((this.renderOrder = t), this.renderer.scene.setPlaneRenderOrder(this));
			}
			createTexture(t = {}) {
				const e = new Z(this.renderer, Object.assign(t, this._texturesOptions));
				return e.addParent(this), e;
			}
			addTexture(t) {
				if (!t || t.type !== 'Texture') {
					this.renderer.production ||
						m(
							this.type + ': cannot add ',
							t,
							' to this ' + this.type + ' because it is not a valid texture'
						);
					return;
				}
				t.addParent(this);
			}
			loadSources(t, e = {}, s, i) {
				for (let r = 0; r < t.length; r++) this.loadSource(t[r], e, s, i);
			}
			loadSource(t, e = {}, s, i) {
				this.loader.loadSource(
					t,
					Object.assign(e, this._texturesOptions),
					(r) => {
						s && s(r);
					},
					(r, n) => {
						this.renderer.production ||
							m(this.type + ': this HTML tag could not be converted into a texture:', r.tagName),
							i && i(r, n);
					}
				);
			}
			loadImage(t, e = {}, s, i) {
				this.loader.loadImage(
					t,
					Object.assign(e, this._texturesOptions),
					(r) => {
						s && s(r);
					},
					(r, n) => {
						this.renderer.production ||
							m(
								this.type +
									`: There has been an error:
`,
								n,
								`
while loading this image:
`,
								r
							),
							i && i(r, n);
					}
				);
			}
			loadVideo(t, e = {}, s, i) {
				this.loader.loadVideo(
					t,
					Object.assign(e, this._texturesOptions),
					(r) => {
						s && s(r);
					},
					(r, n) => {
						this.renderer.production ||
							m(
								this.type +
									`: There has been an error:
`,
								n,
								`
while loading this video:
`,
								r
							),
							i && i(r, n);
					}
				);
			}
			loadCanvas(t, e = {}, s) {
				this.loader.loadCanvas(t, Object.assign(e, this._texturesOptions), (i) => {
					s && s(i);
				});
			}
			loadImages(t, e = {}, s, i) {
				for (let r = 0; r < t.length; r++) this.loadImage(t[r], e, s, i);
			}
			loadVideos(t, e = {}, s, i) {
				for (let r = 0; r < t.length; r++) this.loadVideo(t[r], e, s, i);
			}
			loadCanvases(t, e = {}, s) {
				for (let i = 0; i < t.length; i++) this.loadCanvas(t[i], e, s);
			}
			playVideos() {
				for (let t = 0; t < this.textures.length; t++) {
					const e = this.textures[t];
					if (e.sourceType === 'video') {
						const s = e.source.play();
						s !== void 0 &&
							s.catch((i) => {
								this.renderer.production || m(this.type + ': Could not play the video : ', i);
							});
					}
				}
			}
			_draw() {
				this.renderer.setDepthTest(this._depthTest),
					this.renderer.setFaceCulling(this.cullFace),
					this._program.updateUniforms(),
					this._geometry.bindBuffers(),
					(this.renderer.state.forceBufferUpdate = !1);
				for (let t = 0; t < this.textures.length; t++)
					if (
						(this.textures[t]._draw(),
						this.textures[t]._sampler.isActive && !this.textures[t]._sampler.isTextureBound)
					)
						return;
				this._geometry.draw(),
					(this.renderer.state.activeTexture = null),
					this._onAfterRenderCallback && this._onAfterRenderCallback();
			}
			onError(t) {
				return t && (this._onErrorCallback = t), this;
			}
			onLoading(t) {
				return t && (this._onLoadingCallback = t), this;
			}
			onReady(t) {
				return t && (this._onReadyCallback = t), this;
			}
			onRender(t) {
				return t && (this._onRenderCallback = t), this;
			}
			onAfterRender(t) {
				return t && (this._onAfterRenderCallback = t), this;
			}
			remove() {
				(this._canDraw = !1),
					this.target && this.renderer.bindFrameBuffer(null),
					this._dispose(),
					this.type === 'Plane'
						? this.renderer.removePlane(this)
						: this.type === 'ShaderPass' &&
							(this.target &&
								((this.target._shaderPass = null), this.target.remove(), (this.target = null)),
							this.renderer.removeShaderPass(this));
			}
			_dispose() {
				if (this.gl) {
					this._geometry && this._geometry.dispose(),
						this.target &&
							this.type === 'ShaderPass' &&
							(this.renderer.removeRenderTarget(this.target), this.textures.shift());
					for (let t = 0; t < this.textures.length; t++) this.textures[t]._dispose();
					this.textures = [];
				}
			}
		}
		const St = new F(),
			ue = new F();
		class pe extends ce {
			constructor(
				t,
				e,
				s = 'DOMMesh',
				{
					widthSegments: i,
					heightSegments: r,
					renderOrder: n,
					depthTest: h,
					cullFace: o,
					uniforms: l,
					vertexShaderID: d,
					fragmentShaderID: c,
					vertexShader: u,
					fragmentShader: p,
					texturesOptions: g,
					crossOrigin: x
				} = {}
			) {
				(d = d || (e && e.getAttribute('data-vs-id'))),
					(c = c || (e && e.getAttribute('data-fs-id'))),
					super(t, s, {
						widthSegments: i,
						heightSegments: r,
						renderOrder: n,
						depthTest: h,
						cullFace: o,
						uniforms: l,
						vertexShaderID: d,
						fragmentShaderID: c,
						vertexShader: u,
						fragmentShader: p,
						texturesOptions: g,
						crossOrigin: x
					}),
					this.gl &&
						((this.htmlElement = e),
						(!this.htmlElement || this.htmlElement.length === 0) &&
							(this.renderer.production ||
								m(
									this.type +
										': The HTML element you specified does not currently exists in the DOM'
								)),
						this._setDocumentSizes());
			}
			_setDocumentSizes() {
				let t = this.htmlElement.getBoundingClientRect();
				this._boundingRect || (this._boundingRect = {}),
					(this._boundingRect.document = {
						width: t.width * this.renderer.pixelRatio,
						height: t.height * this.renderer.pixelRatio,
						top: t.top * this.renderer.pixelRatio,
						left: t.left * this.renderer.pixelRatio
					});
			}
			getBoundingRect() {
				return {
					width: this._boundingRect.document.width,
					height: this._boundingRect.document.height,
					top: this._boundingRect.document.top,
					left: this._boundingRect.document.left,
					right: this._boundingRect.document.left + this._boundingRect.document.width,
					bottom: this._boundingRect.document.top + this._boundingRect.document.height
				};
			}
			resize() {
				this._setDocumentSizes(),
					this.type === 'Plane' &&
						(this.setPerspective(this.camera.fov, this.camera.near, this.camera.far),
						this._setWorldSizes(),
						this._applyWorldPositions());
				for (let t = 0; t < this.textures.length; t++) this.textures[t].resize();
				this.renderer.nextRender.add(
					() => this._onAfterResizeCallback && this._onAfterResizeCallback()
				);
			}
			mouseToPlaneCoords(t) {
				const e = this.scale ? this.scale : ue.set(1, 1),
					s = St.set(
						(this._boundingRect.document.width - this._boundingRect.document.width * e.x) / 2,
						(this._boundingRect.document.height - this._boundingRect.document.height * e.y) / 2
					),
					i = {
						width: (this._boundingRect.document.width * e.x) / this.renderer.pixelRatio,
						height: (this._boundingRect.document.height * e.y) / this.renderer.pixelRatio,
						top: (this._boundingRect.document.top + s.y) / this.renderer.pixelRatio,
						left: (this._boundingRect.document.left + s.x) / this.renderer.pixelRatio
					};
				return St.set(((t.x - i.left) / i.width) * 2 - 1, 1 - ((t.y - i.top) / i.height) * 2);
			}
			onAfterResize(t) {
				return t && (this._onAfterResizeCallback = t), this;
			}
		}
		class ge {
			constructor({
				fov: t = 50,
				near: e = 0.1,
				far: s = 150,
				width: i,
				height: r,
				pixelRatio: n = 1
			} = {}) {
				(this.position = new P()),
					(this.projectionMatrix = new N()),
					(this.worldMatrix = new N()),
					(this.viewMatrix = new N()),
					(this._shouldUpdate = !1),
					this.setSize(),
					this.setPerspective(t, e, s, i, r, n);
			}
			setFov(t) {
				(t = isNaN(t) ? this.fov : parseFloat(t)),
					(t = Math.max(1, Math.min(t, 179))),
					t !== this.fov && ((this.fov = t), this.setPosition(), (this._shouldUpdate = !0)),
					this.setCSSPerspective();
			}
			setNear(t) {
				(t = isNaN(t) ? this.near : parseFloat(t)),
					(t = Math.max(t, 0.01)),
					t !== this.near && ((this.near = t), (this._shouldUpdate = !0));
			}
			setFar(t) {
				(t = isNaN(t) ? this.far : parseFloat(t)),
					(t = Math.max(t, 50)),
					t !== this.far && ((this.far = t), (this._shouldUpdate = !0));
			}
			setPixelRatio(t) {
				t !== this.pixelRatio && (this._shouldUpdate = !0), (this.pixelRatio = t);
			}
			setSize(t, e) {
				(t !== this.width || e !== this.height) && (this._shouldUpdate = !0),
					(this.width = t),
					(this.height = e);
			}
			setPerspective(t, e, s, i, r, n) {
				this.setPixelRatio(n),
					this.setSize(i, r),
					this.setFov(t),
					this.setNear(e),
					this.setFar(s),
					this._shouldUpdate && this.updateProjectionMatrix();
			}
			setPosition() {
				this.position.set(0, 0, 1),
					this.worldMatrix.setFromArray([
						1,
						0,
						0,
						0,
						0,
						1,
						0,
						0,
						0,
						0,
						1,
						0,
						this.position.x,
						this.position.y,
						this.position.z,
						1
					]),
					(this.viewMatrix = this.viewMatrix.copy(this.worldMatrix).getInverse());
			}
			setCSSPerspective() {
				this.CSSPerspective =
					Math.pow(
						Math.pow(this.width / (2 * this.pixelRatio), 2) +
							Math.pow(this.height / (2 * this.pixelRatio), 2),
						0.5
					) / Math.tan((this.fov * 0.5 * Math.PI) / 180);
			}
			getScreenRatiosFromFov(t = 0) {
				const e = this.position.z;
				t < e ? (t -= e) : (t += e);
				const s = (this.fov * Math.PI) / 180,
					i = 2 * Math.tan(s / 2) * Math.abs(t);
				return { width: (i * this.width) / this.height, height: i };
			}
			updateProjectionMatrix() {
				const t = this.width / this.height,
					e = this.near * Math.tan((Math.PI / 180) * 0.5 * this.fov),
					s = 2 * e,
					i = t * s,
					r = -0.5 * i,
					n = r + i,
					h = e - s,
					o = (2 * this.near) / (n - r),
					l = (2 * this.near) / (e - h),
					d = (n + r) / (n - r),
					c = (e + h) / (e - h),
					u = -(this.far + this.near) / (this.far - this.near),
					p = (-2 * this.far * this.near) / (this.far - this.near);
				this.projectionMatrix.setFromArray([o, 0, 0, 0, 0, l, 0, 0, d, c, u, -1, 0, 0, p, 0]);
			}
			forceUpdate() {
				this._shouldUpdate = !0;
			}
			cancelUpdate() {
				this._shouldUpdate = !1;
			}
		}
		class nt {
			constructor(t = new Float32Array([0, 0, 0, 1]), e = 'XYZ') {
				(this.type = 'Quat'), (this.elements = t), (this.axisOrder = e);
			}
			setFromArray(t) {
				return (
					(this.elements[0] = t[0]),
					(this.elements[1] = t[1]),
					(this.elements[2] = t[2]),
					(this.elements[3] = t[3]),
					this
				);
			}
			setAxisOrder(t) {
				switch (((t = t.toUpperCase()), t)) {
					case 'XYZ':
					case 'YXZ':
					case 'ZXY':
					case 'ZYX':
					case 'YZX':
					case 'XZY':
						this.axisOrder = t;
						break;
					default:
						this.axisOrder = 'XYZ';
				}
				return this;
			}
			copy(t) {
				return (this.elements = t.elements), (this.axisOrder = t.axisOrder), this;
			}
			clone() {
				return new nt().copy(this);
			}
			equals(t) {
				return (
					this.elements[0] === t.elements[0] &&
					this.elements[1] === t.elements[1] &&
					this.elements[2] === t.elements[2] &&
					this.elements[3] === t.elements[3] &&
					this.axisOrder === t.axisOrder
				);
			}
			setFromVec3(t) {
				const e = t.x * 0.5,
					s = t.y * 0.5,
					i = t.z * 0.5,
					r = Math.cos(e),
					n = Math.cos(s),
					h = Math.cos(i),
					o = Math.sin(e),
					l = Math.sin(s),
					d = Math.sin(i);
				return (
					this.axisOrder === 'XYZ'
						? ((this.elements[0] = o * n * h + r * l * d),
							(this.elements[1] = r * l * h - o * n * d),
							(this.elements[2] = r * n * d + o * l * h),
							(this.elements[3] = r * n * h - o * l * d))
						: this.axisOrder === 'YXZ'
							? ((this.elements[0] = o * n * h + r * l * d),
								(this.elements[1] = r * l * h - o * n * d),
								(this.elements[2] = r * n * d - o * l * h),
								(this.elements[3] = r * n * h + o * l * d))
							: this.axisOrder === 'ZXY'
								? ((this.elements[0] = o * n * h - r * l * d),
									(this.elements[1] = r * l * h + o * n * d),
									(this.elements[2] = r * n * d + o * l * h),
									(this.elements[3] = r * n * h - o * l * d))
								: this.axisOrder === 'ZYX'
									? ((this.elements[0] = o * n * h - r * l * d),
										(this.elements[1] = r * l * h + o * n * d),
										(this.elements[2] = r * n * d - o * l * h),
										(this.elements[3] = r * n * h + o * l * d))
									: this.axisOrder === 'YZX'
										? ((this.elements[0] = o * n * h + r * l * d),
											(this.elements[1] = r * l * h + o * n * d),
											(this.elements[2] = r * n * d - o * l * h),
											(this.elements[3] = r * n * h - o * l * d))
										: this.axisOrder === 'XZY' &&
											((this.elements[0] = o * n * h - r * l * d),
											(this.elements[1] = r * l * h - o * n * d),
											(this.elements[2] = r * n * d + o * l * h),
											(this.elements[3] = r * n * h + o * l * d)),
					this
				);
			}
		}
		const me = new F(),
			fe = new P(),
			_e = new P(),
			xe = new P(),
			ye = new P(),
			ve = new P(),
			be = new P(),
			L = new P(),
			z = new P(),
			Rt = new nt(),
			we = new P(0.5, 0.5, 0),
			Pe = new P(),
			Te = new P(),
			Se = new P(),
			Re = new P(),
			Ee = new F();
		class Et extends pe {
			constructor(
				t,
				e,
				{
					widthSegments: s,
					heightSegments: i,
					renderOrder: r,
					depthTest: n,
					cullFace: h,
					uniforms: o,
					vertexShaderID: l,
					fragmentShaderID: d,
					vertexShader: c,
					fragmentShader: u,
					texturesOptions: p,
					crossOrigin: g,
					alwaysDraw: x = !1,
					visible: E = !0,
					transparent: _ = !1,
					drawCheckMargins: f = { top: 0, right: 0, bottom: 0, left: 0 },
					autoloadSources: y = !0,
					watchScroll: v = !0,
					fov: T = 50
				} = {}
			) {
				super(t, e, 'Plane', {
					widthSegments: s,
					heightSegments: i,
					renderOrder: r,
					depthTest: n,
					cullFace: h,
					uniforms: o,
					vertexShaderID: l,
					fragmentShaderID: d,
					vertexShader: c,
					fragmentShader: u,
					texturesOptions: p,
					crossOrigin: g
				}),
					this.gl &&
						((this.index = this.renderer.planes.length),
						(this.target = null),
						(this.alwaysDraw = x),
						(this._shouldDraw = !0),
						(this.visible = E),
						(this._transparent = _),
						(this.drawCheckMargins = f),
						(this.autoloadSources = y),
						(this.watchScroll = v),
						(this._updateMVMatrix = !1),
						(this.camera = new ge({
							fov: T,
							width: this.renderer._boundingRect.width,
							height: this.renderer._boundingRect.height,
							pixelRatio: this.renderer.pixelRatio
						})),
						this._program.compiled &&
							(this._initPlane(),
							this.renderer.scene.addPlane(this),
							this.renderer.planes.push(this)));
			}
			_programRestored() {
				this.target && this.setRenderTarget(this.renderer.renderTargets[this.target.index]),
					this._initMatrices(),
					this.setPerspective(this.camera.fov, this.camera.near, this.camera.far),
					this._setWorldSizes(),
					this._applyWorldPositions(),
					this.renderer.scene.addPlane(this);
				for (let t = 0; t < this.textures.length; t++)
					(this.textures[t]._parent = this), this.textures[t]._restoreContext();
				this._canDraw = !0;
			}
			_initPlane() {
				this._initTransformValues(),
					this._initPositions(),
					this.setPerspective(this.camera.fov, this.camera.near, this.camera.far),
					this._initSources();
			}
			_initTransformValues() {
				(this.rotation = new P()),
					this.rotation.onChange(() => this._applyRotation()),
					(this.quaternion = new nt()),
					(this.relativeTranslation = new P()),
					this.relativeTranslation.onChange(() => this._setTranslation()),
					(this._translation = new P()),
					(this.scale = new P(1)),
					this.scale.onChange(() => {
						(this.scale.z = 1), this._applyScale();
					}),
					(this.transformOrigin = new P(0.5, 0.5, 0)),
					this.transformOrigin.onChange(() => {
						this._setWorldTransformOrigin(), (this._updateMVMatrix = !0);
					});
			}
			resetPlane(t) {
				this._initTransformValues(),
					this._setWorldTransformOrigin(),
					t !== null && t
						? ((this.htmlElement = t), this.resize())
						: !t &&
							!this.renderer.production &&
							m(
								this.type +
									': You are trying to reset a plane with a HTML element that does not exist. The old HTML element will be kept instead.'
							);
			}
			removeRenderTarget() {
				this.target &&
					(this.renderer.scene.removePlane(this),
					(this.target = null),
					this.renderer.scene.addPlane(this));
			}
			_initPositions() {
				this._initMatrices(), this._setWorldSizes(), this._applyWorldPositions();
			}
			_initMatrices() {
				const t = new N();
				this._matrices = {
					world: { matrix: t },
					modelView: {
						name: 'uMVMatrix',
						matrix: t,
						location: this.gl.getUniformLocation(this._program.program, 'uMVMatrix')
					},
					projection: {
						name: 'uPMatrix',
						matrix: t,
						location: this.gl.getUniformLocation(this._program.program, 'uPMatrix')
					},
					modelViewProjection: { matrix: t }
				};
			}
			_setPerspectiveMatrix() {
				this.camera._shouldUpdate &&
					(this.renderer.useProgram(this._program),
					this.gl.uniformMatrix4fv(
						this._matrices.projection.location,
						!1,
						this._matrices.projection.matrix.elements
					)),
					this.camera.cancelUpdate();
			}
			setPerspective(t, e, s) {
				this.camera.setPerspective(
					t,
					e,
					s,
					this.renderer._boundingRect.width,
					this.renderer._boundingRect.height,
					this.renderer.pixelRatio
				),
					this.renderer.state.isContextLost && this.camera.forceUpdate(),
					(this._matrices.projection.matrix = this.camera.projectionMatrix),
					this.camera._shouldUpdate &&
						(this._setWorldSizes(),
						this._applyWorldPositions(),
						(this._translation.z = this.relativeTranslation.z / this.camera.CSSPerspective)),
					(this._updateMVMatrix = this.camera._shouldUpdate);
			}
			_setMVMatrix() {
				this._updateMVMatrix &&
					((this._matrices.world.matrix = this._matrices.world.matrix.composeFromOrigin(
						this._translation,
						this.quaternion,
						this.scale,
						this._boundingRect.world.transformOrigin
					)),
					this._matrices.world.matrix.scale({
						x: this._boundingRect.world.width,
						y: this._boundingRect.world.height,
						z: 1
					}),
					this._matrices.modelView.matrix.copy(this._matrices.world.matrix),
					(this._matrices.modelView.matrix.elements[14] -= this.camera.position.z),
					(this._matrices.modelViewProjection.matrix = this._matrices.projection.matrix.multiply(
						this._matrices.modelView.matrix
					)),
					this.alwaysDraw || this._shouldDrawCheck(),
					this.renderer.useProgram(this._program),
					this.gl.uniformMatrix4fv(
						this._matrices.modelView.location,
						!1,
						this._matrices.modelView.matrix.elements
					)),
					(this._updateMVMatrix = !1);
			}
			_setWorldTransformOrigin() {
				this._boundingRect.world.transformOrigin = new P(
					(this.transformOrigin.x * 2 - 1) * this._boundingRect.world.width,
					-(this.transformOrigin.y * 2 - 1) * this._boundingRect.world.height,
					this.transformOrigin.z
				);
			}
			_documentToWorldSpace(t) {
				return _e.set(
					((t.x * this.renderer.pixelRatio) / this.renderer._boundingRect.width) *
						this._boundingRect.world.ratios.width,
					-((t.y * this.renderer.pixelRatio) / this.renderer._boundingRect.height) *
						this._boundingRect.world.ratios.height,
					t.z
				);
			}
			_setWorldSizes() {
				const t = this.camera.getScreenRatiosFromFov();
				(this._boundingRect.world = {
					width:
						((this._boundingRect.document.width / this.renderer._boundingRect.width) * t.width) / 2,
					height:
						((this._boundingRect.document.height / this.renderer._boundingRect.height) * t.height) /
						2,
					ratios: t
				}),
					this._setWorldTransformOrigin();
			}
			_setWorldPosition() {
				const t = {
						x: this._boundingRect.document.width / 2 + this._boundingRect.document.left,
						y: this._boundingRect.document.height / 2 + this._boundingRect.document.top
					},
					e = {
						x: this.renderer._boundingRect.width / 2 + this.renderer._boundingRect.left,
						y: this.renderer._boundingRect.height / 2 + this.renderer._boundingRect.top
					};
				(this._boundingRect.world.top =
					((e.y - t.y) / this.renderer._boundingRect.height) *
					this._boundingRect.world.ratios.height),
					(this._boundingRect.world.left =
						((t.x - e.x) / this.renderer._boundingRect.width) *
						this._boundingRect.world.ratios.width);
			}
			setScale(t) {
				if (!t.type || t.type !== 'Vec2') {
					this.renderer.production ||
						m(
							this.type + ': Cannot set scale because the parameter passed is not of Vec2 type:',
							t
						);
					return;
				}
				t.sanitizeNaNValuesWith(this.scale).max(me.set(0.001, 0.001)),
					(t.x !== this.scale.x || t.y !== this.scale.y) &&
						(this.scale.set(t.x, t.y, 1), this._applyScale());
			}
			_applyScale() {
				for (let t = 0; t < this.textures.length; t++) this.textures[t].resize();
				this._updateMVMatrix = !0;
			}
			setRotation(t) {
				if (!t.type || t.type !== 'Vec3') {
					this.renderer.production ||
						m(
							this.type + ': Cannot set rotation because the parameter passed is not of Vec3 type:',
							t
						);
					return;
				}
				t.sanitizeNaNValuesWith(this.rotation),
					t.equals(this.rotation) || (this.rotation.copy(t), this._applyRotation());
			}
			_applyRotation() {
				this.quaternion.setFromVec3(this.rotation), (this._updateMVMatrix = !0);
			}
			setTransformOrigin(t) {
				if (!t.type || t.type !== 'Vec3') {
					this.renderer.production ||
						m(
							this.type +
								': Cannot set transform origin because the parameter passed is not of Vec3 type:',
							t
						);
					return;
				}
				t.sanitizeNaNValuesWith(this.transformOrigin),
					t.equals(this.transformOrigin) ||
						(this.transformOrigin.copy(t),
						this._setWorldTransformOrigin(),
						(this._updateMVMatrix = !0));
			}
			_setTranslation() {
				let t = fe.set(0, 0, 0);
				this.relativeTranslation.equals(t) ||
					(t = this._documentToWorldSpace(this.relativeTranslation)),
					this._translation.set(
						this._boundingRect.world.left + t.x,
						this._boundingRect.world.top + t.y,
						this.relativeTranslation.z / this.camera.CSSPerspective
					),
					(this._updateMVMatrix = !0);
			}
			setRelativeTranslation(t) {
				if (!t.type || t.type !== 'Vec3') {
					this.renderer.production ||
						m(
							this.type +
								': Cannot set translation because the parameter passed is not of Vec3 type:',
							t
						);
					return;
				}
				t.sanitizeNaNValuesWith(this.relativeTranslation),
					t.equals(this.relativeTranslation) ||
						(this.relativeTranslation.copy(t), this._setTranslation());
			}
			_applyWorldPositions() {
				this._setWorldPosition(), this._setTranslation();
			}
			updatePosition() {
				this._setDocumentSizes(), this._applyWorldPositions();
			}
			updateScrollPosition(t, e) {
				(t || e) &&
					((this._boundingRect.document.top += e * this.renderer.pixelRatio),
					(this._boundingRect.document.left += t * this.renderer.pixelRatio),
					this._applyWorldPositions());
			}
			_getIntersection(t, e) {
				let s = e.clone().sub(t),
					i = t.clone();
				for (; i.z > -1; ) i.add(s);
				return i;
			}
			_getNearPlaneIntersections(t, e, s) {
				const i = this._matrices.modelViewProjection.matrix;
				if (s.length === 1)
					s[0] === 0
						? ((e[0] = this._getIntersection(e[1], L.set(0.95, 1, 0).applyMat4(i))),
							e.push(this._getIntersection(e[3], z.set(-1, -0.95, 0).applyMat4(i))))
						: s[0] === 1
							? ((e[1] = this._getIntersection(e[0], L.set(-0.95, 1, 0).applyMat4(i))),
								e.push(this._getIntersection(e[2], z.set(1, -0.95, 0).applyMat4(i))))
							: s[0] === 2
								? ((e[2] = this._getIntersection(e[3], L.set(-0.95, -1, 0).applyMat4(i))),
									e.push(this._getIntersection(e[1], z.set(1, 0.95, 0).applyMat4(i))))
								: s[0] === 3 &&
									((e[3] = this._getIntersection(e[2], L.set(0.95, -1, 0).applyMat4(i))),
									e.push(this._getIntersection(e[0], z.set(-1, 0.95, 0).applyMat4(i))));
				else if (s.length === 2)
					s[0] === 0 && s[1] === 1
						? ((e[0] = this._getIntersection(e[3], L.set(-1, -0.95, 0).applyMat4(i))),
							(e[1] = this._getIntersection(e[2], z.set(1, -0.95, 0).applyMat4(i))))
						: s[0] === 1 && s[1] === 2
							? ((e[1] = this._getIntersection(e[0], L.set(-0.95, 1, 0).applyMat4(i))),
								(e[2] = this._getIntersection(e[3], z.set(-0.95, -1, 0).applyMat4(i))))
							: s[0] === 2 && s[1] === 3
								? ((e[2] = this._getIntersection(e[1], L.set(1, 0.95, 0).applyMat4(i))),
									(e[3] = this._getIntersection(e[0], z.set(-1, 0.95, 0).applyMat4(i))))
								: s[0] === 0 &&
									s[1] === 3 &&
									((e[0] = this._getIntersection(e[1], L.set(0.95, 1, 0).applyMat4(i))),
									(e[3] = this._getIntersection(e[2], z.set(0.95, -1, 0).applyMat4(i))));
				else if (s.length === 3) {
					let r = 0;
					for (let n = 0; n < t.length; n++) s.includes(n) || (r = n);
					(e = [e[r]]),
						r === 0
							? (e.push(this._getIntersection(e[0], L.set(-0.95, 1, 0).applyMat4(i))),
								e.push(this._getIntersection(e[0], z.set(-1, 0.95, 0).applyMat4(i))))
							: r === 1
								? (e.push(this._getIntersection(e[0], L.set(0.95, 1, 0).applyMat4(i))),
									e.push(this._getIntersection(e[0], z.set(1, 0.95, 0).applyMat4(i))))
								: r === 2
									? (e.push(this._getIntersection(e[0], L.set(0.95, -1, 0).applyMat4(i))),
										e.push(this._getIntersection(e[0], z.set(1, -0.95, 0).applyMat4(i))))
									: r === 3 &&
										(e.push(this._getIntersection(e[0], L.set(-0.95, -1, 0).applyMat4(i))),
										e.push(this._getIntersection(e[0], z.set(-1 - 0.95, 0).applyMat4(i))));
				} else for (let r = 0; r < t.length; r++) (e[r][0] = 1e4), (e[r][1] = 1e4);
				return e;
			}
			_getWorldCoords() {
				const t = [xe.set(-1, 1, 0), ye.set(1, 1, 0), ve.set(1, -1, 0), be.set(-1, -1, 0)];
				let e = [],
					s = [];
				for (let o = 0; o < t.length; o++) {
					const l = t[o].applyMat4(this._matrices.modelViewProjection.matrix);
					e.push(l), Math.abs(l.z) > 1 && s.push(o);
				}
				s.length && (e = this._getNearPlaneIntersections(t, e, s));
				let i = 1 / 0,
					r = -1 / 0,
					n = 1 / 0,
					h = -1 / 0;
				for (let o = 0; o < e.length; o++) {
					const l = e[o];
					l.x < i && (i = l.x), l.x > r && (r = l.x), l.y < n && (n = l.y), l.y > h && (h = l.y);
				}
				return { top: h, right: r, bottom: n, left: i };
			}
			_computeWebGLBoundingRect() {
				const t = this._getWorldCoords();
				let e = {
					top: 1 - (t.top + 1) / 2,
					right: (t.right + 1) / 2,
					bottom: 1 - (t.bottom + 1) / 2,
					left: (t.left + 1) / 2
				};
				(e.width = e.right - e.left),
					(e.height = e.bottom - e.top),
					(this._boundingRect.worldToDocument = {
						width: e.width * this.renderer._boundingRect.width,
						height: e.height * this.renderer._boundingRect.height,
						top: e.top * this.renderer._boundingRect.height + this.renderer._boundingRect.top,
						left: e.left * this.renderer._boundingRect.width + this.renderer._boundingRect.left,
						right:
							e.left * this.renderer._boundingRect.width +
							this.renderer._boundingRect.left +
							e.width * this.renderer._boundingRect.width,
						bottom:
							e.top * this.renderer._boundingRect.height +
							this.renderer._boundingRect.top +
							e.height * this.renderer._boundingRect.height
					});
			}
			getWebGLBoundingRect() {
				if (this._matrices.modelViewProjection)
					(!this._boundingRect.worldToDocument || this.alwaysDraw) &&
						this._computeWebGLBoundingRect();
				else return this._boundingRect.document;
				return this._boundingRect.worldToDocument;
			}
			_getWebGLDrawRect() {
				return (
					this._computeWebGLBoundingRect(),
					{
						top: this._boundingRect.worldToDocument.top - this.drawCheckMargins.top,
						right: this._boundingRect.worldToDocument.right + this.drawCheckMargins.right,
						bottom: this._boundingRect.worldToDocument.bottom + this.drawCheckMargins.bottom,
						left: this._boundingRect.worldToDocument.left - this.drawCheckMargins.left
					}
				);
			}
			_shouldDrawCheck() {
				const t = this._getWebGLDrawRect();
				Math.round(t.right) <= this.renderer._boundingRect.left ||
				Math.round(t.left) >=
					this.renderer._boundingRect.left + this.renderer._boundingRect.width ||
				Math.round(t.bottom) <= this.renderer._boundingRect.top ||
				Math.round(t.top) >= this.renderer._boundingRect.top + this.renderer._boundingRect.height
					? this._shouldDraw &&
						((this._shouldDraw = !1),
						this.renderer.nextRender.add(
							() => this._onLeaveViewCallback && this._onLeaveViewCallback()
						))
					: (this._shouldDraw ||
							this.renderer.nextRender.add(
								() => this._onReEnterViewCallback && this._onReEnterViewCallback()
							),
						(this._shouldDraw = !0));
			}
			isDrawn() {
				return this._canDraw && this.visible && (this._shouldDraw || this.alwaysDraw);
			}
			enableDepthTest(t) {
				this._depthTest = t;
			}
			_initSources() {
				let t = 0;
				if (this.autoloadSources) {
					const e = this.htmlElement.getElementsByTagName('img'),
						s = this.htmlElement.getElementsByTagName('video'),
						i = this.htmlElement.getElementsByTagName('canvas');
					e.length && this.loadImages(e),
						s.length && this.loadVideos(s),
						i.length && this.loadCanvases(i),
						(t = e.length + s.length + i.length);
				}
				this.loader._setLoaderSize(t), (this._canDraw = !0);
			}
			_startDrawing() {
				this._canDraw &&
					(this._onRenderCallback && this._onRenderCallback(),
					this.target
						? this.renderer.bindFrameBuffer(this.target)
						: this.renderer.state.scenePassIndex === null && this.renderer.bindFrameBuffer(null),
					this._setPerspectiveMatrix(),
					this._setMVMatrix(),
					(this.alwaysDraw || this._shouldDraw) && this.visible && this._draw());
			}
			mouseToPlaneCoords(t) {
				if (
					(Rt.setAxisOrder(this.quaternion.axisOrder),
					Rt.equals(this.quaternion) && we.equals(this.transformOrigin))
				)
					return super.mouseToPlaneCoords(t);
				{
					const e = {
							x: 2 * (t.x / (this.renderer._boundingRect.width / this.renderer.pixelRatio)) - 1,
							y: 2 * (1 - t.y / (this.renderer._boundingRect.height / this.renderer.pixelRatio)) - 1
						},
						s = this.camera.position.clone(),
						i = Pe.set(e.x, e.y, -0.5);
					i.unproject(this.camera), i.sub(s).normalize();
					const r = Te.set(0, 0, -1);
					r.applyQuat(this.quaternion).normalize();
					const n = Re.set(0, 0, 0),
						h = r.dot(i);
					if (Math.abs(h) >= 1e-4) {
						const o = this._matrices.world.matrix.getInverse().multiply(this.camera.viewMatrix),
							l = this._boundingRect.world.transformOrigin.clone().add(this._translation),
							d = Se.set(
								this._translation.x - l.x,
								this._translation.y - l.y,
								this._translation.z - l.z
							);
						d.applyQuat(this.quaternion), l.add(d);
						const c = r.dot(l.clone().sub(s)) / h;
						n.copy(s.add(i.multiplyScalar(c))), n.applyMat4(o);
					} else n.set(1 / 0, 1 / 0, 1 / 0);
					return Ee.set(n.x, n.y);
				}
			}
			onReEnterView(t) {
				return t && (this._onReEnterViewCallback = t), this;
			}
			onLeaveView(t) {
				return t && (this._onLeaveViewCallback = t), this;
			}
		}
		class mt {
			constructor(
				t,
				{
					shaderPass: e,
					depth: s = !1,
					clear: i = !0,
					maxWidth: r,
					maxHeight: n,
					minWidth: h = 1024,
					minHeight: o = 1024,
					texturesOptions: l = {}
				} = {}
			) {
				if (
					((this.type = 'RenderTarget'), (t = (t && t.renderer) || t), !t || t.type !== 'Renderer')
				)
					k(this.type + ': Renderer not passed as first argument', t);
				else if (!t.gl) {
					t.production ||
						k(
							this.type +
								': Unable to create a ' +
								this.type +
								' because the Renderer WebGL context is not defined'
						);
					return;
				}
				(this.renderer = t),
					(this.gl = this.renderer.gl),
					(this.index = this.renderer.renderTargets.length),
					(this._shaderPass = e),
					(this._depth = s),
					(this._shouldClear = i),
					(this._maxSize = {
						width: r
							? Math.min(this.renderer.state.maxTextureSize / 4, r)
							: this.renderer.state.maxTextureSize / 4,
						height: n
							? Math.min(this.renderer.state.maxTextureSize / 4, n)
							: this.renderer.state.maxTextureSize / 4
					}),
					(this._minSize = {
						width: h * this.renderer.pixelRatio,
						height: o * this.renderer.pixelRatio
					}),
					(l = Object.assign(
						{
							sampler: 'uRenderTexture',
							isFBOTexture: !0,
							premultiplyAlpha: !1,
							anisotropy: 1,
							generateMipmap: !1,
							floatingPoint: 'none',
							wrapS: this.gl.CLAMP_TO_EDGE,
							wrapT: this.gl.CLAMP_TO_EDGE,
							minFilter: this.gl.LINEAR,
							magFilter: this.gl.LINEAR
						},
						l
					)),
					(this._texturesOptions = l),
					(this.userData = {}),
					(this.uuid = pt()),
					this.renderer.renderTargets.push(this),
					this.renderer.onSceneChange(),
					this._initRenderTarget();
			}
			_initRenderTarget() {
				this._setSize(), (this.textures = []), this._createFrameBuffer();
			}
			_restoreContext() {
				this._setSize(), this._createFrameBuffer();
			}
			_setSize() {
				this._shaderPass && this._shaderPass._isScenePass
					? (this._size = {
							width: this.renderer._boundingRect.width,
							height: this.renderer._boundingRect.height
						})
					: (this._size = {
							width: Math.min(
								this._maxSize.width,
								Math.max(this._minSize.width, this.renderer._boundingRect.width)
							),
							height: Math.min(
								this._maxSize.height,
								Math.max(this._minSize.height, this.renderer._boundingRect.height)
							)
						});
			}
			resize() {
				this._shaderPass &&
					(this._setSize(),
					this.textures[0].resize(),
					this.renderer.bindFrameBuffer(this, !0),
					this._depth && this._bindDepthBuffer(),
					this.renderer.bindFrameBuffer(null));
			}
			_bindDepthBuffer() {
				this._depthBuffer &&
					(this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, this._depthBuffer),
					this.gl.renderbufferStorage(
						this.gl.RENDERBUFFER,
						this.gl.DEPTH_COMPONENT16,
						this._size.width,
						this._size.height
					),
					this.gl.framebufferRenderbuffer(
						this.gl.FRAMEBUFFER,
						this.gl.DEPTH_ATTACHMENT,
						this.gl.RENDERBUFFER,
						this._depthBuffer
					));
			}
			_createFrameBuffer() {
				(this._frameBuffer = this.gl.createFramebuffer()),
					this.renderer.bindFrameBuffer(this, !0),
					this.textures.length
						? ((this.textures[0]._parent = this), this.textures[0]._restoreContext())
						: new Z(this.renderer, this._texturesOptions).addParent(this),
					this.gl.framebufferTexture2D(
						this.gl.FRAMEBUFFER,
						this.gl.COLOR_ATTACHMENT0,
						this.gl.TEXTURE_2D,
						this.textures[0]._sampler.texture,
						0
					),
					this._depth &&
						((this._depthBuffer = this.gl.createRenderbuffer()), this._bindDepthBuffer()),
					this.renderer.bindFrameBuffer(null);
			}
			getTexture() {
				return this.textures[0];
			}
			remove() {
				if (this._shaderPass) {
					this.renderer.production ||
						m(
							this.type +
								": You're trying to remove a RenderTarget attached to a ShaderPass. You should remove that ShaderPass instead:",
							this._shaderPass
						);
					return;
				}
				this._dispose(), this.renderer.removeRenderTarget(this);
			}
			_dispose() {
				this._frameBuffer &&
					(this.gl.deleteFramebuffer(this._frameBuffer), (this._frameBuffer = null)),
					this._depthBuffer &&
						(this.gl.deleteRenderbuffer(this._depthBuffer), (this._depthBuffer = null)),
					this.textures[0]._dispose(),
					(this.textures = []);
			}
		}
		class Me extends Et {
			constructor(
				t,
				e,
				{
					sampler: s = 'uPingPongTexture',
					widthSegments: i,
					heightSegments: r,
					renderOrder: n,
					depthTest: h,
					cullFace: o,
					uniforms: l,
					vertexShaderID: d,
					fragmentShaderID: c,
					vertexShader: u,
					fragmentShader: p,
					texturesOptions: g,
					crossOrigin: x,
					alwaysDraw: E,
					visible: _,
					transparent: f,
					drawCheckMargins: y,
					autoloadSources: v,
					watchScroll: T,
					fov: R
				} = {}
			) {
				if (
					((h = !1),
					(v = !1),
					super(t, e, {
						widthSegments: i,
						heightSegments: r,
						renderOrder: n,
						depthTest: h,
						cullFace: o,
						uniforms: l,
						vertexShaderID: d,
						fragmentShaderID: c,
						vertexShader: u,
						fragmentShader: p,
						texturesOptions: g,
						crossOrigin: x,
						alwaysDraw: E,
						visible: _,
						transparent: f,
						drawCheckMargins: y,
						autoloadSources: v,
						watchScroll: T,
						fov: R
					}),
					!this.gl)
				)
					return;
				this.renderer.scene.removePlane(this),
					(this.type = 'PingPongPlane'),
					this.renderer.scene.addPlane(this),
					(this.readPass = new mt(t, { depth: !1, clear: !1, texturesOptions: g })),
					(this.writePass = new mt(t, { depth: !1, clear: !1, texturesOptions: g })),
					this.createTexture({ sampler: s });
				let w = 0;
				this.readPass.getTexture().onSourceUploaded(() => {
					w++, this._checkIfReady(w);
				}),
					this.writePass.getTexture().onSourceUploaded(() => {
						w++, this._checkIfReady(w);
					}),
					this.setRenderTarget(this.readPass),
					(this._onRenderCallback = () => {
						this.readPass &&
							this.writePass &&
							this.textures[0] &&
							this.textures[0]._uploaded &&
							this.setRenderTarget(this.writePass),
							this._onPingPongRenderCallback && this._onPingPongRenderCallback();
					}),
					(this._onAfterRenderCallback = () => {
						this.readPass &&
							this.writePass &&
							this.textures[0] &&
							this.textures[0]._uploaded &&
							this._swapPasses(),
							this._onPingPongAfterRenderCallback && this._onPingPongAfterRenderCallback();
					});
			}
			_checkIfReady(t) {
				t === 2 &&
					this.renderer.nextRender.add(() => {
						this.textures[0].copy(this.target.getTexture());
					});
			}
			_swapPasses() {
				const t = this.readPass;
				(this.readPass = this.writePass),
					(this.writePass = t),
					this.textures[0].copy(this.readPass.getTexture());
			}
			getTexture() {
				return this.textures[0];
			}
			onRender(t) {
				return t && (this._onPingPongRenderCallback = t), this;
			}
			onAfterRender(t) {
				return t && (this._onPingPongAfterRenderCallback = t), this;
			}
			remove() {
				(this.target = null),
					this.renderer.bindFrameBuffer(null),
					this.writePass && (this.writePass.remove(), (this.writePass = null)),
					this.readPass && (this.readPass.remove(), (this.readPass = null)),
					super.remove();
			}
		}
		const Ce = (a, t, e, s, i) => {
				var r = (Math.PI / 180) * i,
					n = Math.cos(r),
					h = Math.sin(r),
					o = n * (e - a) + h * (s - t) + a,
					l = n * (s - t) - h * (e - a) + t;
				return [+o.toFixed(1), +l.toFixed(1)];
			},
			Q = (a, t) => {
				const s = Math.min(...a.map((l) => l[0])),
					i = Math.max(...a.map((l) => l[0])),
					r = Math.min(...a.map((l) => l[1])),
					n = Math.max(...a.map((l) => l[1])),
					h = Math.abs(i - s),
					o = Math.abs(n - r);
				return {
					width: Math.round(h / 1),
					height: Math.round(o / 1),
					aspectRatio: h / 1 / (o / 1),
					center: { x: Math.round((h / 2 + s) / 1), y: Math.round((o / 2 + r) / 1) },
					corners: [
						[s, r],
						[i, r],
						[i, n],
						[s, n]
					]
				};
			},
			Mt = (a, t, e) => {
				let s;
				const i = Q(e);
				if (t.fill.length > 1) {
					let r = t.gradientAngle ? +t.gradientAngle * 2 * Math.PI : 0,
						n = i.center.x,
						h = i.center.y;
					t.gradientType === 'radial' &&
						(s = a.createRadialGradient(n, h, Math.max(i.width, i.height) * 0.7, n, h, 0));
					const o = Math.cos(r) * i.width,
						l = Math.sin(r) * i.height;
					if (
						(t.gradientType === 'linear' &&
							(s = a.createLinearGradient(n - o / 2, h - l / 2, n + o / 2, h + l / 2)),
						t.gradientType === 'conic')
					) {
						s = a.createConicGradient(-Math.PI + r, n, h);
						const d = [...t.fill, ...t.fill.slice().reverse()];
						d.forEach((c, u) => {
							s.addColorStop(u * (1 / (d.length - 1)), c);
						});
					} else
						t.fill.forEach((d, c) => {
							s.addColorStop(c * (1 / (t.fill.length - 1)), d);
						});
				} else s = t.fill[0];
				return s;
			};
		let ht,
			et,
			Ct,
			ft = !1,
			U = window.innerHeight,
			H = window.innerWidth,
			G = window.scrollY || window.pageYOffset,
			At = null,
			ot = 0,
			_t = 0;
		typeof document.hidden < 'u'
			? ((ht = 'hidden'), (et = 'visibilitychange'))
			: typeof document.msHidden < 'u'
				? ((ht = 'msHidden'), (et = 'msvisibilitychange'))
				: typeof document.webkitHidden < 'u' &&
					((ht = 'webkitHidden'), (et = 'webkitvisibilitychange'));
		function lt(a, t) {
			let e;
			return function (...s) {
				clearTimeout(e),
					(e = setTimeout(() => {
						a.apply(this, s);
					}, t));
			};
		}
		const kt = () => {
			var a = new Date().getTime(),
				t = (typeof performance < 'u' && performance.now && performance.now() * 1e3) || 0;
			return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (e) {
				var s = Math.random() * 16;
				return (
					a > 0
						? ((s = (a + s) % 16 | 0), (a = Math.floor(a / 16)))
						: ((s = (t + s) % 16 | 0), (t = Math.floor(t / 16))),
					(e === 'x' ? s : (s & 3) | 8).toString(16)
				);
			});
		};
		function V(a) {
			return a && typeof a == 'string' && (a = JSON.parse(a)), Object.values(a);
		}
		function J(a, t, e) {
			for (let s = 0; s < e; s++) a = (a + t) / 2;
			return +((a + t) / 2).toFixed(4);
		}
		function Ae(a) {
			const t = Q(a.coords),
				e = a.getPositionOffset();
			let s = a.coords.map(([i, r]) => Ce(t.center.x, t.center.y, i, r, -a.rotation * 360));
			return (s = s.map(([i, r]) => [Math.round(i + e.x), Math.round(r + e.y)])), s;
		}
		function K(a, t) {
			const e = a[0] / a[1],
				s = Math.sqrt(e * (3e5 * 1));
			return [s, s / e];
		}
		function Ft() {
			return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
				navigator.userAgent
			);
		}
		function st(a) {
			return ['mouse', 'waterRipple'].includes(a);
		}
		function tt(a) {
			const t =
				('trackMouse' in a && a.trackMouse > 0) ||
				('axisTilt' in a && a.axisTilt > 0) ||
				('trackMouseMove' in a && a.trackMouseMove > 0);
			let e = a.states && [...a.states.appear, ...a.states.scroll, ...a.states.hover].length,
				s = a.layerType === 'effect' && (a.animating || st(a.type));
			return t || s || e;
		}
		function ke(a, t, e) {
			const s = [];
			return (
				a.forEach((i) => {
					switch (i.layerType) {
						case 'text':
							s.push(new We(i, t, null, e).unpackage());
							break;
						case 'image':
							s.push(new Be(i, t, e).unpackage());
							break;
						case 'fill':
							s.push(new Lt(i, t, e).unpackage());
							break;
						case 'shape':
							s.push(new Ve(i, t, e).unpackage());
							break;
						case 'effect':
							s.push(new Lt(i, t, e).unpackage());
							break;
					}
				}),
				s
			);
		}
		function Fe(a, t) {
			const e = document.createElement('a');
			(e.href = 'https://unicorn.studio?utm_source=public-url'),
				(e.style =
					'position: absolute; display: flex; bottom: 30px; left: 0; width: 190px; margin: 0 auto; right: 0rem; padding: 10px; border-radius: 6px; background-color: rgba(255, 255, 255, 1); box-shadow: 0 3px 9px 0 rgba(0, 0, 0, .2); z-index: 99999999; box-sizing: border-box;'),
				(e.target = '_blank');
			const s = document.createElement('img');
			(s.src = 'https://assets.unicorn.studio/media/made_in_us_small_web.svg'),
				(s.alt = 'Made in unicorn.studio'),
				(s.style = 'width: 170px; height: auto;'),
				e.appendChild(s),
				t.appendChild(e);
		}
		function Ie(a, t) {
			const e = K([t.offsetWidth || a.width, t.offsetHeight || a.height])[0] / t.offsetWidth,
				s = a.getPositionOffset(),
				i = document.createElement('div');
			i.setAttribute('data-us-text', 'loading'),
				i.setAttribute('data-us-project', a.local.sceneId),
				(i.style.width = a.width / e + 'px'),
				(i.style.height = a.height / e + 'px'),
				(i.style.top = s.y / e + t.offsetTop + 'px'),
				(i.style.left = s.x / e + t.offsetLeft + 'px'),
				(i.style.fontSize = a.fontSize / e + 'px'),
				(i.style.lineHeight = a.lineHeight / e + 'px'),
				(i.style.letterSpacing = a.letterSpacing / e + 'px'),
				(i.style.fontFamily = a.fontFamily),
				(i.style.fontWeight = a.fontWeight),
				(i.style.textAlign = a.textAlign),
				(i.style.wordBreak = 'break-word'),
				(i.style.transform = `rotateZ(${Math.round(a.rotation * 360)}deg)`),
				(i.style.color = 'transparent'),
				(i.style.zIndex = 2),
				(i.innerText = a.textContent),
				t.appendChild(i);
		}
		let it;
		function It() {
			b.scenes.forEach((a, t) => {
				document.body.contains(a.element) || (a.curtain.dispose(), b.scenes.splice(t, 1));
			});
		}
		function xt() {
			cancelAnimationFrame(it);
			const a = b.scenes.filter((e) => e.getAnimatingEffects().length > 0),
				t = (e) => {
					let s = !1;
					a.forEach((i) => {
						i.isInView && i.initialized
							? ((i.rendering = !0),
								e - (i.lastTime || 0) >= i.frameDuration &&
									(i.updateMouseTrail(), i.curtain.render(), (i.lastTime = e)),
								(s = !0))
							: (i.rendering = !1);
					}),
						(G = window.scrollY || window.pageYOffset),
						(ot = G - At),
						(At = G),
						s ? (He(), (it = requestAnimationFrame(t))) : cancelAnimationFrame(it);
				};
			a.length && (it = requestAnimationFrame(t));
		}
		function Oe(a, t) {
			return new Promise((e) => {
				const s = setInterval(() => {
					a.local[t] && (clearInterval(s), e());
				}, 20);
			});
		}
		function A(a, t, e) {
			return a + (t - a) * e;
		}
		function Ot(a) {
			switch (a) {
				case 'linear':
					return (t) => t;
				case 'easeInQuad':
					return (t) => t * t;
				case 'easeOutQuad':
					return (t) => 1 - (1 - t) * (1 - t);
				case 'easeInOutQuad':
					return (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
				case 'easeInCubic':
					return (t) => t * t * t;
				case 'easeInOutCubic':
					return (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
				case 'easeOutCubic':
					return (t) => 1 - Math.pow(1 - t, 3);
				case 'easeInQuart':
					return (t) => t * t * t * t;
				case 'easeOutQuart':
					return (t) => 1 - Math.pow(1 - t, 4);
				case 'easeInOutQuart':
					return (t) => (t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2);
				case 'easeInQuint':
					return (t) => t * t * t * t * t;
				case 'easeOutQuint':
					return (t) => 1 - Math.pow(1 - t, 5);
				case 'easeInOutQuint':
					return (t) => (t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2);
				case 'easeOutElastic':
					return (t) => {
						const e = (2 * Math.PI) / 3;
						return t === 0
							? 0
							: t === 1
								? 1
								: Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * e) + 1;
					};
				case 'easeInElastic':
					return (t) => {
						const e = (2 * Math.PI) / 3;
						return t === 0
							? 0
							: t === 1
								? 1
								: -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * e);
					};
				case 'easeInOutElastic':
					return (t) => {
						const e = (2 * Math.PI) / 4.5;
						return t === 0
							? 0
							: t === 1
								? 1
								: t < 0.5
									? -(Math.pow(2, 20 * t - 10) * Math.sin((20 * t - 11.125) * e)) / 2
									: (Math.pow(2, -20 * t + 10) * Math.sin((20 * t - 11.125) * e)) / 2 + 1;
					};
				case 'easeInSine':
					return (t) => 1 - Math.cos((t * Math.PI) / 2);
				case 'easeOutSine':
					return (t) => Math.sin((t * Math.PI) / 2);
				case 'easeInOutSine':
					return (t) => -(Math.cos(Math.PI * t) - 1) / 2;
				case 'easeInCirc':
					return (t) => 1 - Math.sqrt(1 - Math.pow(t, 2));
				case 'easeOutCirc':
					return (t) => Math.sqrt(1 - Math.pow(t - 1, 2));
				case 'easeInOutCirc':
					return (t) =>
						t < 0.5
							? (1 - Math.sqrt(1 - Math.pow(2 * t, 2))) / 2
							: (Math.sqrt(1 - Math.pow(-2 * t + 2, 2)) + 1) / 2;
				case 'easeInExpo':
					return (t) => (t === 0 ? 0 : Math.pow(2, 10 * t - 10));
				case 'easeOutExpo':
					return (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));
				case 'easeInOutExpo':
					return (t) =>
						t === 0
							? 0
							: t === 1
								? 1
								: t < 0.5
									? Math.pow(2, 20 * t - 10) / 2
									: (2 - Math.pow(2, -20 * t + 10)) / 2;
				default:
					return (t) => t;
			}
		}
		function $(a, t) {
			let e = a;
			return (
				a.type === 'Vec2'
					? ((e = new F(a._x, a._y)), t && (e.y = 1 - e.y))
					: a.type === 'Vec3'
						? (e = new P(a._x, a._y, a._z))
						: (e = a),
				e
			);
		}
		class De {
			constructor({ prop: t, value: e, transition: s, uniformData: i }) {
				(this.prop = t),
					(this.transition = s),
					(this.complete = !1),
					(this.progress = 0),
					(this.initialStateSet = !1),
					(this.uniformData = i),
					(this.value = $(e, this.prop === 'pos'));
			}
			initializeState(t, e) {
				if (
					(e !== void 0 &&
						(typeof e == 'object'
							? ((this.endVal = $(e, this.prop === 'pos')),
								(this.startVal = $(this.value, this.prop === 'pos')))
							: (this.endVal = e)),
					t)
				) {
					if (typeof this.value == 'object') {
						let s;
						this.value.type === 'Vec2'
							? (s = new F(this.value._x, this.value._y))
							: this.value.type === 'Vec3' &&
								(s = new P(this.value._x, this.value._y, this.value._z)),
							(t.value = s);
					} else t.value = this.value;
					this.initialStateSet = !0;
				}
			}
			updateEffect(t) {
				const e = typeof this.value == 'object';
				if (this.complete || !t.userData.createdAt || !this.initialStateSet) return !1;
				const s = performance.now(),
					i = t.uniforms[this.prop],
					r = Ot(this.transition.ease),
					n = t.userData.createdAt + this.transition.delay,
					h = Math.max(0, Math.min(1, (s - n) / this.transition.duration));
				let o = this.value;
				if (h > 0 && h <= 1) {
					let l = r(h);
					e
						? ((i.value.x = A(o.x, this.endVal.x, l)),
							this.prop === 'pos'
								? (i.value.y = A(1 - o.y, this.endVal.y, l))
								: (i.value.y = A(o.y, this.endVal.y, l)),
							o.type === 'Vec3' && (i.value.z = A(o.z, this.endVal.z, l)))
						: (i.value = A(o, this.endVal, l));
				} else e ? (i.value = $(this.value, this.prop === 'pos')) : (i.value = this.value);
				return h >= 1 && ((this.complete = !0), (this.progress = 0)), (this.lastTick = s), !0;
			}
			resetState() {
				(this.progress = 0), (this.complete = !1), (this.initialStateSet = !1);
			}
		}
		class Le {
			constructor({
				prop: t,
				value: e,
				range: s,
				offset: i,
				momentum: r,
				uniformData: n,
				mode: h = 'scrollIntoView',
				delta: o = 0.01,
				absScrollValue: l = !0
			}) {
				D(this, 'type', 'scroll'),
					(this.prop = t),
					(this.progress = 0),
					(this.momentum = r),
					(this.range = s),
					(this.offset = i),
					(this.mode = h),
					(this.delta = o),
					(this.absScrollValue = l),
					(this.uniformData = n),
					(this.value = $(e, this.prop === 'pos'));
			}
			updateEffect(t, e, { top: s, height: i, isFixed: r }) {
				if (e === void 0) return !1;
				this.startVal ||
					(typeof this.value == 'object'
						? (this.startVal = $(e, this.prop === 'pos'))
						: (this.startVal = e));
				const n = typeof this.value == 'object',
					h = t.uniforms[this.prop];
				if ((r && (s -= G), this.mode === 'scrollIntoView')) {
					const o = s + G - U * this.offset,
						l = o + (U + i) * this.range;
					let d = (G - o) / (l - o),
						c = this.value;
					if (!h) return !1;
					let u = Math.max(0, Math.min(1, d));
					return (
						this.lastTick !== void 0 && (u = J(u, this.lastTick, this.momentum * 2)),
						this.lastTick !== void 0 && Math.abs(this.lastTick - u) < 0.001
							? !1
							: (n
									? ((h.value.x = A(this.startVal.x, c.x, u)),
										this.prop === 'pos'
											? (h.value.y = A(1 - this.startVal.y, c.y, u))
											: (h.value.y = A(this.startVal.y, c.y, u)),
										this.startVal.type === 'Vec3' && (h.value.z = A(this.startVal.z, c.z, u)))
									: (h.value = A(this.startVal, c, u)),
								(this.lastTick = u),
								!0)
					);
				} else if (this.mode === 'whileScrolling') {
					let o = ot * this.delta,
						l = this.value;
					if (
						(this.absScrollValue && (o = Math.abs(o)),
						this.lastTick !== void 0 &&
							((o = J(o, this.lastTick, this.momentum * 2)), Math.abs(o) < 0.001))
					)
						return !1;
					n
						? ((h.value.x = A(e.x, l.x, o)),
							(h.value.y = A(e.y, l.y, o)),
							e.type === 'Vec3' && (h.value.z = A(e.z, l.z, o)))
						: (h.value = A(e, l, o)),
						(this.lastScrollPos = G),
						(this.lastTick = o);
				}
				return !0;
			}
			resetState() {
				this.lastTick = void 0;
			}
		}
		class ze {
			constructor({ prop: t, value: e, transition: s, uniformData: i }) {
				D(this, 'type', 'hover'),
					(this.prop = t),
					(this.transition = s),
					(this.progress = 0),
					(this.rawProgress = 0),
					(this.lastProgress = null),
					(this.value = $(e, this.prop === 'pos')),
					(this.uniformData = i);
			}
			updateEffect(t, e, s) {
				if (e === void 0) return !1;
				const i = typeof this.value == 'object';
				let r = performance.now(),
					n,
					h = !1;
				s === null
					? ((h = !0), (n = this.lastTick || r), (this.lastProgress = this.rawProgress))
					: (n = s + this.transition.delay);
				const o = t.uniforms[this.prop],
					l = Math.max(0, Math.min(1, (r - n) / this.transition.duration));
				let d = h ? this.rawProgress - l : this.lastProgress + l;
				(this.rawProgress = Math.max(0, Math.min(1, d))),
					(this.progress = Ot(this.transition.ease)(this.rawProgress));
				const c = () => {
					i
						? ((o.value.x = A(e.x, this.value.x, this.progress)),
							this.prop === 'pos'
								? (o.value.y = A(e.y, 1 - this.value.y, this.progress))
								: (o.value.y = A(e.y, this.value.y, this.progress)),
							this.value.type === 'Vec3' && (o.value.z = A(e.z, this.value.z, this.progress)))
						: (o.value = A(e, this.value, this.progress));
				};
				return o
					? !s && this.progress === 0
						? (this.lastProgress !== this.progress && c(), !1)
						: (!s && this.transition.forwardsOnly && ((this.progress = 0), (this.rawProgress = 0)),
							c(),
							(this.lastTick = r),
							(this.lastEnterTime = s),
							this.progress > 0 && this.progress < 1)
					: !1;
			}
			resetState() {
				this.progress = 0;
			}
		}
		function Ue(a) {
			return (
				a.forEach((t) => {
					var e, s;
					for (let i in t.props)
						((e = t.props[i]) == null ? void 0 : e.type) === 'Vec2'
							? (t.props[i] = new F(t.props[i]._x, t.props[i]._y))
							: ((s = t.props[i]) == null ? void 0 : s.type) === 'Vec3'
								? (t.props[i] = new P(t.props[i]._x, t.props[i]._y, t.props[i]._z))
								: typeof t.props[i] == 'object' && (t.props[i] = V(t.props[i]));
				}),
				a
			);
		}
		class Dt {
			constructor(t, e) {
				D(this, 'local', { id: '', projectId: '' }),
					(this.visible = t.visible !== void 0 ? t.visible : !t.hidden || !0),
					(this.locked = t.locked || !1),
					(this.aspectRatio = t.aspectRatio || 1),
					(this.breakpoints = Ue(t.breakpoints || [])),
					(this.local.sceneId = e),
					(this.local.id = kt());
			}
			state() {
				return b.scenes.find((t) => t.id === this.local.sceneId) || this.initOptions;
			}
			getIndex() {
				return this.state()
					.layers.map((t) => t.local.id)
					.indexOf(this.local.id);
			}
			getPlane() {
				return this.state().curtain.planes.find(
					(t) => t.type !== 'PingPongPlane' && t.userData.id === this.local.id
				);
			}
			getPlanes() {
				return this.state().curtain.planes.filter(
					(t) => t.type !== 'PingPongPlane' && t.userData.id === this.local.id
				);
			}
			getMaskedItem() {
				return this.mask
					? this.state().layers.filter((t) => t.visible && !t.parentLayer)[this.getIndex() - 1]
					: !1;
			}
			getChildEffectItems() {
				if (this.effects && this.effects.length) {
					const t = this.state().layers.filter((e) => this.effects.includes(e.parentLayer));
					return this.effects
						.map((e) => t.find((s) => s.parentLayer === e))
						.filter((e) => e !== void 0);
				} else return [];
			}
			setBreakpointValues() {
				const t = H,
					e = this.breakpoints.sort((r, n) => n.min - r.min),
					s = {};
				if (e.length === 1 && e[0].name === 'Desktop') return;
				if (e.length >= 1 && !e.find((r) => r.name === 'Desktop'))
					throw new Error('Malfored breakpoint data, missing Desktop');
				for (let r = e.length - 1; r >= 0; r--) {
					const n = e[r];
					if (n.max === null || t <= n.max)
						for (let h in n.props) s.hasOwnProperty(h) || (s[h] = n.props[h]);
				}
				const i = this.breakpoints.find((r) => r.name === 'Desktop');
				if (i) for (let r in i.props) s.hasOwnProperty(r) || (s[r] = i.props[r]);
				for (let r in s)
					if (this.hasOwnProperty(r)) {
						let n = s[r];
						n.type
							? ((this[r].x = n._x), (this[r].y = n._y), n._z !== void 0 && (this[r].z = n._z))
							: (this[r] = n);
					}
				this.local.bpProps = s;
			}
		}
		let yt = class extends Dt {
			constructor(a, t, e) {
				super(a, t),
					D(this, 'isElement', !0),
					(this.initOptions = e),
					(this.opacity = a.opacity || 1),
					(this.displace = a.displace || 0),
					(this.trackMouse = a.trackMouse || 0),
					(this.axisTilt = a.axisTilt || 0),
					(this.bgDisplace = a.bgDisplace || 0),
					(this.dispersion = a.dispersion || 0),
					(this.mouseMomentum = a.mouseMomentum || 0),
					(this.blendMode = a.blendMode || 'NORMAL'),
					(this.compiledFragmentShaders = a.compiledFragmentShaders || []),
					(this.compiledVertexShaders = a.compiledVertexShaders || []);
			}
			createLocalCanvas() {
				const a = this.state(),
					t = document.createElement('canvas'),
					e = a.dpi * a.scale;
				(t.width = a.element.offsetWidth * e), (t.height = a.element.offsetHeight * e);
				const s = K([a.element.offsetWidth, a.element.offsetHeight])[0] / a.element.offsetWidth,
					i = t.getContext('2d');
				i.scale(e / s, e / s), (this.local.canvas = t), (this.local.ctx = i);
			}
			resize() {
				const a = this.state();
				if (this.local.canvas) {
					const t = +a.dpi * a.scale,
						e = K([a.element.offsetWidth, a.element.offsetHeight])[0] / a.element.offsetWidth;
					(this.local.canvas.width = a.canvasWidth),
						(this.local.canvas.height = a.canvasHeight),
						this.local.ctx.scale(t / e, t / e);
				}
			}
			getPositionOffset() {
				const a = this.state(),
					t = a.canvasWidth / a.canvasHeight,
					e = this.aspectRatio / t,
					s = a.canvasWidth * Math.sqrt(e),
					i = a.canvasHeight / Math.sqrt(e),
					r = K([a.element.offsetWidth, a.element.offsetHeight])[0] / a.element.offsetWidth;
				let n = (a.canvasWidth * r - s * r) / (a.dpi * 2),
					h = (a.canvasHeight * r - i * r) / (a.dpi * 2);
				this.layerType === 'image' && ((n += (s * r) / (a.dpi * 2)), (h += (i * r) / (a.dpi * 2)));
				let o = this.translateX + n,
					l = this.translateY + h;
				return { x: o, y: l, offX: n, offY: h };
			}
			dispose() {
				this.local.canvas &&
					((this.local.canvas.width = 1),
					(this.local.canvas.height = 1),
					(this.local.canvas = null)),
					this.local.ctx && (this.local.ctx = null);
			}
		};
		class Ve extends yt {
			constructor(t, e, s) {
				super(t, e),
					D(this, 'layerType', 'shape'),
					D(this, 'isElement', !0),
					(this.initOptions = s);
				let i = this.default(t || {});
				for (let r in i) this[r] = i[r];
				this.breakpoints.length && this.setBreakpointValues(),
					Object.keys(t).length && this.createLocalCanvas();
			}
			default(t) {
				return {
					blendMode: t.blendMode || 'NORMAL',
					borderRadius: t.borderRadius || 0,
					coords: t.coords || [],
					displace: t.displace || 0,
					dispersion: t.dispersion || 0,
					bgDisplace: t.bgDisplace || 0,
					effects: t.effects || [],
					fill: t.fill || ['#777777'],
					fitToCanvas: t.fitToCanvas || !1,
					gradientAngle: t.gradientAngle || t.gradAngle || 0,
					gradientType: t.gradientType || t.gradType || 'linear',
					mask: t.mask || 0,
					numSides: t.numSides || 3,
					opacity: t.opacity || 1,
					rotation: t.rotation || 0,
					translateX: t.translateX || 0,
					translateY: t.translateY || 0,
					type: t.type || 'rectangle',
					stroke: t.stroke || ['#000000'],
					strokeWidth: t.strokeWidth || 0,
					width: t.width || null,
					height: t.height || null
				};
			}
			unpackage() {
				return (
					(this.fill = V(this.fill)),
					(this.stroke = V(this.stroke)),
					(this.coords = V(this.coords)),
					this.coords.length &&
						(!this.width || !this.height) &&
						((this.width = [this.coords[0][0], this.coords[1][0]]),
						(this.height = [this.coords[1][1], this.coords[2][1]])),
					(this.effects = V(this.effects)),
					this.render(),
					this
				);
			}
			render() {
				let t;
				if (this.fitToCanvas) {
					const e = this.state(),
						s = K([e.element.offsetWidth, e.element.offsetHeight])[0] / e.element.offsetWidth,
						i = e.dpi * e.scale;
					let r = (e.canvasWidth * s) / i,
						n = (e.canvasHeight * s) / i;
					(this.coords = [
						[0, 0],
						[r, 0],
						[r, n],
						[0, n]
					]),
						(t = this.coords);
				} else
					(this.coords = [
						[this.width[0], this.height[0]],
						[this.width[1], this.height[0]],
						[this.width[1], this.height[1]],
						[this.width[0], this.height[1]]
					]),
						(t = Ae(this));
				if ((this.local.ctx.beginPath(), this.type === 'rectangle')) {
					const e = Q(this.coords);
					let s = (this.borderRadius * Math.min(e.width, e.height)) / 2;
					const i = (n, h, o) => {
							const l = Math.cos(o),
								d = Math.sin(o);
							return [n * l - h * d, n * d + h * l];
						},
						r = this.rotation * 2 * Math.PI;
					if (t.length) {
						this.local.ctx.beginPath();
						let n = [-1, 1, -1, 1];
						if (!this.fitToCanvas) {
							let h = this.coords[0][0] < this.coords[1][0],
								o = this.coords[0][1] > this.coords[2][1];
							h && (n = [-1, -1, -1, -1]), o && (n = [1, 1, 1, 1]), h && o && (n = [1, -1, 1, -1]);
						}
						for (let h = 0; h < t.length; h++) {
							const [o, l] = t[h],
								[d, c] = t[(h + 1) % t.length],
								u = ((h + 1) * Math.PI) / 2 + r,
								[p, g] = i(s, 0, u);
							let x = n[h];
							this.local.ctx.lineTo(o - p * x, l - g * x), this.local.ctx.arcTo(o, l, d, c, s);
						}
						this.local.ctx.closePath(), this.local.ctx.stroke();
					}
				} else if (this.type === 'circle') {
					let e = Q(t);
					const s = Q(this.coords);
					this.local.ctx.ellipse(
						e.center.x,
						e.center.y,
						s.width / 2,
						s.height / 2,
						this.rotation * Math.PI * 2,
						0,
						2 * Math.PI
					);
				} else if (this.type === 'polygon') {
					const e = this.numSides;
					if (t.length >= 2) {
						const s = Q(t),
							i = Q(this.coords),
							r = this.coords[0][1] > this.coords[2][1],
							n = s.center.y,
							h = s.center.x,
							o = (u, p, g, x, E) => {
								const _ = Math.cos(g),
									f = Math.sin(g);
								(u -= x), (p -= E);
								const y = u * _ - p * f,
									v = u * f + p * _;
								return (u = y + x), (p = v + E), [u, p];
							},
							l = (this.rotation + (r ? 0.5 : 0)) * 2 * Math.PI,
							d = (i.width / Math.sqrt(3)) * 0.86,
							c = (i.height / Math.sqrt(3)) * 0.86;
						this.local.ctx.beginPath();
						for (let u = 0; u < e; u++) {
							const p = -Math.PI / 2 + (2 * Math.PI * u) / e;
							let g = h + d * Math.cos(p),
								x = n + c * Math.sin(p);
							([g, x] = o(g, x, l, h, n)),
								u === 0 ? this.local.ctx.moveTo(g, x) : this.local.ctx.lineTo(g, x);
						}
						this.local.ctx.closePath();
					}
				}
				(this.local.ctx.fillStyle = Mt(this.local.ctx, this, t)),
					this.local.ctx.clearRect(0, 0, this.state().canvasWidth, this.state().canvasHeight),
					this.local.ctx.fill(),
					this.strokeWidth &&
						((this.local.ctx.strokeStyle = this.stroke[0]),
						(this.local.ctx.lineWidth = this.strokeWidth),
						this.local.ctx.stroke());
			}
		}
		class Lt extends Dt {
			constructor(t, e, s) {
				super(t, e),
					D(this, 'layerType', 'effect'),
					(this.initOptions = s),
					(this.type = t.type || 'sine'),
					(this.speed = t.speed || 0.5),
					(this.data = t.data || {}),
					(this.parentLayer = t.parentLayer || !1),
					(this.animating = t.animating || !1),
					(this.isMask = t.isMask || 0),
					(this.texture = t.texture || null),
					(this.mouseMomentum = t.mouseMomentum || 0),
					(this.compiledFragmentShaders = t.compiledFragmentShaders || []),
					(this.compiledVertexShaders = t.compiledVertexShaders || []),
					(this.states = {
						appear: t.states && t.states.appear ? t.states.appear.map((i) => new De(i)) : [],
						scroll: t.states && t.states.scroll ? t.states.scroll.map((i) => new Le(i)) : [],
						hover: t.states && t.states.hover ? t.states.hover.map((i) => new ze(i)) : []
					});
				for (let i in t) this[i] || (this[i] = t[i]);
				this.breakpoints.length && this.setBreakpointValues();
			}
			unpackage() {
				for (let t in this)
					this[t] &&
						this[t].type &&
						(this[t].type === 'Vec2'
							? (this[t] = new F(this[t]._x, this[t]._y))
							: this[t].type === 'Vec3' && (this[t] = new P(this[t]._x, this[t]._y, this[t]._z)));
				return this;
			}
			getParent() {
				return this.state()
					.layers.filter((t) => t.effects && t.effects.length)
					.find((t) => t.effects.includes(this.parentLayer));
			}
		}
		class Be extends yt {
			constructor(t, e, s) {
				super(t, e),
					D(this, 'layerType', 'image'),
					D(this, 'isElement', !0),
					(this.initOptions = s);
				let i = this.default(t || {});
				for (let r in i) this[r] = i[r];
				this.breakpoints.length && this.setBreakpointValues(),
					Object.keys(t).length && (this.createLocalCanvas(), this.loadImage());
			}
			default(t) {
				return {
					bgDisplace: t.bgDisplace || 0,
					dispersion: t.dispersion || 0,
					effects: t.effects || [],
					size: t.size || 0.25,
					rotation: t.rotation || t.angle || 0,
					height: t.height || 50,
					fitToCanvas: t.fitToCanvas || !1,
					displace: t.displace || 0,
					repeat: t.repeat || 0,
					mask: t.mask || 0,
					rotation: t.rotation || 0,
					scaleX: t.scaleX || 1,
					scaleY: t.scaleY || 1,
					src: t.src || '',
					speed: t.speed || 0.5,
					translateX: t.translateX || 0,
					translateY: t.translateY || 0,
					width: t.width || 50
				};
			}
			unpackage() {
				return (this.effects = V(this.effects)), this;
			}
			loadImage() {
				const t = new Image();
				(t.crossOrigin = 'Anonymous'),
					t.addEventListener(
						'load',
						() => {
							(this.local.img = t),
								(this.width = t.width),
								(this.height = t.height),
								(this.render = this.renderImage),
								this.render(),
								(this.local.loaded = !0),
								(this.local.fullyLoaded = !0),
								this.getPlane()
									? this.getPlane()
											.textures.filter((e) => e.sourceType === 'canvas')
											.forEach((e) => {
												e.needUpdate(), (e.shouldUpdate = !1);
											})
									: this.rendering || this.state().curtain.render();
						},
						!1
					),
					(t.src = this.src);
			}
			getRelativeScale() {
				return Math.min(1080 / this.width, 1080 / this.height);
			}
			renderImage() {
				const t = this.getPositionOffset(),
					e = this.state();
				let s = t.x,
					i = t.y;
				const r = this.rotation * 360 * (Math.PI / 180),
					n = this.getRelativeScale();
				let h = this.width * n * this.scaleX,
					o = this.height * n * this.scaleY;
				const l = e.dpi * e.scale;
				if ((this.local.ctx.clearRect(0, 0, e.canvasWidth, e.canvasHeight), this.fitToCanvas)) {
					const d = K([e.element.offsetWidth, e.element.offsetHeight])[0] / e.element.offsetWidth;
					let c = this.width / this.height,
						u = (e.canvasWidth * d) / l,
						p = (e.canvasHeight * d) / l;
					u / p < c ? ((o = p), (h = p * c)) : ((h = u), (o = u / c)),
						(s = u / 2),
						(i = p / 2),
						this.local.ctx.save(),
						this.local.ctx.translate(s, i),
						this.local.ctx.drawImage(this.local.img, -h / 2, -o / 2, h, o),
						this.local.ctx.restore();
				} else
					this.local.ctx.save(),
						this.local.ctx.translate(s, i),
						this.local.ctx.rotate(r),
						this.local.ctx.scale(this.size, this.size),
						this.local.ctx.drawImage(this.local.img, -h / 2, -o / 2, h, o),
						this.local.ctx.restore();
			}
			render() {}
		}
		class We extends yt {
			constructor(t, e, s, i) {
				super(t, e),
					D(this, 'layerType', 'text'),
					D(this, 'isElement', !0),
					D(this, 'justCreated', !1),
					(this.initOptions = i);
				let r = this.default(t || {});
				for (let n in r) this[n] = r[n];
				this.breakpoints.length && this.setBreakpointValues(),
					(this.isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)),
					Ie(this, i.element),
					Object.keys(t).length && this.createLocalCanvas(),
					this.loadFont();
			}
			default(t) {
				return {
					bgDisplace: t.bgDisplace || 0,
					dispersion: t.dispersion || 0,
					effects: t.effects || [],
					fill: t.fill || ['#ffffff'],
					highlight: t.highlight || ['transparent'],
					fontSize: t.fontSize || 24,
					fontCSS: t.fontCSS || null,
					lineHeight: t.lineHeight || 25,
					letterSpacing: t.letterSpacing || 0,
					mask: t.mask || 0,
					fontFamily: t.fontFamily || 'arial',
					fontStyle: t.fontStyle || 'normal',
					fontWeight: t.fontWeight || 'normal',
					textAlign: t.textAlign || 'left',
					textContent: t.textContent || '',
					gradientAngle: t.gradientAngle || t.gradAngle || 0,
					gradientType: t.gradientType || t.gradType || 'linear',
					coords: t.coords || [],
					rotation: t.rotation || 0,
					translateX: t.translateX || 0,
					translateY: t.translateY || 0,
					width: t.width || 200,
					height: t.height || 50
				};
			}
			unpackage() {
				return (
					(this.fill = V(this.fill)),
					(this.highlight = V(this.highlight)),
					(this.coords = V(this.coords)),
					(this.effects = V(this.effects)),
					this
				);
			}
			loadFont() {
				const t = this.fontStyle.includes('italic') ? 'italic' : 'normal',
					e = (n) => (n === 'normal' || n === '400' || n === 400 ? 'normal' : n.toString()),
					s = isNaN(parseInt(this.fontWeight)) ? 'normal' : e(this.fontWeight);
				if (
					Array.from(document.fonts).some(
						(n) =>
							n.family === this.fontFamily &&
							n.style === t &&
							e(n.weight) === s &&
							n.status === 'loaded'
					)
				) {
					this.handleFontLoaded();
					return;
				}
				let i = this.fontCSS.src.split(' ').join('%20');
				const r = new FontFace(this.fontFamily, `url(${i})`, { style: t, weight: s });
				document.fonts.add(r),
					r
						.load()
						.then(() => {
							this.handleFontLoaded();
						})
						.catch((n) => {
							console.error('Font loading error:', n);
						});
			}
			handleFontLoaded() {
				(this.local.loaded = !0),
					this.render(),
					this.state().id &&
						this.getPlane() &&
						this.getPlane()
							.textures.filter((t) => t.sourceType === 'canvas')
							.forEach((t) => {
								t.needUpdate(),
									(t.shouldUpdate = !1),
									this.rendering || this.state().curtain.render();
							});
			}
			render() {
				if (!this.local.loaded) return;
				const t = this.getPositionOffset();
				let e = t.x,
					s = t.y,
					i = 0,
					r = this.width,
					n = this.height,
					h = this.fontSize > 0 ? this.fontSize : 0,
					o = this.lineHeight > 0 ? this.lineHeight : 0,
					l = this.fontStyle.includes('italic') ? 'italic' : 'normal',
					d = '400';
				(this.local.textBoxPos = { x: e, y: s }),
					this.local.ctx.clearRect(0, 0, this.state().canvasWidth, this.state().canvasHeight),
					(this.local.ctx.font = `${l} ${d} ${h}px/${o}px ${this.fontFamily}, -apple-system, BlinkMacSystemFont, Helvetica, Arial`),
					this.isSafari ||
						((this.local.ctx.textAlign = this.textAlign),
						(this.local.ctx.letterSpacing = this.letterSpacing + 'px'));
				const c = this.local.ctx.measureText('m').width;
				(r = Math.max(r, c)),
					this.local.ctx.save(),
					this.local.ctx.translate(e + r / 2, s + n / 2),
					this.local.ctx.rotate((this.rotation * 360 * Math.PI) / 180),
					this.local.ctx.translate(-(e + r / 2), -(s + n / 2)),
					this.textAlign === 'center' && (e += r / 2),
					this.textAlign === 'right' && (e += r),
					(this.local.ctx.fillStyle = Mt(this.local.ctx, this, this.coords));
				const u = (_, f, y, v, T, R, w) => {
						let I = f
								.split('')
								.reduce((S, O, j) => S + _.measureText(O).width + (j < f.length - 1 ? T : 0), 0),
							M;
						if ((R === 'center' ? (M = y + (w - I) / 2 - w / 2) : (M = y), R === 'right'))
							for (let S = f.length - 1; S >= 0; S--) {
								const O = f[S];
								(M -= _.measureText(O).width), _.fillText(O, M, v), S > 0 && (M -= T);
							}
						else
							for (let S = 0; S < f.length; S++)
								_.fillText(f[S], M, v), (M += _.measureText(f[S]).width + T);
					},
					p = (_, f) => {
						let y = s + o * f + o / 2 + h / 3;
						this.isSafari
							? u(this.local.ctx, _, e, y, this.letterSpacing, this.textAlign, r)
							: this.local.ctx.fillText(_, e, y);
					},
					g = this.textContent
						? this.textContent.split(`
`)
						: [''];
				let x = g.length;
				const E = (_, f, y) =>
					f
						.split('')
						.reduce(
							(v, T, R) => ((v += _.measureText(T).width), R < f.length - 1 && (v += y), v),
							0
						);
				for (let _ = 0; _ < x; _++) {
					let f = '',
						y = g[_].split(/(\s|\n)/);
					for (let v = 0; v < y.length; v++) {
						const T = y[v],
							R = f + T;
						if (
							(this.isSafari && this.letterSpacing
								? E(this.local.ctx, R, this.letterSpacing)
								: this.local.ctx.measureText(R).width) > r ||
							T ===
								`
`
						) {
							if (f !== '')
								(g[_] = f.trim()),
									v !== y.length - 1
										? (g.splice(_ + 1, 0, y.slice(v).join('')), x++)
										: T !==
												`
` && g.push(T);
							else {
								let w = T,
									I = _;
								for (; w.length > 0; ) {
									let M = '';
									for (
										let S = 0;
										S < w.length && (this.local.ctx.measureText(M + w[S]).width <= r || S == 0);
										S++
									)
										M += w[S];
									(w = w.slice(M.length)),
										(g[I] = M.trim()),
										w.length > 0 && (g.splice(I + 1, 0, w), I++, x++);
								}
								y.slice(v + 1).length > 0 && (g[I] += y.slice(v + 1).join(''));
							}
							break;
						} else f = R;
						v === y.length - 1 && (g[_] = f.trim());
					}
				}
				g.forEach((_, f) => {
					p(_, i), f < g.length - 1 && i++;
				}),
					this.local.ctx.translate(-(e + r / 2), -(s + n / 2)),
					this.local.ctx.restore(),
					(this.height = this.lineHeight * i + this.lineHeight);
			}
		}
		function zt() {
			document[ht] ? cancelAnimationFrame(it) : xt();
		}
		function dt() {
			b.scenes.forEach((a) => {
				a.refresh();
			}),
				(U = window.innerHeight || document.documentElement.clientHeight),
				(H = window.innerWidth || document.documentElement.clientWidth);
		}
		function Ut(a, t, e = 50) {
			const s = t || a.getBoundingClientRect(),
				i =
					(s.top >= -e && s.top <= U + e) ||
					(s.bottom >= -e && s.bottom <= U + e) ||
					(s.top <= 0 && s.bottom >= U),
				r =
					(s.left >= -e && s.left <= H + e) ||
					(s.right >= -e && s.right <= H + e) ||
					(s.left <= 0 && s.right >= H);
			return i && r;
		}
		function Ne() {
			(U = window.innerHeight || document.documentElement.clientHeight),
				(H = window.innerWidth || document.documentElement.clientWidth),
				b.scenes
					.filter((a) => a.getAnimatingEffects().length)
					.forEach((a) => {
						let t = a.element.getBoundingClientRect();
						a.lastBbox &&
							(Math.abs(t.top - a.lastBbox.top) === 0 && ot > 0
								? ((a.fixedCounter = (a.fixedCounter || 0) + 1),
									a.fixedCounter > 3 && (a.isFixed = !0))
								: (a.fixedCounter = 0)),
							(a.lastBbox = t);
					}),
				(_t = performance.now());
		}
		function Vt(a) {
			const t = b.scenes.filter((i) => i.getAnimatingEffects().length),
				e = b.scenes.filter((i) => i.rendering);
			t.length && !e.length && xt();
			const s = performance.now();
			(!_t || s - _t > 32) && Ne(),
				t.forEach((i) => {
					Ut(i.element, i.lastBbox, 50)
						? ((i.isInView = !0),
							i.lazyLoad &&
								!i.initialized &&
								!i.initializing &&
								(i.curtain.renderer.setSize(), i.initializePlanes()))
						: (i.isInView = !1),
						i.isFixed || (i.mouse.movePos.y += ot / 2);
				});
		}
		function He() {
			b.scenes.forEach((a) => {
				var t, e;
				if (
					a.isInView &&
					a.curtain.planes.find((s) => s.uniforms.mousePos) &&
					!(
						Ft() &&
						(e = (t = a.interactivity) == null ? void 0 : t.mouse) != null &&
						e.disableMobile
					)
				) {
					(a.mouse.pos.y = a.mouse.movePos.y),
						(a.mouse.pos.x = a.mouse.movePos.x),
						(a.mouse.lastPos.x = a.mouse.pos.x),
						(a.mouse.lastPos.y = a.mouse.pos.y);
					let s = a.isFixed ? a.element.offsetTop : a.bbox.top + a.scrollY,
						i = a.isFixed ? a.element.offsetLeft : a.bbox.left;
					a.mouse.page.x > i &&
					a.mouse.page.y > s &&
					a.mouse.page.x < a.lastBbox.width + i &&
					a.mouse.page.y < a.lastBbox.height + s
						? a.mouse.enterTime || (a.mouse.enterTime = performance.now())
						: (a.mouse.enterTime = null);
				}
			});
		}
		function Bt(a) {
			b.scenes
				.filter((t) => t.isInView)
				.forEach((t) => {
					(t.mouse.page.x = 99999999999),
						(t.mouse.page.y = 99999999999),
						(t.mouse.enterTime = null);
				});
		}
		function ct(a) {
			b.scenes
				.filter((t) => t.isInView)
				.forEach((t) => {
					let e = t.bbox,
						s,
						i;
					a.targetTouches
						? ((s = a.targetTouches[0].pageX), (i = a.targetTouches[0].pageY))
						: ((s = a.pageX), (i = a.pageY)),
						t.isFixed &&
							((t.scrollY = 0),
							a.targetTouches ? (i = a.targetTouches[0].clientY) : (i = a.clientY));
					const r = { x: e.left / 2, y: (e.top + t.scrollY) / 2 },
						n = s / 2 - r.x,
						h = i / 2 - r.y;
					(t.mouse.page.x = s),
						(t.mouse.page.y = i),
						(t.mouse.movePos.x = n),
						(t.mouse.movePos.y = h);
				}),
				(Ct = !0);
		}
		b.scenes = [];
		class je {
			constructor(t) {
				D(this, 'scrollY', 0),
					(this.id = t.id),
					(this.projectId = t.projectId),
					(this.canvasWidth = t.width || t.element.offsetWidth || H),
					(this.canvasHeight = t.height || t.element.offsetHeight || U),
					(this.curtain = void 0),
					(this.curtainRafId = void 0),
					(this.dpi = +t.dpi || Math.min(1.5, window.devicePixelRatio)),
					(this.element = t.element),
					(this.fps = t.fps || 60),
					(this.name = t.name),
					(this.iframe = t.iframe || !1),
					(this.frameDuration = Math.floor(1e3 / (t.fps || 60))),
					(this.layers = t.layers),
					(this.lazyLoad = t.lazyLoad),
					(this.initialized = !1),
					(this.lasTick = null),
					(this.isInView = this.iframe || !1),
					(this.lastTime = 0),
					(this.rendering = !1),
					(this.bbox = {}),
					(this.isFixed = window.getComputedStyle(this.element).position === 'fixed'),
					(this.interactivity = { mouse: { disableMobile: !1 } }),
					(this.mouse = {
						downPos: { x: 0, y: 0 },
						movePos: { x: H / 4, y: U / 4 },
						lastPos: { x: H / 4, y: U / 4 },
						delta: { x: 0, y: 0 },
						page: { x: 0, y: 0 },
						dragging: !1,
						trail: [],
						recordTrail: !1,
						enterTime: null,
						pos: { x: H / 4, y: U / 4 }
					}),
					(this.renderingScale = t.renderingScale || 1),
					(this.scale = t.scale || 1),
					(this.split = !1),
					(this.versionId = ''),
					t.width &&
						t.height &&
						((this.element.style.width = t.width + 'px'),
						(this.element.style.height = t.height + 'px')),
					(this.bbox = this.element.getBoundingClientRect()),
					(this.lastBbox = this.bbox),
					this.createCurtains(),
					this.setCanvasScale();
			}
			preloadCanvasTexture(t, e) {
				t.loadCanvas(
					e.local.canvas,
					{ sampler: 'uTexture', premultiplyAlpha: !0 },
					(s) => {
						e.preloadedCanvasTexture = s;
					},
					(s) => {
						console.error('Error loading canvas texture:', s);
					}
				);
			}
			setCanvasScale() {
				(this.canvasWidth = this.element.offsetWidth * this.dpi * this.scale),
					(this.canvasHeight = this.element.offsetHeight * this.dpi * this.scale);
			}
			destroy() {
				this.element &&
					(this.element.removeAttribute('data-us-initialized'),
					this.element.removeAttribute('data-scene-id')),
					this.layers.filter((t) => t.dispose).forEach((t) => t.dispose()),
					this.curtain.dispose(),
					(b.scenes = b.scenes.filter((t) => t.id !== this.id)),
					b.scenes.length || vt();
			}
			resize() {
				this.setCanvasScale(),
					this.layers
						.filter((t) => t.isElement)
						.forEach((t) => {
							t.resize(),
								t.getPlane() &&
									t
										.getPlane()
										.textures.filter((e) => e.sourceType === 'canvas')
										.forEach((e) => {
											e.needUpdate();
										});
						}),
					this.layers
						.filter((t) => t.render)
						.forEach((t) => {
							t.render();
						}),
					this.curtain.resize(),
					(this.bbox = this.element.getBoundingClientRect());
			}
			refresh() {
				(this.initialized = !1),
					this.curtain.planes.forEach((t) => t.type !== 'PingPongPlane' && t.remove()),
					this.layers.forEach((t) => {
						var e, s;
						(e = t.states) == null || e.scroll.forEach((i) => i.resetState()),
							(s = t.states) == null || s.appear.forEach((i) => (i.disabled = !0)),
							t.breakpoints.length && t.setBreakpointValues();
					}),
					(this.lazyLoad = !0),
					requestAnimationFrame(() => {
						this.resize(), (this.scrollY = G), this.isInView && this.initializePlanes();
					});
			}
			updateMouseTrail() {
				Ct &&
					(this.mouse.trail.unshift([
						this.mouse.pos.x / (this.lastBbox.width * 0.5),
						1 - this.mouse.pos.y / (this.lastBbox.height * 0.5)
					]),
					this.mouse.trail.length > 4 && this.mouse.trail.pop());
			}
			getAnimatingEffects() {
				return this.layers.filter((t) => tt(t) && t.visible);
			}
			createCurtains() {
				(this.curtain = new te({
					container: this.element,
					premultipliedAlpha: !0,
					antialias: !1,
					autoRender: !1,
					autoResize: !1,
					watchScroll: !1,
					renderingScale: Math.min(Math.max(0.25, this.renderingScale), 1),
					production: !0,
					pixelRatio: this.dpi
				})),
					this.curtain.onContextLost(() => {
						this.curtain.restoreContext();
					}),
					(this.scrollY = window.scrollY || window.pageYOffset),
					document
						.querySelectorAll(`[data-us-text="loading"][data-us-project="${this.id}"]`)
						.forEach((t) => {
							t.style.position = 'absolute';
						});
			}
			renderNFrames(t, e) {
				let s = 0;
				const i = () => {
					this.curtain.render(), s < t ? (s++, requestAnimationFrame(i)) : e && e();
				};
				this.rendering || i();
			}
			setInteractiveParams(t, e) {
				let s = { mouse: { disableMobile: !1 } };
				e &&
					e.mouse &&
					'disableMobile' in e.mouse &&
					(s.mouse.disableMobile = e.mouse.disableMobile),
					t &&
						t.interactivity &&
						t.interactivity.mouse &&
						'disableMobile' in t.interactivity.mouse &&
						(s.mouse.disableMobile = t.interactivity.mouse.disableMobile),
					(this.interactivity = s);
			}
			getSplitOrderedItems() {
				let t = this.getOrderedItems(),
					e = 0,
					s = t[e];
				if (s) {
					let i = s.parentLayer ? s.getParent() : null,
						r = i && tt(i),
						n =
							i &&
							i.effects &&
							i.effects.length &&
							i.getChildEffectItems().filter((h) => tt(h)).length;
					for (; s && !tt(s) && !r && !n; )
						e++,
							(s = t[e]),
							s &&
								((i = s.parentLayer ? s.getParent() : null),
								(r = i && tt(i)),
								(n =
									i &&
									i.effects &&
									i.effects.length &&
									i.getChildEffectItems().filter((h) => tt(h)).length));
					return {
						static: this.getOrderedItems().splice(0, e),
						dynamic: this.getOrderedItems().splice(e)
					};
				} else return { static: [], dynamic: [] };
			}
			initializePlanes(t) {
				(this.initializing = !0),
					this.handleItemPlanes(() => {
						this.handlePlaneCreation(), t && t(this);
					});
			}
			getPassPlane(t, e) {
				return this.curtain.planes.find(
					(s) => s.userData.id === t.local.id && s.userData.passIndex === e
				);
			}
			getRenderTargets() {
				return this.curtain.renderTargets.filter((t) => t.userData.id);
			}
			getPlanes() {
				return this.curtain.planes.filter((t) => t.type !== 'PingPongPlane');
			}
			removeUnusedPlanes() {
				this.curtain.planes.forEach((t) => {
					t.remove();
				}),
					this.curtain.renderTargets.forEach((t) => {
						t.remove();
					});
			}
			getPlaneParams(t, e) {
				var s, i, r;
				let n = ['noise', 'noiseField', 'sine', 'ripple', 'bulge'].includes(t.type) ? 500 : 1;
				const h = {
					resolution: {
						name: 'uResolution',
						type: '2f',
						value: new F(this.canvasWidth, this.canvasHeight)
					},
					mousePos: { name: 'uMousePos', type: '2f', value: new F(0.5) },
					time: { name: 'uTime', type: '1f', value: 0 },
					dpi: { name: 'uDpi', type: '1f', value: this.dpi * +this.renderingScale }
				};
				if (
					(t.isElement && (h.sampleBg = { name: 'uSampleBg', type: '1i', value: 1 }),
					st(t.type) &&
						(h.previousMousePos = { name: 'uPreviousMousePos', type: '2f', value: new F(0.5) }),
					t.states &&
						[...t.states.appear, ...t.states.scroll, ...t.states.hover].forEach((d) => {
							h[d.prop] ||
								(d.uniformData && ((h[d.prop] = d.uniformData), (h[d.prop].value = d.value)));
						}),
					(s = t.data) != null && s.uniforms)
				)
					for (let d in t.data.uniforms) {
						let c = t.data.uniforms[d];
						(h[d] = t.data.uniforms[d]),
							((i = c.value) == null ? void 0 : i.type) === 'Vec3'
								? (h[d].value = new P(c.value._x, c.value._y, c.value._z))
								: ((r = c.value) == null ? void 0 : r.type) === 'Vec2'
									? (h[d].value = new F(c.value._x, c.value._y))
									: typeof c.value == 'object' && (h[d].value = V(c.value));
					}
				let o = t.compiledFragmentShaders[e] || t.compiledFragmentShaders[0],
					l = t.compiledVertexShaders[e] || t.compiledVertexShaders[0];
				return {
					fragmentShader: o,
					vertexShader: l,
					widthSegments: n,
					heightSegments: n,
					texturesOptions: { floatingPoint: 'half-float', premultiplyAlpha: !0 },
					uniforms: h
				};
			}
			createPlane(t, e, s) {
				var i, r;
				let n;
				t.isElement
					? (n = this.getPlaneParams(t))
					: (n = this.getPlaneParams(t, s ? s.index : null)),
					(n.watchScroll = !1);
				let h =
						(((i = t.data) == null ? void 0 : i.downSample) && !s) ||
						(s == null ? void 0 : s.downSample),
					o = this.scale * 0.5;
				h && this.curtain.renderer._renderingScale !== o
					? ((this.curtain.renderer._renderingScale = o), this.curtain.renderer.setSize())
					: this.curtain.renderer._renderingScale !== this.scale &&
						((this.curtain.renderer._renderingScale = this.scale), this.curtain.renderer.setSize());
				const l = new Et(this.curtain, this.curtain.container, n);
				if (!l) throw new Error('Unable to create plane');
				return (
					(l.textures.length = 0),
					(l.userData.id = t.local.id),
					(l.userData.layerType = t.layerType),
					(l.userData.type = t.type),
					(t.texture || ((r = t.data) != null && r.texture)) && (l.userData.textureLoaded = !1),
					l.setRenderOrder(e),
					l
				);
			}
			createPingPongPlane(t, e, s) {
				let i = this.getPlaneParams(t, 1 + ((s == null ? void 0 : s.length) || 0)),
					r = this.curtain.planes.find(
						(n) => n.type === 'PingPongPlane' && n.userData.id === t.local.id
					);
				if (
					(r
						? r.setRenderOrder(e)
						: ((r = new Me(this.curtain, this.curtain.container, i)),
							(r.userData.id = t.local.id),
							(r.userData.pingpong = !0),
							r.setRenderOrder(e),
							this.setInitialEffectPlaneUniforms(r, t, t.getParent(), s),
							r
								.onReady(() => {
									r.userData.isReady = !0;
								})
								.onRender(() => {
									this.setEffectPlaneUniforms(r, t);
								})),
					!!r)
				)
					return r;
			}
			createEffectPlane(t, e, s) {
				const i = this.createPlane(t, e, s),
					r = t.getParent();
				s
					? ((i.userData.passIndex = s.index),
						(i.userData.downSample = s.downSample),
						(i.userData.includeBg = s.includeBg),
						(i.userData.length = t.data.passes.length),
						Object.entries(s).forEach(([n, h]) => {
							i.uniforms[n] && (i.uniforms[n].value = h);
						}))
					: (i.userData.downSample = t.data.downSample),
					this.setInitialEffectPlaneUniforms(i, t, r, s),
					i
						.onReady(() => {
							i.userData.isReady = !0;
						})
						.onRender(() => this.setEffectPlaneUniforms(i, t));
			}
			createElementPlane(t, e) {
				const s = this.createPlane(t, e);
				this.preloadCanvasTexture(s, t),
					this.setInitialElementPlaneUniforms(s, t),
					s
						.onReady(() => {
							s.userData.isReady = !0;
						})
						.onRender(() => this.setElementPlaneUniforms(s, t));
			}
			handleEffectPlane(t, e, s) {
				var i;
				const r = 'passIndex' in s ? this.getPassPlane(t, s.passIndex) : t.getPlane();
				let n = this.getRenderTargets()[e - 1],
					h = this.curtain.planes.find(
						(o) => o.type === 'PingPongPlane' && o.userData.id === t.local.id
					);
				if (!r) return !1;
				h && r.createTexture({ sampler: 'uPingPongTexture', fromTexture: h.getTexture() }),
					n
						? r.createTexture({ sampler: 'uTexture', fromTexture: n.getTexture() })
						: r.createTexture({ sampler: 'uTexture' }),
					s.passIndex > 0 &&
						r &&
						this.getRenderTargets()[e - (1 + s.passIndex)] &&
						r.createTexture({
							sampler: 'uBgTexture',
							fromTexture: this.getRenderTargets()[e - (1 + s.passIndex)].getTexture()
						}),
					[t.texture, (i = t.data) == null ? void 0 : i.texture]
						.filter((o) => (o == null ? void 0 : o.src))
						.forEach((o) => {
							r.loadImage(o.src, { sampler: o.sampler, premultipliedAlpha: !1 }, (l) => {
								r.userData.textureLoaded = !0;
							});
						});
			}
			handleElementPlane(t, e) {
				const s = t.getPlane(),
					i = t.getChildEffectItems(),
					r = this.layers.filter((l) => !l.parentLayer);
				let n = this.getRenderTargets()[e - 1],
					h = r[r.indexOf(t) - 2],
					o;
				if (
					(t.mask && h && (o = h.local.lastTarget),
					i.length || (s.textures.length = 0),
					n && i.length && s
						? s.createTexture({
								sampler: 'uTexture',
								premultipliedAlpha: !0,
								fromTexture: n.getTexture()
							})
						: s && s.addTexture(t.preloadedCanvasTexture),
					n)
				) {
					if (i.length) {
						let l = i.reduce((d, c) => d + c.getPlanes().length, 0);
						n = this.getRenderTargets()[e - (1 + l)];
					}
					n &&
						(s.createTexture({
							sampler: 'uBgTexture',
							premultipliedAlpha: !0,
							fromTexture: n.getTexture()
						}),
						o &&
							t.mask &&
							s.createTexture({
								sampler: 'uPreviousLayerTexture',
								premultipliedAlpha: !0,
								fromTexture: o.getTexture()
							}));
				}
			}
			handleChildEffectPlane(t, e, s) {
				var i;
				const r = 'passIndex' in s ? this.getPassPlane(t, s.passIndex) : t.getPlane(),
					n = t.getParent();
				let h = this.getRenderTargets()[e - 1],
					o = this.curtain.planes.find(
						(p) => p.type === 'PingPongPlane' && p.userData.id === t.local.id
					),
					l = n.effects.filter((p) => {
						if (this.layers.find((g) => g.parentLayer === p))
							return this.layers.find((g) => g.parentLayer === p).visible;
					}),
					d = l.indexOf(t.parentLayer),
					c = l.at(-1) === l[d],
					u = s.passIndex === s.length;
				o &&
					st(t.type) &&
					r.createTexture({ sampler: 'uPingPongTexture', fromTexture: o.getTexture() }),
					r && h && (d || s.passIndex > 0)
						? (t.isMask && (!s.length || (c && u)) && r.addTexture(n.preloadedCanvasTexture),
							r.createTexture({
								sampler: 'uTexture',
								premultipliedAlpha: !0,
								fromTexture: h.getTexture()
							}))
						: r && t.isMask
							? (c && u && r.addTexture(n.preloadedCanvasTexture),
								h &&
									r.createTexture({
										sampler: 'uTexture',
										premultipliedAlpha: !0,
										fromTexture: h.getTexture()
									}))
							: r && r.addTexture(n.preloadedCanvasTexture),
					r.userData.includeBg &&
						r.createTexture({ sampler: 'uBgTexture', fromTexture: n.preloadedCanvasTexture }),
					t.type === 'custom' &&
						r.createTexture({
							sampler: 'uCustomTexture',
							premultipliedAlpha: !0,
							fromTexture: this.getRenderTargets()[e]
						}),
					[t.texture, (i = t.data) == null ? void 0 : i.texture]
						.filter((p) => (p == null ? void 0 : p.src))
						.forEach((p) => {
							r.loadImage(p.src, { sampler: p.sampler, premultipliedAlpha: !1 }, (g) => {
								r.userData.textureLoaded = !0;
							});
						});
			}
			createPlanes() {
				this.getOrderedItems().forEach((t, e) => {
					t.getPlanes().length
						? t.getPlanes().forEach((s) => s.setRenderOrder(e))
						: t.isElement
							? this.createElementPlane(t, e)
							: this.createEffectPlanes(t, e);
				});
			}
			createEffectPlanes(t, e) {
				const s = t.data;
				s.passes && s.passes.length
					? (this.createEffectPlane(t, e, {
							index: 0,
							downSample: s.downSample,
							length: s.passes.length + 1
						}),
						s.passes.forEach((i, r) => {
							this.createEffectPlane(t, e, {
								index: r + 1,
								length: s.passes.length + 1,
								downSample: i.downSample,
								[i.prop]: i.value,
								includeBg: i.includeBg
							});
						}),
						st(t.type) && this.createPingPongPlane(t, e, s.passes))
					: (this.createEffectPlane(t, e), st(t.type) && this.createPingPongPlane(t, e));
			}
			createTextures() {
				const t = this.getPlanes()
						.filter((s) => s.visible)
						.sort((s, i) => s.renderOrder - i.renderOrder),
					e = t.length;
				for (let s = 0; s < e; s++) {
					const i = t[s];
					let r = this.layers.find((n) => n.local.id === i.userData.id);
					s < e - 1 && this.assignRenderTargetToPlane(t, s, r, i),
						this.handleTextures(r, s, i.userData),
						(r.local.lastTarget = i.target);
				}
			}
			assignRenderTargetToPlane(t, e, s, i) {
				let r = this.getTextureParams(t, e, s),
					n = this.getRenderTargets()[e] || new mt(this.curtain, r);
				(n.userData.id = i.userData.id), i.setRenderTarget(n);
			}
			handleTextures(t, e, s) {
				t.isElement
					? this.handleElementPlane(t, e)
					: t.parentLayer
						? this.handleChildEffectPlane(t, e, s)
						: this.handleEffectPlane(t, e, s);
			}
			handleItemPlanes(t) {
				this.createPlanes(), this.createTextures(), this.checkIfReady(t);
			}
			isNotReady(t) {
				const e = this.layers.find((s) => s.local.id === t.userData.id);
				return (
					(e.layerType === 'image' && !e.local.loaded) ||
					(e.layerType === 'text' && !e.local.loaded) ||
					('textureLoaded' in t.userData && !t.userData.textureLoaded)
				);
			}
			checkIfReady(t) {
				const e = () => {
					let s = !1,
						i = !1;
					const r = this.curtain.planes;
					for (let n = 0; n < r.length; n++)
						if (r[n].userData.isReady) {
							if (this.isNotReady(r[n])) {
								s = !0;
								break;
							}
						} else {
							i = !0;
							break;
						}
					i || s ? (i && this.curtain.render(), requestAnimationFrame(e)) : t();
				};
				e();
			}
			setInitialEffectPlaneUniforms(t, e, s, i) {
				if (!t.userData.initialUniformsSet || !t.userData.isReady) {
					for (let r in t.uniforms)
						e.local.bpProps && r in e.local.bpProps
							? r === 'pos'
								? ((t.uniforms[r].value.x = e.local.bpProps[r].x),
									(t.uniforms[r].value.y = 1 - e.local.bpProps[r].y))
								: (t.uniforms[r].value = e.local.bpProps[r])
							: r in e && (t.uniforms[r].value = e[r]);
					s && i && i.index < i.length - 1 && t.uniforms.isMask && (t.uniforms.isMask.value = 0),
						e.states &&
							e.states.appear.length &&
							e.states.appear
								.filter((r) => !r.disabled)
								.forEach((r) => {
									t.uniforms[r.prop] && r.initializeState(t.uniforms[r.prop], e[r.prop]);
								}),
						s && e.isMask && !e.mouseMomentum && (e.mouseMomentum = s.mouseMomentum),
						(t.userData.initialUniformsSet = !0);
				}
			}
			handleStateEffects(t, e) {
				if (
					(this.isInView && !t.userData.createdAt && (t.userData.createdAt = performance.now()),
					!e.states || ![...e.states.appear, ...e.states.scroll, ...e.states.hover].length)
				)
					return !1;
				e.states.appear.forEach((s) => {
					s.updateEffect(t);
				}),
					e.states.scroll.forEach((s) => {
						var i, r;
						s.updateEffect(t, e[s.prop], {
							top: this.isFixed ? 0 : (i = this.lastBbox) == null ? void 0 : i.top,
							height: (r = this.lastBbox) == null ? void 0 : r.height,
							isFixed: this.isFixed
						});
					}),
					e.states.hover.forEach((s) => {
						s.updateEffect(t, e[s.prop], this.mouse.enterTime);
					});
			}
			setInitialElementPlaneUniforms(t, e) {
				(t.uniforms.resolution.value.x = this.curtain.canvas.width),
					(t.uniforms.resolution.value.y = this.curtain.canvas.height),
					t.uniforms.sampleBg &&
						(t.renderOrder - e.effects.length === 0
							? (t.uniforms.sampleBg.value = 0)
							: (t.uniforms.sampleBg.value = 1));
			}
			setElementPlaneUniforms(t, e) {
				let s = this.element.offsetWidth * 0.5,
					i = this.element.offsetHeight * 0.5;
				if (t.uniforms.mousePos) {
					let r = this.mouse.pos.x,
						n = this.mouse.pos.y,
						h = r / s,
						o = 1 - n / i;
					if (e.mouseMomentum && e.type !== 'mouse') {
						e.local.lastMousePos || (e.local.lastMousePos = { x: h, y: o });
						let l = e.local.lastMousePos.x * s,
							d = (1 - e.local.lastMousePos.y) * i;
						(r = J(r, l, e.mouseMomentum * 2)),
							(n = J(n, d, e.mouseMomentum * 2)),
							(e.local.lastMousePos.x = r / s),
							(e.local.lastMousePos.y = 1 - n / i);
					}
					(t.uniforms.mousePos.value.x = r / s), (t.uniforms.mousePos.value.y = 1 - n / i);
				}
			}
			setEffectPlaneUniforms(t, e) {
				e.animating &&
					t.uniforms.time &&
					(t.uniforms.time.value += ((e.speed || 1) * 60) / this.fps),
					this.handleStateEffects(t, e);
				let s = this.bbox.width / 2,
					i = this.bbox.height / 2;
				if (t.uniforms.mousePos) {
					let r = this.mouse.pos.x,
						n = this.mouse.pos.y;
					if (e.mouseMomentum && e.type !== 'mouse') {
						e.local.lastMousePos || (e.local.lastMousePos = { x: r / s, y: 1 - n / i });
						let h = e.local.lastMousePos.x * s,
							o = (1 - e.local.lastMousePos.y) * i;
						(r = J(r, h, e.mouseMomentum * 2)),
							(n = J(n, o, e.mouseMomentum * 2)),
							(e.local.lastMousePos.x = r / s),
							(e.local.lastMousePos.y = 1 - n / i);
					}
					(t.uniforms.mousePos.value.x = r / s), (t.uniforms.mousePos.value.y = 1 - n / i);
				}
				t.uniforms.previousMousePos &&
					(this.mouse.trail.length > 2
						? ((t.uniforms.previousMousePos.value.x = this.mouse.trail.at(2)[0]),
							(t.uniforms.previousMousePos.value.y = this.mouse.trail.at(2)[1]))
						: ((t.uniforms.previousMousePos.value.x = t.uniforms.mousePos.value.x),
							(t.uniforms.previousMousePos.value.y = t.uniforms.mousePos.value.y))),
					(t.uniforms.resolution.value.x = this.curtain.canvas.width),
					(t.uniforms.resolution.value.y = this.curtain.canvas.height);
			}
			getOrderedItems() {
				let t = [];
				return (
					this.layers
						.filter((e) => !e.parentLayer && e.visible)
						.forEach((e) => {
							e.effects && e.effects.length && t.push(...e.getChildEffectItems()), t.push(e);
						}),
					t
				);
			}
			getTextureParams(t, e, s) {
				var i;
				const r = t[e].userData.downSample ? 0.5 : 1,
					n = {
						maxWidth: this.curtain.canvas.width,
						maxHeight: this.curtain.canvas.height,
						depth:
							((i = s == null ? void 0 : s.data) == null ? void 0 : i.depth) ||
							(s == null ? void 0 : s.type) === 'bulge'
					};
				return r && ((n.maxWidth = this.canvasWidth * r), (n.maxHeight = this.canvasHeight * r)), n;
			}
			handlePlaneCreation() {
				(this.initialized = !0),
					(this.initializing = !1),
					this.rendering || this.renderNFrames(2),
					this.removePlanes(),
					xt();
			}
			async removePlanes() {
				const t = this.getSplitOrderedItems();
				t.dynamic.length || t.static.pop();
				for (const e of t.static) {
					const s = e.layerType === 'text' && !e.local.loaded,
						i = e.layerType === 'image' && !e.local.fullyLoaded;
					(s || i) && (await Oe(e, s ? 'loaded' : 'fullyLoaded'));
					const r = e.getPlanes();
					for (const n of r) n.remove(), n.uuid, r.at(-1).uuid;
				}
			}
		}
		function Ge(a) {
			return typeof HTMLElement == 'object'
				? a instanceof HTMLElement
				: a &&
						typeof a == 'object' &&
						a !== null &&
						a.nodeType === 1 &&
						typeof a.nodeName == 'string';
		}
		function Xe() {
			window.addEventListener('mousemove', ct),
				window.addEventListener('touchmove', ct),
				window.addEventListener('scroll', Vt),
				window.addEventListener('routeChange', It),
				document.addEventListener('mouseleave', Bt),
				Ft()
					? window.addEventListener('orientationchange', lt(dt, 20))
					: window.addEventListener('resize', lt(dt, 200)),
				document.addEventListener(et, zt, !1),
				(ft = !0);
		}
		function vt() {
			window.removeEventListener('mousemove', ct),
				window.removeEventListener('touchmove', ct),
				window.removeEventListener('scroll', Vt),
				window.removeEventListener('routeChange', It),
				document.removeEventListener('mouseleave', Bt),
				window.removeEventListener('resize', lt(dt, 200)),
				window.removeEventListener('orientationchange', lt(dt, 20)),
				document.removeEventListener(et, zt, !1),
				(ft = !1);
		}
		function Ye(a, t, e) {
			return {
				canvasWidth: a.offsetWidth * e,
				canvasHeight: a.offsetHeight * e,
				scale: t,
				dpi: e,
				element: a
			};
		}
		function qe() {
			b.scenes.forEach((a) => {
				a.destroy();
			}),
				(b.scenes.length = 0),
				vt();
		}
		function Qe(a, t, e, s, i) {
			let r;
			if (e) {
				if (((r = e), document.getElementById(e))) {
					let n = JSON.parse(document.getElementById(e).innerText);
					if (n.options && n.history) return n;
					s(new Error(`Did not find valid JSON inside ${e}`));
				}
			} else {
				let n = 'https://storage.googleapis.com/unicornstudio-production';
				i || (t != null && t.includes('production=true'))
					? ((n = 'https://assets.unicorn.studio'), (t = `v=${Date.now()}`))
					: (t != null && t.includes('update=')) || (t = `v=${Date.now()}`),
					(r = `${n}/embeds/${a}${t ? '?' + t : ''}`);
			}
			return fetch(r)
				.then((n) => n.json())
				.then((n) => n)
				.catch((n) => console.error('Error fetching data:', n));
		}
		function Wt(a) {
			let t = a.projectId ? a.projectId.split('?')[0] : null,
				e = a.projectId ? a.projectId.split('?')[1] : null;
			return new Promise((s, i) => {
				Qe(t, e, a.filePath, i, a.production)
					.then((r) => {
						r || i(new Error(`Unable to fetch embed/file with id '${a.projectId}'`));
						const n = r.options || {},
							h = Ge(a.element) ? a.element : document.getElementById(a.elementId);
						if (!h) {
							i(new Error(`Couldn't find an element with id '${a.elementId}' on the page.`));
							return;
						}
						const o = kt();
						h.setAttribute('data-scene-id', o);
						const l = ke(
								r.history,
								o,
								Ye(h, a.scale || n.scale || 1, a.dpi || Math.min(1.5, window.devicePixelRatio))
							),
							d = new je({
								id: o,
								fps: a.fps || n.fps || 60,
								dpi: a.dpi,
								name: n.name,
								iframe: a.iframe,
								projectId: t || a.filePath.split('.')[0],
								renderingScale: a.scale || n.scale || 1,
								element: h,
								lazyLoad: a.lazyLoad,
								width: a.width,
								height: a.height
							});
						a.altText && (d.curtain.canvas.innerText = a.altText),
							a.ariaLabel && d.curtain.canvas.setAttribute('aria-label', a.ariaLabel),
							d.curtain.canvas.setAttribute('role', 'img'),
							(n.freePlan || n.includeLogo) && Fe(o, h),
							n.freePlan && console.log('Made with unicorn.studio'),
							b.scenes.push(d),
							(d.layers = l),
							(d.mouse.recordTrail = !!d.layers.find((c) => c.type == 'mouse')),
							d.setInteractiveParams(a, n),
							(d.isInView = d.isFixed || Ut(d.element, d.bbox, 50)),
							(!d.lazyLoad || d.isInView) && d.initializePlanes(),
							ft || Xe(),
							s(d);
					})
					.catch((r) => {
						console.error(r), i(r);
					});
			});
		}
		function $e() {
			return new Promise((a, t) => {
				const e = [
					...document.querySelectorAll('[data-us-project]'),
					...document.querySelectorAll('[data-us-project-src]')
				];
				[...e]
					.filter((s) => !s.getAttribute('data-us-initialized'))
					.forEach((s, i) => {
						const r = s.getAttribute('data-us-project'),
							n = s.getAttribute('data-us-project-src'),
							h = s.getAttribute('data-us-dpi'),
							o = s.getAttribute('data-us-scale'),
							l = s.getAttribute('data-us-lazyload'),
							d = s.getAttribute('data-us-production'),
							c = s.getAttribute('data-us-fps'),
							u = s.getAttribute('data-us-altText') || s.getAttribute('data-us-alttext'),
							p = s.getAttribute('data-us-ariaLabel') || s.getAttribute('data-us-arialabel'),
							g =
								s.getAttribute('data-us-disableMobile') || s.getAttribute('data-us-disablemobile');
						s.setAttribute('data-us-initialized', !0),
							Wt({
								projectId: r,
								filePath: n,
								element: s,
								dpi: +h,
								scale: +o,
								production: d,
								fps: +c,
								lazyLoad: l,
								altText: u,
								ariaLabel: p,
								interactivity: g ? { mouse: { disableMobile: !0 } } : null
							}).then((x) => {
								i === e.length - 1 && a(b.scenes);
							});
					});
			});
		}
		(b.addScene = Wt),
			(b.destroy = qe),
			(b.init = $e),
			(b.unbindEvents = vt),
			Object.defineProperty(b, Symbol.toStringTag, { value: 'Module' });
	});
});
export default Je();
