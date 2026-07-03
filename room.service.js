//const { PrismaClient } = require('@prisma/client');
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

/**
 * Trouve le premier ID de chambre disponible selon le genre du participant.
 * @param {string} participantGender - "homme" ou "femme"
 * @returns {Promise<string|null>} L'ID de la chambre disponible, ou null si tout est complet.
 */
export async function getFirstAvailableRoomId(participantGender) {
  try {
    // 1. Récupérer les chambres qui correspondent au genre (ou mixtes)
    const rooms = await prisma.room.findMany({
      where: {
        gender: {
          in: [participantGender, 'mixte']
        }
      },
      include: {
        _count: {
          select: { participants: true } // Compte le nombre de participants actuels
        }
      }
    });

    // 2. Filtrer en mémoire pour trouver la première chambre avec de la place
    const availableRoom = rooms.find(room => room._count.participants < room.capacity);

    // 3. Retourner l'ID ou null si aucune chambre n'est libre
    return availableRoom ? availableRoom.id : null;
    
  } catch (error) {
    console.error("Erreur lors de la recherche d'une chambre disponible :", error);
    throw error;
  }
}

/**
 * Assigne automatiquement une chambre disponible à un participant existant via son ID.
 * @param {string} participantId - L'ID du participant à loger
 * @returns {Promise<Object>} Le participant mis à jour avec sa chambre
 */
export async function assignRoomToParticipant(participantId) {
  try {
    // 1. Récupérer le genre du participant existant
    const participant = await prisma.participant.findUnique({
      where: { id: participantId },
      select: { gender: true, roomId: true }
    });

    if (!participant) {

      throw new Error("Participant introuvable.");
    }

    // Optionnel : Vérifier s'il n'a pas déjà une chambre
    if (participant.roomId) {
      throw new Error("Ce participant a déjà une chambre assignée.");
    }

    // 2. Trouver une chambre disponible pour son genre
    const availableRoomId = await getFirstAvailableRoomId(participant.gender);

    if (!availableRoomId) {
      throw new Error("Aucune chambre disponible pour ce genre.");
    }

    // 3. Mettre à jour le participant avec l'ID de la chambre
    const updatedParticipant = await prisma.participant.update({
      where: { id: participantId },
      data: { roomId: availableRoomId },
      include: { room: true } // Retourne aussi les infos de la chambre
    });

    return updatedParticipant;

  } catch (error) {
    console.error("Erreur lors de l'attribution de la chambre :", error.message);
    throw error;
  }
}

/**
 * Vérifie et assigne manuellement une chambre spécifique à un participant.
 * @param {string} participantId - ID du participant
 * @param {string} roomId - ID de la chambre ciblée
 * @returns {Promise<Object>} Le participant mis à jour
 */
export async function assignSpecificRoom(participantId, roomId) {
  try {
    // 1. Récupérer le participant et la chambre en parallèle pour optimiser
    const [participant, room] = await Promise.all([
      prisma.participant.findUnique({
        where: { id: participantId },
        select: { id: true, gender: true, roomId: true }
      }),
      prisma.room.findUnique({
        where: { id: roomId },
        include: {
          _count: {
            select: { participants: true } // Compte le nombre d'occupants actuels
          }
        }
      })
    ]);

    // 2. Vérifications de base (existence)
    if (!participant) throw new Error("Participant introuvable.");
    if (!room) throw new Error("Chambre introuvable.");

    // 3. Test : Est-ce que le genre correspond ?
    // La chambre doit être "mixte" ou correspondre exactement au genre du participant
    if (room.gender !== 'mixte' && room.gender !== participant.gender) {
      throw new Error(`Incohérence de genre : La chambre est réservée aux "${room.gender}s" et le participant est un "${participant.gender}".`);
    }

    // 4. Test : Reste-t-il de la place dans cette chambre ?
    if (room._count.participants >= room.capacity) {
      throw new Error("La chambre est déjà complète.");
    }

    // 5. Tout est OK -> On insère le participant dans la chambre
    const updatedParticipant = await prisma.participant.update({
      where: { id: participantId },
      data: { roomId: room.id },
      include: { room: true }
    });

    return updatedParticipant;

  } catch (error) {
    console.error("Erreur lors de l'attribution manuelle de la chambre :", error.message);
    throw error;
  }
}

/*module.exports = {
  getFirstAvailableRoomId,
  assignRoomToParticipant,
  assignSpecificRoom
};*/