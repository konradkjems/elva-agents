# 🚀 GDPR Implementation Deployment Guide

**Status:** ✅ KLAR TIL TEST OG DEPLOYMENT  
**Completion:** 60% (Sprint 1-4)  
**Dato:** 13. oktober 2025

---

## 📦 Hvad Er Implementeret

### ✅ Sprint 1-3: Core GDPR Features (KOMPLET)

**Sikkerhed:**
- ✅ bcrypt password hashing
- ✅ IP anonymisering (kun land gemmes)
- ✅ Rate limiting på alle endpoints

**Brugerrettigheder:**
- ✅ Data export (GDPR Artikel 15 & 20)
- ✅ Account deletion (GDPR Artikel 17)
- ✅ 30-dages grace period

**Samtykke:**
- ✅ Cookie consent banner i widget
- ✅ Backend respekterer samtykke
- ✅ Analytics kun med tilladelse

**UI/UX:**
- ✅ GDPR sektion i profil
- ✅ Legal pages (Privacy, Terms, Cookies)
- ✅ Footer med alle links

---

## 🚀 Deployment Steps

### Step 1: Test i Development (30 minutter)

```bash
# Start development server
npm run dev
```

**Test Checklist:**

1. **Autentifikation:**
   - [ ] Opret ny bruger → Password bliver hashed
   - [ ] Log ind → Bcrypt verification virker
   - [ ] Log ud og ind igen → Virker stadig

2. **Data Export:**
   - [ ] Gå til /admin/profile#gdpr
   - [ ] Klik "Download Mine Data"
   - [ ] JSON fil downloades
   - [ ] Åbn filen → Alle data er der, ingen password

3. **Account Deletion:**
   - [ ] Klik "Slet Min Konto"
   - [ ] Dialog vises med warning
   - [ ] Indtast password
   - [ ] Bekræft → Konto markeres til sletning
   - [ ] Logger ud automatisk

4. **Cookie Banner:**
   - [ ] Åbn en test HTML med widget
   - [ ] Cookie banner vises
   - [ ] Accepter/afvis forskellige kombinationer
   - [ ] localStorage opdateres korrekt
   - [ ] Widget respekterer valg

5. **Legal Pages:**
   - [ ] Besøg /privacy → Vises korrekt
   - [ ] Besøg /terms → Vises korrekt
   - [ ] Besøg /cookies → Vises korrekt
   - [ ] Footer links virker

---

### Step 2: Database Backup (KRITISK!)

```bash
# MongoDB Atlas backup
# Option 1: Use Atlas backup feature (anbefalet)
# Dashboard → Backup → Take Snapshot Now

# Option 2: Manual backup med mongodump
mongodump --uri="your-mongodb-uri" --out="./backup-$(date +%Y%m%d-%H%M%S)"

# Verify backup
ls -lh ./backup-*
```

**⚠️ KØR IKKE MIGRATIONS UDEN BACKUP!**

---

### Step 3: Kør Migration Scripts

**På Staging/Test Environment først:**

```bash
# 1. Migrer passwords til bcrypt
npm run gdpr:migrate-passwords -- --confirm

# Expected output:
# ✅ Migrated 5 users
# ⏭️ Skipped 0 users (already hashed)
# ❌ Failed 0 users
# ✅ Migration completed successfully!

# 2. Fjern IP-adresser
npm run gdpr:anonymize-ips -- --confirm

# Expected output:
# ✅ Removed IP addresses from X conversations in elva-agents
# ✅ Removed IP addresses from Y conversations in chatwidgets
# ✅ IP anonymization completed successfully!
```

**Verification:**

```javascript
// Test password hashing works
// Login med eksisterende bruger
// Hvis login virker → Migration successful!

// Check database manually
// mongo shell: db.users.find({}, { password: 1, email: 1 })
// All passwords should start with $2a$ or $2b$
```

---

### Step 4: Deploy til Staging

```bash
# Commit alle ændringer
git add .
git commit -m "feat(gdpr): implement Sprint 1-4 compliance features

- Add bcrypt password hashing (GDPR Art. 32)
- Add IP anonymization (GDPR Art. 5)
- Add rate limiting
- Add data export API (GDPR Art. 15, 20)
- Add account deletion (GDPR Art. 17)
- Add cookie consent banner (ePrivacy)
- Add legal pages (Privacy, Terms, Cookies)
- Add GDPR section to profile page"

# Push til GitHub
git push origin main

# Deploy til Vercel staging
vercel --scope=staging

# Eller til production (hvis ingen staging)
vercel --prod
```

---

### Step 5: Environment Variables i Vercel

Tilføj i Vercel Dashboard → Settings → Environment Variables:

```env
# Cron Job Secret (generate random string)
CRON_SECRET=your-random-secret-here-min-32-chars

# Privacy Email (hvis ikke allerede sat)
PRIVACY_EMAIL=privacy@elva-solutions.com
```

**Generate secret:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

