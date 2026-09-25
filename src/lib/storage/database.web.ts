export async function getDatabase(): Promise<never> {
  throw new Error('SQLite persistence is only enabled on native platforms.');
}
