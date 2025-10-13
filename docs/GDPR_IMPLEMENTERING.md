# 🔧 GDPR Implementeringsguide - Elva Agents

**Status:** 🔴 KLAR TIL START  
**Baseret på:** GDPR_HANDLINGSPLAN.md  
**For:** Development Team  

---

## 📋 Oversigt

Denne guide indeholder konkrete step-by-step instruktioner til at implementere alle GDPR compliance features. Hver opgave har kode-eksempler, test cases, og definition of done.

---

## 🔥 Sprint 1: Kritisk Sikkerhed (Uge 1-2)

### Task 1.1: Implementer bcrypt Password Hashing

**Prioritet:** 🔥 KRITISK  
**Estimat:** 2 dage  
**Dependencies:** Ingen  

#### Step 1: Installer bcrypt

```bash
npm install bcryptjs
npm install --save-dev @types/bcryptjs
```

#### Step 2: Opret password utility

```javascript
// lib/password.js
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

/**
 * Hash a password
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password
 */
export async function hashPassword(password) {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify password against hash
 * @param {string} password - Plain text password
 * @param {string} hash - Hashed password
 * @returns {Promise<boolean>} True if password matches
 */
export async function verifyPassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

/**
 * Check if password needs rehashing (if salt rounds changed)
 * @param {string} hash - Hashed password
 * @returns {boolean} True if needs rehashing
 */
export function needsRehash(hash) {
  try {
    const rounds = bcrypt.getRounds(hash);
    return rounds < SALT_ROUNDS;
  } catch (error) {
    return true; // If can't get rounds, assume it needs rehashing
  }
}
```

#### Step 3: Opdater register endpoint

```javascript
// pages/api/auth/register.js
import { hashPassword } from '../../../lib/password';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, name, password, invitationToken } = req.body;

    // Validation
    if (!email || !name || !password) {
      return res.status(400).json({ error: 'Email, name, and password are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const client = await clientPromise;
    const db = client.db('elva-agents');

    // Check if user exists
    const existingUser = await db.collection('users').findOne({
      email: email.toLowerCase()
    });

    if (existingUser) {
      return res.status(400).json({ error: 'An account with this email already exists' });
    }

    // Hash password - GDPR COMPLIANCE FIX
    const hashedPassword = await hashPassword(password);

    // Create user
    const newUser = {
      email: email.toLowerCase(),
      name: name.trim(),
      password: hashedPassword, // ✅ Now hashed!
      role: 'admin',
      permissions: ['read', 'write', 'delete'],
      platformRole: 'user',
      status: 'active',
      provider: 'credentials',
      emailVerified: false,
      preferences: {
        theme: 'light',
        language: 'en',
        notifications: {
          email: true,
          newWidgetCreated: true,
          teamInvitation: true
        }
      },
      createdAt: new Date(),
      lastLogin: new Date()
    };

    const result = await db.collection('users').insertOne(newUser);
    
    // ... rest of code
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
```

#### Step 4: Opdater NextAuth login

```javascript
// pages/api/auth/[...nextauth].js
import { verifyPassword, needsRehash, hashPassword } from '../../../lib/password';

export const authOptions = {
  providers: [
    // ... Google provider unchanged
    
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        try {
          const client = await clientPromise;
          const db = client.db('elva-agents');
          
          const user = await db.collection('users').findOne({
            email: credentials.email,
            status: 'active'
          });

          if (!user) {
            return null;
          }

          // Verify password with bcrypt - GDPR COMPLIANCE FIX
          const isValidPassword = await verifyPassword(credentials.password, user.password);
          
          if (!isValidPassword) {
            return null;
          }

          // Optional: Rehash if needed (salt rounds increased)
          if (needsRehash(user.password)) {
            const newHash = await hashPassword(credentials.password);
            await db.collection('users').updateOne(
              { _id: user._id },
              { $set: { password: newHash } }
            );
          }

          // Update last login
          await db.collection('users').updateOne(
            { _id: user._id },
            { $set: { lastLogin: new Date() } }
          );

          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            role: user.role,
            permissions: user.permissions,
            platformRole: user.platformRole,
            currentOrganizationId: user.currentOrganizationId?.toString()
          };
        } catch (error) {
          console.error('Auth error:', error);
          return null;
        }
      }
    })
  ],
  // ... rest unchanged
};
```

#### Step 5: Migration Script

```javascript
// scripts/migrate-passwords-to-bcrypt.js
require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 10;

async function migratePasswords() {
  // Safety confirmation
  if (process.argv[2] !== '--confirm') {
    console.error('⚠️  IMPORTANT: This will migrate all plain-text passwords to bcrypt hashes');
    console.log('\nIf you are sure you want to proceed, run:');
    console.log('   node scripts/migrate-passwords-to-bcrypt.js --confirm');
    process.exit(1);
  }

  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    console.log('🔗 Connecting to MongoDB...');
    await client.connect();
    const db = client.db('elva-agents');
    
    console.log('📝 Fetching users with plain-text passwords...');
    const users = await db.collection('users').find({
      provider: 'credentials', // Only credentials users have passwords
      password: { $exists: true }
    }).toArray();

    console.log(`Found ${users.length} users to migrate`);

    let migrated = 0;
    let skipped = 0;
    let failed = 0;

    for (const user of users) {
      try {
        // Check if already hashed (bcrypt hashes start with $2a$ or $2b$)
        if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
          console.log(`⏭️  Skipping ${user.email} - already hashed`);
          skipped++;
          continue;
        }

        // Hash the plain-text password
        const hashedPassword = await bcrypt.hash(user.password, SALT_ROUNDS);

        // Update in database
        await db.collection('users').updateOne(
          { _id: user._id },
          { 
            $set: { 
              password: hashedPassword,
              passwordMigratedAt: new Date()
            } 
          }
        );

        console.log(`✅ Migrated ${user.email}`);
        migrated++;

      } catch (error) {
        console.error(`❌ Failed to migrate ${user.email}:`, error.message);
        failed++;
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`   Migrated: ${migrated}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`   Failed: ${failed}`);
    console.log(`   Total: ${users.length}`);

    if (failed === 0) {
      console.log('\n✅ Migration completed successfully!');
    } else {
      console.log('\n⚠️  Migration completed with errors. Please review failed users.');
    }

  } catch (error) {
    console.error('❌ Migration error:', error);
  } finally {
    await client.close();
  }
}

