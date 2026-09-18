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
  night-line: "#243651"
  night-line-strong: "#4A5F80"
  night-blue: "#2468C9"
  night-blue-deep: "#0F2F63"
  night-blue-weak: "#13284A"
  night-on-blue-soft: "#C4D6F2"
  night-action: "#5DA3F5"
  night-on-action: "#06182F"
  night-ink: "#E9EFF8"
  night-muted: "#A3B0C6"
  night-placeholder: "#8393AD"
  night-ok: "#4ED38B"
  night-warn: "#F2C14E"
  night-danger: "#FF8A80"
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
  tag:
    fontFamily: "Barlow, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 600
rounded:
  sm: "4px"
  sign: "6px"
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
  button-sm:
    padding: "0 12px"
    height: "36px"
  button-icon:
    width: "36px"
    height: "36px"
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
    rounded: "{rounded.sign}"
    height: "48px"
    width: "64px"
  match-mid:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.sign-blue}"
    rounded: "{rounded.sign}"
    height: "48px"
  match-low:
    textColor: "{colors.muted}"
    rounded: "{rounded.sign}"
    height: "48px"
  sheet:
    backgroundColor: "{colors.panel}"
    rounded: "{rounded.lg}"
    padding: "28px"
  alert-row:
    backgroundColor: "{colors.panel}"
    rounded: "{rounded.md}"
    padding: "14px 16px"
  switch-track:
    backgroundColor: "{colors.line-strong}"
    rounded: "{rounded.pill}"
    width: "44px"
    height: "26px"
  switch-track-on:
    backgroundColor: "{colors.sign-blue}"
  provider-row:
    backgroundColor: "{colors.panel}"
    rounded: "{rounded.md}"
    padding: "12px 12px 12px 14px"
  provider-rank:
    backgroundColor: "{colors.sign-blue-weak}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    size: "28px"
  tag:
    backgroundColor: "{colors.sign-blue-weak}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    typography: "{typography.tag}"
    padding: "2px 10px"
  tag-ok:
    backgroundColor: "{colors.ok-weak}"
    textColor: "{colors.ok}"
  tag-warn:
    backgroundColor: "{colors.warn-weak}"
    textColor: "{colors.warn}"
  nav-badge:
    backgroundColor: "#FFFFFF"
    textColor: "{colors.sign-blue-deep}"
    rounded: "{rounded.pill}"
    height: "20px"
  install-bar:
    backgroundColor: "{colors.sign-blue-weak}"
    textColor: "{colors.ink}"
    padding: "10px 24px"
  photo-disc:
    backgroundColor: "{colors.sign-blue-weak}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    size: "36px"
  dropzone:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.muted}"
    rounded: "{rounded.lg}"
    height: "240px"
  save-bar:
    backgroundColor: "{colors.panel}"
    padding: "14px 12px"
  detail-bar:
    backgroundColor: "{colors.panel}"
    padding: "8px 12px"
  dialog:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "28px"
  toast:
    backgroundColor: "{colors.ink}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
    padding: "12px 18px"
  toast-error:
    backgroundColor: "{colors.danger}"
    textColor: "#FFFFFF"
---

# Design System: JobRadar

## Overview

**Creative North Star: "Le panneau de direction"**

JobRadar se lit comme un panneau de direction français : chaque offre est une destination, et la distance affichée est le match avec le profil. L'interface est en mode Operate, pensée pour trier des dizaines d'offres en quelques secondes, sur ordinateur comme sur téléphone installé. La barre d'application est un panneau bleu, les sources sont des pastilles rondes (initiales, comme des numéros de route), le jaune de balisage est réservé à la sélection et au focus. Tout le reste est blanc, bleu-gris très clair ou encre.

Le système est plat et dense, sans décor : la hiérarchie vient du lettrage (Barlow Semi Condensed gras pour titres et scores, Barlow pour le texte, chiffres tabulaires) et de la forme des panneaux de score. Les paliers de match se distinguent par la forme (plein, contour, pointillé), jamais par la couleur seule. Le mode sombre est un marine nocturne qui garde la même logique. Les pages ajoutées depuis (Alertes, Paramètres, Profil complet) réemploient les mêmes briques : lignes blanches à bordure fine, pastilles, tags, boutons de 44 px.

