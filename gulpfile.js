const gulp = require('gulp');
const plugins = require('gulp-load-plugins')();
const clean = require('gulp-clean');
const sequence = require('run-sequence');

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

/**
 * DOCS
 *
 * - Clean existing docs/dist folder to get most recent type checker
 * - Rebuild the existing dist folder
 * - Copy over the rebuilt dist folder
 */
gulp.task('clean:docs', () => {
  return gulp.src('docs/dist', { read: false }).pipe(clean());
});

gulp.task('copy:dist2docs', () => {
  return gulp.src(['dist/**/*']).pipe(gulp.dest('docs/dist'));
});

gulp.task('docs', () => {
  sequence(
    'default',
    'clean:docs',
    'copy:dist2docs'
  );
});

gulp.task('default', ['build:dev']);
