> ⚠️ **Historical / pre-migration document.** As of June 2026 the platform runs on **Supabase** (Postgres + Auth + Storage); MongoDB, NextAuth, and Cloudinary have been removed, along with their setup scripts and npm commands. Steps, env vars, and commands below that reference those services are outdated — see `WARP.md` / `CLAUDE.md` for the current setup.

# 🔒 GDPR-analyse af Elva Agents Platform

## 📋 Executive Summary

Denne analyse vurderer Elva Agents platformens overholdelse af EU's Databeskyttelsesforordning (GDPR). Platformen håndterer persondata fra både platformbrugere (administratorer) og slutbrugere (widget-besøgende), hvilket kræver nøje overholdelse af GDPR.

**Overordnet status:** ⚠️ **MODERAT RISIKO** - Flere kritiske områder kræver forbedring for fuld GDPR-compliance.

---

## 📊 1. Oversigt over Dataindsamling

### 1.1 Persondata der Behandles

#### **A. Platformbrugere (Administratorer)**

| Datatype | Formål | Retligt Grundlag | Database Collection |
|----------|--------|------------------|---------------------|
| Email | Identifikation, login, kommunikation | Kontraktuel forpligtelse | `users` |
| Navn | Identifikation, display | Kontraktuel forpligtelse | `users` |
| Password (ukrypteret ⚠️) | Autentifikation | Kontraktuel forpligtelse | `users` |
| Profilbillede | Display | Samtykke | `users` |
| Login tidspunkt | Sikkerhed, audit | Legitim interesse | `users` |
| Præferencer | Personalisering | Kontraktuel forpligtelse | `users.preferences` |
| Organisation tilknytning | Multi-tenancy | Kontraktuel forpligtelse | `team_members` |
| IP adresse (implicit) | Audit logs | Legitim interesse | Ikke gemt systematisk ⚠️ |

#### **B. Slutbrugere (Widget-besøgende)**

| Datatype | Formål | Retligt Grundlag | Database Collection |
|----------|--------|------------------|---------------------|
| UserId (anonym) | Konversationshistorik | Legitim interesse | `conversations` |
| IP adresse | Geolocation, fraud prevention | Legitim interesse | `conversations.metadata.ip` |
| User Agent | Browser support | Legitim interesse | `conversations.metadata.userAgent` |
| Beskedindhold | AI chat funktionalitet | Kontraktuel forpligtelse | `conversations.messages` |
| Samtale metadata | Analytics | Legitim interesse | `conversations.metadata` |
| Tilfredshedsvurdering | Service forbedring | Samtykke | `conversations.satisfaction` |
| Manuel review data ⚠️ | Support | Samtykke | `manual_reviews` |
| - Navn | Kontakt | Samtykke | `manual_reviews.contactInfo.name` |
| - Email | Kontakt | Samtykke | `manual_reviews.contactInfo.email` |
| - Besked | Support context | Samtykke | `manual_reviews.message` |

#### **C. Data Delt med Tredjeparter**

| Tredjepart | Data | Formål | Juridisk Grund |
|------------|------|--------|----------------|
| **OpenAI** | Beskedindhold, konversationshistorik | AI-processing | Data Processing Agreement ⚠️ (mangler dokumentation) |
| **MongoDB Atlas** | Alle ovenstående data | Database hosting | Data Processing Agreement ✅ |
| **Vercel** | Request logs, performance data | Hosting | Data Processing Agreement ✅ |
| **Resend** | Email, navn | Email notifikationer | Data Processing Agreement ⚠️ (mangler dokumentation) |
| **Cloudinary** | Uploaded billeder | CDN | Data Processing Agreement ⚠️ (mangler dokumentation) |

---

## 🚨 2. Kritiske GDPR Problemer

### 2.1 HØJESTE PRIORITET ⚠️⚠️⚠️

#### **Problem 1: Passwords Opbevares i Klartekst**
```javascript
// pages/api/auth/[...nextauth].js:41
if (user.password !== credentials.password) {
  return null
}
```

**Risiko:** KRITISK GDPR-overtrædelse
- Artikel 32: Sikkerhed ved behandling
- Artikel 5(1)(f): Integritet og fortrolighed

**Løsning:**
```javascript
import bcrypt from 'bcryptjs';

// Ved oprettelse
const hashedPassword = await bcrypt.hash(password, 10);

// Ved login
const isValid = await bcrypt.compare(credentials.password, user.password);
```

