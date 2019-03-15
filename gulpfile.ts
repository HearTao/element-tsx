import * as gulp from 'gulp';
import * as through from 'through2'
import { transform, hasComponent } from './src'
import * as path from 'path'
import * as ts from 'gulp-typescript'
import * as webpack from 'webpack-stream'
import del from 'del'

const named = require('vinyl-named')

function createFactory() {
  return through.obj(function (vinylFile, encoding, callback) {
    const file = vinylFile.clone()
    const basename = path.basename(file.basename, '.d.ts')
    if (hasComponent(vinylFile.contents.toString())) {
      const factoryCode = transform(basename)
      file.contents = new Buffer(factoryCode)
      file.basename = 't_' + basename + '.ts'
      callback(null, file)
    } else {
      callback(null)
    }
  })
}

function saveNames () {
  return through.obj(function (vinylFile, encoding, callback) {
    if (vinylFile.basename.startsWith('t_')) {
      vinylFile.basename = vinylFile.basename.substring(2)
    }
    callback(null, vinylFile)
  })
}

gulp.task('clean', function () {
  return del(['./lib', './dist'])
})

gulp.task('transform', function () {
  return gulp
    .src('./node_modules/element-ui/types/*.d.ts')
    .pipe(createFactory())
    .pipe(ts({
      module: "esnext",
      target: "esnext",
      moduleResolution: "node",
      declaration: true,
      sourceMap: true,
      declarationMap: true,
    }))
    .pipe(saveNames())
    .pipe(gulp.dest('./lib'))
})

gulp.task('bundle', function () {
  return gulp
    .src('./lib/*.js')
    .pipe(named())
    .pipe(webpack({
      context: __dirname,
      target: 'web',
      output: {
        filename: '[name].js',
        libraryTarget: "umd"
      },
      externals: [/element-ui\/*/, 'vue', 'vue-tsx-support']
    }))
    .pipe(gulp.dest('./dist'))
})

gulp.task('copy', function () {
  return gulp
    .src('./lib/*.d.ts')
    .pipe(gulp.dest('./dist'))
})

gulp.task('default', gulp.series(['clean', 'transform', 'bundle', 'copy']))