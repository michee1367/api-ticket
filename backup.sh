#!/bin/bash

# Détecter le dossier où se trouve le script
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
sed -i 's/\r$//' .env.cron
# --- CHARGEMENT SÉCURISÉ DU .ENV.CRON ---
if [ -f .env.cron ]; then
    export $(echo $(grep -v '^#' .env.cron | xargs))
else
    echo "❌ Erreur : Le fichier .env.cron est introuvable."
    exit 1
fi
# --- CHARGEMENT SÉCURISÉ DU .ENV ---
echo "================================="
echo ""
echo "--- VÉRIFICATION DES VARIABLES CLÉS ---"
echo "CONTAINER : '$DB_TICKET_CONTAINER_NAME'"
echo "USER      : '$DB_TICKET_USER'"
echo "DATABASE  : '$DB_TICKET_NAME'"
echo "---------------------------------------"
echo ""

# --- CONFIGURATION ---
BACKUP_DIR="$DIR/backups"
DATE=$(date +%Y-%m-%d_%H%M%S)
FILENAME="backup_$DATE.sql.gz"

mkdir -p "$BACKUP_DIR"

# --- EXÉCUTION DU BACKUP VIA DOCKER ---
# ATTENTION : Pas d'espace entre -u / -p et les variables !
echo "$DB_TICKET_CONTAINER_NAME" mysqldump -u"$DB_TICKET_USER" -p"$DB_TICKET_PASSWORD" "$DB_TICKET_NAME"
docker exec -i "$DB_TICKET_CONTAINER_NAME" mysqldump -u"$DB_TICKET_USER" -p"$DB_TICKET_PASSWORD" "$DB_TICKET_NAME" 2>/dev/null | gzip > "$BACKUP_DIR/$FILENAME"

# Vérification du succès
if [ ${PIPESTATUS[0]} -eq 0 ]; then
    echo "$(date '+%Y-%m-%d %H:%M:%S') - Sauvegarde réussie : $BACKUP_DIR/$FILENAME"
else
    echo "$(date '+%Y-%m-%d %H:%M:%S') - ÉCHEC de la sauvegarde !" >&2
    rm -f "$BACKUP_DIR/$FILENAME" # Supprime le fichier vide créé en cas d'échec
    exit 1
fi

# --- NETTOYAGE ---
find "$BACKUP_DIR" -type f -mtime +7 -name "*.sql.gz" -delete
#unset $(grep -v '^#' .env.cron | sed 's/=.*//')