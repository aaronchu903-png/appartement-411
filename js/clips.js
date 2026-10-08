/* L’Appartement 411 — fixed Day 1 recordings (v0.1.3).
 * Qwen3-TTS 1.7B (Apache-2.0), synthetic designed voices (no real person cloned); rendered offline 2026-10-08.
 * Source files: audio/d1/<lineId>.mp3 (from audio-candidates/qwen3-tts/mp3). Founder chose this engine 2026-10-08 15:25 PT.
 * The single-file build (tools/build.mjs) replaces 'files' with base64 data URIs so the HTML works offline. */
(function (root) {
  'use strict';
  var IDS = ['bl_ask','bl_bonjour','bl_lea','cam_ask','cam_bonjour','cam_bye','cam_intro','cam_plante','cam_soif','noe_croissant','noe_intro','noe_moi','noe_secret','pr_cam_ask','pr_cam_intro','pr_noe_ask','pr_noe_intro','test_camille','test_noe'];
  var files = {};
  IDS.forEach(function (id) { files[id] = 'audio/d1/' + id + '.mp3'; });
  root.A411 = root.A411 || {};
  root.A411.CLIPS = { source: 'recording:qwen3-tts', engine: 'Qwen3-TTS', credit: 'Voices: Qwen3-TTS (Apache-2.0), synthetic designed voices', ids: IDS, files: files };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.A411.CLIPS;
})(typeof window !== 'undefined' ? window : globalThis);
