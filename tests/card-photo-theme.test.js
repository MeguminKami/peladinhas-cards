import test from "node:test";
import assert from "node:assert/strict";
import { card, currentCardTheme } from "../js/cards.js";
import { freePhotoDesign, validPhotoDesign, cardPhotoStyles } from "../js/card-photo.js";

const player = {
  uid: "preview", displayName: "Jogador", hasCard: true, ovr: 85,
  cardType: "gold-common",
  specials: [{ id: "in-form" }, { id: "football-p3" }],
};

test("current appearance honours the selected edition instead of the first special", () => {
  const selected = { ...player, selectedCardId: "football-p3" };
  assert.equal(currentCardTheme(selected), "football-p3");
  assert.match(card(selected, { preview: true }), /sca-football-p3/);
});
test("selected base and unavailable selections keep the profile fallbacks", () => {
  assert.equal(currentCardTheme({ ...player, selectedCardId: "base" }), "gold-common");
  assert.equal(currentCardTheme({ ...player, selectedCardId: "expired" }), "in-form");
  assert.equal(currentCardTheme({ ...player, specials: [] }), "gold-common");
  assert.equal(currentCardTheme({ ...player, selectedCardId: "base", ovr: 45 }), "scrap");
});
test("explicit catalogue previews still override the current appearance", () => {
  assert.match(card({ ...player, selectedCardId: "football-p3" }, {
    preview: true, theme: "silver-common",
  }), /card-md silver-common/);
});
test("free ADMIN placement preserves the default shop composition and validates on save", () => {
  const design = freePhotoDesign(null, { shop: true });
  assert.equal(design.photoX, 33);
  assert.ok(Math.abs(design.photoY - 19.82) < .001);
  assert.equal(design.photoWidth, 54);
  assert.ok(Math.abs(design.photoHeight - 36.18) < .001);
  assert.equal(design.fit, "contain");
  assert.ok(validPhotoDesign(design));
  assert.deepEqual(freePhotoDesign(design, { shop: true }), design);
  assert.match(cardPhotoStyles(design, { bounded: true }).photo, /overflow:visible/);
  assert.equal(validPhotoDesign({ ...design, placement: "unknown" }), false);
  assert.equal(validPhotoDesign({ ...design, photoX: Infinity }), false);
});
