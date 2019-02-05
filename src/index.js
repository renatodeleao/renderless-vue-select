import RenderlessVueSelect from "./RenderlessVueSelect.vue";

var COMPONENT_NAME = "renderless-vue-select"
var Plugin = {
  install (Vue, options = {}) {
    /**
     * Makes sure that plugin can be installed only once
     */
    if (this.installed) {
      return
		}

		this.installed = true;
		this.componentName = options.componentName || COMPONENT_NAME;


		Vue.component(this.componentName, RenderlessVueSelect);
	}
}

export default Plugin;
