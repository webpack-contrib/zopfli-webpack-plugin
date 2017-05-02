import { name as PROJECT_NAME } from '../package.json';
import ZopfliPlugin from '../src';

describe(PROJECT_NAME, () => {
  test('should export the loader', (done) => {
    expect(ZopfliPlugin).toBeInstanceOf(Function);
    done();
  });
});
