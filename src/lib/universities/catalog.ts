/**
 * University catalog used by the directory and the JapanUniMatch recommender.
 *
 * What each entry asserts (and what it does not):
 *  - type, city/prefecture and region: institutional facts.
 *  - fields: the broad areas the university has faculties or graduate schools in.
 *  - tags:
 *      sgu-a / sgu-b  MEXT "Top Global University Project" (2014): Top type / Global traction type.
 *      g30            MEXT "Global 30" project universities.
 *      english-ug     has a well-known English-taught bachelor's track (check current intake).
 *      research       research-intensive / strong graduate schools.
 *      grad-only      graduate-only institution (no bachelor's admissions).
 *      women          women's university (undergraduate admission is for women).
 *      funded         admitted PhD students are funded by the institution.
 *  - tier: a rough academic selectivity band (1 = most competitive, 3 = most accessible),
 *    used only to label recommendations as reach / match / safe. It is not a ranking.
 * Program-level details (language, intake, requirements) are NOT asserted here;
 * admins add verified programs per university.
 */

import type { FieldId, RegionId, UniversityTag } from "./taxonomy";

export { FIELDS, REGIONS, TAGS, TAG_LABELS, fieldLabel, regionLabel, type FieldId, type RegionId, type UniversityTag } from "./taxonomy";

const PREFECTURE_REGION: Record<string, RegionId> = {
  Hokkaido: "hokkaido-tohoku", Aomori: "hokkaido-tohoku", Iwate: "hokkaido-tohoku", Miyagi: "hokkaido-tohoku", Akita: "hokkaido-tohoku", Yamagata: "hokkaido-tohoku", Fukushima: "hokkaido-tohoku",
  Ibaraki: "kanto", Tochigi: "kanto", Gunma: "kanto", Saitama: "kanto", Chiba: "kanto", Tokyo: "kanto", Kanagawa: "kanto",
  Niigata: "chubu", Toyama: "chubu", Ishikawa: "chubu", Fukui: "chubu", Yamanashi: "chubu", Nagano: "chubu", Gifu: "chubu", Shizuoka: "chubu", Aichi: "chubu",
  Mie: "kansai", Shiga: "kansai", Kyoto: "kansai", Osaka: "kansai", Hyogo: "kansai", Nara: "kansai", Wakayama: "kansai",
  Tottori: "chugoku-shikoku", Shimane: "chugoku-shikoku", Okayama: "chugoku-shikoku", Hiroshima: "chugoku-shikoku", Yamaguchi: "chugoku-shikoku", Tokushima: "chugoku-shikoku", Kagawa: "chugoku-shikoku", Ehime: "chugoku-shikoku", Kochi: "chugoku-shikoku",
  Fukuoka: "kyushu-okinawa", Saga: "kyushu-okinawa", Nagasaki: "kyushu-okinawa", Kumamoto: "kyushu-okinawa", Oita: "kyushu-okinawa", Miyazaki: "kyushu-okinawa", Kagoshima: "kyushu-okinawa", Okinawa: "kyushu-okinawa",
};

/** Large cities (for the "big city / smaller city" preference). */
const METRO = new Set(["Tokyo", "Yokohama", "Osaka", "Nagoya", "Kyoto", "Kobe", "Fukuoka", "Sapporo", "Sendai", "Hiroshima", "Kawasaki", "Saitama", "Chiba", "Kitakyushu", "Suita", "Machida"]);

export type CatalogUniversity = {
  name: string;
  type: "national" | "public" | "private";
  city: string;
  prefecture: string;
  region: RegionId;
  metro: boolean;
  fields: FieldId[];
  tags: UniversityTag[];
  tier: 1 | 2 | 3;
};

type T = CatalogUniversity["type"];
function u(name: string, type: T, city: string, prefecture: string, fields: string, tier: 1 | 2 | 3, tags = ""): CatalogUniversity {
  const region = PREFECTURE_REGION[prefecture];
  if (!region) throw new Error(`Unknown prefecture for ${name}: ${prefecture}`);
  return {
    name,
    type,
    city,
    prefecture,
    region,
    metro: city.split(/\s*\/\s*/).some((c) => METRO.has(c)),
    fields: fields.split(" ").filter(Boolean) as FieldId[],
    tags: tags.split(" ").filter(Boolean) as UniversityTag[],
    tier,
  };
}

