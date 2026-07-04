import clientPromise from "@/lib/db/mongodb";

/**
 * Closes the app's shared MongoDB client and clears the global cache so the
 * next test file in the same Jest worker gets a fresh connection instead of
 * a closed one. Call from afterAll in every integration test file.
 */
export async function closeDbClient(): Promise<void> {
  const client = await clientPromise;
  await client.close();
  delete global._mongoClientPromise;
}