**Estimeret tid:** 2-4 timer + migration script
**Compliance impact:** KRITISK

---

#### **Problem 2: Ingen Cookie Banner / Samtykke Management**

**Risiko:** HØJT GDPR-overtrædelse
- Artikel 6: Lovligt grundlag
- Artikel 7: Samtykke betingelser
- ePrivacy Directive (Cookie-loven)

**Nuværende situation:**
- Widget tracker IP-adresser uden samtykke
- Bruger-ID gemmes i localStorage uden information
- Ingen opt-out mulighed
- Ingen cookie banner

**Påkrævet:**
```javascript
// Widget skal have samtykke-mekanisme
const ElvaConsentManager = {
  // Vis banner første gang
  showConsentBanner: () => {},
  
  // Track efter samtykke
  trackWithConsent: (consent) => {
    if (consent.analytics) {
      // Track IP, user agent etc.
    }
    if (consent.functional) {
      // Gem userId i localStorage
    }
  },
  
  // Respekter Do Not Track
  respectDNT: () => {}
};
```

**Estimeret tid:** 1-2 uger
**Compliance impact:** KRITISK

---

#### **Problem 3: Manglende Data Processing Agreements (DPA)**

**Risiko:** HØJT GDPR-overtrædelse
- Artikel 28: Databehandler
- Artikel 44-50: Overførsel til tredjelande

**Påkrævet dokumentation:**
- ✅ MongoDB Atlas (har DPA)
- ✅ Vercel (har DPA)
- ⚠️ **OpenAI** - Mangler dokumenteret DPA
- ⚠️ **Resend** - Mangler dokumenteret DPA
- ⚠️ **Cloudinary** - Mangler dokumenteret DPA

**Action items:**
1. Underskrive DPA med OpenAI
2. Underskrive DPA med Resend
3. Underskrive DPA med Cloudinary
4. Dokumentere Standard Contractual Clauses (SCC) for US-transfers

**Estimeret tid:** 2-3 uger (juridisk process)
**Compliance impact:** KRITISK

---

### 2.2 HØJ PRIORITET ⚠️⚠️

#### **Problem 4: Ingen Data Export Funktionalitet**

**Risiko:** HØJT - GDPR Artikel 20 overtrædelse
- Artikel 20: Ret til dataportabilitet
- Artikel 15: Ret til indsigt

**Nuværende situation:**
```javascript
// Ingen API endpoints for data export
// Ingen bruger-interface for data download
```

**Påkrævet løsning:**
```javascript
// pages/api/user/export-data.js
export default async function handler(req, res) {
  const userId = req.user.id;
  
  // Samle alle brugerdata
  const userData = {
    profile: await getUser(userId),
    organizations: await getUserOrgs(userId),
    widgets: await getUserWidgets(userId),
    conversations: await getUserConversations(userId),
    analytics: await getUserAnalytics(userId)
  };
  
  // Return som JSON eller CSV
  res.json(userData);
}
```

**UI påkrævet:**
- "Download Mine Data" knap i profil
- Email med download link
- Automatisk sletning af eksport fil efter 7 dage

**Estimeret tid:** 1 uge
**Compliance impact:** HØJT

---

#### **Problem 5: Ingen Data Deletion Funktionalitet**

**Risiko:** HØJT - GDPR Artikel 17 overtrædelse
- Artikel 17: Ret til sletning ("retten til at blive glemt")

**Nuværende situation:**
```javascript
// Soft delete for organizations
await db.collection('organizations').updateOne(
  { _id: orgId },
  { $set: { deletedAt: new Date() } }
);

// Men ingen mulighed for bruger at slette egen konto
// Ingen cascade delete for relateret data
```

**Påkrævet løsning:**
```javascript
// pages/api/user/delete-account.js
export default async function handler(req, res) {
  const userId = req.user.id;
  
  // Delete user data cascade
  await deleteUserAccount(userId, {
    deleteConversations: true,
    deleteWidgets: true,
    anonymizeAnalytics: true, // Behold aggregated data
    notifyOrganizations: true
  });
  
  // Log deletion for audit
  await auditLog.record('user_account_deleted', userId);
  
  // Send bekræftelses email
  await sendAccountDeletionConfirmation(user.email);
}
```

