# Subaccounts & Teams - Implementation Roadmap

## 🎯 Vision

Transform Elva-Agents from a single-user platform into a multi-tenant SaaS with team collaboration, where clients can manage their own widgets and invite team members.

## 📅 Timeline Overview

```
Month 1          Month 2          Month 3          Month 4+
│                │                │                │
├─ Phase 1       ├─ Phase 3       ├─ Phase 5       ├─ Phase 6
│  Foundation    │  Invitations   │  Polish        │  Advanced
│                │                │                │
├─ Phase 2       ├─ Phase 4       │                │
│  Core Features │  RBAC          │                │
│                │                │                │
└────────────────┴────────────────┴────────────────┴─────────>
   2 weeks         2 weeks         2-3 weeks         Ongoing
```

## 📋 Phase Breakdown

### Phase 1: Foundation (Week 1-2)
**Goal:** Set up the database structure and migration scripts

#### Tasks
- [ ] **Database Schema Design**
  - [ ] Create `organizations` collection
  - [ ] Create `team_members` collection  
  - [ ] Create `invitations` collection
  - [ ] Update `users` collection schema
  - [ ] Update `widgets` collection schema
  - [ ] Update `demos` collection schema

- [ ] **Migration Scripts**
  - [ ] Script to add organizationId to all collections
  - [ ] Script to create personal orgs for existing users
  - [ ] Script to migrate existing widgets to personal orgs
  - [ ] Rollback scripts for safety

- [ ] **API Endpoints - Organizations**
  - [ ] `POST /api/organizations` - Create
  - [ ] `GET /api/organizations` - List user's orgs
  - [ ] `GET /api/organizations/:id` - Get details
  - [ ] `PUT /api/organizations/:id` - Update
  - [ ] `DELETE /api/organizations/:id` - Delete (soft)
  - [ ] `POST /api/organizations/:id/switch` - Switch context

**Deliverable:** Database ready, migrations tested, basic org APIs working

---

### Phase 2: Core Features (Week 3-4)
**Goal:** Build the UI for organization management and switching

#### Tasks
- [ ] **Organization Switcher Component**
  - [ ] Dropdown in header showing all user's orgs
  - [ ] "Create Organization" option
  - [ ] "Manage Organizations" link
  - [ ] Current org indicator
  - [ ] Smooth context switching

- [ ] **Organization Settings Page**
  - [ ] General settings tab
  - [ ] Organization info (name, logo, slug)
  - [ ] Branding settings
  - [ ] Danger zone (delete org)

- [ ] **Create Organization Flow**
  - [ ] Modal/page for creating new org
  - [ ] Name and slug selection
  - [ ] Plan selection (if applicable)
  - [ ] Success state and redirect

- [ ] **Data Isolation Middleware**
  - [ ] Middleware to inject organizationId
  - [ ] Update all widget APIs to filter by org
  - [ ] Update all demo APIs to filter by org
  - [ ] Update analytics to filter by org

- [ ] **Dashboard Updates**
  - [ ] Show org-specific data
  - [ ] Update widgets list
  - [ ] Update demos list
  - [ ] Update analytics

**Deliverable:** Users can create orgs, switch between them, see isolated data

---

### Phase 3: Invitations System (Week 5)
**Goal:** Enable inviting team members via email

#### Tasks
- [ ] **Invitation API Endpoints**
  - [ ] `POST /api/organizations/:id/invitations` - Send invite
  - [ ] `GET /api/organizations/:id/invitations` - List pending
  - [ ] `POST /api/invitations/:token/accept` - Accept
  - [ ] `POST /api/invitations/:token/decline` - Decline
  - [ ] `DELETE /api/organizations/:id/invitations/:id` - Cancel
  - [ ] `POST /api/invitations/:id/resend` - Resend

- [ ] **Email System**
  - [ ] Configure email service (SendGrid/AWS SES)
  - [ ] Invitation email template
  - [ ] Role change notification template
  - [ ] Welcome email template
  - [ ] Email sending service

