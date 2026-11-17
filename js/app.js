const API = "https://api.scryfall.com";
const STORAGE_KEY = "garimpo-mtg-favoritos";
const DEFAULT_SET = "neo";
const $ = (id) => document.getElementById(id);

let favorites = readFavorites();
let nextPage = null;

function readFavorites() {
  try {
    const cards = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    return new Map(cards.filter((card) => card?.id && card.name).map((card) => [card.id, card]));
  } catch {
    return new Map();
  }
}

function node(tag, className, content) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (content) element.textContent = content;
  return element;
}

function feedback(id, message, variant = "secondary", loading = false) {
  const region = $(id);
  region.replaceChildren();
  if (!message) return;

  const alert = node("div", "alert alert-" + variant + " py-2");
  if (loading) {
    const spinner = node("span", "spinner-border spinner-border-sm me-2");
    spinner.setAttribute("aria-hidden", "true");
    alert.append(spinner);
  }
  alert.append(message);
  region.append(alert);
}

function errorMessage(error, emptyMessage) {
  if (error.status === 404) return emptyMessage;
  if (error.status === 429) return "Muitas consultas em sequência. Aguarde um pouco e tente novamente.";
  if (error.status === 400) return "O Scryfall recusou a consulta. Revise os filtros e tente novamente.";
  if (error.status) return "O Scryfall retornou um erro (" + error.status + "). Tente novamente.";
  return "Não foi possível conectar ao Scryfall. Verifique sua internet e tente novamente.";
}

async function request(path, params) {
  const url = new URL(path, API);
  if (params) url.search = new URLSearchParams(params);
  const response = await fetch(url, {
    headers: { Accept: "application/json;q=0.9,*/*;q=0.8" },
    signal: AbortSignal.timeout(12000)
  });
  if (!response.ok) {
    const error = new Error("Falha no Scryfall");
    error.status = response.status;
    throw error;
  }
  return response.json();
}

async function loadSets() {
  $("set-feedback").textContent = "Carregando coleções…";
  $("set").disabled = true;
  $("retry-sets").hidden = true;
  try {
    const { data } = await request("/sets");
    for (const set of data) {
      if (set.digital || set.card_count === 0) continue;
      $("set").add(new Option(set.name, set.code));
    }
    if ($("set").querySelector('option[value="neo"]')) $("set").value = DEFAULT_SET;
    $("set-feedback").textContent = "";
    return true;
  } catch (error) {
    $("set-feedback").textContent = errorMessage(error, "Nenhuma coleção disponível.");
    $("retry-sets").hidden = false;
    return false;
  } finally {
    $("set").disabled = false;
  }
}

function filterQuery() {
  const filters = [
    ["s", $("set").value],
    ["c", $("color").value],
    ["t", $("type").value],
    ["r", $("rarity").value]
  ];
  return ["game:paper", ...filters.filter(([, value]) => value).map(([key, value]) => key + ":" + value)].join(" ");
}

async function searchCards(append = false) {
  const page = nextPage;
  $("apply").disabled = true;
  $("more").disabled = true;
  $("retry-search").hidden = true;
  if (!append) {
    nextPage = null;
    $("more").hidden = true;
    $("results").replaceChildren();
  }
  feedback("search-feedback", "Carregando cartas…", "secondary", true);

  try {
    const result = append ? await request(page) : await request("/cards/search", { q: filterQuery(), order: "name" });
    nextPage = result.has_more ? result.next_page : null;
    $("results").append(...result.data.map(makeTile));
    $("more").hidden = !nextPage;
    const shown = $("results").childElementCount;
    const message = shown > 0
      ? shown + " de " + result.total_cards.toLocaleString("pt-BR") + " cartas"
      : "Nenhuma carta encontrada. Experimente outros filtros.";
    feedback("search-feedback", message, shown > 0 ? "secondary" : "warning");
  } catch (error) {
    feedback("search-feedback", errorMessage(error, "Nenhuma carta encontrada. Experimente outros filtros."), "warning");
    $("retry-search").hidden = append || error.status === 404;
  } finally {
    $("apply").disabled = false;
    $("more").disabled = false;
  }
}

async function openFromApi(mode) {
  const random = mode === "random";
  const name = $("card-name").value.trim();
  if (!random && !name) {
    $("card-name").setAttribute("aria-invalid", "true");
    feedback("action-feedback", "Digite o nome de uma carta.", "warning");
    $("card-name").focus();
    return;
  }
  $("card-name").removeAttribute("aria-invalid");
  $("random").disabled = true;
  $("find").disabled = true;
  feedback("action-feedback", random ? "Sorteando carta…" : "Consultando carta…", "secondary", true);

  try {
    const card = random
      ? await request("/cards/random", { q: filterQuery() })
      : await request("/cards/named", { fuzzy: name });
    feedback("action-feedback", "");
    showCard(card, random ? "Carta sorteada" : "");
  } catch (error) {
    const empty = random ? "Nenhuma carta corresponde aos filtros do sorteio." : "Carta não encontrada. Confira a grafia do nome.";
    feedback("action-feedback", errorMessage(error, empty), "warning");
  } finally {
    $("random").disabled = false;
    $("find").disabled = false;
  }
}

