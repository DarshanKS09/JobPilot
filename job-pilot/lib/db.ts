import mongoose from "mongoose";

import { env } from "@/lib/env";

declare global {
  // eslint-disable-next-line no-var
  var mongooseConnectionPromise: Promise<typeof mongoose> | undefined;
}

mongoose.set("strictQuery", true);
mongoose.set("sanitizeFilter", true);

export async function connectToDatabase() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!global.mongooseConnectionPromise) {
    global.mongooseConnectionPromise = mongoose.connect(env.mongoUri, {
      autoIndex: true,
      bufferCommands: false,
    });
  }

  try {
    await global.mongooseConnectionPromise;
    return mongoose.connection;
  } catch (error) {
    global.mongooseConnectionPromise = undefined;
    throw error;
  }
}