- [ ] **Invitation Acceptance Flow**
  - [ ] Public invitation page `/invitations/:token`
  - [ ] Sign up if new user
  - [ ] Login if existing user
  - [ ] Accept invitation
  - [ ] Redirect to organization

- [ ] **Invite Member UI**
  - [ ] Invite button on team page
  - [ ] Invite modal (email, role, message)
  - [ ] Pending invitations list
  - [ ] Resend/cancel actions

**Deliverable:** Complete invitation system working end-to-end

---

### Phase 4: RBAC & Permissions (Week 6-7)
**Goal:** Implement and enforce role-based access control

#### Tasks
- [ ] **Permission System**
  - [ ] Define permission matrix
  - [ ] Permission checking utilities
  - [ ] Role definitions (owner, admin, editor, viewer)
  - [ ] Permission inheritance logic

- [ ] **API Permission Enforcement**
  - [ ] Middleware for permission checks
  - [ ] Update all widget endpoints
  - [ ] Update all demo endpoints
  - [ ] Update all team endpoints
  - [ ] Update all org settings endpoints

- [ ] **UI Permission Enforcement**
  - [ ] Hide/show UI elements based on role
  - [ ] Disable actions based on permissions
  - [ ] Show permission-denied messages
  - [ ] Role indicators throughout UI

- [ ] **Team Management Page**
  - [ ] Members tab showing all team members
  - [ ] Role badges and indicators
  - [ ] Change role dropdown
  - [ ] Remove member action
  - [ ] Invitations tab
  - [ ] Search and filter members

- [ ] **Role Management**
  - [ ] Change member role UI
  - [ ] Confirmation modals
  - [ ] Permission explanations
  - [ ] Role change notifications

**Deliverable:** Full RBAC system with proper enforcement

---

### Phase 5: Polish & Testing (Week 8-9)
**Goal:** Refine UX and ensure everything works perfectly

#### Tasks
- [ ] **UX Improvements**
  - [ ] Loading states everywhere
  - [ ] Error handling and messages
  - [ ] Success notifications
  - [ ] Empty states
  - [ ] Onboarding tooltips
  - [ ] Help documentation

- [ ] **Testing**
  - [ ] Unit tests for permissions
  - [ ] Integration tests for org switching
  - [ ] E2E tests for invitation flow
  - [ ] Permission enforcement tests
  - [ ] Data isolation tests
  - [ ] Edge case testing

- [ ] **Performance Optimization**
  - [ ] Database query optimization
  - [ ] Index creation
  - [ ] Caching strategy
  - [ ] Lazy loading
  - [ ] Code splitting

- [ ] **Documentation**
  - [ ] User guide for organizations
  - [ ] Team management guide
  - [ ] Role and permissions guide
  - [ ] API documentation
  - [ ] Migration guide

**Deliverable:** Production-ready multi-tenant system

---

### Phase 6: Advanced Features (Future)
**Goal:** Enterprise-grade features and monetization

#### Future Tasks
- [ ] **Billing Integration**
  - [ ] Stripe integration
  - [ ] Plan selection and limits
  - [ ] Usage tracking
  - [ ] Billing portal
  - [ ] Subscription management

- [ ] **Advanced Features**
  - [ ] SSO integration (SAML, OIDC)
  - [ ] Audit logs
  - [ ] Custom roles creation
  - [ ] Activity feed
  - [ ] Webhooks

- [ ] **White-Label**
  - [ ] Custom domains per org
  - [ ] Custom branding
  - [ ] Remove Elva branding option
  - [ ] Custom email templates

- [ ] **Analytics & Reporting**
  - [ ] Org-level analytics dashboard
  - [ ] Team activity reports
  - [ ] Usage reports
  - [ ] Export capabilities

**Deliverable:** Enterprise-ready SaaS platform

---

## 🎨 UI/UX Mockups Needed

### Priority 1 (Before Phase 2)
1. Organization switcher dropdown
2. Create organization modal
3. Organization settings page
4. Team members page
5. Invite member modal

### Priority 2 (Before Phase 3)
1. Invitation email design
2. Invitation acceptance page
3. Role change modal
4. Permission denied states

