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
- Option « masquer les ports libres », export PNG du synoptique.

### Guide technicien
- Checklist en 3 étapes générée depuis le synoptique : mise en place par zone,
  câblage câble par câble, configuration des appareils.
- Progression sauvegardée, bouton « Voir » qui cadre et met en surbrillance
  l'élément sur le synoptique, impression de la feuille de montage.

### Listes
- Liste de câbles, nomenclature (quantités, poids, métrages par type de câble),
  plan d'adressage IP, patch DMX. Export CSV (compatible Excel) et impression/PDF.

### Flight cases
- Types rack 19", malle, valise, case console ; dimensions, couleur de coque,
  roulettes, poignées.
- **Bandeau personnalisé** : titre, sous-titre, couleurs, police, logo, numéro de case,
  préréglages par département (SON, LUMIÈRE, VIDÉO…).
- Contenu relié au matériel du synoptique (avec alerte si un appareil est déjà
  dans un autre case), vue rack ouvert avec occupation en U, poids du contenu.
- Impression des bandeaux **à taille réelle** avec étiquette de contenu, liste de
  colisage CSV.

### Projet
- Sauvegarde automatique dans le navigateur, enregistrement/ouverture d'un
  fichier `.synopgig.json`, projet de démonstration.

## Démarrer

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # version de production dans dist/
npm run lint
```

Stack : React 19, TypeScript, Vite, [React Flow](https://reactflow.dev) pour le canevas.
