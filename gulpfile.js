var gulp = require('gulp');
var closureCompiler = require('gulp-closure-compiler');

gulp.task('default', function(){
  // place code for your default task here
  gulp.src('src/main.js')
    .pipe(closureCompiler())
    .pipe(gulp.dest('dist'));
});
