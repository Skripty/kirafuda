// Fonction Supabase « soumettre-draft » — FICHIER GÉNÉRÉ par `npm run fonctions`, ne pas modifier à la main.
// Empreinte des sources : b2beb23af1a5aea2
// Sources : src/core/catalogue.ts, src/core/classement.ts, src/core/combat/fiches.ts, src/core/draft.ts, src/core/extension.ts, src/core/regles.ts, src/core/rng.ts, src/core/tirage.ts, src/data/booster-lancement.json, src/data/extension-lancement.json, src/data/extension-renforts.json, src/data/extension-vague3.json, src/data/extensions.json, src/data/quetes.json, src/data/themes-draft.json, supabase/fonctions/base-rest.ts, supabase/fonctions/contexte.ts, supabase/fonctions/donnees.ts, supabase/fonctions/draft-serveur.ts, supabase/fonctions/soumettre-draft.ts
// @ts-nocheck
const id$3 = "booster-lancement";
const extension = "lancement";
const nom$3 = "Booster Lancement";
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
const _note$3 = "Poids entiers sur 100000. Chaque emplacement tire une finition (rareté), puis une carte de cette rareté à poids égaux. Emplacements 4 et 5 = taux de Pokémon TCG Pocket.";
const __vite_glob_0_0 = {
  id: id$3,
  extension,
  nom: nom$3,
  cartesParBooster,
  cout,
  pointsParOuverture,
  tauxExceptionnel,
  emplacements,
  tableExceptionnelle,
  _note: _note$3
};
const id$2 = "lancement";
const nom$2 = "Lancement";
const edition$2 = 1;
const total$2 = 100;
const totalAvecSecretes$2 = 140;
const _note$2 = "Une carte = un personnage dans une rareté fixe (système TCG Pocket). Les PV et attaques sont ceux du personnage, identiques sur toutes ses cartes.";
const personnages$2 = [
  {
    id: "per-001",
    nom: "Monkey D. Luffy",
    serie: "One Piece",
    rang: "S",
    element: "lumiere",
    type: "eveille",
    pv: 170,
    repli: 1,
    talent: {
      nom: "Haki des rois",
      texte: "quand Luffy entre par Relève, chaque personnage du banc adverse subit 10 dégâts.",
      effets: [
        {
          type: "entree-releve",
          effets: [
            {
              type: "degats-banc-adverse",
              valeur: 10
            }
          ]
        }
      ]
    },
    attaques: [
      {
        nom: "Gomu Gomu no Pistol",
        cout: [
          "l"
        ],
        degats: 40,
        effet: "",
        effets: []
      },
      {
        nom: "Gear Fifth : Bajrang Gun",
        cout: [
          "l",
          "l",
          "q",
          "q"
        ],
        degats: 160,
        effet: "Luffy ne peut pas attaquer au tour suivant.",
        effets: [
          {
            type: "repos",
            quoi: "toutes"
          }
        ]
      }
    ]
  },
  {
    id: "per-002",
    nom: "Roronoa Zoro",
    serie: "One Piece",
    rang: "A",
    element: "vent",
    type: "eveille",
    pv: 140,
    repli: 2,
    talent: {
      nom: "Bras droit",
      texte: "si Luffy est en jeu, ses attaques font +20.",
      effets: [
        {
          type: "bonus-attaque",
          valeur: 20,
          si: {
            si: "perso-en-jeu",
            personnage: "per-001"
          }
        }
      ]
    },
    attaques: [
      {
        nom: "Oni Giri",
        cout: [
          "v",
          "q"
        ],
        degats: 50,
        effet: "",
        effets: []
      },
      {
        nom: "Asura",
        cout: [
          "v",
          "v",
          "q",
          "q"
        ],
        degats: 130,
        effet: "",
        effets: []
      }
    ]
  },
  {
    id: "per-003",
    nom: "Nico Robin",
    serie: "One Piece",
    rang: "B",
    element: "terre",
    type: "base",
    pv: 90,
    repli: 1,
    talent: {
      nom: "Archéologue",
      texte: "une fois par tour, regarde les 2 premières cartes de ton deck, prends-en 1, l'autre va sous le deck.",
      effets: [
        {
          type: "activable",
          limite: "tour",
          effets: [
            {
              type: "regarder",
              nombre: 2,
              garder: 1,
              reste: "dessous"
            }
          ]
        }
      ]
    },
    attaques: [
      {
        nom: "Cien Fleurs : Clutch",
        cout: [
          "t",
          "q"
        ],
        degats: 40,
        effet: "+20 si la cible est Étourdie.",
        effets: [
          {
            type: "bonus",
            valeur: 20,
            si: {
              si: "cible-etat",
              etat: "etourdi"
            }
          }
        ]
      }
    ]
  },
  {
    id: "per-004",
    nom: "Naruto Uzumaki",
    serie: "Naruto",
    rang: "A",
    element: "vent",
    type: "eveille",
    pv: 140,
    repli: 1,
    talent: {
      nom: "Multiclonage",
      texte: "quand Naruto entre par Relève, pose un Base de Naruto de ton deck sur ton banc.",
      effets: [
        {
          type: "entree-releve",
          effets: [
            {
              type: "poser-base-serie"
            }
          ]
        }
      ]
    },
    attaques: [
      {
        nom: "Rasengan",
        cout: [
          "v",
          "q"
        ],
        degats: 50,
        effet: "",
        effets: []
      },
      {
        nom: "Orbe Rasen-shuriken",
        cout: [
          "v",
          "v",
          "q",
          "q"
        ],
        degats: 120,
        effet: "pas utilisable au tour suivant.",
        effets: [
          {
            type: "repos",
            quoi: "attaque"
          }
        ]
      }
    ]
  },
  {
    id: "per-005",
    nom: "Sasuke Uchiha",
    serie: "Naruto",
    rang: "A",
    element: "foudre",
    type: "eveille",
    pv: 130,
    repli: 1,
    talent: {
      nom: "Sharingan",
      texte: "la première attaque qu'il subit à chaque tour adverse échoue sur un pile.",
      effets: [
        {
          type: "esquive-premiere",
          cote: "pile"
        }
      ]
    },
    attaques: [
      {
        nom: "Chidori",
        cout: [
          "z",
          "q"
        ],
        degats: 50,
        effet: "ignore les boucliers.",
        effets: [
          {
            type: "ignore",
            quoi: "boucliers"
          }
        ]
      },
      {
        nom: "Amaterasu",
        cout: [
          "z",
          "z",
          "q"
        ],
        degats: 60,
        effet: "la cible est Brûlée.",
        effets: [
          {
            type: "etat",
            etat: "brulure"
          }
        ]
      }
    ]
  },
  {
    id: "per-006",
    nom: "Itachi Uchiha",
    serie: "Naruto",
    rang: "S",
    element: "tenebres",
    type: "eveille",
    pv: 160,
    repli: 2,
    talent: {
      nom: "Genjutsu des corbeaux",
      texte: "quand l'adversaire fait une Relève, le personnage qui entre est Étourdi.",
      effets: [
        {
          type: "releve-adverse-etourdie"
        }
      ]
    },
    attaques: [
      {
        nom: "Tsukuyomi",
        cout: [
          "n",
          "q"
        ],
        degats: 40,
        effet: "la cible est Étourdie.",
        effets: [
          {
            type: "etat",
            etat: "etourdi"
          }
        ]
      },
      {
        nom: "Susano'o : épée de Totsuka",
        cout: [
          "n",
          "n",
          "q",
          "q"
        ],
        degats: 150,
        effet: "défausse ensuite 2 énergies d'Itachi.",
        effets: [
          {
            type: "defausse-energies-soi",
            nombre: 2
          }
        ]
      }
    ]
  },
  {
    id: "per-007",
    nom: "Satoru Gojo",
    serie: "Jujutsu Kaisen",
    rang: "S",
    element: "lumiere",
    type: "eveille",
    pv: 170,
    repli: 2,
    talent: {
      nom: "Infini",
      texte: "tant qu'il a 2 énergies ou plus, il subit 30 dégâts de moins.",
      effets: [
        {
          type: "reduction",
          valeur: 30,
          si: {
            si: "soi-energies-min",
            nombre: 2
          }
        }
      ]
    },
    attaques: [
      {
        nom: "Bleu",
        cout: [
          "l"
        ],
        degats: 30,
        effet: "l'adversaire doit mettre un personnage de son banc en actif.",
        effets: [
          {
            type: "forcer-echange-adverse"
          }
        ]
      },
      {
        nom: "Violet creux",
        cout: [
          "l",
          "l",
          "l",
          "q"
        ],
        degats: 180,
        effet: "défausse ensuite toutes ses énergies.",
        effets: [
          {
            type: "defausse-energies-soi",
            nombre: "toutes"
          }
        ]
      }
    ]
  },
  {
    id: "per-008",
    nom: "Yuji Itadori",
    serie: "Jujutsu Kaisen",
    rang: "A",
    element: "foudre",
    type: "eveille",
    pv: 130,
    repli: 1,
    talent: null,
    attaques: [
      {
        nom: "Poing divergent",
        cout: [
          "z"
        ],
        degats: 30,
        effet: "au tour suivant, la cible subit encore 30.",
        effets: [
          {
            type: "degats-differes",
            valeur: 30
          }
        ]
      },
      {
        nom: "Black Flash",
        cout: [
          "z",
          "z",
          "q"
        ],
        degats: 80,
        effet: "pile : +60.",
        effets: [
          {
            type: "bonus",
            valeur: 60,
            si: {
              si: "piece",
              cote: "pile"
            }
          }
        ]
      }
    ]
  },
  {
    id: "per-009",
    nom: "Megumi Fushiguro",
    serie: "Jujutsu Kaisen",
    rang: "A",
    element: "tenebres",
    type: "eveille",
    pv: 120,
    repli: 1,
    talent: {
      nom: "Dix ombres",
      texte: "une fois par tour, cherche un Base de Jujutsu Kaisen dans ton deck et pose-le sur ton banc.",
      effets: [
        {
          type: "activable",
          limite: "tour",
          effets: [
            {
              type: "chercher",
              quoi: "base",
              vers: "banc",
              serie: "la-sienne"
            }
          ]
        }
      ]
    },
    attaques: [
      {
        nom: "Chiens divins",
        cout: [
          "n",
          "q"
        ],
        degats: 40,
        effet: "",
        effets: []
      },
      {
        nom: "Mahoraga",
        cout: [
          "n",
          "n",
          "n",
          "q"
        ],
        degats: 140,
        effet: "Megumi subit 50 dégâts.",
        effets: [
          {
            type: "degats-soi",
            valeur: 50
          }
        ]
      }
    ]
  },
  {
    id: "per-010",
    nom: "Nobara Kugisaki",
    serie: "Jujutsu Kaisen",
    rang: "B",
    element: "terre",
    type: "base",
    pv: 80,
    repli: 1,
    talent: null,
    attaques: [
      {
        nom: "Clou et marteau",
        cout: [
          "t"
        ],
        degats: 20,
        effet: "",
        effets: []
      },
      {
        nom: "Résonance",
        cout: [
          "t",
          "q"
        ],
        degats: 30,
        effet: "+40 si l'actif adverse est déjà blessé.",
        effets: [
          {
            type: "bonus",
            valeur: 40,
            si: {
              si: "cible-blessee"
            }
          }
        ]
      }
    ]
  },
  {
    id: "per-011",
    nom: "Ryomen Sukuna",
    serie: "Jujutsu Kaisen",
    rang: "A",
    element: "tenebres",
    type: "eveille",
    pv: 140,
    repli: 2,
    talent: {
      nom: "Roi des fléaux",
      texte: "peut relever Itadori au tour même où Itadori est entré.",
      effets: [
        {
          type: "special",
          code: "roi-des-fleaux"
        }
      ]
    },
    attaques: [
      {
        nom: "Démantèlement",
        cout: [
          "n",
          "q"
        ],
        degats: 50,
        effet: "à un personnage du banc adverse.",
        effets: [
          {
            type: "cible",
            quoi: "banc-adverse"
          }
        ]
      },
      {
        nom: "Sanctuaire malveillant",
        cout: [
          "n",
          "n",
          "n"
        ],
        degats: 50,
        effet: "à chaque personnage adverse, puis défausse toutes ses énergies.",
        effets: [
          {
            type: "zone"
          },
          {
            type: "defausse-energies-soi",
            nombre: "toutes"
          }
        ]
      }
    ]
  },
  {
    id: "per-012",
    nom: "Suguru Geto",
    serie: "Jujutsu Kaisen",
    rang: "B",
    element: "tenebres",
    type: "base",
    pv: 90,
    repli: 1,
    talent: {
      nom: "Manipulation des fléaux",
      texte: "une fois par tour, défausse une carte de ta main pour infliger 10 dégâts à un personnage adverse.",
      effets: [
        {
          type: "activable",
          limite: "tour",
          cout: "defausse-carte",
          effets: [
            {
              type: "degats",
              valeur: 10,
              cible: "adverse"
            }
          ]
        }
      ]
    },
    attaques: [
      {
        nom: "Fléau de rang spécial",
        cout: [
          "n",
          "q",
          "q"
        ],
        degats: 60,
        effet: "",
        effets: []
      }
    ]
  },
  {
    id: "per-013",
    nom: "Yuta Okkotsu",
    serie: "Jujutsu Kaisen",
    rang: "B",
    element: "lumiere",
    type: "base",
    pv: 80,
    repli: 1,
    talent: {
      nom: "Rika",
      texte: "la première fois de la partie où Yuta devrait être mis K.-O., il reste à 10 PV.",
      effets: [
        {
          type: "special",
          code: "rika"
        }
      ]
    },
    attaques: [
      {
        nom: "Copie",
        cout: [
          "l",
          "q",
          "q"
        ],
        degats: "",
        effet: "utilise une attaque de l'actif adverse, sans payer son coût.",
        effets: [
          {
            type: "special",
            code: "copie"
          }
        ]
      }
    ]
  },
  {
    id: "per-014",
    nom: "Toji Fushiguro",
    serie: "Jujutsu Kaisen",
    rang: "B",
    element: "neutre",
    type: "base",
    pv: 100,
    repli: 1,
    talent: {
      nom: "Restriction céleste",
      texte: "Toji n'est jamais touché par les états (Brûlure, Gel, Étourdi, Malédiction).",
      effets: [
        {
          type: "immunite",
          etats: [
            "brulure",
            "gel",
            "etourdi",
            "malediction"
          ]
        }
      ]
    },
    attaques: [
      {
        nom: "Lance inverse céleste",
        cout: [
          "q",
          "q"
        ],
        degats: 40,
        effet: "ignore les boucliers et réductions de dégâts de la cible.",
        effets: [
          {
            type: "ignore",
            quoi: "boucliers-et-reductions"
          }
        ]
      }
    ]
  },
  {
    id: "per-015",
    nom: "Maki Zenin",
    serie: "Jujutsu Kaisen",
    rang: "B",
    element: "vent",
    type: "base",
    pv: 90,
    repli: 0,
    talent: {
      nom: "Arsenal maudit",
      texte: "une fois par tour, défausse un Objet de ta main pour piocher 2 cartes.",
      effets: [
        {
          type: "activable",
          limite: "tour",
          cout: "defausse-objet",
          effets: [
            {
              type: "pioche",
              valeur: 2
            }
          ]
        }
      ]
    },
    attaques: [
      {
        nom: "Dragon-Bone",
        cout: [
          "v",
          "q"
        ],
        degats: 50,
        effet: "+30 si Maki a déjà subi des dégâts.",
        effets: [
          {
            type: "bonus",
            valeur: 30,
            si: {
              si: "soi-blesse"
            }
          }
        ]
      }
    ]
  },
  {
    id: "per-016",
    nom: "Kento Nanami",
    serie: "Jujutsu Kaisen",
    rang: "B",
    element: "neutre",
    type: "base",
    pv: 100,
    repli: 2,
    talent: {
      nom: "Heures supplémentaires",
      texte: "si tu as moins de points que l'adversaire, ses attaques font +20.",
      effets: [
        {
          type: "bonus-attaque",
          valeur: 20,
          si: {
            si: "moins-de-points"
          }
        }
      ]
    },
    attaques: [
      {
        nom: "Ratio 7:3",
        cout: [
          "q",
          "q"
        ],
        degats: 40,
        effet: "+40 si la cible a la moitié de ses PV ou moins.",
        effets: [
          {
            type: "bonus",
            valeur: 40,
            si: {
              si: "cible-moitie-pv"
            }
          }
        ]
      }
    ]
  },
  {
    id: "per-017",
    nom: "Denji",
    serie: "Chainsaw Man",
    rang: "A",
    element: "feu",
    type: "eveille",
    pv: 130,
    repli: 1,
    talent: {
      nom: "Pochita",
      texte: "une fois par partie, quand Denji devrait être mis K.-O., lance une pièce : face, il reste à 10 PV.",
      effets: [
        {
          type: "survie",
          pv: 10,
          piece: "face"
        }
      ]
    },
    attaques: [
      {
        nom: "Tronçonneuse",
        cout: [
          "f",
          "q"
        ],
        degats: 40,
        effet: "",
        effets: []
      },
      {
        nom: "Chainsaw Man",
        cout: [
          "f",
          "f",
          "q",
          "q"
        ],
        degats: 120,
        effet: "Denji subit 20 dégâts.",
        effets: [
          {
            type: "degats-soi",
            valeur: 20
          }
        ]
      }
    ]
  },
  {
    id: "per-018",
    nom: "Makima",
    serie: "Chainsaw Man",
    rang: "A",
    element: "tenebres",
    type: "eveille",
    pv: 140,
    repli: 2,
    talent: {
      nom: "Contrôle",
      texte: "quand Makima entre par Relève, retire 1 énergie de l'actif adverse.",
      effets: [
        {
          type: "entree-releve",
          effets: [
            {
              type: "retirer-energie-adverse"
            }
          ]
        }
      ]
    },
    attaques: [
      {
        nom: "Pan",
        cout: [
          "n",
          "q"
        ],
        degats: 30,
        effet: "à n'importe quel personnage adverse.",
        effets: [
          {
            type: "cible",
            quoi: "n-importe"
          }
        ]
      },
      {
        nom: "Contrat",
        cout: [
          "n",
          "n",
          "q"
        ],
        degats: 80,
        effet: "si la cible est mise K.-O., soigne 30 Makima.",
        effets: [
          {
            type: "soin-soi-si-ko",
            valeur: 30
          }
        ]
      }
    ]
  },
  {
    id: "per-019",
    nom: "Power",
    serie: "Chainsaw Man",
    rang: "A",
    element: "tenebres",
    type: "eveille",
    pv: 130,
    repli: 1,
    talent: null,
    attaques: [
      {
        nom: "Marteau de sang",
        cout: [
          "n",
          "q"
        ],
        degats: 50,
        effet: "Power subit 10 dégâts.",
        effets: [
          {
            type: "degats-soi",
            valeur: 10
          }
        ]
      },
      {
        nom: "Lance de sang",
        cout: [
          "n",
          "n",
          "q"
        ],
        degats: 100,
        effet: "+30 si Power a la moitié de ses PV ou moins.",
        effets: [
          {
            type: "bonus",
            valeur: 30,
            si: {
              si: "soi-moitie-pv"
            }
          }
        ]
      }
    ]
  },
  {
    id: "per-020",
    nom: "Aki Hayakawa",
    serie: "Chainsaw Man",
    rang: "B",
    element: "glace",
    type: "base",
    pv: 90,
    repli: 1,
    talent: {
      nom: "Démon du Futur",
      texte: "une fois par tour, regarde la carte du dessus de ton deck ; tu peux la mettre sous le deck.",
      effets: [
        {
          type: "activable",
          limite: "tour",
          effets: [
            {
              type: "regarder",
              nombre: 1,
              garder: 0,
              reste: "choix-dessous"
            }
          ]
        }
      ]
    },
    attaques: [
      {
        nom: "Démon de la Malédiction",
        cout: [
          "g",
          "g",
          "q"
        ],
        degats: 60,
        effet: "la cible est Maudite.",
        effets: [
          {
            type: "etat",
            etat: "malediction"
          }
        ]
      }
    ]
  },
  {
    id: "per-021",
    nom: "Reze",
    serie: "Chainsaw Man",
    rang: "B",
    element: "feu",
    type: "base",
    pv: 90,
    repli: 1,
    talent: {
      nom: "Démon Bombe",
      texte: "quand Reze est mise K.-O., l'actif adverse subit 30 dégâts.",
      effets: [
        {
          type: "si-ko-subi",
          effets: [
            {
              type: "degats-actif-adverse",
              valeur: 30
            }
          ]
        }
      ]
    },
    attaques: [
      {
        nom: "Détonation",
        cout: [
          "f",
          "q"
        ],
        degats: 50,
        effet: "",
        effets: []
      }
    ]
  },
  {
    id: "per-022",
    nom: "Himeno",
    serie: "Chainsaw Man",
    rang: "C",
    element: "vent",
    type: "base",
    pv: 70,
    repli: 1,
    talent: null,
    attaques: [
      {
        nom: "Démon Fantôme",
        cout: [
          "q"
        ],
        degats: 20,
        effet: "l'actif adverse ne peut pas se replier au prochain tour.",
        effets: [
          {
            type: "bloque-repli-cible"
          }
        ]
      }
    ]
  },
  {
    id: "per-023",
    nom: "Quanxi",
    serie: "Chainsaw Man",
    rang: "C",
    element: "foudre",
    type: "base",
    pv: 70,
    repli: 0,
    talent: null,
    attaques: [
      {
        nom: "Quatre flèches",
        cout: [
          "q",
          "q"
        ],
        degats: 40,
        effet: "pile : +20.",
        effets: [
          {
            type: "bonus",
            valeur: 20,
            si: {
              si: "piece",
              cote: "pile"
            }
          }
        ]
      }
    ]
  },
  {
    id: "per-024",
    nom: "Asa Mitaka",
    serie: "Chainsaw Man",
    rang: "C",
    element: "neutre",
    type: "base",
    pv: 70,
    repli: 1,
    talent: {
      nom: "Démon de la Guerre",
      texte: "une fois par tour, défausse une carte de ta main : la prochaine attaque d'Asa ce tour fait +30.",
      effets: [
        {
          type: "activable",
          limite: "tour",
          cout: "defausse-carte",
          effets: [
            {
              type: "bonus-prochaine-attaque",
              valeur: 30
            }
          ]
        }
      ]
    },
    attaques: [
      {
        nom: "Lame d'uniforme",
        cout: [
          "q",
          "q"
        ],
        degats: 30,
        effet: "",
        effets: []
      }
    ]
  },
  {
    id: "per-025",
    nom: "Eren Yeager",
    serie: "L'Attaque des Titans",
    rang: "A",
    element: "terre",
    type: "eveille",
    pv: 150,
    repli: 2,
    talent: {
      nom: "Durcissement",
      texte: "une fois par tour, défausse 1 énergie d'Eren : il subit 40 dégâts de moins jusqu'à ton prochain tour.",
      effets: [
        {
          type: "activable",
          limite: "tour",
          cout: "defausse-energie",
          effets: [
            {
              type: "bouclier",
              valeur: 40,
              cible: "soi"
            }
          ]
        }
      ]
    },
    attaques: [
      {
        nom: "Poing du Titan",
        cout: [
          "t",
          "q"
        ],
        degats: 50,
        effet: "",
        effets: []
      },
      {
        nom: "Titan Originel",
        cout: [
          "t",
          "t",
          "q",
          "q"
        ],
        degats: 110,
        effet: "+20 si tu as 2 personnages de L'Attaque des Titans ou plus sur ton banc.",
        effets: [
          {
            type: "bonus",
            valeur: 20,
            si: {
              si: "banc-serie-min",
              nombre: 2
            }
          }
        ]
      }
    ]
  },
  {
    id: "per-026",
    nom: "Mikasa Ackerman",
    serie: "L'Attaque des Titans",
    rang: "A",
    element: "vent",
    type: "eveille",
    pv: 140,
    repli: 1,
    talent: {
      nom: "Lien Ackerman",
      texte: "si Eren est en jeu, Mikasa subit 20 dégâts de moins.",
      effets: [
        {
          type: "reduction",
          valeur: 20,
          si: {
            si: "perso-en-jeu",
            personnage: "per-025"
          }
        }
      ]
    },
    attaques: [
      {
        nom: "Manœuvre tridimensionnelle",
        cout: [
          "v"
        ],
        degats: 30,
        effet: "échange ensuite Mikasa avec un de tes personnages du banc.",
        effets: [
          {
            type: "echange-soi"
          }
        ]
      },
      {
        nom: "Lames jumelles",
        cout: [
          "v",
          "v",
          "q"
        ],
        degats: 100,
        effet: "",
        effets: []
      }
    ]
  },
  {
    id: "per-027",
    nom: "Levi Ackerman",
    serie: "L'Attaque des Titans",
    rang: "S",
    element: "vent",
    type: "eveille",
    pv: 160,
    repli: 1,
    talent: {
      nom: "Nettoyage",
      texte: "quand une attaque de Levi met un personnage K.-O., soigne 30 Levi.",
      effets: [
        {
          type: "si-ko-inflige",
          effets: [
            {
              type: "soin-soi",
              valeur: 30
            }
          ]
        }
      ]
    },
    attaques: [
      {
        nom: "Taille en spirale",
        cout: [
          "v",
          "q"
        ],
        degats: 60,
        effet: "",
        effets: []
      },
      {
        nom: "Massacre du Titan Bestial",
        cout: [
          "v",
          "v",
          "q",
          "q"
        ],
        degats: 120,
        effet: "+40 contre un Éveillé.",
        effets: [
          {
            type: "bonus",
            valeur: 40,
            si: {
              si: "cible-type",
              type: "eveille"
            }
          }
        ]
      }
    ]
  },
  {
    id: "per-028",
    nom: "Armin Arlert",
    serie: "L'Attaque des Titans",
    rang: "B",
    element: "feu",
    type: "base",
    pv: 70,
    repli: 1,
    talent: {
      nom: "Stratège",
      texte: "une fois par tour, regarde la main de l'adversaire.",
      effets: [
        {
          type: "activable",
          limite: "tour",
          effets: [
            {
              type: "voir-main-adverse"
            }
          ]
        }
      ]
    },
    attaques: [
      {
        nom: "Titan Colossal",
        cout: [
          "f",
          "f",
          "q"
        ],
        degats: 100,
        effet: "Armin subit 40 dégâts.",
        effets: [
          {
            type: "degats-soi",
            valeur: 40
          }
        ]
      }
    ]
  },
  {
    id: "per-029",
    nom: "Erwin Smith",
    serie: "L'Attaque des Titans",
    rang: "B",
    element: "lumiere",
    type: "base",
    pv: 100,
    repli: 1,
    talent: {
      nom: "Consacrez vos cœurs",
      texte: "tes autres personnages de L'Attaque des Titans font +10 avec leurs attaques.",
      effets: [
        {
          type: "bonus-serie",
          valeur: 10
        }
      ]
    },
    attaques: [
      {
        nom: "Charge héroïque",
        cout: [
          "l",
          "q"
        ],
        degats: 40,
        effet: "",
        effets: []
      }
    ]
  },
  {
    id: "per-030",
    nom: "Annie Leonhart",
    serie: "L'Attaque des Titans",
    rang: "B",
    element: "glace",
    type: "base",
    pv: 100,
    repli: 2,
    talent: {
      nom: "Titan Féminin",
      texte: "Annie subit 20 dégâts de moins de la part des Éveillés.",
      effets: [
        {
          type: "reduction",
          valeur: 20,
          si: {
            si: "source-eveille"
          }
        }
      ]
    },
    attaques: [
      {
        nom: "Coup de pied durci",
        cout: [
          "g",
          "q"
        ],
        degats: 50,
        effet: "",
        effets: []
      }
    ]
  },
  {
    id: "per-031",
    nom: "Reiner Braun",
    serie: "L'Attaque des Titans",
    rang: "C",
    element: "terre",
    type: "base",
    pv: 80,
    repli: 2,
    talent: null,
    attaques: [
      {
        nom: "Titan Cuirassé",
        cout: [
          "q",
          "q"
        ],
        degats: 30,
        effet: "Reiner subit 20 dégâts de moins jusqu'à ton prochain tour.",
        effets: [
          {
            type: "bouclier-soi",
            valeur: 20
          }
        ]
      }
    ]
  },
  {
    id: "per-032",
    nom: "Historia Reiss",
    serie: "L'Attaque des Titans",
    rang: "C",
    element: "lumiere",
    type: "base",
    pv: 60,
    repli: 1,
    talent: null,
    attaques: [
      {
        nom: "Reine des murs",
        cout: [
          "q"
        ],
        degats: "",
        effet: "soigne 30 un de tes personnages de L'Attaque des Titans.",
        effets: [
          {
            type: "soin",
            valeur: 30,
            cible: "allie",
            serie: "L'Attaque des Titans"
          }
        ]
      }
    ]
  },
  {
    id: "per-033",
    nom: "Tanjiro Kamado",
    serie: "Demon Slayer",
    rang: "A",
    element: "eau",
    type: "eveille",
    pv: 140,
    repli: 1,
    talent: {
      nom: "Fil de l'ouverture",
      texte: "ses attaques font +20 contre un personnage déjà blessé.",
      effets: [
        {
          type: "bonus-attaque",
          valeur: 20,
          si: {
            si: "cible-blessee"
          }
        }
      ]
    },
    attaques: [
      {
        nom: "Souffle de l'Eau : coupe en surface",
        cout: [
          "e",
          "q"
        ],
        degats: 50,
        effet: "",
        effets: []
      },
      {
        nom: "Danse du Dieu du Feu",
        cout: [
          "e",
          "e",
          "q",
          "q"
        ],
        degats: 110,
        effet: "la cible est Brûlée.",
        effets: [
          {
            type: "etat",
            etat: "brulure"
          }
        ]
      }
    ]
  },
  {
    id: "per-034",
    nom: "Nezuko Kamado",
    serie: "Demon Slayer",
    rang: "A",
    element: "feu",
    type: "eveille",
    pv: 130,
    repli: 1,
    talent: {
      nom: "Régénération",
      texte: "à la fin de chacun de tes tours, soigne 10 Nezuko.",
      effets: [
        {
          type: "fin-de-tour",
          soin: 10
        }
      ]
    },
    attaques: [
      {
        nom: "Coup de pied",
        cout: [
          "f"
        ],
        degats: 30,
        effet: "",
        effets: []
      },
      {
        nom: "Sang explosif",
        cout: [
          "f",
          "f",
          "q"
        ],
        degats: 70,
        effet: "la cible est Brûlée.",
        effets: [
          {
            type: "etat",
            etat: "brulure"
          }
        ]
      }
    ]
  },
  {
    id: "per-035",
    nom: "Zenitsu Agatsuma",
    serie: "Demon Slayer",
    rang: "B",
    element: "foudre",
    type: "base",
    pv: 70,
    repli: 0,
    talent: {
      nom: "Endormi",
      texte: "ses attaques font +40 s'il a déjà subi des dégâts.",
      effets: [
        {
          type: "bonus-attaque",
          valeur: 40,
          si: {
            si: "soi-blesse"
          }
        }
      ]
    },
    attaques: [
      {
        nom: "Éclair foudroyant",
        cout: [
          "z",
          "q"
        ],
        degats: 40,
        effet: "",
        effets: []
      }
    ]
  },
  {
    id: "per-036",
    nom: "Inosuke Hashibira",
    serie: "Demon Slayer",
    rang: "B",
    element: "terre",
    type: "base",
    pv: 90,
    repli: 0,
    talent: null,
    attaques: [
      {
        nom: "Crocs de la bête",
        cout: [
          "t",
          "q"
        ],
        degats: 50,
        effet: "+20 si l'actif adverse a plus de PV restants qu'Inosuke.",
        effets: [
          {
            type: "bonus",
            valeur: 20,
            si: {
              si: "cible-plus-de-pv"
            }
          }
        ]
      }
    ]
  },
  {
    id: "per-037",
    nom: "Giyu Tomioka",
    serie: "Demon Slayer",
    rang: "B",
    element: "eau",
    type: "base",
    pv: 100,
    repli: 2,
    talent: {
      nom: "Calme plat",
      texte: "la première attaque qu'il subit à chaque tour adverse fait 30 dégâts de moins.",
      effets: [
        {
          type: "reduction-premiere",
          valeur: 30
        }
      ]
    },
    attaques: [
      {
        nom: "Onzième forme",
        cout: [
          "e",
          "q",
          "q"
        ],
        degats: 50,
        effet: "",
        effets: []
      }
    ]
  },
  {
    id: "per-038",
    nom: "Shinobu Kocho",
    serie: "Demon Slayer",
    rang: "B",
    element: "vent",
    type: "base",
    pv: 70,
    repli: 0,
    talent: null,
    attaques: [
      {
        nom: "Poison de glycine",
        cout: [
          "v",
          "q"
        ],
        degats: 20,
        effet: "la cible est Brûlée ; +30 contre un personnage Ténèbres.",
        effets: [
          {
            type: "etat",
            etat: "brulure"
          },
          {
            type: "bonus",
            valeur: 30,
            si: {
              si: "cible-element",
              element: "tenebres"
            }
          }
        ]
      }
    ]
  },
  {
    id: "per-039",
    nom: "Muzan Kibutsuji",
    serie: "Demon Slayer",
    rang: "B",
    element: "tenebres",
    type: "base",
    pv: 100,
    repli: 2,
    talent: {
      nom: "Roi des démons",
      texte: "une fois par tour, défausse une carte de ta main pour soigner 30 Muzan.",
      effets: [
        {
          type: "activable",
          limite: "tour",
          cout: "defausse-carte",
          effets: [
            {
              type: "soin",
              valeur: 30,
              cible: "soi"
            }
          ]
        }
      ]
    },
    attaques: [
      {
        nom: "Tentacules",
        cout: [
          "n",
          "q",
          "q"
        ],
        degats: 60,
        effet: "et 10 à chaque personnage du banc adverse.",
        effets: [
          {
            type: "degats-banc-adverse",
            valeur: 10
          }
        ]
      }
    ]
  },
  {
    id: "per-040",
    nom: "Kyojuro Rengoku",
    serie: "Demon Slayer",
    rang: "A",
    element: "feu",
    type: "eveille",
    pv: 140,
    repli: 2,
    talent: {
      nom: "Cœur ardent",
      texte: "quand Rengoku est mis K.-O., soigne 50 chacun de tes personnages de Demon Slayer.",
      effets: [
        {
          type: "si-ko-subi",
          effets: [
            {
              type: "soin-serie",
              valeur: 50
            }
          ]
        }
      ]
    },
    attaques: [
      {
        nom: "Lever du soleil",
        cout: [
          "f",
          "q"
        ],
        degats: 40,
        effet: "",
        effets: []
      },
      {
        nom: "Neuvième forme : Purgatoire",
        cout: [
          "f",
          "f",
          "q",
          "q"
        ],
        degats: 120,
        effet: "",
        effets: []
      }
    ]
  },
  {
    id: "per-041",
    nom: "Sung Jin-Woo",
    serie: "Solo Leveling",
    rang: "S",
    element: "tenebres",
    type: "eveille",
    pv: 170,
    repli: 2,
    talent: {
      nom: "Arise",
      texte: "une fois par tour, remets sur ton banc un Base de Solo Leveling de ta défausse, avec 30 PV.",
      effets: [
        {
          type: "activable",
          limite: "tour",
          effets: [
            {
              type: "special",
              code: "arise"
            }
          ]
        }
      ]
    },
    attaques: [
      {
        nom: "Dague de Kamish",
        cout: [
          "n",
          "q"
        ],
        degats: 50,
        effet: "",
        effets: []
      },
      {
        nom: "Monarque des Ombres",
        cout: [
          "n",
          "n",
          "q",
          "q"
        ],
        degats: 100,
        effet: "+10 par personnage sur ton banc.",
        effets: [
          {
            type: "bonus-par-banc",
            valeur: 10
          }
        ]
      }
    ]
  },
  {
    id: "per-042",
    nom: "Cha Hae-In",
    serie: "Solo Leveling",
    rang: "B",
    element: "lumiere",
    type: "base",
    pv: 90,
    repli: 1,
    talent: null,
    attaques: [
      {
        nom: "Danse de l'épée",
        cout: [
          "l",
          "q"
        ],
        degats: 50,
        effet: "+30 si Jin-Woo est en jeu.",
        effets: [
          {
            type: "bonus",
            valeur: 30,
            si: {
              si: "perso-en-jeu",
              personnage: "per-041"
            }
          }
        ]
      }
    ]
  },
  {
    id: "per-043",
    nom: "Igris",
    serie: "Solo Leveling",
    rang: "B",
    element: "feu",
    type: "base",
    pv: 100,
    repli: 1,
    talent: {
      nom: "Chevalier de l'ombre",
      texte: "tant qu'Igris est sur ton banc, ton actif de Solo Leveling subit 10 dégâts de moins.",
      effets: [
        {
          type: "protection",
          valeur: 10,
          depuis: "banc",
          pour: "actif-serie"
        }
      ]
    },
    attaques: [
      {
        nom: "Épée écarlate",
        cout: [
          "f",
          "q",
          "q"
        ],
        degats: 60,
        effet: "",
        effets: []
      }
    ]
  },
  {
    id: "per-044",
    nom: "Beru",
    serie: "Solo Leveling",
    rang: "B",
    element: "vent",
    type: "base",
    pv: 100,
    repli: 1,
    talent: null,
    attaques: [
      {
        nom: "Griffes de fourmi",
        cout: [
          "v",
          "q"
        ],
        degats: 40,
        effet: "",
        effets: []
      },
      {
        nom: "Rugissement du roi",
        cout: [
          "v",
          "v",
          "q"
        ],
        degats: 80,
        effet: "pile : la cible est Étourdie.",
        effets: [
          {
            type: "etat",
            etat: "etourdi",
            si: {
              si: "piece",
              cote: "pile"
            }
          }
        ]
      }
    ]
  },
  {
    id: "per-045",
    nom: "Thomas Andre",
    serie: "Solo Leveling",
    rang: "C",
    element: "terre",
    type: "base",
    pv: 90,
    repli: 2,
    talent: null,
    attaques: [
      {
        nom: "Goliath",
        cout: [
          "q",
          "q",
          "q"
        ],
        degats: 60,
        effet: "",
        effets: []
      }
    ]
  },
  {
    id: "per-046",
    nom: "Go Gun-Hee",
    serie: "Solo Leveling",
    rang: "C",
    element: "foudre",
    type: "base",
    pv: 80,
    repli: 1,
    talent: {
      nom: "Président de l'Association",
      texte: "une fois par tour, si tu as moins de cartes en main que l'adversaire, pioche 1 carte.",
      effets: [
        {
          type: "activable",
          limite: "tour",
          si: {
            si: "moins-de-cartes-en-main"
          },
          effets: [
            {
              type: "pioche",
              valeur: 1
            }
          ]
        }
      ]
    },
    attaques: [
      {
        nom: "Coup de tonnerre",
        cout: [
          "q",
          "q"
        ],
        degats: 30,
        effet: "",
        effets: []
      }
    ]
  },
  {
    id: "per-047",
    nom: "Ashborn",
    serie: "Solo Leveling",
    rang: "C",
    element: "tenebres",
    type: "base",
    pv: 80,
    repli: 1,
    talent: null,
    attaques: [
      {
        nom: "Ombre originelle",
        cout: [
          "q",
          "q"
        ],
        degats: 30,
        effet: "récupère un Objet de ta défausse.",
        effets: [
          {
            type: "recuperer-defausse",
            quoi: "objet"
          }
        ]
      }
    ]
  },
  {
    id: "per-048",
    nom: "Bellion",
    serie: "Solo Leveling",
    rang: "C",
    element: "glace",
    type: "base",
    pv: 80,
    repli: 1,
    talent: null,
    attaques: [
      {
        nom: "Grand maréchal",
        cout: [
          "q",
          "q"
        ],
        degats: 40,
        effet: "+20 si Jin-Woo est en jeu.",
        effets: [
          {
            type: "bonus",
            valeur: 20,
            si: {
              si: "perso-en-jeu",
              personnage: "per-041"
            }
          }
        ]
      }
    ]
  },
  {
    id: "per-049",
    nom: "Frieren",
    serie: "Frieren",
    rang: "A",
    element: "glace",
    type: "eveille",
    pv: 130,
    repli: 1,
    talent: {
      nom: "Mille ans de magie",
      texte: "une fois par tour, récupère un Objet de ta défausse.",
      effets: [
        {
          type: "activable",
          limite: "tour",
          effets: [
            {
              type: "recuperer-defausse",
              quoi: "objet"
            }
          ]
        }
      ]
    },
    attaques: [
      {
        nom: "Zoltraak",
        cout: [
          "g",
          "q"
        ],
        degats: 50,
        effet: "ignore les boucliers et réductions de dégâts.",
        effets: [
          {
            type: "ignore",
            quoi: "boucliers-et-reductions"
          }
        ]
      },
      {
        nom: "Catastravia",
        cout: [
          "g",
          "g",
          "q",
          "q"
        ],
        degats: 30,
        effet: "à chaque personnage adverse.",
        effets: [
          {
            type: "zone"
          }
        ]
      }
    ]
  },
  {
    id: "per-050",
    nom: "Fern",
    serie: "Frieren",
    rang: "B",
    element: "vent",
    type: "base",
    pv: 90,
    repli: 1,
    talent: null,
    attaques: [
      {
        nom: "Zoltraak rapide",
        cout: [
          "v"
        ],
        degats: 20,
        effet: "",
        effets: []
      },
      {
        nom: "Rafale",
        cout: [
          "v",
          "v",
          "q"
        ],
        degats: "30×",
        effet: "lance 3 pièces : 30 dégâts par face.",
        effets: [
          {
            type: "pieces",
            nombre: 3,
            parFace: 30
          }
        ]
      }
    ]
  },
  {
    id: "per-051",
    nom: "Stark",
    serie: "Frieren",
    rang: "C",
    element: "terre",
    type: "base",
    pv: 90,
    repli: 2,
    talent: {
      nom: "Peureux mais solide",
      texte: "Stark subit 20 dégâts de moins.",
      effets: [
        {
          type: "reduction",
          valeur: 20
        }
      ]
    },
    attaques: [
      {
        nom: "Coup de hache éclair",
        cout: [
          "q",
          "q",
          "q"
        ],
        degats: 60,
        effet: "",
        effets: []
      }
    ]
  },
  {
    id: "per-052",
    nom: "Himmel",
    serie: "Frieren",
    rang: "B",
    element: "lumiere",
    type: "base",
    pv: 100,
    repli: 1,
    talent: {
      nom: "Le héros",
      texte: "tant qu'Himmel est en jeu, tes autres personnages de Frieren subissent 10 dégâts de moins.",
      effets: [
        {
          type: "protection",
          valeur: 10,
          depuis: "jeu",
          pour: "autres-serie"
        }
      ]
    },
    attaques: [
      {
        nom: "Épée du héros",
        cout: [
          "l",
          "q"
        ],
        degats: 50,
        effet: "",
        effets: []
      }
    ]
  },
  {
    id: "per-053",
    nom: "Übel",
    serie: "Frieren",
    rang: "C",
    element: "vent",
    type: "base",
    pv: 70,
    repli: 0,
    talent: null,
    attaques: [
      {
        nom: "Reelseiden",
        cout: [
          "q",
          "q"
        ],
        degats: 40,
        effet: "ignore les boucliers et réductions de dégâts.",
        effets: [
          {
            type: "ignore",
            quoi: "boucliers-et-reductions"
          }
        ]
      }
    ]
  },
  {
    id: "per-054",
    nom: "Serie",
    serie: "Frieren",
    rang: "C",
    element: "lumiere",
    type: "base",
    pv: 80,
    repli: 1,
    talent: {
      nom: "Grande mage",
      texte: "une fois par tour, cherche un Objet dans ton deck.",
      effets: [
        {
          type: "activable",
          limite: "tour",
          effets: [
            {
              type: "chercher",
              quoi: "objet",
              vers: "main"
            }
          ]
        }
      ]
    },
    attaques: [
      {
        nom: "Magie primordiale",
        cout: [
          "q",
          "q",
          "q"
        ],
        degats: 40,
        effet: "",
        effets: []
      }
    ]
  },
  {
    id: "per-055",
    nom: "Denken",
    serie: "Frieren",
    rang: "C",
    element: "feu",
    type: "base",
    pv: 70,
    repli: 1,
    talent: null,
    attaques: [
      {
        nom: "Waldgose",
        cout: [
          "q",
          "q"
        ],
        degats: 40,
        effet: "",
        effets: []
      },
      {
        nom: "À mains nues",
        cout: [
          "q"
        ],
        degats: 20,
        effet: "",
        effets: []
      }
    ]
  },
  {
    id: "per-056",
    nom: "Shigeo Kageyama (Mob)",
    serie: "Mob Psycho 100",
    rang: "B",
    element: "lumiere",
    type: "heros",
    pv: 120,
    repli: 1,
    talent: {
      nom: "100 %",
      texte: "si Mob a 40 PV ou moins, ses attaques font +60.",
      effets: [
        {
          type: "bonus-attaque",
          valeur: 60,
          si: {
            si: "soi-pv-max",
            valeur: 40
          }
        }
      ]
    },
    attaques: [
      {
        nom: "Télékinésie",
        cout: [
          "l",
          "q"
        ],
        degats: 40,
        effet: "",
        effets: []
      },
      {
        nom: "???%",
        cout: [
          "l",
          "l",
          "q",
          "q"
        ],
        degats: 120,
        effet: "",
        effets: []
      }
    ]
  },
  {
    id: "per-057",
    nom: "Reigen Arataka",
    serie: "Mob Psycho 100",
    rang: "B",
    element: "neutre",
    type: "base",
    pv: 100,
    repli: 1,
    talent: {
      nom: "Baratin",
      texte: "une fois par tour, regarde les 3 premières cartes de ton deck et remets-les dans l'ordre de ton choix.",
      effets: [
        {
          type: "activable",
          limite: "tour",
          effets: [
            {
              type: "regarder",
              nombre: 3,
              garder: 0,
              reste: "ordre"
            }
          ]
        }
      ]
    },
    attaques: [
      {
        nom: "Massage spécial",
        cout: [
          "q"
        ],
        degats: "",
        effet: "soigne 30 un de tes personnages.",
        effets: [
          {
            type: "soin",
            valeur: 30,
            cible: "allie"
          }
        ]
      },
      {
        nom: "Sel spécial",
        cout: [
          "q",
          "q"
        ],
        degats: 50,
        effet: "",
        effets: []
      }
    ]
  },
  {
    id: "per-058",
    nom: "Dimple",
    serie: "Mob Psycho 100",
    rang: "C",
    element: "tenebres",
    type: "base",
    pv: 60,
    repli: 0,
    talent: {
      nom: "Esprit flottant",
      texte: "Dimple n'est jamais Gelé ni Étourdi.",
      effets: [
        {
          type: "immunite",
          etats: [
            "gel",
            "etourdi"
          ]
        }
      ]
    },
    attaques: [
      {
        nom: "Possession",
        cout: [
          "q"
        ],
        degats: 20,
        effet: "",
        effets: []
      }
    ]
  },
  {
    id: "per-059",
    nom: "Teruki Hanazawa",
    serie: "Mob Psycho 100",
    rang: "C",
    element: "foudre",
    type: "base",
    pv: 80,
    repli: 1,
    talent: null,
    attaques: [
      {
        nom: "Épée psychique",
        cout: [
          "q",
          "q"
        ],
        degats: 50,
        effet: "",
        effets: []
      }
    ]
  },
  {
    id: "per-060",
    nom: "Ritsu Kageyama",
    serie: "Mob Psycho 100",
    rang: "C",
    element: "glace",
    type: "base",
    pv: 70,
    repli: 1,
    talent: null,
    attaques: [
      {
        nom: "Lame psychique",
        cout: [
          "q",
          "q"
        ],
        degats: 30,
        effet: "pile : la cible est Gelée.",
        effets: [
          {
            type: "etat",
            etat: "gel",
            si: {
              si: "piece",
              cote: "pile"
            }
          }
        ]
      }
    ]
  },
  {
    id: "per-061",
    nom: "Toichiro Suzuki",
    serie: "Mob Psycho 100",
    rang: "C",
    element: "terre",
    type: "base",
    pv: 90,
    repli: 2,
    talent: null,
    attaques: [
      {
        nom: "Psychique ultime",
        cout: [
          "q",
          "q",
          "q",
          "q"
        ],
        degats: 100,
        effet: "",
        effets: []
      }
    ]
  },
  {
    id: "per-062",
    nom: "Thorfinn",
    serie: "Vinland Saga",
    rang: "B",
    element: "vent",
    type: "heros",
    pv: 120,
    repli: 1,
    talent: {
      nom: "Je n'ai pas d'ennemis",
      texte: "si Thorfinn n'a pas attaqué à ton tour précédent, il subit 30 dégâts de moins.",
      effets: [
        {
          type: "reduction",
          valeur: 30,
          si: {
            si: "soi-pas-attaque-tour-precedent"
          }
        }
      ]
    },
    attaques: [
      {
        nom: "Double dague",
        cout: [
          "v",
          "q"
        ],
        degats: 40,
        effet: "pile : +20.",
        effets: [
          {
            type: "bonus",
            valeur: 20,
            si: {
              si: "piece",
              cote: "pile"
            }
          }
        ]
      },
      {
        nom: "Fureur de jeunesse",
        cout: [
          "v",
          "v",
          "q"
        ],
        degats: 80,
        effet: "",
        effets: []
      }
    ]
  },
  {
    id: "per-063",
    nom: "Askeladd",
    serie: "Vinland Saga",
    rang: "B",
    element: "neutre",
    type: "base",
    pv: 100,
    repli: 1,
    talent: {
      nom: "Chef mercenaire",
      texte: "quand tu poses un Base de Vinland Saga, pioche 1 carte.",
      effets: [
        {
          type: "pose-base-serie",
          pioche: 1
        }
      ]
    },
    attaques: [
      {
        nom: "Ruse du chef",
        cout: [
          "q",
          "q"
        ],
        degats: 50,
        effet: "",
        effets: []
      }
    ]
  },
  {
    id: "per-064",
    nom: "Canute",
    serie: "Vinland Saga",
    rang: "C",
    element: "glace",
    type: "base",
    pv: 70,
    repli: 1,
    talent: {
      nom: "Roi",
      texte: "tes autres personnages de Vinland Saga font +10 avec leurs attaques.",
      effets: [
        {
          type: "bonus-serie",
          valeur: 10
        }
      ]
    },
    attaques: [
      {
        nom: "Ordre royal",
        cout: [
          "q"
        ],
        degats: 10,
        effet: "",
        effets: []
      }
    ]
  },
  {
    id: "per-065",
    nom: "Thorkell",
    serie: "Vinland Saga",
    rang: "C",
    element: "terre",
    type: "base",
    pv: 100,
    repli: 2,
    talent: null,
    attaques: [
      {
        nom: "Force brute",
        cout: [
          "q",
          "q",
          "q"
        ],
        degats: 60,
        effet: "+30 si Thorkell a déjà subi des dégâts.",
        effets: [
          {
            type: "bonus",
            valeur: 30,
            si: {
              si: "soi-blesse"
            }
          }
        ]
      }
    ]
  },
  {
    id: "per-066",
    nom: "Einar",
    serie: "Vinland Saga",
    rang: "C",
    element: "neutre",
    type: "base",
    pv: 80,
    repli: 1,
    talent: null,
    attaques: [
      {
        nom: "Poing de fermier",
        cout: [
          "q",
          "q"
        ],
        degats: 40,
        effet: "",
        effets: []
      }
    ]
  },
  {
    id: "per-067",
    nom: "Thors",
    serie: "Vinland Saga",
    rang: "C",
    element: "eau",
    type: "base",
    pv: 90,
    repli: 1,
    talent: null,
    attaques: [
      {
        nom: "Le vrai guerrier",
        cout: [
          "q",
          "q"
        ],
        degats: 40,
        effet: "pile : la cible ne peut pas attaquer au prochain tour.",
        effets: [
          {
            type: "bloque-attaque-cible",
            si: {
              si: "piece",
              cote: "pile"
            }
          }
        ]
      }
    ]
  },
  {
    id: "per-068",
    nom: "Twenty-Fifth Bam",
    serie: "Tower of God",
    rang: "B",
    element: "eau",
    type: "heros",
    pv: 140,
    repli: 1,
    talent: {
      nom: "Irrégulier",
      texte: "si tu as moins de points que l'adversaire, ses attaques coûtent 1 énergie ◇ de moins.",
      effets: [
        {
          type: "cout-reduit",
          valeur: 1,
          si: {
            si: "moins-de-points"
          }
        }
      ]
    },
    attaques: [
      {
        nom: "Shinsu noir",
        cout: [
          "e",
          "q"
        ],
        degats: 60,
        effet: "",
        effets: []
      },
      {
        nom: "Lance de Thorn",
        cout: [
          "e",
          "e",
          "q",
          "q"
        ],
        degats: 110,
        effet: "",
        effets: []
      }
    ]
  },
  {
    id: "per-069",
    nom: "Khun Aguero Agnis",
    serie: "Tower of God",
    rang: "C",
    element: "glace",
    type: "base",
    pv: 70,
    repli: 1,
    talent: {
      nom: "Stratège de la Tour",
      texte: "une fois par tour, pioche 1 carte, puis remets 1 carte de ta main sous ton deck.",
      effets: [
        {
          type: "activable",
          limite: "tour",
          effets: [
            {
              type: "pioche-puis-sous-deck"
            }
          ]
        }
      ]
    },
    attaques: [
      {
        nom: "Lance de glace",
        cout: [
          "q"
        ],
        degats: 30,
        effet: "",
        effets: []
      }
    ]
  },
  {
    id: "per-070",
    nom: "Rak Wraithraiser",
    serie: "Tower of God",
    rang: "C",
    element: "foudre",
    type: "base",
    pv: 90,
    repli: 1,
    talent: null,
    attaques: [
      {
        nom: "Lance du chasseur",
        cout: [
          "q",
          "q"
        ],
        degats: 50,
        effet: "Rak subit 10 dégâts.",
        effets: [
          {
            type: "degats-soi",
            valeur: 10
          }
        ]
      }
    ]
  },
  {
    id: "per-071",
    nom: "Rachel",
    serie: "Tower of God",
    rang: "C",
    element: "neutre",
    type: "base",
    pv: 60,
    repli: 0,
    talent: {
      nom: "Trahison",
      texte: "tant que Rachel est sur ton banc, l'actif adverse subit 10 dégâts de plus.",
      effets: [
        {
          type: "vulnerabilite-adverse",
          valeur: 10
        }
      ]
    },
    attaques: [
      {
        nom: "Coup bas",
        cout: [
          "q"
        ],
        degats: 10,
        effet: "",
        effets: []
      }
    ]
  },
  {
    id: "per-072",
    nom: "Endorsi Jahad",
    serie: "Tower of God",
    rang: "C",
    element: "eau",
    type: "base",
    pv: 70,
    repli: 0,
    talent: null,
    attaques: [
      {
        nom: "Coup de la princesse",
        cout: [
          "q",
          "q"
        ],
        degats: 50,
        effet: "",
        effets: []
      }
    ]
  },
  {
    id: "per-073",
    nom: "Urek Mazino",
    serie: "Tower of God",
    rang: "C",
    element: "lumiere",
    type: "base",
    pv: 90,
    repli: 1,
    talent: null,
    attaques: [
      {
        nom: "Shinsu du Rang",
        cout: [
          "q",
          "q",
          "q"
        ],
        degats: 70,
        effet: "",
        effets: []
      }
    ]
  },
  {
    id: "per-074",
    nom: "Yuri Jahad",
    serie: "Tower of God",
    rang: "C",
    element: "feu",
    type: "base",
    pv: 80,
    repli: 1,
    talent: null,
    attaques: [
      {
        nom: "Black March",
        cout: [
          "q",
          "q"
        ],
        degats: 40,
        effet: "la cible est Brûlée.",
        effets: [
          {
            type: "etat",
            etat: "brulure"
          }
        ]
      }
    ]
  },
  {
    id: "per-075",
    nom: "Kim Dokja",
    serie: "Omniscient Reader's Viewpoint",
    rang: "B",
    element: "neutre",
    type: "heros",
    pv: 120,
    repli: 1,
    talent: {
      nom: "Lecteur omniscient",
      texte: "une fois par tour, regarde les 2 premières cartes du deck adverse.",
      effets: [
        {
          type: "activable",
          limite: "tour",
          effets: [
            {
              type: "voir-deck-adverse",
              nombre: 2
            }
          ]
        }
      ]
    },
    attaques: [
      {
        nom: "Épée inbrisable",
        cout: [
          "q",
          "q"
        ],
        degats: 50,
        effet: "",
        effets: []
      },
      {
        nom: "Le Démon-Roi du Salut",
        cout: [
          "q",
          "q",
          "q",
          "q"
        ],
        degats: 110,
        effet: "",
        effets: []
      }
    ]
  },
  {
    id: "per-076",
    nom: "Yoo Joonghyuk",
    serie: "Omniscient Reader's Viewpoint",
    rang: "C",
    element: "feu",
    type: "base",
    pv: 90,
    repli: 1,
    talent: {
      nom: "Régression",
      texte: "une fois par partie, quand il est mis K.-O., il retourne dans ton deck au lieu de la défausse.",
      effets: [
        {
          type: "retour-deck"
        }
      ]
    },
    attaques: [
      {
        nom: "Épée du Roi démon",
        cout: [
          "q",
          "q",
          "q"
        ],
        degats: 70,
        effet: "",
        effets: []
      }
    ]
  },
  {
    id: "per-077",
    nom: "Han Sooyoung",
    serie: "Omniscient Reader's Viewpoint",
    rang: "C",
    element: "vent",
    type: "base",
    pv: 70,
    repli: 0,
    talent: null,
    attaques: [
      {
        nom: "Réécriture",
        cout: [
          "q"
        ],
        degats: "",
        effet: "pioche 2 cartes.",
        effets: [
          {
            type: "pioche",
            valeur: 2
          }
        ]
      }
    ]
  },
  {
    id: "per-078",
    nom: "Jung Heewon",
    serie: "Omniscient Reader's Viewpoint",
    rang: "C",
    element: "lumiere",
    type: "base",
    pv: 80,
    repli: 1,
    talent: null,
    attaques: [
      {
        nom: "Jugement",
        cout: [
          "q",
          "q"
        ],
        degats: 50,
        effet: "+30 contre un personnage Ténèbres.",
        effets: [
          {
            type: "bonus",
            valeur: 30,
            si: {
              si: "cible-element",
              element: "tenebres"
            }
          }
        ]
      }
    ]
  },
  {
    id: "per-079",
    nom: "Lee Hyunsung",
    serie: "Omniscient Reader's Viewpoint",
    rang: "C",
    element: "terre",
    type: "base",
    pv: 100,
    repli: 2,
    talent: {
      nom: "Bouclier d'acier",
      texte: "tes autres personnages d'Omniscient Reader's Viewpoint subissent 10 dégâts de moins.",
      effets: [
        {
          type: "protection",
          valeur: 10,
          depuis: "jeu",
          pour: "autres-serie"
        }
      ]
    },
    attaques: [
      {
        nom: "Coup d'épaule",
        cout: [
          "q",
          "q"
        ],
        degats: 30,
        effet: "",
        effets: []
      }
    ]
  },
  {
    id: "per-080",
    nom: "Shin Yoosung",
    serie: "Omniscient Reader's Viewpoint",
    rang: "C",
    element: "eau",
    type: "base",
    pv: 70,
    repli: 1,
    talent: null,
    attaques: [
      {
        nom: "Dresseuse",
        cout: [
          "q",
          "q"
        ],
        degats: 30,
        effet: "pile : la cible est Étourdie.",
        effets: [
          {
            type: "etat",
            etat: "etourdi",
            si: {
              si: "piece",
              cote: "pile"
            }
          }
        ]
      }
    ]
  },
  {
    id: "per-081",
    nom: "Secretive Plotter",
    serie: "Omniscient Reader's Viewpoint",
    rang: "C",
    element: "tenebres",
    type: "base",
    pv: 80,
    repli: 1,
    talent: null,
    attaques: [
      {
        nom: "Complot",
        cout: [
          "q",
          "q"
        ],
        degats: 40,
        effet: "l'adversaire défausse une carte au hasard de sa main.",
        effets: [
          {
            type: "defausse-main-adverse-hasard",
            nombre: 1
          }
        ]
      }
    ]
  },
  {
    id: "per-082",
    nom: "Taro Sakamoto",
    serie: "Sakamoto Days",
    rang: "B",
    element: "neutre",
    type: "heros",
    pv: 130,
    repli: 2,
    talent: {
      nom: "Ancien tueur",
      texte: "une fois par tour, cherche un Objet dans ton deck et ajoute-le à ta main.",
      effets: [
        {
          type: "activable",
          limite: "tour",
          effets: [
            {
              type: "chercher",
              quoi: "objet",
              vers: "main"
            }
          ]
        }
      ]
    },
    attaques: [
      {
        nom: "Arme du quotidien",
        cout: [
          "q",
          "q"
        ],
        degats: 60,
        effet: "+20 si tu as joué un Objet ce tour.",
        effets: [
          {
            type: "bonus",
            valeur: 20,
            si: {
              si: "objet-joue-ce-tour"
            }
          }
        ]
      },
      {
        nom: "Sakamoto en forme",
        cout: [
          "q",
          "q",
          "q",
          "q"
        ],
        degats: 110,
        effet: "",
        effets: []
      }
    ]
  },
  {
    id: "per-083",
    nom: "Shin Asakura",
    serie: "Sakamoto Days",
    rang: "C",
    element: "foudre",
    type: "base",
    pv: 70,
    repli: 0,
    talent: {
      nom: "Télépathie",
      texte: "une fois par tour, regarde la main de l'adversaire.",
      effets: [
        {
          type: "activable",
          limite: "tour",
          effets: [
            {
              type: "voir-main-adverse"
            }
          ]
        }
      ]
    },
    attaques: [
      {
        nom: "Coup de pied",
        cout: [
          "q"
        ],
        degats: 20,
        effet: "",
        effets: []
      }
    ]
  },
  {
    id: "per-084",
    nom: "Lu Shaotang",
    serie: "Sakamoto Days",
    rang: "C",
    element: "feu",
    type: "base",
    pv: 70,
    repli: 1,
    talent: null,
    attaques: [
      {
        nom: "Kung-fu",
        cout: [
          "q",
          "q"
        ],
        degats: 50,
        effet: "",
        effets: []
      }
    ]
  },
  {
    id: "per-085",
    nom: "Nagumo",
    serie: "Sakamoto Days",
    rang: "C",
    element: "tenebres",
    type: "base",
    pv: 80,
    repli: 1,
    talent: null,
    attaques: [
      {
        nom: "Couteau multifonction",
        cout: [
          "q",
          "q"
        ],
        degats: 40,
        effet: "à n'importe quel personnage adverse.",
        effets: [
          {
            type: "cible",
            quoi: "n-importe"
          }
        ]
      }
    ]
  },
  {
    id: "per-086",
    nom: "Osaragi",
    serie: "Sakamoto Days",
    rang: "C",
    element: "glace",
    type: "base",
    pv: 80,
    repli: 1,
    talent: null,
    attaques: [
      {
        nom: "Scie géante",
        cout: [
          "q",
          "q",
          "q"
        ],
        degats: 60,
        effet: "",
        effets: []
      }
    ]
  },
  {
    id: "per-087",
    nom: "Gaku",
    serie: "Sakamoto Days",
    rang: "C",
    element: "foudre",
    type: "base",
    pv: 80,
    repli: 1,
    talent: null,
    attaques: [
      {
        nom: "Bâton télescopique",
        cout: [
          "q",
          "q"
        ],
        degats: 40,
        effet: "+20 contre un Base.",
        effets: [
          {
            type: "bonus",
            valeur: 20,
            si: {
              si: "cible-type",
              type: "base"
            }
          }
        ]
      }
    ]
  },
  {
    id: "per-088",
    nom: "Caiman",
    serie: "Dorohedoro",
    rang: "B",
    element: "terre",
    type: "heros",
    pv: 130,
    repli: 2,
    talent: {
      nom: "Mâchoire",
      texte: "quand une attaque de Caiman met un personnage K.-O., pioche 2 cartes.",
      effets: [
        {
          type: "si-ko-inflige",
          effets: [
            {
              type: "pioche",
              valeur: 2
            }
          ]
        }
      ]
    },
    attaques: [
      {
        nom: "Baïonnette",
        cout: [
          "t",
          "q"
        ],
        degats: 50,
        effet: "",
        effets: []
      },
      {
        nom: "Mâchoire du Lézard",
        cout: [
          "t",
          "t",
          "q",
          "q"
        ],
        degats: 110,
        effet: "",
        effets: []
      }
    ]
  },
  {
    id: "per-089",
    nom: "Nikaido",
    serie: "Dorohedoro",
    rang: "C",
    element: "lumiere",
    type: "base",
    pv: 70,
    repli: 1,
    talent: {
      nom: "Magie du temps",
      texte: "une fois par partie, soigne un de tes personnages de tous les dégâts subis au dernier tour adverse.",
      effets: [
        {
          type: "activable",
          limite: "partie",
          effets: [
            {
              type: "soin-degats-dernier-tour-adverse"
            }
          ]
        }
      ]
    },
    attaques: [
      {
        nom: "Coup du dragon",
        cout: [
          "q",
          "q"
        ],
        degats: 30,
        effet: "",
        effets: []
      }
    ]
  },
  {
    id: "per-090",
    nom: "En",
    serie: "Dorohedoro",
    rang: "C",
    element: "tenebres",
    type: "base",
    pv: 90,
    repli: 1,
    talent: null,
    attaques: [
      {
        nom: "Magie des champignons",
        cout: [
          "q",
          "q",
          "q"
        ],
        degats: 60,
        effet: "la cible est Maudite.",
        effets: [
          {
            type: "etat",
            etat: "malediction"
          }
        ]
      }
    ]
  },
  {
    id: "per-091",
    nom: "Shin",
    serie: "Dorohedoro",
    rang: "C",
    element: "feu",
    type: "base",
    pv: 80,
    repli: 1,
    talent: null,
    attaques: [
      {
        nom: "Démembrement",
        cout: [
          "q",
          "q"
        ],
        degats: 50,
        effet: "",
        effets: []
      }
    ]
  },
  {
    id: "per-092",
    nom: "Noi",
    serie: "Dorohedoro",
    rang: "C",
    element: "glace",
    type: "base",
    pv: 100,
    repli: 2,
    talent: {
      nom: "Magie de soin",
      texte: "une fois par tour, soigne 30 un de tes personnages de Dorohedoro.",
      effets: [
        {
          type: "activable",
          limite: "tour",
          effets: [
            {
              type: "soin",
              valeur: 30,
              cible: "allie",
              serie: "Dorohedoro"
            }
          ]
        }
      ]
    },
    attaques: [
      {
        nom: "Poing de Noi",
        cout: [
          "q",
          "q",
          "q"
        ],
        degats: 50,
        effet: "",
        effets: []
      }
    ]
  },
  {
    id: "per-093",
    nom: "Ebisu",
    serie: "Dorohedoro",
    rang: "C",
    element: "neutre",
    type: "base",
    pv: 60,
    repli: 0,
    talent: null,
    attaques: [
      {
        nom: "Chaos",
        cout: [
          "q"
        ],
        degats: "50 / 0",
        effet: "lance une pièce : face 50, pile rien.",
        effets: [
          {
            type: "pile-ou-face",
            face: 50,
            pile: 0
          }
        ]
      }
    ]
  },
  {
    id: "per-094",
    nom: "Yu",
    serie: "The Boxer",
    rang: "C",
    element: "glace",
    type: "heros",
    pv: 120,
    repli: 1,
    talent: null,
    attaques: [
      {
        nom: "Contre parfait",
        cout: [
          "q",
          "q"
        ],
        degats: 40,
        effet: "+30 si Yu a subi des dégâts au dernier tour adverse.",
        effets: [
          {
            type: "bonus",
            valeur: 30,
            si: {
              si: "soi-blesse-dernier-tour-adverse"
            }
          }
        ]
      },
      {
        nom: "Combinaison du Monstre",
        cout: [
          "q",
          "q",
          "q"
        ],
        degats: 90,
        effet: "",
        effets: []
      }
    ]
  },
  {
    id: "per-095",
    nom: "K",
    serie: "The Boxer",
    rang: "C",
    element: "neutre",
    type: "base",
    pv: 80,
    repli: 1,
    talent: {
      nom: "Entraîneur",
      texte: "tes autres personnages de The Boxer font +20 avec leurs attaques.",
      effets: [
        {
          type: "bonus-serie",
          valeur: 20
        }
      ]
    },
    attaques: [
      {
        nom: "Leçon",
        cout: [
          "q"
        ],
        degats: 30,
        effet: "",
        effets: []
      }
    ]
  },
  {
    id: "per-096",
    nom: "Aaron Tide",
    serie: "The Boxer",
    rang: "C",
    element: "foudre",
    type: "base",
    pv: 80,
    repli: 1,
    talent: null,
    attaques: [
      {
        nom: "Jab éclair",
        cout: [
          "q",
          "q"
        ],
        degats: 50,
        effet: "",
        effets: []
      }
    ]
  },
  {
    id: "per-097",
    nom: "J",
    serie: "The Boxer",
    rang: "C",
    element: "feu",
    type: "base",
    pv: 90,
    repli: 1,
    talent: null,
    attaques: [
      {
        nom: "Uppercut brutal",
        cout: [
          "q",
          "q",
          "q"
        ],
        degats: 70,
        effet: "",
        effets: []
      }
    ]
  },
  {
    id: "per-098",
    nom: "Jean-Pierre Manuel",
    serie: "The Boxer",
    rang: "C",
    element: "terre",
    type: "base",
    pv: 90,
    repli: 2,
    talent: null,
    attaques: [
      {
        nom: "Garde de fer",
        cout: [
          "q",
          "q"
        ],
        degats: 40,
        effet: "il subit 20 dégâts de moins jusqu'à ton prochain tour.",
        effets: [
          {
            type: "bouclier-soi",
            valeur: 20
          }
        ]
      }
    ]
  },
  {
    id: "per-099",
    nom: "Ryu Baeksan",
    serie: "The Boxer",
    rang: "C",
    element: "eau",
    type: "base",
    pv: 80,
    repli: 1,
    talent: null,
    attaques: [
      {
        nom: "Crochet",
        cout: [
          "q",
          "q"
        ],
        degats: 50,
        effet: "",
        effets: []
      }
    ]
  },
  {
    id: "per-100",
    nom: "Viktor Grigoryevich",
    serie: "The Boxer",
    rang: "C",
    element: "eau",
    type: "base",
    pv: 90,
    repli: 1,
    talent: null,
    attaques: [
      {
        nom: "Coup de massue",
        cout: [
          "q",
          "q",
          "q"
        ],
        degats: 70,
        effet: "pile : la cible est Étourdie.",
        effets: [
          {
            type: "etat",
            etat: "etourdi",
            si: {
              si: "piece",
              cote: "pile"
            }
          }
        ]
      }
    ]
  }
];
const cartes$2 = [
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
    images: {
      illustration: {
        zoom: 102,
        x: 50,
        y: 50
      }
    }
  },
  {
    id: "lan-006",
    numero: 6,
    personnage: "per-006",
    finition: "holo-integrale",
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
    id: "lan-007",
    numero: 7,
    personnage: "per-007",
    finition: "holo-integrale",
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
    id: "lan-008",
    numero: 8,
    personnage: "per-008",
    finition: "holo",
    secrete: false,
    images: {
      illustration: {
        zoom: 102,
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
        zoom: 102,
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
        zoom: 102,
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
        zoom: 102,
        x: 50,
        y: 11
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
        zoom: 102,
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
        zoom: 102,
        x: 50,
        y: 1
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
        zoom: 102,
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
        zoom: 102,
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
        zoom: 102,
        x: 50,
        y: 13
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
        zoom: 102,
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
        zoom: 102,
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
        zoom: 102,
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
        zoom: 102,
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
        zoom: 102,
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
        zoom: 102,
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
        zoom: 102,
        x: 50,
        y: 2
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
        zoom: 102,
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
        zoom: 102,
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
        zoom: 102,
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
        zoom: 102,
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
        zoom: 102,
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
        zoom: 102,
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
        zoom: 102,
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
        zoom: 102,
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
        zoom: 102,
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
        zoom: 102,
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
        zoom: 102,
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
        zoom: 102,
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
        zoom: 102,
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
        zoom: 102,
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
        zoom: 102,
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
        zoom: 102,
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
        zoom: 102,
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
        zoom: 102,
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
        zoom: 102,
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
        zoom: 102,
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
        zoom: 102,
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
        zoom: 102,
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
    images: {
      illustration: {
        zoom: 102,
        x: 50,
        y: 50
      }
    }
  },
  {
    id: "lan-105",
    numero: 105,
    personnage: "per-014",
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
    id: "lan-106",
    numero: 106,
    personnage: "per-017",
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
    id: "lan-107",
    numero: 107,
    personnage: "per-021",
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
    id: "lan-108",
    numero: 108,
    personnage: "per-022",
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
    id: "lan-109",
    numero: 109,
    personnage: "per-026",
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
    images: {
      illustration: {
        zoom: 102,
        x: 50,
        y: 50
      }
    }
  },
  {
    id: "lan-112",
    numero: 112,
    personnage: "per-038",
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
    images: {
      illustration: {
        zoom: 102,
        x: 50,
        y: 50
      }
    }
  },
  {
    id: "lan-127",
    numero: 127,
    personnage: "per-007",
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
    id: "lan-128",
    numero: 128,
    personnage: "per-011",
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
    id: "lan-129",
    numero: 129,
    personnage: "per-018",
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
    id: "lan-130",
    numero: 130,
    personnage: "per-025",
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
    id: "lan-131",
    numero: 131,
    personnage: "per-027",
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
    id: "lan-132",
    numero: 132,
    personnage: "per-040",
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
    id: "lan-133",
    numero: 133,
    personnage: "per-041",
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
    id: "lan-134",
    numero: 134,
    personnage: "per-049",
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
    images: {
      illustration: {
        zoom: 102,
        x: 50,
        y: 50
      }
    }
  },
  {
    id: "lan-139",
    numero: 139,
    personnage: "per-007",
    finition: "couronne",
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
    id: "lan-140",
    numero: 140,
    personnage: "per-027",
    finition: "couronne",
    secrete: true,
    images: {
      illustration: {
        zoom: 102,
        x: 50,
        y: 50
      }
    }
  }
];
const __vite_glob_0_1 = {
  id: id$2,
  nom: nom$2,
  edition: edition$2,
  total: total$2,
  totalAvecSecretes: totalAvecSecretes$2,
  _note: _note$2,
  personnages: personnages$2,
  cartes: cartes$2
};
const id$1 = "renforts";
const nom$1 = "Renforts";
const edition$1 = 2;
const total$1 = 24;
const totalAvecSecretes$1 = 32;
const _note$1 = "Mini-extension, environ un mois après le lancement, avec son propre booster. Même modèle que Lancement.";
const personnages$1 = [
  {
    id: "ren-per-001",
    nom: "Killua Zoldyck",
    serie: "Hunter x Hunter",
    rang: "S",
    element: "foudre",
    type: "eveille",
    pv: 160,
    repli: 1,
    talent: {
      nom: "Vitesse divine",
      texte: "une fois par tour, Killua peut se replier sans payer le Repli.",
      effets: [
        {
          type: "repli-gratuit",
          limite: "tour"
        }
      ]
    },
    attaques: [
      {
        nom: "Éclair narcotique",
        cout: [
          "z",
          "q"
        ],
        degats: 40,
        effet: "la cible est Étourdie.",
        effets: [
          {
            type: "etat",
            etat: "etourdi"
          }
        ]
      },
      {
        nom: "Narukami",
        cout: [
          "z",
          "z",
          "q",
          "q"
        ],
        degats: 140,
        effet: "",
        effets: []
      }
    ]
  },
  {
    id: "ren-per-002",
    nom: "Gon Freecss",
    serie: "Hunter x Hunter",
    rang: "A",
    element: "terre",
    type: "eveille",
    pv: 140,
    repli: 1,
    talent: null,
    attaques: [
      {
        nom: "Jajanken : Pierre",
        cout: [
          "t",
          "q",
          "q"
        ],
        degats: 80,
        effet: "",
        effets: []
      },
      {
        nom: "Gon adulte",
        cout: [
          "t",
          "t",
          "t",
          "q"
        ],
        degats: 180,
        effet: "Gon subit 80 dégâts.",
        effets: [
          {
            type: "degats-soi",
            valeur: 80
          }
        ]
      }
    ]
  },
  {
    id: "ren-per-003",
    nom: "Momo Ayase",
    serie: "Dandadan",
    rang: "A",
    element: "lumiere",
    type: "eveille",
    pv: 130,
    repli: 1,
    talent: {
      nom: "Psychokinésie",
      texte: "une fois par tour, échange l'actif adverse avec un personnage de son banc.",
      effets: [
        {
          type: "activable",
          limite: "tour",
          effets: [
            {
              type: "echanger-actif-adverse"
            }
          ]
        }
      ]
    },
    attaques: [
      {
        nom: "Mains d'aura",
        cout: [
          "l",
          "q"
        ],
        degats: 50,
        effet: "",
        effets: []
      },
      {
        nom: "Prise psychique",
        cout: [
          "l",
          "l",
          "q"
        ],
        degats: 90,
        effet: "la cible ne peut pas se replier au prochain tour.",
        effets: [
          {
            type: "bloque-repli-cible"
          }
        ]
      }
    ]
  },
  {
    id: "ren-per-004",
    nom: "Kafka Hibino",
    serie: "Kaiju No. 8",
    rang: "A",
    element: "feu",
    type: "eveille",
    pv: 150,
    repli: 2,
    talent: null,
    attaques: [
      {
        nom: "Poing du Kaiju",
        cout: [
          "f",
          "q"
        ],
        degats: 50,
        effet: "",
        effets: []
      },
      {
        nom: "Pleine puissance",
        cout: [
          "f",
          "f",
          "q",
          "q"
        ],
        degats: 120,
        effet: "Kafka subit 30 dégâts.",
        effets: [
          {
            type: "degats-soi",
            valeur: 30
          }
        ]
      }
    ]
  },
  {
    id: "ren-per-005",
    nom: "Anya Forger",
    serie: "Spy x Family",
    rang: "A",
    element: "neutre",
    type: "eveille",
    pv: 130,
    repli: 1,
    talent: {
      nom: "Télépathie",
      texte: "une fois par tour, regarde la main de l'adversaire et choisis une carte : il la remet sous son deck.",
      effets: [
        {
          type: "activable",
          limite: "tour",
          effets: [
            {
              type: "main-adverse-sous-deck"
            }
          ]
        }
      ]
    },
    attaques: [
      {
        nom: "Regard de héros",
        cout: [
          "q",
          "q"
        ],
        degats: 50,
        effet: "",
        effets: []
      },
      {
        nom: "Mission Strix",
        cout: [
          "q",
          "q",
          "q"
        ],
        degats: 90,
        effet: "",
        effets: []
      }
    ]
  },
  {
    id: "ren-per-006",
    nom: "Hisoka Morow",
    serie: "Hunter x Hunter",
    rang: "B",
    element: "tenebres",
    type: "base",
    pv: 90,
    repli: 1,
    talent: {
      nom: "Bungee Gum",
      texte: "quand Hisoka attaque, l'actif adverse ne peut pas se replier au prochain tour.",
      effets: [
        {
          type: "attaque-bloque-repli"
        }
      ]
    },
    attaques: [
      {
        nom: "Texture surprise",
        cout: [
          "n",
          "q"
        ],
        degats: 40,
        effet: "",
        effets: []
      }
    ]
  },
  {
    id: "ren-per-007",
    nom: "Kurapika",
    serie: "Hunter x Hunter",
    rang: "B",
    element: "feu",
    type: "base",
    pv: 90,
    repli: 1,
    talent: {
      nom: "Chaîne du Jugement",
      texte: "ses attaques font +40 contre un Éveillé.",
      effets: [
        {
          type: "bonus-attaque",
          valeur: 40,
          si: {
            si: "cible-type",
            type: "eveille"
          }
        }
      ]
    },
    attaques: [
      {
        nom: "Chaîne de la Pénitence",
        cout: [
          "f",
          "q"
        ],
        degats: 40,
        effet: "",
        effets: []
      }
    ]
  },
  {
    id: "ren-per-008",
    nom: "Ken Takakura (Okarun)",
    serie: "Dandadan",
    rang: "B",
    element: "vent",
    type: "base",
    pv: 90,
    repli: 0,
    talent: {
      nom: "Mode Turbo",
      texte: "la première attaque qu'il subit à chaque tour adverse échoue sur un pile.",
      effets: [
        {
          type: "esquive-premiere",
          cote: "pile"
        }
      ]
    },
    attaques: [
      {
        nom: "Coup turbo",
        cout: [
          "v",
          "q"
        ],
        degats: 50,
        effet: "",
        effets: []
      }
    ]
  },
  {
    id: "ren-per-009",
    nom: "Loid Forger",
    serie: "Spy x Family",
    rang: "B",
    element: "glace",
    type: "base",
    pv: 100,
    repli: 1,
    talent: {
      nom: "Opération Strix",
      texte: "une fois par tour, cherche un Soutien dans ton deck.",
      effets: [
        {
          type: "activable",
          limite: "tour",
          effets: [
            {
              type: "chercher",
              quoi: "soutien",
              vers: "main"
            }
          ]
        }
      ]
    },
    attaques: [
      {
        nom: "Agent Twilight",
        cout: [
          "g",
          "q"
        ],
        degats: 50,
        effet: "",
        effets: []
      }
    ]
  },
  {
    id: "ren-per-010",
    nom: "Yor Forger",
    serie: "Spy x Family",
    rang: "B",
    element: "vent",
    type: "base",
    pv: 90,
    repli: 0,
    talent: null,
    attaques: [
      {
        nom: "Princesse Épine",
        cout: [
          "v",
          "q"
        ],
        degats: 60,
        effet: "Yor subit 10 dégâts.",
        effets: [
          {
            type: "degats-soi",
            valeur: 10
          }
        ]
      }
    ]
  },
  {
    id: "ren-per-011",
    nom: "Yoichi Isagi",
    serie: "Blue Lock",
    rang: "B",
    element: "eau",
    type: "heros",
    pv: 120,
    repli: 1,
    talent: {
      nom: "Méta-vision",
      texte: "une fois par tour, regarde les 2 premières cartes de ton deck et choisis leur ordre.",
      effets: [
        {
          type: "activable",
          limite: "tour",
          effets: [
            {
              type: "regarder",
              nombre: 2,
              garder: 0,
              reste: "ordre"
            }
          ]
        }
      ]
    },
    attaques: [
      {
        nom: "Tir direct",
        cout: [
          "e",
          "q"
        ],
        degats: 50,
        effet: "+20 si un autre personnage de Blue Lock est en jeu.",
        effets: [
          {
            type: "bonus",
            valeur: 20,
            si: {
              si: "autre-serie-en-jeu"
            }
          }
        ]
      },
      {
        nom: "But décisif",
        cout: [
          "e",
          "e",
          "q",
          "q"
        ],
        degats: 110,
        effet: "",
        effets: []
      }
    ]
  },
  {
    id: "ren-per-012",
    nom: "Mina Ashiro",
    serie: "Kaiju No. 8",
    rang: "B",
    element: "foudre",
    type: "base",
    pv: 100,
    repli: 2,
    talent: null,
    attaques: [
      {
        nom: "Canon d'artillerie",
        cout: [
          "z",
          "z",
          "q"
        ],
        degats: 90,
        effet: "",
        effets: []
      }
    ]
  },
  {
    id: "ren-per-013",
    nom: "Leorio Paradinight",
    serie: "Hunter x Hunter",
    rang: "C",
    element: "neutre",
    type: "base",
    pv: 90,
    repli: 1,
    talent: null,
    attaques: [
      {
        nom: "Poing à distance",
        cout: [
          "q",
          "q"
        ],
        degats: 30,
        effet: "à un personnage du banc adverse.",
        effets: [
          {
            type: "cible",
            quoi: "banc-adverse"
          }
        ]
      }
    ]
  },
  {
    id: "ren-per-014",
    nom: "Turbo Granny",
    serie: "Dandadan",
    rang: "C",
    element: "tenebres",
    type: "base",
    pv: 70,
    repli: 0,
    talent: null,
    attaques: [
      {
        nom: "Malédiction de la vitesse",
        cout: [
          "q"
        ],
        degats: 20,
        effet: "la cible est Maudite.",
        effets: [
          {
            type: "etat",
            etat: "malediction"
          }
        ]
      }
    ]
  },
  {
    id: "ren-per-015",
    nom: "Seiko Ayase",
    serie: "Dandadan",
    rang: "C",
    element: "lumiere",
    type: "base",
    pv: 80,
    repli: 1,
    talent: {
      nom: "Médium",
      texte: "une fois par tour, retire un état d'un de tes personnages.",
      effets: [
        {
          type: "activable",
          limite: "tour",
          effets: [
            {
              type: "retirer-etats",
              nombre: "un"
            }
          ]
        }
      ]
    },
    attaques: [
      {
        nom: "Exorcisme",
        cout: [
          "q",
          "q"
        ],
        degats: 30,
        effet: "",
        effets: []
      }
    ]
  },
  {
    id: "ren-per-016",
    nom: "Aira Shiratori",
    serie: "Dandadan",
    rang: "C",
    element: "lumiere",
    type: "base",
    pv: 70,
    repli: 1,
    talent: null,
    attaques: [
      {
        nom: "Acrobatie",
        cout: [
          "q",
          "q"
        ],
        degats: 30,
        effet: "pile : +30.",
        effets: [
          {
            type: "bonus",
            valeur: 30,
            si: {
              si: "piece",
              cote: "pile"
            }
          }
        ]
      }
    ]
  },
  {
    id: "ren-per-017",
    nom: "Jin Enjoji (Jiji)",
    serie: "Dandadan",
    rang: "C",
    element: "terre",
    type: "base",
    pv: 100,
    repli: 2,
    talent: null,
    attaques: [
      {
        nom: "Œil maléfique",
        cout: [
          "q",
          "q",
          "q"
        ],
        degats: 60,
        effet: "Jiji subit 10 dégâts.",
        effets: [
          {
            type: "degats-soi",
            valeur: 10
          }
        ]
      }
    ]
  },
  {
    id: "ren-per-018",
    nom: "Reno Ichikawa",
    serie: "Kaiju No. 8",
    rang: "C",
    element: "glace",
    type: "base",
    pv: 70,
    repli: 1,
    talent: null,
    attaques: [
      {
        nom: "Arme du Kaiju n°6",
        cout: [
          "q",
          "q"
        ],
        degats: 40,
        effet: "pile : la cible est Gelée.",
        effets: [
          {
            type: "etat",
            etat: "gel",
            si: {
              si: "piece",
              cote: "pile"
            }
          }
        ]
      }
    ]
  },
  {
    id: "ren-per-019",
    nom: "Kikoru Shinomiya",
    serie: "Kaiju No. 8",
    rang: "C",
    element: "foudre",
    type: "base",
    pv: 80,
    repli: 1,
    talent: null,
    attaques: [
      {
        nom: "Hache de combat",
        cout: [
          "q",
          "q"
        ],
        degats: 40,
        effet: "+20 contre un Éveillé.",
        effets: [
          {
            type: "bonus",
            valeur: 20,
            si: {
              si: "cible-type",
              type: "eveille"
            }
          }
        ]
      }
    ]
  },
  {
    id: "ren-per-020",
    nom: "Soshiro Hoshina",
    serie: "Kaiju No. 8",
    rang: "C",
    element: "vent",
    type: "base",
    pv: 80,
    repli: 0,
    talent: null,
    attaques: [
      {
        nom: "Double lame",
        cout: [
          "q",
          "q"
        ],
        degats: 50,
        effet: "",
        effets: []
      }
    ]
  },
  {
    id: "ren-per-021",
    nom: "Bond Forger",
    serie: "Spy x Family",
    rang: "C",
    element: "neutre",
    type: "base",
    pv: 80,
    repli: 1,
    talent: {
      nom: "Prémonition",
      texte: "une fois par tour, regarde la carte du dessus de ton deck ; tu peux la mettre sous le deck.",
      effets: [
        {
          type: "activable",
          limite: "tour",
          effets: [
            {
              type: "regarder",
              nombre: 1,
              garder: 0,
              reste: "choix-dessous"
            }
          ]
        }
      ]
    },
    attaques: [
      {
        nom: "Gros câlin",
        cout: [
          "q"
        ],
        degats: 20,
        effet: "",
        effets: []
      }
    ]
  },
  {
    id: "ren-per-022",
    nom: "Franky Franklin",
    serie: "Spy x Family",
    rang: "C",
    element: "neutre",
    type: "base",
    pv: 70,
    repli: 1,
    talent: {
      nom: "Informateur",
      texte: "une fois par tour, si tu as un autre personnage de Spy x Family en jeu, pioche 1 carte puis défausse 1 carte.",
      effets: [
        {
          type: "activable",
          limite: "tour",
          si: {
            si: "autre-serie-en-jeu"
          },
          effets: [
            {
              type: "pioche-puis-defausse"
            }
          ]
        }
      ]
    },
    attaques: [
      {
        nom: "Gadget",
        cout: [
          "q"
        ],
        degats: 10,
        effet: "",
        effets: []
      }
    ]
  },
  {
    id: "ren-per-023",
    nom: "Meguru Bachira",
    serie: "Blue Lock",
    rang: "C",
    element: "eau",
    type: "base",
    pv: 70,
    repli: 0,
    talent: null,
    attaques: [
      {
        nom: "Dribble du monstre",
        cout: [
          "q"
        ],
        degats: 20,
        effet: "échange ensuite Bachira avec un de tes personnages du banc.",
        effets: [
          {
            type: "echange-soi"
          }
        ]
      }
    ]
  },
  {
    id: "ren-per-024",
    nom: "Seishiro Nagi",
    serie: "Blue Lock",
    rang: "C",
    element: "glace",
    type: "base",
    pv: 80,
    repli: 1,
    talent: null,
    attaques: [
      {
        nom: "Contrôle parfait",
        cout: [
          "q",
          "q"
        ],
        degats: 40,
        effet: "pile : la cible est Gelée.",
        effets: [
          {
            type: "etat",
            etat: "gel",
            si: {
              si: "piece",
              cote: "pile"
            }
          }
        ]
      }
    ]
  }
];
const cartes$1 = [
  {
    id: "ren-001",
    numero: 1,
    personnage: "ren-per-001",
    finition: "holo-integrale",
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
    id: "ren-002",
    numero: 2,
    personnage: "ren-per-002",
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
    id: "ren-003",
    numero: 3,
    personnage: "ren-per-003",
    finition: "holo",
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
    id: "ren-004",
    numero: 4,
    personnage: "ren-per-004",
    finition: "holo",
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
    id: "ren-005",
    numero: 5,
    personnage: "ren-per-005",
    finition: "holo",
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
    id: "ren-006",
    numero: 6,
    personnage: "ren-per-006",
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
    id: "ren-007",
    numero: 7,
    personnage: "ren-per-007",
    finition: "peu-commune",
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
    id: "ren-008",
    numero: 8,
    personnage: "ren-per-008",
    finition: "peu-commune",
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
    id: "ren-009",
    numero: 9,
    personnage: "ren-per-009",
    finition: "peu-commune",
    secrete: false,
    images: {
      illustration: {
        zoom: 102,
        x: 50,
        y: 39
      }
    }
  },
  {
    id: "ren-010",
    numero: 10,
    personnage: "ren-per-010",
    finition: "peu-commune",
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
    id: "ren-011",
    numero: 11,
    personnage: "ren-per-011",
    finition: "peu-commune",
    secrete: false,
    images: {
      illustration: {
        zoom: 102,
        x: 50,
        y: 34
      }
    }
  },
  {
    id: "ren-012",
    numero: 12,
    personnage: "ren-per-012",
    finition: "peu-commune",
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
    id: "ren-013",
    numero: 13,
    personnage: "ren-per-013",
    finition: "commune",
    secrete: false,
    images: {
      illustration: {
        zoom: 102,
        x: 50,
        y: 41
      }
    }
  },
  {
    id: "ren-014",
    numero: 14,
    personnage: "ren-per-014",
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
    id: "ren-015",
    numero: 15,
    personnage: "ren-per-015",
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
    id: "ren-016",
    numero: 16,
    personnage: "ren-per-016",
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
    id: "ren-017",
    numero: 17,
    personnage: "ren-per-017",
    finition: "commune",
    secrete: false,
    images: {
      illustration: {
        zoom: 102,
        x: 50,
        y: 16
      }
    }
  },
  {
    id: "ren-018",
    numero: 18,
    personnage: "ren-per-018",
    finition: "commune",
    secrete: false,
    images: {
      illustration: {
        zoom: 102,
        x: 50,
        y: 32
      }
    }
  },
  {
    id: "ren-019",
    numero: 19,
    personnage: "ren-per-019",
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
    id: "ren-020",
    numero: 20,
    personnage: "ren-per-020",
    finition: "commune",
    secrete: false,
    images: {
      illustration: {
        zoom: 102,
        x: 50,
        y: 23
      }
    }
  },
  {
    id: "ren-021",
    numero: 21,
    personnage: "ren-per-021",
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
    id: "ren-022",
    numero: 22,
    personnage: "ren-per-022",
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
    id: "ren-023",
    numero: 23,
    personnage: "ren-per-023",
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
    id: "ren-024",
    numero: 24,
    personnage: "ren-per-024",
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
    id: "ren-025",
    numero: 25,
    personnage: "ren-per-006",
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
    id: "ren-026",
    numero: 26,
    personnage: "ren-per-010",
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
    images: {
      illustration: {
        zoom: 102,
        x: 50,
        y: 50
      }
    }
  },
  {
    id: "ren-029",
    numero: 29,
    personnage: "ren-per-003",
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
    id: "ren-030",
    numero: 30,
    personnage: "ren-per-005",
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
    images: {
      illustration: {
        zoom: 102,
        x: 50,
        y: 50
      }
    }
  }
];
const __vite_glob_0_2 = {
  id: id$1,
  nom: nom$1,
  edition: edition$1,
  total: total$1,
  totalAvecSecretes: totalAvecSecretes$1,
  _note: _note$1,
  personnages: personnages$1,
  cartes: cartes$1
};
const id = "vague-3";
const nom = "Vague 3";
const edition = 1;
const total = 8;
const totalAvecSecretes = 8;
const _note = "Vague 3 de Lancement (tâche 30) : 8 personnages de Naruto et de One Piece, une carte de base chacun. Les ids continuent ceux de Renforts (ren-per-025 à 032, ren-033 à 040).";
const personnages = [
  {
    id: "ren-per-025",
    nom: "Kakashi Hatake",
    serie: "Naruto",
    rang: "B",
    element: "foudre",
    type: "base",
    pv: 90,
    repli: 1,
    talent: {
      nom: "Invocation : Pakkun",
      texte: "une fois par tour, regarde les 3 premières cartes de ton deck et prends-y un Base de Naruto.",
      effets: [
        {
          type: "activable",
          limite: "tour",
          effets: [
            {
              type: "regarder",
              nombre: 3,
              garder: 1,
              reste: "dessous",
              filtre: {
                type: "base",
                serie: "Naruto"
              }
            }
          ]
        }
      ]
    },
    attaques: [
      {
        nom: "Raikiri",
        cout: [
          "z",
          "q"
        ],
        degats: 50,
        effet: "pile : la cible est Étourdie.",
        effets: [
          {
            type: "etat",
            etat: "etourdi",
            si: {
              si: "piece",
              cote: "pile"
            }
          }
        ]
      }
    ]
  },
  {
    id: "ren-per-026",
    nom: "Sakura Haruno",
    serie: "Naruto",
    rang: "B",
    element: "terre",
    type: "base",
    pv: 90,
    repli: 1,
    talent: {
      nom: "Ninjutsu médical",
      texte: "une fois par tour, soigne 20 un de tes personnages de Naruto.",
      effets: [
        {
          type: "activable",
          limite: "tour",
          effets: [
            {
              type: "soin",
              valeur: 20,
              cible: "allie",
              serie: "Naruto"
            }
          ]
        }
      ]
    },
    attaques: [
      {
        nom: "Poing de Tsunade",
        cout: [
          "t",
          "q",
          "q"
        ],
        degats: 50,
        effet: "+30 contre un Éveillé.",
        effets: [
          {
            type: "bonus",
            valeur: 30,
            si: {
              si: "cible-type",
              type: "eveille"
            }
          }
        ]
      }
    ]
  },
  {
    id: "ren-per-027",
    nom: "Gaara",
    serie: "Naruto",
    rang: "B",
    element: "terre",
    type: "base",
    pv: 110,
    repli: 2,
    talent: {
      nom: "Armure de sable",
      texte: "Gaara subit 20 dégâts de moins.",
      effets: [
        {
          type: "reduction",
          valeur: 20
        }
      ]
    },
    attaques: [
      {
        nom: "Tombeau du désert",
        cout: [
          "t",
          "q",
          "q"
        ],
        degats: 40,
        effet: "l'actif adverse ne peut pas se replier au prochain tour.",
        effets: [
          {
            type: "bloque-repli-cible"
          }
        ]
      }
    ]
  },
  {
    id: "ren-per-028",
    nom: "Rock Lee",
    serie: "Naruto",
    rang: "C",
    element: "neutre",
    type: "base",
    pv: 70,
    repli: 0,
    talent: null,
    attaques: [
      {
        nom: "Lotus primaire",
        cout: [
          "q"
        ],
        degats: 20,
        effet: "",
        effets: []
      },
      {
        nom: "Huit Portes",
        cout: [
          "q",
          "q"
        ],
        degats: 80,
        effet: "Lee subit 30 dégâts.",
        effets: [
          {
            type: "degats-soi",
            valeur: 30
          }
        ]
      }
    ]
  },
  {
    id: "ren-per-029",
    nom: "Sanji",
    serie: "One Piece",
    rang: "B",
    element: "feu",
    type: "base",
    pv: 90,
    repli: 1,
    talent: {
      nom: "Cuisinier de bord",
      texte: "tes Objets de soin soignent 20 de plus.",
      effets: [
        {
          type: "soin-objets",
          valeur: 20
        }
      ]
    },
    attaques: [
      {
        nom: "Diable Jambe",
        cout: [
          "f",
          "q"
        ],
        degats: 40,
        effet: "la cible est Brûlée.",
        effets: [
          {
            type: "etat",
            etat: "brulure"
          }
        ]
      }
    ]
  },
  {
    id: "ren-per-030",
    nom: "Nami",
    serie: "One Piece",
    rang: "B",
    element: "foudre",
    type: "base",
    pv: 70,
    repli: 0,
    talent: {
      nom: "Navigatrice",
      texte: "une fois par tour, échange ton actif avec un personnage de ton banc sans payer le Repli.",
      effets: [
        {
          type: "activable",
          limite: "tour",
          effets: [
            {
              type: "echange-actif-soin",
              valeur: 0
            }
          ]
        }
      ]
    },
    attaques: [
      {
        nom: "Thunderbolt Tempo",
        cout: [
          "z",
          "q"
        ],
        degats: 40,
        effet: "pile : la cible est Étourdie.",
        effets: [
          {
            type: "etat",
            etat: "etourdi",
            si: {
              si: "piece",
              cote: "pile"
            }
          }
        ]
      }
    ]
  },
  {
    id: "ren-per-031",
    nom: "Usopp",
    serie: "One Piece",
    rang: "C",
    element: "neutre",
    type: "base",
    pv: 60,
    repli: 0,
    talent: null,
    attaques: [
      {
        nom: "Pop Green",
        cout: [
          "q"
        ],
        degats: 20,
        effet: "à un personnage du banc adverse.",
        effets: [
          {
            type: "cible",
            quoi: "banc-adverse"
          }
        ]
      },
      {
        nom: "Étoile de feu",
        cout: [
          "q",
          "q"
        ],
        degats: 30,
        effet: "la cible est Brûlée.",
        effets: [
          {
            type: "etat",
            etat: "brulure"
          }
        ]
      }
    ]
  },
  {
    id: "ren-per-032",
    nom: "Tony Tony Chopper",
    serie: "One Piece",
    rang: "C",
    element: "eau",
    type: "base",
    pv: 70,
    repli: 1,
    talent: null,
    attaques: [
      {
        nom: "Docteur de bord",
        cout: [
          "q"
        ],
        degats: "",
        effet: "soigne 30 un de tes personnages.",
        effets: [
          {
            type: "soin",
            valeur: 30,
            cible: "allie"
          }
        ]
      },
      {
        nom: "Point de garde",
        cout: [
          "q",
          "q",
          "q"
        ],
        degats: 50,
        effet: "",
        effets: []
      }
    ]
  }
];
const cartes = [
  {
    id: "ren-033",
    numero: 1,
    personnage: "ren-per-025",
    finition: "peu-commune",
    secrete: false,
    images: {
      illustration: {
        zoom: 100,
        x: 50,
        y: 50
      }
    }
  },
  {
    id: "ren-034",
    numero: 2,
    personnage: "ren-per-026",
    finition: "peu-commune",
    secrete: false,
    images: {
      illustration: {
        zoom: 100,
        x: 50,
        y: 50
      }
    }
  },
  {
    id: "ren-035",
    numero: 3,
    personnage: "ren-per-027",
    finition: "peu-commune",
    secrete: false,
    images: {
      illustration: {
        zoom: 100,
        x: 50,
        y: 50
      }
    }
  },
  {
    id: "ren-036",
    numero: 4,
    personnage: "ren-per-028",
    finition: "commune",
    secrete: false,
    images: {
      illustration: {
        zoom: 100,
        x: 50,
        y: 50
      }
    }
  },
  {
    id: "ren-037",
    numero: 5,
    personnage: "ren-per-029",
    finition: "peu-commune",
    secrete: false,
    images: {
      illustration: {
        zoom: 100,
        x: 50,
        y: 50
      }
    }
  },
  {
    id: "ren-038",
    numero: 6,
    personnage: "ren-per-030",
    finition: "peu-commune",
    secrete: false,
    images: {
      illustration: {
        zoom: 100,
        x: 50,
        y: 50
      }
    }
  },
  {
    id: "ren-039",
    numero: 7,
    personnage: "ren-per-031",
    finition: "commune",
    secrete: false,
    images: {
      illustration: {
        zoom: 100,
        x: 50,
        y: 50
      }
    }
  },
  {
    id: "ren-040",
    numero: 8,
    personnage: "ren-per-032",
    finition: "commune",
    secrete: false,
    images: {
      illustration: {
        zoom: 100,
        x: 50,
        y: 50
      }
    }
  }
];
const __vite_glob_0_3 = {
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
    soutiens: "soutiens.json",
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
      },
      {
        id: "vague-3",
        nom: "Vague 3",
        fichier: "extension-vague3.json",
        disponibleLe: "2026-11-13"
      }
    ]
  }
];
const liste = {
  extensions
};
const ELEMENTS = {
  feu: { nom: "Feu", abreviation: "Fe", couleur: "#CE2F18", glyphe: "M12 3c1 4 5 5.5 5 10a5 5 0 0 1-10 0c0-2.5 1.5-4 2.5-5 .3 2 1.3 3 2.5 3.5C11.5 9 11 6 12 3z" },
  eau: { nom: "Eau", abreviation: "Ea", couleur: "#1764DA", glyphe: "M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z" },
  glace: { nom: "Glace", abreviation: "Gl", couleur: "#2F9FDC", glyphe: "M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9" },
  foudre: { nom: "Foudre", abreviation: "Fo", couleur: "#E8AB07", glyphe: "M13 3L5 13h6l-1 8 8-10h-6l1-8z" },
  vent: { nom: "Vent", abreviation: "Ve", couleur: "#38A937", glyphe: "M3 9h11a3 3 0 1 0-3-3M3 15h15a3 3 0 1 1-3 3M3 12h8" },
  terre: { nom: "Terre", abreviation: "Te", couleur: "#AA6327", glyphe: "M3 19L9 8l4 6 3-4 5 9z" },
  lumiere: { nom: "Lumière", abreviation: "Lu", couleur: "#F2E3B2", glyphe: "M12 7a5 5 0 1 0 0 10a5 5 0 1 0 0-10zM12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" },
  tenebres: { nom: "Ténèbres", abreviation: "Té", couleur: "#722DA1", glyphe: "M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" },
  neutre: { nom: "Neutre", abreviation: "Ne", couleur: "#828285", glyphe: "M12 4a8 8 0 1 0 0 16a8 8 0 1 0 0-16z" }
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
  const soutiens = [...extension2.soutiens ?? []].sort((a, b) => (a.numero ?? 0) - (b.numero ?? 0));
  const soutiensParId = new Map(soutiens.map((s) => [s.id, s]));
  const index = {
    soutien: (id2) => soutiensParId.get(id2),
    soutiens,
    soutiensParFinition: (f) => soutiens.filter((s) => s.finition === f),
    tirables: (f) => [...(parFinition.get(f) ?? []).map((c) => c.id), ...soutiens.filter((s) => s.finition === f).map((s) => s.id)],
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
function valeurDegats(d) {
  if (typeof d === "number") return d;
  const t = d.trim();
  if (t === "") return 0;
  const fois = /^(\d+)\s*×$/.exec(t);
  if (fois) return Number(fois[1]) * 1.5;
  const pile = /^(\d+)\s*\/\s*(\d+)$/.exec(t);
  if (pile) return (Number(pile[1]) + Number(pile[2])) / 2;
  return Number.NaN;
}
const texteDegats = (d) => typeof d === "number" ? String(d) : d.trim();
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
    const candidates = options.avecSoutiens ? index.tirables(finition) : index.parFinition(finition).map((c) => c.id);
    if (candidates.length === 0) {
      throw new Error(`Extension « ${extension2.id} » : aucune carte de rareté « ${finition} » à tirer.`);
    }
    cartes2.push({ carteId: candidates[rng.entier(candidates.length)], finition, emplacement });
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
    case "talent":
      return carte.talent !== null;
    case "type-personnage":
      return carte.type === c.valeur;
    case "pv-min":
      return carte.pv >= c.valeur;
    case "degats-min":
      return carte.attaques.some((a) => valeurDegats(a.degats) >= c.valeur);
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
  /** Puissance d'un personnage : (PV + dégâts de ses attaques) ÷ 10, arrondi (« 30× » compte 45, « 50 / 0 » compte 25). */
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
const degatsPuissance = (carte) => carte.attaques.reduce((n, a) => n + valeurDegats(a.degats), 0);
function puissance(carte) {
  return Math.round((carte.pv + degatsPuissance(carte)) / BAREME.diviseurPuissance);
}
function scorer(equipe, theme, adversaire) {
  const lignes = [];
  const nomEl = (e) => ELEMENTS[e].nom;
  const degats = (c) => c.attaques.map((a) => {
    const v = valeurDegats(a.degats);
    return typeof a.degats === "number" ? String(v) : texteDegats(a.degats) === "" ? "0" : `${texteDegats(a.degats)} (${v})`;
  }).join(" + ");
  for (const c of equipe) lignes.push({ categorie: "Puissance", libelle: `${c.nom} (${c.pv} PV, ${degats(c)} dégâts)`, points: puissance(c) });
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
    let soutiens;
    if (e.soutiens) {
      const contenu = fichiers2[e.soutiens];
      if (!contenu || !Array.isArray(contenu.soutiens)) erreurs.push(`${ref} : fichier de cartes Soutien « ${e.soutiens} » introuvable ou sans liste « soutiens ».`);
      else soutiens = contenu.soutiens;
    }
    catalogue2.push({ id: e.id, nom: e.nom, edition: e.edition, booster, vagues, ...soutiens ? { soutiens } : {} });
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
    cartes: cartes2,
    ...ext.soutiens?.length ? { soutiens: ext.soutiens.map((s, i) => ({ ...s, numero: i + 1 })) } : {}
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
    cartes: extensions2.flatMap((e) => e.cartes),
    soutiens: extensions2.flatMap((e) => e.soutiens ?? [])
  };
  fusions.set(cle, fusion);
  return fusion;
}
const modules = /* @__PURE__ */ Object.assign({ "../../src/data/booster-lancement.json": __vite_glob_0_0, "../../src/data/extension-lancement.json": __vite_glob_0_1, "../../src/data/extension-renforts.json": __vite_glob_0_2, "../../src/data/extension-vague3.json": __vite_glob_0_3 });
const fichiers = Object.fromEntries(Object.entries(modules).map(([chemin, contenu]) => [chemin.replace("../../src/data/", ""), contenu]));
const { catalogue, erreurs: erreursCatalogue } = construireCatalogue(
  // Sans les cartes Soutien : le draft ne tire que des personnages.
  liste.extensions.map(({ soutiens: _soutiens, ...e }) => e),
  fichiers
);
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
    description: "Une attaque de 120 dégâts ou plus.",
    critere: {
      type: "degats-min",
      valeur: 120
    }
  },
  {
    id: "talents",
    nom: "Talents",
    description: "Personnages dotés d’un talent.",
    critere: {
      type: "talent"
    }
  },
  {
    id: "eveil",
    nom: "Éveil",
    description: "Personnages Éveillés (rangs A et S).",
    critere: {
      type: "type-personnage",
      valeur: "eveille"
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