if (require.main === module) {
  migratePasswords();
}
```

#### Step 6: Testing

```javascript
// __tests__/password.test.js
import { hashPassword, verifyPassword, needsRehash } from '../lib/password';

describe('Password Hashing', () => {
  test('should hash password', async () => {
    const password = 'testPassword123!';
    const hash = await hashPassword(password);
    
    expect(hash).not.toBe(password);
    expect(hash).toMatch(/^\$2[aby]\$/); // bcrypt format
  });

  test('should verify correct password', async () => {
    const password = 'testPassword123!';
    const hash = await hashPassword(password);
    
    const isValid = await verifyPassword(password, hash);
    expect(isValid).toBe(true);
  });

  test('should reject incorrect password', async () => {
    const password = 'testPassword123!';
    const hash = await hashPassword(password);
    
    const isValid = await verifyPassword('wrongPassword', hash);
    expect(isValid).toBe(false);
  });

  test('should detect unhashed passwords', () => {
    const plainText = 'notHashedPassword';
    expect(needsRehash(plainText)).toBe(true);
  });
});
```

#### Definition of Done

- [ ] bcrypt installed
- [ ] Password utility created with tests
- [ ] Register endpoint updated
- [ ] Login endpoint updated
- [ ] Migration script created and tested
- [ ] All existing passwords migrated
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Can create new account and login
- [ ] Code reviewed
- [ ] Deployed to production

---

### Task 1.2: IP Anonymisering

**Prioritet:** 🔥 KRITISK  
**Estimat:** 1 dag  
**Dependencies:** Ingen  

#### Step 1: Opret IP utility

```javascript
// lib/privacy.js

/**
 * Anonymize IP address for GDPR compliance
 * IPv4: 192.168.1.100 -> 192.168.1.0
 * IPv6: 2001:0db8:85a3::8a2e:0370:7334 -> 2001:0db8:85a3::
 */
export function anonymizeIP(ip) {
  if (!ip) return null;

  // Remove any port number
  ip = ip.split(':').slice(0, -1).join(':') || ip;

  // Handle IPv6
  if (ip.includes(':')) {
    const parts = ip.split(':');
    // Keep first 3 segments, anonymize the rest
    return parts.slice(0, 3).join(':') + '::';
  }

  // Handle IPv4
  if (ip.includes('.')) {
    const parts = ip.split('.');
    // Keep first 3 octets, set last to 0
    return parts.slice(0, 3).join('.') + '.0';
  }

  // Unknown format
  return null;
}

/**
 * Get country from IP (requires external service or database)
 * For GDPR compliance, only store country-level data, not precise IP
 */
