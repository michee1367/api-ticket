# DEV
 npx prisma generate
 npx prisma migrate dev --name ini
 npm run dev

# PROD

npx prisma db push
npx tsc
npm install -g pm2
# Si votre fichier de sortie est dans dist/server.js
pm2 start dist/server.js --name "api-retraite-prod"
pm2 startup
pm2 save