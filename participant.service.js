//const { PrismaClient } = require('@prisma/client');
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();


/**
 * Trouve le premier ID de chambre disponible selon le genre du participant.
 * @param {string} participantGender - "homme" ou "femme"
 * @returns {Promise<string|null>} L'ID de la chambre disponible, ou null si tout est complet.
 */
export async function getPartipantBadgetNumber() {
  const count = await prisma.participant.count({
    where: {
      status: "confirme"
    }
  });

  const year = new Date().getFullYear();
  const registrationNumber = `${year}-${String(count + 1).padStart(4, "0")}`;
  
  return registrationNumber
    
}