# SynopGig

Application web pour **préparer et transmettre un montage technique de spectacle** :
synoptique de câblage, guide pas-à-pas pour les techniciens, listes générées
automatiquement et conception de **flight cases avec bandeaux personnalisés**.

## Fonctionnalités

### Synoptique
- Bibliothèque d'équipements son, lumière, vidéo, réseau et énergie (console,
  stagebox Dante, amplis, enceintes, lyres, PAR, nodes Art-Net, switchs, armoires…).
- Glisser-déposer sur le plan, câblage port à port (XLR, Speakon, DMX 5 pts,
  etherCON, SDI, HDMI, powerCON, P17, Socapex…).
- **Contrôle de chaque liaison** sans bloquer le tracé : signal incompatible,
  adaptateur nécessaire, sortie vers sortie, sortie HP vers une entrée ligne,
  énergie mélangée avec un signal.
- Repères câbles automatiques (C001, C002…), longueur, note pour le technicien.
- Configuration par équipement : zone, IP, univers/adresse DMX, mode/preset, consignes.
- Ports éditables et sauvegarde d'un équipement comme nouveau modèle.
- **Options d’affichage** (bouton « Affichage », enregistrées avec chaque projet) : un seul
  département (son, lumière, vidéo, réseau, énergie, avec en grisé ce qui y est branché),
  tracé des câbles (angles arrondis, angles droits, courbes, lignes droites), étiquettes
  (repère et longueur, repère seul, aucune), épaisseur, isolement de l’appareil sélectionné,
  animation du sens du signal, ports libres masqués. Un clic sur un signal de la légende
  masque ou affiche ses câbles.
- Export PNG du synoptique.

### Base d'équipements
- 1 371 modèles de marque (73 marques), plus des modèles génériques. La palette est triée
  par département, puis par **famille** (consoles, stageboxes, HF, antennes, line arrays,
  subs, lyres, PTZ, switchs…), puis par marque, avec recherche et filtre par marque :
  - **Consoles** : Yamaha (RIVAGE PM5, CL, QL, TF, DM3, MG), Allen & Heath (dLive, Avantis,
    SQ, CQ, Qu, ZED), Midas (HD96, PRO2, M32, MR18), Behringer (X32, Wing, XR18), DiGiCo
    (Quantum, SD, S21), Soundcraft, PreSonus, Avid VENUE S6L, SSL Live ; stageboxes associées.
  - **Diffusion** : L-Acoustics, d&b, **Fohhn** (Linea Focus, LX, XS, amplis D/DI),
    **Axiom Pro Audio** (AX2010, AX1012, AX800A, AX2065, SW, ED), Yamaha (DZR, DXS, CZR,
    PX, XMV), QSC, RCF, Lab.gruppen, Powersoft…
  - **Gammes complètes** (fichiers `src/data/brands/`) : **Shure** (218 : micros, Axient
    Digital, ULX-D, SLX-D, QLX-D, BLX, GLX-D, PSM, antennes, Microflex), **Sennheiser** (163 :
    micros, Digital 6000/9000, Spectera, EW-DX, EW-D, G4, 2000, IEM), **L-Acoustics** (70),
    **d&b audiotechnik** (83), **NEXO** (66), **Electro-Voice** (109), **Adamson** (29),
    **Fohhn** (60, dont Focus Venue FV-100 / FV-200 et subs PS), **Axiom Pro Audio** (44).
  - **HF et ears** : Shure, Sennheiser, Audio-Technica, Wisycom, Lectrosonics (récepteurs,
    émetteurs main et ceinture, ears), **distributeurs et amplificateurs d’antennes,
    combineurs, commutateur A/B, antennes** directives, omni et hélicoïdales.
  - **Multipaire RMP 54 pts** (16 voies) : éclatés, boîte de scène, splitter.
  - **Vidéo** : **Roland** (V-1HD+, V-02HD, V-8HD, V-60HD, V-160HD, VR-6HD, VR-120HD,
    P-20HD), Blackmagic, **caméras PTZ** (Panasonic, Sony, Canon, BirdDog, PTZOptics) et
    **pupitres** (AW-RP150/RP60, RM-IP500, RC-IP100, SKAARHOJ…), projecteurs, LED.
  - **Réseau** : switchs **PoE et fibre** (Luminex GigaCore, Netgear M4250, Yamaha SWR/SWP1,
    Cisco, Ubiquiti), **Agora Ghost G2**, convertisseurs fibre, injecteur PoE, touret fibre.
  - **Ordinateurs & serveurs** (génériques) : PC rackables 1U / 2U (Dante, double alim) / 4U
    (vidéo), serveurs 1U / 2U, NAS, Mac mini en tiroir 1U, console et switch KVM, tour,
    mini PC, portable, écran de contrôle.
  - Lumière (grandMA3, ChamSys, Avolites, ETC, Robe, Martin, Claypaky…) et énergie.
- Connectique : XLR 3/4/5, combo XLR/jack, mini-XLR, jack, mini-jack, RCA, Toslink/ADAT,
  MIDI, Speakon NL4/NL8, bornes HP, bornier Euroblock, etherCON/RJ45, opticalCON, fibre LC
  et SMPTE, BNC, SDI, HDMI, DisplayPort, DVI, VGA, USB/USB-C, Sub-D 9/25, RMP 54, powerCON,
  IEC, P17 (dont 32A mono), Socapex, cage SFP / SFP+, Lemo 3 broches (émetteurs HF), CA-COM
  (L-Acoustics), multibroche Harting… Un combo accepte une fiche XLR ou jack, une cage SFP une
  fibre LC, sans alerte d’adaptateur.
