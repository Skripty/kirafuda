// Fonction Supabase « soumettre-draft » — FICHIER GÉNÉRÉ par `npm run fonctions`, ne pas modifier à la main.
// Empreinte des sources : 5e9261345590dbb2
// Sources : src/core/catalogue.ts, src/core/classement.ts, src/core/draft.ts, src/core/extension.ts, src/core/regles.ts, src/core/rng.ts, src/core/tirage.ts, src/data/booster-lancement.json, src/data/extension-lancement.json, src/data/extension-renforts.json, src/data/extensions.json, src/data/quetes.json, src/data/themes-draft.json, supabase/fonctions/base-rest.ts, supabase/fonctions/contexte.ts, supabase/fonctions/donnees.ts, supabase/fonctions/draft-serveur.ts, supabase/fonctions/soumettre-draft.ts
// @ts-nocheck
const id$2 = "booster-lancement";
const extension = "lancement";
const nom$2 = "Booster Lancement";
const cartesParBooster = 5;
const cout = {
  ressource: "sceaux",
  quantite: 1
};
const pointsParOuverture = 5;
const tauxExceptionnel = 50;
const emplacements = [
  {
    emplacements: [
      1,
      2,
      3
    ],
    finitions: {
      commune: 1e5
    }
  },
  {
    emplacements: [
      4
    ],
    finitions: {
      "peu-commune": 9e4,
      holo: 5e3,
      "holo-integrale": 1666,
      pleine: 2572,
      alternative: 500,
      immersive: 222,
      couronne: 40
    }
  },
  {
    emplacements: [
      5
    ],
    finitions: {
      "peu-commune": 6e4,
      holo: 2e4,
      "holo-integrale": 6664,
      pleine: 10288,
      alternative: 2e3,
      immersive: 888,
      couronne: 160
    }
  }
];
const tableExceptionnelle = {
  finitions: {
    pleine: 55e3,
    alternative: 3e4,
    immersive: 12e3,
    couronne: 3e3
  }
};
const _note$2 = "Poids entiers sur 100000. Chaque emplacement tire une finition (rareté), puis une carte de cette rareté à poids égaux. Emplacements 4 et 5 = taux de Pokémon TCG Pocket.";
const __vite_glob_0_0 = {
  id: id$2,
  extension,
  nom: nom$2,
  cartesParBooster,
  cout,
  pointsParOuverture,
  tauxExceptionnel,
  emplacements,
  tableExceptionnelle,
  _note: _note$2
};
const id$1 = "lancement";
const nom$1 = "Lancement";
const edition$1 = 1;
const total$1 = 100;
const totalAvecSecretes$1 = 140;
const _note$1 = "Une carte = un personnage dans une rareté fixe (système TCG Pocket). Les PV et attaques sont ceux du personnage, identiques sur toutes ses cartes.";
const personnages$1 = [
  {
    id: "per-001",
    nom: "Monkey D. Luffy",
    serie: "One Piece",
    rang: "S",
    element: "lumiere",
    pv: 80,
    attaques: [
      {
        nom: "Lance sacrée",
        cout: 1,
        degats: 40,
        effet: {
          type: "recul",
          valeur: 10
        }
      },
      {
        nom: "Nova",
        cout: 3,
        degats: 130,
        effet: {
          type: "charge"
        }
      }
    ]
  },
  {
    id: "per-002",
    nom: "Roronoa Zoro",
    serie: "One Piece",
    rang: "A",
    element: "vent",
    pv: 120,
    attaques: [
      {
        nom: "Bourrasque",
        cout: 1,
        degats: 30,
        effet: null
      },
      {
        nom: "Tempête de lames",
        cout: 3,
        degats: 110,
        effet: null
      }
    ]
  },
  {
    id: "per-003",
    nom: "Nico Robin",
    serie: "One Piece",
    rang: "B",
    element: "terre",
    pv: 70,
    attaques: [
      {
        nom: "Secousse",
        cout: 1,
        degats: 30,
        effet: null
      },
      {
        nom: "Faille",
        cout: 3,
        degats: 110,
        effet: null
      }
    ]
  },
  {
    id: "per-004",
    nom: "Naruto Uzumaki",
    serie: "Naruto",
    rang: "A",
    element: "vent",
    pv: 80,
    attaques: [
      {
        nom: "Sifflement",
        cout: 1,
        degats: 20,
        effet: null
      },
      {
        nom: "Tempête de lames",
        cout: 3,
        degats: 110,
        effet: null
      }
    ]
  },
  {
    id: "per-005",
    nom: "Sasuke Uchiha",
    serie: "Naruto",
    rang: "A",
    element: "foudre",
    pv: 130,
    attaques: [
      {
        nom: "Crépitement",
        cout: 1,
        degats: 20,
        effet: {
          type: "perce-bouclier"
        }
      },
      {
        nom: "Lame d'orage",
        cout: 2,
        degats: 70,
        effet: null
      }
    ]
  },
  {
    id: "per-006",
    nom: "Itachi Uchiha",
    serie: "Naruto",
    rang: "S",
    element: "tenebres",
    pv: 80,
    attaques: [
      {
        nom: "Voile noir",
        cout: 1,
        degats: 20,
        effet: {
          type: "esquive"
        }
      },
      {
        nom: "Étreinte des ombres",
        cout: 2,
        degats: 50,
        effet: {
          type: "malediction"
        }
      }
    ]
  },
  {
    id: "per-007",
    nom: "Satoru Gojo",
    serie: "Jujutsu Kaisen",
    rang: "S",
    element: "lumiere",
    pv: 130,
    attaques: [
      {
        nom: "Clarté",
        cout: 1,
        degats: 20,
        effet: null
      },
      {
        nom: "Rayon solaire",
        cout: 2,
        degats: 70,
        effet: null
      }
    ]
  },
  {
    id: "per-008",
    nom: "Yuji Itadori",
    serie: "Jujutsu Kaisen",
    rang: "A",
    element: "foudre",
    pv: 70,
    attaques: [
      {
        nom: "Statique",
        cout: 1,
        degats: 20,
        effet: null
      },
      {
        nom: "Choc paralysant",
        cout: 2,
        degats: 50,
        effet: {
          type: "paralysie"
        }
      }
    ]
  },
  {
    id: "per-009",
    nom: "Megumi Fushiguro",
    serie: "Jujutsu Kaisen",
    rang: "A",
    element: "tenebres",
    pv: 80,
    attaques: [
      {
        nom: "Griffe d'ombre",
        cout: 1,
        degats: 30,
        effet: null
      },
      {
        nom: "Lune noire",
        cout: 2,
        degats: 60,
        effet: null
      }
    ]
  },
  {
    id: "per-010",
    nom: "Nobara Kugisaki",
    serie: "Jujutsu Kaisen",
    rang: "B",
    element: "terre",
    pv: 110,
    attaques: [
      {
        nom: "Poussière",
        cout: 1,
        degats: 20,
        effet: null
      },
      {
        nom: "Météorite",
        cout: 3,
        degats: 120,
        effet: {
          type: "recul",
          valeur: 30
        }
      }
    ]
  },
  {
    id: "per-011",
    nom: "Ryomen Sukuna",
    serie: "Jujutsu Kaisen",
    rang: "A",
    element: "tenebres",
    pv: 120,
    attaques: [
      {
        nom: "Sombre présage",
        cout: 1,
        degats: 20,
        effet: {
          type: "malediction"
        }
      },
      {
        nom: "Pacte maudit",
        cout: 3,
        degats: 100,
        effet: {
          type: "soin",
          valeur: 30
        }
      }
    ]
  },
  {
    id: "per-012",
    nom: "Suguru Geto",
    serie: "Jujutsu Kaisen",
    rang: "B",
    element: "tenebres",
    pv: 60,
    attaques: [
      {
        nom: "Murmure",
        cout: 1,
        degats: 20,
        effet: {
          type: "malediction"
        }
      },
      {
        nom: "Pacte maudit",
        cout: 3,
        degats: 100,
        effet: {
          type: "soin",
          valeur: 30
        }
      }
    ]
  },
  {
    id: "per-013",
    nom: "Yuta Okkotsu",
    serie: "Jujutsu Kaisen",
    rang: "B",
    element: "lumiere",
    pv: 60,
    attaques: [
      {
        nom: "Halo",
        cout: 1,
        degats: 30,
        effet: null
      },
      {
        nom: "Nova",
        cout: 3,
        degats: 130,
        effet: {
          type: "charge"
        }
      }
    ]
  },
  {
    id: "per-014",
    nom: "Toji Fushiguro",
    serie: "Jujutsu Kaisen",
    rang: "B",
    element: "neutre",
    pv: 110,
    attaques: [
      {
        nom: "Pas de côté",
        cout: 1,
        degats: 20,
        effet: {
          type: "esquive"
        }
      },
      {
        nom: "Plan parfait",
        cout: 2,
        degats: 60,
        effet: {
          type: "perce-bouclier"
        }
      }
    ]
  },
  {
    id: "per-015",
    nom: "Maki Zenin",
    serie: "Jujutsu Kaisen",
    rang: "B",
    element: "vent",
    pv: 70,
    attaques: [
      {
        nom: "Tourbillon court",
        cout: 1,
        degats: 30,
        effet: null
      },
      {
        nom: "Cyclone",
        cout: 2,
        degats: 60,
        effet: null
      }
    ]
  },
  {
    id: "per-016",
    nom: "Kento Nanami",
    serie: "Jujutsu Kaisen",
    rang: "B",
    element: "neutre",
    pv: 90,
    attaques: [
      {
        nom: "Coup de pied",
        cout: 1,
        degats: 30,
        effet: null
      },
      {
        nom: "Charge téméraire",
        cout: 2,
        degats: 70,
        effet: {
          type: "recul",
          valeur: 20
        }
      }
    ]
  },
  {
    id: "per-017",
    nom: "Denji",
    serie: "Chainsaw Man",
    rang: "A",
    element: "feu",
    pv: 120,
    attaques: [
      {
        nom: "Poing de braise",
        cout: 1,
        degats: 30,
        effet: null
      },
      {
        nom: "Envol du phénix",
        cout: 3,
        degats: 90,
        effet: {
          type: "soin",
          valeur: 20
        }
      }
    ]
  },
  {
    id: "per-018",
    nom: "Makima",
    serie: "Chainsaw Man",
    rang: "A",
    element: "tenebres",
    pv: 100,
    attaques: [
      {
        nom: "Lame sombre",
        cout: 1,
        degats: 30,
        effet: null
      },
      {
        nom: "Pacte maudit",
        cout: 3,
        degats: 100,
        effet: {
          type: "soin",
          valeur: 30
        }
      }
    ]
  },
  {
    id: "per-019",
    nom: "Power",
    serie: "Chainsaw Man",
    rang: "A",
    element: "tenebres",
    pv: 110,
    attaques: [
      {
        nom: "Griffe d'ombre",
        cout: 1,
        degats: 30,
        effet: null
      },
      {
        nom: "Néant",
        cout: 3,
        degats: 130,
        effet: {
          type: "charge"
        }
      }
    ]
  },
  {
    id: "per-020",
    nom: "Aki Hayakawa",
    serie: "Chainsaw Man",
    rang: "B",
    element: "glace",
    pv: 80,
    attaques: [
      {
        nom: "Pointe gelée",
        cout: 1,
        degats: 30,
        effet: null
      },
      {
        nom: "Tempête de cristal",
        cout: 3,
        degats: 110,
        effet: null
      }
    ]
  },
  {
    id: "per-021",
    nom: "Reze",
    serie: "Chainsaw Man",
    rang: "B",
    element: "feu",
    pv: 150,
    attaques: [
      {
        nom: "Étincelle",
        cout: 1,
        degats: 20,
        effet: {
          type: "brulure"
        }
      },
      {
        nom: "Fournaise infernale",
        cout: 3,
        degats: 110,
        effet: {
          type: "brulure"
        }
      }
    ]
  },
  {
    id: "per-022",
    nom: "Himeno",
    serie: "Chainsaw Man",
    rang: "C",
    element: "vent",
    pv: 60,
    attaques: [
      {
        nom: "Pas léger",
        cout: 1,
        degats: 20,
        effet: {
          type: "esquive"
        }
      },
      {
        nom: "Ouragan",
        cout: 3,
        degats: 120,
        effet: {
          type: "recul",
          valeur: 30
        }
      }
    ]
  },
  {
    id: "per-023",
    nom: "Quanxi",
    serie: "Chainsaw Man",
    rang: "C",
    element: "foudre",
    pv: 60,
    attaques: [
      {
        nom: "Crépitement",
        cout: 1,
        degats: 20,
        effet: {
          type: "perce-bouclier"
        }
      },
      {
        nom: "Foudre en chaîne",
        cout: 2,
        degats: 60,
        effet: null
      }
    ]
  },
  {
    id: "per-024",
    nom: "Asa Mitaka",
    serie: "Chainsaw Man",
    rang: "C",
    element: "neutre",
    pv: 160,
    attaques: [
      {
        nom: "Frappe rapide",
        cout: 1,
        degats: 30,
        effet: null
      },
      {
        nom: "Plan parfait",
        cout: 2,
        degats: 60,
        effet: {
          type: "perce-bouclier"
        }
      }
    ]
  },
  {
    id: "per-025",
    nom: "Eren Yeager",
    serie: "L'Attaque des Titans",
    rang: "A",
    element: "terre",
    pv: 140,
    attaques: [
      {
        nom: "Poussière",
        cout: 1,
        degats: 20,
        effet: null
      },
      {
        nom: "Montagne vivante",
        cout: 3,
        degats: 90,
        effet: {
          type: "bouclier",
          valeur: 30
        }
      }
    ]
  },
  {
    id: "per-026",
    nom: "Mikasa Ackerman",
    serie: "L'Attaque des Titans",
    rang: "A",
    element: "vent",
    pv: 70,
    attaques: [
      {
        nom: "Brise",
        cout: 1,
        degats: 20,
        effet: {
          type: "esquive"
        }
      },
      {
        nom: "Tornade",
        cout: 2,
        degats: 60,
        effet: {
          type: "perce-bouclier"
        }
      }
    ]
  },
  {
    id: "per-027",
    nom: "Levi Ackerman",
    serie: "L'Attaque des Titans",
    rang: "S",
    element: "vent",
    pv: 70,
    attaques: [
      {
        nom: "Pas léger",
        cout: 1,
        degats: 20,
        effet: {
          type: "esquive"
        }
      },
      {
        nom: "Tornade",
        cout: 2,
        degats: 60,
        effet: {
          type: "perce-bouclier"
        }
      }
    ]
  },
  {
    id: "per-028",
    nom: "Armin Arlert",
    serie: "L'Attaque des Titans",
    rang: "B",
    element: "feu",
    pv: 90,
    attaques: [
      {
        nom: "Cendres vives",
        cout: 1,
        degats: 30,
        effet: null
      },
      {
        nom: "Envol du phénix",
        cout: 3,
        degats: 90,
        effet: {
          type: "soin",
          valeur: 20
        }
      }
    ]
  },
  {
    id: "per-029",
    nom: "Erwin Smith",
    serie: "L'Attaque des Titans",
    rang: "B",
    element: "lumiere",
    pv: 140,
    attaques: [
      {
        nom: "Rayon",
        cout: 1,
        degats: 30,
        effet: null
      },
      {
        nom: "Aurore",
        cout: 2,
        degats: 60,
        effet: null
      }
    ]
  },
  {
    id: "per-030",
    nom: "Annie Leonhart",
    serie: "L'Attaque des Titans",
    rang: "B",
    element: "glace",
    pv: 100,
    attaques: [
      {
        nom: "Cristal",
        cout: 1,
        degats: 20,
        effet: {
          type: "bouclier",
          valeur: 10
        }
      },
      {
        nom: "Zéro absolu",
        cout: 3,
        degats: 130,
        effet: {
          type: "charge"
        }
      }
    ]
  },
  {
    id: "per-031",
    nom: "Reiner Braun",
    serie: "L'Attaque des Titans",
    rang: "C",
    element: "terre",
    pv: 150,
    attaques: [
      {
        nom: "Poussière",
        cout: 1,
        degats: 20,
        effet: null
      },
      {
        nom: "Pic rocheux",
        cout: 2,
        degats: 60,
        effet: null
      }
    ]
  },
  {
    id: "per-032",
    nom: "Historia Reiss",
    serie: "L'Attaque des Titans",
    rang: "C",
    element: "lumiere",
    pv: 150,
    attaques: [
      {
        nom: "Halo",
        cout: 1,
        degats: 30,
        effet: null
      },
      {
        nom: "Purification",
        cout: 2,
        degats: 50,
        effet: {
          type: "soin",
          valeur: 20
        }
      }
    ]
  },
  {
    id: "per-033",
    nom: "Tanjiro Kamado",
    serie: "Demon Slayer",
    rang: "A",
    element: "eau",
    pv: 160,
    attaques: [
      {
        nom: "Goutte perçante",
        cout: 1,
        degats: 30,
        effet: null
      },
      {
        nom: "Dragon des eaux",
        cout: 3,
        degats: 100,
        effet: {
          type: "ralentissement"
        }
      }
    ]
  },
  {
    id: "per-034",
    nom: "Nezuko Kamado",
    serie: "Demon Slayer",
    rang: "A",
    element: "feu",
    pv: 70,
    attaques: [
      {
        nom: "Coup ardent",
        cout: 1,
        degats: 30,
        effet: null
      },
      {
        nom: "Embrasement total",
        cout: 3,
        degats: 130,
        effet: {
          type: "charge"
        }
      }
    ]
  },
  {
    id: "per-035",
    nom: "Zenitsu Agatsuma",
    serie: "Demon Slayer",
    rang: "B",
    element: "foudre",
    pv: 90,
    attaques: [
      {
        nom: "Coup éclair",
        cout: 1,
        degats: 30,
        effet: null
      },
      {
        nom: "Jugement de l'orage",
        cout: 3,
        degats: 110,
        effet: {
          type: "perce-bouclier"
        }
      }
    ]
  },
  {
    id: "per-036",
    nom: "Inosuke Hashibira",
    serie: "Demon Slayer",
    rang: "B",
    element: "terre",
    pv: 80,
    attaques: [
      {
        nom: "Poussière",
        cout: 1,
        degats: 20,
        effet: null
      },
      {
        nom: "Pic rocheux",
        cout: 2,
        degats: 60,
        effet: null
      }
    ]
  },
  {
    id: "per-037",
    nom: "Giyu Tomioka",
    serie: "Demon Slayer",
    rang: "B",
    element: "eau",
    pv: 110,
    attaques: [
      {
        nom: "Bruine",
        cout: 1,
        degats: 20,
        effet: {
          type: "soin",
          valeur: 10
        }
      },
      {
        nom: "Danse des flots",
        cout: 2,
        degats: 60,
        effet: {
          type: "soin",
          valeur: 20
        }
      }
    ]
  },
  {
    id: "per-038",
    nom: "Shinobu Kocho",
    serie: "Demon Slayer",
    rang: "B",
    element: "vent",
    pv: 130,
    attaques: [
      {
        nom: "Souffle",
        cout: 1,
        degats: 20,
        effet: {
          type: "perce-bouclier"
        }
      },
      {
        nom: "Danse aérienne",
        cout: 2,
        degats: 50,
        effet: {
          type: "esquive"
        }
      }
    ]
  },
  {
    id: "per-039",
    nom: "Muzan Kibutsuji",
    serie: "Demon Slayer",
    rang: "B",
    element: "tenebres",
    pv: 90,
    attaques: [
      {
        nom: "Voile noir",
        cout: 1,
        degats: 20,
        effet: {
          type: "esquive"
        }
      },
      {
        nom: "Domaine des ombres",
        cout: 3,
        degats: 110,
        effet: {
          type: "malediction"
        }
      }
    ]
  },
  {
    id: "per-040",
    nom: "Kyojuro Rengoku",
    serie: "Demon Slayer",
    rang: "A",
    element: "feu",
    pv: 110,
    attaques: [
      {
        nom: "Cendres vives",
        cout: 1,
        degats: 30,
        effet: null
      },
      {
        nom: "Fournaise infernale",
        cout: 3,
        degats: 110,
        effet: {
          type: "brulure"
        }
      }
    ]
  },
  {
    id: "per-041",
    nom: "Sung Jin-Woo",
    serie: "Solo Leveling",
    rang: "S",
    element: "tenebres",
    pv: 160,
    attaques: [
      {
        nom: "Ombre furtive",
        cout: 1,
        degats: 30,
        effet: null
      },
      {
        nom: "Pacte maudit",
        cout: 3,
        degats: 100,
        effet: {
          type: "soin",
          valeur: 30
        }
      }
    ]
  },
  {
    id: "per-042",
    nom: "Cha Hae-In",
    serie: "Solo Leveling",
    rang: "B",
    element: "lumiere",
    pv: 90,
    attaques: [
      {
        nom: "Éclat",
        cout: 1,
        degats: 30,
        effet: null
      },
      {
        nom: "Sanctuaire",
        cout: 3,
        degats: 90,
        effet: {
          type: "bouclier",
          valeur: 30
        }
      }
    ]
  },
  {
    id: "per-043",
    nom: "Igris",
    serie: "Solo Leveling",
    rang: "B",
    element: "feu",
    pv: 90,
    attaques: [
      {
        nom: "Morsure de feu",
        cout: 1,
        degats: 40,
        effet: {
          type: "recul",
          valeur: 10
        }
      },
      {
        nom: "Fournaise",
        cout: 2,
        degats: 70,
        effet: null
      }
    ]
  },
  {
    id: "per-044",
    nom: "Beru",
    serie: "Solo Leveling",
    rang: "B",
    element: "vent",
    pv: 90,
    attaques: [
      {
        nom: "Plume tranchante",
        cout: 1,
        degats: 30,
        effet: null
      },
      {
        nom: "Ouragan",
        cout: 3,
        degats: 120,
        effet: {
          type: "recul",
          valeur: 30
        }
      }
    ]
  },
  {
    id: "per-045",
    nom: "Thomas Andre",
    serie: "Solo Leveling",
    rang: "C",
    element: "terre",
    pv: 110,
    attaques: [
      {
        nom: "Jet de pierre",
        cout: 1,
        degats: 30,
        effet: null
      },
      {
        nom: "Montagne vivante",
        cout: 3,
        degats: 90,
        effet: {
          type: "bouclier",
          valeur: 30
        }
      }
    ]
  },
  {
    id: "per-046",
    nom: "Go Gun-Hee",
    serie: "Solo Leveling",
    rang: "C",
    element: "foudre",
    pv: 110,
    attaques: [
      {
        nom: "Éclair bref",
        cout: 1,
        degats: 40,
        effet: {
          type: "recul",
          valeur: 10
        }
      },
      {
        nom: "Foudre en chaîne",
        cout: 2,
        degats: 60,
        effet: null
      }
    ]
  },
  {
    id: "per-047",
    nom: "Ashborn",
    serie: "Solo Leveling",
    rang: "C",
    element: "tenebres",
    pv: 160,
    attaques: [
      {
        nom: "Ombre furtive",
        cout: 1,
        degats: 30,
        effet: null
      },
      {
        nom: "Éclipse",
        cout: 3,
        degats: 120,
        effet: {
          type: "recul",
          valeur: 30
        }
      }
    ]
  },
  {
    id: "per-048",
    nom: "Bellion",
    serie: "Solo Leveling",
    rang: "C",
    element: "glace",
    pv: 150,
    attaques: [
      {
        nom: "Morsure du froid",
        cout: 1,
        degats: 30,
        effet: null
      },
      {
        nom: "Blizzard",
        cout: 2,
        degats: 60,
        effet: {
          type: "ralentissement"
        }
      }
    ]
  },
  {
    id: "per-049",
    nom: "Frieren",
    serie: "Frieren",
    rang: "A",
    element: "glace",
    pv: 110,
    attaques: [
      {
        nom: "Lance de givre",
        cout: 1,
        degats: 40,
        effet: {
          type: "recul",
          valeur: 10
        }
      },
      {
        nom: "Tempête de cristal",
        cout: 3,
        degats: 110,
        effet: null
      }
    ]
  },
  {
    id: "per-050",
    nom: "Fern",
    serie: "Frieren",
    rang: "B",
    element: "vent",
    pv: 150,
    attaques: [
      {
        nom: "Bourrasque",
        cout: 1,
        degats: 30,
        effet: null
      },
      {
        nom: "Mille vents",
        cout: 3,
        degats: 110,
        effet: {
          type: "perce-bouclier"
        }
      }
    ]
  },
  {
    id: "per-051",
    nom: "Stark",
    serie: "Frieren",
    rang: "C",
    element: "terre",
    pv: 130,
    attaques: [
      {
        nom: "Jet de pierre",
        cout: 1,
        degats: 30,
        effet: null
      },
      {
        nom: "Faille",
        cout: 3,
        degats: 110,
        effet: null
      }
    ]
  },
  {
    id: "per-052",
    nom: "Himmel",
    serie: "Frieren",
    rang: "B",
    element: "lumiere",
    pv: 110,
    attaques: [
      {
        nom: "Lueur",
        cout: 1,
        degats: 20,
        effet: {
          type: "soin",
          valeur: 10
        }
      },
      {
        nom: "Ailes de lumière",
        cout: 3,
        degats: 110,
        effet: null
      }
    ]
  },
  {
    id: "per-053",
    nom: "Übel",
    serie: "Frieren",
    rang: "C",
    element: "vent",
    pv: 150,
    attaques: [
      {
        nom: "Rafale",
        cout: 1,
        degats: 40,
        effet: {
          type: "recul",
          valeur: 10
        }
      },
      {
        nom: "Tempête de lames",
        cout: 3,
        degats: 110,
        effet: null
      }
    ]
  },
  {
    id: "per-054",
    nom: "Serie",
    serie: "Frieren",
    rang: "C",
    element: "lumiere",
    pv: 140,
    attaques: [
      {
        nom: "Flèche de lumière",
        cout: 1,
        degats: 30,
        effet: null
      },
      {
        nom: "Aurore",
        cout: 2,
        degats: 60,
        effet: null
      }
    ]
  },
  {
    id: "per-055",
    nom: "Denken",
    serie: "Frieren",
    rang: "C",
    element: "feu",
    pv: 110,
    attaques: [
      {
        nom: "Lame rougeoyante",
        cout: 1,
        degats: 30,
        effet: null
      },
      {
        nom: "Lame solaire",
        cout: 2,
        degats: 60,
        effet: null
      }
    ]
  },
  {
    id: "per-056",
    nom: "Shigeo Kageyama (Mob)",
    serie: "Mob Psycho 100",
    rang: "B",
    element: "lumiere",
    pv: 60,
    attaques: [
      {
        nom: "Éclat",
        cout: 1,
        degats: 30,
        effet: null
      },
      {
        nom: "Purification",
        cout: 2,
        degats: 50,
        effet: {
          type: "soin",
          valeur: 20
        }
      }
    ]
  },
  {
    id: "per-057",
    nom: "Reigen Arataka",
    serie: "Mob Psycho 100",
    rang: "B",
    element: "neutre",
    pv: 120,
    attaques: [
      {
        nom: "Coup de pied",
        cout: 1,
        degats: 30,
        effet: null
      },
      {
        nom: "Esprit d'équipe",
        cout: 3,
        degats: 90,
        effet: {
          type: "soin",
          valeur: 30
        }
      }
    ]
  },
  {
    id: "per-058",
    nom: "Dimple",
    serie: "Mob Psycho 100",
    rang: "C",
    element: "tenebres",
    pv: 110,
    attaques: [
      {
        nom: "Maléfice",
        cout: 1,
        degats: 20,
        effet: {
          type: "malediction"
        }
      },
      {
        nom: "Lune noire",
        cout: 2,
        degats: 60,
        effet: null
      }
    ]
  },
  {
    id: "per-059",
    nom: "Teruki Hanazawa",
    serie: "Mob Psycho 100",
    rang: "C",
    element: "foudre",
    pv: 120,
    attaques: [
      {
        nom: "Étincelle vive",
        cout: 1,
        degats: 20,
        effet: {
          type: "perce-bouclier"
        }
      },
      {
        nom: "Charge électrique",
        cout: 2,
        degats: 70,
        effet: null
      }
    ]
  },
  {
    id: "per-060",
    nom: "Ritsu Kageyama",
    serie: "Mob Psycho 100",
    rang: "C",
    element: "glace",
    pv: 160,
    attaques: [
      {
        nom: "Lance de givre",
        cout: 1,
        degats: 40,
        effet: {
          type: "recul",
          valeur: 10
        }
      },
      {
        nom: "Sanctuaire gelé",
        cout: 3,
        degats: 90,
        effet: {
          type: "bouclier",
          valeur: 30
        }
      }
    ]
  },
  {
    id: "per-061",
    nom: "Toichiro Suzuki",
    serie: "Mob Psycho 100",
    rang: "C",
    element: "terre",
    pv: 130,
    attaques: [
      {
        nom: "Peau de pierre",
        cout: 1,
        degats: 20,
        effet: {
          type: "bouclier",
          valeur: 10
        }
      },
      {
        nom: "Météorite",
        cout: 3,
        degats: 120,
        effet: {
          type: "recul",
          valeur: 30
        }
      }
    ]
  },
  {
    id: "per-062",
    nom: "Thorfinn",
    serie: "Vinland Saga",
    rang: "B",
    element: "vent",
    pv: 60,
    attaques: [
      {
        nom: "Tourbillon court",
        cout: 1,
        degats: 30,
        effet: null
      },
      {
        nom: "Tempête de lames",
        cout: 3,
        degats: 110,
        effet: null
      }
    ]
  },
  {
    id: "per-063",
    nom: "Askeladd",
    serie: "Vinland Saga",
    rang: "B",
    element: "neutre",
    pv: 130,
    attaques: [
      {
        nom: "Coup de pied",
        cout: 1,
        degats: 30,
        effet: null
      },
      {
        nom: "Plan parfait",
        cout: 2,
        degats: 60,
        effet: {
          type: "perce-bouclier"
        }
      }
    ]
  },
  {
    id: "per-064",
    nom: "Canute",
    serie: "Vinland Saga",
    rang: "C",
    element: "glace",
    pv: 100,
    attaques: [
      {
        nom: "Cristal",
        cout: 1,
        degats: 20,
        effet: {
          type: "bouclier",
          valeur: 10
        }
      },
      {
        nom: "Zéro absolu",
        cout: 3,
        degats: 130,
        effet: {
          type: "charge"
        }
      }
    ]
  },
  {
    id: "per-065",
    nom: "Thorkell",
    serie: "Vinland Saga",
    rang: "C",
    element: "terre",
    pv: 70,
    attaques: [
      {
        nom: "Éboulis",
        cout: 1,
        degats: 30,
        effet: null
      },
      {
        nom: "Mur de roche",
        cout: 2,
        degats: 50,
        effet: {
          type: "bouclier",
          valeur: 20
        }
      }
    ]
  },
  {
    id: "per-066",
    nom: "Einar",
    serie: "Vinland Saga",
    rang: "C",
    element: "neutre",
    pv: 100,
    attaques: [
      {
        nom: "Coup de pied",
        cout: 1,
        degats: 30,
        effet: null
      },
      {
        nom: "Coup décisif",
        cout: 2,
        degats: 70,
        effet: null
      }
    ]
  },
  {
    id: "per-067",
    nom: "Thors",
    serie: "Vinland Saga",
    rang: "C",
    element: "eau",
    pv: 100,
    attaques: [
      {
        nom: "Goutte perçante",
        cout: 1,
        degats: 30,
        effet: null
      },
      {
        nom: "Déluge",
        cout: 3,
        degats: 130,
        effet: {
          type: "charge"
        }
      }
    ]
  },
  {
    id: "per-068",
    nom: "Twenty-Fifth Bam",
    serie: "Tower of God",
    rang: "B",
    element: "eau",
    pv: 130,
    attaques: [
      {
        nom: "Goutte perçante",
        cout: 1,
        degats: 30,
        effet: null
      },
      {
        nom: "Abysse",
        cout: 3,
        degats: 120,
        effet: {
          type: "recul",
          valeur: 30
        }
      }
    ]
  },
  {
    id: "per-069",
    nom: "Khun Aguero Agnis",
    serie: "Tower of God",
    rang: "C",
    element: "glace",
    pv: 80,
    attaques: [
      {
        nom: "Lance de givre",
        cout: 1,
        degats: 40,
        effet: {
          type: "recul",
          valeur: 10
        }
      },
      {
        nom: "Avalanche",
        cout: 3,
        degats: 120,
        effet: {
          type: "recul",
          valeur: 30
        }
      }
    ]
  },
  {
    id: "per-070",
    nom: "Rak Wraithraiser",
    serie: "Tower of God",
    rang: "C",
    element: "foudre",
    pv: 70,
    attaques: [
      {
        nom: "Éclair bref",
        cout: 1,
        degats: 40,
        effet: {
          type: "recul",
          valeur: 10
        }
      },
      {
        nom: "Tempête électrique",
        cout: 3,
        degats: 100,
        effet: {
          type: "paralysie"
        }
      }
    ]
  },
  {
    id: "per-071",
    nom: "Rachel",
    serie: "Tower of God",
    rang: "C",
    element: "neutre",
    pv: 70,
    attaques: [
      {
        nom: "Feinte",
        cout: 1,
        degats: 20,
        effet: {
          type: "perce-bouclier"
        }
      },
      {
        nom: "Coup ultime",
        cout: 3,
        degats: 110,
        effet: null
      }
    ]
  },
  {
    id: "per-072",
    nom: "Endorsi Jahad",
    serie: "Tower of God",
    rang: "C",
    element: "eau",
    pv: 110,
    attaques: [
      {
        nom: "Bruine",
        cout: 1,
        degats: 20,
        effet: {
          type: "soin",
          valeur: 10
        }
      },
      {
        nom: "Marée montante",
        cout: 2,
        degats: 70,
        effet: null
      }
    ]
  },
  {
    id: "per-073",
    nom: "Urek Mazino",
    serie: "Tower of God",
    rang: "C",
    element: "lumiere",
    pv: 130,
    attaques: [
      {
        nom: "Lueur",
        cout: 1,
        degats: 20,
        effet: {
          type: "soin",
          valeur: 10
        }
      },
      {
        nom: "Égide",
        cout: 2,
        degats: 50,
        effet: {
          type: "bouclier",
          valeur: 20
        }
      }
    ]
  },
  {
    id: "per-074",
    nom: "Yuri Jahad",
    serie: "Tower of God",
    rang: "C",
    element: "feu",
    pv: 60,
    attaques: [
      {
        nom: "Coup ardent",
        cout: 1,
        degats: 30,
        effet: null
      },
      {
        nom: "Éruption",
        cout: 2,
        degats: 70,
        effet: null
      }
    ]
  },
  {
    id: "per-075",
    nom: "Kim Dokja",
    serie: "Omniscient Reader's Viewpoint",
    rang: "B",
    element: "neutre",
    pv: 90,
    attaques: [
      {
        nom: "Pas de côté",
        cout: 1,
        degats: 20,
        effet: {
          type: "esquive"
        }
      },
      {
        nom: "Coup ultime",
        cout: 3,
        degats: 110,
        effet: null
      }
    ]
  },
  {
    id: "per-076",
    nom: "Yoo Joonghyuk",
    serie: "Omniscient Reader's Viewpoint",
    rang: "C",
    element: "feu",
    pv: 80,
    attaques: [
      {
        nom: "Étincelle",
        cout: 1,
        degats: 20,
        effet: {
          type: "brulure"
        }
      },
      {
        nom: "Météore ardent",
        cout: 3,
        degats: 120,
        effet: {
          type: "recul",
          valeur: 30
        }
      }
    ]
  },
  {
    id: "per-077",
    nom: "Han Sooyoung",
    serie: "Omniscient Reader's Viewpoint",
    rang: "C",
    element: "vent",
    pv: 70,
    attaques: [
      {
        nom: "Tourbillon court",
        cout: 1,
        degats: 30,
        effet: null
      },
      {
        nom: "Œil du cyclone",
        cout: 3,
        degats: 100,
        effet: {
          type: "esquive"
        }
      }
    ]
  },
  {
    id: "per-078",
    nom: "Jung Heewon",
    serie: "Omniscient Reader's Viewpoint",
    rang: "C",
    element: "lumiere",
    pv: 120,
    attaques: [
      {
        nom: "Clarté",
        cout: 1,
        degats: 20,
        effet: null
      },
      {
        nom: "Sanctuaire",
        cout: 3,
        degats: 90,
        effet: {
          type: "bouclier",
          valeur: 30
        }
      }
    ]
  },
  {
    id: "per-079",
    nom: "Lee Hyunsung",
    serie: "Omniscient Reader's Viewpoint",
    rang: "C",
    element: "terre",
    pv: 150,
    attaques: [
      {
        nom: "Coup de roc",
        cout: 1,
        degats: 30,
        effet: null
      },
      {
        nom: "Météorite",
        cout: 3,
        degats: 120,
        effet: {
          type: "recul",
          valeur: 30
        }
      }
    ]
  },
  {
    id: "per-080",
    nom: "Shin Yoosung",
    serie: "Omniscient Reader's Viewpoint",
    rang: "C",
    element: "eau",
    pv: 160,
    attaques: [
      {
        nom: "Vaguelette",
        cout: 1,
        degats: 30,
        effet: null
      },
      {
        nom: "Danse des flots",
        cout: 2,
        degats: 60,
        effet: {
          type: "soin",
          valeur: 20
        }
      }
    ]
  },
  {
    id: "per-081",
    nom: "Secretive Plotter",
    serie: "Omniscient Reader's Viewpoint",
    rang: "C",
    element: "tenebres",
    pv: 100,
    attaques: [
      {
        nom: "Murmure",
        cout: 1,
        degats: 20,
        effet: {
          type: "malediction"
        }
      },
      {
        nom: "Roi des ombres",
        cout: 3,
        degats: 110,
        effet: null
      }
    ]
  },
  {
    id: "per-082",
    nom: "Taro Sakamoto",
    serie: "Sakamoto Days",
    rang: "B",
    element: "neutre",
    pv: 130,
    attaques: [
      {
        nom: "Coup de tête",
        cout: 1,
        degats: 40,
        effet: {
          type: "recul",
          valeur: 10
        }
      },
      {
        nom: "Coup de grâce",
        cout: 3,
        degats: 120,
        effet: {
          type: "recul",
          valeur: 30
        }
      }
    ]
  },
  {
    id: "per-083",
    nom: "Shin Asakura",
    serie: "Sakamoto Days",
    rang: "C",
    element: "foudre",
    pv: 60,
    attaques: [
      {
        nom: "Volt",
        cout: 1,
        degats: 30,
        effet: null
      },
      {
        nom: "Mille éclairs",
        cout: 3,
        degats: 130,
        effet: {
          type: "charge"
        }
      }
    ]
  },
  {
    id: "per-084",
    nom: "Lu Shaotang",
    serie: "Sakamoto Days",
    rang: "C",
    element: "feu",
    pv: 100,
    attaques: [
      {
        nom: "Coup ardent",
        cout: 1,
        degats: 30,
        effet: null
      },
      {
        nom: "Envol du phénix",
        cout: 3,
        degats: 90,
        effet: {
          type: "soin",
          valeur: 20
        }
      }
    ]
  },
  {
    id: "per-085",
    nom: "Nagumo",
    serie: "Sakamoto Days",
    rang: "C",
    element: "tenebres",
    pv: 140,
    attaques: [
      {
        nom: "Maléfice",
        cout: 1,
        degats: 20,
        effet: {
          type: "malediction"
        }
      },
      {
        nom: "Éclipse",
        cout: 3,
        degats: 120,
        effet: {
          type: "recul",
          valeur: 30
        }
      }
    ]
  },
  {
    id: "per-086",
    nom: "Osaragi",
    serie: "Sakamoto Days",
    rang: "C",
    element: "glace",
    pv: 80,
    attaques: [
      {
        nom: "Patinage",
        cout: 1,
        degats: 30,
        effet: null
      },
      {
        nom: "Lames de cristal",
        cout: 2,
        degats: 70,
        effet: null
      }
    ]
  },
  {
    id: "per-087",
    nom: "Gaku",
    serie: "Sakamoto Days",
    rang: "C",
    element: "foudre",
    pv: 130,
    attaques: [
      {
        nom: "Étincelle vive",
        cout: 1,
        degats: 20,
        effet: {
          type: "perce-bouclier"
        }
      },
      {
        nom: "Dragon de foudre",
        cout: 3,
        degats: 110,
        effet: null
      }
    ]
  },
  {
    id: "per-088",
    nom: "Caiman",
    serie: "Dorohedoro",
    rang: "B",
    element: "terre",
    pv: 140,
    attaques: [
      {
        nom: "Charge lourde",
        cout: 1,
        degats: 30,
        effet: null
      },
      {
        nom: "Pic rocheux",
        cout: 2,
        degats: 60,
        effet: null
      }
    ]
  },
  {
    id: "per-089",
    nom: "Nikaido",
    serie: "Dorohedoro",
    rang: "C",
    element: "lumiere",
    pv: 100,
    attaques: [
      {
        nom: "Halo",
        cout: 1,
        degats: 30,
        effet: null
      },
      {
        nom: "Égide",
        cout: 2,
        degats: 50,
        effet: {
          type: "bouclier",
          valeur: 20
        }
      }
    ]
  },
  {
    id: "per-090",
    nom: "En",
    serie: "Dorohedoro",
    rang: "C",
    element: "tenebres",
    pv: 120,
    attaques: [
      {
        nom: "Maléfice",
        cout: 1,
        degats: 20,
        effet: {
          type: "malediction"
        }
      },
      {
        nom: "Abîme",
        cout: 2,
        degats: 70,
        effet: null
      }
    ]
  },
  {
    id: "per-091",
    nom: "Shin",
    serie: "Dorohedoro",
    rang: "C",
    element: "feu",
    pv: 130,
    attaques: [
      {
        nom: "Souffle chaud",
        cout: 1,
        degats: 20,
        effet: {
          type: "brulure"
        }
      },
      {
        nom: "Brasier",
        cout: 2,
        degats: 50,
        effet: {
          type: "brulure"
        }
      }
    ]
  },
  {
    id: "per-092",
    nom: "Noi",
    serie: "Dorohedoro",
    rang: "C",
    element: "glace",
    pv: 150,
    attaques: [
      {
        nom: "Souffle froid",
        cout: 1,
        degats: 20,
        effet: {
          type: "ralentissement"
        }
      },
      {
        nom: "Rafale glaciale",
        cout: 2,
        degats: 60,
        effet: null
      }
    ]
  },
  {
    id: "per-093",
    nom: "Ebisu",
    serie: "Dorohedoro",
    rang: "C",
    element: "neutre",
    pv: 100,
    attaques: [
      {
        nom: "Feinte",
        cout: 1,
        degats: 20,
        effet: {
          type: "perce-bouclier"
        }
      },
      {
        nom: "Plan parfait",
        cout: 2,
        degats: 60,
        effet: {
          type: "perce-bouclier"
        }
      }
    ]
  },
  {
    id: "per-094",
    nom: "Yu",
    serie: "The Boxer",
    rang: "C",
    element: "glace",
    pv: 150,
    attaques: [
      {
        nom: "Pointe gelée",
        cout: 1,
        degats: 30,
        effet: null
      },
      {
        nom: "Tempête de cristal",
        cout: 3,
        degats: 110,
        effet: null
      }
    ]
  },
  {
    id: "per-095",
    nom: "K",
    serie: "The Boxer",
    rang: "C",
    element: "neutre",
    pv: 80,
    attaques: [
      {
        nom: "Pas de côté",
        cout: 1,
        degats: 20,
        effet: {
          type: "esquive"
        }
      },
      {
        nom: "Dernier recours",
        cout: 3,
        degats: 130,
        effet: {
          type: "charge"
        }
      }
    ]
  },
  {
    id: "per-096",
    nom: "Aaron Tide",
    serie: "The Boxer",
    rang: "C",
    element: "foudre",
    pv: 140,
    attaques: [
      {
        nom: "Volt",
        cout: 1,
        degats: 30,
        effet: null
      },
      {
        nom: "Lame d'orage",
        cout: 2,
        degats: 70,
        effet: null
      }
    ]
  },
  {
    id: "per-097",
    nom: "J",
    serie: "The Boxer",
    rang: "C",
    element: "feu",
    pv: 120,
    attaques: [
      {
        nom: "Lame rougeoyante",
        cout: 1,
        degats: 30,
        effet: null
      },
      {
        nom: "Vague de flammes",
        cout: 2,
        degats: 60,
        effet: {
          type: "brulure"
        }
      }
    ]
  },
  {
    id: "per-098",
    nom: "Jean-Pierre Manuel",
    serie: "The Boxer",
    rang: "C",
    element: "terre",
    pv: 100,
    attaques: [
      {
        nom: "Racine",
        cout: 1,
        degats: 20,
        effet: {
          type: "ralentissement"
        }
      },
      {
        nom: "Météorite",
        cout: 3,
        degats: 120,
        effet: {
          type: "recul",
          valeur: 30
        }
      }
    ]
  },
  {
    id: "per-099",
    nom: "Ryu Baeksan",
    serie: "The Boxer",
    rang: "C",
    element: "eau",
    pv: 90,
    attaques: [
      {
        nom: "Ressac",
        cout: 1,
        degats: 30,
        effet: null
      },
      {
        nom: "Dragon des eaux",
        cout: 3,
        degats: 100,
        effet: {
          type: "ralentissement"
        }
      }
    ]
  },
  {
    id: "per-100",
    nom: "Viktor Grigoryevich",
    serie: "The Boxer",
    rang: "C",
    element: "eau",
    pv: 90,
    attaques: [
      {
        nom: "Ressac",
        cout: 1,
        degats: 30,
        effet: null
      },
      {
        nom: "Danse des flots",
        cout: 2,
        degats: 60,
        effet: {
          type: "soin",
          valeur: 20
        }
      }
    ]
  }
];
const cartes$1 = [
  {
    id: "lan-001",
    numero: 1,
    personnage: "per-001",
    finition: "holo-integrale",
    secrete: false,
    images: {
      illustration: {
        zoom: 102,
        x: 50,
        y: 50
      }
    }
  },
  {
    id: "lan-002",
    numero: 2,
    personnage: "per-002",
    finition: "holo",
    secrete: false,
    images: {
      illustration: {
        zoom: 102,
        x: 50,
        y: 6
      }
    }
  },
  {
    id: "lan-003",
    numero: 3,
    personnage: "per-003",
    finition: "peu-commune",
    secrete: false,
    images: {
      illustration: {
        zoom: 102,
        x: 50,
        y: 20
      }
    }
  },
  {
    id: "lan-004",
    numero: 4,
    personnage: "per-004",
    finition: "holo",
    secrete: false,
    images: {
      illustration: {
        zoom: 102,
        x: 50,
        y: 50
      }
    }
  },
  {
    id: "lan-005",
    numero: 5,
    personnage: "per-005",
    finition: "holo",
    secrete: false,
    images: {}
  },
  {
    id: "lan-006",
    numero: 6,
    personnage: "per-006",
    finition: "holo-integrale",
    secrete: false,
    images: {}
  },
  {
    id: "lan-007",
    numero: 7,
    personnage: "per-007",
    finition: "holo-integrale",
    secrete: false,
    images: {
      illustration: {
        zoom: 100,
        x: 50,
        y: 10
      }
    }
  },
  {
    id: "lan-008",
    numero: 8,
    personnage: "per-008",
    finition: "holo",
    secrete: false,
    images: {
      illustration: {
        zoom: 100,
        x: 50,
        y: 36
      }
    }
  },
  {
    id: "lan-009",
    numero: 9,
    personnage: "per-009",
    finition: "holo",
    secrete: false,
    images: {
      illustration: {
        zoom: 100,
        x: 50,
        y: 34
      }
    }
  },
  {
    id: "lan-010",
    numero: 10,
    personnage: "per-010",
    finition: "peu-commune",
    secrete: false,
    images: {
      illustration: {
        zoom: 100,
        x: 50,
        y: 20
      }
    }
  },
  {
    id: "lan-011",
    numero: 11,
    personnage: "per-011",
    finition: "holo",
    secrete: false,
    images: {
      illustration: {
        zoom: 100,
        x: 50,
        y: 16
      }
    }
  },
  {
    id: "lan-012",
    numero: 12,
    personnage: "per-012",
    finition: "peu-commune",
    secrete: false,
    images: {
      illustration: {
        zoom: 100,
        x: 50,
        y: 22
      }
    }
  },
  {
    id: "lan-013",
    numero: 13,
    personnage: "per-013",
    finition: "peu-commune",
    secrete: false,
    images: {
      illustration: {
        zoom: 100,
        x: 50,
        y: 0
      }
    }
  },
  {
    id: "lan-014",
    numero: 14,
    personnage: "per-014",
    finition: "peu-commune",
    secrete: false,
    images: {
      illustration: {
        zoom: 100,
        x: 50,
        y: 8
      }
    }
  },
  {
    id: "lan-015",
    numero: 15,
    personnage: "per-015",
    finition: "peu-commune",
    secrete: false,
    images: {
      illustration: {
        zoom: 100,
        x: 50,
        y: 26
      }
    }
  },
  {
    id: "lan-016",
    numero: 16,
    personnage: "per-016",
    finition: "peu-commune",
    secrete: false,
    images: {
      illustration: {
        zoom: 100,
        x: 50,
        y: 17
      }
    }
  },
  {
    id: "lan-017",
    numero: 17,
    personnage: "per-017",
    finition: "holo",
    secrete: false,
    images: {
      illustration: {
        zoom: 100,
        x: 50,
        y: 25
      }
    }
  },
  {
    id: "lan-018",
    numero: 18,
    personnage: "per-018",
    finition: "holo",
    secrete: false,
    images: {
      illustration: {
        zoom: 100,
        x: 50,
        y: 27
      }
    }
  },
  {
    id: "lan-019",
    numero: 19,
    personnage: "per-019",
    finition: "holo",
    secrete: false,
    images: {
      illustration: {
        zoom: 100,
        x: 50,
        y: 24
      }
    }
  },
  {
    id: "lan-020",
    numero: 20,
    personnage: "per-020",
    finition: "peu-commune",
    secrete: false,
    images: {
      illustration: {
        zoom: 100,
        x: 50,
        y: 17
      }
    }
  },
  {
    id: "lan-021",
    numero: 21,
    personnage: "per-021",
    finition: "peu-commune",
    secrete: false,
    images: {
      illustration: {
        zoom: 100,
        x: 50,
        y: 25
      }
    }
  },
  {
    id: "lan-022",
    numero: 22,
    personnage: "per-022",
    finition: "commune",
    secrete: false,
    images: {
      illustration: {
        zoom: 100,
        x: 50,
        y: 21
      }
    }
  },
  {
    id: "lan-023",
    numero: 23,
    personnage: "per-023",
    finition: "commune",
    secrete: false,
    images: {
      illustration: {
        zoom: 100,
        x: 50,
        y: 0
      }
    }
  },
  {
    id: "lan-024",
    numero: 24,
    personnage: "per-024",
    finition: "commune",
    secrete: false,
    images: {
      illustration: {
        zoom: 100,
        x: 50,
        y: 14
      }
    }
  },
  {
    id: "lan-025",
    numero: 25,
    personnage: "per-025",
    finition: "holo",
    secrete: false,
    images: {
      illustration: {
        zoom: 100,
        x: 50,
        y: 67
      }
    }
  },
  {
    id: "lan-026",
    numero: 26,
    personnage: "per-026",
    finition: "holo",
    secrete: false,
    images: {
      illustration: {
        zoom: 100,
        x: 50,
        y: 23
      }
    }
  },
  {
    id: "lan-027",
    numero: 27,
    personnage: "per-027",
    finition: "holo-integrale",
    secrete: false,
    images: {
      illustration: {
        zoom: 100,
        x: 50,
        y: 42
      }
    }
  },
  {
    id: "lan-028",
    numero: 28,
    personnage: "per-028",
    finition: "peu-commune",
    secrete: false,
    images: {
      illustration: {
        zoom: 100,
        x: 50,
        y: 54
      }
    }
  },
  {
    id: "lan-029",
    numero: 29,
    personnage: "per-029",
    finition: "peu-commune",
    secrete: false,
    images: {
      illustration: {
        zoom: 100,
        x: 50,
        y: 14
      }
    }
  },
  {
    id: "lan-030",
    numero: 30,
    personnage: "per-030",
    finition: "peu-commune",
    secrete: false,
    images: {
      illustration: {
        zoom: 100,
        x: 50,
        y: 23
      }
    }
  },
  {
    id: "lan-031",
    numero: 31,
    personnage: "per-031",
    finition: "commune",
    secrete: false,
    images: {
      illustration: {
        zoom: 100,
        x: 50,
        y: 12
      }
    }
  },
  {
    id: "lan-032",
    numero: 32,
    personnage: "per-032",
    finition: "commune",
    secrete: false,
    images: {
      illustration: {
        zoom: 121,
        x: 50,
        y: 31
      }
    }
  },
  {
    id: "lan-033",
    numero: 33,
    personnage: "per-033",
    finition: "holo",
    secrete: false,
    images: {
      illustration: {
        zoom: 100,
        x: 50,
        y: 11
      }
    }
  },
  {
    id: "lan-034",
    numero: 34,
    personnage: "per-034",
    finition: "holo",
    secrete: false,
    images: {
      illustration: {
        zoom: 100,
        x: 50,
        y: 20
      }
    }
  },
  {
    id: "lan-035",
    numero: 35,
    personnage: "per-035",
    finition: "peu-commune",
    secrete: false,
    images: {
      illustration: {
        zoom: 100,
        x: 50,
        y: 29
      }
    }
  },
  {
    id: "lan-036",
    numero: 36,
    personnage: "per-036",
    finition: "peu-commune",
    secrete: false,
    images: {
      illustration: {
        zoom: 100,
        x: 50,
        y: 22
      }
    }
  },
  {
    id: "lan-037",
    numero: 37,
    personnage: "per-037",
    finition: "peu-commune",
    secrete: false,
    images: {
      illustration: {
        zoom: 100,
        x: 50,
        y: 17
      }
    }
  },
  {
    id: "lan-038",
    numero: 38,
    personnage: "per-038",
    finition: "peu-commune",
    secrete: false,
    images: {
      illustration: {
        zoom: 100,
        x: 50,
        y: 18
      }
    }
  },
  {
    id: "lan-039",
    numero: 39,
    personnage: "per-039",
    finition: "peu-commune",
    secrete: false,
    images: {
      illustration: {
        zoom: 100,
        x: 50,
        y: 35
      }
    }
  },
  {
    id: "lan-040",
    numero: 40,
    personnage: "per-040",
    finition: "holo",
    secrete: false,
    images: {
      illustration: {
        zoom: 100,
        x: 50,
        y: 20
      }
    }
  },
  {
    id: "lan-041",
    numero: 41,
    personnage: "per-041",
    finition: "holo-integrale",
    secrete: false,
    images: {
      illustration: {
        zoom: 100,
        x: 50,
        y: 29
      }
    }
  },
  {
    id: "lan-042",
    numero: 42,
    personnage: "per-042",
    finition: "peu-commune",
    secrete: false,
    images: {
      illustration: {
        zoom: 100,
        x: 50,
        y: 18
      }
    }
  },
  {
    id: "lan-043",
    numero: 43,
    personnage: "per-043",
    finition: "peu-commune",
    secrete: false,
    images: {
      illustration: {
        zoom: 100,
        x: 50,
        y: 18
      }
    }
  },
  {
    id: "lan-044",
    numero: 44,
    personnage: "per-044",
    finition: "peu-commune",
    secrete: false,
    images: {
      illustration: {
        zoom: 100,
        x: 50,
        y: 5
      }
    }
  },
  {
    id: "lan-045",
    numero: 45,
    personnage: "per-045",
    finition: "commune",
    secrete: false,
    images: {
      illustration: {
        zoom: 100,
        x: 50,
        y: 25
      }
    }
  },
  {
    id: "lan-046",
    numero: 46,
    personnage: "per-046",
    finition: "commune",
    secrete: false,
    images: {
      illustration: {
        zoom: 100,
        x: 50,
        y: 25
      }
    }
  },
  {
    id: "lan-047",
    numero: 47,
    personnage: "per-047",
    finition: "commune",
    secrete: false,
    images: {
      illustration: {
        zoom: 104,
        x: 50,
        y: 13
      }
    }
  },
  {
    id: "lan-048",
    numero: 48,
    personnage: "per-048",
    finition: "commune",
    secrete: false,
    images: {
      illustration: {
        zoom: 102,
        x: 50,
        y: 2
      }
    }
  },
  {
    id: "lan-049",
    numero: 49,
    personnage: "per-049",
    finition: "holo",
    secrete: false,
    images: {
      illustration: {
        zoom: 102,
        x: 50,
        y: 18
      }
    }
  },
  {
    id: "lan-050",
    numero: 50,
    personnage: "per-050",
    finition: "peu-commune",
    secrete: false,
    images: {
      illustration: {
        zoom: 102,
        x: 50,
        y: 21
      }
    }
  },
  {
    id: "lan-051",
    numero: 51,
    personnage: "per-051",
    finition: "commune",
    secrete: false,
    images: {
      illustration: {
        zoom: 104,
        x: 50,
        y: 16
      }
    }
  },
  {
    id: "lan-052",
    numero: 52,
    personnage: "per-052",
    finition: "peu-commune",
    secrete: false,
    images: {
      illustration: {
        zoom: 102,
        x: 50,
        y: 55
      }
    }
  },
  {
    id: "lan-053",
    numero: 53,
    personnage: "per-053",
    finition: "commune",
    secrete: false,
    images: {
      illustration: {
        zoom: 102,
        x: 50,
        y: 21
      }
    }
  },
  {
    id: "lan-054",
    numero: 54,
    personnage: "per-054",
    finition: "commune",
    secrete: false,
    images: {
      illustration: {
        zoom: 106,
        x: 50,
        y: 21
      }
    }
  },
  {
    id: "lan-055",
    numero: 55,
    personnage: "per-055",
    finition: "commune",
    secrete: false,
    images: {
      illustration: {
        zoom: 104,
        x: 50,
        y: 15
      }
    }
  },
  {
    id: "lan-056",
    numero: 56,
    personnage: "per-056",
    finition: "peu-commune",
    secrete: false,
    images: {
      illustration: {
        zoom: 102,
        x: 50,
        y: 27
      }
    }
  },
  {
    id: "lan-057",
    numero: 57,
    personnage: "per-057",
    finition: "peu-commune",
    secrete: false,
    images: {
      illustration: {
        zoom: 102,
        x: 50,
        y: 35
      }
    }
  },
  {
    id: "lan-058",
    numero: 58,
    personnage: "per-058",
    finition: "commune",
    secrete: false,
    images: {
      illustration: {
        zoom: 106,
        x: 50,
        y: 50
      }
    }
  },
  {
    id: "lan-059",
    numero: 59,
    personnage: "per-059",
    finition: "commune",
    secrete: false,
    images: {
      illustration: {
        zoom: 104,
        x: 50,
        y: 38
      }
    }
  },
  {
    id: "lan-060",
    numero: 60,
    personnage: "per-060",
    finition: "commune",
    secrete: false,
    images: {
      illustration: {
        zoom: 108,
        x: 50,
        y: 34
      }
    }
  },
  {
    id: "lan-061",
    numero: 61,
    personnage: "per-061",
    finition: "commune",
    secrete: false,
    images: {
      illustration: {
        zoom: 102,
        x: 50,
        y: 22
      }
    }
  },
  {
    id: "lan-062",
    numero: 62,
    personnage: "per-062",
    finition: "peu-commune",
    secrete: false,
    images: {
      illustration: {
        zoom: 104,
        x: 50,
        y: 18
      }
    }
  },
  {
    id: "lan-063",
    numero: 63,
    personnage: "per-063",
    finition: "peu-commune",
    secrete: false,
    images: {
      illustration: {
        zoom: 102,
        x: 50,
        y: 15
      }
    }
  },
  {
    id: "lan-064",
    numero: 64,
    personnage: "per-064",
    finition: "commune",
    secrete: false,
    images: {
      illustration: {
        zoom: 102,
        x: 50,
        y: 4
      }
    }
  },
  {
    id: "lan-065",
    numero: 65,
    personnage: "per-065",
    finition: "commune",
    secrete: false,
    images: {
      illustration: {
        zoom: 102,
        x: 50,
        y: 11
      }
    }
  },
  {
    id: "lan-066",
    numero: 66,
    personnage: "per-066",
    finition: "commune",
    secrete: false,
    images: {
      illustration: {
        zoom: 102,
        x: 50,
        y: 19
      }
    }
  },
  {
    id: "lan-067",
    numero: 67,
    personnage: "per-067",
    finition: "commune",
    secrete: false,
    images: {
      illustration: {
        zoom: 102,
        x: 50,
        y: 1
      }
    }
  },
  {
    id: "lan-068",
    numero: 68,
    personnage: "per-068",
    finition: "peu-commune",
    secrete: false,
    images: {
      illustration: {
        zoom: 102,
        x: 50,
        y: 64
      }
    }
  },
  {
    id: "lan-069",
    numero: 69,
    personnage: "per-069",
    finition: "commune",
    secrete: false,
    images: {
      illustration: {
        zoom: 102,
        x: 50,
        y: 24
      }
    }
  },
  {
    id: "lan-070",
    numero: 70,
    personnage: "per-070",
    finition: "commune",
    secrete: false,
    images: {
      illustration: {
        zoom: 102,
        x: 50,
        y: 10
      }
    }
  },
  {
    id: "lan-071",
    numero: 71,
    personnage: "per-071",
    finition: "commune",
    secrete: false,
    images: {
      illustration: {
        zoom: 102,
        x: 50,
        y: 57
      }
    }
  },
  {
    id: "lan-072",
    numero: 72,
    personnage: "per-072",
    finition: "commune",
    secrete: false,
    images: {
      illustration: {
        zoom: 96,
        x: 50,
        y: 22
      }
    }
  },
  {
    id: "lan-073",
    numero: 73,
    personnage: "per-073",
    finition: "commune",
    secrete: false,
    images: {
      illustration: {
        zoom: 102,
        x: 50,
        y: 9
      }
    }
  },
  {
    id: "lan-074",
    numero: 74,
    personnage: "per-074",
    finition: "commune",
    secrete: false,
    images: {
      illustration: {
        zoom: 102,
        x: 50,
        y: 28
      }
    }
  },
  {
    id: "lan-075",
    numero: 75,
    personnage: "per-075",
    finition: "peu-commune",
    secrete: false,
    images: {
      illustration: {
        zoom: 102,
        x: 50,
        y: 46
      }
    }
  },
  {
    id: "lan-076",
    numero: 76,
    personnage: "per-076",
    finition: "commune",
    secrete: false,
    images: {
      illustration: {
        zoom: 102,
        x: 50,
        y: 11
      }
    }
  },
  {
    id: "lan-077",
    numero: 77,
    personnage: "per-077",
    finition: "commune",
    secrete: false,
    images: {
      illustration: {
        zoom: 102,
        x: 50,
        y: 20
      }
    }
  },
  {
    id: "lan-078",
    numero: 78,
    personnage: "per-078",
    finition: "commune",
    secrete: false,
    images: {
      illustration: {
        zoom: 102,
        x: 50,
        y: 17
      }
    }
  },
  {
    id: "lan-079",
    numero: 79,
    personnage: "per-079",
    finition: "commune",
    secrete: false,
    images: {
      illustration: {
        zoom: 102,
        x: 50,
        y: 31
      }
    }
  },
  {
    id: "lan-080",
    numero: 80,
    personnage: "per-080",
    finition: "commune",
    secrete: false,
    images: {
      illustration: {
        zoom: 102,
        x: 50,
        y: 12
      }
    }
  },
  {
    id: "lan-081",
    numero: 81,
    personnage: "per-081",
    finition: "commune",
    secrete: false,
    images: {
      illustration: {
        zoom: 102,
        x: 50,
        y: 11
      }
    }
  },
  {
    id: "lan-082",
    numero: 82,
    personnage: "per-082",
    finition: "peu-commune",
    secrete: false,
    images: {
      illustration: {
        zoom: 102,
        x: 50,
        y: 10
      }
    }
  },
  {
    id: "lan-083",
    numero: 83,
    personnage: "per-083",
    finition: "commune",
    secrete: false,
    images: {
      illustration: {
        zoom: 102,
        x: 50,
        y: 9
      }
    }
  },
  {
    id: "lan-084",
    numero: 84,
    personnage: "per-084",
    finition: "commune",
    secrete: false,
    images: {
      illustration: {
        zoom: 102,
        x: 50,
        y: 17
      }
    }
  },
  {
    id: "lan-085",
    numero: 85,
    personnage: "per-085",
    finition: "commune",
    secrete: false,
    images: {
      illustration: {
        zoom: 102,
        x: 50,
        y: 18
      }
    }
  },
  {
    id: "lan-086",
    numero: 86,
    personnage: "per-086",
    finition: "commune",
    secrete: false,
    images: {
      illustration: {
        zoom: 102,
        x: 50,
        y: 26
      }
    }
  },
  {
    id: "lan-087",
    numero: 87,
    personnage: "per-087",
    finition: "commune",
    secrete: false,
    images: {
      illustration: {
        zoom: 102,
        x: 50,
        y: 2
      }
    }
  },
  {
    id: "lan-088",
    numero: 88,
    personnage: "per-088",
    finition: "peu-commune",
    secrete: false,
    images: {
      illustration: {
        zoom: 102,
        x: 50,
        y: 6
      }
    }
  },
  {
    id: "lan-089",
    numero: 89,
    personnage: "per-089",
    finition: "commune",
    secrete: false,
    images: {
      illustration: {
        zoom: 102,
        x: 50,
        y: 25
      }
    }
  },
  {
    id: "lan-090",
    numero: 90,
    personnage: "per-090",
    finition: "commune",
    secrete: false,
    images: {
      illustration: {
        zoom: 102,
        x: 50,
        y: 26
      }
    }
  },
  {
    id: "lan-091",
    numero: 91,
    personnage: "per-091",
    finition: "commune",
    secrete: false,
    images: {
      illustration: {
        zoom: 102,
        x: 50,
        y: 46
      }
    }
  },
  {
    id: "lan-092",
    numero: 92,
    personnage: "per-092",
    finition: "commune",
    secrete: false,
    images: {
      illustration: {
        zoom: 102,
        x: 50,
        y: 15
      }
    }
  },
  {
    id: "lan-093",
    numero: 93,
    personnage: "per-093",
    finition: "commune",
    secrete: false,
    images: {
      illustration: {
        zoom: 102,
        x: 50,
        y: 46
      }
    }
  },
  {
    id: "lan-094",
    numero: 94,
    personnage: "per-094",
    finition: "commune",
    secrete: false,
    images: {
      illustration: {
        zoom: 102,
        x: 50,
        y: 21
      }
    }
  },
  {
    id: "lan-095",
    numero: 95,
    personnage: "per-095",
    finition: "commune",
    secrete: false,
    images: {
      illustration: {
        zoom: 102,
        x: 50,
        y: 5
      }
    }
  },
  {
    id: "lan-096",
    numero: 96,
    personnage: "per-096",
    finition: "commune",
    secrete: false,
    images: {
      illustration: {
        zoom: 102,
        x: 50,
        y: 4
      }
    }
  },
  {
    id: "lan-097",
    numero: 97,
    personnage: "per-097",
    finition: "commune",
    secrete: false,
    images: {
      illustration: {
        zoom: 102,
        x: 50,
        y: 50
      }
    }
  },
  {
    id: "lan-098",
    numero: 98,
    personnage: "per-098",
    finition: "commune",
    secrete: false,
    images: {
      illustration: {
        zoom: 102,
        x: 50,
        y: 49
      }
    }
  },
  {
    id: "lan-099",
    numero: 99,
    personnage: "per-099",
    finition: "commune",
    secrete: false,
    images: {
      illustration: {
        zoom: 102,
        x: 50,
        y: 50
      }
    }
  },
  {
    id: "lan-100",
    numero: 100,
    personnage: "per-100",
    finition: "commune",
    secrete: false,
    images: {
      illustration: {
        zoom: 102,
        x: 50,
        y: 54
      }
    }
  },
  {
    id: "lan-101",
    numero: 101,
    personnage: "per-002",
    finition: "pleine",
    secrete: true,
    images: {
      illustration: {
        zoom: 102,
        x: 50,
        y: 50
      }
    }
  },
  {
    id: "lan-102",
    numero: 102,
    personnage: "per-003",
    finition: "pleine",
    secrete: true,
    images: {
      illustration: {
        zoom: 102,
        x: 50,
        y: 50
      }
    }
  },
  {
    id: "lan-103",
    numero: 103,
    personnage: "per-004",
    finition: "pleine",
    secrete: true,
    images: {
      illustration: {
        zoom: 102,
        x: 50,
        y: 50
      }
    }
  },
  {
    id: "lan-104",
    numero: 104,
    personnage: "per-008",
    finition: "pleine",
    secrete: true,
    images: {}
  },
  {
    id: "lan-105",
    numero: 105,
    personnage: "per-014",
    finition: "pleine",
    secrete: true,
    images: {}
  },
  {
    id: "lan-106",
    numero: 106,
    personnage: "per-017",
    finition: "pleine",
    secrete: true,
    images: {}
  },
  {
    id: "lan-107",
    numero: 107,
    personnage: "per-021",
    finition: "pleine",
    secrete: true,
    images: {}
  },
  {
    id: "lan-108",
    numero: 108,
    personnage: "per-022",
    finition: "pleine",
    secrete: true,
    images: {}
  },
  {
    id: "lan-109",
    numero: 109,
    personnage: "per-026",
    finition: "pleine",
    secrete: true,
    images: {}
  },
  {
    id: "lan-110",
    numero: 110,
    personnage: "per-032",
    finition: "pleine",
    secrete: true,
    images: {}
  },
  {
    id: "lan-111",
    numero: 111,
    personnage: "per-033",
    finition: "pleine",
    secrete: true,
    images: {}
  },
  {
    id: "lan-112",
    numero: 112,
    personnage: "per-038",
    finition: "pleine",
    secrete: true,
    images: {}
  },
  {
    id: "lan-113",
    numero: 113,
    personnage: "per-047",
    finition: "pleine",
    secrete: true,
    images: {
      illustration: {
        zoom: 102,
        x: 50,
        y: 50
      }
    }
  },
  {
    id: "lan-114",
    numero: 114,
    personnage: "per-050",
    finition: "pleine",
    secrete: true,
    images: {
      illustration: {
        zoom: 110,
        x: 50,
        y: 50
      }
    }
  },
  {
    id: "lan-115",
    numero: 115,
    personnage: "per-053",
    finition: "pleine",
    secrete: true,
    images: {
      illustration: {
        zoom: 104,
        x: 50,
        y: 50
      }
    }
  },
  {
    id: "lan-116",
    numero: 116,
    personnage: "per-057",
    finition: "pleine",
    secrete: true,
    images: {
      illustration: {
        zoom: 104,
        x: 50,
        y: 50
      }
    }
  },
  {
    id: "lan-117",
    numero: 117,
    personnage: "per-062",
    finition: "pleine",
    secrete: true,
    images: {
      illustration: {
        zoom: 102,
        x: 50,
        y: 50
      }
    }
  },
  {
    id: "lan-118",
    numero: 118,
    personnage: "per-064",
    finition: "pleine",
    secrete: true,
    images: {
      illustration: {
        zoom: 104,
        x: 50,
        y: 50
      }
    }
  },
  {
    id: "lan-119",
    numero: 119,
    personnage: "per-069",
    finition: "pleine",
    secrete: true,
    images: {
      illustration: {
        zoom: 102,
        x: 50,
        y: 50
      }
    }
  },
  {
    id: "lan-120",
    numero: 120,
    personnage: "per-075",
    finition: "pleine",
    secrete: true,
    images: {
      illustration: {
        zoom: 102,
        x: 50,
        y: 50
      }
    }
  },
  {
    id: "lan-121",
    numero: 121,
    personnage: "per-076",
    finition: "pleine",
    secrete: true,
    images: {
      illustration: {
        zoom: 102,
        x: 50,
        y: 50
      }
    }
  },
  {
    id: "lan-122",
    numero: 122,
    personnage: "per-085",
    finition: "pleine",
    secrete: true,
    images: {}
  },
  {
    id: "lan-123",
    numero: 123,
    personnage: "per-089",
    finition: "pleine",
    secrete: true,
    images: {}
  },
  {
    id: "lan-124",
    numero: 124,
    personnage: "per-094",
    finition: "pleine",
    secrete: true,
    images: {}
  },
  {
    id: "lan-125",
    numero: 125,
    personnage: "per-001",
    finition: "alternative",
    secrete: true,
    images: {
      illustration: {
        zoom: 102,
        x: 50,
        y: 50
      }
    }
  },
  {
    id: "lan-126",
    numero: 126,
    personnage: "per-006",
    finition: "alternative",
    secrete: true,
    images: {}
  },
  {
    id: "lan-127",
    numero: 127,
    personnage: "per-007",
    finition: "alternative",
    secrete: true,
    images: {}
  },
  {
    id: "lan-128",
    numero: 128,
    personnage: "per-011",
    finition: "alternative",
    secrete: true,
    images: {}
  },
  {
    id: "lan-129",
    numero: 129,
    personnage: "per-018",
    finition: "alternative",
    secrete: true,
    images: {}
  },
  {
    id: "lan-130",
    numero: 130,
    personnage: "per-025",
    finition: "alternative",
    secrete: true,
    images: {}
  },
  {
    id: "lan-131",
    numero: 131,
    personnage: "per-027",
    finition: "alternative",
    secrete: true,
    images: {}
  },
  {
    id: "lan-132",
    numero: 132,
    personnage: "per-040",
    finition: "alternative",
    secrete: true,
    images: {}
  },
  {
    id: "lan-133",
    numero: 133,
    personnage: "per-041",
    finition: "alternative",
    secrete: true,
    images: {}
  },
  {
    id: "lan-134",
    numero: 134,
    personnage: "per-049",
    finition: "alternative",
    secrete: true,
    images: {}
  },
  {
    id: "lan-135",
    numero: 135,
    personnage: "per-001",
    finition: "immersive",
    secrete: true,
    images: {}
  },
  {
    id: "lan-136",
    numero: 136,
    personnage: "per-007",
    finition: "immersive",
    secrete: true,
    images: {}
  },
  {
    id: "lan-137",
    numero: 137,
    personnage: "per-041",
    finition: "immersive",
    secrete: true,
    images: {}
  },
  {
    id: "lan-138",
    numero: 138,
    personnage: "per-006",
    finition: "couronne",
    secrete: true,
    images: {}
  },
  {
    id: "lan-139",
    numero: 139,
    personnage: "per-007",
    finition: "couronne",
    secrete: true,
    images: {}
  },
  {
    id: "lan-140",
    numero: 140,
    personnage: "per-027",
    finition: "couronne",
    secrete: true,
    images: {}
  }
];
const __vite_glob_0_1 = {
  id: id$1,
  nom: nom$1,
  edition: edition$1,
  total: total$1,
  totalAvecSecretes: totalAvecSecretes$1,
  _note: _note$1,
  personnages: personnages$1,
  cartes: cartes$1
};
const id = "renforts";
const nom = "Renforts";
const edition = 2;
const total = 24;
const totalAvecSecretes = 32;
const _note = "Mini-extension, environ un mois après le lancement, avec son propre booster. Même modèle que Lancement.";
const personnages = [
  {
    id: "ren-per-001",
    nom: "Killua Zoldyck",
    serie: "Hunter x Hunter",
    rang: "S",
    element: "foudre",
    pv: 130,
    attaques: [
      {
        nom: "Zap",
        cout: 1,
        degats: 20,
        effet: null
      },
      {
        nom: "Tonnerre",
        cout: 2,
        degats: 60,
        effet: {
          type: "perce-bouclier"
        }
      }
    ]
  },
  {
    id: "ren-per-002",
    nom: "Gon Freecss",
    serie: "Hunter x Hunter",
    rang: "A",
    element: "terre",
    pv: 120,
    attaques: [
      {
        nom: "Poing de granit",
        cout: 1,
        degats: 40,
        effet: {
          type: "recul",
          valeur: 10
        }
      },
      {
        nom: "Séisme",
        cout: 2,
        degats: 70,
        effet: null
      }
    ]
  },
  {
    id: "ren-per-003",
    nom: "Momo Ayase",
    serie: "Dandadan",
    rang: "A",
    element: "lumiere",
    pv: 100,
    attaques: [
      {
        nom: "Bénédiction",
        cout: 1,
        degats: 20,
        effet: {
          type: "soin",
          valeur: 10
        }
      },
      {
        nom: "Soleil levant",
        cout: 3,
        degats: 100,
        effet: {
          type: "soin",
          valeur: 30
        }
      }
    ]
  },
  {
    id: "ren-per-004",
    nom: "Kafka Hibino",
    serie: "Kaiju No. 8",
    rang: "A",
    element: "feu",
    pv: 140,
    attaques: [
      {
        nom: "Flammèche",
        cout: 1,
        degats: 20,
        effet: {
          type: "brulure"
        }
      },
      {
        nom: "Pilier de flammes",
        cout: 3,
        degats: 100,
        effet: null
      }
    ]
  },
  {
    id: "ren-per-005",
    nom: "Anya Forger",
    serie: "Spy x Family",
    rang: "A",
    element: "neutre",
    pv: 70,
    attaques: [
      {
        nom: "Coup de bluff",
        cout: 1,
        degats: 20,
        effet: null
      },
      {
        nom: "Combo",
        cout: 2,
        degats: 60,
        effet: null
      }
    ]
  },
  {
    id: "ren-per-006",
    nom: "Hisoka Morow",
    serie: "Hunter x Hunter",
    rang: "B",
    element: "tenebres",
    pv: 110,
    attaques: [
      {
        nom: "Ténèbre",
        cout: 1,
        degats: 30,
        effet: null
      },
      {
        nom: "Danse macabre",
        cout: 2,
        degats: 60,
        effet: {
          type: "recul",
          valeur: 10
        }
      }
    ]
  },
  {
    id: "ren-per-007",
    nom: "Kurapika",
    serie: "Hunter x Hunter",
    rang: "B",
    element: "feu",
    pv: 100,
    attaques: [
      {
        nom: "Bond incandescent",
        cout: 1,
        degats: 30,
        effet: null
      },
      {
        nom: "Éruption",
        cout: 2,
        degats: 70,
        effet: null
      }
    ]
  },
  {
    id: "ren-per-008",
    nom: "Ken Takakura (Okarun)",
    serie: "Dandadan",
    rang: "B",
    element: "vent",
    pv: 90,
    attaques: [
      {
        nom: "Coup de vent",
        cout: 1,
        degats: 30,
        effet: null
      },
      {
        nom: "Vent coupant",
        cout: 2,
        degats: 70,
        effet: null
      }
    ]
  },
  {
    id: "ren-per-009",
    nom: "Loid Forger",
    serie: "Spy x Family",
    rang: "B",
    element: "glace",
    pv: 100,
    attaques: [
      {
        nom: "Givre",
        cout: 1,
        degats: 20,
        effet: {
          type: "ralentissement"
        }
      },
      {
        nom: "Prison de glace",
        cout: 2,
        degats: 50,
        effet: {
          type: "gel"
        }
      }
    ]
  },
  {
    id: "ren-per-010",
    nom: "Yor Forger",
    serie: "Spy x Family",
    rang: "B",
    element: "vent",
    pv: 90,
    attaques: [
      {
        nom: "Lame d'air",
        cout: 1,
        degats: 30,
        effet: null
      },
      {
        nom: "Ciel déchiré",
        cout: 3,
        degats: 130,
        effet: {
          type: "charge"
        }
      }
    ]
  },
  {
    id: "ren-per-011",
    nom: "Yoichi Isagi",
    serie: "Blue Lock",
    rang: "B",
    element: "eau",
    pv: 90,
    attaques: [
      {
        nom: "Jet d'eau",
        cout: 1,
        degats: 20,
        effet: null
      },
      {
        nom: "Cascade céleste",
        cout: 3,
        degats: 100,
        effet: {
          type: "soin",
          valeur: 30
        }
      }
    ]
  },
  {
    id: "ren-per-012",
    nom: "Mina Ashiro",
    serie: "Kaiju No. 8",
    rang: "B",
    element: "foudre",
    pv: 120,
    attaques: [
      {
        nom: "Décharge",
        cout: 1,
        degats: 30,
        effet: null
      },
      {
        nom: "Éclair divin",
        cout: 3,
        degats: 120,
        effet: {
          type: "recul",
          valeur: 30
        }
      }
    ]
  },
  {
    id: "ren-per-013",
    nom: "Leorio Paradinight",
    serie: "Hunter x Hunter",
    rang: "C",
    element: "neutre",
    pv: 110,
    attaques: [
      {
        nom: "Coup de poing",
        cout: 1,
        degats: 30,
        effet: null
      },
      {
        nom: "Volonté inébranlable",
        cout: 3,
        degats: 100,
        effet: {
          type: "bouclier",
          valeur: 30
        }
      }
    ]
  },
  {
    id: "ren-per-014",
    nom: "Turbo Granny",
    serie: "Dandadan",
    rang: "C",
    element: "tenebres",
    pv: 80,
    attaques: [
      {
        nom: "Morsure",
        cout: 1,
        degats: 30,
        effet: null
      },
      {
        nom: "Brume maudite",
        cout: 2,
        degats: 60,
        effet: {
          type: "malediction"
        }
      }
    ]
  },
  {
    id: "ren-per-015",
    nom: "Seiko Ayase",
    serie: "Dandadan",
    rang: "C",
    element: "lumiere",
    pv: 100,
    attaques: [
      {
        nom: "Aube",
        cout: 1,
        degats: 20,
        effet: {
          type: "bouclier",
          valeur: 10
        }
      },
      {
        nom: "Lame céleste",
        cout: 2,
        degats: 60,
        effet: {
          type: "perce-bouclier"
        }
      }
    ]
  },
  {
    id: "ren-per-016",
    nom: "Aira Shiratori",
    serie: "Dandadan",
    rang: "C",
    element: "lumiere",
    pv: 70,
    attaques: [
      {
        nom: "Prisme",
        cout: 1,
        degats: 30,
        effet: null
      },
      {
        nom: "Jugement céleste",
        cout: 3,
        degats: 120,
        effet: {
          type: "recul",
          valeur: 30
        }
      }
    ]
  },
  {
    id: "ren-per-017",
    nom: "Jin Enjoji (Jiji)",
    serie: "Dandadan",
    rang: "C",
    element: "terre",
    pv: 130,
    attaques: [
      {
        nom: "Garde de pierre",
        cout: 1,
        degats: 20,
        effet: {
          type: "bouclier",
          valeur: 10
        }
      },
      {
        nom: "Écrasement",
        cout: 2,
        degats: 70,
        effet: null
      }
    ]
  },
  {
    id: "ren-per-018",
    nom: "Reno Ichikawa",
    serie: "Kaiju No. 8",
    rang: "C",
    element: "glace",
    pv: 90,
    attaques: [
      {
        nom: "Grésil",
        cout: 1,
        degats: 30,
        effet: null
      },
      {
        nom: "Hiver éternel",
        cout: 3,
        degats: 100,
        effet: {
          type: "gel"
        }
      }
    ]
  },
  {
    id: "ren-per-019",
    nom: "Kikoru Shinomiya",
    serie: "Kaiju No. 8",
    rang: "C",
    element: "foudre",
    pv: 100,
    attaques: [
      {
        nom: "Arc électrique",
        cout: 1,
        degats: 30,
        effet: null
      },
      {
        nom: "Lame d'orage",
        cout: 2,
        degats: 70,
        effet: null
      }
    ]
  },
  {
    id: "ren-per-020",
    nom: "Soshiro Hoshina",
    serie: "Kaiju No. 8",
    rang: "C",
    element: "vent",
    pv: 110,
    attaques: [
      {
        nom: "Souffle",
        cout: 1,
        degats: 20,
        effet: {
          type: "perce-bouclier"
        }
      },
      {
        nom: "Lames du vent",
        cout: 2,
        degats: 70,
        effet: null
      }
    ]
  },
  {
    id: "ren-per-021",
    nom: "Bond Forger",
    serie: "Spy x Family",
    rang: "C",
    element: "neutre",
    pv: 120,
    attaques: [
      {
        nom: "Garde haute",
        cout: 1,
        degats: 20,
        effet: {
          type: "bouclier",
          valeur: 10
        }
      },
      {
        nom: "Contre-attaque",
        cout: 2,
        degats: 50,
        effet: {
          type: "bouclier",
          valeur: 20
        }
      }
    ]
  },
  {
    id: "ren-per-022",
    nom: "Franky Franklin",
    serie: "Spy x Family",
    rang: "C",
    element: "neutre",
    pv: 70,
    attaques: [
      {
        nom: "Plaquage",
        cout: 1,
        degats: 30,
        effet: null
      },
      {
        nom: "Coup ultime",
        cout: 3,
        degats: 110,
        effet: null
      }
    ]
  },
  {
    id: "ren-per-023",
    nom: "Meguru Bachira",
    serie: "Blue Lock",
    rang: "C",
    element: "eau",
    pv: 80,
    attaques: [
      {
        nom: "Lame liquide",
        cout: 1,
        degats: 30,
        effet: null
      },
      {
        nom: "Tourbillon",
        cout: 2,
        degats: 50,
        effet: {
          type: "ralentissement"
        }
      }
    ]
  },
  {
    id: "ren-per-024",
    nom: "Seishiro Nagi",
    serie: "Blue Lock",
    rang: "C",
    element: "glace",
    pv: 90,
    attaques: [
      {
        nom: "Neige fine",
        cout: 1,
        degats: 20,
        effet: null
      },
      {
        nom: "Miroir de glace",
        cout: 2,
        degats: 50,
        effet: {
          type: "bouclier",
          valeur: 20
        }
      }
    ]
  }
];
const cartes = [
  {
    id: "ren-001",
    numero: 1,
    personnage: "ren-per-001",
    finition: "holo-integrale",
    secrete: false,
    images: {}
  },
  {
    id: "ren-002",
    numero: 2,
    personnage: "ren-per-002",
    finition: "holo",
    secrete: false,
    images: {}
  },
  {
    id: "ren-003",
    numero: 3,
    personnage: "ren-per-003",
    finition: "holo",
    secrete: false,
    images: {}
  },
  {
    id: "ren-004",
    numero: 4,
    personnage: "ren-per-004",
    finition: "holo",
    secrete: false,
    images: {}
  },
  {
    id: "ren-005",
    numero: 5,
    personnage: "ren-per-005",
    finition: "holo",
    secrete: false,
    images: {}
  },
  {
    id: "ren-006",
    numero: 6,
    personnage: "ren-per-006",
    finition: "peu-commune",
    secrete: false,
    images: {}
  },
  {
    id: "ren-007",
    numero: 7,
    personnage: "ren-per-007",
    finition: "peu-commune",
    secrete: false,
    images: {}
  },
  {
    id: "ren-008",
    numero: 8,
    personnage: "ren-per-008",
    finition: "peu-commune",
    secrete: false,
    images: {}
  },
  {
    id: "ren-009",
    numero: 9,
    personnage: "ren-per-009",
    finition: "peu-commune",
    secrete: false,
    images: {}
  },
  {
    id: "ren-010",
    numero: 10,
    personnage: "ren-per-010",
    finition: "peu-commune",
    secrete: false,
    images: {}
  },
  {
    id: "ren-011",
    numero: 11,
    personnage: "ren-per-011",
    finition: "peu-commune",
    secrete: false,
    images: {}
  },
  {
    id: "ren-012",
    numero: 12,
    personnage: "ren-per-012",
    finition: "peu-commune",
    secrete: false,
    images: {}
  },
  {
    id: "ren-013",
    numero: 13,
    personnage: "ren-per-013",
    finition: "commune",
    secrete: false,
    images: {}
  },
  {
    id: "ren-014",
    numero: 14,
    personnage: "ren-per-014",
    finition: "commune",
    secrete: false,
    images: {}
  },
  {
    id: "ren-015",
    numero: 15,
    personnage: "ren-per-015",
    finition: "commune",
    secrete: false,
    images: {}
  },
  {
    id: "ren-016",
    numero: 16,
    personnage: "ren-per-016",
    finition: "commune",
    secrete: false,
    images: {}
  },
  {
    id: "ren-017",
    numero: 17,
    personnage: "ren-per-017",
    finition: "commune",
    secrete: false,
    images: {}
  },
  {
    id: "ren-018",
    numero: 18,
    personnage: "ren-per-018",
    finition: "commune",
    secrete: false,
    images: {}
  },
  {
    id: "ren-019",
    numero: 19,
    personnage: "ren-per-019",
    finition: "commune",
    secrete: false,
    images: {}
  },
  {
    id: "ren-020",
    numero: 20,
    personnage: "ren-per-020",
    finition: "commune",
    secrete: false,
    images: {}
  },
  {
    id: "ren-021",
    numero: 21,
    personnage: "ren-per-021",
    finition: "commune",
    secrete: false,
    images: {}
  },
  {
    id: "ren-022",
    numero: 22,
    personnage: "ren-per-022",
    finition: "commune",
    secrete: false,
    images: {}
  },
  {
    id: "ren-023",
    numero: 23,
    personnage: "ren-per-023",
    finition: "commune",
    secrete: false,
    images: {}
  },
  {
    id: "ren-024",
    numero: 24,
    personnage: "ren-per-024",
    finition: "commune",
    secrete: false,
    images: {}
  },
  {
    id: "ren-025",
    numero: 25,
    personnage: "ren-per-006",
    finition: "pleine",
    secrete: true,
    images: {}
  },
  {
    id: "ren-026",
    numero: 26,
    personnage: "ren-per-010",
    finition: "pleine",
    secrete: true,
    images: {}
  },
  {
    id: "ren-027",
    numero: 27,
    personnage: "ren-per-015",
    finition: "pleine",
    secrete: true,
    images: {}
  },
  {
    id: "ren-028",
    numero: 28,
    personnage: "ren-per-020",
    finition: "pleine",
    secrete: true,
    images: {}
  },
  {
    id: "ren-029",
    numero: 29,
    personnage: "ren-per-003",
    finition: "alternative",
    secrete: true,
    images: {}
  },
  {
    id: "ren-030",
    numero: 30,
    personnage: "ren-per-005",
    finition: "alternative",
    secrete: true,
    images: {}
  },
  {
    id: "ren-031",
    numero: 31,
    personnage: "ren-per-004",
    finition: "immersive",
    secrete: true,
    images: {}
  },
  {
    id: "ren-032",
    numero: 32,
    personnage: "ren-per-001",
    finition: "couronne",
    secrete: true,
    images: {}
  }
];
const __vite_glob_0_2 = {
  id,
  nom,
  edition,
  total,
  totalAvecSecretes,
  _note,
  personnages,
  cartes
};
const extensions = [
  {
    id: "lancement",
    nom: "Lancement",
    edition: 1,
    booster: "booster-lancement.json",
    vagues: [
      {
        id: "lancement",
        nom: "Lancement",
        fichier: "extension-lancement.json",
        disponibleLe: "2026-11-01"
      },
      {
        id: "renforts",
        nom: "Renforts",
        fichier: "extension-renforts.json",
        disponibleLe: "2026-11-06"
      }
    ]
  }
];
const liste = {
  extensions
};
const ELEMENTS = {
  feu: { nom: "Feu", abreviation: "Fe", couleur: "#F06A3F", glyphe: "M12 3c1 4 5 5.5 5 10a5 5 0 0 1-10 0c0-2.5 1.5-4 2.5-5 .3 2 1.3 3 2.5 3.5C11.5 9 11 6 12 3z" },
  eau: { nom: "Eau", abreviation: "Ea", couleur: "#3D8FE8", glyphe: "M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z" },
  glace: { nom: "Glace", abreviation: "Gl", couleur: "#4FBFDB", glyphe: "M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9" },
  foudre: { nom: "Foudre", abreviation: "Fo", couleur: "#A56BEB", glyphe: "M13 3L5 13h6l-1 8 8-10h-6l1-8z" },
  vent: { nom: "Vent", abreviation: "Ve", couleur: "#2FB98E", glyphe: "M3 9h11a3 3 0 1 0-3-3M3 15h15a3 3 0 1 1-3 3M3 12h8" },
  terre: { nom: "Terre", abreviation: "Te", couleur: "#C08443", glyphe: "M3 19L9 8l4 6 3-4 5 9z" },
  lumiere: { nom: "Lumière", abreviation: "Lu", couleur: "#E0AE22", glyphe: "M12 7a5 5 0 1 0 0 10a5 5 0 1 0 0-10zM12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" },
  tenebres: { nom: "Ténèbres", abreviation: "Té", couleur: "#8B6FE0", glyphe: "M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" },
  neutre: { nom: "Neutre", abreviation: "Ne", couleur: "#9A958A", glyphe: "M12 4a8 8 0 1 0 0 16a8 8 0 1 0 0-16z" }
};
const FAIBLESSE = {
  feu: "eau",
  eau: "foudre",
  foudre: "terre",
  terre: "vent",
  vent: "glace",
  glace: "feu",
  lumiere: "tenebres",
  tenebres: "lumiere",
  neutre: null
};
const ORDRE_FINITIONS = ["commune", "peu-commune", "holo", "holo-integrale", "pleine", "alternative", "immersive", "couronne"];
const ORDRE_RANGS = ["C", "B", "A", "S"];
const TOTAL_POIDS = 1e5;
const cache = /* @__PURE__ */ new WeakMap();
function indexer(extension2) {
  const deja = cache.get(extension2);
  if (deja) return deja;
  const cartesTriees = [...extension2.cartes].sort((a, b) => a.numero - b.numero);
  const cartes2 = new Map(cartesTriees.map((c) => [c.id, c]));
  const personnages2 = new Map(extension2.personnages.map((p) => [p.id, p]));
  const parPerso = /* @__PURE__ */ new Map();
  const parFinition = /* @__PURE__ */ new Map();
  for (const c of cartesTriees) {
    parPerso.set(c.personnage, [...parPerso.get(c.personnage) ?? [], c]);
    parFinition.set(c.finition, [...parFinition.get(c.finition) ?? [], c]);
  }
  const index = {
    carte: (id2) => cartes2.get(id2),
    personnage: (id2) => personnages2.get(id2),
    personnageDe: (carte) => {
      const p = personnages2.get(carte.personnage);
      if (!p) throw new Error(`Carte ${carte.id} : personnage inconnu « ${carte.personnage} ».`);
      return p;
    },
    base: (personnageId) => parPerso.get(personnageId)?.find((c) => !c.secrete),
    cartesDe: (personnageId) => parPerso.get(personnageId) ?? [],
    parFinition: (f) => parFinition.get(f) ?? [],
    cartesTriees
  };
  cache.set(extension2, index);
  return index;
}
const DEUX_32 = 4294967296;
function creerRng(suivant) {
  function entier(n) {
    if (!Number.isInteger(n) || n < 1 || n > DEUX_32) {
      throw new RangeError(`entier(n) : n doit être un entier de 1 à 2^32 (reçu : ${n}).`);
    }
    const limite = DEUX_32 - DEUX_32 % n;
    let x = suivant();
    while (x >= limite) x = suivant();
    return x % n;
  }
  function ponderer(table) {
    const entrees = Object.entries(table);
    let total2 = 0;
    for (const [cle, poids] of entrees) {
      if (typeof poids !== "number" || !Number.isInteger(poids) || poids < 0) {
        throw new RangeError(`ponderer : poids invalide pour « ${cle} » (${String(poids)}).`);
      }
      total2 += poids;
    }
    if (total2 !== TOTAL_POIDS) {
      throw new RangeError(`ponderer : la table totalise ${total2} au lieu de ${TOTAL_POIDS}.`);
    }
    let tirage = entier(TOTAL_POIDS);
    for (const [cle, poids] of entrees) {
      tirage -= poids;
      if (tirage < 0) return cle;
    }
    throw new Error("ponderer : tirage hors table.");
  }
  return { entier, ponderer };
}
function hacher(graine) {
  let h = 2166136261;
  for (let i = 0; i < graine.length; i++) {
    h ^= graine.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function rngAGraine(graine) {
  let etat = typeof graine === "string" ? hacher(graine) : graine >>> 0;
  const splitmix32 = () => {
    etat = etat + 2654435769 >>> 0;
    let z = etat;
    z = Math.imul(z ^ z >>> 16, 2246822507);
    z = Math.imul(z ^ z >>> 13, 3266489909);
    return (z ^ z >>> 16) >>> 0;
  };
  let a = splitmix32();
  let b = splitmix32();
  let c = splitmix32();
  let d = splitmix32();
  const sfc32 = () => {
    const t = (a + b >>> 0) + d >>> 0;
    d = d + 1 >>> 0;
    a = b ^ b >>> 9;
    b = c + (c << 3) >>> 0;
    c = c << 21 | c >>> 11;
    c = c + t >>> 0;
    return t;
  };
  for (let i = 0; i < 12; i++) sfc32();
  return creerRng(sfc32);
}
function tableDeLEmplacement(booster, emplacement, exceptionnel) {
  if (exceptionnel) return booster.tableExceptionnelle.finitions;
  const table = booster.emplacements.find((t) => t.emplacements.includes(emplacement));
  if (!table) throw new Error(`Booster « ${booster.id} » : aucune table pour l'emplacement ${emplacement}.`);
  return table.finitions;
}
function tirerBooster(booster, extension2, rng, options = {}) {
  const index = indexer(extension2);
  const exceptionnel = rng.entier(TOTAL_POIDS) < booster.tauxExceptionnel;
  const cartes2 = [];
  for (let emplacement = 1; emplacement <= booster.cartesParBooster; emplacement++) {
    const garantie = options.tableGarantie !== void 0 && emplacement === booster.cartesParBooster;
    const finition = rng.ponderer(garantie ? options.tableGarantie : tableDeLEmplacement(booster, emplacement, exceptionnel));
    const candidates = index.parFinition(finition);
    if (candidates.length === 0) {
      throw new Error(`Extension « ${extension2.id} » : aucune carte de rareté « ${finition} » à tirer.`);
    }
    const carte = candidates[rng.entier(candidates.length)];
    cartes2.push({ carteId: carte.id, finition: carte.finition, emplacement });
  }
  return { exceptionnel, cartes: cartes2 };
}
const TYPES_EQUIPE = ["rang-max", "elements-differents-min", "paires-serie-min"];
const estCritereEquipe = (c) => TYPES_EQUIPE.includes(c.type);
const rangDe = (r) => ORDRE_RANGS.indexOf(r);
function correspondAuTheme(carte, theme) {
  const c = theme.critere;
  switch (c.type) {
    case "elements":
      return c.valeurs.includes(carte.element);
    case "series":
      return c.valeurs.includes(carte.serie);
    case "effets":
      return carte.attaques.some((a) => a.effet !== null && c.valeurs.includes(a.effet.type));
    case "pv-min":
      return carte.pv >= c.valeur;
    case "degats-forte-min":
      return carte.attaques[1].degats >= c.valeur;
    case "rang-max":
      return rangDe(carte.rang) <= rangDe(c.valeur);
    case "elements-differents-min":
    case "paires-serie-min":
      return false;
  }
}
function paires(equipe) {
  const parSerie = /* @__PURE__ */ new Map();
  for (const c of equipe) parSerie.set(c.serie, (parSerie.get(c.serie) ?? 0) + 1);
  return [...parSerie.values()].reduce((n, k) => n + Math.floor(k / 2), 0);
}
function progressionEquipe(equipe, theme) {
  const c = theme.critere;
  const pl = (n, mot) => `${n} ${mot}${n > 1 ? "s" : ""}`;
  switch (c.type) {
    case "rang-max": {
      const auDessus = equipe.filter((p) => rangDe(p.rang) > rangDe(c.valeur)).length;
      return {
        valeur: auDessus,
        objectif: 0,
        respecte: equipe.length > 0 && auDessus === 0,
        texte: auDessus === 0 ? `Aucun personnage au-dessus du rang ${c.valeur}` : `${pl(auDessus, "personnage")} au-dessus du rang ${c.valeur}`
      };
    }
    case "elements-differents-min": {
      const n = new Set(equipe.map((p) => p.element)).size;
      return { valeur: n, objectif: c.valeur, respecte: n >= c.valeur, texte: `${pl(n, "élément")} sur ${c.valeur}` };
    }
    case "paires-serie-min": {
      const n = paires(equipe);
      return { valeur: n, objectif: c.valeur, respecte: n >= c.valeur, texte: `${pl(n, "paire")} sur ${c.valeur}` };
    }
    default:
      return null;
  }
}
const SEUIL_ELIGIBILITE = 0.15;
function themeEligible(theme, personnagesDuDraft2) {
  if (estCritereEquipe(theme.critere)) return true;
  const uniques = [...new Map(personnagesDuDraft2.map((p) => [p.id, p])).values()];
  if (uniques.length === 0) return false;
  return uniques.filter((p) => correspondAuTheme(p, theme)).length >= SEUIL_ELIGIBILITE * uniques.length;
}
function semaineIso(date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const jour = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - jour);
  const annee = d.getUTCFullYear();
  const debut = Date.UTC(annee, 0, 1);
  const numero = Math.ceil(((d.getTime() - debut) / 864e5 + 1) / 7);
  return `${annee}-S${String(numero).padStart(2, "0")}`;
}
function prochaineSemaine(date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const jour = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 8 - jour);
  return d;
}
const ADVERSAIRES = ["feu", "eau", "glace", "foudre", "vent", "terre", "lumiere", "tenebres"];
const BOOSTERS_PAR_DRAFT = 3;
const CARTES_A_GARDER = 5;
function debutSemaine(date) {
  const d = new Date(prochaineSemaine(date).getTime() - 7 * 864e5);
  return d.toISOString().slice(0, 10);
}
const sourcesDe = (sources, semaine) => typeof sources === "function" ? sources(semaine) : sources;
function lundiSemaineIso(semaine) {
  const [a, n] = semaine.split("-S").map(Number);
  const quatreJanvier = new Date(Date.UTC(a, 0, 4));
  const lundiS1 = Date.UTC(a, 0, 4 - ((quatreJanvier.getUTCDay() || 7) - 1));
  return new Date(lundiS1 + (n - 1) * 7 * 864e5);
}
const semaineSuivante = (semaine) => semaineIso(new Date(lundiSemaineIso(semaine).getTime() + 7 * 864e5));
const semainePrecedente = (semaine) => semaineIso(new Date(lundiSemaineIso(semaine).getTime() - 7 * 864e5));
const SEMAINE_DEBUT_SAC = "2026-S46";
const THEMES_AVANT_SAC = 10;
function tirerSemaine(semaine, sources, themes2) {
  if (sources.length === 0) throw new Error("Draft : aucune extension sortie.");
  const graine = `draft:${sources.map((s) => s.extension.id).join("+")}:${semaine}`;
  const rng = rngAGraine(graine);
  const ancien = semaine < SEMAINE_DEBUT_SAC;
  const themeAncien = ancien ? themes2[rng.entier(Math.min(THEMES_AVANT_SAC, themes2.length))] : null;
  const adversaire = ADVERSAIRES[rng.entier(ADVERSAIRES.length)];
  const boosters = Array.from({ length: BOOSTERS_PAR_DRAFT }, (_, i) => {
    const source = sources[i % sources.length];
    return tirerBooster(source.booster, source.extension, rng).cartes;
  });
  return { semaine, graine, adversaire, boosters, cartes: boosters.flat(), themeAncien };
}
function personnagesDuDraft(cartes2, sources) {
  return cartes2.map((t) => {
    const ext = sources.find((s) => indexer(s.extension).carte(t.carteId)).extension;
    const index = indexer(ext);
    return index.personnageDe(index.carte(t.carteId));
  });
}
function sacDuCycle(themes2, cycle) {
  const rng = rngAGraine(`draft-themes:cycle:${cycle}`);
  const sac = themes2.map((t) => t.id);
  for (let i = sac.length - 1; i > 0; i--) {
    const j = rng.entier(i + 1);
    [sac[i], sac[j]] = [sac[j], sac[i]];
  }
  return sac;
}
function themesDesSemaines(jusqua, sources, themes2) {
  const parId = new Map(themes2.map((t) => [t.id, t]));
  const resultat = /* @__PURE__ */ new Map();
  if (jusqua < SEMAINE_DEBUT_SAC) return resultat;
  const veille = semainePrecedente(SEMAINE_DEBUT_SAC);
  let precedent = tirerSemaine(veille, sourcesDe(sources, veille), themes2).themeAncien?.id ?? null;
  let cycle = 0;
  let sac = sacDuCycle(themes2, cycle);
  let sortis = /* @__PURE__ */ new Set();
  for (let semaine = SEMAINE_DEBUT_SAC; semaine <= jusqua; semaine = semaineSuivante(semaine)) {
    const src = sourcesDe(sources, semaine);
    const persos = personnagesDuDraft(tirerSemaine(semaine, src, themes2).cartes, src);
    const convient = (id2) => id2 !== precedent && themeEligible(parId.get(id2), persos);
    let choisi = sac.find((id2) => !sortis.has(id2) && convient(id2));
    if (!choisi) {
      cycle++;
      sac = sacDuCycle(themes2, cycle);
      sortis = /* @__PURE__ */ new Set();
      choisi = sac.find(convient) ?? sac.find((id2) => id2 !== precedent);
    }
    sortis.add(choisi);
    precedent = choisi;
    resultat.set(semaine, parId.get(choisi));
  }
  return resultat;
}
function genererDraft(semaine, sources, themes2) {
  const { themeAncien, ...tirage } = tirerSemaine(semaine, sourcesDe(sources, semaine), themes2);
  const theme = themeAncien ?? themesDesSemaines(semaine, sources, themes2).get(semaine);
  return { ...tirage, theme };
}
const BAREME = {
  /** Puissance d'un personnage : (PV + dégâts des deux attaques) ÷ 10, arrondi. */
  diviseurPuissance: 10,
  parCarteDuTheme: 15,
  equipeEntiereDuTheme: 20,
  /** Thème à critère d'équipe respecté : autant qu'une équipe entière du thème (5 × 15 + 20). */
  critereEquipeRespecte: 95,
  parCarteMemeSerie: 10,
  parCarteCouverte: 8,
  aucuneFaiblessePartagee: 15,
  parCarteForteContreAdversaire: 10,
  parCarteFaibleContreAdversaire: -10
};
function puissance(carte) {
  return Math.round((carte.pv + carte.attaques[0].degats + carte.attaques[1].degats) / BAREME.diviseurPuissance);
}
function scorer(equipe, theme, adversaire) {
  const lignes = [];
  const nomEl = (e) => ELEMENTS[e].nom;
  for (const c of equipe) lignes.push({ categorie: "Puissance", libelle: `${c.nom} (${c.pv} PV, ${c.attaques[0].degats} + ${c.attaques[1].degats} dégâts)`, points: puissance(c) });
  const progression = progressionEquipe(equipe, theme);
  if (progression) {
    if (equipe.length > 0) {
      lignes.push({
        categorie: "Thème",
        libelle: `Thème « ${theme.nom} » ${progression.respecte ? "respecté" : "pas encore respecté"} : ${progression.texte}`,
        points: progression.respecte ? BAREME.critereEquipeRespecte : 0
      });
    }
  } else {
    const duTheme = equipe.filter((c) => correspondAuTheme(c, theme));
    if (duTheme.length > 0) lignes.push({ categorie: "Thème", libelle: `${duTheme.length} carte${duTheme.length > 1 ? "s" : ""} du thème « ${theme.nom} »`, points: duTheme.length * BAREME.parCarteDuTheme });
    if (equipe.length > 0 && duTheme.length === equipe.length) lignes.push({ categorie: "Thème", libelle: "Toute l’équipe respecte le thème", points: BAREME.equipeEntiereDuTheme });
  }
  const parSerie = /* @__PURE__ */ new Map();
  for (const c of equipe) parSerie.set(c.serie, (parSerie.get(c.serie) ?? 0) + 1);
  for (const [serie, n] of [...parSerie].sort((a, b) => a[0].localeCompare(b[0], "fr"))) {
    if (n >= 2) lignes.push({ categorie: "Synergies", libelle: `Même série : ${serie} ×${n}`, points: (n - 1) * BAREME.parCarteMemeSerie });
  }
  const couvertes = equipe.filter((c, i) => {
    const menace = FAIBLESSE[c.element];
    const parade = menace ? FAIBLESSE[menace] : null;
    return parade !== null && equipe.some((autre, j) => j !== i && autre.element === parade);
  });
  if (couvertes.length > 0) lignes.push({ categorie: "Synergies", libelle: `Éléments complémentaires : ${couvertes.length} carte${couvertes.length > 1 ? "s" : ""} couverte${couvertes.length > 1 ? "s" : ""}`, points: couvertes.length * BAREME.parCarteCouverte });
  const faiblesses = equipe.map((c) => FAIBLESSE[c.element]).filter((f) => f !== null);
  if (equipe.length > 0 && new Set(faiblesses).size === faiblesses.length) lignes.push({ categorie: "Synergies", libelle: "Aucune faiblesse partagée", points: BAREME.aucuneFaiblessePartagee });
  const fortes = equipe.filter((c) => FAIBLESSE[adversaire] === c.element);
  const faibles = equipe.filter((c) => FAIBLESSE[c.element] === adversaire);
  if (fortes.length > 0) lignes.push({ categorie: "Défi", libelle: `${fortes.length} carte${fortes.length > 1 ? "s" : ""} forte${fortes.length > 1 ? "s" : ""} contre ${nomEl(adversaire)}`, points: fortes.length * BAREME.parCarteForteContreAdversaire });
  if (faibles.length > 0) lignes.push({ categorie: "Défi", libelle: `${faibles.length} carte${faibles.length > 1 ? "s" : ""} faible${faibles.length > 1 ? "s" : ""} contre ${nomEl(adversaire)}`, points: faibles.length * BAREME.parCarteFaibleContreAdversaire });
  return { total: lignes.reduce((a, l) => a + l.points, 0), lignes };
}
function equipeChoisie(draft, choix, extension2) {
  if (choix.length !== CARTES_A_GARDER) return `Choisis exactement ${CARTES_A_GARDER} cartes.`;
  if (new Set(choix).size !== choix.length) return "Une même carte est choisie deux fois.";
  const index = indexer(extension2);
  const equipe = [];
  for (const i of choix) {
    const t = Number.isInteger(i) ? draft.cartes[i] : void 0;
    const c = t && index.carte(t.carteId);
    const carte = c && index.personnageDe(c);
    if (!carte) return "Carte hors du draft.";
    if (equipe.some((c2) => c2.id === carte.id)) return `${carte.nom} est déjà dans l’équipe : choisis des personnages différents.`;
    equipe.push(carte);
  }
  return equipe;
}
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const dateReelle = (j) => {
  if (!DATE.test(j)) return false;
  const [a, m, d] = j.split("-").map(Number);
  const x = new Date(a, m - 1, d);
  return x.getFullYear() === a && x.getMonth() === m - 1 && x.getDate() === d;
};
function construireCatalogue(entrees, fichiers2) {
  const erreurs = [];
  const catalogue2 = [];
  if (!Array.isArray(entrees) || entrees.length === 0) return { catalogue: catalogue2, erreurs: ["Extensions : la liste de src/data/extensions.json est vide."] };
  const idsVagues = /* @__PURE__ */ new Set();
  for (const [i, e] of entrees.entries()) {
    const ref = `Extensions, ligne ${i + 1} (« ${e?.id ?? "?"} »)`;
    if (!e || typeof e.id !== "string" || !e.id || !e.nom) {
      erreurs.push(`${ref} : id et nom obligatoires.`);
      continue;
    }
    const booster = fichiers2[e.booster];
    if (!booster) {
      erreurs.push(`${ref} : fichier « ${e.booster} » introuvable dans src/data.`);
      continue;
    }
    if (booster.extension !== e.id) erreurs.push(`${ref} : le booster « ${booster.id} » appartient à l'extension « ${booster.extension} ».`);
    if (!Array.isArray(e.vagues) || e.vagues.length === 0) {
      erreurs.push(`${ref} : au moins une vague est attendue.`);
      continue;
    }
    const vagues = [];
    let precedente = "";
    for (const [j, v] of e.vagues.entries()) {
      const rv = `${e.nom}, vague ${j + 1} (« ${v?.id ?? "?"} »)`;
      if (!v || !v.id || !v.nom) {
        erreurs.push(`${rv} : id et nom obligatoires.`);
        continue;
      }
      if (idsVagues.has(v.id)) erreurs.push(`${rv} : id de vague en double.`);
      idsVagues.add(v.id);
      if (typeof v.disponibleLe !== "string" || !dateReelle(v.disponibleLe)) erreurs.push(`${rv} : date « disponibleLe » invalide (AAAA-MM-JJ attendu).`);
      else if (v.disponibleLe < precedente) erreurs.push(`${rv} : les vagues doivent être rangées par date de sortie.`);
      else precedente = v.disponibleLe;
      const donnees = fichiers2[v.fichier];
      if (!donnees) {
        erreurs.push(`${rv} : fichier « ${v.fichier} » introuvable dans src/data.`);
        continue;
      }
      if (donnees.id !== v.id) erreurs.push(`${rv} : le fichier « ${v.fichier} » contient « ${donnees.id} ».`);
      vagues.push({ id: v.id, nom: v.nom, numero: j + 1, disponibleLe: v.disponibleLe, donnees });
    }
    catalogue2.push({ id: e.id, nom: e.nom, edition: e.edition, booster, vagues });
  }
  return { catalogue: catalogue2, erreurs };
}
const assemblages = /* @__PURE__ */ new WeakMap();
function assembler(ext, n = ext.vagues.length) {
  const cache2 = assemblages.get(ext) ?? /* @__PURE__ */ new Map();
  assemblages.set(ext, cache2);
  const deja = cache2.get(n);
  if (deja) return deja;
  const vagues = ext.vagues.slice(0, n);
  const parNumero = (a, b) => a.numero - b.numero;
  const bases = vagues.flatMap((v) => v.donnees.cartes.filter((c) => !c.secrete).sort(parNumero).map((c) => ({ c, v })));
  const secretes = ORDRE_FINITIONS.flatMap((f) => vagues.flatMap((v) => v.donnees.cartes.filter((c) => c.secrete && c.finition === f).sort(parNumero).map((c) => ({ c, v }))));
  const cartes2 = [...bases, ...secretes].map(({ c, v }, i) => ({ ...c, numero: i + 1, vague: v.id }));
  const extension2 = {
    id: ext.id,
    nom: ext.nom,
    edition: ext.edition,
    total: bases.length,
    totalAvecSecretes: cartes2.length,
    personnages: vagues.flatMap((v) => v.donnees.personnages),
    cartes: cartes2
  };
  cache2.set(n, extension2);
  return extension2;
}
const vaguesSorties = (ext, jour) => ext.vagues.filter((v) => v.disponibleLe <= jour).length;
function disponiblesAu(catalogue2, jour) {
  return catalogue2.map((ext) => ({ ext, n: vaguesSorties(ext, jour) })).filter(({ n }) => n > 0).map(({ ext, n }) => ({ extension: assembler(ext, n), booster: ext.booster, vagues: ext.vagues.slice(0, n), disponibleLe: ext.vagues[0].disponibleLe }));
}
const disponiblesPourDraft = (catalogue2, maintenant) => disponiblesAu(catalogue2, debutSemaine(maintenant));
const fusions = /* @__PURE__ */ new Map();
function fusionner(extensions2) {
  if (extensions2.length === 1) return extensions2[0];
  const cle = extensions2.map((e) => `${e.id}:${e.cartes.length}`).join("+");
  const deja = fusions.get(cle);
  if (deja && extensions2.every((e) => deja.cartes.includes(e.cartes[0]))) return deja;
  const fusion = {
    id: extensions2.map((e) => e.id).join("+"),
    nom: extensions2.map((e) => e.nom).join(" + "),
    edition: 0,
    total: extensions2.reduce((n, e) => n + e.total, 0),
    totalAvecSecretes: extensions2.reduce((n, e) => n + e.totalAvecSecretes, 0),
    personnages: extensions2.flatMap((e) => e.personnages),
    cartes: extensions2.flatMap((e) => e.cartes)
  };
  fusions.set(cle, fusion);
  return fusion;
}
const modules = /* @__PURE__ */ Object.assign({ "../../src/data/booster-lancement.json": __vite_glob_0_0, "../../src/data/extension-lancement.json": __vite_glob_0_1, "../../src/data/extension-renforts.json": __vite_glob_0_2 });
const fichiers = Object.fromEntries(Object.entries(modules).map(([chemin, contenu]) => [chemin.replace("../../src/data/", ""), contenu]));
const { catalogue, erreurs: erreursCatalogue } = construireCatalogue(liste.extensions, fichiers);
const themes = [
  {
    id: "orage-de-feu",
    nom: "Orage de feu",
    description: "Cartes Feu ou Foudre.",
    critere: {
      type: "elements",
      valeurs: [
        "feu",
        "foudre"
      ]
    }
  },
  {
    id: "grand-froid",
    nom: "Grand froid",
    description: "Cartes Eau ou Glace.",
    critere: {
      type: "elements",
      valeurs: [
        "eau",
        "glace"
      ]
    }
  },
  {
    id: "terre-et-ciel",
    nom: "Terre et ciel",
    description: "Cartes Vent ou Terre.",
    critere: {
      type: "elements",
      valeurs: [
        "vent",
        "terre"
      ]
    }
  },
  {
    id: "clair-obscur",
    nom: "Clair-obscur",
    description: "Cartes Lumière ou Ténèbres.",
    critere: {
      type: "elements",
      valeurs: [
        "lumiere",
        "tenebres"
      ]
    }
  },
  {
    id: "colosses",
    nom: "Colosses",
    description: "Cartes de 130 PV ou plus.",
    critere: {
      type: "pv-min",
      valeur: 130
    }
  },
  {
    id: "frappe-lourde",
    nom: "Frappe lourde",
    description: "Attaque forte de 120 dégâts ou plus.",
    critere: {
      type: "degats-forte-min",
      valeur: 120
    }
  },
  {
    id: "soutien",
    nom: "Soutien",
    description: "Une attaque avec Soin ou Bouclier.",
    critere: {
      type: "effets",
      valeurs: [
        "soin",
        "bouclier"
      ]
    }
  },
  {
    id: "controle",
    nom: "Contrôle",
    description: "Une attaque avec Brûlure, Gel, Paralysie, Ralentissement, Recul ou Malédiction.",
    critere: {
      type: "effets",
      valeurs: [
        "brulure",
        "gel",
        "paralysie",
        "ralentissement",
        "recul",
        "malediction"
      ]
    }
  },
  {
    id: "grands-shonen",
    nom: "Grands shōnen",
    description: "One Piece, Naruto, Jujutsu Kaisen, Demon Slayer, Chainsaw Man ou Hunter x Hunter.",
    critere: {
      type: "series",
      valeurs: [
        "One Piece",
        "Naruto",
        "Jujutsu Kaisen",
        "Demon Slayer",
        "Chainsaw Man",
        "Hunter x Hunter"
      ]
    }
  },
  {
    id: "webtoons",
    nom: "Webtoons",
    description: "Solo Leveling, Tower of God, Omniscient Reader's Viewpoint ou The Boxer.",
    critere: {
      type: "series",
      valeurs: [
        "Solo Leveling",
        "Tower of God",
        "Omniscient Reader's Viewpoint",
        "The Boxer"
      ]
    }
  },
  {
    id: "recits-sombres",
    nom: "Récits sombres",
    description: "L'Attaque des Titans, Vinland Saga, Dorohedoro ou Frieren.",
    critere: {
      type: "series",
      valeurs: [
        "L'Attaque des Titans",
        "Vinland Saga",
        "Dorohedoro",
        "Frieren"
      ]
    }
  },
  {
    id: "esprits-libres",
    nom: "Esprits libres",
    description: "Mob Psycho 100, Sakamoto Days, Dandadan, Spy x Family ou Kaiju No. 8.",
    critere: {
      type: "series",
      valeurs: [
        "Mob Psycho 100",
        "Sakamoto Days",
        "Dandadan",
        "Spy x Family",
        "Kaiju No. 8"
      ]
    }
  },
  {
    id: "sans-tete-affiche",
    nom: "Sans tête d'affiche",
    description: "Équipe sans personnage de rang A ou S.",
    critere: {
      type: "rang-max",
      valeur: "B"
    }
  },
  {
    id: "arc-en-ciel",
    nom: "Arc-en-ciel",
    description: "5 éléments différents dans l'équipe.",
    critere: {
      type: "elements-differents-min",
      valeur: 5
    }
  },
  {
    id: "duos",
    nom: "Duos",
    description: "Au moins 2 paires de personnages de la même série.",
    critere: {
      type: "paires-serie-min",
      valeur: 2
    }
  }
];
const themesDraft = {
  themes
};
const hebdomadaire = {
  recompensesDraft: {
    _note: "Classement du draft (tâche 24), réclamé une fois après la fermeture de la semaine (dimanche 23 h 59, heure de Paris) : podium = sceaux du 1er, du 2e, du 3e ; participation = tous les autres. Sans compte : participation reçue tout de suite, hors classement.",
    podium: [
      5,
      4,
      3
    ],
    participation: 2
  }
};
const quetes = {
  hebdomadaire
};
function creerBaseRest(url, cleService) {
  const entetes = { apikey: cleService, Authorization: `Bearer ${cleService}`, "Content-Type": "application/json" };
  const requete = async (chemin, init = {}) => {
    const r = await fetch(`${url}/rest/v1/${chemin}`, { ...init, headers: { ...entetes, ...init.headers } });
    if (!r.ok && r.status !== 409) throw new Error(`REST ${chemin.split("?")[0]} : ${r.status} ${await r.text()}`);
    return r;
  };
  const lire = async (chemin) => await (await requete(chemin)).json();
  const q = encodeURIComponent;
  return {
    async utilisateur(jeton) {
      const r = await fetch(`${url}/auth/v1/user`, { headers: { apikey: cleService, Authorization: `Bearer ${jeton}` } });
      if (!r.ok) return null;
      const u = await r.json();
      return typeof u.id === "string" ? u.id : null;
    },
    async aUnProfil(id2) {
      return (await lire(`profils?select=id&id=eq.${q(id2)}`)).length === 1;
    },
    async lireDraft(id2, semaine) {
      const l = (await lire(
        `drafts?select=cartes,choix,score,detail,deja_recu&utilisateur=eq.${q(id2)}&semaine=eq.${q(semaine)}`
      ))[0];
      return l ? { utilisateur: id2, semaine, cartes: l.cartes, choix: l.choix, score: l.score, detail: l.detail, dejaRecu: l.deja_recu } : null;
    },
    async enregistrerDraft(l, nouvelleDate) {
      const ligne = {
        utilisateur: l.utilisateur,
        semaine: l.semaine,
        cartes: l.cartes,
        choix: l.choix,
        score: l.score,
        detail: l.detail,
        deja_recu: l.dejaRecu
      };
      if (nouvelleDate) ligne.soumis_le = (/* @__PURE__ */ new Date()).toISOString();
      await requete("drafts?on_conflict=utilisateur,semaine", {
        method: "POST",
        body: JSON.stringify(ligne),
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" }
      });
    },
    async rang(id2, semaine) {
      const moi = (await lire(`classement_draft?select=rang&semaine=eq.${q(semaine)}&utilisateur=eq.${q(id2)}`))[0];
      if (!moi) return null;
      const r = await requete(`drafts?select=utilisateur&semaine=eq.${q(semaine)}`, { method: "HEAD", headers: { Prefer: "count=exact" } });
      const total2 = Number(/\/(\d+)$/.exec(r.headers.get("Content-Range") ?? "")?.[1] ?? moi.rang);
      return { rang: moi.rang, participants: total2 };
    },
    async draftsDe(id2) {
      return (await lire(`drafts?select=semaine,deja_recu&utilisateur=eq.${q(id2)}`)).map((d) => ({ semaine: d.semaine, dejaRecu: d.deja_recu }));
    },
    async recompensesDe(id2) {
      return (await lire(`recompenses_draft?select=semaine&utilisateur=eq.${q(id2)}`)).map((r) => r.semaine);
    },
    async ajouterRecompense(id2, r) {
      const rep = await requete("recompenses_draft?on_conflict=utilisateur,semaine", {
        method: "POST",
        body: JSON.stringify({ utilisateur: id2, semaine: r.semaine, rang: r.rang, sceaux: r.sceaux }),
        headers: { Prefer: "resolution=ignore-duplicates,return=representation" }
      });
      if (rep.status === 409) return false;
      return (await rep.json()).length === 1;
    }
  };
}
function contexteServeur() {
  if (erreursCatalogue.length > 0) throw new Error(`Données du jeu invalides : ${erreursCatalogue.join(" ")}`);
  const url = Deno.env.get("SUPABASE_URL");
  const cle = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !cle) throw new Error("SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY manquent (fournies par Supabase aux fonctions).");
  return {
    // Mêmes extensions que le jeu : celles sorties au lundi de la semaine (src/main.ts).
    sources: (semaine) => disponiblesPourDraft(catalogue, lundiSemaineIso(semaine)),
    themes: themesDraft.themes,
    recompenses: quetes.hebdomadaire.recompensesDraft,
    base: creerBaseRest(url, cle),
    maintenant: () => /* @__PURE__ */ new Date()
  };
}
const HEURE = 36e5;
function changementHeure(annee, mois) {
  const dernierJour = new Date(Date.UTC(annee, mois + 1, 0));
  const dimanche = dernierJour.getUTCDate() - dernierJour.getUTCDay();
  return Date.UTC(annee, mois, dimanche, 1);
}
function decalageParis(date) {
  const t = date.getTime();
  const annee = date.getUTCFullYear();
  return t >= changementHeure(annee, 2) && t < changementHeure(annee, 9) ? 2 * HEURE : HEURE;
}
const heureDeParis = (date) => new Date(date.getTime() + decalageParis(date));
const semaineDraft = (date) => semaineIso(heureDeParis(date));
const FORMAT_SEMAINE = /^\d{4}-S\d{2}$/;
function verifierSoumission(entree, maintenant, contexte2, participation) {
  const e = typeof entree === "object" && entree !== null ? entree : {};
  const refus2 = (code, message) => ({ ok: false, code, message });
  if (typeof e.semaine !== "string" || !FORMAT_SEMAINE.test(e.semaine)) return refus2("requete-invalide", "Semaine attendue (AAAA-Snn).");
  if (!Array.isArray(e.choix) || !e.choix.every((i) => Number.isInteger(i))) return refus2("requete-invalide", `${CARTES_A_GARDER} indices de cartes attendus.`);
  const dejaRecu = e.dejaRecu === void 0 ? 0 : e.dejaRecu;
  if (!Number.isInteger(dejaRecu) || dejaRecu < 0) return refus2("requete-invalide", "Sceaux déjà reçus : entier positif attendu.");
  const courante = semaineDraft(maintenant);
  if (e.semaine < courante) return refus2("semaine-fermee", `La semaine ${e.semaine} est fermée (dimanche 23 h 59, heure de Paris) : l’équipe ne peut plus changer.`);
  if (e.semaine > courante) return refus2("semaine-future", `La semaine ${e.semaine} n’a pas encore commencé.`);
  const choix = e.choix;
  const draft = genererDraft(courante, contexte2.sources, contexte2.themes);
  const sources = typeof contexte2.sources === "function" ? contexte2.sources(courante) : contexte2.sources;
  const toutes = fusionner(sources.map((s) => s.extension));
  const equipe = equipeChoisie(draft, choix, toutes);
  if (typeof equipe === "string") return refus2("choix-invalide", equipe);
  const score = scorer(equipe, draft.theme, draft.adversaire);
  return {
    ok: true,
    semaine: courante,
    choix: [...choix],
    cartes: choix.map((i) => draft.cartes[i].carteId),
    score: score.total,
    detail: score.lignes,
    dejaRecu: Math.min(dejaRecu, participation)
  };
}
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};
const json = (statut, corps) => new Response(JSON.stringify(corps), { status: statut, headers: { ...CORS, "Content-Type": "application/json; charset=utf-8" } });
const refus = (statut, code, message) => json(statut, { ok: false, code, message });
async function joueur(requete, c) {
  if (requete.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (requete.method !== "POST") return refus(405, "methode", "Méthode POST attendue.");
  const jeton = /^Bearer (.+)$/.exec(requete.headers.get("Authorization") ?? "")?.[1];
  const id2 = jeton ? await c.base.utilisateur(jeton) : null;
  return id2 ?? refus(401, "non-connecte", "Connecte-toi pour rejoindre le classement.");
}
async function traiterSoumission(requete, c) {
  try {
    const id2 = await joueur(requete, c);
    if (typeof id2 !== "string") return id2;
    let entree;
    try {
      entree = await requete.json();
    } catch {
      return refus(400, "requete-invalide", "Corps JSON attendu.");
    }
    const v = verifierSoumission(entree, c.maintenant(), c, c.recompenses.participation);
    if (!v.ok) return refus(v.code === "semaine-fermee" ? 409 : 400, v.code, v.message);
    if (!await c.base.aUnProfil(id2)) return refus(403, "sans-pseudo", "Choisis d’abord ton pseudo.");
    const avant = await c.base.lireDraft(id2, v.semaine);
    const dejaRecu = Math.max(v.dejaRecu, avant?.dejaRecu ?? 0);
    const nouvelleDate = !avant || avant.choix.join() !== v.choix.join();
    await c.base.enregistrerDraft({ utilisateur: id2, semaine: v.semaine, cartes: v.cartes, choix: v.choix, score: v.score, detail: v.detail, dejaRecu }, nouvelleDate);
    const r = await c.base.rang(id2, v.semaine);
    return json(200, { ok: true, semaine: v.semaine, choix: v.choix, score: v.score, detail: v.detail, rang: r?.rang ?? null, participants: r?.participants ?? null });
  } catch (e) {
    console.error("soumettre-draft", e);
    return refus(500, "erreur", "Erreur du serveur : réessaie plus tard.");
  }
}
const contexte = contexteServeur();
Deno.serve((requete) => traiterSoumission(requete, contexte));
