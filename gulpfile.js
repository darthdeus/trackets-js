var gulp = require('gulp');
var es6ModuleTranspiler = require("gulp-es6-module-transpiler");

gulp.task('default', function(){
  // place code for your default task here
  gulp.src("./src/*.js").pipe(es6ModuleTranspiler({
    type: "cjs"
  })).pipe(gulp.dest("./dist"));

})