- Signal **HF (antenne)** avec connecteurs BNC / N : la chaîne antenne → distributeur →
  récepteur est vérifiée comme les autres liaisons.
- La connectique est indicative : vérifiez la fiche constructeur. Tout équipement
  modifié peut être enregistré comme nouveau modèle.

### Bibliothèque (onglet Bibliothèque)
- **Ajout manuel** : marque, modèle, département, famille, U, poids et connectique saisie
  par groupes (« 16 × XLR entrées »), ou copie d’un modèle existant.
- **Analyse de fiche technique** (PDF ou texte collé) : un seul bouton « Analyser », rien à
  configurer pour l’utilisateur, sur tous les navigateurs :
  1. **instantané** : si la fiche nomme un modèle déjà présent (base, bibliothèque USER ou
     « Mes modèles »), il est proposé tout de suite, sans IA ;
  2. sinon le **relais IA SynopGig** (Worker Cloudflare gratuit qui garde en secret la clé
     Groq ou Gemini du propriétaire du site, voir [`worker/README.md`](worker/README.md)) :
     réponse en 1 à 3 s, seules les lignes utiles de la fiche sont envoyées ; les PDF scannés
     passent par Gemini ;
  3. sinon, ou si l’IA ne répond pas, l’**analyse rapide** sans IA, qui ne garde que les
     quantités écrites et propose les autres connecteurs en suggestions.
  Les réponses de l’IA sont revérifiées et restent à relire. En options avancées : clé
  Gemini personnelle, et IA intégrée à Chrome (gratuite et hors ligne, mais lente).
- **Ma bibliothèque** : modèles perso dans la palette (« Mes modèles »), gardés d’un projet
  à l’autre, export / import JSON.
- **Bibliothèque USER** (partagée) : un clic sur « Partager dans la bibliothèque USER » et
  le matériel est disponible pour tous les utilisateurs (palette : « Bibliothèque USER »,
  avec le pseudo du créateur), sans compte ni validation. Le créateur peut le retirer (×)
  depuis le navigateur qui l’a partagé. Le stockage est assuré par un petit Worker
  Cloudflare gratuit, séparé de l’IA (`worker/library.js`, voir
  [`worker/README.md`](worker/README.md)) ;
  `public/user-library.json` sert de copie de secours hors ligne.

### Racks et bandeaux de câblage
- Onglet **Racks** : vue avant et arrière, glisser-déposer du matériel unité par unité,
  détection des chevauchements et du manque de place, poids et occupation.
- **Bandeaux de câblage** (format D, 16 trous par U) : on pose des XLR 3/5, etherCON,
  opticalCON, Speakon, powerCON TRUE1, BNC, HDMI… trou par trou ou par série
  (« MIC 1 à 16 »). Chaque trou a une face extérieure et une face intérieure.
  Modèles prêts à l'emploi : plateau, 32 entrées, ampli, lumière, vidéo.
- **Câblage interne** port par port, ou automatique (« Tout câbler ») vers les ports
  libres compatibles du rack.
- Sur le synoptique, chaque rack est encadré : glisser son titre déplace tout le rack.
  Une sélection peut devenir un rack.
- **Recréer depuis un site** (onglets Racks et Flight cases) : collez le lien d’une page
  produit (ou son texte) et le rack ou le flight case est créé avec ses unités, ses
  dimensions extérieures, son poids à vide et ses roulettes. La page est lue par le relais
  SynopGig, puis par l’IA ; sans IA, une lecture simple des cotes prend le relais.
- Annulation (bouton ou Ctrl+Z).

### Guide technicien
- Checklist générée depuis le synoptique : câblage atelier de chaque rack, mise en
  place par zone, câblage sur site câble par câble (avec le signal suivi à travers
  les bandeaux : « via bandeau, arrive sur Stagebox [In 1] »), configuration.
- Progression sauvegardée, bouton « Voir » qui cadre et met en surbrillance
  l'élément sur le synoptique, impression de la feuille de montage.

### Listes
- Liste de câbles (interne rack / site), nomenclature (quantités, poids, métrages
  par type de câble), plan d'adressage IP, patch DMX, plan des bandeaux de câblage.
  Export CSV (compatible Excel) et impression/PDF.

### Flight cases
- Types rack 19", malle, valise, case console ; dimensions, couleur de coque,
  roulettes, poignées.
- **Bandeau personnalisé** : titre, sous-titre, couleurs, police, logo, numéro de case,
  préréglages par département (SON, LUMIÈRE, VIDÉO…).
- Contenu relié au matériel du synoptique (avec alerte si un appareil est déjà
  dans un autre case), vue rack ouvert avec occupation en U, poids du contenu.
- Impression des bandeaux **à taille réelle** avec étiquette de contenu, liste de
  colisage CSV.

### Dossier technique complet (bouton « Dossier PDF »)
- Un seul document à imprimer ou à enregistrer en PDF, parties au choix : couverture et
  sommaire, synoptique (vue d’ensemble vectorielle, selon l’affichage choisi) et un
  synoptique par département, équipements par zone (rack, IP, DMX, mode, consignes), fiche
  détaillée de chaque équipement (chaque port, son câble, où il va, sa longueur), liste de
  câbles, alertes, nomenclature, plan IP, patch DMX, bandeaux de câblage, racks faces avant
  et arrière, flight cases (vue, cotes, poids, contenu, bandeau) et feuille de montage à
  cocher.

### Projet
- Sauvegarde automatique dans le navigateur, enregistrement/ouverture d'un
  fichier `.synopgig.json`, projet de démonstration.

## Démarrer

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # version de production dans dist/
npm run lint
npm test         # tests unitaires (vitest)
```

Stack : React 19, TypeScript, Vite, [React Flow](https://reactflow.dev) pour le canevas.