### Step 6: Kør Migrations på Production

**Efter staging test er OK:**

```bash
# SSH til production eller brug Vercel CLI
# Med production MongoDB connection string

NODE_ENV=production npm run gdpr:migrate-passwords -- --confirm
NODE_ENV=production npm run gdpr:anonymize-ips -- --confirm
```

**Monitor logs:**
```bash
vercel logs --follow
```

---

### Step 7: Verificer Production Deployment

**Test production URL:**

1. **Autentifikation:**
   - https://your-domain.com/admin/login
   - Opret test bruger og log ind

2. **GDPR Features:**
   - https://your-domain.com/admin/profile#gdpr
   - Test data export
   - Test deletion flow (brug test bruger!)

3. **Legal Pages:**
   - https://your-domain.com/privacy
   - https://your-domain.com/terms
   - https://your-domain.com/cookies

4. **Widget:**
   - Indlæs en test page med widget
   - Verificer cookie banner vises
   - Test samtykke flow

---

## 📋 Post-Deployment Checklist

### Umiddelbart Efter Deployment:

- [ ] Alle pages loader uden fejl
- [ ] Login/registrering virker
- [ ] Data export virker
- [ ] Deletion flow virker (test med test bruger!)
- [ ] Cookie banner vises på widget
- [ ] Legal pages er tilgængelige
- [ ] Cron job er scheduleret i Vercel

### Efter 24 Timer:

- [ ] Check Vercel logs for errors
- [ ] Verificer cron job kørte (check logs kl. 02:00)
- [ ] Test widget på real customer site
- [ ] Monitor MongoDB for anomalier
- [ ] Verificer ingen passwords i klartekst

### Efter 1 Uge:

- [ ] Ingen kritiske fejl rapporteret
- [ ] User feedback positiv
- [ ] Performance OK (rate limiting ikke for aggressivt)
- [ ] Data export fungerer for reelle brugere
- [ ] Cookie banner conversion rate acceptable

---

## 🔧 Troubleshooting

### Problem: "bcrypt error" ved login

**Løsning:**
```javascript
// Check if passwords were actually migrated
// Run migration again
npm run gdpr:migrate-passwords -- --confirm
```

### Problem: "Too many requests" error

**Løsning:**
```javascript
// Adjust rate limits in lib/rate-limit.js
// Increase max from 20 to 30 for widgets if needed
export const widgetLimiter = rateLimit({
  max: 30 // Increased
});
```

### Problem: Cookie banner ikke vises

**Løsning:**
```javascript
// Clear localStorage
localStorage.removeItem('elva-consent-[widgetId]');

// Reload page
// Banner should show
```

### Problem: Data export fails

**Løsning:**
```bash
# Check logs
vercel logs --follow

# Check MongoDB connection
# Verify user has organizations
# Verify audit_log collection exists
```

### Problem: Cron job ikke kører

**Løsning:**
```bash
# Verify CRON_SECRET is set in Vercel
# Check vercel.json has crons config
# Check logs at 2 AM
vercel logs --since=2h
```

---

## 🎯 Rollback Plan

**Hvis der opstår kritiske problemer:**

### Rollback Deployment:

```bash
# Option 1: Vercel rollback
vercel rollback

# Option 2: Redeploy previous version
git log --oneline # Find previous commit
git checkout <previous-commit-hash>
vercel --prod
```

### Rollback Database:

```bash
# Restore from backup
mongorestore --uri="your-mongodb-uri" --dir=./backup-20241013
```

### Temporary Fixes:

```javascript
// If password migration fails, temporarily allow both:
const isValid = 
  (await verifyPassword(password, hash)) || 
  (password === hash); // Fallback to plain text
```

---

## 📊 Metrics at Monitore

### Sikkerhed Metrics:

```javascript
// After 1 week, check:
- Login success rate (should be >95%)
- Rate limit hits (should be <1% of requests)
- Failed auth attempts (monitor for attacks)
- Password migration success (should be 100%)
```

### GDPR Usage Metrics:

```javascript
// Track over time:
- Data export requests per week
- Account deletion requests
- Consent banner acceptance rate
- Cookie preferences (analytics opt-in %)
```

### Performance Metrics:

```javascript
// Monitor:
- API response times (rate limiting impact)
- Widget load time (consent banner overhead)
- Database query performance
```

---

## 🔐 Security Recommendations

### Post-Deployment Actions:

1. **Enable 2FA for Admin Accounts** (future sprint)
2. **Setup Security Headers** in `next.config.js`:
   ```javascript
   async headers() {
     return [
       {
         source: '/(.*)',
         headers: [
           {
             key: 'X-Frame-Options',
             value: 'DENY'
           },
           {
             key: 'X-Content-Type-Options',
             value: 'nosniff'
           },
           {
             key: 'Referrer-Policy',
             value: 'strict-origin-when-cross-origin'
           }
         ]
       }
     ]
   }
   ```