// Field shorthands
const FULL = "eng cs sci med agri biz soc hum edu";
const FULL_NO_AGRI = "eng cs sci med biz soc hum edu";
const TECH = "eng cs sci";

export const CATALOG: CatalogUniversity[] = [
  // ------------------------------ National ------------------------------
  u("The University of Tokyo", "national", "Tokyo", "Tokyo", FULL, 1, "sgu-a g30 english-ug research"),
  u("Kyoto University", "national", "Kyoto", "Kyoto", FULL, 1, "sgu-a g30 english-ug research"),
  u("Osaka University", "national", "Osaka", "Osaka", FULL_NO_AGRI, 1, "sgu-a g30 english-ug research"),
  u("Tohoku University", "national", "Sendai", "Miyagi", FULL, 1, "sgu-a g30 english-ug research"),
  u("Hokkaido University", "national", "Sapporo", "Hokkaido", FULL, 1, "sgu-a english-ug research"),
  u("Nagoya University", "national", "Nagoya", "Aichi", FULL, 1, "sgu-a g30 english-ug research"),
  u("Kyushu University", "national", "Fukuoka", "Fukuoka", `${FULL} arts`, 1, "sgu-a g30 english-ug research"),
  u("Institute of Science Tokyo", "national", "Tokyo", "Tokyo", "eng cs sci med", 1, "sgu-a english-ug research"),
  u("University of Tsukuba", "national", "Tsukuba", "Ibaraki", `${FULL} arts`, 1, "sgu-a g30 english-ug research"),
  u("Hiroshima University", "national", "Hiroshima", "Hiroshima", FULL, 2, "sgu-a english-ug research"),
  u("Kobe University", "national", "Kobe", "Hyogo", FULL, 2, "research"),
  u("Okayama University", "national", "Okayama", "Okayama", FULL, 2, "sgu-b english-ug research"),
  u("Chiba University", "national", "Chiba", "Chiba", FULL, 2, "sgu-b research"),
  u("Yokohama National University", "national", "Yokohama", "Kanagawa", "eng cs sci biz soc edu", 2, "research"),
  u("Tokyo University of Agriculture and Technology", "national", "Tokyo", "Tokyo", "eng cs sci agri", 2, "research"),
  u("The University of Electro-Communications", "national", "Tokyo", "Tokyo", TECH, 2, "research"),
  u("Kyoto Institute of Technology", "national", "Kyoto", "Kyoto", "eng cs arts", 2, "sgu-b"),
  u("Kyushu Institute of Technology", "national", "Kitakyushu", "Fukuoka", "eng cs", 3, "research"),
  u("Nara Institute of Science and Technology", "national", "Ikoma", "Nara", TECH, 2, "sgu-b grad-only research"),
  u("Japan Advanced Institute of Science and Technology", "national", "Nomi", "Ishikawa", "cs eng sci", 2, "grad-only research"),
  u("Saitama University", "national", "Saitama", "Saitama", "eng cs sci biz soc hum edu", 3),
  u("Shizuoka University", "national", "Shizuoka", "Shizuoka", "eng cs sci agri soc hum edu", 3),
  u("Niigata University", "national", "Niigata", "Niigata", FULL, 3, "research"),
  u("Kanazawa University", "national", "Kanazawa", "Ishikawa", FULL_NO_AGRI, 2, "sgu-b research"),
  u("Shinshu University", "national", "Matsumoto", "Nagano", FULL, 3),
  u("Mie University", "national", "Tsu", "Mie", "eng sci med agri hum edu", 3),
  u("Gifu University", "national", "Gifu", "Gifu", "eng sci med agri edu", 3),
  u("Yamaguchi University", "national", "Yamaguchi", "Yamaguchi", "eng sci med agri biz hum edu", 3),
  u("Tokushima University", "national", "Tokushima", "Tokushima", "eng sci med soc", 3),
  u("Ehime University", "national", "Matsuyama", "Ehime", "eng sci med agri soc hum edu", 3),
  u("Nagasaki University", "national", "Nagasaki", "Nagasaki", "eng sci med biz edu", 3),
  u("Kumamoto University", "national", "Kumamoto", "Kumamoto", FULL_NO_AGRI, 2, "sgu-b research"),
  u("University of Miyazaki", "national", "Miyazaki", "Miyazaki", "eng sci med agri edu", 3),
  u("Saga University", "national", "Saga", "Saga", "eng sci med agri biz edu arts", 3),
  u("University of the Ryukyus", "national", "Nishihara", "Okinawa", "eng sci med agri soc hum edu", 3),
  u("Akita University", "national", "Akita", "Akita", "eng sci med edu", 3),
  u("Iwate University", "national", "Morioka", "Iwate", "eng sci agri hum edu", 3),
  u("Yamagata University", "national", "Yamagata", "Yamagata", "eng sci med agri hum edu", 3),
  u("University of Fukui", "national", "Fukui", "Fukui", "eng sci med edu", 3),
  u("Tottori University", "national", "Tottori", "Tottori", "eng sci med agri", 3),
  u("Shimane University", "national", "Matsue", "Shimane", "sci med agri hum edu", 3),
  u("Kagawa University", "national", "Takamatsu", "Kagawa", "eng sci med agri biz soc edu", 3),
  u("Kochi University", "national", "Kochi", "Kochi", "sci med agri hum edu", 3),
  u("Oita University", "national", "Oita", "Oita", "eng sci med biz edu", 3),
  u("Otaru University of Commerce", "national", "Otaru", "Hokkaido", "biz soc", 3),
  u("Hitotsubashi University", "national", "Tokyo", "Tokyo", "biz soc hum", 1, "research"),
  u("National Graduate Institute for Policy Studies (GRIPS)", "national", "Tokyo", "Tokyo", "soc biz", 2, "grad-only research"),
  u("Hirosaki University", "national", "Hirosaki", "Aomori", "sci med agri hum edu", 3),
  u("Fukushima University", "national", "Fukushima", "Fukushima", "eng sci agri biz soc hum edu", 3),
  u("Ibaraki University", "national", "Mito", "Ibaraki", "eng sci agri hum edu", 3),
  u("Utsunomiya University", "national", "Utsunomiya", "Tochigi", "eng sci agri hum edu", 3),
  u("Gunma University", "national", "Maebashi", "Gunma", "eng cs sci med edu", 3),
  u("Tokyo University of Foreign Studies", "national", "Tokyo", "Tokyo", "hum soc", 2, "sgu-b"),
  u("Tokyo Gakugei University", "national", "Tokyo", "Tokyo", "edu hum sci", 3),
  u("Tokyo University of Marine Science and Technology", "national", "Tokyo", "Tokyo", "sci eng agri", 3),
  u("Tokyo University of the Arts", "national", "Tokyo", "Tokyo", "arts", 2, "sgu-b"),
  u("Ochanomizu University", "national", "Tokyo", "Tokyo", "sci hum soc edu", 2, "women"),
  u("University of Yamanashi", "national", "Kofu", "Yamanashi", "eng sci med agri edu", 3),
  u("University of Toyama", "national", "Toyama", "Toyama", "eng sci med biz hum edu", 3),
  u("Nagaoka University of Technology", "national", "Nagaoka", "Niigata", "eng cs", 2, "sgu-b"),
  u("Nagoya Institute of Technology", "national", "Nagoya", "Aichi", TECH, 2, "research"),
  u("Toyohashi University of Technology", "national", "Toyohashi", "Aichi", "eng cs", 2, "sgu-b research"),
  u("Shiga University", "national", "Hikone", "Shiga", "biz cs edu", 3),
  u("Kyoto University of Education", "national", "Kyoto", "Kyoto", "edu", 3),
  u("Osaka Kyoiku University", "national", "Kashiwara", "Osaka", "edu", 3),
  u("Nara Women's University", "national", "Nara", "Nara", "sci hum soc", 3, "women"),
  u("Wakayama University", "national", "Wakayama", "Wakayama", "eng cs biz soc edu", 3),
  u("Kagoshima University", "national", "Kagoshima", "Kagoshima", FULL, 3),
  u("Muroran Institute of Technology", "national", "Muroran", "Hokkaido", "eng cs", 3),
  u("Kitami Institute of Technology", "national", "Kitami", "Hokkaido", "eng", 3),
  u("Obihiro University of Agriculture and Veterinary Medicine", "national", "Obihiro", "Hokkaido", "agri sci", 3),
  u("Hamamatsu University School of Medicine", "national", "Hamamatsu", "Shizuoka", "med", 3),
  u("Asahikawa Medical University", "national", "Asahikawa", "Hokkaido", "med", 3),
  u("Shiga University of Medical Science", "national", "Otsu", "Shiga", "med", 3),
  u("Fukuoka University of Education", "national", "Munakata", "Fukuoka", "edu", 3),
  u("The Graduate University for Advanced Studies, SOKENDAI", "national", "Hayama", "Kanagawa", "sci cs eng hum", 2, "grad-only research"),

  // ------------------------------ Public ------------------------------
  u("Tokyo Metropolitan University", "public", "Tokyo", "Tokyo", "eng cs sci biz soc hum", 2, "research"),
  u("University of Aizu", "public", "Aizu-Wakamatsu", "Fukushima", "cs eng", 2, "sgu-b english-ug"),
  u("Akita International University", "public", "Akita", "Akita", "soc hum biz", 2, "sgu-b english-ug"),
  u("Future University Hakodate", "public", "Hakodate", "Hokkaido", "cs eng arts", 3),
  u("Osaka Metropolitan University", "public", "Osaka", "Osaka", FULL, 2, "research"),
  u("Yokohama City University", "public", "Yokohama", "Kanagawa", "sci med biz soc", 2),
  u("University of Hyogo", "public", "Kobe", "Hyogo", "eng sci biz soc hum", 3),
  u("The University of Kitakyushu", "public", "Kitakyushu", "Fukuoka", "eng cs biz soc hum", 3),
  u("Nagoya City University", "public", "Nagoya", "Aichi", "med sci biz soc hum arts", 3),
  u("Kyoto Prefectural University", "public", "Kyoto", "Kyoto", "agri sci hum soc", 3),
  u("Kyoto Prefectural University of Medicine", "public", "Kyoto", "Kyoto", "med", 3),
  u("Fukuoka Women's University", "public", "Fukuoka", "Fukuoka", "hum sci soc", 3, "women"),
  u("Shizuoka University of Art and Culture", "public", "Hamamatsu", "Shizuoka", "arts hum", 3),
  u("University of Shiga Prefecture", "public", "Hikone", "Shiga", "eng sci hum", 3),
  u("Fukui Prefectural University", "public", "Fukui", "Fukui", "agri sci biz", 3),
  u("Miyazaki Municipal University", "public", "Miyazaki", "Miyazaki", "hum", 3),
  u("Meio University", "public", "Nago", "Okinawa", "biz soc hum", 3),
  u("Kobe City University of Foreign Studies", "public", "Kobe", "Hyogo", "hum", 3),
  u("Aichi Prefectural University", "public", "Nagakute", "Aichi", "cs hum edu", 3),
  u("Aichi University of the Arts", "public", "Nagakute", "Aichi", "arts", 3),
  u("Sapporo City University", "public", "Sapporo", "Hokkaido", "arts med", 3),
  u("Iwate Prefectural University", "public", "Takizawa", "Iwate", "cs soc med", 3),
  u("Hiroshima City University", "public", "Hiroshima", "Hiroshima", "cs eng hum arts", 3),
  u("Prefectural University of Hiroshima", "public", "Hiroshima", "Hiroshima", "biz agri med hum", 3),
  u("Kochi University of Technology", "public", "Kami", "Kochi", "eng cs biz", 3),
  u("Okayama Prefectural University", "public", "Soja", "Okayama", "cs eng arts med", 3),
  u("Ishikawa Prefectural University", "public", "Nonoichi", "Ishikawa", "agri sci", 3),
  u("Toyama Prefectural University", "public", "Imizu", "Toyama", TECH, 3),
  u("Maebashi Institute of Technology", "public", "Maebashi", "Gunma", "eng", 3),
  u("Prefectural University of Kumamoto", "public", "Kumamoto", "Kumamoto", "hum biz agri", 3),
  u("University of Nagasaki", "public", "Sasebo", "Nagasaki", "biz cs soc med", 3),
  u("Miyagi University", "public", "Taiwa", "Miyagi", "biz cs agri med", 3),
  u("Yamaguchi Prefectural University", "public", "Yamaguchi", "Yamaguchi", "hum soc med", 3),
  u("Nara Prefectural University", "public", "Nara", "Nara", "soc biz", 3),
  u("University of Shizuoka", "public", "Shizuoka", "Shizuoka", "med soc biz hum", 3),
  u("Kyoto City University of Arts", "public", "Kyoto", "Kyoto", "arts", 2),
  u("Kanazawa College of Art", "public", "Kanazawa", "Ishikawa", "arts", 3),
  u("Akita Prefectural University", "public", "Akita", "Akita", "eng agri sci", 3),
  u("Aomori Public University", "public", "Aomori", "Aomori", "biz", 3),
  u("Takasaki City University of Economics", "public", "Takasaki", "Gunma", "biz soc", 3),
  u("Tsuru University", "public", "Tsuru", "Yamanashi", "edu hum soc", 3),
  u("Shimonoseki City University", "public", "Shimonoseki", "Yamaguchi", "biz cs", 3),
  u("Fukushima Medical University", "public", "Fukushima", "Fukushima", "med", 3),
  u("Okinawa Prefectural University of Arts", "public", "Naha", "Okinawa", "arts", 3),

  // ------------------------------ Private ------------------------------
  u("Waseda University", "private", "Tokyo", "Tokyo", "eng cs sci biz soc hum edu", 1, "sgu-a g30 english-ug research"),
  u("Keio University", "private", "Tokyo", "Tokyo", "eng cs sci med biz soc hum", 1, "sgu-a g30 english-ug research"),
  u("Tokyo University of Science", "private", "Tokyo", "Tokyo", TECH, 2, "research"),
  u("Sophia University", "private", "Tokyo", "Tokyo", "sci eng biz soc hum", 2, "sgu-b g30 english-ug"),
  u("International Christian University", "private", "Tokyo", "Tokyo", "hum soc sci biz edu", 2, "sgu-b english-ug"),
  u("Ritsumeikan University", "private", "Kyoto / Osaka / Shiga", "Kyoto", "eng cs sci biz soc hum med", 2, "sgu-b g30 english-ug research"),
  u("Ritsumeikan Asia Pacific University", "private", "Beppu", "Oita", "biz soc hum", 2, "sgu-b english-ug"),
  u("Doshisha University", "private", "Kyoto", "Kyoto", "eng cs sci biz soc hum", 2, "g30 english-ug"),
  u("Kwansei Gakuin University", "private", "Nishinomiya", "Hyogo", "sci eng biz soc hum edu", 2, "sgu-b"),
  u("Kansai University", "private", "Suita", "Osaka", "eng sci biz soc hum", 2),
  u("Kansai Gaidai University", "private", "Hirakata", "Osaka", "hum soc biz", 3),
  u("Meiji University", "private", "Tokyo", "Tokyo", "eng cs sci agri biz soc hum", 2, "sgu-b g30 english-ug"),
  u("Aoyama Gakuin University", "private", "Tokyo", "Tokyo", "eng cs sci biz soc hum edu", 2),
  u("Rikkyo University", "private", "Tokyo", "Tokyo", "sci biz soc hum", 2, "sgu-b english-ug"),
  u("Chuo University", "private", "Tokyo", "Tokyo", "eng cs sci biz soc hum", 2),
  u("Hosei University", "private", "Tokyo", "Tokyo", "eng cs sci biz soc hum", 2, "sgu-b english-ug"),
  u("Gakushuin University", "private", "Tokyo", "Tokyo", "sci biz soc hum", 3),
  u("Tokyo International University", "private", "Tokyo", "Tokyo", "biz soc hum", 3, "english-ug"),
  u("Temple University, Japan Campus", "private", "Tokyo", "Tokyo", "biz soc hum arts", 3, "english-ug"),
  u("International University of Japan", "private", "Minamiuonuma", "Niigata", "biz soc", 2, "sgu-b grad-only"),
  u("Nagoya University of Commerce and Business (NUCB)", "private", "Nagoya", "Aichi", "biz", 3, "english-ug"),
  u("Globis University", "private", "Tokyo", "Tokyo", "biz", 3, "grad-only"),
  u("Soka University", "private", "Tokyo", "Tokyo", "eng sci biz soc hum edu", 3, "sgu-b"),
  u("Daito Bunka University", "private", "Tokyo", "Tokyo", "biz soc hum", 3),
  u("Josai International University", "private", "Togane", "Chiba", "biz soc hum med", 3),
  u("Takushoku University", "private", "Tokyo", "Tokyo", "eng biz soc hum", 3),
  u("Reitaku University", "private", "Kashiwa", "Chiba", "biz soc hum", 3),
  u("Musashino University", "private", "Tokyo", "Tokyo", "eng cs biz soc hum edu med", 3),
  u("Showa Women's University", "private", "Tokyo", "Tokyo", "hum soc biz", 3, "women"),
  u("Bunkyo Gakuin University", "private", "Tokyo", "Tokyo", "biz soc hum med", 3),
  u("Hokkaido University of Science", "private", "Sapporo", "Hokkaido", "eng cs med", 3),
  u("Hokkaido Information University", "private", "Ebetsu", "Hokkaido", "cs biz arts", 3),
  u("Tohoku Gakuin University", "private", "Sendai", "Miyagi", "eng sci biz soc hum edu", 3),
  u("Kanagawa University", "private", "Yokohama", "Kanagawa", "eng cs sci biz soc hum", 3),
  u("Kamakura Women's University", "private", "Kamakura", "Kanagawa", "edu hum med", 3, "women"),
  u("Chukyo University", "private", "Nagoya", "Aichi", "eng cs biz soc hum", 3),
  u("Nanzan University", "private", "Nagoya", "Aichi", "eng biz soc hum", 3),
  u("Kyoto University of Foreign Studies", "private", "Kyoto", "Kyoto", "hum", 3),
  u("Kyoto Sangyo University", "private", "Kyoto", "Kyoto", "sci eng cs biz soc hum", 3),
  u("Ryukoku University", "private", "Kyoto", "Kyoto", "sci eng agri biz soc hum", 3),
  u("Kindai University", "private", "Higashiosaka", "Osaka", `${FULL} arts`, 3, "research"),
  u("Konan University", "private", "Kobe", "Hyogo", "sci biz soc hum", 3),
  u("Kobe Gakuin University", "private", "Kobe", "Hyogo", "biz soc hum med", 3),
  u("Okayama University of Science", "private", "Okayama", "Okayama", TECH, 3),
  u("Hiroshima Shudo University", "private", "Hiroshima", "Hiroshima", "biz soc hum", 3),
  u("Miyazaki International University", "private", "Miyazaki", "Miyazaki", "hum edu", 3, "english-ug"),
  u("Fukuoka University", "private", "Fukuoka", "Fukuoka", FULL_NO_AGRI, 3),
  u("Seinan Gakuin University", "private", "Fukuoka", "Fukuoka", "biz soc hum", 3),
  u("Nakamura Gakuen University", "private", "Fukuoka", "Fukuoka", "biz edu med", 3),
  u("Okinawa Institute of Science and Technology (OIST)", "private", "Onna", "Okinawa", TECH, 1, "grad-only research funded"),
  u("Tokyo University of Agriculture", "private", "Tokyo", "Tokyo", "agri sci", 3),
  u("Shibaura Institute of Technology", "private", "Tokyo", "Tokyo", "eng cs sci arts", 2, "sgu-b"),
  u("Toyo University", "private", "Tokyo", "Tokyo", "eng cs sci agri biz soc hum", 3, "sgu-b"),
  u("Kogakuin University", "private", "Tokyo", "Tokyo", "eng cs arts", 3),
  u("Tokyo City University", "private", "Tokyo", "Tokyo", TECH, 3),
  u("Tokyo Denki University", "private", "Tokyo", "Tokyo", TECH, 3),
  u("Nihon University", "private", "Tokyo", "Tokyo", `${FULL} arts`, 3),
  u("Senshu University", "private", "Tokyo", "Tokyo", "biz soc hum cs", 3),
  u("Seikei University", "private", "Tokyo", "Tokyo", "eng biz soc hum", 3),
  u("Seijo University", "private", "Tokyo", "Tokyo", "biz soc hum", 3),
  u("Musashi University", "private", "Tokyo", "Tokyo", "biz soc hum", 3),
  u("Tsuda University", "private", "Tokyo", "Tokyo", "hum sci cs soc", 3, "women"),
  u("Tokyo Woman's Christian University", "private", "Tokyo", "Tokyo", "hum soc sci", 3, "women"),
  u("Japan Women's University", "private", "Tokyo", "Tokyo", "hum sci soc edu arts", 3, "women"),
  u("J. F. Oberlin University", "private", "Machida", "Tokyo", "biz soc hum arts", 3),
  u("Kanda University of International Studies", "private", "Chiba", "Chiba", "hum", 3),
  u("Tamagawa University", "private", "Machida", "Tokyo", "eng sci agri edu arts hum", 3),
  u("Teikyo University", "private", "Tokyo", "Tokyo", "med eng sci biz soc hum edu", 3),
  u("Meiji Gakuin University", "private", "Tokyo", "Tokyo", "biz soc hum", 3),
  u("Tokai University", "private", "Hiratsuka", "Kanagawa", `${FULL} arts`, 3),
  u("Toyota Technological Institute", "private", "Nagoya", "Aichi", "eng cs", 2, "research"),
  u("Meijo University", "private", "Nagoya", "Aichi", "eng cs sci agri biz soc hum med", 3),
  u("Aichi University", "private", "Nagoya", "Aichi", "biz soc hum", 3),
  u("Kanazawa Institute of Technology", "private", "Nonoichi", "Ishikawa", "eng cs", 3),
  u("Kyoto Seika University", "private", "Kyoto", "Kyoto", "arts hum", 3),
  u("Osaka Gakuin University", "private", "Suita", "Osaka", "biz soc hum", 3),
  u("Kyushu Sangyo University", "private", "Fukuoka", "Fukuoka", "eng cs biz soc hum arts", 3),
  u("Matsuyama University", "private", "Matsuyama", "Ehime", "biz soc hum med", 3),
  u("Asia University", "private", "Tokyo", "Tokyo", "biz soc hum", 3),
  u("Hiroshima Institute of Technology", "private", "Hiroshima", "Hiroshima", "eng cs", 3),
  u("Fukuoka Institute of Technology", "private", "Fukuoka", "Fukuoka", "eng cs", 3),
  u("Osaka Institute of Technology", "private", "Osaka", "Osaka", "eng cs", 3),
  u("Kurume University", "private", "Kurume", "Fukuoka", "med biz soc hum", 3),
  u("Juntendo University", "private", "Tokyo", "Tokyo", "med sci", 3),
  u("Kitasato University", "private", "Tokyo", "Tokyo", "med sci agri", 3),
  u("Doshisha Women's College of Liberal Arts", "private", "Kyoto", "Kyoto", "hum med", 3, "women"),
  u("Momoyama Gakuin University", "private", "Izumi", "Osaka", "biz soc hum", 3),
];

/** Catalog entry by (case-insensitive) name. */
export function catalogEntry(name: string) {
  const n = name.trim().toLowerCase();
  return CATALOG.find((c) => c.name.toLowerCase() === n);
}
