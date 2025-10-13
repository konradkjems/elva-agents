# 🚨 Data Breach Response Plan - Elva Solutions

**GDPR Article 33 & 34 Compliance**  
**Version:** 1.0  
**Effective Date:** 13. oktober 2025  
**Review Schedule:** Quarterly

---

## 📋 Overview

This plan outlines the procedures to follow in case of a personal data breach. Under GDPR Article 33, we must notify Datatilsynet within 72 hours of becoming aware of a breach that poses a risk to individuals' rights and freedoms.

---

## 🎯 Definitions

**Personal Data Breach:** A breach of security leading to accidental or unlawful destruction, loss, alteration, unauthorized disclosure of, or access to, personal data.

**High Risk Breach:** A breach likely to result in a high risk to rights and freedoms of individuals (requires notification to affected users under Article 34).

---

## 🚨 Phase 1: Detection & Initial Response (0-4 hours)

### Immediate Actions

**If you discover or suspect a data breach:**

1. **DO NOT PANIC**
2. **DOCUMENT everything immediately**
3. **CONTACT the response team:**
   - Tech Lead: [PHONE]
   - CEO: [PHONE]
   - Legal: [PHONE]

4. **DO NOT:**
   - Delete any logs or evidence
   - Notify customers (yet)
   - Post on social media
   - Make changes without documenting

### Initial Assessment

**Document these immediately:**

- **Time of discovery:** [When did you notice?]
- **Type of breach:** [Unauthorized access, data leak, ransomware, etc.]
- **Affected systems:** [Which databases, servers, services?]
- **Data potentially affected:** [User emails, passwords, chat logs, etc.]
- **Number of affected users:** [Estimate]
- **How was it discovered:** [Monitoring alert, user report, security audit?]

### Assemble Response Team

**Contact immediately:**

- [ ] Tech Lead / CTO
- [ ] CEO
- [ ] Legal Counsel / GDPR Advisor
- [ ] Security Expert (if external)

**Team Roles:**

| Role | Responsibility | Contact |
|------|----------------|---------|
| Incident Commander | Overall coordination | [NAME] |
| Technical Lead | Investigation & remediation | [NAME] |
| Legal Lead | Regulatory compliance | [NAME] |
| Communications | User & authority notification | [NAME] |
| Documentation | Record keeping | [NAME] |

---

## 🔍 Phase 2: Investigation & Containment (4-24 hours)

### Detailed Investigation

**Answer these questions:**

1. **What happened?**
   - Exact nature of the breach
   - Attack vector or cause
   - Timeline of events

2. **What data was affected?**
   - Types of personal data
   - Categories of data subjects
   - Number of records

3. **What was the cause?**
   - Security vulnerability?
   - Human error?
   - Malicious attack?
   - Third-party breach?

4. **What is the impact?**
   - Risk to individuals
   - Potential consequences
   - Severity assessment

### Containment Actions

**Stop the breach:**

- [ ] Identify and close security vulnerability
- [ ] Revoke compromised credentials
- [ ] Isolate affected systems
- [ ] Block unauthorized access
- [ ] Preserve evidence for investigation

**Technical Checklist:**

```bash
# 1. Revoke API keys if compromised
# Generate new keys in respective services

# 2. Reset user passwords if password breach
node scripts/force-password-reset.js --all

# 3. Take affected systems offline if necessary
vercel pause

# 4. Enable additional logging
# Update monitoring to capture breach activity

# 5. Backup current state for forensics
mongodump --uri="..." --out="./breach-backup-$(date +%Y%m%d-%H%M%S)"
```

---

## 📝 Phase 3: Risk Assessment (12-36 hours)

### Determine Notification Requirements

#### Must notify Datatilsynet if:

- ✅ Breach poses risk to rights and freedoms
- ✅ More than trivial breach
- ✅ Affects EU residents

#### Must notify affected users if:

