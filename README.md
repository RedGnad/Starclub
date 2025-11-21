# Starclub

**Blockchain-native gamified DApp discovery platform for Monad ecosystem**

Starclub is a production-ready web3 app that gamifies decentralized application discovery through real blockchain interaction verification. Built specifically for the Monad testnet / mainnet, it combines 3D visualization with on-chain activity analytics to create an engaging user experience that promotes authentic ecosystem engagement.

## Features

- **Interactive 3D Environment**: Immersive Spline-powered interface for DApp exploration
- **Cube Mission System**: Gamified challenges requiring real blockchain interactions
- **Real-time Verification**: Automated transaction monitoring and reward distribution
- **Wallet Integration**: SIWE authentication with multi-wallet support
- **Curated DApp Registry**: 7 verified SuperDApps across DeFi, GameFi, and infrastructure categories

## Architecture

### Frontend
- React 18 + TypeScript
- Spline 3D visualization
- Wagmi + Viem 
- TailwindCSS styling
- React Query state management

### Backend
- Node.js 18 + Express
- TypeScript + Prisma ORM
- SQLite database
- RESTful API design

### Blockchain Integration
- **BlockVision API**: Production-grade ready Monad indexing service
- **Direct RPC**: Alchemy Monad testnet endpoints
- **Smart Contract Monitoring**: Real-time interaction verification

## Deployment

- **Frontend**: [starclub-rho.vercel.app](https://starclub-rho.vercel.app)
- **Backend**: [starclub-backend.onrender.com](https://starclub-backend.onrender.com)

## Installation

```bash
# Install dependencies
npm install
cd backend && npm install

# Setup environment variables
cp .env.example .env
# Configure API keys and RPC endpoints

# Database setup
cd backend
npm run db:generate
npm run db:push

# Start development servers
npm run dev          # Frontend (port 3000)
cd backend && npm run dev  # Backend (port 4000)
```

## Environment Variables

### Frontend (.env)
```bash
REACT_APP_BACKEND_URL=http://localhost:4000
REACT_APP_MONAD_RPC_URL=https://monad-testnet.g.alchemy.com/v2/YOUR_KEY
REACT_APP_BLOCKVISION_API_KEY=your_blockvision_key
REACT_APP_SIWE_DOMAIN=localhost:3000
```

### Backend (backend/.env)
```bash
PORT=4000
NODE_ENV=development
DATABASE_URL=file:./dev.db
BLOCKVISION_API_KEY=your_blockvision_key
MONAD_RPC_URL=https://monad-testnet.g.alchemy.com/v2/YOUR_KEY
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dapps` | List verified SuperDApps |
| GET | `/api/user/{address}/interactions` | User blockchain interactions |
| POST | `/api/sessions/{address}/verification` | Store verification session |
| POST | `/api/cubes/{address}/increment` | Award cube tokens |
| GET | `/health` | Service health check |

## Smart Contract Registry

The platform monitors interactions with verified contracts:

- **Kuru Exchange**: Multi-contract DEX platform
- **Atlantis DEX**: Modular V4 exchange
- **Pingu Exchange**: Optimized swap platform
- **Magma Staking**: High-yield staking protocol
- **Monorail**: Advanced DEX with aggregated liquidity
- **Bean Exchange**: Spot trading platform
- **OctoSwap**: Multi-chain DEX

## Development

### Build
```bash
npm run build           # Frontend production build
cd backend && npm run build  # Backend production build
```

### Database
```bash
cd backend
npm run db:migrate      # Run database migrations
npm run db:studio       # Open Prisma Studio
```

## Contributing

This project follows TypeScript best practices with strict type checking. All blockchain interactions are verified through production-grade APIs to ensure data integrity.

## License

MIT
