// Read events through a callback into queue and meanwhile 
export function evtBucket<T>(): [AsyncGenerator<T, void, unknown>, (itm: T) => void] {
  const stack: T[] = [];
  let next: ((arg0: T) => void) | null = null;

  async function * bucket() {
    while (true) {
      yield new Promise<T>((res) => {
        if (stack.length > 0) return res(stack.shift()!);
        else next = res;
      });
    }
  }

  function push(itm: T) {
    if (next) {
      next(itm);
      next = null;
      return;
    }
    else stack.push(itm);
  }

  return [bucket(), push];
}
// From StackOverflow, likely has incideous bugs with race conditions, do not use for fast streams.