- ✅ HIGH RISK to rights and freedoms
- ✅ Identity theft risk
- ✅ Financial loss risk
- ✅ Discrimination or reputational damage risk

### Risk Matrix

| Data Type | Severity | User Notification? | Authority Notification? |
|-----------|----------|-------------------|------------------------|
| Passwords (hashed) | LOW | No | Maybe |
| Passwords (plain) | CRITICAL | YES | YES |
| Email addresses | MEDIUM | Maybe | YES |
| Chat messages | MEDIUM-HIGH | YES | YES |
| Payment info | CRITICAL | YES | YES |
| IP addresses | LOW | No | Maybe |
| Analytics | LOW | No | No |

### Decision Tree

```
Was personal data breached?
├─ NO → Document as security incident, no GDPR notification
└─ YES → Poses risk to individuals?
    ├─ NO → Minimal risk, consider notification
    └─ YES → Risk level?
        ├─ Low/Medium → Notify Datatilsynet within 72h
        └─ HIGH → Notify Datatilsynet + Affected Users within 72h
```

---

## 📞 Phase 4: Notification (24-72 hours)

### Notify Datatilsynet (if required)

**Timeline:** Within 72 hours of becoming aware

**Contact:**
- Email: dt@datatilsynet.dk
- Phone: +45 33 19 32 00
- Portal: https://www.datatilsynet.dk/

**Required Information (Article 33(3)):**

1. **Nature of breach:**
   - Description of what happened
   - Categories of data subjects affected
   - Number of data subjects affected (approximate)
   - Categories of personal data affected

2. **Contact point:**
   - Name: [Data Protection Officer or contact person]
   - Email: privacy@elva-solutions.com
   - Phone: [PHONE]

3. **Likely consequences:**
   - Potential impact on individuals
   - Risk assessment

4. **Measures taken:**
   - Steps to mitigate
   - Remediation actions
   - Preventive measures

**Use Template:** See `email-templates/datatilsynet-breach-notification.html`

### Notify Affected Users (if high risk)

**Timeline:** Without undue delay

**Method:**
- Email (primary)
- In-app notification
- Website banner (if widespread)

**Required Information (Article 34(2)):**

1. Description in clear and plain language
2. Contact point for questions
3. Likely consequences
4. Measures taken and recommended
5. Recommended actions for users

**Use Template:** See `email-templates/user-breach-notification.html`

---

## 📧 Email Templates

### Template 1: Datatilsynet Notification

```markdown
Subject: Anmeldelse af databrud - Elva Solutions ApS (CVR: 44543133)

Til Datatilsynet,

Vi anmelder hermed et databrud i henhold til GDPR Artikel 33.

1. BESKRIVELSE AF BRUDDET:
   [Detaljeret beskrivelse]

2. TIDSLINJE:
   - Bruddet opstod: [DATO/TID]
   - Opdaget: [DATO/TID]
   - Datatilsynet informeret: [DATO/TID]

3. BERØRTE DATA:
   - Kategorier af registrerede: [Platformbrugere / Slutbrugere]
   - Antal berørte: [ANTAL]
   - Datatyper: [Email, passwords, chat logs, etc.]

4. SANDSYNLIGE KONSEKVENSER:
   [Risikovurdering]

5. FORANSTALTNINGER:
   - Umiddelbar handling: [Hvad er gjort]
   - Afhjælpning: [Hvad er implementeret]
   - Forebyggelse: [Fremtidige tiltag]

6. KONTAKTPERSON:
   Navn: [NAVN]
   Email: privacy@elva-solutions.com
   Telefon: [TELEFON]

Med venlig hilsen,
Elva Solutions ApS
CVR: 44543133
```

### Template 2: User Notification

