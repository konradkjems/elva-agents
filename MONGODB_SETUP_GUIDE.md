# 🗄️ MongoDB Atlas Production Setup Guide

## 📋 Prerequisites
- MongoDB Atlas account (free tier available)
- Domain name for production deployment

## 🚀 Step-by-Step Setup

### 1. Create MongoDB Atlas Cluster

1. **Sign up/Login** to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. **Create New Project**:
   - Project Name: `Elva Widget Platform`
   - Organization: Your organization

3. **Build a Database**:
   - Choose **FREE** tier (M0 Sandbox)
   - Provider: AWS (recommended)
   - Region: Choose closest to your users (e.g., `eu-west-1` for Europe)
   - Cluster Name: `elva-widgets-cluster`

### 2. Configure Database Access

1. **Create Database User**:
   - Go to "Database Access" in left sidebar
   - Click "Add New Database User"
   - Authentication Method: Password
   - Username: `elva-admin`
   - Password: Generate secure password (save it!)
   - Database User Privileges: "Read and write to any database"

2. **Network Access**:
   - Go to "Network Access" in left sidebar
   - Click "Add IP Address"
   - For production: Click "Allow Access from Anywhere" (0.0.0.0/0)
   - For development: Add your current IP

### 3. Get Connection String

1. **Connect to Cluster**:
   - Go to "Database" in left sidebar
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Driver: Node.js
   - Version: 4.1 or later

2. **Copy Connection String**:
   ```
   mongodb+srv://elva-admin:<password>@elva-widgets-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

3. **Update with your password**:
   ```
   mongodb+srv://elva-admin:YOUR_PASSWORD@elva-widgets-cluster.xxxxx.mongodb.net/chatwidgets?retryWrites=true&w=majority
   ```

### 4. Environment Variables

Add to your `.env.local`:
```env
MONGODB_URI=mongodb+srv://elva-admin:YOUR_PASSWORD@elva-widgets-cluster.xxxxx.mongodb.net/chatwidgets?retryWrites=true&w=majority
```

### 5. Initialize Database

Run the initialization script:
```bash
npm run init-db
npm run create-admin
```

## 🔒 Security Best Practices

### Production Security
1. **Use Strong Passwords**: Minimum 12 characters with mixed case, numbers, symbols
2. **Enable IP Whitelisting**: Restrict access to known IP addresses
3. **Regular Backups**: Set up automated backups
4. **Monitor Access**: Enable MongoDB Atlas monitoring

### Environment Variables Security
- Never commit `.env.local` to version control
- Use different passwords for development and production
- Rotate passwords regularly
- Use MongoDB Atlas built-in security features

## 📊 Database Collections

The system will create these collections automatically:

### `widgets`
- Stores widget configurations
- Contains appearance, messages, branding settings
- Analytics data

### `conversations`
- Stores chat conversations
- Message history
- User interactions

### `users`
- Admin user accounts
- Authentication data
- User preferences

### `settings`
- System-wide settings
- API configurations
- Security settings

### `backups`
- Automated backup data
- System restore points

## 🚨 Troubleshooting

### Common Issues

1. **Connection Timeout**:
   - Check network access settings
   - Verify IP whitelist
   - Check firewall settings

2. **Authentication Failed**:
   - Verify username/password
   - Check database user permissions
   - Ensure connection string format

3. **Database Not Found**:
   - Run initialization scripts
   - Check database name in connection string
   - Verify cluster is running

### Support Resources
- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)
- [Connection String Guide](https://docs.atlas.mongodb.com/driver-connection/)
- [Security Best Practices](https://docs.atlas.mongodb.com/security/)

## 📈 Scaling Considerations

### When to Upgrade
- **M2/M5**: When you exceed 512MB storage
- **M10+**: For high-traffic production applications
- **Dedicated Clusters**: For enterprise applications

### Performance Optimization
- Create appropriate indexes
- Monitor query performance
- Use connection pooling
- Implement caching strategies

---

**Next Steps**: After setting up MongoDB Atlas, proceed to Vercel deployment configuration.
