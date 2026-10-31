export function createLatest(): <T>(task: () => Promise<T>) => Promise<T | null> {
  let latest = 0;
  return async (task) => {
    latest += 1;
    const id = latest;
    try {
      const result = await task();
      return id === latest ? result : null;
    } catch (error) {
      if (id === latest) throw error;
      return null;
    }
  };
}

export async function retryOnce<T>(task: () => Promise<T>, delayMs: number): Promise<T> {
  try {
    return await task();
  } catch {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    return task();
  }
}
