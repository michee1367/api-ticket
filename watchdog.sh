#!/bin/bash

# Détecter le dossier où se trouve le script et charger le .env
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

sed -i 's/\r$//' .env.cron

if [ -f "$DIR/.env.cron" ]; then
    export $(grep -v '^#' "$DIR/.env.cron" | xargs)
else
    echo "Erreur : Fichier .env.cron introuvable dans $DIR"
    exit 1
fi
# --- CHARGEMENT SÉCURISÉ DU .ENV ---
echo "================================="
echo ""
echo "--- VÉRIFICATION DES VARIABLES CLÉS ---"
echo "PORT : '$API_TICKET_PORT'"
echo "PM2      : '$PM2_TICKET_APP_NAME'"
echo "---------------------------------------"
echo ""


LOG_FILE="$DIR/api_watchdog.log"

# Vérification si le port de l'API répond
if ! nc -z localhost "$API_TICKET_PORT"; then
    echo "$(date '+%Y-%m-%d %H:%M:%S') - PORT $API_TICKET_PORT INDISPONIBLE ! Redémarrage de PM2 ($PM2_TICKET_APP_NAME)..." >> "$LOG_FILE"
    
    # Redémarrage via PM2
    # Note : Sur certains serveurs, cron a besoin du chemin absolu de PM2. 
    # Si 'pm2' n'est pas trouvé, remplacez par /usr/bin/pm2 ou ~/.npm-global/bin/pm2
    pm2 restart "$PM2_TICKET_APP_NAME" >> "$LOG_FILE" 2>&1
else
    echo "OK"
    exit 0
fi