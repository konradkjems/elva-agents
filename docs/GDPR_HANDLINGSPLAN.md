# 🎯 GDPR Handlingsplan - Elva Agents

## 🚨 TL;DR - Hvad Skal Fikses NU

**Status:** ⚠️ MODERAT-HØJ RISIKO  
**Estimeret tid til compliance:** 12-16 uger  
**Estimeret omkostning:** 350.000-600.000 DKK  

### Top 3 Kritiske Problemer

1. ❌ **Passwords gemmes i klartekst** → Skal hashses med bcrypt
2. ❌ **Ingen samtykke-banner** → Widget tracker uden bruger accept
3. ❌ **Ingen måde at slette konto** → Bruger kan ikke udøve GDPR rettigheder

---

## 📅 Sprint Plan (12 Uger)

### 🔥 Sprint 1-2: Kritisk Sikkerhed (14 dage)

**Mål:** Luk kritiske sikkerhedshuller

| Opgave | Dage | Ansvarlig | Status |
|--------|------|-----------|--------|
| Implementer bcrypt password hashing | 2 | Backend dev | ⏳ TODO |
| Migration script for eksisterende passwords | 1 | Backend dev | ⏳ TODO |
| IP-adresse anonymisering | 1 | Backend dev | ⏳ TODO |
| Rate limiting på API endpoints | 1 | Backend dev | ⏳ TODO |
| CSRF protection | 1 | Backend dev | ⏳ TODO |
| Security code review | 2 | Senior dev | ⏳ TODO |
| Testing af sikkerhedsforbedringer | 1 | QA | ⏳ TODO |

**Leverance:** 
- ✅ Passwords er sikre
- ✅ API er beskyttet mod misrug
- ✅ IP data er anonymiseret

**Risikoreduktion:** 40%

---

### 📝 Sprint 3-4: Brugerrettigheder (14 dage)

**Mål:** GDPR Artikel 15, 17, 20 compliance

| Opgave | Dage | Ansvarlig | Status |
|--------|------|-----------|--------|
| Data export API endpoint | 2 | Backend dev | ⏳ TODO |
| Data export UI i profil | 1 | Frontend dev | ⏳ TODO |
| Account deletion API | 2 | Backend dev | ⏳ TODO |
| Account deletion UI med 2FA | 1 | Frontend dev | ⏳ TODO |
| Grace period (30 dage før permanent) | 1 | Backend dev | ⏳ TODO |
| Email notifikationer | 1 | Backend dev | ⏳ TODO |
| Testing af export/deletion | 2 | QA | ⏳ TODO |

**Leverance:**
- ✅ "Download Mine Data" knap i profil
- ✅ "Slet Min Konto" funktion
- ✅ Email bekræftelser

**Risikoreduktion:** +30% (Total: 70%)

---

### 🍪 Sprint 5-6: Samtykke System (14 dage)

**Mål:** ePrivacy compliance + GDPR Artikel 6

| Opgave | Dage | Ansvarlig | Status |
|--------|------|-----------|--------|
| Design samtykke banner | 1 | UX designer | ⏳ TODO |
| Cookie banner komponent | 2 | Frontend dev | ⏳ TODO |
| LocalStorage samtykke håndtering | 2 | Frontend dev | ⏳ TODO |
| Backend validation af samtykke | 2 | Backend dev | ⏳ TODO |
| Opt-out funktionalitet | 1 | Backend dev | ⏳ TODO |
| Cookie policy side | 1 | Content writer | ⏳ TODO |
| Testing på forskellige widgets | 2 | QA | ⏳ TODO |

**Leverance:**
- ✅ Cookie/samtykke banner på widget
- ✅ Bruger kan opt-out af tracking
- ✅ Cookie policy publiceret

**Risikoreduktion:** +10% (Total: 80%)

---

### ⚖️ Sprint 7-8: Juridisk Dokumentation (14 dage)

**Mål:** GDPR Artikel 13-14, 30 compliance

| Opgave | Dage | Ansvarlig | Status |
|--------|------|-----------|--------|
| Kontakt GDPR advokat | 1 | CEO/Legal | ⏳ TODO |
| Privacy Policy udkast | 3 | Legal + Content | ⏳ TODO |
| Terms of Service udkast | 2 | Legal + Content | ⏳ TODO |
| Records of Processing Activities | 2 | Legal + Tech | ⏳ TODO |
| DPIA (hvis påkrævet) | 3 | Legal + Tech | ⏳ TODO |
| Privacy/Terms sider på website | 1 | Frontend dev | ⏳ TODO |
| Link fra widget til privacy | 1 | Frontend dev | ⏳ TODO |

**Leverance:**
- ✅ Privacy Policy publiceret
- ✅ Terms of Service publiceret
- ✅ GDPR dokumentation komplet
- ✅ Link i widget footer

**Risikoreduktion:** +10% (Total: 90%)

---

### 📄 Sprint 9-10: Data Processing Agreements (14 dage)

**Mål:** GDPR Artikel 28 compliance

