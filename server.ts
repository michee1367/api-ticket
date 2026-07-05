import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthenticatedRequest } from './middleware/auth';
// 1. Importer la bibliothèque QR Code
import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';
import * as roomService from "./room.service"
import * as participantService from "./participant.service"

const prisma = new PrismaClient();
const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'votre_cle_secrete_jwt_super_robuste';
// --- CONFIGURATION POUR PLUSIEURS FRONTENDS ---
const allowedOrigins = [
  'https://ticket.mink67.com',        // Premier frontend (ex: clients)
  'https://admin.mink67.com'          // Deuxième frontend (ex: admin - remplacez par votre vrai domaine)
];

const corsOptions = {
  origin: function (origin, callback) {
    // Permet aux requêtes sans origine (comme Postman ou les requêtes serveur à serveur) de passer
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Bloqué par la politique CORS (Origine non autorisée)'));
    }
  },
  credentials: true, // Requis si vous envoyez des tokens JWT ou des cookies
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
// ----------------------------------------------
//app.use(cors());
app.use(express.json());

const FRONT_HOST=process.env.FRONT_HOST || "https://votre-site.com"

// -------------------------------------------------------------------------
// 1. ROUTE PUBLIQUE : AUTHENTIFICATION & FORMULAIRE PUBLIC
// -------------------------------------------------------------------------
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // 1. Lire et analyser le fichier JSON des utilisateurs
    const filePath = path.join(__dirname, 'users.json');
    const rawData = fs.readFileSync(filePath, 'utf8');
    const users = JSON.parse(rawData);

    // 2. Chercher l'utilisateur avec l'email ET le mot de passe correspondants
    const user = users.find(u => u.email === email && u.password === password);

    // 3. Si aucun utilisateur n'est trouvé
    if (!user) {
      return res.status(400).json({ error: "Identifiants incorrects" });
    }

    // 4. Générer le jeton JWT avec les données dynamiques de l'utilisateur trouvé
    const token = jwt.sign(
      { email: user.email, role: user.role }, 
      JWT_SECRET, 
      { expiresIn: '12h' }
    );

    return res.json({ token });

  } catch (error) {
    console.error("Erreur lors de la lecture du fichier users.json:", error);
    return res.status(500).json({ error: "Erreur interne du serveur" });
  }
});

// Inscription publique (Mise à jour avec génération de QR Code)
app.post('/api/public/register', async (req, res) => {
  const data = req.body;
  try {
    const year = new Date().getFullYear();
    const count = await prisma.participant.count();
    const registrationNumber = `REG-${year}-${String(count + 1).padStart(4, "0")}`;
    const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(data.fullName)}&background=${data.gender === "homme" ? "2563EB" : "DB2777"}&color=fff&size=128`;

    const churchConfig = await prisma.church.findFirst() || { name: "Église" };

    const idParticipant = `part-${Date.now()}`;

    // 2. Définir l'URL de téléchargement unique pour ce participant
    // Remplacez 'https://votre-site.com' par l'URL réelle de votre application/site
    const downloadUrl = `${FRONT_HOST}/participants/${idParticipant}`;

    // 3. Générer le QR Code au format Base64 Image string
    const qrCodeDataUrl = await QRCode.toDataURL(downloadUrl, {
      errorCorrectionLevel: 'H', // Haute tolérance aux erreurs
      margin: 2,
      width: 256,
    });

    const newParticipant = await prisma.participant.create({
      data: {
        id: idParticipant,
        registrationNumber,
        fullName: data.fullName,
        email: data.email?.trim() || "—",
        phone: data.phone,
        gender: data.gender,
        church: churchConfig.name,
        retreatId: data.retreatId,
        status: "inscrit",
        avatar,
        emergencyContact: data.emergencyContact,
        notes: data.notes || "",
        source: "public",
        // Note : Si vous souhaitez sauvegarder le QR Code dans votre base MySQL,
        // Assurez-vous d'avoir un champ 'qrCode' (de type String / TEXT) dans votre schéma Prisma.
        // qrCode: qrCodeDataUrl 
      }
    });
    // Création d'une notification système
    await prisma.notification.create({
      data: {
        id: `notif-${Date.now()}`,
        type: "inscription",
        title: "Nouvelle inscription publique",
        message: `${data.fullName} s'est inscrit(e) en ligne.`,
      }
    });

    // 4. On renvoie le participant créé ET la chaîne de l'image QR Code au frontend
    res.status(201).json({
      ...newParticipant,
      qrCode: qrCodeDataUrl, // Contient l'image prête à être affichée/téléchargée
      downloadUrl: downloadUrl
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Erreur lors de l'inscription publique" });
  }
});


