const PROMPT_INJECTION =
  /\b(ignore (all )?(previous|prior|above) instructions|disregard (your )?instructions|you are now|act as (a |an )?|pretend (you('| a)?re|to be)|jailbreak|dan mode|do anything|no restrictions|system prompt|developer mode)\b/i;

const OFF_TOPIC =
  /\b(recipe|cook(ing|ed)?|ingredient|tzatziki|meal|dinner|breakfast|lunch|write (me )?(a |an )?(poem|essay|story|email|code|script|python|javascript)|translate (this|to)|homework|math problem|weather forecast|stock price|crypto)\b/i;

const IN_SCOPE =
  /\b(mets|ny\s*mets|new york mets|citifield|citi field|mlb|baseball|nl east|game\b|games\b|pitch|lineup|bullpen|starter|inning|score|won|lost|win|series|postseason|wildcard|soto|lindor|alonso|cohen|steve cohen|senga|d[ií]az|degrom|seaver|wright|beltran|mcneil|nimmo|marte|manaea|opener|doubleheader|spring training|farm system|prospect|trade deadline|free agent|manager|mendoza|stearns|world series|braves|phillies|dodgers|yankees|national league)\b/i;

export const OUT_OF_SCOPE_REPLY =
  "Not my lane — I only cover the Mets. Ask about last night's game or what's on tap today.";

export function isInMetsScope(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length === 0) return false;

  if (PROMPT_INJECTION.test(trimmed) || OFF_TOPIC.test(trimmed)) return false;
  if (IN_SCOPE.test(trimmed)) return true;

  // Short replies like "thanks" or "nice" — let the model stay brief in character.
  if (trimmed.length <= 40 && !/\?/.test(trimmed)) return true;

  // Open-ended questions with no Mets/baseball cues are out of scope.
  if (
    /\?/.test(trimmed) ||
    /^(what|how|why|when|where|who|can you|could you|please|tell me|give me)/i.test(trimmed)
  ) {
    return false;
  }

  return true;
}
