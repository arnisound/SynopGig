# Services gratuits de SynopGig (relais IA et bibliothèque USER)

Deux Workers Cloudflare indépendants : `relay.js` pour l’IA, `library.js` pour la
bibliothèque USER. L’un peut tomber ou changer sans toucher l’autre.

# 1. Relais IA (`relay.js`)

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
   `GROQ_API_KEY` = votre clé Groq (et/ou `GEMINI_API_KEY` = votre clé Gemini). Le relais
   choisit seul le meilleur modèle Groq disponible sur votre compte.
5. L’adresse du Worker est écrite dans l’application (`DEFAULT_AI_PROXY_URL` dans
   `src/library/ai.ts`) : actuellement `https://synopgig-ia.arnisound-tools.workers.dev`.
   Si vous changez de Worker, modifiez cette ligne (ou définissez `VITE_AI_PROXY_URL` au
   moment du build).

## Changer d’hébergement

Le relais n’accepte que les sites listés. Par défaut : `https://arnisoundtools.com`,
`https://www.arnisoundtools.com`, GitHub Pages et `localhost:5173`. Pour une autre adresse
(par exemple un sous-domaine), ajoutez-la dans le Worker : *Settings* → *Variables and Secrets* → *Add* → type
**Text**, nom `ALLOWED_ORIGINS`, valeur par exemple
`https://synopgig.fr,https://arnisound.github.io,http://localhost:5173` (adresses séparées par
des virgules, sans `/` final).

## Vérifier

Ouvrez `https://<adresse du Worker>/diagnostic` : chaque clé est testée et la réponse du
service s’affiche (`OK (modèle …)`, ou l’erreur exacte), avec la liste des modèles Groq de
votre compte. Les clés ne sont jamais affichées.

## Lecture des pages produit (racks et flight cases)

Le relais sait aussi lire une page de site marchand (`POST /page`) pour recréer un rack ou un
flight case : il télécharge la page, ne garde que le titre, les données produit et les lignes
qui parlent de cotes, de poids ou de roulettes, puis l’application les fait analyser par l’IA.
Seules les adresses web publiques sont acceptées (pas de `localhost`, d’adresse IP ou de port
exotique), dans la même limite de 30 requêtes par heure et par visiteur. Certains sites
bloquent les robots : l’utilisateur peut alors coller le texte de la page.

## Recherche de documentation (« Le chercher pour vous »)

Dans l’onglet Bibliothèque, l’utilisateur donne une marque et un modèle : le relais cherche la
documentation (`POST /find`) avec toutes les sources disponibles et classe les résultats (site
du fabricant et PDF d’abord, revendeurs et forums en dernier) ; l’utilisateur confirme le bon
document, que le relais récupère (`POST /doc`, 15 Mo maximum) pour l’analyse habituelle.

- **DuckDuckGo** : sans clé, toujours essayé (il peut parfois refuser les robots).
- **Groq** (si `GROQ_API_KEY`) : modèle `groq/compound-mini`, qui cherche sur le web
  (variable facultative `GROQ_SEARCH_MODEL` pour en changer).
- **Gemini** (si `GEMINI_API_KEY`) : recherche Google intégrée, modèle `gemini-2.5-flash`
  (variable facultative `GEMINI_SEARCH_MODEL`).

Le relais récupère aussi les **photos du produit** de la page trouvée (`/doc`, ou `/images`
pour une fiche PDF) et les transmet à l’application (`/image`, 4 Mo maximum), qui en fait
une petite vignette. Les photos des produits partagés sont gardées par le Worker
`library.js` (`GET /img/<id>`).

`/diagnostic` indique quelles sources répondent. Même limite que le reste : 30 requêtes par
heure et par visiteur.

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

# 2. Bibliothèque USER (`library.js`)

Garde le matériel que les utilisateurs partagent en un clic depuis l’onglet Bibliothèque,
visible par tous avec le pseudo du créateur. Aucune clé IA, aucun compte pour les utilisateurs.

## Mise en place (une seule fois, environ 5 minutes)

1. **Stockage** : dans Cloudflare, *Storage & Databases* → *KV* → *Create* (ou *Create a
   namespace*), nom `SYNOPGIG_LIBRARY` → *Add*.
2. **Worker** : *Workers & Pages* → *Create* → *Create Worker* → nommez-le
   `synopgig-library` → *Deploy*.
3. *Edit code* : remplacez tout le contenu par celui de [`library.js`](library.js) → *Deploy*.
4. Dans ce Worker : *Settings* → *Bindings* → *Add* → *KV namespace*. *Variable name* :
   `LIBRARY` (exactement, en majuscules), *KV namespace* : `SYNOPGIG_LIBRARY` → *Save*.
5. Ouvrez `https://synopgig-library.arnisound-tools.workers.dev/diagnostic` : il doit
   afficher `"bibliotheque_user": "OK (0 matériels partagés)"`.

L’adresse est écrite dans l’application (`DEFAULT_LIBRARY_URL` dans
`src/library/useUserLibrary.ts`). Si vous nommez le Worker autrement, modifiez cette ligne
(ou définissez `VITE_LIBRARY_URL` au moment du build). Pour un nouveau domaine, ajoutez la
variable `ALLOWED_ORIGINS` comme pour le relais IA.

## Liens de partage de projets

Le même Worker garde les **projets partagés en lecture seule** (bouton « Partager » de
l’application) : `POST /projects` publie une copie et donne un lien `…#/p/<id>`, que
n’importe qui ouvre sans compte ; seul le navigateur qui l’a créé peut le mettre à jour ou
l’arrêter (clé gardée dans ce navigateur). 2 Mo maximum par projet, conservé un peu plus
d’un an après la dernière mise à jour. Aucun réglage en plus : recollez simplement le
nouveau `library.js` et *Deploy*.

## Modération

Chaque matériel est une clé `entry:user-…` dans *KV* → `SYNOPGIG_LIBRARY`. Pour en retirer
un, supprimez sa clé, puis ouvrez `/diagnostic` : la liste visible par tous est reconstruite.

## Limites

20 partages par heure et par visiteur, 5 000 matériels au total. Le quota gratuit de KV
(100 000 lectures et 1 000 écritures par jour) suffit largement.
