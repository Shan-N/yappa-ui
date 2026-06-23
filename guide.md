<!-- #deployment details -->
# Complete EC2 Deployment Guide

Deploy the entire Yappa-RT system (realtime server + auth service + PostgreSQL + Redis + Nginx) to a single EC2 instance.

---

## What You're Deploying

```
                    Internet
                       │
                       ▼
              ┌─────────────────┐
              │   EC2 Instance   │
              │   (t3.medium)    │
              │                  │
              │  ┌────────────┐  │
              │  │   Nginx    │  │  ← Port 80 (HTTP)
              │  │  :80       │  │
              │  └─────┬──────┘  │
              │        │         │
              │   ┌────┼────┐    │
              │   ▼    ▼    ▼    │
              │ ┌──┐┌──┐┌──────┐│
              │ │rt││au││ static││  yappa-rt:8080 (WebSocket)
              │ │8080││3001│ webui││  yappa-auth:3001 (Auth API)
              │ └──┘└──┘└──────┘│
              │   │    │         │
              │   ▼    ▼         │
              │ ┌──────┐┌─────┐  │
              │ │Redis ││ PG  │  │  Redis:6379 (pub/sub + limits)
              │ │:6379 ││:5432│  │  PostgreSQL:5432 (storage)
              │ └──────┘└─────┘  │
              └──────────────────┘
```

| Component | What it does |
|-----------|-------------|
| **Nginx** | Routes traffic: `/api/*` to auth, `/ws` to realtime, `/` to your webui |
| **yappa-rt** | Rust WebSocket server for real-time messaging |
| **yappa-auth** | Node.js auth API: tenant creation, user registration, login |
| **PostgreSQL** | Stores tenants, users, and messages |
| **Redis** | Pub/sub for messaging, tenant user limits, refresh tokens |

---

## Phase 1: EC2 Instance Setup

### Step 1: Launch EC2 Instance

1. Go to **AWS Console → EC2 → Launch Instance**
2. Configure:
   - **Name:** `yappa-rt-server`
   - **AMI:** Ubuntu Server 24.04 LTS (x86)
   - **Instance type:** `t3.medium` (2 vCPU, 4GB RAM — minimum)
   - **Key pair:** Create or select existing (you need the `.pem` file)
   - **Storage:** 30 GB gp3 SSD
3. **Security Group** — create one named `yappa-rt-sg` with these inbound rules:

| Port | Protocol | Source | Purpose |
|------|----------|--------|---------|
| 22 | TCP | Your IP only | SSH access |
| 80 | TCP | 0.0.0.0/0 | HTTP (Nginx) |
| 443 | TCP | 0.0.0.0/0 | HTTPS (if you add TLS later) |

4. Click **Launch**

### Step 2: Connect to Your Instance

```bash
# Set permissions on your key
chmod 400 your-key.pem

# Connect (replace with your EC2 public IP)
ssh -i your-key.pem ubuntu@YOUR_EC2_PUBLIC_IP
```

### Step 3: Install Docker

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sudo sh

# Add ubuntu user to docker group (so you don't need sudo)
sudo usermod -aG docker ubuntu

# Install Docker Compose plugin
sudo apt install -y docker-compose-plugin

# Verify
docker --version
docker compose version

# Log out and back in for group change to take effect
exit
```

Reconnect:
```bash
ssh -i your-key.pem ubuntu@YOUR_EC2_PUBLIC_IP
```

---

## Phase 2: Deploy the System

### Step 4: Clone Repositories

```bash
# Create project directory
mkdir -p ~/yappa && cd ~/yappa

# Clone all three repos
git clone https://github.com/your-org/realtime-ws.git
git clone https://github.com/your-org/yappa-auth.git