**UI påkrævet:**
- "Slet Min Konto" i indstillinger
- 2-faktor bekræftelse
- Grace period (30 dage før permanent sletning)

**Estimeret tid:** 1-2 uger
**Compliance impact:** HØJT

---

#### **Problem 6: TTL på 30 Dage er Ikke Konfigurerbar**

**Risiko:** MEDIUM - GDPR Artikel 5(1)(e) overtrædelse
- Artikel 5(1)(e): Opbevaringsminimering

**Nuværende situation:**
```javascript
// scripts/init-db.js:91-94
await conversationsCollection.createIndex(
  { "createdAt": 1 }, 
  { expireAfterSeconds: 30 * 24 * 60 * 60 } // Hardcoded 30 days
);
```

**Problem:**
- Ikke alle widgetejere har brug for 30 dage
- Ingen måde at konfigurere per widget/organisation
- GDPR kræver minimum nødvendig opbevaringstid

**Løsning:**
```javascript
// Widget configuration
{
  "dataRetention": {
    "conversationDays": 30, // Konfigurerbar
    "anonymizeAfterDays": 90, // Behold anonymized for analytics
    "hardDeleteAfterDays": 365
  }
}

// Implement scheduled job
async function applyDataRetentionPolicies() {
  const widgets = await db.collection('widgets').find({});
  
  for (const widget of widgets) {
    const retentionDays = widget.dataRetention?.conversationDays || 30;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    
    await db.collection('conversations').deleteMany({
      widgetId: widget._id,
      createdAt: { $lt: cutoffDate }
    });
  }
}
```

**Estimeret tid:** 1 uge
**Compliance impact:** MEDIUM

---

### 2.3 MEDIUM PRIORITET ⚠️

#### **Problem 7: IP-adresser Logges Uden Samtykke**

**Risiko:** MEDIUM - GDPR Artikel 6 og ePrivacy overtrædelse

**Nuværende situation:**
```javascript
// pages/api/respond-responses.js:110
metadata: {
  userAgent: req.headers['user-agent'] || '',
  ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress || '',
  country: null,
  referrer: null
}
```

**Problem:**
- IP-adresser er persondata under GDPR
- Logges automatisk uden bruger samtykke
- Ingen anonymisering

**Løsning:**
```javascript
// Kun log hvis bruger har givet samtykke
if (userConsent.analytics) {
  metadata.ip = anonymizeIP(req.headers['x-forwarded-for']);
  metadata.country = getCountryFromIP(metadata.ip); // Kun land, ikke præcis IP
}

function anonymizeIP(ip) {
  // IPv4: 192.168.1.1 -> 192.168.1.0
  // IPv6: 2001:0db8:85a3::8a2e:0370:7334 -> 2001:0db8:85a3::
  return ip.split('.').slice(0, 3).join('.') + '.0';
}
```

**Estimeret tid:** 3-5 dage
**Compliance impact:** MEDIUM

---

#### **Problem 8: Manglende Privacy Policy & Terms**

**Risiko:** MEDIUM - GDPR Artikel 13 & 14 overtrædelse
- Artikel 13: Information ved indsamling
- Artikel 14: Information når data ikke indsamles fra den registrerede

**Nuværende situation:**
```bash
# Ingen privacy policy fundet
$ grep -r "privacy" docs/
# Ingen resultater

$ grep -r "terms" pages/
# Ingen resultater
```

**Påkrævet dokumentation:**

1. **Privacy Policy** skal indeholde:
   - Dataansvarlig (Data Controller) - Elva Solutions
   - Databehandlere (Data Processors) - OpenAI, MongoDB, Vercel, Resend
   - Hvilke data indsamles
   - Formål med databehandling
   - Retligt grundlag for behandling
   - Opbevaringsperioder
   - Brugerrettigheder (GDPR Artikel 15-22)
   - Kontaktinformation til DPO (hvis påkrævet)
   - Klagerettigheder til Datatilsynet

2. **Cookie Policy**
   - LocalStorage brug (userId)
   - Session cookies
   - Analytics cookies (hvis implementeret)

3. **Terms of Service**
   - Ansvar for widget-indhold
   - SLA for datatilgængelighed
   - Opsigelsesvilkår

**Estimeret tid:** 1-2 uger (juridisk konsultation påkrævet)
**Compliance impact:** MEDIUM-HØJ

