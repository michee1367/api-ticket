//const { PrismaClient } = require('@prisma/client');
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();


/*export async function getPartipantBadgetNumber() {
  const count = await prisma.participant.count({
    where: {
      status: "confirme"
    }
  });

  const year = new Date().getFullYear();
  const registrationNumber = `${year}-${String(count + 1).padStart(4, "0")}`;
  
  return registrationNumber
    
}*/

/**
 * Trouve le premier ID de chambre disponible selon le genre du participant.
 * @param {string} participantGender - "homme" ou "femme"
 * @returns {Promise<string|null>} L'ID de la chambre disponible, ou null si tout est complet.
 */
export async function getParticipantBadgeNumber() {
  // 1. On récupère UNIQUEMENT le dernier participant confirmé qui possède un badge
  const lastParticipant = await prisma.participant.findFirst({
    where: {
      status: "confirme",
      // Assurez-vous d'adapter le nom exact de votre champ (ex: badgeNumber ou badgeId)
      badgeNumber: { not: null } 
    },
    orderBy: {
      badgeNumber: 'desc' // Trie du plus grand/récent au plus petit
    },
    select: {
      badgeNumber: true // On ne demande que le badge pour optimiser la requête
    }
  });

  const year = new Date().getFullYear();
  let nextSequence = 1;

  // 2. Si un badge existe déjà pour cette année, on extrait son numéro séquentiel
  if (lastParticipant && lastParticipant.badgeNumber) {
    // Exemple : si le badge est "2026-0051", on sépare "2026" et "0051"
    const parts = lastParticipant.badgeNumber.split('-');
    const lastYear = parseInt(parts[0], 10);
    const lastCount = parseInt(parts[1], 10);

    if (lastYear === year) {
      // Si on est toujours dans la même année, on incrémente de 1
      nextSequence = lastCount + 1;
    }
    // Si l'année a changé (ex: passage à 2027), nextSequence reste à 1 pour redémarrer le compteur
  }

  // 3. On formate le nouveau numéro de badge
  const registrationNumber = `${year}-${String(nextSequence).padStart(4, "0")}`;
  
  return registrationNumber;
}