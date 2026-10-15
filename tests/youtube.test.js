import test from "node:test";
import assert from "node:assert/strict";
import { youtubeVideoId, youtubePlayer } from "../js/youtube.js";
test("YouTube: formatos suportados, vazio e URLs não seguros", () => {
  const id = "dQw4w9WgXcQ";
  for (const url of [
    `https://www.youtube.com/watch?v=${id}&t=12`,
    `https://youtu.be/${id}?si=example`,
    `https://m.youtube.com/shorts/${id}`,
    `https://www.youtube.com/live/${id}`,
    `https://www.youtube-nocookie.com/embed/${id}`,
  ])
    assert.equal(youtubeVideoId(url), id);
  assert.equal(youtubeVideoId(""), "");
  for (const url of [
    "javascript:alert(1)",
    "https://youtube.com.evil.com/watch?v=" + id,
    "https://evil.com/" + id,
    "https://youtube.com/playlist?list=example",
    "https://youtube.com/watch?v=short",
    "https://evil@youtube.com/watch?v=" + id,
  ])
    assert.equal(youtubeVideoId(url), null);
  assert.equal(youtubePlayer("<script>"), "");
  assert.match(youtubePlayer(id), /youtube-nocookie.com\/embed\//);
});