---

#### **Problem 9: Ingen Data Breach Notification Procedure**

**Risiko:** MEDIUM - GDPR Artikel 33 & 34 overtrædelse
- Artikel 33: Anmeldelse til tilsynsmyndighed (72 timer)
- Artikel 34: Information til registrerede

**Nuværende situation:**
- Ingen dokumenteret procedure for data breach
- Ingen incident response plan
- Ingen notification templates

**Påkrævet:**
```markdown
# Data Breach Response Plan

## 1. Detection & Assessment (0-24 hours)
- Identify breach scope
- Assess risk to data subjects
- Document timeline

## 2. Containment (24-48 hours)
- Stop data leak
- Secure systems
- Preserve evidence

## 3. Notification (48-72 hours)
- Notify Datatilsynet if high risk
- Notify affected users if high risk to rights
- Template emails ready

## 4. Remediation
- Fix vulnerability
- Update security measures
- Post-mortem report
```

**Estimeret tid:** 1 uge (dokumentation + procedures)
**Compliance impact:** MEDIUM

---

## ✅ 3. Positive GDPR Aspekter

### 3.1 Styrker i Nuværende Implementation

#### ✅ **Data Minimering (Delvist)**
```javascript
// Anonym bruger ID i stedet for navn/email
userId: "user_a1b2c3d4e5f6" // Godt!

// Dokumentation angiver:
"Kun anonyme user IDs gemmes - ingen personlige data"
```

#### ✅ **Automatisk Data Retention**
```javascript
// TTL index for automatisk sletning efter 30 dage
await conversationsCollection.createIndex(
  { "createdAt": 1 }, 
  { expireAfterSeconds: 30 * 24 * 60 * 60 }
);
```

#### ✅ **Multi-Tenancy & Data Isolation**
```javascript
// Organisationer har isolerede data
{
  "organizationId": "org_123",
  "widgets": [...] // Kun tilgængelige for organisation
}

// Proper access control
const hasAccess = await checkOrganizationAccess(userId, widgetId);
```

#### ✅ **Soft Delete for Organizations**
```javascript
// Mulighed for genoprettelse i grace period
{
  "deletedAt": "2024-01-15T10:00:00Z",
  "status": "deleted"
}
```

#### ✅ **Session Timeout**
```javascript
// NextAuth session udløber efter 24 timer
session: {
  strategy: 'jwt',
  maxAge: 24 * 60 * 60, // 24 hours
}
```

#### ✅ **MongoDB Connection Security**
```javascript
// TLS/SSL encryption for data in transit
{
  tls: true,
  ssl: true,
  authMechanism: 'SCRAM-SHA-1'
}
```

---

## 📝 4. GDPR Rettigheder Implementation Status

| Rettighed | GDPR Artikel | Status | Implementation |
|-----------|--------------|--------|----------------|
| **Ret til indsigt** | Art. 15 | ❌ Mangler | Ingen API/UI for at se egne data |
| **Ret til berigtigelse** | Art. 16 | ⚠️ Delvist | Kun profil kan redigeres, ikke historik |
| **Ret til sletning** | Art. 17 | ❌ Mangler | Ingen "slet konto" funktion |
| **Ret til begrænsning** | Art. 18 | ❌ Mangler | Ingen pause/begræns funktion |
| **Ret til dataportabilitet** | Art. 20 | ❌ Mangler | Ingen data export |
| **Ret til indsigelse** | Art. 21 | ❌ Mangler | Ingen opt-out for marketing/profiling |
| **Ret til ikke at være genstand for automatiserede afgørelser** | Art. 22 | ✅ N/A | Ingen automatiserede afgørelser med juridisk effekt |

---

## 🔐 5. Sikkerhedsmæssige Tiltag

### 5.1 Eksisterende Sikkerhed

#### ✅ God Praksis:
```javascript
// 1. CORS headers konfigureret
res.setHeader('Access-Control-Allow-Origin', '*');
res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

// 2. Input validation
if (!email || !name || !password) {
  return res.status(400).json({ error: 'Required fields missing' });
}

// 3. MongoDB injection protection (via MongoDB driver)
const user = await db.collection('users').findOne({
  email: email.toLowerCase() // Sanitized
});

// 4. Authentication middleware
export function withAuth(handler) {
  return async (req, res) => {
    const token = await getToken({ req });
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    return handler(req, res);
  }
}

// 5. Role-based access control
if (token.platformRole !== 'platform_admin') {
  return res.status(403).json({ error: 'Admin access required' });
}
```

