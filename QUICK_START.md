# 🚀 Aiser Platform - Quick Start

## One-Command Setup

```bash
# Run the setup script
./scripts/dev-setup.sh
```

## Manual Setup (if needed)

```bash
# 1. Install dependencies
npm install

# 2. Start services
docker-compose up -d

# 3. Setup database
cd packages/chat2chart/server
python create_missing_tables.py
cd ../..

# 4. Build frontend
cd packages/chat2chart/client
npm run build
cd ../..
```

## Access Points

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **Cube.js**: http://localhost:4000
- **Auth Service**: http://localhost:5000

## Test Credentials

- **Email**: test@dataticon.com
- **Password**: testpassword123

## Troubleshooting

If you encounter issues:

1. Check service status: `docker-compose ps`
2. View logs: `docker-compose logs -f`
3. Restart services: `docker-compose restart`
4. Full reset: `docker-compose down && docker-compose up -d`

## Development

- **Frontend**: `cd packages/chat2chart/client && npm run dev`
- **Backend**: `cd packages/chat2chart/server && python -m uvicorn app.main:app --reload`
- **Cube.js**: `cd packages/cube && npm run dev`
