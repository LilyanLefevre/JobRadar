---
version: 1
slug: "server-pb-public-index-html"
primary_target: "server/pb_public/index.html"
related_targets: ["server/pb_public/search.js","server/pb_public/profile.js","server/pb_public/settings.js"]
---

# Surface : application JobRadar (Recherche, Mon profil, Paramètres)

Mode : Operate. Utilisateur : chercheur d'emploi en France qui trie vite des dizaines d'offres. Tâche : repérer les meilleures offres, lire la description, décider ; ensuite adapter son CV. Contraintes : HTML/CSS/JS natifs sans build, CSP stricte (aucun style en ligne, polices servies par l'application), clair et sombre, AA.

Résolu : navigation avec onglets + menu de compte (avatar) ; contenu centré (colonne 1120 px) ; remplacer l'ancien gabarit « cartes vertes ».
Non résolu : notifications et recherches automatiques (hors périmètre).

## Direction contract

THESIS: Chaque offre est une destination. On lit une liste classée comme on lit un panneau de direction : un coup d'œil, la distance (le match) en grand, la pastille de la source. Refuse le tableau de bord de cartes identiques avec badge vert.

OWN-WORLD: Panneaux de direction français. Bleu de panneau #0B4F9C pour la barre d'application et les états forts, blanc, jaune de balisage #FFD500 réservé à la sélection et au focus, encre #14181F, fond bleu-gris très clair ; sombre : marine #0A1220. Lettrage Barlow Semi Condensed gras (titres, scores) et Barlow (texte), chiffres tabulaires. Liseré intérieur blanc fin sur les panneaux, pastilles rondes de sources (initiales, comme des numéros de route). Reconnaissable sans contenu : panneaux bleus à liseré blanc, pastilles rondes, jaune pour la sélection.

STORY: En quelques secondes l'utilisateur voit quelles offres sont proches de son profil (distance = match), lit la description, choisit sa direction. Il comprend que l'IA propose et qu'il vérifie son profil. La configuration est suggérée sans bloquer.

FIRST VIEWPORT: Barre bleue de 56 px : marque à gauche, onglets Recherche et Mon profil, à droite l'indicateur de configuration et le bouton de compte (initiales) qui ouvre un menu (Mon profil, Paramètres, IA, Déconnexion). Dessous, une colonne centrée de 1120 px : titre, puis une barre de recherche compacte (poste, lieu, sites en pastilles, bouton Rechercher bleu). Puis deux colonnes : liste de 400 px de panneaux (pastille de source, titre, entreprise · lieu, panneau de match à droite, blanc sur bleu pour 70+, contour pour 45-69, pointillé gris en dessous) et détail collant à droite (titre, deux grandes distances match/CV, verdict, forces, manques, description rendue). Action principale : Rechercher, en bleu, en haut à gauche de la zone de résultats.

FORM: Signalisation routière (panneaux de direction français), n°1 de ma liste classée, choisie par l'utilisateur sur la page de décision ; seed 5cb2153d. Geste signature : le match est une distance sur un panneau, la liste se lit comme un panneau de destinations ; les paliers se distinguent aussi par la forme (plein, contour, pointillé), pas seulement la couleur.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