### 5.2 Sikkerhedsmangler

#### ⚠️ Kritiske Mangler:

1. **Passwords i Klartekst** (allerede nævnt)
2. **Ingen Rate Limiting**
   ```javascript
   // Påkrævet: Express rate limiting
   import rateLimit from 'express-rate-limit';
   
   const limiter = rateLimit({
     windowMs: 15 * 60 * 1000, // 15 minutes
     max: 100 // limit each IP to 100 requests per windowMs
   });
   ```

3. **Ingen CSRF Protection**
   ```javascript
   // NextAuth har CSRF protection, men custom API routes mangler det
   ```

4. **Ingen Content Security Policy**
   ```javascript
   // Missing in _document.js
   <meta httpEquiv="Content-Security-Policy" content="...">
   ```

5. **Environment Variables Exposed i Development**
   ```javascript
   // .env.local kan indeholde production secrets
   // Bør have separate .env.development og .env.production
   ```

---

## 🌍 6. International Data Transfer

### 6.1 Tredjelandsoverførsler

| Service | Location | Transfer Mechanism | Status |
|---------|----------|-------------------|--------|
| **OpenAI** | USA | ⚠️ Ukendt | Kræver Standard Contractual Clauses (SCC) |
| **MongoDB Atlas** | Konfigurerbar (EU) | ✅ DPA + SCC | OK hvis hostet i EU region |
| **Vercel** | Global (primært USA) | ✅ DPA + SCC | OK med framework agreement |
| **Resend** | USA | ⚠️ Ukendt | Kræver verification |
| **Cloudinary** | Global | ⚠️ Ukendt | Kræver verification |

### 6.2 Anbefaling

**Prioriter EU Data Residency:**
```javascript
// MongoDB Atlas
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster-eu-west-1.mongodb.net/

// Vercel
// Deploy til EU region via vercel.json
{
  "regions": ["fra1"] // Frankfurt
}

// Alternative til US-baserede services
// - Resend -> Amazon SES (EU region)
// - Cloudinary -> Imagekit.io (EU)
```

---

## 📋 7. Compliance Checklist

### Juridisk & Governance

- [ ] **Udpeg Data Controller** (Dataansvarlig) - CVR, adresse, kontakt
- [ ] **Vurder behov for DPO** (Databeskyttelsesrådgiver)
  - Påkrævet hvis:
    - Offentlig myndighed
    - Omfattende systematisk overvågning
    - Omfattende behandling af sensitive data
- [ ] **Udarbejd Privacy Policy** (Privatlivspolitik)
- [ ] **Udarbejd Cookie Policy**
- [ ] **Udarbejd Terms of Service**
- [ ] **Opret GDPR Records of Processing Activities** (Artikel 30)
- [ ] **Underskrive DPA med alle databehandlere**
  - [ ] OpenAI
  - [ ] Resend
  - [ ] Cloudinary
  - [ ] Verificér MongoDB Atlas DPA
  - [ ] Verificér Vercel DPA
- [ ] **Data Protection Impact Assessment (DPIA)** hvis højrisiko behandling

### Teknisk Implementation

#### Kritisk (Uge 1-2)
- [ ] **Implementer bcrypt password hashing**
- [ ] **Tilføj samtykke banner til widget**
- [ ] **Anonymiser IP-adresser**
- [ ] **Implementer rate limiting**
- [ ] **Tilføj CSRF protection**

#### Høj Prioritet (Uge 3-4)
- [ ] **Data export funktionalitet**
- [ ] **Account deletion funktionalitet**
- [ ] **Privacy Policy & Terms pages**
- [ ] **Email verification for nye brugere**
- [ ] **2FA option for admins**

#### Medium Prioritet (Uge 5-8)
- [ ] **Konfigurerbar data retention per widget**
- [ ] **Data breach response plan**
- [ ] **Audit logging system**
- [ ] **Consent management UI**
- [ ] **Anonymization for analytics (efter deletion)**