// -------------------------------------------------------------------------
// 2. ROUTES PROTÉGÉES (NÉCESSITENT LE BEARER TOKEN JWT)
// -------------------------------------------------------------------------
app.use('/api/admin', authenticateToken);

// Récupérer l'intégralité de la base de données
app.get('/api/admin/database', async (req, res) => {
  try {
    const church = await prisma.church.findFirst() || { name: "", address: "", phone: "", email: "" };
    const retreats = await prisma.retreat.findMany();
    const participants = await prisma.participant.findMany();
    const rooms = await prisma.room.findMany({ include: { participants: true } });
    const notifications = await prisma.notification.findMany({ orderBy: { createdAt: 'desc' } });
    const activityLogs = await prisma.activityLog.findMany({ orderBy: { timestamp: 'desc' } });

    res.json({ church, retreats, participants, rooms, notifications, activityLogs });
  } catch (error) {
    res.status(500).json({ error: "Erreur de récupération globale" });
  }
});

// Ajouter / Modifier / Supprimer une Chambre
app.post('/api/admin/rooms', async (req, res) => {
  const roomData = req.body;
  const newRoom = await prisma.room.create({
    data: { id: `room-${Date.now()}`, ...roomData }
  });
  res.status(201).json(newRoom);
});

app.put('/api/admin/rooms/:id', async (req, res) => {
  const updated = await prisma.room.update({ where: { id: req.params.id }, data: req.body });
  res.json(updated);
});

app.delete('/api/admin/rooms/:id', async (req, res) => {
  await prisma.room.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

// Mettre à jour le statut d'un participant
app.put('/api/admin/participants/:id/status', async (req, res) => {
  const { status } = req.body;
  let data = { status }
  if ( status == "confirme") {
    const badgeNumber = await participantService.getPartipantBadgetNumber()
    data = {...data, badgeNumber}
  }
  const updated = await prisma.participant.update({ where: { id: req.params.id }, data });
  
  console.log(data)
  try {

    const res = await roomService.assignRoomToParticipant(req.params.id)
    updated.roomId = res.roomId
  } catch (error) {
    
  }

  res.json(updated);
});

// Assigner une chambre à un participant
app.put('/api/admin/participants/:id/assign-room', async (req, res) => {
  const { roomId } = req.body;
  const updated =await roomService.assignSpecificRoom(req.params.id, roomId)
  //const updated = await prisma.participant.update({ where: { id: req.params.id }, data: { roomId: roomId || null } });
  res.json(updated);
});

// Confirmer paiement d'un participant
app.put('/api/admin/participants/:id/confirm-fee', async (req, res) => {
  const badgeNumber = await participantService.getPartipantBadgetNumber()

  console.log(badgeNumber)

  let updated = await prisma.participant.update({
    where: { id: req.params.id },
    data: { feePaid: true, feePaidAt: new Date(), status: "confirme", badgeNumber }
  });

  try {
    
    const res = await roomService.assignRoomToParticipant(req.params.id)
    updated.roomId = res.roomId
    
  } catch (error) {
    
  }
  res.json(updated);
});

// Enregistrement des arrivées / départs (CheckIn / CheckOut)
app.put('/api/admin/participants/:id/checkin', async (req, res) => {
  const updated = await prisma.participant.update({ where: { id: req.params.id }, data: { status: "arrive", checkedInAt: new Date() } });
  res.json(updated);
});

app.put('/api/admin/participants/:id/checkout', async (req, res) => {
  const updated = await prisma.participant.update({ where: { id: req.params.id }, data: { status: "parti", checkedOutAt: new Date(), roomId: null } });
  res.json(updated);
});

// Église
app.put('/api/admin/church', async (req, res) => {
  const existing = await prisma.church.findFirst();
  if (existing) {
    const updated = await prisma.church.update({ where: { id: existing.id }, data: req.body });
    return res.json(updated);
  }
  const created = await prisma.church.create({ data: req.body });
  res.json(created);
});

app.listen(process.env.PORT, () => console.log('🚀 Serveur Backend MySQL actif sur http://localhost:3001'));