# 🧪 Invitation Flow - Complete Testing Guide

## ✅ Features to Test

### Phase 3 Complete Feature Set:
1. ✅ Send team invitations
2. ✅ Receive invitation emails
3. ✅ **NEW: Create account on invitation page** 🆕
4. ✅ Accept/decline invitations
5. ✅ Resend invitations
6. ✅ Cancel pending invitations
7. ✅ Change member roles
8. ✅ Remove team members

---

## 🚀 Setup Before Testing

### 1. Environment Variables

Make sure your `.env.local` has:

```env
# Your Resend API key
RESEND_API_KEY=re_your_key_here

# Email configuration
EMAIL_FROM=Elva Solutions <noreply@resend.dev>

# App URL (for invitation links)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 2. Restart Development Server

```bash
# Stop your dev server (Ctrl+C)
# Then restart it
npm run dev
```

This ensures new environment variables are loaded.

### 3. Prepare Test Emails

You'll need **2 different email addresses** for testing:
- **Email 1**: Your main account (already logged in)
- **Email 2**: A secondary email to receive invitations

**Options:**
- Use Gmail +aliases: `yourname+test@gmail.com`
- Use a second email account
- Use temporary email services (for quick tests)

---

## 📧 Test 1: Send Invitation & Receive Email

### Steps:

1. **Navigate to Organization Settings**
   - Go to `/admin`
   - Click on organization name in header → "Manage Organizations"
   - Or go directly to `/admin/organizations/settings`

2. **Go to Team Members Tab**
   - Click on "Team Members" tab
   - You should see yourself listed as "Owner"

3. **Send an Invitation**
   - Click "Invite Member" button
   - Enter a **different email** than yours
   - Select a role (try "Member" first)
   - Click "Send Invitation"

4. **Verify Success**
   - ✅ Toast notification: "Invitation sent!"
   - ✅ New invitation appears in "Pending Invitations" section
   - ✅ Shows: email, role badge, expiry date
   - ✅ "Resend" and "Cancel" buttons visible

5. **Check Your Email**
   - Check the inbox of the email you invited
   - ✅ You should receive a beautifully formatted email
   - ✅ Email should have:
     - Your name as inviter
     - Organization name
     - Role badge
     - "Accept Invitation" button
     - Plain text link as fallback
     - Expiration notice (7 days)

### Expected Results:
- ✅ Invitation created in database
- ✅ Email sent successfully
- ✅ Invitation listed as "Pending"
- ✅ Email received with correct details

---

## 🎯 Test 2: Create Account & Accept (NEW USER - BEST FLOW!) 🆕

### Steps:

1. **Open Invitation Link**
   - Click "Accept Invitation" button in email
   - Or copy/paste the plain text link
   - Open in **incognito/private browser window** (to simulate new user)

2. **View Invitation Page**
   - ✅ Beautiful landing page loads
   - ✅ Organization name displayed
   - ✅ Your name shown as inviter
   - ✅ Role badge visible
   - ✅ Expiration date shown
   - ✅ "Create Account & Accept" button (not "Sign in")

3. **Click "Create Account & Accept"**
   - ✅ Form appears with account creation fields
   - ✅ Email is pre-filled (from invitation)
   - ✅ Page title changes to "Create Your Account"

4. **Fill Out Account Form**
   - **Full Name:** Enter your name (e.g., "John Doe")
   - **Password:** Enter password (min 8 characters)
   - **Confirm Password:** Re-enter same password
   - ✅ Show/hide password button (👁️) works

5. **Submit Form**
   - Click "Create Account & Join Team"
   - ✅ Loading spinner appears
   - ✅ Button shows "Creating Account..."

6. **Automatic Magic Happens**
   - ✅ Account created in database
   - ✅ User automatically signed in
   - ✅ Invitation automatically accepted
   - ✅ Team membership created
   - ✅ Success message: "Account created and invitation accepted!"
   - ✅ Redirected to `/admin` dashboard

7. **Verify You're In!**
   - ✅ Dashboard loads
   - ✅ Organization name in header
   - ✅ Can see widgets (based on role)
   - ✅ Profile shows in top right
   - ✅ Fully functional team member!

### Expected Results:
- ✅ Seamless account creation
- ✅ No separate login needed
- ✅ One smooth flow from email to dashboard
- ✅ All permissions granted based on role

---

## 🌐 Test 2B: Create Account with Google OAuth

### Steps:

1. **Open Invitation Link** (incognito)

2. **Click "Sign up with Google"**
   - ✅ Google sign-in popup appears

3. **Choose Google Account**
   - Select or enter Google credentials
   - Must match or use invited email

4. **Automatic Flow**
   - ✅ Account created via Google
   - ✅ Invitation automatically accepted
   - ✅ Team membership created
   - ✅ Redirected to dashboard

5. **Verify**
   - ✅ Logged in with Google profile
   - ✅ Part of organization
   - ✅ Can access widgets

### Expected Results:
- ✅ Google OAuth creates account
- ✅ No password needed
- ✅ Invitation accepted automatically
- ✅ Full team access granted

---

## 🔐 Test 2C: Existing User Signs In Instead

### Steps:

1. **Open Invitation Link**

2. **Click "Already have an account? Sign in instead"**

3. **Redirected to Login**
   - ✅ URL includes `callbackUrl=/invitations/[token]`

4. **Sign In**
   - Enter existing credentials
   - Or use Google OAuth

5. **Auto-Redirect Back**
   - ✅ Brought back to invitation page
   - ✅ Now shows "Accept Invitation" (not "Create Account")

6. **Click "Accept Invitation"**
   - ✅ Instantly accepted (no form)
   - ✅ Redirected to dashboard

### Expected Results:
- ✅ Existing users can still sign in
- ✅ Callback preserves invitation
- ✅ Accept works immediately after login

---

## ✅ Test 3: Accept Invitation (Already Logged In)

### Steps:

1. **Log in with invited email FIRST**
   - Go to `/admin/login`
   - Sign in with the invited email address

2. **Then Open Invitation Link**
   - Click invitation link from email
   - Or paste URL directly

3. **Instant Accept**
   - Page loads showing invitation details
   - Click "Accept Invitation"
   - ✅ Immediately accepted (no redirect to login)
   - ✅ Success message shown
   - ✅ Redirected to dashboard

4. **Verify Access**
   - Organization switcher shows new organization
   - Can switch between organizations
   - Widgets filtered by organization

### Expected Results:
- ✅ No login required (already authenticated)
- ✅ One-click acceptance
- ✅ Immediate access to organization

---

## ✅ Test 4: Account Creation Form Validation 🆕

### Steps:

1. **Open invitation link** (logged out)

2. **Click "Create Account & Accept"**

3. **Test Empty Name:**
   - Leave name field empty
   - Fill password fields
   - Click submit
   - ✅ Error: "Please enter your full name"

4. **Test Short Password:**
   - Enter name: "Test User"
   - Enter password: "short" (< 8 chars)
   - Click submit
   - ✅ Error: "Password must be at least 8 characters"

5. **Test Password Mismatch:**
   - Enter name: "Test User"
   - Password: "password123"
   - Confirm: "password456"
   - Click submit
   - ✅ Error: "Passwords do not match"

6. **Test Valid Form:**
   - Name: "Test User"
   - Password: "password123"
   - Confirm: "password123"
   - Click submit
   - ✅ Success! Account created

### Expected Results:
- ✅ All validation errors shown clearly
- ✅ Form doesn't submit with invalid data
- ✅ Valid data creates account successfully

---

## ⚠️ Test 5: Email Mismatch Warning

### Steps:

1. **Log in with DIFFERENT email**
   - Sign in with Email A

2. **Open invitation sent to Email B**
   - Paste invitation link for Email B
   - Try to accept

3. **Verify Warning**
   - ✅ Warning message displayed:
     - "This invitation was sent to email-b@example.com"
     - "but you're logged in as email-a@example.com"
   - ✅ "Accept" button is **disabled**
   - ✅ Message instructs to log in with correct email

### Expected Results:
- ✅ Security check prevents wrong-email acceptance
- ✅ Clear error message
- ✅ Accept button disabled

---

## 🔄 Test 6: Resend Invitation

### Steps:

1. **Go to Organization Settings → Team Members**
2. **Find pending invitation**
3. **Click "Resend" button**
4. **Verify:**
   - ✅ Success toast: "Invitation resent successfully"
   - ✅ Expiry date extended (+7 days)
   - ✅ **New email sent** to invitee
5. **Check Email**
   - ✅ New invitation email received
   - ✅ New token in URL (different from first email)
   - ✅ Both old and new links still work (same invitation)

### Expected Results:
- ✅ New email sent
- ✅ Token regenerated
- ✅ Expiration extended
- ✅ Both tokens work (not expired)

---

## ❌ Test 7: Cancel Invitation

### Steps:

1. **Send a new invitation**
2. **Click "Cancel" button** in pending invitations
3. **Verify:**
   - ✅ Invitation disappears from list
   - ✅ Toast: "Invitation cancelled"
4. **Try to accept cancelled invitation**
   - Open the invitation link
   - ✅ Error page: "This invitation is no longer valid"
   - ✅ Status shown as "cancelled"

### Expected Results:
- ✅ Invitation removed from pending list
- ✅ Link no longer works
- ✅ Clear error message on acceptance attempt

---

## 👥 Test 8: Change Member Role

### Steps:

1. **Go to Organization Settings → Team Members**
2. **Find a team member** (not yourself, not owner)
3. **Click the "⋮" (three dots) menu button**
4. **Hover over "Change Role"**
5. **Select a different role** (e.g., change Member → Admin)
6. **Verify:**
   - ✅ Toast: "Role updated"
   - ✅ Badge changes to new role immediately
   - ✅ Checkmark (✓) shows current role in dropdown
7. **Test as that member:**
   - Log in as the member
   - Verify new permissions apply
   - Admins can now invite members, etc.

### Role Permissions Recap:

| Action | Viewer | Member | Admin | Owner |
|--------|--------|--------|-------|-------|
| View Widgets | ✅ | ✅ | ✅ | ✅ |
| Create Widgets | ❌ | ✅ | ✅ | ✅ |
| Delete Widgets | ❌ | ❌ | ✅ | ✅ |
| Invite Members | ❌ | ❌ | ✅ | ✅ |
| Change Roles | ❌ | ❌ | ✅ | ✅ |
| Remove Members | ❌ | ❌ | ❌ | ✅ |
| Delete Org | ❌ | ❌ | ❌ | ✅ |

### Expected Results:
- ✅ Role changes immediately
- ✅ Permissions update
- ✅ UI reflects new role

---

## 🚫 Test 9: Remove Team Member

### Steps:

1. **Go to Organization Settings → Team Members**
2. **Click "⋮" menu** on a member
3. **Click "Remove from Organization"** (red option)
4. **Confirmation Dialog Opens**
   - ✅ Shows member name
   - ✅ Warning about losing access
   - ✅ "Cannot be undone" message
5. **Click "Remove Member"**
6. **Verify:**
   - ✅ Toast: "Member removed"
   - ✅ Member disappears from list
   - ✅ Member count decreases
7. **Test as removed member:**
   - Log in as that user
   - ✅ Organization no longer in their list
   - ✅ Cannot access organization data

### Restrictions:
- ❌ Cannot remove yourself
- ❌ Cannot remove the owner
- ❌ Cannot remove last member
- ❌ Only owner/admin can remove

### Expected Results:
- ✅ Member removed successfully
- ✅ Access revoked immediately
- ✅ Data isolated properly

---

## 🔒 Test 10: Role Management Permissions

### Test as Different Roles:

#### As Viewer:
- ✅ Can see team members
- ❌ Cannot invite members (no button)
- ❌ Cannot change roles (no menu)
- ❌ Cannot remove members

#### As Member:
- ✅ Can see team members
- ❌ Cannot invite members (no button)
- ❌ Cannot change roles (no menu)
- ❌ Cannot remove members

#### As Admin:
- ✅ Can see team members
- ✅ **CAN** invite members
- ✅ **CAN** change roles (except owner)
- ❌ **CANNOT** remove members
- ❌ **CANNOT** transfer ownership
- ❌ **CANNOT** change owner's role

#### As Owner:
- ✅ Everything admins can do
- ✅ **CAN** remove members
- ✅ **CAN** transfer ownership
- ✅ **CAN** delete organization

---

## 🎯 Test 11: Transfer Ownership

### Steps:

1. **As organization owner**
2. **Go to Team Members**
3. **Click "⋮" on a member**
4. **Change Role → Owner**
5. **Verify:**
   - ✅ Toast: "Role updated"
   - ✅ Your role changes to "Admin"
   - ✅ Their role changes to "Owner"
   - ✅ Crown (👑) icon moves to them
   - ✅ You lose "Delete Organization" option
6. **Verify in database:**
   - Organization `ownerId` updated
   - Team member roles updated
   - Permissions updated

### Expected Results:
- ✅ Ownership transferred
- ✅ Old owner becomes admin
- ✅ New owner has full access
- ✅ Database consistent

---

## ❌ Test 12: Decline Invitation

### Steps:

1. **Send a new invitation**
2. **Open invitation link**
3. **Click "Decline" button**
4. **Verify:**
   - ✅ Message: "Invitation declined"
   - ✅ Redirected to dashboard
   - ✅ **Not** added to organization
5. **Check as admin:**
   - Invitation removed from pending list
   - Member not added
6. **Try to accept again:**
   - ✅ Link no longer works
   - ✅ Error: "This invitation is no longer valid"

### Expected Results:
- ✅ Invitation declined successfully
- ✅ No membership created
- ✅ Link invalidated

---

## ⏰ Test 13: Expired Invitation

### Steps:

**Note:** Invitations expire after 7 days. To test quickly:

1. **Manually expire an invitation in database:**
   ```javascript
   // In MongoDB Compass or script
   db.invitations.updateOne(
     { email: "test@example.com" },
     { $set: { expiresAt: new Date(Date.now() - 1000) } }
   )
   ```

2. **Try to accept expired invitation**
3. **Verify:**
   - ✅ Error page: "This invitation has expired"
   - ✅ Status shown as "expired"
   - ✅ Cannot accept

### Expected Results:
- ✅ Expired invitations rejected
- ✅ Clear error message
- ✅ Link no longer functional

---

## 🔄 Test 14: Multiple Organizations

### Steps:

1. **Create a second organization**
2. **Invite the same user to both**
3. **Accept both invitations**
4. **Verify:**
   - ✅ User is member of both organizations
   - ✅ Organization switcher shows both
   - ✅ Can switch between them
   - ✅ Widgets isolated per organization
   - ✅ Team members different per organization

### Expected Results:
- ✅ Multi-organization membership works
- ✅ Data properly isolated
- ✅ Context switching works

---

## 📋 Complete Testing Checklist

### Core Invitation Flow:
- [ ] Send invitation (email sent)
- [ ] Receive beautifully formatted email
- [ ] **NEW: Create account on invitation page** 🆕
- [ ] **NEW: Fill out account creation form** 🆕
- [ ] **NEW: Google sign up from invitation** 🆕
- [ ] **NEW: Form validation works** 🆕
- [ ] Accept invitation (already logged in)
- [ ] Accept invitation (existing user signs in first)
- [ ] Email mismatch warning works
- [ ] Resend invitation (new email + extended expiry)
- [ ] Cancel invitation (link stops working)
- [ ] Decline invitation (not added to org)
- [ ] Expired invitation rejected

### Role Management:
- [ ] Change member role (viewer → member)
- [ ] Change member role (member → admin)
- [ ] Change member role (admin → member)
- [ ] Transfer ownership (owner → admin, member → owner)
- [ ] Remove team member
- [ ] Cannot remove yourself
- [ ] Cannot remove owner
- [ ] Cannot remove last member

### Permissions:
- [ ] Viewer cannot invite/manage
- [ ] Member cannot invite/manage
- [ ] Admin can invite and change roles
- [ ] Admin cannot remove members
- [ ] Owner can do everything
- [ ] Role permissions apply correctly

### Email:
- [ ] Beautiful HTML email received
- [ ] Plain text alternative works
- [ ] Links work correctly
- [ ] Mobile responsive email
- [ ] Email sender correct (EMAIL_FROM)

### Security:
- [ ] Cannot accept invitation for different email
- [ ] Expired invitations rejected
- [ ] Cancelled invitations rejected
- [ ] Declined invitations cannot be re-accepted
- [ ] Duplicate invitations prevented

### UI/UX:
- [ ] Loading states show correctly
- [ ] Error messages are clear
- [ ] Success toasts appear
- [ ] Forms validate properly
- [ ] Buttons disabled during processing
- [ ] Invitation page looks good
- [ ] Mobile responsive

---

## 🐛 Common Issues & Solutions

### Issue: Email not received
**Solutions:**
- Check `RESEND_API_KEY` is set
- Check `EMAIL_FROM` is valid
- Check spam folder
- Check Resend dashboard for delivery status
- Verify email address is correct

### Issue: "Document failed validation"
**Solution:**
- Run: `node scripts/update-invitation-schema.js`
- This fixes the MongoDB schema validation

### Issue: Invitation link doesn't work
**Solutions:**
- Check `NEXT_PUBLIC_APP_URL` is set
- Restart dev server after adding env vars
- Verify token in database matches URL
- Check invitation not expired/cancelled

### Issue: Cannot change role
**Solutions:**
- Verify you're owner or admin
- Cannot change owner's role
- Cannot change your own role
- Check member status is "active"

### Issue: Cannot remove member
**Solutions:**
- Only owner can remove members
- Cannot remove yourself
- Cannot remove owner
- Cannot remove last member

---

## ✅ Success Criteria

Your invitation system is working correctly if:

1. ✅ Invitations send and emails arrive
2. ✅ Acceptance flow works (logged in/out)
3. ✅ Email mismatch prevented
4. ✅ Resend/cancel functions work
5. ✅ Role changes apply immediately
6. ✅ Member removal works
7. ✅ Permissions enforced correctly
8. ✅ Data isolated per organization
9. ✅ UI is responsive and polished
10. ✅ Errors handled gracefully

---

## 🎉 Completion

Once all tests pass, **Phase 3 is 100% complete!**

**Next:** 
- Phase 4: Advanced RBAC & Permissions
- Or: Deploy to production and gather user feedback

**Questions or issues?** Check the console logs for detailed error messages.

---

**Happy Testing!** 🚀

