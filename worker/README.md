# Relais gratuit de SynopGig (IA et bibliothèque USER)

Ce petit programme (un *Worker* Cloudflare, gratuit) donne l’analyse IA des fiches techniques
à **tout le monde, sur tous les navigateurs, sans rien configurer** : c’est lui qui garde en
secret la clé IA gratuite du propriétaire du site. Réponse en 1 à 3 secondes.

Il héberge aussi la **bibliothèque USER** : le matériel que les utilisateurs partagent en un
clic depuis l’onglet Bibliothèque, visible par tous, avec le pseudo du créateur.

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
   `GROQ_API_KEY` = votre clé Groq (et/ou `GEMINI_API_KEY` = votre clé Gemini). Le relais
   choisit seul le meilleur modèle Groq disponible sur votre compte.
5. L’adresse du Worker est écrite dans l’application (`DEFAULT_AI_PROXY_URL` dans
   `src/library/ai.ts`) : actuellement `https://synopgig-ia.arnisound-tools.workers.dev`.
   Si vous changez de Worker, modifiez cette ligne (ou définissez `VITE_AI_PROXY_URL` au
   moment du build).

## Activer la bibliothèque USER (une fois, 2 minutes)

1. Dans Cloudflare : *Storage & Databases* → *KV* (ou *Workers & Pages* → *KV*) →
   *Create* (ou *Create a namespace*), nom `SYNOPGIG_LIBRARY` → *Add*.
2. Dans le Worker `synopgig-ia` : *Settings* → *Bindings* → *Add* → *KV namespace*.
   *Variable name* : `LIBRARY` (exactement), *KV namespace* : `SYNOPGIG_LIBRARY` → *Save*
   (ou *Deploy*).
3. Recollez le contenu de [`relay.js`](relay.js) dans *Edit code* → *Deploy*.

`/diagnostic` affiche alors `bibliotheque_user : OK (0 matériels partagés)`. Sans cette
liaison, l’application fonctionne mais le bouton « Partager » répond « Partage non
configuré ».

Modération : chaque matériel est une clé `entry:user-…` du stockage KV. Pour en retirer
un, supprimez sa clé dans *KV* → `SYNOPGIG_LIBRARY`, puis ouvrez `/diagnostic` : la liste
visible par tous est reconstruite. Le quota gratuit
(100 000 lectures et 1 000 écritures par jour) suffit largement.

## Changer d’hébergement

Le relais n’accepte que les sites listés. Quand l’application quitte GitHub Pages, ajoutez
sa nouvelle adresse dans le Worker : *Settings* → *Variables and Secrets* → *Add* → type
**Text**, nom `ALLOWED_ORIGINS`, valeur par exemple
`https://synopgig.fr,https://arnisound.github.io,http://localhost:5173` (adresses séparées par
des virgules, sans `/` final).

## Vérifier

Ouvrez `https://<adresse du Worker>/diagnostic` : chaque clé est testée et la réponse du
service s’affiche (`OK (modèle …)`, ou l’erreur exacte), avec la liste des modèles Groq de
votre compte. Les clés ne sont jamais affichées.

## Comment il choisit

- Fiche avec du texte (cas normal) : **Groq** si sa clé est là, sinon Gemini.
- PDF scanné (une image, sans texte) : **Gemini** uniquement.
- Si l’un échoue (quota…), il essaie l’autre ; si rien ne répond, l’application revient
  seule à l’analyse rapide.

## Limites

- Quotas gratuits : de l’ordre de 1 000 analyses par jour avec Groq, quelques centaines avec
  Gemini. Largement assez pour démarrer.
- Le relais n’accepte que les analyses de fiches et les partages de matériel, venant du site
  (et de `localhost:5173` pour le développement), avec au plus 30 analyses et 20 partages
  par heure et par visiteur ; la bibliothèque USER est limitée à 5 000 matériels.
- Pour un autre domaine, ajoutez une variable `ALLOWED_ORIGINS` (adresses séparées par des
  virgules).
