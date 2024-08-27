export class AsyncLock {
  release: () => void;
  promise: Promise<void>;
  constructor () {
    this.release = () => {};
    this.promise = Promise.resolve();
  }

  async aquire () {
    await this.promise
    this.promise = new Promise(resolve => this.release = resolve);
  }
}