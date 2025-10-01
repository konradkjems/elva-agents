# 🌐 Custom Domain Setup Guide - Elva Widget Platform

## 📋 Prerequisites
- Vercel project deployed
- Domain name purchased
- Access to domain DNS settings

## 🚀 Step-by-Step Domain Setup

### 1. Add Domain to Vercel

1. **Go to Vercel Dashboard**:
   - Navigate to your project
   - Click "Settings" → "Domains"

2. **Add Custom Domain**:
   - Click "Add Domain"
   - Enter your domain (e.g., `widgets.elva-solutions.com`)
   - Click "Add"

3. **Vercel will provide DNS instructions**:
   - Note the CNAME record value
   - Note the A record IP address

### 2. Configure DNS Records

#### For Root Domain (elva-solutions.com)
```
Type: A
Name: @
Value: 76.76.19.61
TTL: 3600
```

#### For Subdomain (widgets.elva-solutions.com)
```
Type: CNAME
Name: widgets
Value: cname.vercel-dns.com
TTL: 3600
```

#### Alternative: WWW Subdomain
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
TTL: 3600
```

### 3. Update Environment Variables

After domain is configured, update these in Vercel:

```env
NEXTAUTH_URL=https://widgets.elva-solutions.com
NEXT_PUBLIC_API_URL=https://widgets.elva-solutions.com
```

### 4. SSL Certificate

Vercel automatically provides SSL certificates:
- ✅ Automatic HTTPS redirect
- ✅ SSL certificate renewal
- ✅ HTTP/2 support
- ✅ Global CDN

## 🔧 DNS Provider Specific Instructions

### Cloudflare
1. **Add Domain**:
   - Go to Cloudflare Dashboard
   - Add your domain
   - Choose "Free" plan

2. **Configure DNS**:
   - Add A record: `@` → `76.76.19.61`
   - Add CNAME: `widgets` → `cname.vercel-dns.com`

3. **SSL Settings**:
   - SSL/TLS: "Full (strict)"
   - Always Use HTTPS: "On"

### GoDaddy
1. **DNS Management**:
   - Go to "My Products" → "DNS"
   - Click "Manage" next to your domain

2. **Add Records**:
   - A Record: `@` → `76.76.19.61`
   - CNAME: `widgets` → `cname.vercel-dns.com`

### Namecheap
1. **Advanced DNS**:
   - Go to Domain List → Manage
   - Click "Advanced DNS"

2. **Add Records**:
   - A Record: `@` → `76.76.19.61`
   - CNAME: `widgets` → `cname.vercel-dns.com`

## 🚨 Troubleshooting

### Common Issues

1. **Domain Not Resolving**:
   - Wait 24-48 hours for DNS propagation
   - Check DNS records are correct
   - Verify TTL settings

2. **SSL Certificate Issues**:
   - Ensure domain is properly configured in Vercel
   - Check DNS propagation is complete
   - Contact Vercel support if issues persist

3. **Redirect Loops**:
   - Check NEXTAUTH_URL matches your domain exactly
   - Verify HTTPS redirect settings
   - Clear browser cache

### DNS Propagation Check
Use these tools to check DNS propagation:
- [whatsmydns.net](https://www.whatsmydns.net)
- [dnschecker.org](https://dnschecker.org)

## 🔒 Security Considerations

### HTTPS Configuration
- ✅ Vercel provides automatic HTTPS
- ✅ HTTP to HTTPS redirect enabled
- ✅ HSTS headers configured
- ✅ SSL certificate auto-renewal

### Security Headers
Vercel automatically adds security headers:
- `Strict-Transport-Security`
- `X-Frame-Options`
- `X-Content-Type-Options`
- `Referrer-Policy`

## 📊 Performance Optimization

### CDN Configuration
- ✅ Global CDN enabled
- ✅ Edge caching configured
- ✅ Image optimization
- ✅ Automatic compression

### Monitoring
1. **Set up monitoring**:
   - Vercel Analytics
   - Uptime monitoring
   - Performance monitoring

2. **Configure alerts**:
   - Domain expiration alerts
   - SSL certificate alerts
   - Performance degradation alerts

## 🎯 Post-Domain Setup Checklist

- [ ] Domain resolves correctly
- [ ] HTTPS certificate active
- [ ] HTTP redirects to HTTPS
- [ ] Admin panel accessible
- [ ] Widget embed codes work
- [ ] Environment variables updated
- [ ] DNS propagation complete
- [ ] Performance monitoring enabled

## 📈 Scaling Considerations

### Multiple Domains
If you need multiple domains:
1. Add each domain in Vercel
2. Configure DNS for each domain
3. Update environment variables accordingly

### Subdomain Strategy
Consider using subdomains for different environments:
- `dev.widgets.elva-solutions.com` (development)
- `staging.widgets.elva-solutions.com` (staging)
- `widgets.elva-solutions.com` (production)

---

**Next Steps**: After domain setup, test all functionality and set up monitoring.
