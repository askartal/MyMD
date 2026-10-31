import { describe, expect, it, vi } from 'vitest';
import { createLatest, retryOnce } from './async';

describe('createLatest', () => {
  it('discards an older task that finishes last', async () => {
    const latest = createLatest();
    let finishOld!: (value: string) => void;
    const older = latest(() => new Promise<string>((resolve) => { finishOld = resolve; }));
    const newer = latest(async () => 'new');
    expect(await newer).toBe('new');
    finishOld('old');
    expect(await older).toBeNull();
  });
  it('swallows errors from stale tasks', async () => {
    const latest = createLatest();
    const older = latest(() => Promise.reject(new Error('gone')));
    await latest(async () => 'new');
    await expect(older).resolves.toBeNull();
  });
  it('passes on errors from the current task', async () => {
    await expect(createLatest()(() => Promise.reject(new Error('gone')))).rejects.toThrow('gone');
  });
});

describe('retryOnce', () => {
  it('retries once after the delay', async () => {
    vi.useFakeTimers();
    const task = vi.fn().mockRejectedValueOnce(new Error('missing')).mockResolvedValueOnce('ok');
    const result = retryOnce(task, 100);
    await vi.advanceTimersByTimeAsync(100);
    await expect(result).resolves.toBe('ok');
    expect(task).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });
  it('gives up after the second failure', async () => {
    const task = vi.fn().mockRejectedValue(new Error('missing'));
    await expect(retryOnce(task, 0)).rejects.toThrow('missing');
    expect(task).toHaveBeenCalledTimes(2);
  });
});
