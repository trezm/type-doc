const gulp = require('gulp');
const plugins = require('gulp-load-plugins')();

gulp.task('build:dev', () => {
  return gulp.src('src/**/*.js')
    .pipe(plugins.babel({
      presets: ['es2015']
    }))
    .pipe(gulp.dest('dist'));
});

gulp.task('test', ['build:dev'], () => {
  return gulp.src(['dist/**/*.spec.js', 'dist/integrationTests/**/*.js'], {
      read: false
    })
    .pipe(plugins.plumber())
    .pipe(plugins.env.set({
      NODE_ENV: 'test'
    }))
    .pipe(plugins.mocha())
    .once('end', () => {
      process.exit();
    });
});

gulp.task('default', ['build:dev']);