#### Compliance & Monitoring (Løbende)
- [ ] **Quarterly GDPR compliance review**
- [ ] **Security audit**
- [ ] **Update Records of Processing Activities**
- [ ] **Employee GDPR training**
- [ ] **Vendor DPA review**

---

## 🎯 8. Handlingsplan & Tidslinje

### Fase 1: Kritiske Sikkerhedsforbedringer (Uge 1-2)

**Uge 1:**
1. ✅ Password hashing implementation (2 dage)
2. ✅ Migration script for existing passwords (1 dag)
3. ✅ Rate limiting (1 dag)
4. ✅ CSRF protection (1 dag)

**Uge 2:**
5. ✅ IP anonymization (1 dag)
6. ✅ Samtykke banner POC (2 dage)
7. ✅ Environment security review (1 dag)
8. ✅ Security testing (1 dag)

**Leverance:** Kritiske sikkerhedshuller lukket

---

### Fase 2: GDPR Brugerrettigheder (Uge 3-4)

**Uge 3:**
1. ✅ Data export API (2 dage)
2. ✅ Data export UI (1 dag)
3. ✅ Account deletion API (2 dage)

**Uge 4:**
4. ✅ Account deletion UI med grace period (1 dag)
5. ✅ Email notifications for deletion (1 dag)
6. ✅ Testing af export/deletion (2 dage)

**Leverance:** Artikel 15, 17, 20 compliance

---

### Fase 3: Juridisk Dokumentation (Uge 5-6)

**Uge 5:**
1. ✅ Privacy Policy udkast (juridisk konsultation)
2. ✅ Cookie Policy
3. ✅ Terms of Service udkast

**Uge 6:**
4. ✅ Records of Processing Activities (Artikel 30)
5. ✅ DPIA hvis påkrævet
6. ✅ Publicering af policies på website

**Leverance:** Artikel 13-14 compliance

---

### Fase 4: Data Processing Agreements (Uge 7-8)

**Parallel med udvikling:**
1. ✅ OpenAI DPA
2. ✅ Resend DPA eller migration til EU alternativ
3. ✅ Cloudinary DPA eller migration til EU alternativ
4. ✅ Dokumentation af SCC for US transfers

**Leverance:** Artikel 28 compliance

---

### Fase 5: Advanced Compliance (Uge 9-12)

**Uge 9-10:**
1. ✅ Konfigurerbar data retention (1 uge)
2. ✅ Audit logging system (1 uge)

**Uge 11-12:**
3. ✅ Data breach response plan (3 dage)
4. ✅ Consent management system (1 uge)
5. ✅ Comprehensive testing (2 dage)

**Leverance:** Full GDPR compliance

---

## 💰 9. Omkostningsestimering

### Udvikling

| Opgave | Timer | Rate (DKK) | Total (DKK) |
|--------|-------|------------|-------------|
| Password security | 16 | 800 | 12.800 |
| Data export/deletion | 40 | 800 | 32.000 |
| Samtykke system | 80 | 800 | 64.000 |
| Data retention config | 40 | 800 | 32.000 |
| Audit & logging | 40 | 800 | 32.000 |
| Testing & QA | 40 | 800 | 32.000 |
| **Total udvikling** | **256** | | **204.800** |

### Juridisk

| Opgave | Estimat (DKK) |
|--------|---------------|
| Privacy Policy udarbejdelse | 15.000 - 30.000 |
| Terms of Service | 10.000 - 20.000 |
| GDPR konsultation | 20.000 - 40.000 |
| DPA forhandling | 5.000 - 15.000 |
| DPIA assistance | 10.000 - 25.000 |
| **Total juridisk** | **60.000 - 130.000** |

### Tredjepartstjenester

| Service | Årlig Omkostning (DKK) |
|---------|-------------------------|
| DPO konsulent (hvis påkrævet) | 50.000 - 150.000 |
| Compliance monitoring tool | 10.000 - 30.000 |
| Security audit | 30.000 - 80.000 |
| **Total løbende** | **90.000 - 260.000** |

### **Total Estimat:**
- **Første år:** 350.000 - 600.000 DKK
- **Løbende årligt:** 90.000 - 260.000 DKK

---

## ⚖️ 10. Risiko for Sanktioner

### GDPR Bødestørrelse

**Artikel 83 - Administrative sanktioner:**

**Tier 1** (op til 10 mio EUR eller 2% af global omsætning):
- Artikel 8, 11, 25-39, 42, 43 overtrædelser
- Databehandler forpligtelser