| Opgave | Dage | Ansvarlig | Status |
|--------|------|-----------|--------|
| Verificer MongoDB Atlas DPA | 1 | Legal | ⏳ TODO |
| Verificer Vercel DPA | 1 | Legal | ⏳ TODO |
| Underskriv OpenAI DPA | 3 | Legal + CEO | ⏳ TODO |
| Underskriv Resend DPA ELLER migrer | 3 | Legal + Dev | ⏳ TODO |
| Underskriv Cloudinary DPA ELLER migrer | 3 | Legal + Dev | ⏳ TODO |
| Dokumenter SCC for US transfers | 2 | Legal | ⏳ TODO |

**Leverance:**
- ✅ Alle vendors har DPA
- ✅ SCC dokumenteret
- ✅ Vendor list opdateret

**Risikoreduktion:** +5% (Total: 95%)

---

### 🔧 Sprint 11-12: Advanced Features (14 dage)

**Mål:** Full compliance + audit ready

| Opgave | Dage | Ansvarlig | Status |
|--------|------|-----------|--------|
| Konfigurerbar data retention per widget | 3 | Backend dev | ⏳ TODO |
| Audit logging system | 3 | Backend dev | ⏳ TODO |
| Data breach response plan | 2 | Legal + Tech | ⏳ TODO |
| Incident response playbook | 1 | Legal + Tech | ⏳ TODO |
| Security audit (ekstern) | - | Security firm | ⏳ TODO |
| Comprehensive compliance testing | 2 | QA | ⏳ TODO |
| Internal GDPR training | 1 | Legal | ⏳ TODO |

**Leverance:**
- ✅ Full GDPR compliance
- ✅ Audit ready
- ✅ Team trained

**Risikoreduktion:** +5% (Total: 100%)

---

## 💰 Budget Breakdown

### Udvikling (Interne Timer)

```
Sprint 1-2: Sikkerhed             9 dage  × 800 DKK = 57.600 DKK
Sprint 3-4: Brugerrettigheder    10 dage  × 800 DKK = 64.000 DKK
Sprint 5-6: Samtykke             11 dage  × 800 DKK = 70.400 DKK
Sprint 7-8: Integration           2 dage  × 800 DKK = 12.800 DKK
Sprint 9-10: Integration          0 dage  × 800 DKK = 0 DKK
Sprint 11-12: Advanced features   9 dage  × 800 DKK = 57.600 DKK

Subtotal udvikling:                       = 262.400 DKK
```

### Juridisk (Eksterne Omkostninger)

```
GDPR advokat konsultation                 = 20.000-40.000 DKK
Privacy Policy udarbejdelse               = 15.000-30.000 DKK
Terms of Service                          = 10.000-20.000 DKK
DPIA assistance                           = 10.000-25.000 DKK
DPA forhandling                           = 5.000-15.000 DKK

Subtotal juridisk:                        = 60.000-130.000 DKK
```

### Sikkerhed & Audit

```
Ekstern security audit                    = 30.000-80.000 DKK
Penetration test                          = 20.000-50.000 DKK

Subtotal sikkerhed:                       = 50.000-130.000 DKK
```

### **TOTAL: 372.400-522.400 DKK**

---

## 🎯 Quick Wins (Kan fikses i dag)

### 1. Tilføj Midlertidig Disclaimer (30 min)

Tilføj til widget footer:

```javascript
<div class="elva-privacy-notice">
  Vi behandler dine data i overensstemmelse med GDPR.
  <a href="https://elva-solutions.com/privacy" target="_blank">
    Læs mere
  </a>
</div>
```

### 2. Stop Logging af Ikke-Anonymiserede IPs (1 time)

```javascript
// pages/api/respond-responses.js
metadata: {
  userAgent: req.headers['user-agent'] || '',
  ip: anonymizeIP(req.headers['x-forwarded-for']), // ✅ FIX
  country: getCountryFromIP(req.headers['x-forwarded-for']),
  referrer: null
}

function anonymizeIP(ip) {
  if (!ip) return null;
  return ip.split('.').slice(0, 3).join('.') + '.0';
}
```

### 3. Tilføj Privacy Contact (15 min)

```javascript
// Add to .env.local
PRIVACY_EMAIL=privacy@elva-solutions.com

// Add to footer component
<a href="mailto:privacy@elva-solutions.com">
  Privatlivsspørgsmål?
</a>
```

---

## 📊 Success Metrics

### Compliance KPIs

| Metric | Nuværende | Target | Deadline |
|--------|-----------|--------|----------|
| GDPR Compliance Score | 3.0/10 | 9.0/10 | Uge 12 |
| Kritiske sårbarheder | 5 | 0 | Uge 2 |
| Brugerrettigheder implemented | 0/7 | 6/7 | Uge 4 |
| DPA'er på plads | 2/5 | 5/5 | Uge 10 |
| Privacy docs | 0% | 100% | Uge 8 |

### Risiko Metrics

| Metric | Nuværende | Target | Deadline |
|--------|-----------|--------|----------|
| Potentiel bøde risiko | 1.35M DKK | <50K DKK | Uge 12 |
| Data breach response tid | ∞ | <72 timer | Uge 12 |
| Tiden til DSAR svar | ∞ | <30 dage | Uge 4 |

