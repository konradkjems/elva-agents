import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/elva-agents';

// Secure MongoDB connection options
const getConnectionOptions = () => {
  const isAtlas = uri.includes('mongodb+srv://') || uri.includes('mongodb.net');
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  const baseOptions = {
    retryWrites: true,
    w: 'majority',
    // Connection timeout settings
    connectTimeoutMS: 15000,
    socketTimeoutMS: 45000,
    serverSelectionTimeoutMS: 15000,
    // Retry settings
    maxPoolSize: 10,
    minPoolSize: 5,
    maxIdleTimeMS: 30000,
    // Heartbeat settings
    heartbeatFrequencyMS: 10000,
  };

  if (isAtlas) {
    // MongoDB Atlas requires TLS
    const atlasOptions = {
      ...baseOptions,
      tls: true,
      ssl: true,
      // Additional Atlas-specific options
      authSource: 'admin',
      authMechanism: 'SCRAM-SHA-1'
    };

    // In development, we might need to handle certificate issues
    if (isDevelopment) {
      // Allow invalid certificates for development (common SSL issue)
      atlasOptions.tlsAllowInvalidCertificates = true;
      atlasOptions.tlsAllowInvalidHostnames = true;
      console.log('🔒 Attempting MongoDB Atlas connection with development SSL settings...');
      return atlasOptions;
    }

    return atlasOptions;
  } else {
    // Local MongoDB doesn't need TLS
    return baseOptions;
  }
};

const options = getConnectionOptions();

let client;
let clientPromise;

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export default clientPromise;