export async function getCountryFromIP(ip) {
  if (!ip) return null;
  
  try {
    // Option 1: Use ip-api.com (free, no auth needed)
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=countryCode`);
    const data = await response.json();
    return data.countryCode || null;
  } catch (error) {
    console.error('Error getting country from IP:', error);
    return null;
  }
}

/**
 * Check if user has given consent for analytics
 */
export function hasAnalyticsConsent(req) {
  // Check for consent cookie or header
  const consentCookie = req.cookies?.['elva-consent'];
  
  if (consentCookie) {
    try {
      const consent = JSON.parse(consentCookie);
      return consent.analytics === true;
    } catch {
      return false;
    }
  }
  
  // Default: no consent
  return false;
}
```

#### Step 2: Opdater API endpoints

```javascript
// pages/api/respond-responses.js
import { anonymizeIP, getCountryFromIP, hasAnalyticsConsent } from '../../lib/privacy';

export default async function handler(req, res) {
  // ... existing code ...

  if (!conversation) {
    const rawIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || '';
    
    // GDPR COMPLIANCE: Only store country, not precise IP
    const country = await getCountryFromIP(rawIP);
    
    const newConversation = {
      widgetId,
      sessionId: `session_${Date.now()}`,
      userId: userId || null,
      startTime: new Date(),
      endTime: null,
      messageCount: 0,
      messages: [],
      satisfaction: null,
      tags: [],
      metadata: {
        userAgent: req.headers['user-agent'] || '',
        // ✅ GDPR FIX: Don't store IP at all, only country
        country: country,
        referrer: req.headers['referer'] || null
        // ip field removed
      },
      openai: {
        lastResponseId: null,
        conversationHistory: []
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await db.collection("conversations").insertOne(newConversation);
    conversation = { ...newConversation, _id: result.insertedId };
  }

  // ... rest of code
}
```

```javascript
// pages/api/conversations/index.js
import { anonymizeIP, getCountryFromIP } from '../../../lib/privacy';

async function createConversation(req, res, conversations) {
  const { widgetId, sessionId } = req.body;

  const rawIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || '';
  const country = await getCountryFromIP(rawIP);

  const newConversation = {
    widgetId,
    sessionId: sessionId || `session_${Date.now()}`,
    userId: null,
    startTime: new Date(),
    endTime: null,
    messageCount: 0,
    messages: [],
    satisfaction: null,
    tags: [],
    metadata: {
      userAgent: req.headers['user-agent'] || '',
      country: country, // ✅ Only country
      referrer: req.headers['referer'] || null
      // ip field removed
    },
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const result = await conversations.insertOne(newConversation);
  return res.status(201).json({ ...newConversation, _id: result.insertedId });
}
```

#### Step 3: Migration script til existing data

```javascript
// scripts/anonymize-existing-ips.js
require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

async function anonymizeExistingIPs() {
  if (process.argv[2] !== '--confirm') {
    console.error('⚠️  This will anonymize all stored IP addresses');
    console.log('\nRun: node scripts/anonymize-existing-ips.js --confirm');
    process.exit(1);
  }

  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();
    const db = client.db('elva-agents');
    
    // Remove IP field from all conversations
    const result = await db.collection('conversations').updateMany(
      { 'metadata.ip': { $exists: true } },
      { $unset: { 'metadata.ip': '' } }
    );

    console.log(`✅ Anonymized ${result.modifiedCount} conversations`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

anonymizeExistingIPs();
```

#### Definition of Done

- [ ] Privacy utility created
- [ ] All API endpoints updated
- [ ] IP field removed from schema
- [ ] Only country stored
- [ ] Migration script run
- [ ] Tests updated
- [ ] Deployed

---

### Task 1.3: Rate Limiting

**Prioritet:** 🔥 KRITISK  
**Estimat:** 1 dag  
**Dependencies:** Ingen  

#### Step 1: Install rate limiter

```bash
npm install express-rate-limit
```

#### Step 2: Create rate limit middleware

```javascript
// lib/rate-limit.js
import rateLimit from 'express-rate-limit';

/**
 * Rate limiter for API endpoints
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Max 100 requests per window
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  // Use X-Forwarded-For for IP behind proxy
  keyGenerator: (req) => {
    return req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  }
});

/**
 * Stricter rate limit for auth endpoints
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Max 5 login attempts per window
  message: 'Too many login attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful logins
  keyGenerator: (req) => {
    return req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  }
});

/**
 * Rate limit for widget API (more lenient for user-facing)
 */
export const widgetLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // 20 messages per minute
  message: 'Too many messages, please slow down.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Rate limit by userId if available, otherwise IP
    return req.body?.userId || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  }
});
```

#### Step 3: Apply to endpoints

```javascript
// pages/api/auth/login.js
import { authLimiter } from '../../../lib/rate-limit';

// Convert Next.js API to work with Express middleware
function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
}

export default async function handler(req, res) {
  // Apply rate limiting
  try {
    await runMiddleware(req, res, authLimiter);
  } catch (error) {
    return res.status(429).json({ error: 'Too many login attempts' });
  }

  // ... rest of auth logic
}
```

```javascript
// pages/api/respond-responses.js
import { widgetLimiter } from '../../lib/rate-limit';

function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
}

export default async function handler(req, res) {
  // CORS
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Rate limiting
  try {
    await runMiddleware(req, res, widgetLimiter);
  } catch (error) {
    return res.status(429).json({ error: 'Too many requests, please slow down' });
  }

  // ... rest of code
}
```

#### Definition of Done

- [ ] Rate limiter installed
- [ ] Middleware created
- [ ] Applied to auth endpoints
- [ ] Applied to widget endpoints
- [ ] Applied to admin endpoints
- [ ] Tested with load testing tool
- [ ] Deployed

---

## 📝 Sprint 2: Brugerrettigheder (Uge 3-4)

### Task 2.1: Data Export API

**Prioritet:** 🔴 HØJ  
**Estimat:** 2 dage  
**GDPR Artikel:** 15 (Ret til indsigt), 20 (Dataportabilitet)  

#### Implementation

```javascript
// pages/api/user/export-data.js
import { getSession } from 'next-auth/react';
import clientPromise from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getSession({ req });
    
    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = new ObjectId(session.user.id);
    const client = await clientPromise;
    const db = client.db('elva-agents');

    // Gather all user data
    const userData = {
      exportDate: new Date().toISOString(),
      exportVersion: '1.0',
      user: null,
      organizations: [],
      widgets: [],
      conversations: [],
      analytics: [],
      manualReviews: []
    };

    // 1. User profile
    const user = await db.collection('users').findOne({ _id: userId });
    if (user) {
      // Remove sensitive fields
      const { password, ...userWithoutPassword } = user;
      userData.user = userWithoutPassword;
    }

    // 2. Organizations
    const memberships = await db.collection('team_members').find({
      userId: userId
    }).toArray();

    for (const membership of memberships) {
      const org = await db.collection('organizations').findOne({
        _id: membership.organizationId
      });
      
      if (org) {
        userData.organizations.push({
          organization: org,
          membership: membership
        });
      }
    }

    // 3. Widgets (where user is owner)
    const orgIds = memberships.map(m => m.organizationId);
    const widgets = await db.collection('widgets').find({
      organizationId: { $in: orgIds }
    }).toArray();
    userData.widgets = widgets;

    // 4. Conversations (limit to last 1000 for performance)
    const widgetIds = widgets.map(w => w._id);
    const conversations = await db.collection('conversations').find({
      widgetId: { $in: widgetIds }
    }).sort({ createdAt: -1 }).limit(1000).toArray();
    userData.conversations = conversations;

    // 5. Analytics
    const analytics = await db.collection('analytics').find({
      agentId: { $in: widgetIds.map(id => id.toString()) }
    }).toArray();
    userData.analytics = analytics;

    // 6. Manual reviews
    const reviews = await db.collection('manual_reviews').find({
      widgetId: { $in: widgetIds }
    }).toArray();
    userData.manualReviews = reviews;

    // Set headers for download
    const filename = `elva-data-export-${userId}-${Date.now()}.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Return as JSON
    return res.status(200).json(userData);

  } catch (error) {
    console.error('Data export error:', error);
    return res.status(500).json({ error: 'Failed to export data' });
  }
}
```

#### UI Component

```javascript
// components/admin/DataExport.js
import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';

