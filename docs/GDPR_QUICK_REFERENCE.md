# 🔖 GDPR Quick Reference - Developer Cheat Sheet

**Print denne side og hav ved din skærm! 📌**

---

## 🚨 Critical Rules

### ❌ NEVER DO

```javascript
// ❌ NEVER store plain-text passwords
password: credentials.password

// ❌ NEVER log IP addresses without anonymizing
ip: req.headers['x-forwarded-for']

// ❌ NEVER collect data without consent
trackUser(userId) // Without checking consent first

// ❌ NEVER hardcode sensitive data
const API_KEY = "sk-1234567890"

// ❌ NEVER expose user data in API responses
return user // Contains password!
```

### ✅ ALWAYS DO

```javascript
// ✅ ALWAYS hash passwords
import { hashPassword } from '../lib/password';
password: await hashPassword(credentials.password)

// ✅ ALWAYS anonymize IPs or use country only
import { getCountryFromIP } from '../lib/privacy';
country: await getCountryFromIP(ip)

// ✅ ALWAYS check consent before tracking
if (hasConsent('analytics')) {
  trackUser(userId);
}

// ✅ ALWAYS use environment variables
const apiKey = process.env.OPENAI_API_KEY

// ✅ ALWAYS exclude sensitive fields
const { password, ...safeUser } = user;
return safeUser;
```

---

## 🔐 Password Handling

### Hash Password (Registration)

```javascript
import { hashPassword } from '../lib/password';

const hashedPassword = await hashPassword(password);

await db.collection('users').insertOne({
  email,
  password: hashedPassword, // ✅ Hashed
  // ... rest
});
```

### Verify Password (Login)

```javascript
import { verifyPassword } from '../lib/password';

const user = await db.collection('users').findOne({ email });
const isValid = await verifyPassword(password, user.password);

if (!isValid) {
  return null; // Wrong password
}
```

---

## 🌍 IP Handling

### Anonymize IP

```javascript
import { anonymizeIP, getCountryFromIP } from '../lib/privacy';

const rawIP = req.headers['x-forwarded-for'];

// Option 1: Anonymize
const anonymizedIP = anonymizeIP(rawIP); // 192.168.1.0

// Option 2: Only country (BETTER for GDPR)
const country = await getCountryFromIP(rawIP); // "DK"

// Store ONLY country
metadata: {
  country: country,
  // NO ip field!
}
```

---

## 🍪 Consent Checking

### Check Consent (Widget)

```javascript
import { hasAnalyticsConsent } from '../lib/privacy';

// In API endpoint
const consent = hasAnalyticsConsent(req);

if (consent) {
  // Track analytics
  await trackEvent(userId, 'message_sent');
} else {
  // Don't track
}
```

### Set Consent (Frontend)

```javascript
// User accepts
localStorage.setItem('elva-consent', JSON.stringify({
  necessary: true,
  functional: true,
  analytics: true,
  timestamp: new Date().toISOString()
}));

// Send in headers
fetch('/api/respond', {
  headers: {
    'X-Elva-Consent-Analytics': 'true'
  }
});
```

---

## 🔒 Rate Limiting

### Apply to Endpoint

```javascript
import { apiLimiter, authLimiter, widgetLimiter } from '../lib/rate-limit';

// Helper
function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) return reject(result);
      return resolve(result);
    });
  });
}

// In API handler
export default async function handler(req, res) {
  // Apply rate limit
  try {
    await runMiddleware(req, res, authLimiter); // or apiLimiter or widgetLimiter
  } catch (error) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  // ... rest of handler
}
```

---

## 📦 Data Export

### Gather User Data

```javascript
// pages/api/user/export-data.js

const userId = new ObjectId(session.user.id);

const userData = {
  exportDate: new Date().toISOString(),
  user: await db.collection('users').findOne({ _id: userId }),
  organizations: await getOrganizations(userId),
  widgets: await getWidgets(userId),
  conversations: await getConversations(userId),
  analytics: await getAnalytics(userId)
};

// Remove sensitive fields
const { password, ...safeUser } = userData.user;
userData.user = safeUser;

// Return as downloadable JSON
res.setHeader('Content-Type', 'application/json');
res.setHeader('Content-Disposition', `attachment; filename="data-${userId}.json"`);
return res.json(userData);
```

---

## 🗑️ Account Deletion

### Mark for Deletion (Grace Period)

```javascript
// pages/api/user/delete-account.js

// 1. Verify password
const isValid = await verifyPassword(password, user.password);
if (!isValid) {
  return res.status(401).json({ error: 'Invalid password' });
}

// 2. Set deletion date (30 days)
const deletionDate = new Date();
deletionDate.setDate(deletionDate.getDate() + 30);

await db.collection('users').updateOne(
  { _id: userId },
  {
    $set: {
      status: 'pending_deletion',
      deletionDate: deletionDate
    }
  }
);

// 3. Send email
await sendDeletionEmail(user.email, deletionDate);
```

### Permanent Deletion (Cron Job)

```javascript
// scripts/process-account-deletions.js

const accountsToDelete = await db.collection('users').find({
  status: 'pending_deletion',
  deletionDate: { $lte: new Date() }
}).toArray();

for (const user of accountsToDelete) {
  // Cascade delete
  await db.collection('conversations').deleteMany({ userId: user._id });
  await db.collection('widgets').deleteMany({ ownerId: user._id });
  
  // Anonymize analytics
  await db.collection('analytics').updateMany(
    { userId: user._id },
    { $set: { userId: 'deleted', anonymized: true } }
  );
  
  // Delete user
  await db.collection('users').deleteOne({ _id: user._id });
}
```