# Verify structure
ls
# Should show: realtime-ws  yappa-auth
```

### Step 5: Create the Unified docker-compose.yml

Create `~/yappa/docker-compose.yml`:

```yaml
services:
  nginx:
    image: nginx:1.25-alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./webui-dist:/var/www/html:ro
    depends_on:
      auth:
        condition: service_healthy
      realtime:
        condition: service_healthy
    restart: unless-stopped

  realtime:
    build: ./realtime-ws
    environment:
      JWT_SECRET: ${JWT_SECRET}
      JWT_ISSUER: ${JWT_ISSUER:-yappa-rt}
      JWT_AUDIENCE: ${JWT_AUDIENCE:-realtime}
      REDIS_URL: redis://redis:6379
      DATABASE_URL: postgres://realtime:${POSTGRES_PASSWORD}@postgres:5432/realtime
      PERSISTENCE_MODE: direct
      CORS_ORIGINS: ${CORS_ORIGINS}
      MAX_USERS_PER_TENANT: 10
      PORT: "8080"
      RUST_LOG: info
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  auth:
    build: ./yappa-auth
    environment:
      JWT_SECRET: ${JWT_SECRET}
      JWT_ISSUER: ${JWT_ISSUER:-yappa-rt}
      JWT_AUDIENCE: ${JWT_AUDIENCE:-realtime}
      DATABASE_URL: postgres://realtime:${POSTGRES_PASSWORD}@postgres:5432/realtime
      REDIS_URL: redis://redis:6379
      CORS_ORIGINS: ${CORS_ORIGINS}
      MAX_USERS_PER_TENANT: 10
      PORT: "3001"
      NODE_ENV: production
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: realtime
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: realtime
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./realtime-ws/migrations:/docker-entrypoint-initdb.d:ro
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U realtime"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru
    volumes:
      - redis_data:/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
  redis_data:
```

### Step 6: Create nginx.conf

Create `~/yappa/nginx.conf`:

```nginx
worker_processes auto;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    sendfile on;
    keepalive_timeout 65;
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;

    upstream auth {
        server auth:3001;
    }
    upstream realtime {
        server realtime:8080;
    }

    server {
        listen 80;
        server_name _;

        # Auth API
        location /api/ {
            proxy_pass http://auth;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # WebSocket
        location /ws {
            proxy_pass http://realtime;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_read_timeout 86400s;
            proxy_buffering off;
        }

        # Health
        location /health {
            proxy_pass http://realtime;
        }

        # WebUI (your built frontend goes in webui-dist/)
        location / {
            root /var/www/html;
            index index.html;
            try_files $uri $uri/ /index.html;
        }
    }
}
```

### Step 7: Create .env

```bash
cd ~/yappa

# Generate secrets
JWT_SECRET=$(openssl rand -base64 32)
POSTGRES_PASSWORD=$(openssl rand -base64 16)

# Get your EC2 public DNS for CORS
EC2_DNS=$(curl -s http://169.254.169.254/latest/meta-data/public-hostname)

cat > .env << EOF
JWT_SECRET=${JWT_SECRET}
JWT_ISSUER=yappa-rt
JWT_AUDIENCE=realtime
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
CORS_ORIGINS=http://${EC2_DNS},http://localhost
EOF

echo "=== Save these values ==="
cat .env
```

### Step 8: Build and Start

```bash
cd ~/yappa

# Build and start all services (takes ~3-5 minutes for Rust build)
docker compose up -d --build

# Watch the build progress
docker compose logs -f

# When you see "Auth service listening on :3001" and "Server exited successfully" is NOT shown, it's running

# Check all services are healthy
docker compose ps

# Test health
curl http://localhost/health
# Expected: OK
```

### Step 9: Create a Placeholder WebUI

Until you build your real WebUI, create a placeholder so Nginx doesn't error:

```bash
mkdir -p ~/yappa/webui-dist
echo '<html><body><h1>Yappa-RT is running</h1><p>WebUI coming soon</p></body></html>' > ~/yappa/webui-dist/index.html

# Restart nginx to pick up the new files
docker compose restart nginx
```

### Step 10: Verify the Deployment

```bash
# Test auth service
curl -X POST http://localhost/api/tenants \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "test-company",
    "name": "Test Company",
    "user_id": "admin",
    "password": "Password123!",
    "display_name": "Admin User"
  }'

