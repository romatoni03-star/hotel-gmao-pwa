# Environment Variables Reference

## Required Variables for Local Development

### Database
- **`DATABASE_URL`** - MySQL/TiDB connection string
  - Format: `mysql://user:password@host:port/database`
  - Example: `mysql://root:password@localhost:3306/hotel_gmao`

### Authentication & OAuth
- **`VITE_APP_ID`** - Manus OAuth application ID
  - Obtain from: Manus Dashboard → OAuth Apps
  
- **`JWT_SECRET`** - Secret key for signing JWT tokens
  - Generate: `openssl rand -base64 32`
  - Must be kept secure and consistent across deployments

- **`OAUTH_SERVER_URL`** - Manus OAuth server base URL
  - Value: `https://api.manus.im`

- **`VITE_OAUTH_PORTAL_URL`** - Manus login portal URL for frontend
  - Value: `https://manus.im/login`

### Owner Information
- **`OWNER_OPEN_ID`** - Your Manus account OpenID
  - Obtain from: Your Manus account settings

- **`OWNER_NAME`** - Your name or organization name
  - Example: `John Doe` or `Hotel Management Corp`

### Manus Built-in APIs
- **`BUILT_IN_FORGE_API_URL`** - Manus Forge API endpoint
  - Value: `https://api.manus.im/forge`

- **`BUILT_IN_FORGE_API_KEY`** - Server-side API key for Manus services
  - Obtain from: Manus Dashboard → API Keys
  - Used for: LLM, storage, notifications, data APIs

- **`VITE_FRONTEND_FORGE_API_URL`** - Frontend-accessible Forge API endpoint
  - Value: `https://api.manus.im/forge`

- **`VITE_FRONTEND_FORGE_API_KEY`** - Frontend API key for Manus services
  - Obtain from: Manus Dashboard → API Keys
  - Used for: Frontend-only operations (limited scope)

### App Configuration
- **`VITE_APP_TITLE`** - Application title displayed in UI
  - Example: `Hotel GMAO`

- **`VITE_APP_LOGO`** - Application logo URL
  - Format: CDN URL or S3 URL
  - Example: `https://cdn.example.com/logo.png`

### Analytics (Optional)
- **`VITE_ANALYTICS_ENDPOINT`** - Analytics service endpoint
  - Optional: Leave empty if not using analytics

- **`VITE_ANALYTICS_WEBSITE_ID`** - Analytics website/app ID
  - Optional: Leave empty if not using analytics

### Runtime
- **`NODE_ENV`** - Node.js environment
  - Values: `development` or `production`
  - Default: `development` for local, `production` for deployment

---

## How to Set Up Environment Variables

### Option 1: Create .env.local File

```bash
cat > .env.local << 'EOF'
DATABASE_URL=mysql://root:password@localhost:3306/hotel_gmao
VITE_APP_ID=your-app-id-here
JWT_SECRET=$(openssl rand -base64 32)
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://manus.im/login
OWNER_OPEN_ID=your-open-id
OWNER_NAME=Your Name
BUILT_IN_FORGE_API_URL=https://api.manus.im/forge
BUILT_IN_FORGE_API_KEY=your-api-key
VITE_FRONTEND_FORGE_API_URL=https://api.manus.im/forge
VITE_FRONTEND_FORGE_API_KEY=your-frontend-key
VITE_APP_TITLE=Hotel GMAO
VITE_APP_LOGO=https://cdn.example.com/logo.png
NODE_ENV=development
EOF
```

### Option 2: Export as Environment Variables

```bash
export DATABASE_URL="mysql://root:password@localhost:3306/hotel_gmao"
export VITE_APP_ID="your-app-id"
export JWT_SECRET="$(openssl rand -base64 32)"
# ... etc
```

### Option 3: Use Docker .env File

```bash
# Create .env file for docker-compose
DATABASE_URL=mysql://root:password@db:3306/hotel_gmao
VITE_APP_ID=your-app-id
# ... etc
```

---

## Security Best Practices

1. **Never commit secrets to Git**
   - Add `.env.local` to `.gitignore`
   - Use `.env.example` as template only

2. **Rotate secrets regularly**
   - Change `JWT_SECRET` periodically
   - Rotate API keys in Manus Dashboard

3. **Use different secrets per environment**
   - Development: Local secrets
   - Staging: Staging secrets
   - Production: Production secrets (never use dev secrets)

4. **Protect sensitive files**
   - Restrict file permissions: `chmod 600 .env.local`
   - Use secrets management tools in production

---

## Validation

To verify all required variables are set:

```bash
# Check if all required vars are defined
node -e "
const required = [
  'DATABASE_URL', 'VITE_APP_ID', 'JWT_SECRET',
  'OAUTH_SERVER_URL', 'OWNER_OPEN_ID', 'OWNER_NAME',
  'BUILT_IN_FORGE_API_URL', 'BUILT_IN_FORGE_API_KEY'
];
const missing = required.filter(v => !process.env[v]);
if (missing.length) {
  console.error('Missing variables:', missing.join(', '));
  process.exit(1);
}
console.log('✓ All required variables are set');
"
```

---

## Troubleshooting

### "Cannot connect to database"
- Check `DATABASE_URL` format
- Verify MySQL server is running
- Test connection: `mysql -u user -p -h host -D database`

### "OAuth callback failed"
- Verify `VITE_APP_ID` is correct
- Check `OAUTH_SERVER_URL` is accessible
- Ensure redirect URL is registered in OAuth app

### "API key rejected"
- Verify `BUILT_IN_FORGE_API_KEY` is valid
- Check if key has expired
- Regenerate key in Manus Dashboard

### "JWT token invalid"
- Ensure `JWT_SECRET` is consistent
- Check token hasn't expired
- Verify `JWT_SECRET` is not empty

---

## Reference: Where to Get Each Variable

| Variable | Source | How to Obtain |
|----------|--------|---------------|
| `DATABASE_URL` | Your MySQL/TiDB instance | Connection string from DB provider |
| `VITE_APP_ID` | Manus Dashboard | OAuth Apps → Create/View App |
| `JWT_SECRET` | Generate | `openssl rand -base64 32` |
| `OAUTH_SERVER_URL` | Manus | Fixed: `https://api.manus.im` |
| `VITE_OAUTH_PORTAL_URL` | Manus | Fixed: `https://manus.im/login` |
| `OWNER_OPEN_ID` | Your Manus account | Account Settings → OpenID |
| `OWNER_NAME` | Your name | Any string identifying you |
| `BUILT_IN_FORGE_API_URL` | Manus | Fixed: `https://api.manus.im/forge` |
| `BUILT_IN_FORGE_API_KEY` | Manus Dashboard | API Keys → Create/View Key |
| `VITE_FRONTEND_FORGE_API_KEY` | Manus Dashboard | API Keys → Create Frontend Key |
| `VITE_APP_TITLE` | Your choice | Any string (e.g., "Hotel GMAO") |
| `VITE_APP_LOGO` | Your CDN | URL to logo image |

---

## Notes

- All `VITE_*` variables are exposed to the frontend (not secrets)
- Server-side variables (like `BUILT_IN_FORGE_API_KEY`) are NOT exposed to frontend
- Variables are loaded from `.env.local` during development
- In production, use environment variable management (e.g., Kubernetes secrets, AWS Secrets Manager)
