---
name: JobRadar
description: Trier vite des offres d'emploi comme on lit un panneau de direction routier français, le match est une distance.
colors:
  sign-blue: "#0B4F9C"
  sign-blue-deep: "#08397A"
  sign-blue-weak: "#E4EDF8"
  on-blue-soft: "#D3E2F5"
  marking-yellow: "#FFD500"
  on-yellow: "#14181F"
  ground: "#EDF1F6"
  panel: "#FFFFFF"
  line: "#D3DAE5"
  line-strong: "#9DAABF"
  ink: "#14181F"
  muted: "#4A5568"
  placeholder: "#657287"
  ok: "#0B7A43"
  ok-weak: "#E1F4EA"
  warn: "#7A5200"
  warn-weak: "#FFF1BF"
  danger: "#B3261E"
  danger-weak: "#FDEAE8"
  night-ground: "#0A1220"
  night-panel: "#101B2E"
  night-blue: "#2468C9"
  night-blue-deep: "#0F2F63"
  night-blue-weak: "#13284A"
  night-action: "#5DA3F5"
  night-ink: "#E9EFF8"
  night-muted: "#A3B0C6"
typography:
  headline-1:
    fontFamily: "Barlow Semi Condensed, Barlow, system-ui, sans-serif"
    fontSize: "32px"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.005em"
  headline-2:
    fontFamily: "Barlow Semi Condensed, Barlow, system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 700
    lineHeight: 1.15
  headline-3:
    fontFamily: "Barlow Semi Condensed, Barlow, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 700
    lineHeight: 1.2
  match-score:
    fontFamily: "Barlow Semi Condensed, Barlow, system-ui, sans-serif"
    fontSize: "28px"
    fontWeight: 700
    lineHeight: "48px"
  match-score-big:
    fontFamily: "Barlow Semi Condensed, Barlow, system-ui, sans-serif"
    fontSize: "52px"
    fontWeight: 700
    lineHeight: "80px"
  body:
    fontFamily: "Barlow, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: "tnum"
  row-title:
    fontFamily: "Barlow, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 600
    lineHeight: 1.25
  label:
    fontFamily: "Barlow, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1.5
rounded:
  sm: "4px"
  md: "8px"
  lg: "12px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "40px"
  touch: "44px"
components:
  button-primary:
    backgroundColor: "{colors.sign-blue}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
    padding: "0 18px"
    height: "44px"
  button-secondary:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0 18px"
    height: "44px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    rounded: "{rounded.md}"
    height: "44px"
  input-field:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
    height: "44px"
  app-bar:
    backgroundColor: "{colors.sign-blue-deep}"
    textColor: "#FFFFFF"
    height: "60px"
  source-chip:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    height: "44px"
  source-chip-selected:
    backgroundColor: "{colors.sign-blue}"
    textColor: "#FFFFFF"
  result-row:
    backgroundColor: "{colors.panel}"
    rounded: "{rounded.md}"
    padding: "12px 12px 12px 14px"
    height: "76px"
  result-row-current:
    backgroundColor: "{colors.sign-blue-weak}"
  match-strong:
    backgroundColor: "{colors.sign-blue}"
    textColor: "#FFFFFF"
    rounded: "6px"
    height: "48px"
    width: "64px"
  match-mid:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.sign-blue}"
    rounded: "6px"
    height: "48px"
  match-low:
    textColor: "{colors.muted}"
    rounded: "6px"
    height: "48px"
  sheet:
    backgroundColor: "{colors.panel}"
    rounded: "{rounded.lg}"
    padding: "28px"
---

# Design System: JobRadar

## Overview

**Creative North Star: "Le panneau de direction"**

JobRadar se lit comme un panneau de direction français : chaque offre est une destination, et la distance affichée est le match avec le profil. L'interface est en mode Operate, pensée pour trier des dizaines d'offres en quelques secondes. La barre d'application est un panneau bleu, les sources sont des pastilles rondes (initiales, comme des numéros de route), le jaune de balisage est réservé à la sélection et au focus. Tout le reste est blanc, bleu-gris très clair ou encre.

Le système est plat et dense, sans décor : la hiérarchie vient du lettrage (Barlow Semi Condensed gras pour titres et scores, Barlow pour le texte, chiffres tabulaires) et de la forme des panneaux de score. Les paliers de match se distinguent par la forme (plein, contour, pointillé), jamais par la couleur seule. Le mode sombre est un marine nocturne qui garde la même logique.

Le build diverge légèrement du brief sur un point : la barre d'application mesure 60 px sur ordinateur (56 px sous 720 px), pas 56 px partout.