**Tier 2** (op til 20 mio EUR eller 4% af global omsætning):
- ⚠️ Artikel 5 (principper) - **Passwords i klartekst**
- ⚠️ Artikel 6 (lovligt grundlag) - **Ingen samtykke**
- ⚠️ Artikel 13-14 (information) - **Ingen privacy policy**
- ⚠️ Artikel 15-22 (rettigheder) - **Ingen data export/deletion**
- ⚠️ Artikel 32 (sikkerhed) - **Passwords i klartekst**

### Nuværende Risikovurdering

**Hvis Datatilsynet inspicerer nu:**

| Overtrædelse | Artikel | Sandsynlig Sanktion | Estimat |
|--------------|---------|---------------------|---------|
| Passwords klartekst | Art. 32 | Tier 2 | 50.000 - 500.000 DKK |
| Ingen samtykke | Art. 6 | Tier 2 | 25.000 - 250.000 DKK |
| Ingen privacy policy | Art. 13-14 | Tier 1 | 10.000 - 100.000 DKK |
| Ingen data export | Art. 15, 20 | Tier 2 | 25.000 - 200.000 DKK |
| Ingen deletion | Art. 17 | Tier 2 | 25.000 - 200.000 DKK |
| Manglende DPA | Art. 28 | Tier 1 | 10.000 - 100.000 DKK |

**Total potentiel risiko:** 145.000 - 1.350.000 DKK

### Sanktionssandsynlighed

- **Klage fra bruger:** 60% sandsynlighed for inspektion
- **Data breach:** 90% sandsynlighed for inspektion + obligatorisk 72t anmeldelse
- **Random audit:** 5% sandsynlighed (lavere for små virksomheder)

### Risikoreducering

**Efter Fase 1-2 (8 uger):** Risiko reduceret med 70%
**Efter Fase 3-4 (12 uger):** Risiko reduceret med 90%
**Efter Fase 5 (16 uger):** Fuld compliance, minimal risiko

---

## 📞 11. Kontakt & Governance

### Nuværende Status

- **Data Controller:** Elva Solutions (antaget)
- **Registreret hos Datatilsynet:** ❌ Ukendt
- **DPO udpeget:** ❌ Nej
- **GDPR ansvarlig:** ❌ Ukendt

### Anbefalinger

**For små/mellemstore virksomheder:**
```
Data Controller: Elva Solutions ApS
CVR: [INDSÆT]
Adresse: [INDSÆT]

GDPR Kontakt:
Email: privacy@elva-solutions.com
Telefon: [INDSÆT]

DPO (hvis påkrævet): [Ekstern konsulent]
```

**Skal tilføjes til:**
- Footer på alle sider
- Privacy Policy
- Widget (link til privacy policy)
- Email templates

---

## 📚 12. Ressourcer & Dokumentation

### Danske Ressourcer

- **Datatilsynet:** https://www.datatilsynet.dk/
  - GDPR guides
  - Templates til privatlivspolitik
  - Vejledning til små virksomheder

- **GDPR Portal:** https://gdprportal.dk/
  - Gratis compliance værktøjer
  - Risk assessments

### Implementation Templates

**Privacy Policy Template (dansk):**
```markdown
# Privatlivspolitik for Elva Solutions

## 1. Hvem er vi?
Elva Solutions ApS, CVR [...], er dataansvarlig...

## 2. Hvilke personoplysninger indsamler vi?
Vi behandler følgende kategorier af personoplysninger:
- [Liste fra sektion 1.1]

## 3. Hvorfor behandler vi dine oplysninger?
Formål: [For hver datatype]
Retsgrundlag: [Kontraktuel/Samtykke/Legitim interesse]

## 4. Hvor hentes oplysningerne fra?
- Direkte fra dig (registrering)
- Automatisk (widget brug)
- Fra tredjeparter [ingen]

## 5. Videregivelse af oplysninger
Vi videregiver oplysninger til:
- OpenAI (AI processing)
- MongoDB Atlas (database)
- [Osv. fra sektion 1.1]

## 6. Hvor længe opbevares oplysninger?
- Samtaler: [30 dage / konfigurerbart]
- Kontodata: Indtil sletning
- Analytics: Anonymiseret uden tidsbegrænsning

## 7. Dine rettigheder
Du har ret til:
- Indsigt i dine oplysninger
- At få rettet forkerte oplysninger
- At få slettet dine oplysninger
- At få begrænset behandlingen
- Dataportabilitet
- At gøre indsigelse
- At trække samtykke tilbage

Udøv dine rettigheder ved at kontakte: privacy@elva-solutions.com

## 8. Klage til Datatilsynet
Du har ret til at indgive klage til Datatilsynet:
https://www.datatilsynet.dk/
```

