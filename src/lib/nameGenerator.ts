import { secureRandom, secureRandomInt } from './gameLogic';

export interface NamePart {
  romaji: string;
  kanji: string;
}

export const KANJI_PARTS: NamePart[] = [
  { romaji: "ka", kanji: "翔" },
  { romaji: "bu", kanji: "武" },
  { romaji: "ro", kanji: "浪" },
  { romaji: "yo", kanji: "代" },
  { romaji: "ta", kanji: "太" },
  { romaji: "fu", kanji: "風" },
  { romaji: "ji", kanji: "司" },
  { romaji: "ryu", kanji: "龍" },
  { romaji: "mi", kanji: "海" },
  { romaji: "umi", kanji: "海" },
  { romaji: "sa", kanji: "佐" },
  { romaji: "to", kanji: "翔" },
  { romaji: "chi", kanji: "千" },
  { romaji: "ha", kanji: "白" },
  { romaji: "ku", kanji: "鵬" },
  { romaji: "no", kanji: "乃" },
  { romaji: "ma", kanji: "真" },
  { romaji: "ga", kanji: "雅" },
  { romaji: "ze", kanji: "勢" },
  { romaji: "ra", kanji: "良" },
  { romaji: "ki", kanji: "輝" },
  { romaji: "wa", kanji: "和" },
  { romaji: "so", kanji: "蒼" },
  { romaji: "fuji", kanji: "富士" },
  { romaji: "yama", kanji: "山" },
  { romaji: "kaze", kanji: "風" },
  { romaji: "maru", kanji: "丸" },
  { romaji: "sho", kanji: "将" },
  { romaji: "ko", kanji: "琴" },
  { romaji: "den", kanji: "電" },
  { romaji: "yasu", kanji: "安" },
  { romaji: "taka", kanji: "貴" },
  { romaji: "nami", kanji: "波" },
  { romaji: "ou", kanji: "王" },
  { romaji: "tsuru", kanji: "鶴" },
  { romaji: "kiri", kanji: "霧" },
  { romaji: "kawa", kanji: "川" },
  { romaji: "gawa", kanji: "川" },
  { romaji: "shima", kanji: "島" },
  { romaji: "jima", kanji: "島" },
  { romaji: "tani", kanji: "谷" },
  { romaji: "mori", kanji: "森" },
  { romaji: "hayashi", kanji: "林" },
  { romaji: "matsu", kanji: "松" },
  { romaji: "sugi", kanji: "杉" },
  { romaji: "sakura", kanji: "桜" },
  { romaji: "hana", kanji: "花" },
  { romaji: "take", kanji: "竹" },
  { romaji: "tsuki", kanji: "月" },
  { romaji: "hoshi", kanji: "星" },
  { romaji: "hikari", kanji: "光" },
  { romaji: "arashi", kanji: "嵐" },
  { romaji: "yuki", kanji: "雪" },
  { romaji: "hara", kanji: "原" },
  { romaji: "sato", kanji: "里" },
  { romaji: "numa", kanji: "沼" },
  { romaji: "ike", kanji: "池" },
  { romaji: "iwa", kanji: "岩" },
  { romaji: "ishi", kanji: "石" },
  { romaji: "hama", kanji: "浜" },
  { romaji: "oka", kanji: "岡" },
  { romaji: "aka", kanji: "赤" },
  { romaji: "ao", kanji: "青" },
  { romaji: "mido", kanji: "緑" },
  { romaji: "kuro", kanji: "黒" },
  { romaji: "shiro", kanji: "白" },
  { romaji: "kin", kanji: "金" },
  { romaji: "gin", kanji: "銀" },
  { romaji: "tora", kanji: "虎" },
  { romaji: "kuma", kanji: "熊" },
  { romaji: "washi", kanji: "鷲" },
  { romaji: "ryu", kanji: "竜" },
  { romaji: "ho", kanji: "鵬" },
  { romaji: "dai", kanji: "大" },
  { romaji: "o", kanji: "大" },
  { romaji: "sho", kanji: "小" },
  { romaji: "go", kanji: "豪" },
  { romaji: "kyoku", kanji: "旭" },
  { romaji: "yutaka", kanji: "豊" },
  { romaji: "tomo", kanji: "友" },
  { romaji: "yoshi", kanji: "嘉" },
  { romaji: "katsu", kanji: "勝" },
  { romaji: "sei", kanji: "正" },
  { romaji: "shin", kanji: "新" },
  { romaji: "haru", kanji: "春" },
  { romaji: "natsu", kanji: "夏" },
  { romaji: "aki", kanji: "秋" },
  { romaji: "fuyu", kanji: "冬" },
  { romaji: "nishiki", kanji: "錦" },
  { romaji: "waka", kanji: "若" },
  { romaji: "taro", kanji: "太郎" },
  { romaji: "jiro", kanji: "次郎" },
  { romaji: "goro", kanji: "五郎" },
  { romaji: "ken", kanji: "健" },
  { romaji: "ko", kanji: "光" },
  { romaji: "tsuyoshi", kanji: "剛" },
];

