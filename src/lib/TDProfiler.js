'use strict';

let lastTick = Date.now();
export function profile(flag, showProfiling) {
  const oldLastTick = lastTick;
  lastTick = Date.now();
  const diff = lastTick - oldLastTick;
  if (flag && showProfiling) {
    console.log(`[Profiler] ${flag}: ${diff}ms`);
  }

  return diff;
}
