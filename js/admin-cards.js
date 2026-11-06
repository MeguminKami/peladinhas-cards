import { SHOP_CARDS, SHOP_ARCHIVED_CARDS } from "./casino-shop-catalog.js";
import { CARD_POLICY, durationName } from "./card-achievements.js";
import { applyCardDesign } from "./card-design.js";
import * as DB from "./db.js";
import { cardWeek } from "./card-week.js";
import { PHOTO_FIELDS, freePhotoDesign, cardPhotoStyles } from "./card-photo.js";
import {
  CATALOG_THEMES,
  COLLECTION_EDITIONS,
  ATTRIBUTES,
  themeName as standardThemeName,
  clamp,
} from "./utils.js";
import { card, bindImages, currentCardTheme } from "./cards.js";
import { esc, pageHead, empty, linkButton, busy, toast, modal } from "./ui.js";
import { icon } from "./icons.js";
const themeName = id => SHOP_CARDS.find(card => card.id === id)?.name || standardThemeName(id);
export async function editWeeklyCardPhotoPage(ctx, uid) {
  const players = ctx.league.players;
  const player = players.find((p) => p.uid === uid);
  if (!player)
    return ctx.render(
      `${pageHead("Administração", "Cartas")}${empty("Sem jogadores", "Adiciona jogadores para consultar as cartas.")}`,
    );
  const cycle = ctx.league.cycle || cardWeek(),
    locked = cycle.phase !== "open" || player.cardLocked;
  const theme = currentCardTheme(player);
  let file = null,
    objectURL = "",
    drag = null;
  const shop = [...SHOP_CARDS, ...SHOP_ARCHIVED_CARDS].some(item => item.id === theme || `casino-shop-${item.id}` === theme);
  const originalDesign = freePhotoDesign(player.cardPhoto?.design, { shop });
  const control = (key, label, unit = "%") => {
    const [, , min, max] = PHOTO_FIELDS.find(([name]) => name === key);
    return `<label class="weekly-photo-control" for="weekly-${key}"><span>${label}<output data-photo-value="${key}" data-unit="${unit}">${Number(originalDesign[key].toFixed(1))}${unit}</output></span><input id="weekly-${key}" type="range" name="${key}" min="${min}" max="${max}" step="0.1" value="${originalDesign[key]}"></label>`;
  };
  ctx.render(
    `${pageHead("Perfil do jogador", "Editar foto de carta", player.displayName || player.username, linkButton(`#/player/${player.uid}`, "Voltar ao perfil", "secondary", "players"))}<section class="panel card-types-toolbar"><span class="pill ${locked ? "warning" : "success"}">${esc(cycle.weekId)} · ${locked ? "Fechada" : "Aberta"}</span><span>Tipo atual: <b>${esc(themeName(theme))}</b></span></section><div class="weekly-photo-layout"><section class="panel weekly-photo-stage"><div class="section-head"><h2 id="weekly-preview-type"></h2><span class="pill">Pré-visualização</span></div><div id="weekly-card-preview" tabindex="0" aria-label="Fotografia da carta: usa as setas para mover"></div><p class="muted small">A imagem pode ultrapassar a moldura. O texto da carta fica por cima.</p></section><section class="panel weekly-photo-editor"><h2>Fotografia desta semana</h2><p class="muted">A fotografia do perfil mantém-se independente.</p>${locked ? '<p class="pill warning">Carta fechada: fotografia bloqueada.</p>' : ""}<form id="weekly-photo-form"><fieldset ${locked ? "disabled" : ""}><label>Carregar imagem<input name="file" type="file" accept="image/jpeg,image/png,image/webp"></label><p class="muted small">JPG, PNG ou WebP até 5 MB. Mantém proporções e transparência.</p><label>Ou usar URL de imagem<input name="photoURL" type="url" placeholder="https://…" value="${esc(player.cardPhoto?.photoURL || "")}" maxlength="2000"></label><p class="muted small" id="weekly-photo-help">Arrasta a imagem livremente, mesmo para fora da moldura. Usa as setas para afinar e Shift para mover mais depressa.</p><div class="weekly-photo-ranges weekly-photo-primary">${control("photoScale", "Tamanho")}${control("photoRotate", "Rotação", "°")}</div><button type="button" id="reset-photo-adjustments" class="btn btn-secondary">Repor ajustes</button><details class="weekly-photo-advanced"><summary>Posição e recorte</summary><div class="weekly-photo-ranges">${control("photoX", "Posição horizontal")}${control("photoY", "Posição vertical")}</div><div class="form-grid"><label>Imagem<select name="fit"><option value="contain">Mostrar imagem inteira</option><option value="cover">Recortar para preencher</option></select></label><label>Recorte inferior<select name="fade"><option value="soft">Suave</option><option value="none">Sem efeito</option></select></label></div><div class="weekly-photo-ranges weekly-photo-focus">${control("focusX", "Foco horizontal")}${control("focusY", "Foco vertical")}</div></details><input type="hidden" name="photoWidth" value="${originalDesign.photoWidth}"><input type="hidden" name="photoHeight" value="${originalDesign.photoHeight}"><div class="actions"><button id="save-weekly-photo" class="btn btn-primary">Guardar fotografia semanal</button><button type="button" id="reset-weekly-photo" class="btn btn-secondary">Usar fotografia do perfil</button></div></fieldset></form></section></div>`,
  );
  const form = document.querySelector("#weekly-photo-form"),
    preview = document.querySelector("#weekly-card-preview");
  form.elements.fit.value = originalDesign.fit;
  form.elements.fade.value = originalDesign.fade;
  const readDesign = () => ({
    ...Object.fromEntries(
      PHOTO_FIELDS.map(([key]) => [key, Number(form.elements[key].value)]),
    ),
    fit: form.elements.fit.value,
    fade: form.elements.fade.value,
    placement: "free",
  });
  const photo = () => ({
    photoURL: form.elements.photoURL.value.trim(),
    design: readDesign(),
  });
  const release = () => {
    if (objectURL) URL.revokeObjectURL(objectURL);
    objectURL = "";
  };
  ctx.cleanup(release);
  let previewSource;
  const renderPreview = () => {
    const source = objectURL || form.elements.photoURL.value.trim() || player.photoURL || "";
    if (!preview.firstElementChild || source !== previewSource) {
      preview.innerHTML = card(
        { ...player, cardPhoto: photo() },
        { size: "lg", theme, preview: true },
      );
      if (objectURL) preview.querySelector(".card-photo img").src = objectURL;
      previewSource = source;
      bindImages(preview);
    }
    const design = readDesign(), styles = cardPhotoStyles(design);
    preview.querySelector(".card-photo").style.cssText = styles.photo;
    preview.querySelector(".card-photo img").style.cssText = styles.image;
    form.querySelectorAll("[data-photo-value]").forEach(output => {
      output.textContent = `${Number(design[output.dataset.photoValue].toFixed(1))}${output.dataset.unit}`;
    });
    form.querySelector(".weekly-photo-focus").hidden = design.fit !== "cover";
    document.querySelector("#weekly-preview-type").textContent =
      themeName(theme);
  };
  form.oninput = (event) => {
    if (event.target.name === "file") return;
    if (event.target.name === "photoURL") {
      file = null;
      release();
      form.elements.file.value = "";
    }
    renderPreview();
  };
  form.elements.file.onchange = () => {
    const next = form.elements.file.files[0];
    if (!next) return;
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(next.type) ||
      next.size > 5 * 1024 * 1024
    ) {
      toast("Escolhe uma imagem JPG, PNG ou WebP até 5 MB.", "error");
      form.elements.file.value = "";
      return;
    }
    release();
    file = next;
    objectURL = URL.createObjectURL(file);
    renderPreview();
  };
  const setValue = (key, value) => {
    const field = PHOTO_FIELDS.find(([name]) => name === key);
    form.elements[key].value = Math.round(clamp(value, field[2], field[3]) * 10) / 10;
  };
  preview.onpointerdown = (event) => {
    if (
      locked ||
      form.querySelector("fieldset").disabled ||
      event.button !== 0
    )
      return;
    event.preventDefault();
    drag = {
      pointer: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      design: readDesign(),
      rect: preview.firstElementChild.getBoundingClientRect(),
    };
    preview.setPointerCapture(event.pointerId);
  };
  preview.onpointermove = (event) => {
    if (!drag || event.pointerId !== drag.pointer) return;
    const dx = ((event.clientX - drag.x) / drag.rect.width) * 100,
      dy = ((event.clientY - drag.y) / drag.rect.height) * 100;
    setValue("photoX", drag.design.photoX + dx);
    setValue("photoY", drag.design.photoY + dy);
    renderPreview();
  };
  const end = (event) => {
    if (drag && event.pointerId === drag.pointer) {
      drag = null;
    }
  };
  preview.onpointerup = end;
  preview.onpointercancel = end;
  preview.onlostpointercapture = end;
  preview.onkeydown = (event) => {
    if (
      locked ||
      form.querySelector("fieldset").disabled ||
      !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)
    )
      return;
    event.preventDefault();
    const key = ["ArrowLeft", "ArrowRight"].includes(event.key)
      ? "photoX"
      : "photoY";
    setValue(
      key,
      Number(form.elements[key].value) +
        (["ArrowRight", "ArrowDown"].includes(event.key) ? 1 : -1) * (event.shiftKey ? 5 : event.altKey ? .1 : 1),
    );
    renderPreview();
  };
  document.querySelector("#reset-photo-adjustments").onclick = () => {
    const defaults = freePhotoDesign(null, { shop });
    for (const [key] of PHOTO_FIELDS) form.elements[key].value = defaults[key];
    form.elements.fit.value = "contain";
    form.elements.fade.value = "soft";
    renderPreview();
  };
  form.onsubmit = async (event) => {
    event.preventDefault();
    if (locked) return;
    const draft = photo(),
      selectedFile = file;
    const fieldset = form.querySelector("fieldset");
    fieldset.disabled = true;
    try {
      const result = await busy(
        document.querySelector("#save-weekly-photo"),
        async () => {
          const imageBase64 = selectedFile
            ? await DB.prepareWeeklyCardPhoto(selectedFile)
            : undefined;
          return DB.callAdmin("saveWeeklyCardPhoto", {
            uid: player.uid,
            weekId: cycle.weekId,
            ...draft,
            ...(imageBase64 ? { imageBase64 } : {}),
          });
        },
      );
      if (!form.isConnected) return;
      player.cardPhoto = {
        ...draft,
        photoURL: result.data.photoURL ?? draft.photoURL,
      };
      form.elements.photoURL.value = player.cardPhoto.photoURL;
      file = null;
      form.elements.file.value = "";
      release();
      renderPreview();
      toast("Fotografia semanal guardada.");
    } catch (error) {
      toast(error.message, "error");
    } finally {
      fieldset.disabled = locked;
    }
  };
  document.querySelector("#reset-weekly-photo").onclick = async (event) => {
    if (locked) return;
    const fieldset = form.querySelector("fieldset");
    fieldset.disabled = true;
    try {
      await busy(event.currentTarget, () =>
        DB.callAdmin("saveWeeklyCardPhoto", {
          uid: player.uid,
          weekId: cycle.weekId,
          reset: true,
        }),
      );
      if (!form.isConnected) return;
      player.cardPhoto = null;
      file = null;
      release();
      form.elements.photoURL.value = "";
      form.elements.file.value = "";
      Object.entries(freePhotoDesign(null, { shop })).filter(([key]) => key !== "placement").forEach(([key, value]) => {
        form.elements[key].value = value;
      });
      renderPreview();
      toast("A carta usa novamente a fotografia do perfil.");
    } catch (error) {
      toast(error.message, "error");
    } finally {
      fieldset.disabled = locked;
    }
  };
  renderPreview();
}