# Expected response:
# {"message":"Tenant created","tenant":{...},"user":{...},"access_token":"eyJ...","token_type":"Bearer","expires_in":300}

# Test with external IP
EC2_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)
curl http://${EC2_IP}/health
# Expected: OK
```

---

## Phase 3: The Tenant System

### How Tenant Creation Works

The auth service now manages tenants with a hard 10-user cap:

```
                    ┌──────────────────┐
                    │  Your WebUI      │
                    └────────┬─────────┘
                             │
            ┌────────────────┼────────────────┐
            ▼                ▼                ▼
     POST /api/tenants  POST /api/register  POST /api/login
            │                │                │
            ▼                ▼                ▼
     ┌───────────────────────────────────────────┐
     │            yappa-auth (:3001)              │
     │                                           │
     │  1. Create tenant + admin (POST /tenants) │
     │  2. Register user — checks 10-user cap    │
     │  3. Login — returns JWT                   │
     └──────────────────┬────────────────────────┘
                        │
                        ▼
     ┌───────────────────────────────────────────┐
     │     PostgreSQL                             │
     │                                           │
     │  tenants table:  tenant_id, name           │
     │  users table:    tenant_id, user_id,       │
     │                  password_hash, role       │
     └───────────────────────────────────────────┘
```

### The 10-User Limit (Two Layers)

| Layer | Where | What happens |
|-------|-------|-------------|
| **Registration** | yappa-auth + PostgreSQL | Can't register more than 10 users per tenant. Returns 429. |
| **Connection** | yappa-rt + Redis | Can't have more than 10 concurrent WebSocket connections per tenant. Returns 429. |

This means: a tenant can have at most 10 registered users, and at most 10 simultaneous connections.

---

## Phase 4: Complete API Reference for Your WebUI

### Base URL

```
http://YOUR-EC2-PUBLIC-IP
```

All API calls go through Nginx on port 80. Your WebUI talks to these endpoints.

### Authentication Endpoints

#### 1. Create Tenant (Signup)

Creates a new tenant workspace + the first admin user. Returns access token immediately.

```
POST /api/tenants
Content-Type: application/json

{
  "tenant_id": "my-startup",          // 2-64 chars, letters/numbers/hyphens
  "name": "My Startup",               // Display name
  "user_id": "alice",                 // Admin username
  "password": "SecurePass123!",
  "display_name": "Alice"             // Optional
}
```

**Response (201):**
```json
{
  "message": "Tenant created",
  "tenant": {
    "tenant_id": "my-startup",
    "name": "My Startup",
    "max_users": 10
  },
  "user": {
    "tenant_id": "my-startup",
    "user_id": "alice",
    "display_name": "Alice",
    "role": "admin"
  },
  "access_token": "eyJhbG...",
  "token_type": "Bearer",
  "expires_in": 300
}
```

**Errors:**
- `409` — Tenant already exists
- `400` — Invalid input

---

#### 2. Register Additional User

Adds a user to an existing tenant. Enforces 10-user cap.

```
POST /api/register
Content-Type: application/json

{
  "tenant_id": "my-startup",
  "user_id": "bob",
  "password": "SecurePass123!",
  "display_name": "Bob"
}
```

**Response (201):**
```json
{ "message": "User created" }
```

**Errors:**
- `404` — Tenant doesn't exist
- `409` — User already exists
- `429` — Tenant has reached 10-user limit

---

#### 3. Login

```
POST /api/login
Content-Type: application/json