export const BEYA_CONVENTIONS: Record<string, { prefixes?: NamePart[], suffixes?: NamePart[] }> = {
  "Kokonoe": { prefixes: [{ romaji: "chiyo", kanji: "千代" }] },
  "Sadogatake": { prefixes: [{ romaji: "koto", kanji: "琴" }] },
  "Takasago": { prefixes: [{ romaji: "asa", kanji: "朝" }] },
  "Kasugano": { prefixes: [{ romaji: "tochi", kanji: "栃" }] },
  "Miyagino": { prefixes: [{ romaji: "haku", kanji: "白" }] },
  "Tokitsukaze": { prefixes: [{ romaji: "toki", kanji: "時" }] },
  "Isegahama": { prefixes: [{ romaji: "teru", kanji: "照" }] },
  "Oitekaze": { prefixes: [{ romaji: "dai", kanji: "大" }] },
  "Sakaigawa": { prefixes: [{ romaji: "go", kanji: "豪" }] },
  "Tatsunami": { suffixes: [{ romaji: "ryu", kanji: "龍" }] },
  "Kise": { prefixes: [{ romaji: "ki", kanji: "木" }] },
  "Tagonoura": { prefixes: [{ romaji: "taka", kanji: "高" }] },
  "Shibatayama": { prefixes: [{ romaji: "waka", kanji: "若" }] },
  "Arashio": { prefixes: [{ romaji: "soko", kanji: "蒼国" }] },
  "Asahiyama": { prefixes: [{ romaji: "asa", kanji: "旭" }] },
  "Michinoku": { prefixes: [{ romaji: "kiri", kanji: "霧" }] }
};

export function generateShikona(beya: string, existingNames: Set<string>): { name: string, nameKanji: string } {
  let attempts = 0;
  
  while (attempts < 500) {
    attempts++;
    
    const convention = BEYA_CONVENTIONS[beya];
    
    const rand = secureRandom();
    let partCount = 2;
    if (rand > 0.85) partCount = 3;
    
    const parts: NamePart[] = [];
    const usedInName = new Set<string>();

    for (let i = 0; i < partCount; i++) {
        let choice: NamePart | null = null;
        let found = false;
        
        for(let j = 0; j < 10; j++) {
            if (i === 0 && convention && convention.prefixes && convention.prefixes.length > 0 && secureRandom() < 0.7) {
                choice = convention.prefixes[secureRandomInt(convention.prefixes.length) - 1];
            } else if (i === partCount - 1 && convention && convention.suffixes && convention.suffixes.length > 0 && secureRandom() < 0.7) {
                choice = convention.suffixes[secureRandomInt(convention.suffixes.length) - 1];
            } else {
                choice = KANJI_PARTS[secureRandomInt(KANJI_PARTS.length) - 1];
            }

            if (!usedInName.has(choice.romaji)) {
                found = true;
                break;
            }
        }
        
        if (!choice) choice = KANJI_PARTS[secureRandomInt(KANJI_PARTS.length) - 1];
        
        parts.push(choice);
        usedInName.add(choice.romaji);
    }
    
    let name = parts.map(p => p.romaji).join('');
    name = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
    
    let kanji = parts.map(p => p.kanji).join('');
    
    if (existingNames.has(name) || name.length < 2) {
      continue;
    }
    
    existingNames.add(name);
    return { name, nameKanji: kanji };
  }
  
  const fbRomaji = "Rikishi" + secureRandomInt(1000);
  const fbKanji = "力士" + secureRandomInt(1000);
  existingNames.add(fbRomaji);
  return { name: fbRomaji, nameKanji: fbKanji };
}