3. **Monitor Failed Login Attempts**
4. **Regular Security Audits** (quarterly)
5. **Keep Dependencies Updated**

---

## 📞 Support Contacts

### Under Deployment:

**Technical Issues:**
- Tech Lead: [EMAIL]
- On-Call Dev: [PHONE]

**Database Issues:**
- DBA: [EMAIL]
- MongoDB Support: [hvis Atlas]

### Post-Deployment:

**Bug Reports:**
- Create GitHub issue
- Tag with `gdpr` label
- Assign to GDPR project team

**Security Issues:**
- Email: security@elva-solutions.com
- Response time: <4 hours for critical

---

## ✅ Success Criteria

**Deployment is SUCCESSFUL når:**

- [ ] All tests pass
- [ ] No critical errors in logs (24 hours)
- [ ] Users can login with existing accounts
- [ ] New users can register
- [ ] Data export works
- [ ] Account deletion works
- [ ] Cookie banner shows on widget
- [ ] Legal pages accessible
- [ ] Cron job runs successfully
- [ ] Rate limiting works without blocking legitimate users
- [ ] No plain-text passwords in database
- [ ] No IP addresses in conversations
- [ ] Performance acceptable (<100ms overhead)

**Deployment is FAILED hvis:**

- ❌ Users cannot login
- ❌ Data corruption in database
- ❌ Critical security vulnerability
- ❌ Widget breaks on customer sites
- ❌ >5% error rate in logs

---

## 🎉 After Successful Deployment

### Kommunikation:

1. **Team Email:**
   ```
   Subject: GDPR Compliance Sprint 1-4 Deployed Successfully
   
   Hi Team,
   
   We've successfully deployed GDPR compliance Sprint 1-4:
   - Password security improved (bcrypt)
   - User GDPR rights implemented
   - Cookie consent banner live
   - Legal pages published
   
   60% risikoreduktion opnået!
   
   Next: Legal review (Sprint 4-5) og final implementation (Sprint 6)
   ```

2. **Update Stakeholders:**
   - CEO: Budget tracker + ROI update
   - Legal: Request DPA signings
   - Customers: No action needed (transparent)

### Documentation:

- [ ] Update `GDPR_IMPLEMENTATION_STATUS.md`
- [ ] Document deployment issues/learnings
- [ ] Update runbook with production notes
- [ ] Team training session (1 hour)

---

## 📅 Næste Milestones

### Uge 8-10: Legal & DPA (Legal Team)
- Privacy Policy final review
- Terms of Service final review
- OpenAI DPA signing
- Resend DPA signing
- Cloudinary DPA signing

### Uge 11-12: Sprint 6 (Dev Team)
- Configurable data retention
- Audit logging UI
- Data breach plan
- Security audit
- Compliance testing

### Uge 13: Launch! 🎉
- Final deployment
- Press release (optional)
- Blog post om GDPR compliance
- Competitive advantage messaging

---

## 💡 Quick Commands Reference

```bash
# Development
npm run dev

# Testing
npm test

# GDPR Migrations
npm run gdpr:migrate-passwords -- --confirm
npm run gdpr:anonymize-ips -- --confirm
npm run gdpr:process-deletions # Manual run

# Deployment
vercel --prod

# Logs
vercel logs --follow

# Rollback
vercel rollback
```

---

## 📚 Documentation Links

- [Implementation Status](./GDPR_IMPLEMENTATION_STATUS.md) - Current status
- [Full Analysis](./GDPR_ANALYSE.md) - Complete GDPR audit
- [Action Plan](./GDPR_HANDLINGSPLAN.md) - 12-week plan
- [Implementation Guide](./GDPR_IMPLEMENTERING.md) - Code examples
- [Quick Reference](./GDPR_QUICK_REFERENCE.md) - Developer cheat sheet

---

## ⚠️ Important Notes

1. **Backup First:** Always backup database before migrations
2. **Test in Staging:** Never deploy directly to production without testing
3. **Legal Review:** Placeholder legal content MUST be reviewed by lawyer
4. **Monitor:** Watch logs closely for 24 hours after deployment
5. **Rollback Ready:** Have rollback plan prepared

---

## 🎯 Definition of Success

**This deployment is successful if:**

✅ Ingen kritiske bugs i 24 timer  
✅ Users kan login og bruge platformen normalt  
✅ GDPR features fungerer som forventet  
✅ Performance er acceptable  
✅ Sikkerhedsforbedringer er aktive  

**KPI Targets:**

- Login success rate: >95%
- Data export success: >98%
- Cookie banner acceptance: >60%
- API error rate: <1%
- Response time: <200ms (90th percentile)

---

**Version:** 1.0  
**Status:** 🚀 READY TO DEPLOY

**Final checklist før deploy:**
- [ ] All tests passed
- [ ] Code reviewed
- [ ] Database backed up
- [ ] Team notified
- [ ] Rollback plan ready
- [ ] Deploy! 🚀