Le build diverge légèrement du brief initial : la barre d'application mesure 60 px sur ordinateur (56 px sous 720 px), et le détail d'offre devient, sous 1000 px, un écran entier à barre collante plutôt qu'une simple feuille avec bouton retour.

**Key Characteristics:**
- Bleu de panneau pour la barre et les états forts, jaune uniquement pour sélection et focus.
- Le score est un panneau : plein (proche), contour (moyen), pointillé (loin), pointillé fin (aucun).
- Pastilles rondes pour les sources, pilules pour filtres et tags d'état.
- Colonne centrée de 1120 px ; liste de 400 px et détail collant, ou liste puis détail plein écran sous 1000 px.
- Clair et sombre via `prefers-color-scheme`, cibles de 44 px, focus visible de 3 px.
- Une seule animation d'ensemble (cascade des résultats), plus le pop du menu ; le reste est du retour d'état.

## Colors

Palette de signalisation : un bleu de panneau, un jaune de balisage rare, des neutres bleu-gris, et des couleurs d'état (vert, ambre, rouge) toujours doublées d'une icône ou d'un libellé. Les jetons vivent dans `:root` de `style.css` et sont redéfinis dans `@media (prefers-color-scheme: dark)`.

### Primary
- **Bleu de panneau** (#0B4F9C, `--blue`, `--action`) : actions principales, liens, panneau de match fort, pastilles et cases sélectionnées, interrupteur actif. En sombre, `--blue` devient #2468C9 et `--action` #5DA3F5 (texte dessus #06182F).
- **Bleu profond** (#08397A, `--blue-deep`) : barre d'application, en-tête de connexion, couleur de thème de l'application installée. En sombre #0F2F63.
- **Bleu pâle** (#E4EDF8, `--blue-weak`) : survol, ligne courante, bandeaux d'information, bandeau d'installation, rang des fournisseurs, pastille sans photo. En sombre #13284A.

### Secondary
- **Jaune de balisage** (#FFD500, `--yellow`) : onglet actif de la barre, pastille de la ligne courante, sélection de texte, anneau de focus dans la barre et partout en sombre. Texte dessus en #14181F.

### Neutral
- **Fond de route** (#EDF1F6, `--ground`) : fond de page. Sombre #0A1220.
- **Blanc panneau** (#FFFFFF, `--panel`) : cartes, champs, feuilles, lignes, dialogues. Sombre #101B2E.
- **Encre** (#14181F, `--ink`) : texte. Sombre #E9EFF8.
- **Encre atténuée** (#4A5568, `--muted`) : texte secondaire. Sombre #A3B0C6. Placeholder #657287 (sombre #8393AD).
- **Traits** (#D3DAE5 `--line`, #9DAABF `--line-strong`) : séparateurs, bordures de lignes, de champs, piste d'interrupteur éteint. Sombre #243651 et #4A5F80.
- **États** : vert #0B7A43 (fond #E1F4EA), ambre #7A5200 (fond #FFF1BF), rouge #B3261E (fond #FDEAE8). En sombre : #4ED38B, #F2C14E, #FF8A80 sur fonds #0F2B20, #2F2508, #34161A. `--old` et `--new` (comparaison avant/après d'une modification de CV) reprennent le rouge et le vert pâles.

### Named Rules
**The Yellow Is Selection Rule.** Le jaune n'apparaît que pour la sélection et le focus (onglet courant, pastille de ligne courante, anneau de focus sur fond bleu ou sombre). Jamais en décor, jamais sur un bouton, jamais sur la pastille de non-lus (elle est blanche sur le bleu profond).

**The Shape Before Color Rule.** Un palier de score ne repose jamais sur la couleur seule : plein, contour, pointillé portent l'information. Même logique pour les états : un tag « Clé refusée », « En pause », « Nouveau » porte un libellé, pas seulement une teinte.

## Typography

**Display Font:** Barlow Semi Condensed 600/700 (puis Barlow, system-ui) dans `--sign`
**Body Font:** Barlow 400/500/600/700 (puis system-ui, -apple-system, Segoe UI, Roboto) dans `--sans`

**Character:** Lettrage de signalisation, condensé et gras pour ce qui se lit d'un coup d'œil (titres, scores, onglets, rang, initiales), Barlow plus ouvert pour le texte courant. Polices auto-hébergées (woff2), chiffres tabulaires sur tout le corps.

### Hierarchy
- **Headline 1** (700, 32px, 1.1, 28px sous 720px) : titre de page.
- **Headline 2** (700, 24px, 1.15) : titre de section ou de feuille ; 22px gras pour l'invite de la zone de dépôt.
- **Headline 3** (700, 18px, 1.2 ; 20px dans une feuille) : sous-titres, titre d'un rapport d'alerte.
- **Score** (700, 28px dans la liste ; 52px en grand ; 36px pour le score CV secondaire) : le match, en Barlow Semi Condensed.
- **Body** (400, 16px, 1.5) : texte courant ; description d'offre rendue en 16px/1.65, 70ch max.
- **Row title** (600, 17px, 1.25, 2 lignes max) : titre d'offre, d'alerte ou de fournisseur.
- **Label** (600, 14px) : libellés de champs ; métadonnées en 14-15px, notes en 13px.
- **Tag** (600, 13px) : pilules d'état ; la pastille de non-lus est en 700 12px.

### Named Rules
**The Score Is Condensed Rule.** Tout chiffre de score ou de distance est en Barlow Semi Condensed gras ; le texte courant reste en Barlow. Les rangs et initiales (numéros de route) suivent la même règle.

## Layout

Contenu centré dans une colonne de 1120 px (`main` : padding 24px 24px 56px), barre d'application et bandeau d'installation de même largeur interne. Rythme : 4, 8, 12, 16, 24, 40 px ; sections espacées de 40 px (48 px entre sections du profil et dans la colonne de Paramètres).

- **Recherche** : barre de recherche en grille (poste, lieu, contrat, 140 px, bouton), puis deux colonnes : liste de 400 px et détail collant (`top: 76px`), écart 24 px.
- **Alertes** : colonne unique. Section « Mes alertes » (3 maximum), puis « Rapports » : un bloc `run` par passage (titre, date, tag « Nouveau », puis lignes de résultat cliquables). Un passage sans nouveauté est réduit à une ligne.
- **Mon profil** : sommaire collant de 200 px (`top: 84px`) et contenu, écart 48 px. Sections `psec` avec en-tête (titre, indice, bouton Ajouter), blocs `entry` en grille de 2 ou 3 champs, bloc identité (photo de 88 px + champs), cases de contrat en pilules.
- **Paramètres** : deux colonnes (`minmax(0, 680px)` et `minmax(260px, 1fr)`, écart 64 px) : fournisseurs d'IA et notifications à gauche, compte à droite.
- **Connexion** : carte de 420 px centrée, en-tête bleu profond.

Breakpoints :
- **1000px** (bascule maître-détail) : une seule colonne partout, sommaire du profil masqué, Paramètres empilé (écart 40 px), formulaire de recherche sur deux colonnes.
- **720px** (barre compacte) : barre de 56 px sans libellé de marque ni retour à la ligne, onglets resserrés, libellé du bouton « Terminer la configuration » masqué, marges à 16 px, grilles de champs à une colonne, lignes d'alerte et de fournisseur avec outils sur leur propre rangée alignée à droite.

Comportement mobile (sous 1000 px, comme une application) : le formulaire de recherche se replie en résumé `.searchsum` (texte tronqué + bouton Modifier) dès qu'il y a des résultats ; la liste prend l'écran ; ouvrir une offre masque l'en-tête de page, le formulaire, le statut et la liste, et le détail occupe tout l'écran. Une barre `.detailbar` collante (`top: 56px`) porte « Résultats » à gauche et « Voir l'offre » à droite ; le geste ou le bouton retour du navigateur ferme le détail (une entrée d'historique est ajoutée à l'ouverture). Le bandeau d'installation est masqué pendant le détail. Cibles tactiles de 44 px minimum ; les boutons `sm` et `icon` de 36 px ne servent qu'à des actions secondaires en ligne.

Application installée : `manifest.webmanifest` en `standalone`, `theme_color` #08397A, `background_color` #EDF1F6, icônes 192, 512 et maskable 512 générées depuis la marque radar (cercles concentriques, aiguille et point), plus icône Apple et badge de notification.

## Elevation & Depth

Système plat, avec deux ombres seulement, plus un filet d'ombre sur la barre d'enregistrement. En clair, les feuilles, la barre de recherche et le détail ont une ombre ambiante légère ; les menus, dialogues et toasts une ombre plus marquée. En sombre, les menus et dialogues perdent l'ombre et prennent un trait fin (`--line-strong`) : jamais les deux. Les lignes de liste, d'alerte et de fournisseur n'ont pas d'ombre, seulement une bordure de 1px.

### Shadow Vocabulary
- **Ambiante** (`box-shadow: 0 1px 2px rgb(0 0 0 / .08), 0 4px 12px rgb(0 0 0 / .06)`) : feuilles, barre de recherche, résumé de recherche, détail.
- **Flottante** (`box-shadow: 0 2px 4px rgb(0 0 0 / .12), 0 8px 20px rgb(0 0 0 / .16)`) : menu de compte, dialogues, toasts.
- **Filet de barre collante** (`box-shadow: 0 -4px 12px rgb(0 0 0 / .06)`) : barre d'enregistrement du profil uniquement.

### Named Rules
**The One Float Rule.** Une fenêtre flottante porte soit une ombre (clair), soit un trait fin (sombre), jamais les deux.

## Shapes

Rayons : 8px (champs, boutons, lignes, bandeaux), 12px (feuilles, menu, dialogues, zone de dépôt, résumé de recherche), 6px pour les panneaux de score (8px en grand), pilule (999px) pour filtres, tags, cases, interrupteur, pastille de non-lus et bouton de configuration, cercle pour pastilles de sources, rang, avatar et photo. Le panneau de score fort porte un liseré blanc intérieur fin (outline 1.5px à -4px). Les bordures de champs et de pastilles font 1.5px, un trait pointillé de 2px marque le palier faible et la zone de dépôt.

## Components

### Buttons
- **Shape:** 8px, hauteur 44px (36px en `sm`, carré de 36px en `icon`), police Barlow 600 16px (14px en `sm`).
- **Primary:** fond bleu de panneau, texte blanc ; survol `brightness(1.1)`.
- **Secondary:** fond blanc, bordure `--line-strong`, survol bleu pâle. **Ghost:** transparent, texte atténué (outils monter / descendre / retirer). **Danger:** blanc, texte et bordure rouges. **Lien** (`linkbtn`) : texte souligné, 44px de haut.
- **Disabled:** opacité .5, curseur interdit (Nouvelle alerte à 3 alertes, Lancer maintenant pendant un passage).

### Chips and Tags
- **Source chip:** pilule 44px, bordure 1.5px, pastille ronde de 30px à gauche (initiales, bordure bleue). Sélectionnée : fond bleu, texte blanc, pastille à bordure blanche. Le même motif sert aux cases du profil (`check`) et à la sélection de sites dans l'alerte.
- **Tag d'état:** pilule de 13px 600, bleu pâle par défaut, vert (Disponible, Validé, cet appareil), ambre (Clé refusée, En pause jusqu'à hh:mm, À vérifier, Nouveau). Toujours un libellé.
- **Pastille de non-lus** (`badge`): pilule blanche de 20px, chiffre bleu profond, accolée à l'onglet Alertes ; « 9+ » au-delà de neuf ; masquée à zéro.

### Cards / Containers
- **Feuille:** blanc, rayon 12px, bordure `--line`, ombre ambiante, padding 28px (20px mobile).
- **Ligne de liste** (alerte, fournisseur, bloc `entry`): blanc, rayon 8px, bordure 1px `--line`, padding 14-16px, sans ombre.
- **Bandeaux:** rayon 8px, fond pâle (bleu, ambre, rouge, vert) et icône colorée, texte en gras pour le titre.
- **États vides:** centrés, icône de 44px bleue, titre en `h2` d'encre, texte atténué de 44ch max. **Squelette:** bloc de 76px, dégradé `--line` / `--ground` qui défile.

### Inputs / Fields
- **Style:** 44px, bordure 1.5px `--line-strong`, rayon 8px, fond blanc ; libellé au-dessus en 14px 600.
- **Focus:** anneau de 3px `--focus` (bleu en clair, jaune en sombre et dans la barre), bordure suit.
- **Curseur** (`input[type=range]`) : 44px, `accent-color` d'action ; la valeur courante s'affiche dans le libellé (score minimum de l'alerte, 40 à 95 par pas de 5).
- **Interrupteur** (`switch`): piste de 44x26px grise (`--line-strong`), bleue quand active, pastille blanche de 20px qui glisse (.15s) ; zone de frappe de 44px ; l'état est annoncé en `role="switch"`.

### Navigation
- **App bar:** panneau bleu profond 60px, marque Barlow Semi Condensed 22px, onglets Recherche, Alertes (avec pastille), Profil en 17px ; l'onglet courant est souligné en jaune de 4px. Sous 720px : 56px, marque réduite à l'icône, onglets en 16 puis 15px.
- **Menu de compte:** bouton rond de 40px (photo ou initiales) à bordure claire ; menu de 340px, animation `pop` de .14s, en-tête avec photo de 44px et nom, entrées Mon profil (tag Validé / À vérifier / Vide), Paramètres (tag IA), Installer l'application si possible, Se déconnecter. Clavier géré (flèches, Échap, Tab ferme).
- **Bouton de configuration:** pilule 36px à bordure claire « Terminer la configuration » tant que l'IA ou le CV manque.
- **Photo** (`pic`): disque de 36px (44, 88 en variantes `lg`, `xl`), image recadrée en `cover`, repli en initiales Barlow Semi Condensed sur bleu pâle. Dans la barre, le fond est un voile blanc translucide.

### Bandeau d'installation et de notification
Bande bleu pâle sous la barre (`installbar`), pleine largeur, contenu aligné sur la colonne de 1120 px : icône de 24px, phrase de 15px avec le titre en gras, boutons `sm` « Activer / Installer » (ou « Comment faire » sur iPhone) et « Plus tard » en ghost. Un seul bandeau à la fois, notifications avant installation. Sur mobile, le texte passe sur toute la largeur et les boutons se placent dessous, décalés de 36px. Masqué pendant l'affichage d'un détail. Jamais insistant : « Plus tard » repousse (7 jours notifications, 14 jours installation), deux refus l'arrêtent.

### Dialogue et toasts
- **Dialogue:** `dialog` natif, 520px max, blanc, rayon 12px, padding 28px, ombre flottante (trait fin en sombre), fond voilé marine à 55 %, actions alignées à droite. Sert à créer / modifier une alerte, coller un CV, l'analyse en cours (non annulable) et le mode d'emploi iPhone.
- **Étapes d'installation** (`ol.steps`): liste numérotée de 22px de retrait, éléments espacés de 10px, icône de partage alignée sur le texte.
- **Toast:** bloc encre (#14181F) à texte blanc, rouge d'erreur pour les échecs, centré à 24px du bas, ombre flottante, `role="status"` poli.

### Signature : panneau de match
Le score se lit comme une distance sur un panneau : **fort** (70+) plein bleu, texte blanc, liseré blanc ; **moyen** (45-69) fond blanc, contour bleu 2.5px ; **faible** contour pointillé gris 2px ; **aucun** pointillé fin. Taille liste 64x48px, grande 96x80px dans le détail, secondaire 72x56px (score CV). Utilisé aussi dans les rapports d'alerte.

### Signature : ligne de résultat
Grille pastille (30px), titre sur deux lignes max avec entreprise · lieu, panneau de match à droite. Ligne courante : fond bleu pâle, contour bleu de 2px, pastille jaune. Dans un rapport d'alerte, la ligne est un lien externe et ajoute le verdict sur deux lignes. Entrée en cascade (0.5s, décalage de 45ms par ligne) : seule animation d'ensemble du produit, avec le pop du menu. Mouvement coupé sous `prefers-reduced-motion`.

### Alertes
Ligne d'alerte en grille interrupteur / texte / outils : nom, détail (poste · lieu · score ≥ n % · sites), ligne d'état (« Passage en cours » avec rotor, « Dernier passage : … · n offres retenues », erreur en rouge, saut en ambre). Outils : « Lancer maintenant » (secondaire `sm` avec horloge), modifier, supprimer (ghost icône). Pendant un passage, la page se rafraîchit toutes les 5 secondes. Les rapports non lus sont marqués lus après 2 secondes.

### Fournisseurs d'IA
`provrow` : rang rond de 28px (ordre de bascule), nom en 17px 600, tags d'état (Principal, Disponible, Clé refusée, En pause), message d'erreur en sous-ligne, outils monter / descendre / retirer. Le premier ne peut pas monter, le dernier ne peut pas descendre. La liste est suivie du formulaire d'ajout (sélecteur, clé API en champ masqué, note de sécurité).

### Profil
Sommaire collant (`toc`) de liens en Barlow Semi Condensed 16px, survol bleu pâle ; sections à ancre avec défilement doux. Bloc `idblock` : photo de 88px à gauche des champs (au-dessus sous 720px). Barre d'enregistrement collante (`savebar`) au pied de la colonne : Enregistrer / Valider, Réimporter un CV, mention ambre « Modifications non enregistrées ». Import : zone de dépôt pleine largeur de 240px (bordure pointillée 2px, icône, titre en 22px, survol et dépôt en bleu pâle, désactivée à opacité .55 sur le contenu quand l'IA manque), puis liens « Coller le texte » et « Remplir à la main ».

## Do's and Don'ts

### Do:
- **Do** réserver le jaune #FFD500 à la sélection et au focus.
- **Do** doubler chaque palier de score par une forme (plein, contour, pointillé) et chaque état par un libellé.
- **Do** garder les cibles à 44px et un anneau de focus de 3px visible en clair comme en sombre.
- **Do** servir les polices et les icônes depuis l'application (CSP stricte, aucun style en ligne, icônes SVG en trait de 1.75).
- **Do** utiliser les variables de `:root` plutôt que des valeurs en dur.
- **Do** garder les invitations (notifications, installation) à un seul bandeau, repoussables et non insistantes.
- **Do** traiter le détail d'offre mobile comme un écran : barre collante, retour du navigateur qui ferme.

### Don't:
- **Don't** revenir au tableau de bord de cartes identiques avec badge vert.
- **Don't** utiliser le jaune comme couleur d'action ou de décor.
- **Don't** cumuler ombre et trait sur une fenêtre flottante en sombre.
- **Don't** charger de police ou de bibliothèque externe.
- **Don't** ajouter d'animation d'ensemble autre que la cascade des résultats et le pop du menu (les retours d'état, interrupteur .15s, rotor et squelette, restent locaux).

## Écarts connus (non réparés)

Relevés dans le code livré, à ne pas reprendre comme règles :
- **Valeurs en dur contre jetons** : la pastille source (`.roundel`) fixe `#fff` et `#0B4F9C` au lieu de `--panel` / `--blue`, donc elle reste blanche en sombre ; le toast fixe `#14181F` / `#fff` ; la pastille de l'interrupteur, la case cochée du profil et le voile de l'avatar sont en blanc codé ; l'ombre de la barre d'enregistrement n'est pas un jeton.
- **Cibles sous 44px** : boutons `sm` et `icon` (36px), bouton de configuration (36px), bouton d'avatar (40px) ; tolérés pour des actions secondaires, mais l'avatar est une commande principale.
- **Doubles déclarations** : `.menu` (288px puis 340px), `.savebar` (marges redéfinies avec `!important`), `.drop` (200px puis 240px) ; la dernière valeur gagne et c'est celle documentée.
- **Décalage de 4px** : `.detailbar` colle à `top: 56px`, hauteur de la barre compacte ; entre 721 et 1000px la barre mesure 60px, la barre de détail passe donc 4px sous elle.
- **Seuils de score** (70 / 45) vérifiés dans `lib.js` (fonction `tier`), pas dans la feuille de style.
