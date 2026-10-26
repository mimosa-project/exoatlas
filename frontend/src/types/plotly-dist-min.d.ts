// @types/plotly.js-dist-min only covers Plotly 2.x, so reuse the v3 types
// from @types/plotly.js for the minified bundle.
declare module 'plotly.js-dist-min' {
  import * as Plotly from 'plotly.js'
  export default Plotly
}
