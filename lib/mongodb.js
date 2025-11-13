import { MongoClient } from 'mongodb';

const primaryUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/elva-agents';
const fallbackUri =
  process.env.MONGODB_URI_FALLBACK ||
  process.env.MONGODB_DIRECT_URI ||
  process.env.MONGODB_STANDARD_URI;

const isDevelopment = process.env.NODE_ENV === 'development';

const getConnectionOptions = (uri) => {
  const isAtlas = uri.includes('mongodb+srv://') || uri.includes('mongodb.net');

  const baseOptions = {
    retryWrites: true,
    w: 'majority',
    connectTimeoutMS: 15000,
    socketTimeoutMS: 45000,
    serverSelectionTimeoutMS: 15000,
    maxPoolSize: 10,
    minPoolSize: 5,
    maxIdleTimeMS: 30000,
    heartbeatFrequencyMS: 10000,
  };

  if (!isAtlas) {
    return baseOptions;
  }

  const atlasOptions = {
    ...baseOptions,
    tls: true,
    ssl: true,
    authSource: 'admin',
    authMechanism: 'SCRAM-SHA-1',
  };

  if (isDevelopment) {
    atlasOptions.tlsAllowInvalidCertificates = true;
    atlasOptions.tlsAllowInvalidHostnames = true;
    console.log('🔒 Attempting MongoDB Atlas connection with development SSL settings...');
  }

  return atlasOptions;
};

const shouldFallback = (error) => {
  if (!error) return false;

  return (
    error.code === 'ESERVFAIL' ||
    error?.codeName === 'AtlasError' ||
    error?.syscall === 'querySrv' ||
    /querySrv/i.test(error.message || '')
  );
};

const connect = async () => {
  try {
    const client = new MongoClient(primaryUri, getConnectionOptions(primaryUri));
    return await client.connect();
  } catch (error) {
    console.error('❌ Primary MongoDB connection failed:', error);
    if (fallbackUri && shouldFallback(error)) {
      console.warn(
        '⚠️  MongoDB SRV lookup failed. Retrying with fallback URI (direct connection)...'
      );
      const fallbackClient = new MongoClient(fallbackUri, getConnectionOptions(fallbackUri));
      return await fallbackClient.connect();
    }

    throw error;
  }
};

let clientPromise;

if (isDevelopment) {
  if (!global._mongoClientPromise) {
    global._mongoClientPromise = connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  clientPromise = connect();
}

export default clientPromise;