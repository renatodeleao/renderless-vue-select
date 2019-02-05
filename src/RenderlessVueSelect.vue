<script>
/**
 * @desc all functionality, zero opinions about your makup /styles
 * [1] - ENHACEMENT: Add highlighted substrings (like the wesbos course)
 * [2] - Loading states and async work compatibility out-of-the-boz
 */
export default {
  name: "renderless-vue-select",
  props: {
    value: {
      type: [String, Object, null],
      default: null
    },
    options: {
      type: [Array],
      required: true
      // we use a serializer to validate
    },
    /**
     * Default Filter by start matching, pass custom filters or fuzzy search engin like Fuse.js
     */
    filterFunction: {
      type: Function,
      default: (query, options) => {
        return options.filter(o => o.label.toLowerCase().startsWith(query.toLowerCase()))
      }
    }
  },
  model: {
    prop: "value",
    event: "select"
  },
  data(){
    return {
      query: '',
      isOpen: false,
      highlightedIndex: 0,
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
      ) {
        return this.options
      } else {
        throw new Error("Label and value are required keys in your option object")
      }
    },
    filteredOptions(){
      // [1] [2]
      return this.filterFunction(this.query, this.serializedOptions);
    }
  },
  watch: {
    value(newVal){
      if(!this.serializedValue || (this.serializedValue && this.serializedValue.label === null)){
        this.query = ""
      } else {
        this.query = this.serializedValue.label;
      }
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
    },
    close(){
      if(!this.isOpen) return;
      this.highlightedIndex = 0;
      this.isOpen = false;
    },
    selectOption(option){
      this.query = option.label;
      this.$emit('select', option)
    },
    selectHighlighted(){
      this.selectOption(this.filteredOptions[this.highlightedIndex]);
      this.close()
    },
    reset(){
      this.query = "";
      this.highlightedIndex = 0;
      this.$emit('select', null);
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
      this.optionsScroller.children[this.highlightedIndex].scrollIntoView({block: 'nearest'});
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
    }
  },
  created(){
    // look if a selected option is already passed to v-model
    // if not null
    if(this.value){
      this.selectOption(this.serializedValue);
    }
  },
  mounted(){
    this.optionsScroller = this.$el.querySelector('[data-vue-select-scroller]');
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
      },
      options: this.filteredOptions,
      optionEvents: (option) => ({
        click: () => {
          this.selectOption(option);
          this.close();
        }
      }),
      inputProps: {
        value: this.query
      },
      inputEvents: {
        click: this.open,
        input: (e) => this.query = e.target.value,
        keydown: (e) => {
          if(e.key === 'ArrowDown'){
            this.highlightNext()
          }
          if(e.key === 'ArrowUp') {
            this.highlightPrev()
          }

          if(e.key === "Escape" || e.key === "Tab") {
            this.close()
          }

          if( e.key === "Enter") {
            e.preventDefault();

            if( this.isOpen && this.filteredOptions.length){
              this.selectHighlighted();
            } else {
              this.open()
            }
          }
        }
      },
      actions: {
        reset: () => this.reset(),
        toggleOptions: () => this.isOpen ? this.close() : this.open()
      }
    })
  }
}
</script>