---

## 🛡️ Security Best Practices

### Input Validation

```javascript
// ✅ Good
if (!email || !password || password.length < 8) {
  return res.status(400).json({ error: 'Invalid input' });
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email)) {
  return res.status(400).json({ error: 'Invalid email' });
}
```

### Sanitize Output

```javascript
// ✅ Good - Remove sensitive fields
const { password, secretToken, ...safeUser } = user;
return res.json(safeUser);

// ✅ Good - Use projection
const user = await db.collection('users').findOne(
  { _id: userId },
  { projection: { password: 0, secretToken: 0 } }
);
```

### Error Messages

```javascript
// ❌ BAD - Leaks info
if (!user) return res.json({ error: 'User not found' });
if (wrongPassword) return res.json({ error: 'Wrong password' });

// ✅ GOOD - Generic message
if (!user || wrongPassword) {
  return res.json({ error: 'Invalid credentials' });
}
```

---

## 📝 Logging Best Practices

### Safe Logging

```javascript
// ❌ BAD
console.log('User:', user); // Contains password!
console.log('Request:', req.body); // Contains password!

// ✅ GOOD
console.log('User ID:', user._id);
console.log('Request keys:', Object.keys(req.body));

// ✅ GOOD - Redact sensitive fields
const safeLog = { ...req.body };
delete safeLog.password;
delete safeLog.secretToken;
console.log('Request:', safeLog);
```

---

## 🧪 Testing Checklist

### Unit Tests

```javascript
// Password hashing
test('should hash password', async () => {
  const hash = await hashPassword('test123');
  expect(hash).not.toBe('test123');
  expect(hash).toMatch(/^\$2[aby]\$/);
});

// IP anonymization
test('should anonymize IPv4', () => {
  expect(anonymizeIP('192.168.1.100')).toBe('192.168.1.0');
});

// Consent
test('should respect consent', () => {
  expect(hasConsent('analytics')).toBe(false); // No consent
});
```

### Integration Tests

```javascript
// Data export
test('user can export data', async () => {
  const response = await fetch('/api/user/export-data', {
    headers: { Cookie: sessionCookie }
  });
  
  expect(response.status).toBe(200);
  const data = await response.json();
  expect(data.user).toBeDefined();
  expect(data.user.password).toBeUndefined(); // Excluded!
});
```

---

## 🚀 Common Commands

### Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Run tests
npm test

# Run specific test
npm test password.test.js
```

### Migrations

```bash
# Migrate passwords
node scripts/migrate-passwords-to-bcrypt.js --confirm

# Anonymize IPs
node scripts/anonymize-existing-ips.js --confirm

# Process deletions (manual)
node scripts/process-account-deletions.js
```

### Deployment

```bash
# Deploy to staging
vercel --prod --scope=staging

# Deploy to production
vercel --prod

# View logs
vercel logs --follow
```

---

## 🐛 Common Errors & Fixes

### Error: "Cannot find module 'bcryptjs'"

```bash
# Fix
npm install bcryptjs
```

### Error: "Rate limit exceeded"

```javascript
// Check rate limiter config
// Default: 100 requests per 15 minutes

// Increase if needed
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200 // Increased
});
```

### Error: "IP anonymization fails"

```javascript
// Check IP format
console.log('Raw IP:', req.headers['x-forwarded-for']);

// Might be IPv6
if (ip.includes(':')) {
  // Use IPv6 anonymization
}
```

---

## 📋 Pre-Commit Checklist

Before you commit GDPR-related code:

- [ ] No plain-text passwords
- [ ] IPs anonymized or removed
- [ ] Consent checked before tracking
- [ ] Sensitive fields excluded from API responses
- [ ] Input validation added
- [ ] Tests written and passing
- [ ] Logged actions don't contain sensitive data
- [ ] Error messages are generic
- [ ] Code reviewed by senior dev

---

## 🆘 When In Doubt

1. **Check the docs:** [GDPR_IMPLEMENTERING.md](./GDPR_IMPLEMENTERING.md)
2. **Ask in Slack:** #gdpr-compliance channel
3. **Ping Tech Lead:** [EMAIL]
4. **NEVER guess on security:** Always ask!

---

## 🎯 GDPR Principles (Remember)

1. **Lawfulness** - Always have legal basis (consent/contract)
2. **Purpose Limitation** - Only collect what you need
3. **Data Minimization** - Collect minimal data
4. **Accuracy** - Keep data up to date
5. **Storage Limitation** - Don't keep data forever (30 days)
6. **Integrity** - Keep data secure (hash passwords!)
7. **Accountability** - Document everything

---

## 📞 Emergency Contacts

**Data Breach?**
1. Contact Tech Lead immediately
2. Contact CEO
3. Document everything
4. Follow breach response plan

**Tech Lead:** [EMAIL] | [PHONE]  
**Security Team:** [EMAIL]  
**Legal:** [EMAIL]  

**Datatilsynet:** dt@datatilsynet.dk | +45 33 19 32 00  
(Must report within 72 hours if high risk)

---

**Version:** 1.0  
**Last Updated:** 13. oktober 2025

**Print denne side! 📌 Hav den ved din skærm mens du koder.**

---

**Fuld dokumentation:**
- [GDPR Analyse](./GDPR_ANALYSE.md) - Juridisk deep dive
- [Handlingsplan](./GDPR_HANDLINGSPLAN.md) - Sprint plan
- [Implementering](./GDPR_IMPLEMENTERING.md) - Code guide
- [Start Her](./GDPR_START_HER.md) - Projekt overview

🚀 **Held og lykke med kodningen!**