### Priority 3 (Polish phase)
1. Onboarding flow
2. Empty states
3. Loading skeletons
4. Error states
5. Help tooltips

---

## 🔧 Technical Dependencies

### Required Before Starting
- [x] MongoDB connection
- [x] NextAuth setup
- [x] shadcn/ui components
- [ ] Email service (SendGrid/SES)
- [ ] Redis (for caching, optional)

### Nice to Have
- [ ] Queue system (for emails)
- [ ] Monitoring (Sentry)
- [ ] Analytics (Mixpanel/Amplitude)

---

## 🧪 Testing Strategy

### Phase 1 Testing
- [ ] Migration scripts on test database
- [ ] Rollback scripts verified
- [ ] Data integrity checks

### Phase 2 Testing
- [ ] Organization CRUD operations
- [ ] Context switching
- [ ] Data isolation verification

### Phase 3 Testing
- [ ] Email delivery
- [ ] Invitation token security
- [ ] Expiration logic
- [ ] Edge cases (expired, used tokens)

### Phase 4 Testing
- [ ] All permission combinations
- [ ] Role changes
- [ ] Permission enforcement
- [ ] Edge cases (removed users, deleted orgs)

### Phase 5 Testing
- [ ] Full E2E user journeys
- [ ] Performance under load
- [ ] Security audit
- [ ] UX testing with real users

---

## 📊 Success Metrics

### Adoption Metrics
- **Week 1:** 10% of users create an organization
- **Month 1:** 50% of users create an organization
- **Month 3:** Average 2.5 team members per org
- **Month 6:** 80% invitation acceptance rate

### Technical Metrics
- **Performance:** Organization switch < 500ms
- **Reliability:** 99.9% uptime
- **Security:** Zero data leaks between orgs
- **Speed:** All pages load < 2s

### Business Metrics
- **Revenue:** Enable subscription tiers
- **Retention:** Increased user retention by 40%
- **Growth:** 3x increase in active users
- **Satisfaction:** NPS score > 50

---

## 🚨 Risks & Mitigation

### Risk 1: Data Migration Issues
**Impact:** High  
**Mitigation:**
- Test migrations on copy of production data
- Create rollback scripts
- Run migrations during low-traffic period
- Monitor closely after migration

### Risk 2: Performance Degradation
**Impact:** Medium  
**Mitigation:**
- Add proper database indexes
- Implement caching strategy
- Load test before launch
- Monitor query performance

### Risk 3: Complex Permission Logic
**Impact:** Medium  
**Mitigation:**
- Comprehensive test suite
- Clear documentation
- Code reviews for all permission changes
- Security audit

### Risk 4: User Confusion
**Impact:** Low  
**Mitigation:**
- Clear onboarding flow
- Help documentation
- In-app tooltips
- Support resources

---

## 🎯 Go-Live Checklist

### Pre-Launch
- [ ] All Phase 1-5 tasks complete
- [ ] Comprehensive testing done
- [ ] Documentation complete
- [ ] Email templates approved
- [ ] Performance benchmarks met
- [ ] Security audit passed
- [ ] Rollback plan ready

### Launch Day
- [ ] Deploy during low-traffic window
- [ ] Monitor error rates
- [ ] Watch database performance
- [ ] Check email delivery
- [ ] Verify key user flows
- [ ] Support team on standby

### Post-Launch (Week 1)
- [ ] Monitor adoption metrics
- [ ] Collect user feedback
- [ ] Address critical bugs
- [ ] Performance optimization
- [ ] Documentation updates
- [ ] Team training

---

## 📞 Support & Resources

### Questions About Plan
- Review [Detailed Implementation Plan](./SUBACCOUNTS_AND_TEAMS_PLAN.md)
- Check [Database Schema](#) (to be created)
- See [API Documentation](#) (to be created)

### During Implementation
- Daily standups to track progress
- Weekly reviews of completed phases
- Continuous testing and validation
- Regular stakeholder updates

---

**Status:** 📝 Planning Phase  
**Last Updated:** January 1, 2025  
**Next Review:** Start of Phase 1


