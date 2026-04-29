import { secureRandom, secureRandomInt } from './gameLogic';

// Romanized sounds representing single Kanji characters
const CHARS = ["ka", "bu", "ro", "yo", "ta", "fu", "ji", "ryu", "mi", "sa", "to", "chi", "ha", "ku", "no", "ma", "ga", "ze", "ra", "ki", "wa", "so", "fuji", "yama", "kaze", "maru", "sho", "ko", "den"];

export const BEYA_CONVENTIONS: Record<string, { prefixes?: string[], suffixes?: string[] }> = {
  "Kokonoe": { prefixes: ["chi"], suffixes: ["yo"] },
  "Sadogatake": { prefixes: ["ko"], suffixes: ["to"] },
  "Takasago": { prefixes: ["a"], suffixes: ["sa"] },
  "Kasugano": { prefixes: ["to"], suffixes: ["chi"] },
  "Miyagino": { prefixes: ["ha"], suffixes: ["ku"] },
  "Tokitsukaze": { prefixes: ["to"], suffixes: ["ki"] },
  "Isegahama": { prefixes: ["te"], suffixes: ["fu"] },
  "Oitekaze": { prefixes: ["da"], suffixes: ["sho"] },
  "Sakaigawa": { prefixes: ["ro"], suffixes: ["yu"] },
  "Tatsunami": { prefixes: ["mi"], suffixes: ["ryu"] },
  "Kise": { prefixes: ["ki"], suffixes: ["ra"] },
  "Tagonoura": { prefixes: ["ta"], suffixes: ["go"] },
  "Shibatayama": { prefixes: ["ho"], suffixes: ["ku"] },
  "Arashio": { prefixes: ["wa"], suffixes: ["ka"] },
  "Asahiyama": { prefixes: ["a"], suffixes: ["sa"] },
  "Michinoku": { prefixes: ["ki"], suffixes: ["ya"] }
};

export function generateShikona(beya: string, existingNames: Set<string>): string {
  let attempts = 0;
  
  while (attempts < 500) {
    attempts++;
    
    // Choose 2-4 parts to make up the name (representing 2-4 Kanji)
    const convention = BEYA_CONVENTIONS[beya];
    
    // Weighted length: mostly 3 parts, then 2 parts, sometimes 4 parts.
    const rand = secureRandom();
    let partCount = 3;
    if (rand < 0.25) partCount = 2;
    else if (rand > 0.85) partCount = 4;
    
    const parts: string[] = [];
    // Track parts used *in this attempt* to avoid repetition
    const usedInName = new Set<string>();

    for (let i = 0; i < partCount; i++) {
        let choice = "";
        let found = false;
        
        // Try to find a unique part up to 10 times
        for(let j = 0; j < 10; j++) {
            if (i === 0 && convention && secureRandom() < 0.7) {
                choice = convention.prefixes?.[secureRandomInt(convention.prefixes.length) - 1] || CHARS[secureRandomInt(CHARS.length) - 1];
            } else if (i === partCount - 1 && convention && secureRandom() < 0.7) {
                choice = convention.suffixes?.[secureRandomInt(convention.suffixes.length) - 1] || CHARS[secureRandomInt(CHARS.length) - 1];
            } else {
                choice = CHARS[secureRandomInt(CHARS.length) - 1];
            }

            if (!usedInName.has(choice)) {
                found = true;
                break;
            }
        }
        
        // If couldn't find a unique one, just force one (it'll be a duplicate, but we'll accept it to continue)
        parts.push(choice);
        usedInName.add(choice);
    }
    
    // Capitalize only first part, rest lowercase
    let name = parts.join('');
    name = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
    
    // Ensure name is within 2-5 kanji-length (parts) which are already handled by partCount logic
    if (existingNames.has(name) || name.length < 2) {
      continue;
    }
    
    existingNames.add(name);
    return name;
  }
  
  const fallback = "R" + (secureRandomInt(1000));
  existingNames.add(fallback);
  return fallback;
}
