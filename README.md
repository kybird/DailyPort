This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Project Structure

- **`src/`**: Next.js Web Application (Frontend)
- **`stock-data-service/`**: Python Microservice for Market Data (Backend)
- **`admin-tools/`**: Utility scripts (e.g. initial DB setup)

## Deployment & Setup

This project uses a hybrid architecture (Next.js + Python).
For detailed setup and deployment instructions, please see **[doc/DEPLOYMENT.md](doc/DEPLOYMENT.md)**.

### Quick Start (Web)
```bash
npm install
npm run dev
```

### Quick Start (Data Service)
See `stock-data-service/README.md` or the main deployment guide.
```bash
cd stock-data-service
conda env create -f environment.yml
conda activate stock-data-service
python main.py
```

