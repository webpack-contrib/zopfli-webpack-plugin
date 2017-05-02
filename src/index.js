import url from 'url';
import async from 'async';
import zopfli from 'node-zopfli';
import RawSource from 'webpack-sources/lib/RawSource';

class ZopfliPlugin {
  constructor(options = {}) {
    this.asset = options.asset || '[path].gz[query]';
    this.algorithm = options.algorithm || 'gzip';
    this.filename = options.filename || false;
    this.compressionOptions = {};

    if (typeof this.algorithm === 'string') {
      this.compressionOptions = {
        verbose: hasOwnProperty.call(options, 'verbose') ? options.verbose : false,
        verbose_more: hasOwnProperty.call(options, 'verbose_more') ? options.verbose_more : false,
        numiterations: options.numiterations ? options.numiterations : 15,
        blocksplitting: hasOwnProperty.call(options, 'blocksplitting') ? options.blocksplitting : true,
        blocksplittinglast: hasOwnProperty.call(options, 'blocksplittinglast') ? options.blocksplittinglast : false,
        blocksplittingmax: options.blocksplittingmax ? options.blocksplittingmax : 15,
      };
      this.algorithm = (content, options, fn) => {
        zopfli.gzip(content, options, fn);
      };
    } else if (!this.algorithm) {
      throw new Error('Algorithm incorrect or not found');
    }
    this.test = options.test || options.regExp;
    this.threshold = options.threshold || 0;
    this.minRatio = options.minRatio || 0.8;
    this.deleteOriginalAssets = options.deleteOriginalAssets || false;
  }

  apply(compiler) {
    compiler.plugin('this-compilation', (compilation) => {
      compilation.plugin('optimize-assets', (assets, callback) => {
        async.forEach(Object.keys(assets), (file, cb) => {
          if (Array.isArray(this.test)) {
            if (this.test.every(t => !t.test(file))) {
              return cb();
            }
          } else if (this.test && !this.test.test(file)) {
            return cb();
          }
          const asset = assets[file];
          let content = asset.source();

          if (!Buffer.isBuffer(content)) {
            content = new Buffer(content, 'utf-8');
          }

          const originalSize = content.length;

          if (originalSize < this.threshold) {
            return cb();
          }

          this.algorithm(content, this.compressionOptions, (err, result) => {
            if (err) { return cb(err); }

            if (result.length / originalSize > this.minRatio) { return cb(); }

            const parse = url.parse(file);
            const sub = {
              file,
              path: parse.pathname,
              query: parse.query || '',
            };

            let newFile = this.asset.replace(/\[(file|path|query)\]/g, (p0, p1) => sub[p1]);

            if (typeof this.filename === 'function') {
              newFile = this.filename(newFile);
            }
            assets[newFile] = new RawSource(result);

            if (this.deleteOriginalAssets) {
              delete assets[file];
            }
            cb();
          });
        }, callback);
      });
    });
  }
}

export default ZopfliPlugin;