export default function DataExport() {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState('');

  const handleExport = async () => {
    setIsExporting(true);
    setError('');

    try {
      const response = await fetch('/api/user/export-data');
      
      if (!response.ok) {
        throw new Error('Failed to export data');
      }

      // Get filename from response headers
      const contentDisposition = response.headers.get('content-disposition');
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch?.[1] || 'elva-data-export.json';

      // Download file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

    } catch (error) {
      console.error('Export error:', error);
      setError('Failed to export data. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="border rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-2">Download dine data</h3>
      <p className="text-sm text-gray-600 mb-4">
        Download alle dine personlige data i JSON format. Dette inkluderer din profil,
        organisationer, widgets, samtaler og analytics.
      </p>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <Button
        onClick={handleExport}
        disabled={isExporting}
        className="flex items-center gap-2"
      >
        {isExporting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Eksporterer...
          </>
        ) : (
          <>
            <Download className="h-4 w-4" />
            Download Mine Data
          </>
        )}
      </Button>

      <p className="text-xs text-gray-500 mt-4">
        Dette er din ret under GDPR Artikel 15 & 20. Data eksporteres i maskinlæsbart format.
      </p>
    </div>
  );
}
```

#### Add to profile page

```javascript
// pages/admin/profile.js
import DataExport from '../../components/admin/DataExport';
import AccountDeletion from '../../components/admin/AccountDeletion'; // Next task

export default function ProfilePage() {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* ... existing profile sections ... */}
      
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Dine GDPR Rettigheder</h2>
        
        <DataExport />
        <AccountDeletion />
      </div>
    </div>
  );
}
```

#### Definition of Done

- [ ] API endpoint created
- [ ] All user data collected
- [ ] JSON export functional
- [ ] UI component created
- [ ] Added to profile page
- [ ] Download works
- [ ] Data complete and accurate
- [ ] Tested with real account
- [ ] Deployed

---

### Task 2.2: Account Deletion

**Prioritet:** 🔴 HØJ  
**Estimat:** 2 dage  
**GDPR Artikel:** 17 (Ret til sletning)  

#### Implementation

```javascript
// pages/api/user/delete-account.js
import { getSession } from 'next-auth/react';
import clientPromise from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getSession({ req });
    
    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { confirmPassword, reason } = req.body;

    if (!confirmPassword) {
      return res.status(400).json({ error: 'Password confirmation required' });
    }

    const userId = new ObjectId(session.user.id);
    const client = await clientPromise;
    const db = client.db('elva-agents');

    // 1. Verify password
    const user = await db.collection('users').findOne({ _id: userId });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify password (using bcrypt from previous task)
    const { verifyPassword } = await import('../../../lib/password');
    const isValidPassword = await verifyPassword(confirmPassword, user.password);
    
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    // 2. Mark for deletion (grace period of 30 days)
    const deletionDate = new Date();
    deletionDate.setDate(deletionDate.getDate() + 30);

    await db.collection('users').updateOne(
      { _id: userId },
      {
        $set: {
          status: 'pending_deletion',
          deletionScheduledAt: new Date(),
          deletionDate: deletionDate,
          deletionReason: reason || 'User requested',
          deletionIpAddress: null // Don't store IP per GDPR
        }
      }
    );

    // 3. Send confirmation email
    const { sendAccountDeletionEmail } = await import('../../../lib/email');
    await sendAccountDeletionEmail({
      email: user.email,
      name: user.name,
      deletionDate: deletionDate
    });

    // 4. Log the deletion request
    await db.collection('audit_log').insertOne({
      userId: userId,
      action: 'account_deletion_requested',
      timestamp: new Date(),
      metadata: {
        reason: reason,
        deletionDate: deletionDate
      }
    });

    return res.status(200).json({
      message: 'Account marked for deletion',
      deletionDate: deletionDate,
      gracePeriodDays: 30
    });

  } catch (error) {
    console.error('Account deletion error:', error);
    return res.status(500).json({ error: 'Failed to delete account' });
  }
}
```

#### Cancellation endpoint

```javascript
// pages/api/user/cancel-deletion.js
import { getSession } from 'next-auth/react';
import clientPromise from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getSession({ req });
    
    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = new ObjectId(session.user.id);
    const client = await clientPromise;
    const db = client.db('elva-agents');

    // Restore account
    await db.collection('users').updateOne(
      { _id: userId },
      {
        $set: {
          status: 'active'
        },
        $unset: {
          deletionScheduledAt: '',
          deletionDate: '',
          deletionReason: ''
        }
      }
    );

    return res.status(200).json({ message: 'Account deletion cancelled' });

  } catch (error) {
    console.error('Cancel deletion error:', error);
    return res.status(500).json({ error: 'Failed to cancel deletion' });
  }
}
```

#### Scheduled deletion job

```javascript
// scripts/process-account-deletions.js
/**
 * Cron job to permanently delete accounts after grace period
 * Run daily: 0 2 * * * (2 AM every day)
 */
require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