function cardImage(url, name, className) {
  if (!url) return node("div", className + " image-placeholder", "Imagem indisponível");
  const image = node("img", className);
  image.src = url;
  image.alt = name;
  image.loading = "lazy";
  image.addEventListener("error", () => image.replaceWith(node("div", className + " image-placeholder", "Imagem indisponível")), { once: true });
  return image;
}

function updateSaveButtons() {
  for (const button of document.querySelectorAll("[data-card-id]")) {
    const saved = favorites.has(button.dataset.cardId);
    button.setAttribute("aria-pressed", String(saved));
    button.setAttribute("aria-label", (saved ? "Remover dos favoritos: " : "Salvar nos favoritos: ") + button.dataset.cardName);
    button.textContent = button.classList.contains("save-button") ? (saved ? "★" : "☆") : (saved ? "★ Remover dos favoritos" : "☆ Salvar nos favoritos");
  }
}

function makeSaveButton(card, compact) {
  const button = node("button", compact ? "save-button" : "btn btn-accent");
  button.type = "button";
  button.dataset.cardId = card.id;
  button.dataset.cardName = card.name;
  button.addEventListener("click", () => {
    const updated = new Map(favorites);
    if (updated.has(card.id)) updated.delete(card.id);
    else updated.set(card.id, card);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...updated.values()]));
    } catch {
      const region = $("details").open ? "detail-feedback" : "action-feedback";
      feedback(region, "O navegador não conseguiu salvar os favoritos.", "warning");
      return;
    }
    favorites = updated;
    renderFavorites();
    if (!button.isConnected) {
      const remaining = $("saved").querySelector("button");
      (remaining ?? $("saved-empty")).focus();
    }
  });

  const saved = favorites.has(card.id);
  button.setAttribute("aria-pressed", String(saved));
  button.setAttribute("aria-label", (saved ? "Remover dos favoritos: " : "Salvar nos favoritos: ") + card.name);
  button.textContent = compact ? (saved ? "★" : "☆") : (saved ? "★ Remover dos favoritos" : "☆ Salvar nos favoritos");
  return button;
}

function makeTile(card) {
  const column = node("div", "col");
  const tile = node("article", "card-tile");
  const preview = node("button", "preview-button");
  preview.type = "button";
  preview.setAttribute("aria-label", "Ver ficha de " + card.name);
  preview.addEventListener("click", () => showCard(card));

  const mainImage = card.image_uris?.normal ?? card.card_faces?.[0]?.image_uris?.normal;
  const caption = node("span", "tile-caption");
  caption.append(node("strong", "", card.name), node("small", "", card.set_name));
  preview.append(cardImage(mainImage, "", "card-art"), caption);
  tile.append(preview, makeSaveButton(card, true));
  column.append(tile);
  return column;
}

function renderFavorites() {
  $("saved-count").textContent = favorites.size;
  $("saved-empty").hidden = favorites.size > 0;
  $("saved-empty").tabIndex = -1;
  $("saved").replaceChildren(...Array.from(favorites.values(), makeTile));
  updateSaveButtons();
}

function showCard(card, label) {
  const layout = node("div", "detail-layout");
  const images = node("div", "detail-images");
  const info = node("div", "");
  const faces = card.card_faces ?? [];
  const imageFaces = card.image_uris ? [card] : faces.length ? faces : [card];

  for (const face of imageFaces) {
    images.append(cardImage(face.image_uris?.normal, face.name, "card-art"));
  }
  if (label) info.append(node("p", "eyebrow mb-1", label));
  const title = node("h2", "", card.name);
  title.id = "detail-title";
  info.append(title, node("p", "muted", card.set_name));

  for (const face of faces.length ? faces : [card]) {
    if (face !== card) info.append(node("h3", "h6", face.name));
    if (face.mana_cost) info.append(node("p", "mb-1", "Custo de mana: " + face.mana_cost));
    info.append(node("p", "mb-2", face.type_line), node("p", "rules", face.oracle_text));
  }

  const status = node("div", "mt-2");
  status.id = "detail-feedback";
  status.setAttribute("role", "status");
  info.append(makeSaveButton(card, false), status);
  layout.append(images, info);
  $("detail-content").replaceChildren(layout);
  $("details").showModal();
}

$("filters").addEventListener("submit", (event) => {
  event.preventDefault();
  if (!$("apply").disabled) searchCards();
});
$("lookup").addEventListener("submit", (event) => {
  event.preventDefault();
  if (!$("find").disabled) openFromApi("name");
});
$("random").addEventListener("click", () => openFromApi("random"));
$("more").addEventListener("click", () => searchCards(true));
$("retry-search").addEventListener("click", () => searchCards());
$("retry-sets").addEventListener("click", async () => {
  if (await loadSets() && !$("apply").disabled) await searchCards();
});

async function start() {
  renderFavorites();
  $("apply").disabled = true;
  $("random").disabled = true;
  await loadSets();
  $("random").disabled = false;
  await searchCards();
}

start();