---

## ✅ 13. Konklusion & Anbefalinger

### Overordnet Vurdering

**Nuværende Status:** ⚠️ **MODERAT-HØJ RISIKO**

Elva Agents platformen har en fornuftig grundarkitektur med god data isolation og automatisk retention, men mangler kritiske GDPR compliance elementer, særligt:

1. **Sikkerhed:** Passwords i klartekst er uacceptabelt
2. **Samtykke:** Ingen mekanisme for bruger samtykke
3. **Rettigheder:** Ingen implementation af bruger rettigheder
4. **Dokumentation:** Manglende juridiske dokumenter

### Prioriteret Anbefaling

**KRITISK (Start i morgen):**
1. Implementer bcrypt password hashing
2. Stop logging af ikke-anonymiserede IP-adresser
3. Tilføj midlertidig disclaimer om data behandling

**HØJ PRIORITET (Næste 2 måneder):**
4. Implementer data export og deletion
5. Opret privacy policy og terms
6. Implementer samtykke system
7. Sikr DPA'er med alle vendors

**MEDIUM PRIORITET (3-6 måneder):**
8. Advanced consent management
9. Konfigurerbar data retention
10. Audit logging system
11. Security audit

### ROI på GDPR Compliance

**Investering:** 350.000 - 600.000 DKK første år
**Potentiel besparing:**
- Undgå bøder: 145.000 - 1.350.000 DKK
- Undgå reputationsskade: Uoverskueligt
- Competitive advantage: EU clients kræver GDPR compliance
- Trust & brand value: +++

**Anbefaling:** Prioriter compliance højt. Det er ikke kun et juridisk krav, men også en konkurrencefordel.

---

## 📝 Appendiks A: Code Review Highlights

### Kritiske Sikkerhedsproblemer i Koden

```javascript
// ❌ PROBLEM: pages/api/auth/[...nextauth].js
if (user.password !== credentials.password) {
  return null
}
// Bør være: await bcrypt.compare(credentials.password, user.password)

// ❌ PROBLEM: pages/api/auth/register.js:65
password, // In production, this should be hashed!
// Kommentaren er der, men ikke implemented

// ❌ PROBLEM: pages/api/respond-responses.js:110
ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress || '',
// Bør anonymiseres eller kun gemmes med samtykke

// ❌ PROBLEM: scripts/init-db.js:93
expireAfterSeconds: 30 * 24 * 60 * 60 // Hardcoded
// Bør være konfigurerbar per widget
```

---

## 📝 Appendiks B: Compliance Self-Assessment

**Gennemført:** Oktober 2025
**Næste review:** Januar 2026 (anbefalet kvartalsvis)

| GDPR Område | Score (0-10) | Noter |
|-------------|--------------|-------|
| Lovligt grundlag (Art. 6) | 4/10 | Mangler samtykke, men har kontraktuel |
| Transparency (Art. 13-14) | 2/10 | Ingen privacy policy |
| Data subject rights (Art. 15-22) | 1/10 | Næsten ingen implementation |
| Security (Art. 32) | 3/10 | Passwords issue kritisk |
| Data breach (Art. 33-34) | 2/10 | Ingen procedure |
| DPO (Art. 37-39) | 5/10 | Måske ikke påkrævet |
| International transfers (Art. 44-50) | 4/10 | DPA'er mangler |
| **Samlet score** | **3.0/10** | ⚠️ Kritisk forbedring påkrævet |

---

**Dokument version:** 1.0  
**Dato:** Oktober 13, 2025  
**Forfatter:** AI GDPR Analyse  
**Status:** DRAFT - Kræver juridisk review

---

**Ansvarsfraskrivelse:** Denne analyse er til informationsformål og udgør ikke juridisk rådgivning. Konsulter en kvalificeret GDPR-advokat før implementation af ændringer.