```html
Subject: Important Security Notice - Action Required

Dear [NAME],

We are writing to inform you of a security incident that may affect your account on Elva Solutions.

WHAT HAPPENED:
[Clear, non-technical explanation]

WHAT DATA WAS AFFECTED:
[Specific data types]

WHAT WE'RE DOING:
- [Action 1]
- [Action 2]
- [Action 3]

WHAT YOU SHOULD DO:
1. Change your password immediately
2. Review your account for suspicious activity
3. Enable two-factor authentication (if available)

We take your privacy and security very seriously. This incident has been reported to Datatilsynet (Danish Data Protection Authority) as required by GDPR.

If you have questions, please contact:
privacy@elva-solutions.com

We apologize for any inconvenience.

Sincerely,
Elva Solutions Team
```

---

## 🔧 Phase 5: Remediation (72 hours - ongoing)

### Technical Remediation

- [ ] Fix vulnerability that caused breach
- [ ] Implement additional security controls
- [ ] Update security policies
- [ ] Patch systems
- [ ] Improve monitoring
- [ ] Conduct security audit

### User Support

- [ ] Setup dedicated support channel
- [ ] Answer user questions
- [ ] Provide guidance on protection
- [ ] Monitor for fraud/abuse
- [ ] Offer credit monitoring if appropriate

### Audit Trail

- [ ] Document all actions taken
- [ ] Preserve evidence
- [ ] Create incident report
- [ ] Lessons learned document
- [ ] Update breach register

---

## 📊 Phase 6: Post-Incident Review (1-2 weeks after)

### Incident Report

Create detailed report including:

1. **Executive Summary**
2. **Timeline of Events**
3. **Root Cause Analysis**
4. **Data Affected**
5. **Response Actions**
6. **Notification Log**
7. **Remediation Steps**
8. **Lessons Learned**
9. **Preventive Measures**

### Team Review Meeting

**Agenda:**

- What went well?
- What could be improved?
- Were procedures followed?
- Was timeline met?
- Do we need to update this plan?
- Additional training needed?

### Update Security

- [ ] Implement lessons learned
- [ ] Update security procedures
- [ ] Enhance monitoring
- [ ] Additional training
- [ ] Update this response plan

---

## 📋 Breach Register

**Maintain a register of all data breaches:**

| Date | Type | Affected Users | Data Types | Reported to Authority? | Reported to Users? |
|------|------|----------------|------------|----------------------|-------------------|
| - | - | - | - | - | - |

Store in: `docs/confidential/breach-register.md`

---

## 🔔 Detection Methods

### Automated Alerts

**Setup monitoring for:**

- Unusual API traffic patterns
- Multiple failed login attempts
- Unauthorized access attempts
- Unusual database queries
- Changes to user passwords
- Large data exports

**Tools:**

- Vercel logs monitoring
- MongoDB Atlas alerts
- Uptime monitoring
- Error tracking (Sentry/Rollbar)

### Manual Detection

**Regular checks:**

- [ ] Weekly security log review
- [ ] Monthly vulnerability scans
- [ ] Quarterly penetration testing
- [ ] User-reported issues
- [ ] Vendor security notifications

---

## 📞 Contact Information

### Internal Team

| Role | Name | Phone | Email |
|------|------|-------|-------|
| Incident Commander | [NAME] | [PHONE] | [EMAIL] |
| Tech Lead | [NAME] | [PHONE] | [EMAIL] |
| Legal | [NAME] | [PHONE] | [EMAIL] |
| CEO | [NAME] | [PHONE] | [EMAIL] |

### External Contacts

| Organization | Contact | Phone | Email |
|--------------|---------|-------|-------|
| **Datatilsynet** | Main Office | +45 33 19 32 00 | dt@datatilsynet.dk |
| **GDPR Lawyer** | [FIRM] | [PHONE] | [EMAIL] |
| **Security Firm** | [FIRM] | [PHONE] | [EMAIL] |
| **MongoDB Support** | Atlas Support | - | support portal |
| **Vercel Support** | - | - | support@vercel.com |
| **OpenAI Support** | - | - | Via platform |

---

## ✅ Training & Preparedness

### Team Training

