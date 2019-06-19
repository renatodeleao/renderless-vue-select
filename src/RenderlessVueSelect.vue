<script>
/**
 * @desc all functionality, zero opinions about your makup /styles
 * [1] - ENHACEMENT: Add highlighted substrings (like the wesbos course)
 * [2] - Loading states and async work compatibility out-of-the-boz
 */
const ATTRS_NAMESPACE = "data-renderless-vue-select"
export default {
  name: "renderless-selectbox",
  props: {
    value: { type: [String, Object, null], default: null},
    options: { type: [Array], required: true },
    /**
     * Default Filter by start matching, pass custom filters or fuzzy search engin like Fuse.js
     */
    filterFunction: {
      type: Function,
      default: (query, options, currentValue) => {
        if(query === "" || query === currentValue.label ){
          return options
        } else {
          return options.filter(o => o.label.toLowerCase().startsWith(query.toLowerCase()))
        }
      }
    },
    /**
     * Keeping state open after selecting option by click
     * or keyboard, also after clicking outside the list
     */
    keepOpen: {
      type: Boolean,
      default: true
    }
  },
  model: {
    prop: "value",
    event: "select"
  },
  data(){
    return {
      query: "",
      isOpen: this.keepOpen ? true : false,
      highlightedIndex: 0,
      selectedIndex: null,
    }
  },
  computed: {
    // [check if should allow bad option formating and serialize or enforce a proper format]
    serializedValue() {
      if( typeof this.value === "string" || this.value === null){
        return {label: this.value, value: this.value}
      };

      if (this._validateFormat(this.value)){
        return this.value
      } else {
        throw new Error("Label and value are required keys in your value object")
      }
    },
    // to allow ["option", "adasdad"] source when really it should be [{"label", "value"}]
    serializedOptions(){
      if( typeof this.options[0] === "string"){
        console.warn('We accept this but you should use {label: "Label", value: "Value} since it matches the native format')
        /**
         * If no value provided, value === "textContent2"of options as per spec
         * https://developer.mozilla.org/en-US/docs/Web/HTML/Element/select
         */
        return this.options.map((o,i) => ({label: o, value: o}))
      }

      // we optimistically hope if the first option matches the rest as
      // it is expensive to be validating long arrays
      if(this._validateFormat(this.options[0])
      ) {
        return this.options
      } else {
        throw new Error("Label and value are required keys in your option object")
      }
    },
    filteredOptions(){
      // [1] [2]
      return this.filterFunction(this.query, this.serializedOptions, this.serializedValue);
    }
  },
  watch: {
    value() {
      this._updateQuery(this.serializedValue);
      this._setSelectedIndex()
    },
    query(typedValue){
      if(typedValue !== "" && typedValue !== this.serializedValue.label){
        // if closed, open it
        if(!this.isOpen) this.open();
      }
    }
  },
  methods: {
    open(){
      this.isOpen = true;
      this.$nextTick(() => {
        this._scrollListToHighlighted();
      })
    },
    close(){
      if(!this.isOpen) return;
      // if nothing was select, but some keyboard playing occurred, reset to selected index
      this._updateQuery(this.serializedValue);
      if(!this.keepOpen) {
        this.isOpen = false
      }
    },
    selectOption(option){
      this.query = option.label;
      this.$emit('select', option)
    },
    selectHighlighted(){
      this.selectOption(this.filteredOptions[this.highlightedIndex]);
      this.close()
    },
    reset() {
      this.highlightedIndex = 0;
      this.inputRef.focus();
      this.selectOption({ label: '', value: null });
    },
    // Keyboard navigation
    highlight(index){
      if(this.filteredOptions.length === 0) return;

      this.highlightedIndex = index;

      // reaches first scrolls to last
      if( this.highlightedIndex < 0){
        this.highlightedIndex = this.filteredOptions.length - 1;
      }

      // reaches last goes scrolls to first
      if( this.highlightedIndex > this.filteredOptions.length - 1 ){
        this.highlightedIndex = 0;
      }

      // i don't know a pretty way of doing this but will find out in the future
      // this will break if we use v-if instead of v-show
      this._scrollListToHighlighted();
    },
    highlightPrev() {
      this.highlight(this.highlightedIndex - 1);
    },
    highlightNext() {
      this.highlight(this.highlightedIndex + 1);
    },
    handleClickOutside(e) {
      if (!this.isOpen) return;

      if (!this.$el.contains(e.target)) {
        this.close()
      }
    },
    _validateFormat(obj){
      if(
        obj.hasOwnProperty("label") &&
        obj.hasOwnProperty("value")
      ) {
        return true
      } else {
        false
      }
    },

    /**
     * for both initial loading (value watch)
     * and onClose to check if the user just randomly searching terms
     * But then cancelled and we reset query val to the current selected option (this.value)
     *
     * TODO: this serialization checks fill dirty. enhance
     */
    _updateQuery(value){
      if(!value || (value && value.label === null)){
        this.query = ""
      } else {
        this.query = value.label;
      }
    },

    /**
     * Pleas make this human readable
     */
    _setSelectedIndex(){
      let i = this.filteredOptions
          .map(o => o.label)
          .indexOf(this.serializedValue.label);
      let _i = i < 0 ? 0 : i;
      this.highlightedIndex = _i;
      this.selectedIndex = i < 0 ? null : _i;
    },

    // [noteperf] check if ele is scrollable before trigger
    _scrollListToHighlighted(){
      if( this.listboxRef ){
        let target = this.listboxRef.children[this.highlightedIndex];
        target && target.scrollIntoView({block: 'nearest'})
      }
    },
    // dangerous
    _getFakeRefs() {
      this.inputRef = this.$el.querySelector(`[${ATTRS_NAMESPACE}=input]`);
      this.listboxRef = this.$el.querySelector(`[${ATTRS_NAMESPACE}=listbox]`);
      if(!this.listboxRef) {
        console.warn('For accessibility purposes make sure you v-bind="listboxProps to your role="listbox" element aka the list that scrolls throught he options')
      }
    }
  },
  created(){
    // look if a selected option is already passed to v-model
    // if not null
    if(this.value){
      this.selectOption(this.serializedValue);
    }
  },
  updated(){
    this.$emit('updated')
  },
  mounted(){
    this._getFakeRefs();
    document.addEventListener('click', this.handleClickOutside);
  },
  beforeDestroy() {
    document.removeEventListener('click', this.handleClickOutside);
  },
  render(){
    return this.$scopedSlots.default({
      state: {
        isOpen: this.isOpen,
        highlightedIndex: this.highlightedIndex,
        selectedIndex: this.selectedIndex
      },
      options: this.filteredOptions,
      optionEvents: (option) => ({
        click: () => {
          this.selectOption(option);
          this.inputRef.focus();
          this.close();
        }
      }),
      inputProps: {
        value: this.query,
        // this is kind of hack but, don't know a better way yet
        [`${ATTRS_NAMESPACE}`]: "input"
      },
      inputEvents: {
        click: this.open,
        input: (e) => this.query = e.target.value,
        keydown: (e) => {
          if(e.key === 'ArrowDown'){
            if(!this.isOpen) {
              this.open()
            } else {
              this.highlightNext()
            }
          }
          if(e.key === 'ArrowUp') {
            this.highlightPrev()
          }

          if(e.key === "Escape" || e.key === "Tab") {
            // do not close other components that might be listening for the escape key
            if(this.isOpen) e.stopPropagation();

            this.close()
          }

          if( e.key === "Enter") {
            e.preventDefault();

            if( this.isOpen && this.filteredOptions.length){
              this.selectHighlighted();
            }
          }
        }
      },
      actions: {
        reset: () => this.reset(),
        toggleOptions: () => this.isOpen ? this.close() : (this.open(), this.inputRef.focus())
      },
      listboxProps: {
        [`${ATTRS_NAMESPACE}`]: "listbox"
      }
    })
  }
}
</script>