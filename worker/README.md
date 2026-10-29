# Services gratuits de SynopGig (relais IA et bibliothèque USER)

Deux Workers Cloudflare indépendants : `relay.js` pour l’IA, `library.js` pour la
bibliothèque USER. L’un peut tomber ou changer sans toucher l’autre.

# 1. Relais IA (`relay.js`)

Un *Worker* Cloudflare gratuit qui fait pour l’application ce qu’un navigateur ne peut pas
faire : garder secrètes les clés IA, chercher sur le web, lire les pages et fichiers des
autres sites. Sans lui, l’application utilise l’analyse rapide (sans IA).

| Route | Rôle |
| --- | --- |
| `POST /` | analyse d’une fiche : texte et images des pages des faces (deux lectures en parallèle, ou une seule pour trancher) |
| `POST /find` | `{brand, model}` → documents du produit, le meilleur d’abord |
| `POST /read` | `{url}` → PDF ou image tels quels, ou page web (texte, photos, documents liés) |
| `POST /ocr` | `{url}` → texte d’un PDF avec ses tableaux (Mistral OCR) |
| `POST /research` | le produit recherché sur le web par l’IA elle-même (Groq, sinon Gemini) : connectique dans l’ordre des faces |
| `GET /diagnostic` | état de chaque clé et de chaque source de recherche |

## Mise en place (une seule fois)

1. **Worker** : <https://dash.cloudflare.com> → *Workers & Pages* → *Create* → *Create Worker*
   → nom `synopgig-ia` → *Deploy* → *Edit code* : collez [`relay.js`](relay.js) → *Deploy*.
2. **Clés** (*Settings* → *Variables and Secrets* → *Add* → type **Secret**), au moins une :
   - `GROQ_API_KEY` — <https://console.groq.com> → *API Keys* (le plus rapide, et il cherche sur le web) ;
   - `GEMINI_API_KEY` — <https://aistudio.google.com/apikey> (lit de longs documents et les PDF) ;
   - `MISTRAL_API_KEY` — <https://console.mistral.ai>, offre *Experiment* (lit les PDF avec
     leurs tableaux grâce à l’OCR, si votre offre y a accès) ;
   - `ZAI_API_KEY` — <https://z.ai> → *API Keys* (modèles GLM Flash gratuits, dont un qui lit les images).
3. **Compteurs (conseillé)** : *Storage & Databases* → *KV* → *Create* `synopgig-limits`, puis
   dans le Worker *Settings* → *Bindings* → *Add* → *KV namespace*, variable **`LIMITS`**.
4. L’adresse du Worker est dans l’application (`DEFAULT_AI_PROXY_URL`, `src/library/ai.ts`) :
   `https://synopgig-ia.arnisound-tools.workers.dev`.

Le relais demande à chaque compte la liste de ses modèles et prend les meilleurs disponibles
(variables facultatives `GROQ_MODEL`, `GEMINI_MODEL`, `MISTRAL_MODEL`, `ZAI_MODEL`).
Sites autorisés : `arnisoundtools.com`, GitHub Pages et `localhost:5173` (variable
`ALLOWED_ORIGINS` pour en changer).

## « Le chercher pour vous »

L’utilisateur donne la marque et le modèle, puis relit et corrige. Deux lectures
indépendantes, en même temps :

1. **Recherche par l’IA** (`/research`) : `gpt-oss` de Groq cherche sur le web et lit
   lui-même les pages (fabricant, fiche technique, mode d’emploi, revendeurs), puis donne la
   connectique **dans l’ordre des faces**, avec le libellé imprimé et le protocole. Rien n’est
   téléchargé par le relais : un site qui bloque les robots ne gêne pas. Le grand modèle
   d’abord, le petit quand le quota du jour du grand est épuisé, puis **Gemini avec la
   recherche Google** en secours quand Groq n’a plus de quota (son quota de recherche est
   petit).
2. **Lecture des documents** : `/find` trouve les documents du modèle exact (mode d’emploi,
   fiche technique, guide de démarrage, page produit), l’application les lit et les fait lire :
   le texte par Groq (sinon Mistral, sinon Z.ai), **les pages des faces en images** par Gemini
   (sinon GLM-4.6V-Flash de Z.ai).

Là où les deux concordent, la ligne est confirmée ; là où elles diffèrent, une troisième
lecture tranche avec les documents ; ce qui reste douteux est en orange. Avec une seule
lecture disponible, toute la liste est « à relire ». Des règles de technicien corrigent les
erreurs évidentes (sorties principales stéréo en XLR, casque sur une prise…).

## Protection

Les clés ne servent qu’aux analyses de fiches demandées par le site.

| Limite | Par défaut | Variable (*Text*) |
| --- | --- | --- |
| Demandes IA (analyses, recherches, OCR) par visiteur et par heure | 60 | `PER_HOUR` |
| Analyses par visiteur et par jour | 60 | `PER_DAY` |
| Analyses pour tous, par jour | 400 | `DAILY_LIMIT` |
| Lectures de pages et fichiers par visiteur et par heure | 300 | — |

Les limites du jour ne tiennent partout que si le KV `LIMITS` est relié (deux écritures par
analyse ; le KV gratuit en permet 1 000 par jour). Les visiteurs sont reconnus par une
empreinte de leur adresse, jamais par l’adresse elle-même.

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
