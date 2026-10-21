# Relais IA gratuit de SynopGig

Ce petit programme (un *Worker* Cloudflare, gratuit) donne l’analyse IA des fiches techniques
à **tout le monde, sur tous les navigateurs, sans rien configurer** : c’est lui qui garde en
secret la clé IA gratuite du propriétaire du site. Réponse en 1 à 3 secondes.

Sans ce relais, l’application utilise l’analyse rapide (sans IA, instantanée).

## Mise en place (une seule fois, environ 10 minutes)

1. **Clé IA gratuite** — au choix (ou les deux) :
   - **Groq (recommandé, le plus rapide)** : créez un compte sur <https://console.groq.com>
     (connexion Google ou GitHub possible), puis *API Keys* → *Create API Key*. Copiez la clé
     (`gsk_…`).
   - **Gemini** (sait aussi lire les PDF scannés) : <https://aistudio.google.com/apikey> →
     *Create API key*. Copiez la clé (`AIza…`).
2. **Worker Cloudflare** : créez un compte gratuit sur <https://dash.cloudflare.com>, puis
   *Workers & Pages* → *Create* → *Create Worker* → nommez-le `synopgig-ia` → *Deploy*.
3. Cliquez sur *Edit code*, remplacez tout le contenu par celui de [`relay.js`](relay.js),
   puis *Deploy*.
4. Dans le Worker : *Settings* → *Variables and Secrets* → *Add* → type **Secret** :
   `GROQ_API_KEY` = votre clé Groq (et/ou `GEMINI_API_KEY` = votre clé Gemini).
5. Notez l’adresse du Worker, du type `https://synopgig-ia.votre-nom.workers.dev`.
6. Sur GitHub, dans le dépôt : *Settings* → *Secrets and variables* → *Actions* → onglet
   **Variables** → *New repository variable* : nom `AI_PROXY_URL`, valeur : l’adresse du Worker.
7. Onglet *Actions* → « Deploy to GitHub Pages » → *Run workflow*. C’est en ligne.

## Comment il choisit

- Fiche avec du texte (cas normal) : **Groq** si sa clé est là, sinon Gemini.
- PDF scanné (une image, sans texte) : **Gemini** uniquement.
- Si l’un échoue (quota…), il essaie l’autre ; si rien ne répond, l’application revient
  seule à l’analyse rapide.

## Limites

- Quotas gratuits : de l’ordre de 1 000 analyses par jour avec Groq, quelques centaines avec
  Gemini. Largement assez pour démarrer.
- Le relais n’accepte que les analyses de fiches, venant du site (et de `localhost:5173` pour
  le développement), avec au plus 30 analyses par heure et par visiteur.
- Pour un autre domaine, ajoutez une variable `ALLOWED_ORIGINS` (adresses séparées par des
  virgules).
