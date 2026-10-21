# Relais IA gratuit de SynopGig

Ce petit programme (un *Worker* Cloudflare, gratuit) permet à **tout le monde** d’utiliser
l’analyse IA des fiches techniques **sans rien configurer** : c’est lui qui garde la clé
Gemini du propriétaire du site, en secret.

Sans ce relais, l’application utilise l’IA intégrée à Chrome quand elle existe, sinon
l’analyse rapide (sans IA).

## Mise en place (une seule fois, environ 10 minutes)

1. **Clé Gemini gratuite** : sur <https://aistudio.google.com/apikey>, connectez-vous avec un
   compte Google puis « Create API key ». Copiez la clé (`AIza…`).
2. **Worker Cloudflare** : créez un compte gratuit sur <https://dash.cloudflare.com>, puis
   *Workers & Pages* → *Create* → *Create Worker* → nommez-le `synopgig-ia` → *Deploy*.
3. Cliquez sur *Edit code*, remplacez tout le contenu par celui de
   [`gemini-relay.js`](gemini-relay.js), puis *Deploy*.
4. Dans le Worker : *Settings* → *Variables and Secrets* → *Add* → type **Secret**,
   nom `GEMINI_API_KEY`, valeur : votre clé. Enregistrez.
5. Notez l’adresse du Worker, du type `https://synopgig-ia.votre-nom.workers.dev`.
6. Sur GitHub, dans le dépôt : *Settings* → *Secrets and variables* → *Actions* →
   onglet **Variables** → *New repository variable* : nom `AI_PROXY_URL`, valeur : l’adresse
   du Worker.
7. Onglet *Actions* → « Deploy to GitHub Pages » → *Run workflow*. C’est en ligne.

## Limites

- Quota gratuit de Google : de l’ordre de quelques centaines d’analyses par jour. Au-delà,
  l’application bascule seule sur l’analyse rapide jusqu’au lendemain.
- Le relais n’accepte que les requêtes venant du site (et de `localhost:5173` pour le
  développement), uniquement pour analyser une fiche, et au plus 30 analyses par heure et par
  visiteur.
- Pour un autre domaine, ajoutez une variable `ALLOWED_ORIGINS` (adresses séparées par des
  virgules).
