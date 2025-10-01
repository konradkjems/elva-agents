# ✅ Production Testing Guide - Elva Widget Platform

## 📋 Pre-Testing Checklist

Before testing, ensure:
- [ ] Vercel deployment successful
- [ ] Environment variables configured
- [ ] MongoDB Atlas cluster running
- [ ] Domain configured (if applicable)
- [ ] Admin user created

## 🧪 Testing Scenarios

### 1. Authentication Testing

#### Admin Login
1. **Navigate to**: `https://your-domain.com/admin/login`
2. **Test with credentials**:
   - Email: `admin@elva-solutions.com`
   - Password: `admin123`
3. **Expected Result**: Successful login and redirect to admin dashboard

#### Session Management
1. **Test session persistence**: Refresh page, should stay logged in
2. **Test logout**: Click sign out, should redirect to login
3. **Test session timeout**: Wait 24 hours, should require re-login

### 2. Widget Management Testing

#### Create Widget
1. **Navigate to**: Admin dashboard → "Create Widget"
2. **Fill required fields**:
   - Widget name
   - Description
   - OpenAI prompt ID
3. **Configure appearance**:
   - Theme colors
   - Size and placement
   - Border radius
4. **Save widget**
5. **Expected Result**: Widget created successfully

#### Edit Widget
1. **Navigate to**: Widget list → Click on widget
2. **Modify settings**:
   - Change colors
   - Update messages
   - Modify branding
3. **Save changes**
4. **Expected Result**: Changes saved and reflected in preview

#### Delete Widget
1. **Navigate to**: Widget editor → Delete button
2. **Confirm deletion**
3. **Expected Result**: Widget removed from list

### 3. Widget Embed Testing

#### Generate Embed Code
1. **Navigate to**: Widget editor → "Embed Code" tab
2. **Copy embed code**
3. **Expected Result**: Valid HTML script tag generated

#### Test Widget on Website
1. **Create test HTML file**:
   ```html
   <!DOCTYPE html>
   <html>
   <head>
       <title>Widget Test</title>
   </head>
   <body>
       <h1>Testing Elva Widget</h1>
       <!-- Paste embed code here -->
       <script src="https://your-domain.com/api/widget-embed/WIDGET_ID"></script>
   </body>
   </html>
   ```
2. **Open in browser**
3. **Expected Result**: Widget loads and functions correctly

### 4. File Upload Testing

#### Upload Images
1. **Navigate to**: Widget editor → Branding settings
2. **Upload avatar image**
3. **Upload logo image**
4. **Expected Result**: Images upload successfully to Cloudinary

#### File Validation
1. **Test invalid files**:
   - Files too large (>10MB)
   - Unsupported formats
   - Malicious files
2. **Expected Result**: Proper error messages displayed

### 5. Analytics Testing

#### View Analytics
1. **Navigate to**: Admin dashboard → Analytics
2. **Check metrics**:
   - Total conversations
   - Total messages
   - Average response time
   - Satisfaction score
3. **Expected Result**: Analytics data displayed correctly

#### Track Events
1. **Use widget on test website**
2. **Send messages**
3. **Check analytics update**
4. **Expected Result**: Events tracked and displayed

### 6. API Testing

#### Widget API Endpoints
Test these endpoints:
- `GET /api/widget-embed/WIDGET_ID`
- `GET /api/widget-responses/WIDGET_ID`
- `POST /api/conversation`

#### Admin API Endpoints
Test these endpoints (require authentication):
- `GET /api/admin/widgets`
- `POST /api/admin/widgets`
- `PUT /api/admin/widgets/[id]`
- `DELETE /api/admin/widgets/[id]`

### 7. Performance Testing

#### Load Testing
1. **Test with multiple users**
2. **Monitor response times**
3. **Check database performance**
4. **Expected Result**: System handles load gracefully

#### Mobile Testing
1. **Test on mobile devices**
2. **Check responsive design**
3. **Test touch interactions**
4. **Expected Result**: Mobile experience works well

## 🚨 Common Issues & Solutions

### Authentication Issues
**Problem**: Cannot login to admin panel
**Solutions**:
- Check NEXTAUTH_SECRET is set
- Verify NEXTAUTH_URL matches domain
- Ensure admin user exists in database
- Check MongoDB connection

### Widget Not Loading
**Problem**: Widget doesn't appear on website
**Solutions**:
- Verify widget ID is correct
- Check CORS settings
- Ensure widget is active
- Test embed code syntax

### Database Connection Issues
**Problem**: Database operations fail
**Solutions**:
- Check MongoDB Atlas network access
- Verify connection string
- Check database user permissions
- Monitor MongoDB Atlas logs

### File Upload Issues
**Problem**: Images don't upload
**Solutions**:
- Check Cloudinary configuration
- Verify API keys
- Check file size limits
- Test with different file types

## 📊 Performance Benchmarks

### Expected Performance
- **Page Load Time**: < 2 seconds
- **API Response Time**: < 500ms
- **Widget Load Time**: < 1 second
- **File Upload**: < 5 seconds for 5MB image

### Monitoring Tools
- Vercel Analytics
- MongoDB Atlas Monitoring
- Cloudinary Analytics
- Browser DevTools

## 🔒 Security Testing

### Authentication Security
- [ ] Strong password requirements
- [ ] Session timeout works
- [ ] Logout clears session
- [ ] Admin routes protected

### Data Security
- [ ] Sensitive data encrypted
- [ ] File uploads validated
- [ ] SQL injection prevention
- [ ] XSS protection

### Network Security
- [ ] HTTPS enforced
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] Security headers present

## 📈 Monitoring Setup

### Error Tracking
1. **Set up Sentry** (optional):
   ```bash
   npm install @sentry/nextjs
   ```

2. **Configure error reporting**:
   - Monitor JavaScript errors
   - Track API errors
   - Monitor performance

### Uptime Monitoring
1. **Use services like**:
   - UptimeRobot
   - Pingdom
   - StatusCake

2. **Monitor endpoints**:
   - Main website
   - Admin panel
   - API endpoints
   - Widget embed URLs

## 🎯 Final Checklist

### Functionality
- [ ] Admin login works
- [ ] Widget creation works
- [ ] Widget editing works
- [ ] Widget deletion works
- [ ] File uploads work
- [ ] Analytics display correctly
- [ ] Widget embed codes work
- [ ] Widgets function on external sites

### Performance
- [ ] Page load times acceptable
- [ ] API response times good
- [ ] Mobile experience works
- [ ] Database performance good

### Security
- [ ] Authentication secure
- [ ] Admin routes protected
- [ ] File uploads secure
- [ ] HTTPS enforced
- [ ] CORS configured

### Monitoring
- [ ] Error tracking enabled
- [ ] Performance monitoring active
- [ ] Uptime monitoring configured
- [ ] Analytics working

---

**Congratulations!** 🎉 Your Elva Widget Platform is now ready for production!
