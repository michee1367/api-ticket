# 📑 Documentation Complète de l'API — Système Gestion Retraite

Cette documentation technique décrit l'ensemble des routes d'API (endpoints), les structures de données attendues et fournit des exemples de commandes `curl` pour tester et valider l'application en local.

* **URL de base :** `http://localhost:3001`
* **Format d'échange :** `JSON`
* **Port d'écoute :** `3001`

---

## 🧭 Sommaire
1. [🔐 Routes Publiques (Sans Jeton)](#-1-routes-publiques-sans-jeton)
   * [POST /api/login](#-authentification-login)
   * [POST /api/public/register](#-inscription-publique-dun-participant)
2. [🛡️ Routes Administrateur (Sécurisées par JWT)](#%EF%B8%8F-2-routes-administrateur-s%C3%A9curis%C3%A9es-par-jwt)
   * [GET /api/admin/database](#-récupération-globale-de-la-base-de-données)
   * [POST /api/admin/rooms](#-ajouter-une-nouvelle-chambre)
   * [PUT /api/admin/rooms/:id](#-modifier-une-chambre)
   * [DELETE /api/admin/rooms/:id](#-supprimer-une-chambre)
   * [PUT /api/admin/participants/:id/status](#-modifier-le-statut-dun-participant)
   * [PUT /api/admin/participants/:id/assign-room](#-assigner-un-participant-à-une-chambre)
   * [PUT /api/admin/participants/:id/confirm-fee](#-confirmer-le-paiement-des-frais)
   * [PUT /api/admin/participants/:id/checkin](#-enregistrer-une-arrivée-check-in)
   * [PUT /api/admin/participants/:id/checkout](#-enregistrer-un-départ-check-out)
   * [PUT /api/admin/church](#-configurer-les-informations-de-léglise)

---

## 🔐 1. Routes Publiques (Sans Jeton)

Ces routes ne nécessitent aucun en-tête d'authentification. Elles sont accessibles par le grand public ou le formulaire d'inscription en ligne.

### ➜ Authentification (Login)
Permet d'échanger des identifiants contre un jeton de session JWT valide pendant 12 heures.

* **URL :** `POST /api/login`
* **Entête :** `Content-Type: application/json`
* **Commande cURL :**
```bash
curl -X POST http://localhost:3001/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@eglise.com",
    "password": "Admin123!"
  }'

  curl -X POST https://apiticket.mink67.com/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "abrahamoweteshe@gmail.com",
    "password": "Admin123!"
  }'
 curl -X GET https://apiticket.mink67.com/api/admin/database \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImFicmFoYW1vd2V0ZXNoZUBnbWFpbC5jb20iLCJyb2xlIjoiQURNSU4iLCJpYXQiOjE3ODI4MDMwNDksImV4cCI6MTc4Mjg0NjI0OX0.NIDWOIjzIw-Z3te2RjfdcixnI_Gf-gOInB_HG-s2Vh4" 

eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImFicmFoYW1vd2V0ZXNoZUBnbWFpbC5jb20iLCJyb2xlIjoiQURNSU4iLCJpYXQiOjE3ODI4MDMwNDksImV4cCI6MTc4Mjg0NjI0OX0.NIDWOIjzIw-Z3te2RjfdcixnI_Gf-gOInB_HG-s2Vh4