export async function adminCardsPage(ctx, uid) {
  const players = ctx.league.players;
  const player = players.find((p) => p.uid === uid) || {
    uid: "catalog-preview",
    displayName: "Jogador exemplo",
    primaryPosition: "ALA",
    countryCode: "PT",
    photoURL: "./assets/default-avatar.svg",
    hasCard: true,
    ovr: 82,
    stats: Object.fromEntries(ATTRIBUTES.map(([key]) => [key, 82])),
  };
  const created = await DB.list("cardThemes");
  const entries = [
    ...CATALOG_THEMES.map((type) => ({
      id: type,
      name: themeName(type),
      baseTheme: type,
    })),
    ...SHOP_CARDS.map(card => ({ id: card.id, name: card.name, baseTheme: card.id, shop: card })),
    ...created.map((template) => ({
      ...template,
      id: `saved:${template.id}`,
      created: true,
    })),
  ];
  const previewPlayer = { ...player, cardPhoto: null };
  const decorate = (root, entry) => {
    if (entry.shop) return;
    if (!entry.created) return;
    root.classList.add("lab-designed");
    for (const [key, studio, cardVariable] of [
      ["primary", "--studio-primary", "--card-a"],
      ["secondary", "--studio-secondary", "--card-b"],
      ["text", "--studio-text", "--card-text"],
      ["border", "--studio-edge", "--card-edge"],
      ["glow", "--studio-glow", "--card-glow"],
    ]) {
      const value = entry.colors?.[key];
      if (/^#[0-9a-f]{6}$/i.test(value || "")) {
        root.style.setProperty(studio, value);
        root.style.setProperty(cardVariable, value);
      }
    }
    applyCardDesign(root, entry.design || {});
    root
      .querySelector(".card-surface")
      .insertAdjacentHTML(
        "beforeend",
        '<div class="studio-border" aria-hidden="true"></div><div class="studio-effect" aria-hidden="true"></div>',
      );
  };
  ctx.render(
    `${pageHead("Administração", "Cartas", "Catálogo de tipos padrão e criados. Escolhe um jogador apenas para pré-visualizar.")}<section class="panel card-types-toolbar"><label>Perfil na pré-visualização<select id="card-types-player"><option value="">Jogador exemplo</option>${players.map((p) => `<option value="${esc(p.uid)}" ${p.uid === uid ? "selected" : ""}>${esc(p.displayName || p.username)}</option>`).join("")}</select></label><span class="pill">${CATALOG_THEMES.length - Object.keys(COLLECTION_EDITIONS).length} padrão · ${Object.keys(COLLECTION_EDITIONS).length} novas edições · ${created.length} criados · ${SHOP_CARDS.length} na loja</span></section><div id="card-type-gallery" class="card-type-gallery saved-card-gallery">${entries.map((entry, index) => `<button type="button" class="card-type-tile" data-card-type="${esc(entry.id)}" data-catalog-index="${index}" aria-label="Pré-visualizar ${esc(entry.name)}">${card(previewPlayer, { size: "sm", theme: entry.baseTheme || "custom-test", preview: true })}<span>${esc(entry.name)}</span><small class="muted">${entry.id === "scrap" ? "Carta base · 0–49 OVR" : entry.shop ? `Loja · ${entry.shop.minOvr} OVR · ${entry.shop.price.toLocaleString("pt-PT")} DJC` : entry.created ? "Criada no Card Lab" : CARD_POLICY[entry.id] ? durationName(CARD_POLICY[entry.id].duration) : COLLECTION_EDITIONS[entry.id] ? "Design em reserva" : "Tipo padrão"}</small></button>`).join("")}</div>`,
  );
  document.querySelector("#card-types-player").onchange = (event) => {
    location.hash = event.target.value
      ? `#/admin/card-types/${event.target.value}`
      : "#/admin/card-types";
  };
  const gallery = document.querySelector("#card-type-gallery");
  gallery
    .querySelectorAll("[data-catalog-index]")
    .forEach((button) =>
      decorate(
        button.querySelector(".football-card"),
        entries[Number(button.dataset.catalogIndex)],
      ),
    );
  gallery.onclick = (event) => {
    const button = event.target.closest("[data-catalog-index]");
    if (!button) return;
    const entry = entries[Number(button.dataset.catalogIndex)];
    modal(
      entry.name,
      `${COLLECTION_EDITIONS[entry.id] ? `<p class="muted">${esc(COLLECTION_EDITIONS[entry.id].detail)}. ${CARD_POLICY[entry.id] ? durationName(CARD_POLICY[entry.id].duration) : "Design em reserva"}.</p>` : ""}<div class="history-card-expanded">${card(previewPlayer, { size: "lg", theme: entry.baseTheme || "custom-test", preview: true })}</div>`,
    );
    decorate(document.querySelector("#modal-root .football-card"), entry);
    if (ctx.user.role === "admin" && !entry.shop)
      document
        .querySelector("#modal-root .modal")
        .insertAdjacentHTML(
          "beforeend",
          `<div class="actions">${linkButton(`#/admin/cards/${entry.id}`, "Editar no Card Lab", "primary", "edit")}</div>`,
        );
    bindImages(document.querySelector("#modal-root"));
  };
  bindImages();
}
