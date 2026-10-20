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

### Base d'équipements
- 137 modèles de marque récurrents, plus des modèles génériques : consoles et stageboxes (Yamaha, Midas, Behringer,
  Allen & Heath, DiGiCo), HF et ears (Shure, Sennheiser), micros et DI, amplis et
  enceintes (L-Acoustics, d&b, Lab.gruppen, Powersoft, QSC, RCF), consoles lumière
  (grandMA3, ChamSys, Avolites, ETC), nodes (Luminex, Swisson), automatiques (Robe,
  Martin, Claypaky, Ayrton, Chauvet, Elation), vidéo (Blackmagic, Barco, Panasonic,
  Epson, NovaStar, Brompton), réseau (Luminex GigaCore, Netgear) et énergie.
- Classée par département et par marque, avec recherche. La connectique est
  indicative : vérifiez la fiche constructeur.
- Tout équipement modifié peut être enregistré comme nouveau modèle.

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
