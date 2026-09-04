const PROMPT_INJECTION =
  /\b(ignore (all )?(previous|prior|above) instructions|disregard (your )?instructions|you are now|act as (a |an )?|pretend (you('| a)?re|to be)|jailbreak|dan mode|do anything|no restrictions|system prompt|developer mode)\b/i;

const OFF_TOPIC =
  /\b(recipe|cook(ing|ed)?|ingredient|tzatziki|meal|dinner|breakfast|lunch|write (me )?(a |an )?(poem|essay|story|email|code|script|python|javascript)|translate (this|to)|homework|math problem|weather forecast|stock price|crypto)\b/i;

export const OUT_OF_SCOPE_REPLY =
  "Not my lane — I only cover the Mets. Ask about last night's game or what's on tap today.";

export function isInMetsScope(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length === 0) return false;
  if (PROMPT_INJECTION.test(trimmed) || OFF_TOPIC.test(trimmed)) return false;
  return true;
}