{
  "tenant_id": "my-startup",
  "user_id": "alice",
  "password": "SecurePass123!"
}
```

**Response (200):**
```json
{
  "access_token": "eyJhbG...",
  "token_type": "Bearer",
  "expires_in": 300,
  "user": {
    "tenant_id": "my-startup",
    "user_id": "alice",
    "display_name": "Alice"
  }
}
```

Also sets `refresh_token` HTTP-only cookie.

---

#### 4. Refresh Token

```
POST /api/refresh
```

No body needed. Uses the HTTP-only cookie automatically.

**Response (200):**
```json
{
  "access_token": "eyJhbG...",
  "token_type": "Bearer",
  "expires_in": 300
}
```

---

#### 5. Logout

```
POST /api/logout
```

Revokes refresh token, clears cookie.

---

#### 6. Get Current User

```
GET /api/me
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "tenant_id": "my-startup",
  "user_id": "alice",
  "display_name": "Alice",
  "role": "admin"
}
```

---

#### 7. Get Tenant Info (user list)

```
GET /api/tenants/my-startup
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "tenant_id": "my-startup",
  "name": "My Startup",
  "created_at": "2026-01-15T10:30:00Z",
  "user_count": 3,
  "max_users": 10,
  "users": [
    { "user_id": "alice", "display_name": "Alice", "role": "admin", "created_at": "..." },
    { "user_id": "bob", "display_name": "Bob", "role": "member", "created_at": "..." },
    { "user_id": "carol", "display_name": "Carol", "role": "member", "created_at": "..." }
  ]
}
```

---

### WebSocket Endpoint

```
GET /ws
Authorization: Bearer <access_token>
```

Or for browsers (native WebSocket can't set headers):
```
ws://YOUR-EC2-IP/ws?token=<access_token>
```

---

## Phase 5: How Your WebUI Should Work

### Screen 1: Landing Page

Two buttons:
- **Create Workspace** → goes to tenant creation form
- **Sign In** → goes to login form

### Screen 2: Create Workspace Form

Fields:
- Workspace ID (`tenant_id`) — e.g., "my-startup"
- Workspace Name — e.g., "My Startup Inc"
- Your Username (`user_id`) — e.g., "alice"
- Display Name — e.g., "Alice"
- Password

On submit → `POST /api/tenants`

On success → store `access_token` in memory (NOT localStorage — XSS risk), store refresh in HTTP-only cookie (automatic). Redirect to dashboard.

### Screen 3: Login Form

Fields:
- Workspace ID
- Username
- Password

On submit → `POST /api/login`

On success → redirect to dashboard.

### Screen 4: Dashboard

Show:
- Tenant name + ID
- User count (e.g., "3 / 10 users")
- Button to view team members (`GET /api/tenants/:id`)
- Admin can see a "Invite User" form (shares tenant_id + lets new user register)

### Screen 5: Invite User Flow

Admin shares a signup link or code. The invitee goes to:
- **Register page** with `tenant_id` pre-filled
- Enters their username + password
- `POST /api/register`

### Screen 6: Chat

- Left sidebar: user list, group list
- Main area: messages
- Use the SDK to connect:

```javascript
import { RealtimeClient } from '@yappa-rs/yappa-sdk';

const client = new RealtimeClient({
  url: 'ws://YOUR-EC2-IP/ws',
  token: accessToken,           // from login
  authMode: 'query',            // browser WebSocket can't set headers
  refreshUrl: '/api/refresh',   // auto-refresh
});

client.on('dm', (msg) => appendMessage(msg));
client.on('group_message', (msg) => appendMessage(msg));

await client.connect();
```

---

## Phase 6: Deploying Your WebUI

Once you build your frontend (React/Vue/whatever):

```bash
# On your local machine, build the WebUI
cd your-webui-project
npm run build