---

## 🚦 Weekly Status Updates

### Uge 1
- [ ] Password hashing implementation
- [ ] IP anonymization
- [ ] Rate limiting

**Milestone:** Kritiske sårbarheder lukket

### Uge 2
- [ ] CSRF protection
- [ ] Security testing
- [ ] Code review

**Milestone:** Security sprint komplet

### Uge 3
- [ ] Data export API
- [ ] Data export UI

**Milestone:** Ret til indsigt 50% done

### Uge 4
- [ ] Account deletion API
- [ ] Account deletion UI
- [ ] Testing

**Milestone:** Brugerrettigheder komplet

### Uge 5-6
- [ ] Samtykke banner
- [ ] Cookie policy

**Milestone:** ePrivacy compliance

### Uge 7-8
- [ ] Privacy policy
- [ ] Terms of service
- [ ] GDPR docs

**Milestone:** Juridisk dokumentation komplet

### Uge 9-10
- [ ] Alle DPA'er underskrevet

**Milestone:** Vendor compliance

### Uge 11-12
- [ ] Advanced features
- [ ] Final audit

**Milestone:** 🎉 Full GDPR compliance

---

## ⚠️ Risk Register

| Risiko | Sandsynlighed | Impact | Mitigation |
|--------|---------------|--------|------------|
| Datatilsynet inspektion | Lav (5%) | Meget høj | Prioriter compliance |
| Bruger klage | Medium (30%) | Høj | Implementer rettigheder hurtigt |
| Data breach | Lav (10%) | Meget høj | Implementer sikkerhed først |
| DPA forhandling fejler | Medium (20%) | Medium | Start tidligt, ha Plan B |
| Budget overskrides | Medium (40%) | Medium | Prioriter kritiske items |
| Timeline overskrides | Høj (60%) | Medium | Agile approach, cut scope hvis nødvendigt |

---

## 👥 Roller & Ansvar

### RACI Matrix

| Opgave | Responsible | Accountable | Consulted | Informed |
|--------|------------|-------------|-----------|----------|
| Password security | Backend Dev | CTO | Security | Team |
| Data export/deletion | Backend Dev | CTO | Legal | Users |
| Samtykke system | Frontend Dev | CTO | UX, Legal | Marketing |
| Privacy Policy | Legal | CEO | CTO | Team |
| DPA'er | Legal | CEO | CTO | Finance |
| Testing | QA | CTO | Dev team | CEO |

---

## 📞 Kontakter

### Interne
- **GDPR Champion:** [NAVN] - [EMAIL]
- **Tech Lead:** [NAVN] - [EMAIL]
- **Legal Contact:** [NAVN] - [EMAIL]

### Eksterne
- **GDPR Advokat:** [FIRMA] - [EMAIL]
- **Security Auditor:** [FIRMA] - [EMAIL]
- **DPO Konsulent:** [FIRMA] - [EMAIL] (hvis påkrævet)

### Myndigheder
- **Datatilsynet:** dt@datatilsynet.dk | +45 33 19 32 00
- **Klageportal:** https://www.datatilsynet.dk/borger/klage

---

## 📚 Ressourcer

### Værktøjer
- [ ] Password strength tester: https://www.passwordmonster.com/
- [ ] GDPR checklist: https://gdpr.eu/checklist/
- [ ] Privacy policy generator: https://www.freeprivacypolicy.com/
- [ ] Cookie scanner: https://www.cookiebot.com/

### Uddannelse
- [ ] GDPR basics kursus: https://www.datatilsynet.dk/
- [ ] Security best practices
- [ ] Incident response training

### Templates
- [ ] Privacy Policy template (dansk)
- [ ] Cookie Policy template
- [ ] Data breach notification template
- [ ] DSAR response template

---

## ✅ Definition of Done

Et sprint er **DONE** når:

- [ ] Alle opgaver er implementeret og testet
- [ ] Code review er gennemført
- [ ] Dokumentation er opdateret
- [ ] QA har approved
- [ ] Deployed til production
- [ ] Team er trænet i ny funktionalitet
- [ ] Users er informeret (hvis relevant)

Projektet er **DONE** når:

- [ ] Alle 12 sprints er færdige
- [ ] Ekstern security audit er passed
- [ ] Legal har approved alle dokumenter
- [ ] Alle DPA'er er underskrevet
- [ ] GDPR compliance score > 9/10
- [ ] Datatilsynet klar (kunne inspicere i morgen uden frygt)

---

**Dokument version:** 1.0  
**Sidst opdateret:** 13. oktober 2025  
**Næste review:** Ugentligt hver fredag kl. 15:00

**Status:** 🔴 NOT STARTED - Afventer godkendelse til at starte Sprint 1

---

## 🚀 Næste Steps

1. **I dag:** Gennemgå denne plan med team + legal
2. **I morgen:** Godkend budget og timeline
3. **Uge 1, Dag 1:** Kickoff møde + Start Sprint 1
4. **Hver fredag:** Status review + blocker removal
5. **Uge 12:** Final audit + celebration! 🎉

