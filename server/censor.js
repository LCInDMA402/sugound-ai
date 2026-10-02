/**
 * Production hook:
 * Replace detectSlurs() with a maintained, context-aware multilingual
 * moderation/classification service. It should return character spans:
 * [{ start: number, end: number, label: "slur" }]
 *
 * We intentionally do not ship a real slur lexicon in this repository.
 * The demo detector below recognizes only a neutral placeholder token,
 * so it cannot accidentally provide a list of offensive terms.
 */

const REPLACEMENT = "You're grounded.";

export function detectSlurs(text) {
  if (process.env.ENABLE_DEMO_SLUR_FILTER !== "true") return [];

  const detections = [];
  const token = "[demo-slur]";
  let index = text.toLowerCase().indexOf(token);

  while (index !== -1) {
    detections.push({
      start: index,
      end: index + token.length,
      label: "slur"
    });
    index = text.toLowerCase().indexOf(token, index + token.length);
  }
  return detections;
}

export function censorText(text) {
  const detections = detectSlurs(text);
  if (!detections.length) return { text, detections: [] };

  let output = "";
  let cursor = 0;

  for (const hit of detections) {
    output += text.slice(cursor, hit.start);
    output += REPLACEMENT;
    cursor = hit.end;
  }
  output += text.slice(cursor);

  return {
    text: output,
    detections: detections.map(d => ({
      ...d,
      replacement: REPLACEMENT
    }))
  };
}