**Key Characteristics:**
- Bleu de panneau pour la barre et les états forts, jaune uniquement pour sélection et focus.
- Le score est un panneau : plein (proche), contour (moyen), pointillé (loin), pointillé fin (aucun).
- Pastilles rondes pour les sources, pilules pour les filtres.
- Colonne centrée de 1120 px, liste de 400 px et détail collant.
- Clair et sombre via `prefers-color-scheme`, cibles de 44 px, focus visible de 3 px.

## Colors

Palette de signalisation : un bleu de panneau, un jaune de balisage rare, des neutres bleu-gris, et des couleurs d'état (vert, ambre, rouge) toujours doublées d'une icône ou d'un libellé.

### Primary
- **Bleu de panneau** (#0B4F9C, `--blue`, `--action`) : actions principales, liens, panneau de match fort, pastilles sélectionnées. En sombre, `--blue` devient #2468C9 et l'action #5DA3F5.
- **Bleu profond** (#08397A, `--blue-deep`) : barre d'application et en-tête de connexion. En sombre #0F2F63.
- **Bleu pâle** (#E4EDF8, `--blue-weak`) : survol, ligne courante, bandeaux d'information. En sombre #13284A.

### Secondary
- **Jaune de balisage** (#FFD500, `--yellow`) : onglet actif de la barre, pastille de la ligne courante, sélection de texte, anneau de focus dans la barre et en sombre. Texte dessus en #14181F.

### Neutral
- **Fond de route** (#EDF1F6, `--ground`) : fond de page. Sombre #0A1220.
- **Blanc panneau** (#FFFFFF, `--panel`) : cartes, champs, feuilles. Sombre #101B2E.
- **Encre** (#14181F, `--ink`) : texte. Sombre #E9EFF8.
- **Encre atténuée** (#4A5568, `--muted`) : texte secondaire. Sombre #A3B0C6. Placeholder #657287 (sombre #8393AD).
- **Traits** (#D3DAE5 `--line`, #9DAABF `--line-strong`) : séparateurs et bordures de champs.
- **États** : vert #0B7A43, ambre #7A5200 (fond #FFF1BF), rouge #B3261E (fond #FDEAE8), avec leurs variantes sombres dans `style.css`.

### Named Rules
**The Yellow Is Selection Rule.** Le jaune n'apparaît que pour la sélection et le focus (onglet courant, pastille de ligne courante, anneau de focus sur fond bleu ou sombre). Jamais en décor, jamais sur un bouton.

**The Shape Before Color Rule.** Un palier de score ne repose jamais sur la couleur seule : plein, contour, pointillé portent l'information.

## Typography

**Display Font:** Barlow Semi Condensed 600/700 (puis Barlow, system-ui)
**Body Font:** Barlow 400/500/600/700 (puis system-ui, -apple-system, Segoe UI, Roboto)

**Character:** Lettrage de signalisation, condensé et gras pour ce qui se lit d'un coup d'œil (titres, scores, onglets), Barlow plus ouvert pour le texte courant. Polices auto-hébergées (woff2), chiffres tabulaires sur tout le corps.

### Hierarchy
- **Headline 1** (700, 32px, 1.1, 28px sous 720px) : titre de page.
- **Headline 2** (700, 24px, 1.15) : titre de feuille ou de section.
- **Headline 3** (700, 18px, 1.2 ; 20px dans une feuille) : sous-titres.
- **Score** (700, 28px dans la liste ; 52px en grand ; 36px pour le score CV secondaire) : le match, en Barlow Semi Condensed.
- **Body** (400, 16px, 1.5) : texte courant ; description d'offre rendue en 16px/1.65, 70ch max.
- **Row title** (600, 17px, 1.25, 2 lignes max) : titre d'offre dans la liste.
- **Label** (600, 14px) : libellés de champs ; métadonnées en 14-15px, notes en 13px.

### Named Rules
**The Score Is Condensed Rule.** Tout chiffre de score ou de distance est en Barlow Semi Condensed gras ; le texte courant reste en Barlow.

## Layout

Contenu centré dans une colonne de 1120 px (`main` : padding 24px 24px 56px), barre d'application de même largeur interne. Page Recherche : barre de recherche en grille (poste, lieu, contrat, 140 px, bouton), puis deux colonnes : liste de 400 px et détail collant (`top: 76px`), écart 24 px. Mon profil : sommaire de 200 px et contenu, écart 48 px. Paramètres : colonne de 680 px et aside.

Rythme : 4, 8, 12, 16, 24, 40 px ; sections espacées de 40 px. Sous 1000 px, tout passe en une colonne (le détail devient plein écran avec un bouton retour, le sommaire disparaît). Sous 720 px, la barre se compacte (marque réduite à l'icône, onglets défilables) et les marges passent à 16 px. Cibles tactiles de 44 px minimum (boutons compacts à 36 px seulement pour des actions secondaires en ligne).

## Elevation & Depth

Système plat, avec deux ombres seulement. En clair, les feuilles et la barre de recherche ont une ombre ambiante légère ; les menus et dialogues une ombre plus marquée. En sombre, les menus et dialogues perdent l'ombre et prennent un trait fin (`--line-strong`) : jamais les deux.

### Shadow Vocabulary
- **Ambiante** (`box-shadow: 0 1px 2px rgb(0 0 0 / .08), 0 4px 12px rgb(0 0 0 / .06)`) : feuilles, barre de recherche, détail.
- **Flottante** (`box-shadow: 0 2px 4px rgb(0 0 0 / .12), 0 8px 20px rgb(0 0 0 / .16)`) : menu de compte, dialogues, toasts.

### Named Rules
**The One Float Rule.** Une fenêtre flottante porte soit une ombre (clair), soit un trait fin (sombre), jamais les deux.

## Shapes

Rayons : 8px (champs, boutons, lignes), 12px (feuilles, menu, dialogues), 6px pour les panneaux de score (5-8px en grand), pilule (999px) pour filtres, tags et bouton de configuration, cercle pour pastilles de sources et avatar. Le panneau de score fort porte un liseré blanc intérieur fin (outline 1.5px à -4px). Les bordures de champs et de pastilles font 1.5px, un trait pointillé de 2px marque le palier faible et la zone de dépôt.

## Components

### Buttons
- **Shape:** 8px, hauteur 44px (36px en `sm`), police Barlow 600 16px.
- **Primary:** fond bleu de panneau, texte blanc ; survol `brightness(1.1)`.
- **Secondary:** fond blanc, bordure `--line-strong`, survol bleu pâle. **Ghost:** transparent, texte atténué. **Danger:** blanc, texte et bordure rouges.
- **Disabled:** opacité .5.

### Chips
- **Source chip:** pilule 44px, bordure 1.5px, pastille ronde de 30px à gauche (initiales, bordure bleue). Sélectionnée : fond bleu, texte blanc, pastille à bordure blanche. Le même motif sert aux cases du profil.

### Cards / Containers
- **Feuille:** blanc, rayon 12px, bordure `--line`, ombre ambiante, padding 28px (20px mobile).

### Inputs / Fields
- **Style:** 44px, bordure 1.5px `--line-strong`, rayon 8px, fond blanc.
- **Focus:** anneau de 3px `--focus` (bleu en clair, jaune en sombre et dans la barre), bordure suit.

### Navigation
- **App bar:** panneau bleu profond 60px, marque Barlow Semi Condensed 22px, onglets 17px ; l'onglet courant est souligné en jaune de 4px. À droite : indicateur de configuration en pilule et avatar rond ouvrant un menu (largeur 340px, clavier géré, animation `pop` de .14s).

### Signature : panneau de match
Le score se lit comme une distance sur un panneau : **fort** (70+) plein bleu, texte blanc, liseré blanc ; **moyen** (45-69) fond blanc, contour bleu 2.5px ; **faible** contour pointillé gris 2px ; **aucun** pointillé fin. Taille liste 64x48px, grande 96x80px dans le détail.

### Signature : ligne de résultat
Grille pastille (30px), titre sur deux lignes max avec entreprise · lieu, panneau de match à droite. Ligne courante : fond bleu pâle, contour bleu de 2px, pastille jaune. Entrée en cascade (0.5s, décalage de 45ms par ligne) : seule animation d'ensemble du produit, avec le pop du menu. Mouvement coupé sous `prefers-reduced-motion`.

## Do's and Don'ts

### Do:
- **Do** réserver le jaune #FFD500 à la sélection et au focus.
- **Do** doubler chaque palier de score par une forme (plein, contour, pointillé).
- **Do** garder les cibles à 44px et un anneau de focus de 3px visible en clair comme en sombre.
- **Do** servir les polices et les icônes depuis l'application (CSP stricte, aucun style en ligne, icônes SVG en trait de 1.75).
- **Do** utiliser les variables de `:root` plutôt que des valeurs en dur.

### Don't:
- **Don't** revenir au tableau de bord de cartes identiques avec badge vert.
- **Don't** utiliser le jaune comme couleur d'action ou de décor.
- **Don't** cumuler ombre et trait sur une fenêtre flottante en sombre.
- **Don't** charger de police ou de bibliothèque externe.
- **Don't** ajouter d'animation d'ensemble autre que la cascade des résultats et le pop du menu.