**All team members should:**

- [ ] Read this response plan
- [ ] Know who to contact
- [ ] Understand their role
- [ ] Practice breach scenarios (quarterly)

### Breach Simulation

**Run tabletop exercises:**

- Scenario 1: Password database leaked
- Scenario 2: Unauthorized API access
- Scenario 3: Third-party breach (e.g., MongoDB)
- Scenario 4: Ransomware attack

**Schedule:** Quarterly

---

## 📁 Document Storage

**Store these securely:**

- Breach notification templates
- Contact lists (updated quarterly)
- Previous incident reports
- Breach register
- Training materials

**Location:** `docs/confidential/` (not in Git!)

---

## 🔄 Plan Maintenance

**Review and update this plan:**

- After every incident
- Quarterly (minimum)
- When team changes
- When systems change
- When regulations change

**Next Review:** [DATE + 3 months]

---

## ⚖️ Legal Considerations

### GDPR Requirements

**Article 33 - Notification to Supervisory Authority:**
- Within 72 hours of becoming aware
- Must include specific information
- Failure can result in fines

**Article 34 - Notification to Data Subjects:**
- "Without undue delay" if high risk
- Clear and plain language
- Practical recommendations

### Fines for Non-Compliance

- Failing to notify: Up to €10 million or 2% of turnover
- Inadequate security: Up to €20 million or 4% of turnover

---

## 📊 Breach Severity Classification

### Level 1: LOW (Green)

**Examples:**
- Single user email exposed
- Hashed passwords leaked
- Anonymized data

**Actions:**
- Document internally
- Fix vulnerability
- No external notification needed

---

### Level 2: MEDIUM (Yellow)

**Examples:**
- Multiple emails exposed
- User chat history leaked
- Non-sensitive personal data

**Actions:**
- Notify Datatilsynet
- Consider user notification
- Full investigation
- Remediation

---

### Level 3: HIGH (Orange)

**Examples:**
- Significant user data exposed
- Financial information leaked
- Authentication credentials compromised

**Actions:**
- Immediate notification to Datatilsynet
- Notify affected users
- Public statement if widespread
- Full forensic investigation

---

### Level 4: CRITICAL (Red)

**Examples:**
- Plain text passwords leaked
- Payment card data exposed
- Complete database dump
- Active ongoing attack

**Actions:**
- Emergency response activation
- Immediate Datatilsynet notification
- All users notified
- Public disclosure
- Law enforcement involvement
- External security firm

---

## 🎯 Success Criteria

**Breach response is SUCCESSFUL if:**

- ✅ Detected within 24 hours
- ✅ Contained within 48 hours
- ✅ Datatilsynet notified within 72 hours (if required)
- ✅ Users notified promptly (if required)
- ✅ Full documentation maintained
- ✅ No repeat of same breach
- ✅ Regulatory compliance maintained

---

## 📞 Quick Reference

### 72-Hour Clock Starts When:

**First moment a staff member has sufficient information to determine that a personal data breach has occurred.**

### Who to Call First:

1. **Tech Lead:** [PHONE]
2. **CEO:** [PHONE]
3. **Legal:** [PHONE]

### Where to Report:

**Datatilsynet:**
- dt@datatilsynet.dk
- +45 33 19 32 00
- https://www.datatilsynet.dk/

---

## 🔐 Prevention Checklist

**Run quarterly to prevent breaches:**

- [ ] Security patches up to date
- [ ] Access logs reviewed
- [ ] User permissions audited
- [ ] Third-party security verified
- [ ] Monitoring alerts working
- [ ] Backups tested
- [ ] Encryption verified
- [ ] Rate limiting active
- [ ] DDoS protection configured
- [ ] Team trained on security

---

**Document Owner:** Tech Lead  
**Last Updated:** 13. oktober 2025  
**Next Review:** 13. januar 2026  

**This is a CONFIDENTIAL document. Do not share outside authorized personnel.**