async function processAccountDeletions() {
  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();
    const db = client.db('elva-agents');

    const now = new Date();

    // Find accounts past grace period
    const accountsToDelete = await db.collection('users').find({
      status: 'pending_deletion',
      deletionDate: { $lte: now }
    }).toArray();

    console.log(`Found ${accountsToDelete.length} accounts to permanently delete`);

    for (const user of accountsToDelete) {
      console.log(`Deleting user: ${user.email}`);

      try {
        // Get user's organizations
        const memberships = await db.collection('team_members').find({
          userId: user._id
        }).toArray();

        const orgIds = memberships.map(m => m.organizationId);

        // Get user's widgets
        const widgets = await db.collection('widgets').find({
          organizationId: { $in: orgIds }
        }).toArray();

        const widgetIds = widgets.map(w => w._id);

        // Delete cascade
        await db.collection('conversations').deleteMany({
          widgetId: { $in: widgetIds }
        });

        await db.collection('manual_reviews').deleteMany({
          widgetId: { $in: widgetIds }
        });

        // Anonymize analytics (keep for statistics, but remove link to user)
        await db.collection('analytics').updateMany(
          { agentId: { $in: widgetIds.map(id => id.toString()) } },
          { $set: { anonymized: true, originalUserId: 'deleted' } }
        );

        await db.collection('widgets').deleteMany({
          organizationId: { $in: orgIds }
        });

        // Remove from team memberships
        await db.collection('team_members').deleteMany({
          userId: user._id
        });

        // Delete organizations where user was sole owner
        for (const orgId of orgIds) {
          const otherMembers = await db.collection('team_members').countDocuments({
            organizationId: orgId
          });

          if (otherMembers === 0) {
            await db.collection('organizations').deleteOne({ _id: orgId });
          }
        }

        // Finally, delete user
        await db.collection('users').deleteOne({ _id: user._id });

        // Log permanent deletion
        await db.collection('audit_log').insertOne({
          action: 'account_permanently_deleted',
          timestamp: new Date(),
          metadata: {
            userId: user._id.toString(),
            email: user.email // Logged but user is deleted
          }
        });

        console.log(`✅ Successfully deleted user: ${user.email}`);

      } catch (error) {
        console.error(`❌ Failed to delete user ${user.email}:`, error);
      }
    }

  } catch (error) {
    console.error('Error processing deletions:', error);
  } finally {
    await client.close();
  }
}

processAccountDeletions();
```

#### UI Component

```javascript
// components/admin/AccountDeletion.js
import { useState } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../ui/alert-dialog';

