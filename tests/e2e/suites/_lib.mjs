// Ouvre le panneau « Plus de filtres » s'il est replié.
export const more = async (p) => { if (!(await p.isVisible('#n'))) await p.click('#moreBtn'); };
