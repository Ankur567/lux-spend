import type { ClientSession } from "mongoose";
import { connectDB } from "./connect";

let transactionsUnsupported = false;

function isTransactionUnsupported(err: unknown): boolean {
  const e = err as { code?: number; codeName?: string; message?: string };
  return (
    e?.code === 20 ||
    e?.codeName === "IllegalOperation" ||
    /Transaction numbers are only allowed|replica set/i.test(e?.message ?? "")
  );
}

/**
 * Runs `fn` inside a MongoDB multi-document transaction (with automatic retry
 * on transient errors). If the deployment does not support transactions
 * (a standalone local mongod), falls back to running without a session and
 * logs a warning once. Atlas always supports transactions.
 */
export async function withTransaction<T>(fn: (session: ClientSession | null) => Promise<T>): Promise<T> {
  const mongoose = await connectDB();
  if (transactionsUnsupported) return fn(null);

  try {
    return await mongoose.connection.transaction(async (session) => fn(session));
  } catch (err) {
    if (isTransactionUnsupported(err)) {
      transactionsUnsupported = true;
      console.warn(
        "[db] MongoDB transactions are not supported by this deployment. Financial writes will run without " +
          "multi-document atomicity. Use a replica set (e.g. MongoDB Atlas) in production.",
      );
      return fn(null);
    }
    throw err;
  }
}