export default function AccountDeletion() {
  const [password, setPassword] = useState('');
  const [reason, setReason] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    if (!password) {
      setError('Indtast venligst dit password for at bekræfte');
      return;
    }

    setIsDeleting(true);
    setError('');

    try {
      const response = await fetch('/api/user/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirmPassword: password,
          reason: reason
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete account');
      }

      // Show success and redirect
      alert(`Din konto er markeret til sletning. Den vil blive permanent slettet ${new Date(data.deletionDate).toLocaleDateString('da-DK')}.`);
      window.location.href = '/api/auth/signout';

    } catch (error) {
      setError(error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="border border-red-200 rounded-lg p-6 bg-red-50">
      <div className="flex items-start gap-3 mb-4">
        <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
        <div>
          <h3 className="text-lg font-semibold text-red-900">Fareområde</h3>
          <p className="text-sm text-red-700">
            Sletning af din konto er permanent og kan ikke fortrydes efter grace perioden.
          </p>
        </div>
      </div>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" className="flex items-center gap-2">
            <Trash2 className="h-4 w-4" />
            Slet Min Konto
          </Button>
        </AlertDialogTrigger>
        
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Er du sikker?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p>
                Dette vil permanent slette din konto og alle tilhørende data efter 30 dages grace periode:
              </p>
              <ul className="list-disc list-inside text-sm space-y-1">
                <li>Din profil og login</li>
                <li>Alle dine widgets</li>
                <li>Alle samtaler og analytics</li>
                <li>Organisation medlemskaber</li>
              </ul>
              <p className="text-sm font-semibold">
                Du har 30 dage til at fortryde beslutningen.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">Bekræft med dit password</label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Indtast dit password"
                    className="mt-1"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Hvorfor sletter du? (valgfrit)</label>
                  <Textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Hjælp os med at forbedre..."
                    className="mt-1"
                    rows={3}
                  />
                </div>

                {error && (
                  <div className="bg-red-100 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
                    {error}
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <AlertDialogFooter>
            <AlertDialogCancel>Annuller</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Sletter...' : 'Ja, Slet Min Konto'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <p className="text-xs text-gray-600 mt-4">
        Dette er din ret under GDPR Artikel 17 (Retten til at blive glemt).
      </p>
    </div>
  );
}
```

#### Add to package.json

```json
{
  "scripts": {
    "cron:process-deletions": "node scripts/process-account-deletions.js"
  }
}
```

#### Setup cron (Vercel Cron Jobs)

```json
// vercel.json
{
  "crons": [{
    "path": "/api/cron/process-deletions",
    "schedule": "0 2 * * *"
  }]
}
```

```javascript
// pages/api/cron/process-deletions.js
export default async function handler(req, res) {
  // Verify cron secret
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Import and run the deletion script
    const { processAccountDeletions } = await import('../../../scripts/process-account-deletions');
    await processAccountDeletions();
    
    return res.status(200).json({ message: 'Deletions processed' });
  } catch (error) {
    console.error('Cron error:', error);
    return res.status(500).json({ error: 'Failed to process deletions' });
  }
}
```

#### Definition of Done

- [ ] Deletion API created
- [ ] Cancellation API created
- [ ] UI component created
- [ ] Grace period logic working
- [ ] Cascade deletion implemented
- [ ] Cron job setup
- [ ] Email notifications sent
- [ ] Tested end-to-end
- [ ] Deployed

---

## 🍪 Sprint 3: Samtykke System (Uge 5-6)

### Task 3.1: Cookie Consent Banner

**Prioritet:** 🔥 KRITISK  
**Estimat:** 3 dage  
**GDPR/ePrivacy compliance**  

#### Implementation

```javascript
// pages/api/widget-embed/[widgetId].js
// Add to widget script

const widgetScript = `
(function() {
  'use strict';

  // ============================================
  // GDPR CONSENT MANAGER
  // ============================================
  
  const ElvaConsent = {
    storageKey: 'elva-consent',
    
    // Get current consent state
    getConsent: function() {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {
          return null;
        }
      }
      return null;
    },
    
    // Save consent
    saveConsent: function(consent) {
      localStorage.setItem(this.storageKey, JSON.stringify({
        ...consent,
        timestamp: new Date().toISOString(),
        version: '1.0'
      }));
      
      // Fire consent change event
      window.dispatchEvent(new CustomEvent('elva-consent-changed', {
        detail: consent
      }));
    },
    
    // Check if we have consent for specific purpose
    hasConsent: function(purpose) {
      const consent = this.getConsent();
      return consent && consent[purpose] === true;
    },
    
    // Show consent banner
    showBanner: function() {
      // Don't show if already decided
      if (this.getConsent()) {
        return;
      }
      
      // Create banner HTML
      const banner = document.createElement('div');
      banner.id = 'elva-consent-banner';
      banner.innerHTML = \`
        <div class="elva-consent-overlay"></div>
        <div class="elva-consent-banner">
          <div class="elva-consent-content">
            <h3>🍪 Vi respekterer dit privatliv</h3>
            <p>
              Vi bruger localStorage til at gemme din samtalehistorik, så du kan fortsætte 
              hvor du slap. Vi indsamler ikke personlige data uden din tilladelse.
            </p>
            <div class="elva-consent-options">
              <label class="elva-consent-checkbox">
                <input type="checkbox" id="elva-consent-necessary" checked disabled>
                <span><strong>Nødvendige</strong> - Påkrævet for at chatten virker</span>
              </label>
              <label class="elva-consent-checkbox">
                <input type="checkbox" id="elva-consent-functional" checked>
                <span><strong>Funktionelle</strong> - Gem samtalehistorik</span>
              </label>
              <label class="elva-consent-checkbox">
                <input type="checkbox" id="elva-consent-analytics">
                <span><strong>Analytics</strong> - Hjælp os forbedre tjenesten</span>
              </label>
            </div>
            <div class="elva-consent-buttons">
              <button class="elva-consent-btn elva-consent-btn-accept-all">
                Accepter alle
              </button>
              <button class="elva-consent-btn elva-consent-btn-accept-selected">
                Accepter valgte
              </button>
              <button class="elva-consent-btn elva-consent-btn-reject">
                Afvis alle
              </button>
            </div>
            <p class="elva-consent-footer">
              <a href="https://elva-solutions.com/privacy" target="_blank">Privatlivspolitik</a>
              |
              <a href="https://elva-solutions.com/cookies" target="_blank">Cookie politik</a>
            </p>
          </div>
        </div>
      \`;
      
      document.body.appendChild(banner);
      
      // Add styles
      const style = document.createElement('style');
      style.textContent = \`
        .elva-consent-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 999998;
        }
        
        .elva-consent-banner {
          position: fixed;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          max-width: 600px;
          width: 90%;
          background: white;
          border-radius: 16px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
          z-index: 999999;
          animation: slideUp 0.3s ease-out;
        }
        
        @keyframes slideUp {
          from {
            transform: translateX(-50%) translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateX(-50%) translateY(0);
            opacity: 1;
          }
        }
        
        .elva-consent-content {
          padding: 24px;
        }
        
        .elva-consent-content h3 {
          margin: 0 0 12px 0;
          font-size: 20px;
          font-weight: 600;
          color: #1f2937;
        }
        
        .elva-consent-content p {
          margin: 0 0 16px 0;
          font-size: 14px;
          line-height: 1.5;
          color: #6b7280;
        }
        
        .elva-consent-options {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 20px;
        }
        
        .elva-consent-checkbox {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          font-size: 14px;
          color: #374151;
        }
        
        .elva-consent-checkbox input[type="checkbox"] {
          width: 18px;
          height: 18px;
          cursor: pointer;
        }
        
        .elva-consent-checkbox input[disabled] {
          cursor: not-allowed;
          opacity: 0.6;
        }
        
        .elva-consent-buttons {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        
        .elva-consent-btn {
          flex: 1;
          min-width: 120px;
          padding: 10px 16px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .elva-consent-btn-accept-all {
          background: ${config.theme.buttonColor};
          color: white;
        }
        
        .elva-consent-btn-accept-all:hover {
          opacity: 0.9;
          transform: translateY(-1px);
        }
        
        .elva-consent-btn-accept-selected {
          background: #e5e7eb;
          color: #374151;
        }
        
        .elva-consent-btn-accept-selected:hover {
          background: #d1d5db;
        }
        
        .elva-consent-btn-reject {
          background: transparent;
          color: #6b7280;
          border: 1px solid #d1d5db;
        }
        
        .elva-consent-btn-reject:hover {
          background: #f9fafb;
        }
        
        .elva-consent-footer {
          margin-top: 16px;
          font-size: 12px;
          color: #9ca3af;
          text-align: center;
        }
        
        .elva-consent-footer a {
          color: ${config.theme.buttonColor};
          text-decoration: none;
        }
        
        .elva-consent-footer a:hover {
          text-decoration: underline;
        }
        
        @media (max-width: 640px) {
          .elva-consent-banner {
            bottom: 0;
            left: 0;
            right: 0;
            max-width: 100%;
            width: 100%;
            transform: none;
            border-radius: 16px 16px 0 0;
          }
          
          .elva-consent-buttons {
            flex-direction: column;
          }
          
          .elva-consent-btn {
            width: 100%;
          }
        }
      \`;
      document.head.appendChild(style);
      
      // Event listeners
      banner.querySelector('.elva-consent-btn-accept-all').addEventListener('click', () => {
        this.saveConsent({
          necessary: true,
          functional: true,
          analytics: true
        });
        this.removeBanner();
      });
      
      banner.querySelector('.elva-consent-btn-accept-selected').addEventListener('click', () => {
        this.saveConsent({
          necessary: true,
          functional: document.getElementById('elva-consent-functional').checked,
          analytics: document.getElementById('elva-consent-analytics').checked
        });
        this.removeBanner();
      });
      
      banner.querySelector('.elva-consent-btn-reject').addEventListener('click', () => {
        this.saveConsent({
          necessary: true,
          functional: false,
          analytics: false
        });
        this.removeBanner();
      });
    },
    
    removeBanner: function() {
      const banner = document.getElementById('elva-consent-banner');
      if (banner) {
        banner.remove();
      }
    }
  };

  // ============================================
  // INITIALIZE WIDGET WITH CONSENT
  // ============================================

  // Show consent banner if needed
  ElvaConsent.showBanner();

  // Only initialize user tracking if consent given
  let userId = null;
  
  if (ElvaConsent.hasConsent('functional')) {
    // User has consented to functional cookies
    userId = localStorage.getItem('elva-widget-user-id');
    if (!userId) {
      userId = 'user_' + Math.random().toString(36).substr(2, 16);
      localStorage.setItem('elva-widget-user-id', userId);
    }
  } else {
    // No consent - use session-only identifier
    userId = 'session_' + Math.random().toString(36).substr(2, 16);
  }

  // Rest of widget code...
  // Use userId for API calls
  
})();
`;
```

#### Backend validation

```javascript
// pages/api/respond-responses.js
export default async function handler(req, res) {
  // ... existing code ...

  // Check if user has given analytics consent
  const hasAnalyticsConsent = req.headers['x-elva-consent-analytics'] === 'true';

  const newConversation = {
    widgetId,
    sessionId: `session_${Date.now()}`,
    userId: userId || null,
    startTime: new Date(),
    endTime: null,
    messageCount: 0,
    messages: [],
    satisfaction: null,
    tags: [],
    metadata: {
      userAgent: req.headers['user-agent'] || '',
      country: hasAnalyticsConsent ? await getCountryFromIP(rawIP) : null,
      referrer: hasAnalyticsConsent ? req.headers['referer'] : null,
      // Only collect if consent given
      consentGiven: hasAnalyticsConsent
    },
    // ... rest
  };

  // ... rest of code
}
```

#### Definition of Done

- [ ] Consent banner implemented in widget
- [ ] localStorage consent management
- [ ] Backend respects consent
- [ ] Privacy policy linked
- [ ] Cookie policy linked
- [ ] Testing on multiple devices
- [ ] Deployed

---

## ⚖️ Sprint 4: Juridisk (Uge 7-8)

### Task 4.1: Privacy Policy & Terms

**Prioritet:** 🔴 HØJ  
**Estimat:** 5 dage (primært juridisk)  
**Dependencies:** GDPR advokat  

#### Create pages

```javascript
// pages/privacy.js
export default function PrivacyPolicy() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold mb-8">Privatlivspolitik</h1>
      
      {/* Content from legal advisor */}
      <div className="prose prose-lg">
        {/* See GDPR_ANALYSE.md Appendix for template */}
      </div>
    </div>
  );
}
```

```javascript
// pages/terms.js
export default function TermsOfService() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold mb-8">Vilkår for Brug</h1>
      
      {/* Content from legal advisor */}
      <div className="prose prose-lg">
        {/* ... */}
      </div>
    </div>
  );
}
```

```javascript
// pages/cookies.js
export default function CookiePolicy() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold mb-8">Cookie Politik</h1>
      
      {/* Content from legal advisor */}
      <div className="prose prose-lg">
        {/* ... */}
      </div>
    </div>
  );
}
```

#### Add to footer

```javascript
// components/Footer.js
export default function Footer() {
  return (
    <footer className="bg-gray-50 border-t mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="font-semibold mb-4">Elva Solutions</h3>
            <p className="text-sm text-gray-600">
              AI-drevet chat widgets til din virksomhed
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="/privacy" className="text-gray-600 hover:text-gray-900">Privatlivspolitik</a></li>
              <li><a href="/terms" className="text-gray-600 hover:text-gray-900">Vilkår for Brug</a></li>
              <li><a href="/cookies" className="text-gray-600 hover:text-gray-900">Cookie Politik</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Din Privatliv</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="/admin/profile#gdpr" className="text-gray-600 hover:text-gray-900">Download Dine Data</a></li>
              <li><a href="/admin/profile#gdpr" className="text-gray-600 hover:text-gray-900">Slet Din Konto</a></li>
              <li><a href="mailto:privacy@elva-solutions.com" className="text-gray-600 hover:text-gray-900">Kontakt Privatliv</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Kontakt</h4>
            <p className="text-sm text-gray-600">
              Elva Solutions ApS<br />
              CVR: [NUMMER]<br />
              <a href="mailto:privacy@elva-solutions.com" className="text-blue-600 hover:underline">
                privacy@elva-solutions.com
              </a>
            </p>
          </div>
        </div>
        
        <div className="border-t mt-8 pt-8 text-center text-sm text-gray-600">
          <p>© {new Date().getFullYear()} Elva Solutions. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
```

---

## 📊 Testing Strategy

### Unit Tests

```bash
npm install --save-dev jest @testing-library/react @testing-library/jest-dom
```

```javascript
// __tests__/gdpr/
// - password.test.js
// - privacy.test.js
// - data-export.test.js
// - account-deletion.test.js
// - consent.test.js
```

### Integration Tests

```javascript
// __tests__/integration/gdpr-flow.test.js
describe('GDPR Compliance Flow', () => {
  test('User can export their data', async () => {
    // Login
    // Navigate to profile
    // Click export
    // Verify download
  });

  test('User can delete their account', async () => {
    // Login
    // Navigate to profile
    // Request deletion
    // Verify grace period
  });

  test('Consent banner shows and works', async () => {
    // Load widget
    // Verify banner shows
    // Accept consent
    // Verify localStorage
  });
});
```

### Manual Testing Checklist

```markdown
## Sprint 1 Testing

- [ ] New user registration with bcrypt
- [ ] Existing user login with bcrypt
- [ ] Password migration script
- [ ] IP anonymization in conversations
- [ ] Rate limiting on endpoints
- [ ] Rate limiting doesn't block legitimate users

## Sprint 2 Testing

- [ ] Data export downloads complete JSON
- [ ] Export includes all user data
- [ ] Account deletion marks for deletion
- [ ] Grace period works correctly
- [ ] Cancellation restores account
- [ ] Permanent deletion removes all data

## Sprint 3 Testing

- [ ] Consent banner shows on first visit
- [ ] Consent saves to localStorage
- [ ] Widget respects consent choices
- [ ] Analytics only collected with consent
- [ ] Privacy links work

## Sprint 4 Testing

- [ ] Privacy policy accessible
- [ ] Terms of service accessible
- [ ] Cookie policy accessible
- [ ] Footer links work
- [ ] All pages mobile responsive
```

---

## 📦 Deployment Plan

### Phase 1: Development

```bash
# Create feature branch
git checkout -b feature/gdpr-compliance

# Work on tasks
# Commit frequently with descriptive messages
git commit -m "feat: implement bcrypt password hashing"
git commit -m "feat: add IP anonymization"
```

### Phase 2: Staging

```bash
# Merge to staging branch
git checkout staging
git merge feature/gdpr-compliance

# Deploy to staging environment
vercel --prod --scope=staging

# Run full test suite
npm run test
npm run test:integration
```

### Phase 3: Production

```bash
# Create PR from staging to main
# Code review
# QA approval

# Merge to main
git checkout main
git merge staging

# Deploy to production
vercel --prod

# Run migration scripts
npm run migrate:passwords
npm run migrate:anonymize-ips

# Monitor for errors
vercel logs --follow
```

### Rollback Plan

```bash
# If issues detected
vercel rollback

# Or redeploy previous version
git revert HEAD
git push origin main
vercel --prod
```

---

## 📈 Progress Tracking

### Daily Standup Format

```markdown
## What I did yesterday
- [ ] Task 1.1: Password hashing - 80% complete
- [ ] Task 1.2: IP anonymization - started

## What I'm doing today
- [ ] Task 1.1: Finish password hashing
- [ ] Task 1.2: Complete IP anonymization
- [ ] Task 1.3: Start rate limiting

## Blockers
- Waiting for legal review on privacy policy
```

### Weekly Report

```markdown
## Week 1 Summary

**Completed:**
- ✅ Password hashing with bcrypt
- ✅ IP anonymization
- ✅ Rate limiting

**In Progress:**
- ⏳ CSRF protection (80%)

**Blocked:**
- None

**Next Week:**
- Data export API
- Account deletion API

**Risks:**
- None identified
```

---

## 🎯 Success Criteria

### Sprint 1 Success

- [ ] All passwords are hashed with bcrypt
- [ ] No plain-text passwords in database
- [ ] IP addresses anonymized or removed
- [ ] Rate limiting active on all endpoints
- [ ] Security audit shows no critical issues

### Sprint 2 Success

- [ ] Users can download their data as JSON
- [ ] Users can request account deletion
- [ ] Grace period mechanism works
- [ ] Deletion emails sent
- [ ] Cron job running daily

### Sprint 3 Success

- [ ] Consent banner shows to new users
- [ ] Consent choices respected
- [ ] Privacy links accessible
- [ ] No data collected without consent

### Sprint 4 Success

- [ ] Privacy policy published
- [ ] Terms of service published
- [ ] Cookie policy published
- [ ] All legal pages linked in footer
- [ ] Legal review approved

---

## 📞 Support & Questions

### During Implementation

**Technical Questions:**
- Tech Lead: [EMAIL]
- Senior Developer: [EMAIL]

**Legal Questions:**
- GDPR Advisor: [EMAIL]
- Legal Team: [EMAIL]

**General Questions:**
- Project Manager: [EMAIL]

### Resources

- [GDPR Analysis](./GDPR_ANALYSE.md)
- [Action Plan](./GDPR_HANDLINGSPLAN.md)
- [Executive Summary](./GDPR_EXECUTIVE_SUMMARY.md)
- [Datatilsynet](https://www.datatilsynet.dk/)

---

**Version:** 1.0  
**Last Updated:** 13. oktober 2025  
**Status:** 🔴 READY TO START

**Godkend og start:**
- [ ] Tech Lead approval
- [ ] PM approval  
- [ ] Budget approved
- [ ] Team assigned
- [ ] Sprint 1 kickoff scheduled

🚀 **Lad os gøre Elva GDPR-compliant!**

