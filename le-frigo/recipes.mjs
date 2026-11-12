// Curated recipes: matching uses ingredient IDs, never approximate text matches.
export const ingredients = [
  ["tomate", "Tomates", "🍅"],
  ["oeuf", "Œufs", "🥚"],
  ["courgette", "Courgettes", "🥒"],
  ["feta", "Feta", "🧀"],
  ["pates", "Pâtes", "🍝"],
  ["creme", "Crème", "🥛"],
  ["oignon", "Oignons", "🧅"],
  ["ail", "Ail", "🧄"],
  ["riz", "Riz", "🍚"],
  ["carotte", "Carottes", "🥕"],
  ["pomme-de-terre", "Pommes de terre", "🥔"],
  ["lentille", "Lentilles", "🫘"],
  ["pois-chiche", "Pois chiches", "🫘"],
  ["pain", "Pain", "🍞"],
  ["fromage", "Fromage râpé", "🧀"],
  ["farine", "Farine", "🌾"],
  ["lait", "Lait", "🥛"],
  ["banane", "Bananes", "🍌"],
  ["pomme", "Pommes", "🍎"],
  ["chocolat", "Chocolat", "🍫"],
  ["beurre", "Beurre", "🧈"],
  ["sucre", "Sucre", "🍬"],
  ["epinard", "Épinards", "🥬"],
  ["champignon", "Champignons", "🍄"],
  ["thon", "Thon", "🐟"],
  ["citron", "Citrons", "🍋"],
  ["yaourt", "Yaourt", "🥛"],
].map(([id, name, emoji]) => ({ id, name, emoji }));
const recipe = (id, title, time, vegetarian, image, items, steps) => ({
  id,
  title,
  time,
  vegetarian,
  image,
  servings: 2,
  difficulty: "Facile",
  ingredients: items.map(([id, quantity]) => ({ id, quantity })),
  steps,
});
export const recipes = [
  recipe(
    "pates-feta",
    "Pâtes tomate & feta",
    20,
    true,
    0,
    [
      ["pates", "180 g"],
      ["tomate", "300 g"],
      ["feta", "120 g"],
    ],
    [
      "Porte une casserole d’eau salée à ébullition et cuis les pâtes selon le paquet.",
      "Coupe les tomates. Fais-les revenir 8 minutes à feu moyen avec un filet d’huile d’olive.",
      "Ajoute la feta émiettée et une petite louche d’eau de cuisson. Mélange pour former une sauce.",
      "Égoutte les pâtes, mélange à la sauce et sers aussitôt.",
    ],
  ),
  recipe(
    "galettes",
    "Galettes de courgettes",
    25,
    true,
    1,
    [
      ["courgette", "2"],
      ["oeuf", "1"],
      ["farine", "60 g"],
      ["yaourt", "100 g"],
    ],
    [
      "Râpe les courgettes, sale légèrement et presse-les dans un torchon propre pour retirer l’eau.",
      "Mélange les courgettes, l’œuf et la farine. Poivre.",
      "Dans une poêle huilée, dépose de petits tas et aplatis-les. Cuis 4 minutes par face à feu moyen jusqu’à ce que le centre soit bien cuit.",
      "Sers avec le yaourt assaisonné.",
    ],
  ),
  recipe(
    "oeufs-provencale",
    "Œufs à la provençale",
    15,
    true,
    2,
    [
      ["oeuf", "4"],
      ["tomate", "400 g"],
      ["oignon", "1"],
    ],
    [
      "Émince l’oignon et fais-le revenir 3 minutes dans un filet d’huile.",
      "Ajoute les tomates coupées, sale et laisse mijoter 7 minutes.",
      "Creuse quatre petits puits dans la sauce et casse un œuf dans chacun.",
      "Couvre et cuis jusqu’à ce que les blancs et les jaunes soient pris. Sers chaud.",
    ],
  ),
  recipe(
    "omelette",
    "Omelette courgette & feta",
    15,
    true,
    1,
    [
      ["oeuf", "4"],
      ["courgette", "1"],
      ["feta", "60 g"],
    ],
    [
      "Coupe la courgette en petits dés et fais revenir 6 minutes dans une poêle huilée.",
      "Bats les œufs puis incorpore la feta émiettée.",
      "Verse sur les courgettes. Cuis à feu doux jusqu’à ce que les œufs soient pris, puis replie l’omelette.",
    ],
  ),
  recipe(
    "riz-champignons",
    "Riz crémeux aux champignons",
    30,
    true,
    0,
    [
      ["riz", "160 g"],
      ["champignon", "250 g"],
      ["creme", "100 ml"],
      ["oignon", "1"],
    ],
    [
      "Cuis le riz selon les indications du paquet.",
      "Émince les champignons et l’oignon. Fais-les revenir dans une poêle huilée 10 minutes.",
      "Ajoute la crème et le riz égoutté. Réchauffe doucement 2 minutes et assaisonne.",
    ],
  ),
  recipe(
    "soupe-carotte",
    "Velouté carotte & lentilles",
    30,
    true,
    2,
    [
      ["carotte", "3"],
      ["lentille", "100 g"],
      ["oignon", "1"],
      ["creme", "50 ml"],
    ],
    [
      "Épluche et coupe les carottes. Émince l’oignon.",
      "Fais revenir l’oignon dans une casserole huilée. Ajoute les carottes et les lentilles rincées.",
      "Couvre d’eau, porte à frémissement et cuis jusqu’à ce que les lentilles et les carottes soient tendres, environ 25 minutes.",
      "Mixe avec la crème et ajuste l’assaisonnement.",
    ],
  ),
  recipe(
    "tartines",
    "Tartines tomate & fromage",
    10,
    true,
    0,
    [
      ["pain", "4 tranches"],
      ["tomate", "2"],
      ["fromage", "80 g"],
    ],
    [
      "Préchauffe le four à 200 °C. Pose les tranches de pain sur une plaque.",
      "Garnis de tomates en tranches et de fromage.",
      "Enfourne 8 minutes, jusqu’à ce que le fromage soit fondu et légèrement doré.",
    ],
  ),
  recipe(
    "salade-pois-chiches",
    "Salade de pois chiches",
    10,
    true,
    1,
    [
      ["pois-chiche", "250 g cuits"],
      ["tomate", "2"],
      ["feta", "80 g"],
      ["citron", "½"],
    ],
    [
      "Rince et égoutte les pois chiches cuits.",
      "Coupe les tomates et émiette la feta.",
      "Mélange avec le jus du demi-citron, un filet d’huile d’olive, du sel et du poivre.",
    ],
  ),
  recipe(
    "pates-thon",
    "Pâtes au thon & citron",
    15,
    false,
    0,
    [
      ["pates", "180 g"],
      ["thon", "140 g égoutté"],
      ["creme", "100 ml"],
      ["citron", "½"],
    ],
    [
      "Fais cuire les pâtes selon le paquet.",
      "Réchauffe doucement le thon avec la crème dans une poêle.",
      "Ajoute les pâtes égouttées, le jus et un peu de zeste du citron. Poivre et sers.",
    ],
  ),
  recipe(
    "gratin",
    "Gratin de pommes de terre",
    55,
    true,
    1,
    [
      ["pomme-de-terre", "500 g"],
      ["creme", "150 ml"],
      ["lait", "150 ml"],
      ["fromage", "60 g"],
    ],
    [
      "Préchauffe le four à 180 °C. Épluche les pommes de terre et coupe-les en tranches très fines.",
      "Dispose-les dans un petit plat. Couvre de crème et de lait, sale et poivre.",
      "Parsème de fromage et enfourne environ 45 minutes. Vérifie que les pommes de terre sont tendres avec la pointe d’un couteau.",
    ],
  ),
  recipe(
    "pancakes",
    "Pancakes à la banane",
    15,
    true,
    1,
    [
      ["banane", "1 mûre"],
      ["oeuf", "2"],
      ["farine", "60 g"],
      ["lait", "50 ml"],
    ],
    [
      "Écrase la banane. Mélange-la aux œufs, puis ajoute la farine et le lait.",
      "Fais chauffer une poêle légèrement huilée à feu moyen.",
      "Verse de petits ronds de pâte. Cuis 2 minutes par face, jusqu’à ce que le centre soit cuit.",
    ],
  ),
  recipe(
    "pommes-poele",
    "Pommes dorées au chocolat",
    15,
    true,
    0,
    [
      ["pomme", "2"],
      ["beurre", "15 g"],
      ["chocolat", "40 g"],
    ],
    [
      "Épluche les pommes et coupe-les en quartiers fins.",
      "Fais fondre le beurre à feu moyen, ajoute les pommes et cuis 8 à 10 minutes en remuant.",
      "Hors du feu, ajoute le chocolat haché et laisse fondre. Sers tiède.",
    ],
  ),
];
export function matchRecipes(
  pantry,
  { time = 0, vegetarian = false, q = "" } = {},
) {
  const ids = new Set(pantry.map((i) => i.ingredient_id));
  return recipes
    .filter(
      (r) =>
        (!time || r.time <= time) &&
        (!vegetarian || r.vegetarian) &&
        r.title.toLocaleLowerCase("fr").includes(q.toLocaleLowerCase("fr")),
    )
    .map((r) => ({
      ...r,
      missing: r.ingredients
        .filter((i) => !ids.has(i.id))
        .map((i) => ({
          ...i,
          name: ingredients.find((x) => x.id === i.id).name,
        })),
      matched: r.ingredients.filter((i) => ids.has(i.id)).length,
    }))
    .sort(
      (a, b) =>
        a.missing.length - b.missing.length ||
        b.matched - a.matched ||
        a.time - b.time,
    );
}
