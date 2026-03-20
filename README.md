# QuickCart — India Grocery Price Finder

Compare grocery prices across Blinkit, Zepto, Swiggy Instamart & BigBasket.

## Deploy in 10 minutes (free)

### Step 1 — Get your Anthropic API key
1. Go to https://console.anthropic.com
2. Create account → API Keys → Create Key
3. Copy the key (starts with `sk-ant-...`)

### Step 2 — Push to GitHub
1. Create a new repo at https://github.com/new
2. Run these commands in this folder:
   ```
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/quickcart.git
   git push -u origin main
   ```

### Step 3 — Deploy on Vercel (free)
1. Go to https://vercel.com and sign in with GitHub
2. Click "New Project" → Import your `quickcart` repo
3. In "Environment Variables" add:
   - Name: `ANTHROPIC_API_KEY`
   - Value: your key from Step 1
4. Click "Deploy"
5. Done! Your site is live at `https://quickcart-xxx.vercel.app`

### Run locally
```bash
npm install
# Add your key to .env.local
npm run dev
# Open http://localhost:3000
```

## Tech stack
- Next.js 14 (React framework)
- Anthropic Claude API (price estimation)
- Vercel (hosting, free tier)

## Important note
Prices are AI estimates from training data and may be outdated.
The app is designed to give directional guidance — always verify the real price by clicking "See Real Price" on each card.