# Copy the built files to EC2
scp -r -i your-key.pem dist/* ubuntu@YOUR_EC2_IP:~/yappa/webui-dist/

# On EC2, restart nginx to serve new files
ssh -i your-key.pem ubuntu@YOUR_EC2_IP
docker compose restart nginx
```

Your WebUI is now live at `http://YOUR-EC2-PUBLIC-IP`.

---

## Operations Cheatsheet

```bash
# View logs
docker compose logs -f realtime    # WebSocket server
docker compose logs -f auth        # Auth service
docker compose logs -f nginx       # Nginx proxy

# Check service status
docker compose ps

# Restart a service
docker compose restart realtime
docker compose restart auth

# Rebuild after code changes
cd ~/yappa/realtime-ws && git pull
cd ~/yappa && docker compose up -d --build realtime

# SSH into a container
docker compose exec realtime sh
docker compose exec auth sh

# Database queries
docker compose exec postgres psql -U realtime -d realtime -c "SELECT * FROM tenants;"
docker compose exec postgres psql -U realtime -d realtime -c "SELECT tenant_id, user_id, role FROM users;"
docker compose exec postgres psql -U realtime -d realtime -c "SELECT * FROM messages ORDER BY created_at DESC LIMIT 10;"

# Redis commands
docker compose exec redis redis-cli KEYS "*"
docker compose exec redis redis-cli SCARD "online:{my-startup}"

# Full restart
docker compose down
docker compose up -d

# Full reset (DELETES ALL DATA)
docker compose down -v
docker compose up -d
```

---

## Security Hardening Checklist

```bash
# 1. Set up firewall (only allow SSH + HTTP)
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# 2. Disable password SSH (key-only)
sudo sed -i 's/PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo systemctl restart sshd

# 3. Set up automatic security updates
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades

# 4. Your .env file should NOT be in git
echo ".env" >> ~/yappa/.gitignore
```

---

## Adding TLS (HTTPS)

For production, you need HTTPS so that WebSocket Secure (WSS) works and tokens aren't leaked in transit.

```bash
# 1. Get a domain name pointing to your EC2 IP
# 2. Install certbot
sudo apt install -y certbot python3-certbot-nginx

# 3. Get certificate (stops Nginx temporarily)
sudo docker compose stop nginx
sudo certbot certonly --standalone -d your-domain.com
sudo docker compose start nginx

# 4. Update nginx.conf to use TLS (uncomment the HTTPS server block)
# 5. Update CORS_ORIGINS in .env to https://your-domain.com
# 6. Restart
docker compose restart nginx realtime auth
```
<!-- web ui guide -->

# WebUI Integration Quick Reference

Everything you need to build your WebUI for the Yappa-RT system.

---

## System Overview

Your WebUI talks to two services through Nginx:

```
Browser → Nginx (:80) → /api/* → yappa-auth (:3001)
                       → /ws    → yappa-rt (:8080)
                       → /*     → Static files (your WebUI)
```

---

## API Endpoints Summary

### Auth Endpoints

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/tenants` | POST | No | Create workspace + admin user |
| `/api/register` | POST | No | Register additional user (max 10/tenant) |
| `/api/login` | POST | No | Login, get access token |
| `/api/refresh` | POST | Cookie | Refresh access token |
| `/api/logout` | POST | Cookie | Logout |
| `/api/me` | GET | Bearer | Get current user info |
| `/api/tenants/:id` | GET | Bearer | Get tenant info + user list |

### WebSocket Endpoint

| Endpoint | Auth |
|----------|------|
| `/ws` | Bearer token in header OR `?token=` query param |

---

## Request/Response Examples

### 1. Create Workspace (First User)

**Request:**
```http
POST /api/tenants
Content-Type: application/json

{
  "tenant_id": "acme-corp",
  "name": "Acme Corporation",
  "user_id": "admin",
  "password": "SecurePass123!",
  "display_name": "Admin User"
}
```

**Response (201):**
```json
{
  "message": "Tenant created",
  "tenant": {
    "tenant_id": "acme-corp",
    "name": "Acme Corporation",
    "max_users": 10
  },
  "user": {
    "tenant_id": "acme-corp",
    "user_id": "admin",
    "display_name": "Admin User",
    "role": "admin"
  },
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 300
}
```

**Errors:**
- `400` — Invalid input (field validation failed)
- `409` — Tenant ID already taken

---

### 2. Register Additional User

**Request:**
```http
POST /api/register
Content-Type: application/json

{
  "tenant_id": "acme-corp",
  "user_id": "bob",
  "password": "SecurePass123!",
  "display_name": "Bob Smith"
}
```

**Response (201):**
```json
{ "message": "User created" }
```

**Errors:**
- `404` — Tenant doesn't exist
- `409` — Username already taken in this tenant
- `429` — Tenant reached 10-user limit

---

### 3. Login

**Request:**
```http
POST /api/login
Content-Type: application/json

{
  "tenant_id": "acme-corp",
  "user_id": "bob",
  "password": "SecurePass123!"
}
```

**Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 300,
  "user": {
    "tenant_id": "acme-corp",
    "user_id": "bob",
    "display_name": "Bob Smith"
  }
}
```

Plus sets HTTP-only cookie: `refresh_token`

---

### 4. Refresh Token

**Request:**
```http
POST /api/refresh
Cookie: refresh_token=<uuid>
```

**Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 300
}
```

---

### 5. Get Current User

**Request:**
```http
GET /api/me
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response (200):**
```json
{
  "tenant_id": "acme-corp",
  "user_id": "bob",
  "display_name": "Bob Smith",
  "role": "member"
}
```

---

### 6. Get Tenant Info

**Request:**
```http
GET /api/tenants/acme-corp
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response (200):**
```json
{
  "tenant_id": "acme-corp",
  "name": "Acme Corporation",
  "created_at": "2026-01-15T10:30:00.000Z",
  "user_count": 3,
  "max_users": 10,
  "users": [
    {
      "user_id": "admin",
      "display_name": "Admin User",
      "role": "admin",
      "created_at": "2026-01-15T10:30:00.000Z"
    },
    {
      "user_id": "bob",
      "display_name": "Bob Smith",
      "role": "member",
      "created_at": "2026-01-15T11:00:00.000Z"
    },
    {
      "user_id": "carol",
      "display_name": "Carol Jones",
      "role": "member",
      "created_at": "2026-01-15T11:30:00.000Z"
    }
  ]
}
```

---

### 7. Logout

**Request:**
```http
POST /api/logout
Cookie: refresh_token=<uuid>
```

**Response (200):**
```json
{ "message": "Logged out" }
```

---

## WebSocket Protocol

### Connecting

**Option 1: Header (Node.js, not browser)**
```javascript
const ws = new WebSocket('ws://your-server/ws', {
  headers: { 'Authorization': 'Bearer ' + accessToken }
});
```

**Option 2: Query Param (Browser)**
```javascript
const ws = new WebSocket('ws://your-server/ws?token=' + accessToken);
```

---

### Client → Server Messages

#### Direct Message
```json
{
  "channel_type": "DM",
  "user_id": "recipient_user_id",
  "content": "Hello, how are you?"
}
```

#### Group Message
```json
{
  "channel_type": "GROUP",
  "user_id": "group-id",
  "content": "Hello everyone!"
}
```

#### Join Group
```json
{
  "msg_type": "JOIN",
  "tenant_id": "acme-corp",
  "group_id": "general",
  "user_id": "bob"
}
```

#### Leave Group
```json
{
  "msg_type": "LEAVE",
  "tenant_id": "acme-corp",
  "group_id": "general",
  "user_id": "bob"
}
```

#### Create Group
```json
{
  "msg_type": "CREATE",
  "tenant_id": "acme-corp",
  "group_id": "new-group",
  "user_id": "bob"
}
```

#### Delete Group
```json
{
  "msg_type": "DELETE",
  "tenant_id": "acme-corp",
  "group_id": "old-group",
  "user_id": "bob"
}
```

---

### Server → Client Messages

#### Chat Message
```json
{
  "type": "chat",
  "message_id": "550e8400-e29b-41d4-a716-446655440000",
  "tenant_id": "acme-corp",
  "channel_type": "DM",
  "channel_id": "alice",
  "sender_id": "bob",
  "timestamp": 1705312800,
  "conversation_id": "660e8400-e29b-41d4-a716-446655440001",
  "payload": {
    "text": "Hello, how are you?",
    "meta": {}
  }
}
```

#### Group Join Notification
```json
{
  "type": "group_join",
  "message_id": "550e8400-e29b-41d4-a716-446655440002",
  "tenant_id": "acme-corp",
  "channel_type": "GROUP",
  "channel_id": "general",
  "sender_id": "bob",
  "timestamp": 1705312800,
  "conversation_id": "660e8400-e29b-41d4-a716-446655440003",
  "payload": {
    "text": "bob has joined the group",
    "meta": {}
  }
}
```

---

## SDK Usage

### Install

```bash
npm install /path/to/yappa-sdk
# or
npm install @yappa-rs/yappa-sdk
```

### Basic Setup

```javascript
import { RealtimeClient } from '@yappa-rs/yappa-sdk';

let client;

async function connect(accessToken) {
  client = new RealtimeClient({
    url: 'ws://your-server/ws',
    token: accessToken,
    authMode: 'query',           // Use 'query' for browsers
    refreshUrl: '/api/refresh',  // Auto-refresh tokens
    reconnect: true,
    logLevel: 'warn',
  });

  // Event handlers
  client.on('connected', () => {
    console.log('WebSocket connected');
    updateConnectionStatus(true);
  });

  client.on('disconnected', (reason) => {
    console.log('Disconnected:', reason);
    updateConnectionStatus(false);
  });

  client.on('message', (msg) => {
    console.log('Any message:', msg);
  });

  client.on('dm', (msg) => {
    displayDirectMessage(msg.sender_id, msg.payload.text);
  });

  client.on('group_message', (msg) => {
    displayGroupMessage(msg.channel_id, msg.sender_id, msg.payload.text);
  });

  client.on('group_join', (msg) => {
    notifyGroupJoin(msg.channel_id, msg.sender_id);
  });

  client.on('error', (err) => {
    console.error('SDK error:', err);
  });

  await client.connect();
}
```

### Send Direct Message

```javascript
function sendDM(recipientId, text) {
  client.sendDM(recipientId, text);
}
```

### Send Group Message

```javascript
function sendGroupMsg(groupId, text) {
  client.sendGroupMessage(groupId, text);
}
```

### Manage Groups

```javascript
// Create a group
client.createGroup('general');

// Join a group
client.joinGroup('general');

// Leave a group
client.leaveGroup('general');

// Delete a group (if you're admin/creator)
client.deleteGroup('general');
```

### Disconnect

```javascript
client.disconnect();
```

---

## Token Management Best Practices

### In Memory Only

```javascript
// ✅ Good: Store in memory
let accessToken = null;

async function login(tenantId, userId, password) {
  const res = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tenant_id: tenantId, user_id: userId, password }),
    credentials: 'include'  // Important: includes cookies
  });
  
  if (!res.ok) throw new Error('Login failed');
  
  const data = await res.json();
  accessToken = data.access_token;
  return data;
}

// ❌ Bad: Never store in localStorage/sessionStorage
// localStorage.setItem('token', data.access_token);  // XSS vulnerable!
```

### Auto-Refresh Before Expiry

The SDK handles this automatically if you provide `refreshUrl`. The access token expires in 5 minutes; SDK refreshes at 4 minutes.

---

## UI Flow Recommendations

### Screen 1: Landing

```
┌────────────────────────────────────┐
│         Yappa-RT Chat              │
│                                    │
│   ┌──────────────┐ ┌────────────┐ │
│   │  Create New   │ │   Sign In  │ │
│   │  Workspace    │ │            │ │
│   └──────────────┘ └────────────┘ │
│                                    │
└────────────────────────────────────┘
```

### Screen 2: Create Workspace

```
┌────────────────────────────────────┐
│      Create Your Workspace         │
│                                    │
│  Workspace ID: [acme-corp    ]     │
│  Workspace Name: [Acme Corp  ]    │
│                                    │
│  Your Username: [admin       ]    │
│  Display Name: [Admin User  ]     │
│  Password:     [••••••••••  ]     │
│                                    │
│         [ Create Workspace ]       │
│                                    │
└────────────────────────────────────┘
```

### Screen 3: Sign In

```
┌────────────────────────────────────┐
│           Sign In                  │
│                                    │
│  Workspace ID: [acme-corp    ]     │
│  Username:     [bob          ]    │
│  Password:     [••••••••••  ]     │
│                                    │
│            [ Sign In ]             │
│                                    │
└────────────────────────────────────┘
```

### Screen 4: Dashboard

```
┌─────────────────────────────────────────────────────┐
│  Acme Corp                        [Users: 3/10]     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌─────────────┐  ┌──────────────────────────────┐ │
│  │ Users       │  │    Chat Area                  │ │
│  │ ─────────── │  │                              │ │
│  │ admin       │  │  bob: Hey everyone!          │ │
│  │ bob         │  │  carol: Hi!                   │ │
│  │ carol       │  │                              │ │
│  │             │  │                              │ │
│  │ Groups      │  │                              │ │
│  │ ─────────── │  │                              │ │
│  │ #general    │  │                              │ │
│  │ #random     │  │                              │ │
│  │             │  └──────────────────────────────┘ │
│  │             │  ┌──────────────────────────────┐ │
│  │             │  │ Type message...   [Send]     │ │
│  └─────────────┘  └──────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

### Screen 5: Invite User (Admin Only)

```
┌────────────────────────────────────┐
│       Invite Team Member          │
│                                    │
│  Share this workspace ID with      │
│  your team member:                 │
│                                    │
│  ┌─────────────────────────────┐  │
│  │  acme-corp                  │  │
│  └─────────────────────────────┘  │
│            [ Copy ]                │
│                                    │
│  They can register at:             │
│  /register?tenant=acme-corp        │
│                                    │
│  ┌─────────────────────────────┐  │
│  │  Users: 3/10                │  │
│  └─────────────────────────────┘  │
│                                    │
└────────────────────────────────────┘
```

---

## Error Handling

### HTTP Status Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200 | Success | Proceed |
| 201 | Created | New resource created |
| 400 | Bad Request | Show validation errors |
| 401 | Unauthorized | Redirect to login |
| 403 | Forbidden | Show "you don't have permission" |
| 404 | Not Found | Show "tenant/user not found" |
| 409 | Conflict | Show "already exists" |
| 429 | Too Many Requests | Show "tenant full" (10 users) |
| 500 | Server Error | Show "try again later" |

### WebSocket Close Codes

| Code | Meaning |
|------|---------|
| 1000 | Normal close |
| 1001 | Going away |
| 1006 | Abnormal close (no close frame) |
| 1008 | Policy violation (invalid token) |
| 1011 | Internal error |

---

## Testing Your Integration

### Using curl

```bash
# Create tenant
curl -X POST http://localhost/api/tenants \
  -H "Content-Type: application/json" \
  -d '{"tenant_id":"test","name":"Test","user_id":"admin","password":"Password123!"}'

# Login
curl -X POST http://localhost/api/login \
  -H "Content-Type: application/json" \
  -d '{"tenant_id":"test","user_id":"admin","password":"Password123!"}'

# Get tenant info (replace TOKEN)
curl http://localhost/api/tenants/test \
  -H "Authorization: Bearer TOKEN"

# WebSocket test (using wscat)
wscat -c "ws://localhost/ws?token=TOKEN"
```

### Using the SDK in Node.js

```javascript
import { RealtimeClient } from '@yappa-rs/yappa-sdk';

async function test() {
  // Login first
  const loginRes = await fetch('http://localhost/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tenant_id: 'test',
      user_id: 'admin',
      password: 'Password123!'
    })
  });
  const { access_token } = await loginRes.json();

  // Connect
  const client = new RealtimeClient({
    url: 'ws://localhost/ws',
    token: access_token,
    authMode: 'query',
    logLevel: 'debug',
  });

  client.on('message', console.log);
  await client.connect();

  // Test
  client.sendDM('bob', 'Hello from Node.js!');
}

test();
```

---

## Production Checklist

Before going live:

- [ ] Change `JWT_SECRET` to a secure random value
- [ ] Set `CORS_ORIGINS` to only your WebUI domain
- [ ] Enable HTTPS (WSS for WebSocket)
- [ ] Don't store tokens in localStorage (XSS risk)
- [ ] Use HTTP-only cookies for refresh tokens
- [ ] Set `NODE_ENV=production` on auth service
- [ ] Set up PostgreSQL backups
- [ ] Configure rate limiting (add Nginx rate limit)
- [ ] Set up monitoring/logs
