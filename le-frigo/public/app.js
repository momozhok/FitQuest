const $ = (s) => document.querySelector(s);
const escape = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const state = {
  user: null,
  ingredients: [],
  pantry: [],
  recipes: [],
  favorites: [],
  groceries: [],
  page: "kitchen",
  time: 0,
  vegetarian: false,
  limit: 6,
  query: "",
  auth: "login",
};
const modal = $("#modal");
let toastTimeout,
  timerInterval,
  timerEnd = 0;
function toast(message) {
  $("#toast").textContent = message;
  $("#toast").classList.add("visible");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(
    () => $("#toast").classList.remove("visible"),
    4000,
  );
}
async function api(path, options = {}) {
  const r = await fetch("/api" + path, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const data = await r.json();
  if (!r.ok) {
    if (r.status === 401 && state.user) {
      state.user = null;
      render();
    }
    throw new Error(data.error || "Impossible de joindre la cuisine.");
  }
  return data;
}
function open(html) {
  $("#modal-content").innerHTML = html;
  if (!modal.open) modal.showModal();
}
function close() {
  modal.close();
  clearInterval(timerInterval);
}
const modalHead = (title) =>
  `<div class="dialog-header"><h2>${escape(title)}</h2><button class="close" data-action="close" aria-label="Fermer">×</button></div>`;
const ingredient = (id) => state.ingredients.find((x) => x.id === id);
function today() {
  return new Date().toISOString().slice(0, 10);
}
function available(id) {
  const p = state.pantry.find((x) => x.ingredient_id === id);
  return p && (!p.expires || p.expires >= today());
}
async function refresh() {
  const data = await Promise.all([
    api("/pantry"),
    api("/recipes?time=" + state.time + "&vegetarian=" + state.vegetarian),
    api("/favorites"),
    api("/groceries"),
  ]);
  [state.pantry, state.recipes, state.favorites, state.groceries] = data;
  render();
}
function render() {
  document.querySelectorAll("[data-page]").forEach((b) => {
    b.classList.toggle("active", b.dataset.page === state.page);
    if (b.dataset.page === state.page) b.setAttribute("aria-current", "page");
    else b.removeAttribute("aria-current");
  });
  $("#account").textContent = state.user
    ? state.user.name[0].toUpperCase()
    : "↗";
  $("#account").setAttribute(
    "aria-label",
    state.user ? "Mon compte : " + state.user.name : "Se connecter",
  );
  const remaining = state.groceries.filter((x) => !x.checked).length;
  $("#grocery-count").textContent =
    state.user && remaining ? `(${remaining})` : "";
  if (!state.user) {
    $("#app").innerHTML =
      `<section class="welcome"><div class="welcome-text"><p class="eyebrow">TA CUISINE COMMENCE ICI</p><h2>De bonnes idées.<br>Déjà dans ton frigo.</h2><p>Ajoute ce que tu as sous la main et trouve ta prochaine recette. Garde tes préférées et prépare tes courses en un clic.</p><button class="primary" data-action="register">Créer ma cuisine →</button><p><button class="text-link" data-action="login">J’ai déjà un compte ↗</button></p><div class="welcome-points"><span>✓ Gratuit</span><span>✓ Recettes simples</span><span>✓ Moins de gaspillage</span></div></div><div class="food" role="img" aria-label="Pâtes aux tomates et à la feta"></div></section>`;
    return;
  }
  if (state.page === "groceries") return renderGroceries();
  if (state.page === "favorites") {
    $("#app").innerHTML =
      `<h2 class="page-heading">Tes recettes, à garder.</h2><p class="page-subtitle">Les bonnes idées qu’on aime retrouver.</p>${
        state.favorites.length
          ? `<div class="recipe-grid">${state.recipes
              .filter((r) => state.favorites.includes(r.id))
              .map(card)
              .join("")}</div>`
          : empty(
              "Ton carnet attend ses premières recettes.",
              "Touche le cœur sur une recette pour la retrouver ici.",
              "Retour en cuisine",
              "kitchen",
            )
      }`;
    return;
  }
  const list = state.recipes.filter(
    (r) => !state.query || r.ingredients.some((i) => i.id === state.query),
  );
  $("#app").innerHTML =
    `<div class="workspace"><aside class="pantry" aria-label="Mon frigo"><div class="pantry-head"><h2>Dans mon frigo</h2><span class="count">${state.pantry.length} ingrédients</span></div><div class="search"><input id="ingredient-search" placeholder="Ajouter un ingrédient…" aria-label="Rechercher un ingrédient" autocomplete="off" aria-controls="suggestions"></div><div id="suggestions"></div><div>${state.pantry.length ? state.pantry.map(pantryRow).join("") : '<p class="helper">Ajoute ton premier ingrédient pour commencer.</p>'}</div><p class="helper">Clique sur un ingrédient pour préciser sa quantité ou sa date.</p><div class="pantry-bottom"><h3>J’ai combien de temps ?</h3><div class="pills">${[
      [15, "15 min"],
      [30, "30 min"],
      [0, "Peu importe"],
    ]
      .map(
        ([v, label]) =>
          `<button class="pill ${state.time === v ? "active" : ""}" data-time="${v}" aria-pressed="${state.time === v}">${label}</button>`,
      )
      .join(
        "",
      )}</div><button class="primary wide" data-action="find">Trouver mes recettes →</button><p class="tagline">Moins de gaspillage, plus de bonnes idées.</p></div></aside><section class="results"><div class="results-head"><div><h2>${state.query ? "Une bonne idée à sauver." : "Tu as déjà de quoi te régaler."}</h2><p>${list.length} recettes selon tes ingrédients · huile, sel et poivre du placard.</p></div><div class="pills"><button class="pill ${!state.vegetarian ? "active" : ""}" data-filter="all" aria-pressed="${!state.vegetarian}">Tout</button><button class="pill ${state.vegetarian ? "active" : ""}" data-filter="vegetarian" aria-pressed="${state.vegetarian}">Végétarien</button>${state.query ? '<button class="pill" data-action="clear-query">Tout voir ×</button>' : ""}</div></div>${list.length ? `<div class="recipe-grid">${list.slice(0, state.limit).map(card).join("")}</div>${list.length > state.limit ? '<div class="more"><button class="secondary" data-action="more">Encore de bonnes idées ↓</button></div>' : ""}` : empty("Aucune recette pour ces critères.", "Essaie une autre durée ou retire le filtre végétarien.", "Réinitialiser les filtres", "reset-filters")}${antiwaste()}</section></div>`;
}
function empty(title, description, label, action) {
  return `<div class="empty"><h2>${escape(title)}</h2><p>${escape(description)}</p><button class="secondary" data-action="${action}">${escape(label)}</button></div>`;
}
function pantryRow(p) {
  const i = ingredient(p.ingredient_id);
  if (!i) return "";
  const date = p.expires;
  const soon =
    date &&
    date <= new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
  const exp = date
    ? date < today()
      ? "Date dépassée · exclu des recettes"
      : `À consommer avant le ${new Date(date + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}`
    : "";
  return `<div class="ingredient"><span class="ingredient-emoji" aria-hidden="true">${i.emoji}</span><button class="ingredient-edit" data-edit="${i.id}"><strong>${escape(i.name)}</strong>${p.quantity ? `<small>${escape(p.quantity)}</small>` : ""}${date ? `<small class="${soon ? "expiring" : ""}">${escape(exp)}</small>` : ""}</button><button class="remove" data-remove="${i.id}" aria-label="Retirer ${escape(i.name)}">×</button></div>`;
}
function card(r) {
  const liked = state.favorites.includes(r.id);
  return `<article class="recipe-card"><button class="food food-${r.image}" data-recipe="${r.id}" aria-label="Voir ${escape(r.title)}"></button><button class="favorite" data-favorite="${r.id}" aria-label="${liked ? "Retirer des" : "Ajouter aux"} favoris : ${escape(r.title)}" aria-pressed="${liked}">${liked ? "♥" : "♡"}</button><div class="card-body"><p class="availability ${r.missing.length ? "missing" : ""}">${r.missing.length ? `Il manque ${r.missing.length} ingrédient${r.missing.length > 1 ? "s" : ""}` : "Tu as tout !"}</p><h3>${escape(r.title)}</h3><p class="recipe-meta">${r.time} min · ${r.difficulty}${r.vegetarian ? " · Végé" : ""}</p><button class="text-link" data-recipe="${r.id}">Voir la recette ↗</button></div></article>`;
}
function antiwaste() {
  const dated = state.pantry
    .filter((p) => p.expires && p.expires >= today())
    .sort((a, b) => a.expires.localeCompare(b.expires));
  const chosen =
    dated[0] ||
    state.pantry.find((p) => p.ingredient_id === "tomate") ||
    state.pantry[0];
  if (!chosen) return "";
  const i = ingredient(chosen.ingredient_id);
  return `<aside class="antiwaste"><div><p class="eyebrow">LE BON RÉFLEXE</p><h3>${dated.length ? "À cuisiner en priorité." : "Rien ne se perd, tout se cuisine."}</h3><p>${dated.length ? `${escape(i.name)} : à consommer avant le ${new Date(chosen.expires + "T12:00:00").toLocaleDateString("fr-FR")}.` : `Des idées simples avec tes ${escape(i.name.toLocaleLowerCase("fr"))}.`}</p><button class="text-link" data-save="${i.id}">Je trouve une idée →</button></div><span class="tomatoes" aria-hidden="true">${i.emoji}</span></aside>`;
}
function auth(mode = "login") {
  state.auth = mode;
  open(
    `<div class="dialog-inner">${modalHead(mode === "login" ? "Heureux de te revoir." : "Bienvenue dans ta cuisine.")}<div class="auth-tabs"><button class="pill ${mode === "login" ? "active" : ""}" data-action="login">Connexion</button><button class="pill ${mode === "register" ? "active" : ""}" data-action="register">Créer un compte</button></div><p class="auth-intro">Retrouve ton frigo, tes recettes préférées et ta liste de courses sur tous tes appareils.</p><form id="auth-form">${mode === "register" ? '<label class="field-label" for="name">Ton prénom</label><input id="name" name="name" autocomplete="given-name" required maxlength="60">' : ""}<label class="field-label" for="email">Adresse e-mail</label><input id="email" name="email" type="email" autocomplete="email" required maxlength="254"><label class="field-label" for="password">Mot de passe</label><input id="password" name="password" type="password" autocomplete="${mode === "register" ? "new-password" : "current-password"}" minlength="10" maxlength="128" required><p class="auth-note">10 caractères minimum.${mode === "register" ? " Ton nouveau frigo contient six ingrédients d’exemple que tu peux modifier." : ""}</p><p class="error" id="form-error" role="alert"></p><button class="primary wide auth-submit">${mode === "login" ? "Ouvrir mon frigo →" : "Créer ma cuisine →"}</button></form><p class="auth-note">Tes ingrédients, favoris et courses restent personnels à ton compte.</p></div>`,
  );
}
function editIngredient(id) {
  const i = ingredient(id),
    p = state.pantry.find((p) => p.ingredient_id === id) || {};
  open(
    `<div class="dialog-inner">${modalHead(i.emoji + " " + i.name)}<form id="ingredient-form" data-id="${id}"><label class="field-label" for="quantity">Quantité (facultatif)</label><input id="quantity" name="quantity" maxlength="60" placeholder="Ex. : 3 pièces ou 250 g" value="${escape(p.quantity || "")}"><label class="field-label" for="expires">À consommer avant le (facultatif)</label><input type="date" id="expires" name="expires" value="${escape(p.expires || "")}"><p class="auth-note">Le site compare la présence des ingrédients, pas leurs quantités. Vérifie toujours les quantités de la recette. Une date dépassée exclut cet ingrédient des suggestions « Tu as tout ».</p><p class="error" id="form-error" role="alert"></p><button class="primary wide auth-submit">Enregistrer →</button></form></div>`,
  );
}
function detail(id) {
  const r = state.recipes.find((r) => r.id === id);
  if (!r) return;
  open(
    `<div class="food food-${r.image} dialog-food" role="img" aria-label="${escape(r.title)}"></div><div class="dialog-inner detail">${modalHead(r.title)}<div class="detail-meta"><span>${r.time} min</span><span>${r.servings} personnes</span><span>${r.difficulty}</span></div><p class="helper">Photos d’ambiance culinaire : certains plats partagent une illustration.</p><h3>Sur le plan de travail</h3>${r.ingredients.map((i) => `<div class="ingredient-line ${available(i.id) ? "" : "missing"}"><span>${available(i.id) ? "✓" : "+"} ${escape(ingredient(i.id).name)}</span><span>${escape(i.quantity)}</span></div>`).join("")}<p class="helper">Prévois aussi de l’huile d’olive, du sel et du poivre. Vérifie les étiquettes et les allergènes des produits utilisés.</p>${r.missing.length ? `<button class="secondary" data-missing="${r.id}">+ Ajouter ${r.missing.length} ingrédient${r.missing.length > 1 ? "s" : ""} aux courses</button>` : ""}<h3>À toi de jouer</h3>${r.steps.map((s, index) => `<div class="step"><span class="step-number">${index + 1}</span><span>${escape(s)}</span></div>`).join("")}<div class="dialog-actions"><button class="primary" data-cook="${r.id}" data-step="0">Commencer à cuisiner →</button><button class="secondary" data-favorite="${r.id}">${state.favorites.includes(r.id) ? "♥ Recette enregistrée" : "♡ Garder cette recette"}</button></div></div>`,
  );
}
function cook(id, index) {
  clearInterval(timerInterval);
  const r = state.recipes.find((r) => r.id === id);
  if (!r) return;
  open(
    `<div class="dialog-inner">${modalHead(r.title)}<p class="progress">ÉTAPE ${index + 1} SUR ${r.steps.length}</p><p class="cook-step">${escape(r.steps[index])}</p><div class="timer"><span aria-hidden="true">◷</span><output id="timer-display" aria-live="off">05:00</output><select id="timer-minutes" aria-label="Durée du minuteur">${[1, 2, 3, 5, 8, 10, 15, 20, 30, 45].map((m) => `<option value="${m}" ${m === 5 ? "selected" : ""}>${m} min</option>`).join("")}</select><button class="secondary" data-action="timer">Démarrer</button></div><p class="helper">Garde cette page ouverte pour utiliser le minuteur.</p><div class="dialog-actions">${index > 0 ? `<button class="secondary" data-cook="${id}" data-step="${index - 1}">← Précédent</button>` : ""}${index + 1 < r.steps.length ? `<button class="primary" data-cook="${id}" data-step="${index + 1}">Étape suivante →</button>` : '<button class="primary" data-action="finish">C’est prêt, à table !</button>'}</div></div>`,
  );
}
function renderGroceries() {
  const count = state.groceries.filter((i) => !i.checked).length;
  $("#app").innerHTML =
    `<section class="shopping"><h2 class="page-heading">La prochaine fois, on prend…</h2><p class="page-subtitle">${count} article${count > 1 ? "s" : ""} à acheter. Une liste qui te suit partout.</p><form id="grocery-form"><input name="name" maxlength="100" required placeholder="Ajouter un produit…" aria-label="Produit à ajouter"><button class="primary">Ajouter +</button></form>${state.groceries.length ? state.groceries.map((g) => `<div class="grocery ${g.checked ? "checked" : ""}"><input type="checkbox" id="grocery-${g.id}" data-check="${g.id}" ${g.checked ? "checked" : ""}><label for="grocery-${g.id}">${escape(g.name)}</label><button class="remove" data-delete-grocery="${g.id}" aria-label="Supprimer ${escape(g.name)}">×</button></div>`).join("") : empty("Le panier est encore vide.", "Ajoute un produit ici ou les ingrédients manquants depuis une recette.", "Explorer les recettes", "kitchen")}<div class="shopping-tools"><button class="secondary" data-action="copy-list">Copier ma liste</button><button class="secondary" data-action="clear-checked">Supprimer les articles cochés</button></div></section>`;
}
async function navigate(page) {
  if (!state.user) return auth();
  state.page = page;
  state.query = "";
  if (page === "favorites") {
    state.time = 0;
    state.vegetarian = false;
  }
  await refresh();
}
document.addEventListener("click", async (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  try {
    if (b.dataset.page) return await navigate(b.dataset.page);
    if (b.id === "theme") {
      const dark = document.documentElement.dataset.theme !== "dark";
      document.documentElement.dataset.theme = dark ? "dark" : "light";
      try {
        localStorage.setItem("frigo-theme", dark ? "dark" : "light");
      } catch {}
      b.textContent = dark ? "☀" : "☾";
      b.setAttribute(
        "aria-label",
        dark ? "Passer au mode clair" : "Passer au mode sombre",
      );
      return;
    }
    if (b.id === "account") {
      if (!state.user) return auth();
      return open(
        `<div class="dialog-inner">${modalHead("Ta cuisine personnelle.")}<p class="account-info"><strong>${escape(state.user.name)}</strong><br>${escape(state.user.email)}</p><p class="helper">${state.pantry.length} ingrédients · ${state.favorites.length} favoris</p><button class="secondary" data-action="logout">Se déconnecter</button></div>`,
      );
    }
    if (b.id === "surprise") {
      if (!state.user) return auth();
      const pool = state.recipes.filter((r) => r.missing.length === 0);
      const list = pool.length ? pool : state.recipes;
      if (!list.length) return toast("Aucune recette avec ces filtres.");
      return detail(list[Math.floor(Math.random() * list.length)].id);
    }
    if (b.dataset.recipe) return detail(b.dataset.recipe);
    if (b.dataset.edit) return editIngredient(b.dataset.edit);
    if (b.dataset.add) {
      b.disabled = true;
      await api("/pantry", {
        method: "POST",
        body: { ingredient_id: b.dataset.add },
      });
      await refresh();
      toast("Ingrédient ajouté au frigo.");
      return;
    }
    if (b.dataset.remove) {
      await api("/pantry/" + b.dataset.remove, { method: "DELETE" });
      return await refresh();
    }
    if (b.dataset.time !== undefined) {
      state.time = Number(b.dataset.time);
      state.limit = 6;
      return await refresh();
    }
    if (b.dataset.filter) {
      state.vegetarian = b.dataset.filter === "vegetarian";
      state.limit = 6;
      return await refresh();
    }
    if (b.dataset.favorite) {
      b.disabled = true;
      const id = b.dataset.favorite,
        liked = state.favorites.includes(id);
      await api("/favorites/" + id, {
        method: liked ? "DELETE" : "PUT",
        body: {},
      });
      state.favorites = liked
        ? state.favorites.filter((x) => x !== id)
        : [...state.favorites, id];
      render();
      if (modal.open) detail(id);
      toast(
        liked ? "Recette retirée des favoris." : "Recette gardée au chaud.",
      );
      return;
    }
    if (b.dataset.save) {
      state.query = b.dataset.save;
      state.time = 0;
      state.vegetarian = false;
      state.limit = 6;
      return await refresh();
    }
    if (b.dataset.missing) {
      const r = state.recipes.find((r) => r.id === b.dataset.missing);
      b.disabled = true;
      await api("/groceries", {
        method: "POST",
        body: { names: r.missing.map((i) => i.name) },
      });
      await refresh();
      toast("Ingrédients ajoutés à la liste de courses.");
      b.disabled = false;
      return;
    }
    if (b.dataset.cook) return cook(b.dataset.cook, Number(b.dataset.step));
    if (b.dataset.deleteGrocery) {
      await api("/groceries/" + b.dataset.deleteGrocery, { method: "DELETE" });
      return await refresh();
    }
    switch (b.dataset.action) {
      case "close":
        return close();
      case "login":
        return auth("login");
      case "register":
        return auth("register");
      case "logout":
        await api("/auth/logout", { method: "POST", body: {} });
        state.user = null;
        state.pantry = [];
        state.recipes = [];
        state.favorites = [];
        state.groceries = [];
        close();
        render();
        return;
      case "find":
        state.limit = 6;
        state.query = "";
        await refresh();
        if (innerWidth < 721)
          $(".results").scrollIntoView({ behavior: "smooth" });
        return;
      case "more":
        state.limit += 6;
        return render();
      case "clear-query":
        state.query = "";
        return render();
      case "reset-filters":
        state.time = 0;
        state.vegetarian = false;
        state.query = "";
        return await refresh();
      case "kitchen":
        return await navigate("kitchen");
      case "finish":
        close();
        return toast(
          "Bon appétit ! Ta recette reste dans ton carnet si tu l’ajoutes aux favoris.",
        );
      case "timer":
        clearInterval(timerInterval);
        timerEnd = Date.now() + Number($("#timer-minutes").value) * 60000;
        const tick = () => {
          const seconds = Math.max(
            0,
            Math.ceil((timerEnd - Date.now()) / 1000),
          );
          if ($("#timer-display"))
            $("#timer-display").textContent =
              String(Math.floor(seconds / 60)).padStart(2, "0") +
              ":" +
              String(seconds % 60).padStart(2, "0");
          if (!seconds) {
            clearInterval(timerInterval);
            toast("Le minuteur est terminé. Vérifie ta cuisson !");
          }
        };
        tick();
        timerInterval = setInterval(tick, 250);
        b.textContent = "Recommencer";
        return;
      case "copy-list": {
        const list = state.groceries
          .filter((g) => !g.checked)
          .map((g) => "☐ " + g.name)
          .join("\n");
        if (!list) return toast("Aucun article à copier.");
        try {
          await navigator.clipboard.writeText("Ma liste — Le Frigo\n" + list);
          toast("Liste copiée.");
        } catch {
          open(
            `<div class="dialog-inner">${modalHead("Ta liste à copier")}<p class="helper">Sélectionne le texte pour le copier.</p><pre>${escape(list)}</pre></div>`,
          );
        }
        return;
      }
      case "clear-checked":
        b.disabled = true;
        await Promise.all(
          state.groceries
            .filter((g) => g.checked)
            .map((g) => api("/groceries/" + g.id, { method: "DELETE" })),
        );
        return await refresh();
    }
  } catch (error) {
    toast(error.message);
    b.disabled = false;
  }
});
document.addEventListener("input", (e) => {
  if (e.target.id !== "ingredient-search") return;
  const q = e.target.value
    .trim()
    .toLocaleLowerCase("fr")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
  if (!q) {
    $("#suggestions").innerHTML = "";
    return;
  }
  const matches = state.ingredients.filter(
    (i) =>
      !state.pantry.some((p) => p.ingredient_id === i.id) &&
      i.name
        .toLocaleLowerCase("fr")
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .includes(q),
  );
  $("#suggestions").innerHTML = `<div class="suggestions">${
    matches.length
      ? matches
          .slice(0, 8)
          .map(
            (i) =>
              `<button data-add="${i.id}">${i.emoji} ${escape(i.name)} <span aria-hidden="true">+</span></button>`,
          )
          .join("")
      : '<p class="helper">Aucun ingrédient à ajouter dans ce catalogue.</p>'
  }</div>`;
});
document.addEventListener("change", async (e) => {
  if (!e.target.dataset.check) return;
  try {
    await api("/groceries/" + e.target.dataset.check, {
      method: "PATCH",
      body: { checked: e.target.checked },
    });
    await refresh();
  } catch (error) {
    e.target.checked = !e.target.checked;
    toast(error.message);
  }
});
document.addEventListener("submit", async (e) => {
  if (!["auth-form", "ingredient-form", "grocery-form"].includes(e.target.id))
    return;
  e.preventDefault();
  const form = e.target,
    b = form.querySelector("button[type=submit],button:not([type])");
  if (b) b.disabled = true;
  const data = Object.fromEntries(new FormData(form));
  try {
    if (form.id === "auth-form") {
      state.user = await api("/auth/" + state.auth, {
        method: "POST",
        body: data,
      });
      await refresh();
      close();
      toast("Bienvenue dans ta cuisine, " + state.user.name + " !");
    }
    if (form.id === "ingredient-form") {
      await api("/pantry", {
        method: "POST",
        body: { ingredient_id: form.dataset.id, ...data },
      });
      await refresh();
      close();
      toast("Frigo mis à jour.");
    }
    if (form.id === "grocery-form") {
      await api("/groceries", { method: "POST", body: data });
      await refresh();
    }
  } catch (error) {
    const target = $("#form-error");
    if (target) target.textContent = error.message;
    else toast(error.message);
    if (b) b.disabled = false;
  }
});
modal.addEventListener("click", (e) => {
  if (e.target === modal) {
    const r = modal.getBoundingClientRect();
    if (
      e.clientX < r.left ||
      e.clientX > r.right ||
      e.clientY < r.top ||
      e.clientY > r.bottom
    )
      close();
  }
});
modal.addEventListener("close", () => clearInterval(timerInterval));
async function init() {
  try {
    let theme = "light";
    try {
      theme = localStorage.getItem("frigo-theme") || "light";
    } catch {}
    document.documentElement.dataset.theme = theme;
    $("#theme").textContent = theme === "dark" ? "☀" : "☾";
    $("#theme").setAttribute(
      "aria-label",
      theme === "dark" ? "Passer au mode clair" : "Passer au mode sombre",
    );
    state.ingredients = await api("/ingredients");
    try {
      state.user = await api("/auth/me");
    } catch (error) {
      if (!error.message.includes("Connecte-toi")) throw error;
    }
    if (state.user) await refresh();
    else render();
  } catch (error) {
    $("#app").innerHTML = empty(
      "La cuisine est momentanément fermée.",
      error.message,
      "Réessayer",
      "reload",
    );
    document
      .querySelector("[data-action=reload]")
      ?.addEventListener("click", init);
  }
}
init();
