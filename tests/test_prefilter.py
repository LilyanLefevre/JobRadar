import os, sys, unittest
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "worker"))
from prefilter import salary, contrat, remote, relevance, places

class T(unittest.TestCase):
    def test_salaires(self):
        for txt, out in [("Salaire : 45 000 à 55 000 € brut annuel", "45 – 55 k€ / an"), ("Rémunération 45-55k€", "45 – 55 k€ / an"),
                         ("Entre 2 800 et 3 200 € par mois", "2\u202f800 – 3\u202f200 € / mois"), ("Salaire 38k€", "38 k€ / an"),
                         ("TJM 450 €", "450 € / jour"), ("35 €/h", "35 € / heure")]:
            self.assertEqual(salary({}, txt)["texte"], out, txt)
        for txt in ["CA de 5 000 000 € en 2024", "Prime de 500 € brut", "Rien ici"]:
            self.assertIsNone(salary({}, txt), txt)
    def test_champs_fiche(self):
        self.assertEqual(salary({"min_amount": 40000, "max_amount": 50000, "interval": "yearly"}, "")["texte"], "40 – 50 k€ / an")
    def test_contrat_teletravail(self):
        self.assertEqual(contrat({}, "CDI temps plein"), "CDI"); self.assertEqual(remote({}, "poste hybride"), "Hybride"); self.assertEqual(remote({}, "full remote"), "Télétravail complet")
    def test_pertinence(self):
        self.assertGreater(relevance("Développeur React", "TypeScript", "développeur react", ["React", "TypeScript"]), relevance("Cuisinier", "restaurant", "développeur react", ["React"]))
    def test_lieux(self):
        self.assertEqual(places("Lyon, France; Paris ;; Nantes; Lille"), ["Lyon, France", "Paris", "Nantes"]); self.assertEqual(places(["A", " "]), ["A"]); self.assertEqual(places(None), [])

unittest.main() if __name__ == "__main__" else None
