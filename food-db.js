// food-db.js — Indian Restaurant Food Database
// Sources: ICMR-NIN IFCT 2017 · INDB (Jaacks et al.) · HealthifyMe · Tarladalal · Clearcals
// All values per 100g cooked/prepared. Restaurant portions run ~15-25% higher in fat/kcal.
//
// Usage:
//   import { lookupDish } from './food-db.js';
//   const result = lookupDish("Paneer Pyaz Paratha");
//   // → { kcal: 549, protein: 13.5, carbs: 81, fat: 20.7, fiber: 5, portionG: 180, matchedKey: "pyaz paratha" }

const PORTION_DEFAULTS = {
  biryani: 450, thali: 500, curry: 280, dal: 250, sabzi: 200,
  khichdi: 300, pulao: 350, rice: 300, roti: 120, paratha: 180,
  dosa: 180, idli: 200, uttapam: 200, upma: 200, poha: 200,
  tikka: 250, kebab: 200, tandoori: 300, momo: 200, momos: 200,
  bowl: 380, salad: 300, sandwich: 220, wrap: 220, burger: 200,
  pizza: 200, pasta: 300, noodles: 300,
  smoothie: 350, juice: 300, lassi: 300, shake: 350,
  dessert: 150, halwa: 150, kheer: 200, cake: 120, brownie: 80,
  samosa: 100, pakora: 150, bhatura: 120, puri: 80,
  paneer: 200, chicken: 250, mutton: 250, fish: 200, egg: 120,
  default: 300
};

// Values per 100g: { kcal, protein (g), carbs (g), fat (g), fiber (g) }
const INDIAN_FOODS_PER_100G = {

  // ── BREADS & ROTIS ──────────────────────────────────────────────────────────
  "roti":              { kcal: 297, protein: 8.8, carbs: 55,  fat: 3.7,  fiber: 3.5 },
  "chapati":           { kcal: 297, protein: 8.8, carbs: 55,  fat: 3.7,  fiber: 3.5 },
  "tandoori roti":     { kcal: 310, protein: 9.0, carbs: 56,  fat: 6.0,  fiber: 3.0 },
  "roomali roti":      { kcal: 285, protein: 7.5, carbs: 54,  fat: 4.5,  fiber: 2.0 },
  "missi roti":        { kcal: 310, protein: 10,  carbs: 50,  fat: 6.5,  fiber: 4.5 },
  "paratha":           { kcal: 326, protein: 7.0, carbs: 47,  fat: 13.0, fiber: 2.8 },
  "aloo paratha":      { kcal: 292, protein: 6.0, carbs: 44,  fat: 10.5, fiber: 2.5 },
  "paneer paratha":    { kcal: 315, protein: 9.5, carbs: 42,  fat: 13.0, fiber: 2.5 },
  "gobi paratha":      { kcal: 295, protein: 7.0, carbs: 44,  fat: 10.8, fiber: 3.0 },
  "pyaz paratha":      { kcal: 305, protein: 7.5, carbs: 45,  fat: 11.5, fiber: 2.8 },
  "methi paratha":     { kcal: 290, protein: 7.5, carbs: 43,  fat: 10.5, fiber: 3.2 },
  "matar paratha":     { kcal: 300, protein: 8.0, carbs: 44,  fat: 11.0, fiber: 3.5 },
  "mooli paratha":     { kcal: 288, protein: 6.8, carbs: 43,  fat: 10.5, fiber: 2.8 },
  "achari paratha":    { kcal: 320, protein: 7.0, carbs: 46,  fat: 12.5, fiber: 2.5 },
  "stuffed paratha":   { kcal: 305, protein: 7.5, carbs: 44,  fat: 11.5, fiber: 2.8 },
  "bhatura":           { kcal: 370, protein: 8.0, carbs: 52,  fat: 15.0, fiber: 1.5 },
  "puri":              { kcal: 403, protein: 6.8, carbs: 51,  fat: 19.5, fiber: 1.5 },
  "naan":              { kcal: 310, protein: 9.0, carbs: 56,  fat: 6.0,  fiber: 2.0 },
  "garlic naan":       { kcal: 335, protein: 8.5, carbs: 56,  fat: 9.0,  fiber: 2.0 },
  "butter naan":       { kcal: 345, protein: 8.5, carbs: 56,  fat: 10.0, fiber: 2.0 },
  "kulcha":            { kcal: 305, protein: 8.5, carbs: 55,  fat: 5.8,  fiber: 2.0 },
  "amritsari kulcha":  { kcal: 350, protein: 9.0, carbs: 52,  fat: 13.0, fiber: 2.5 },
  "pav":               { kcal: 260, protein: 7.5, carbs: 48,  fat: 4.5,  fiber: 1.5 },

  // ── RICE DISHES ──────────────────────────────────────────────────────────────
  "plain rice":        { kcal: 130, protein: 2.7, carbs: 28,  fat: 0.3,  fiber: 0.4 },
  "steamed rice":      { kcal: 130, protein: 2.7, carbs: 28,  fat: 0.3,  fiber: 0.4 },
  "jeera rice":        { kcal: 155, protein: 3.0, carbs: 29,  fat: 3.8,  fiber: 0.5 },
  "ghee rice":         { kcal: 185, protein: 3.0, carbs: 29,  fat: 7.0,  fiber: 0.4 },
  "pulao":             { kcal: 160, protein: 3.5, carbs: 30,  fat: 3.8,  fiber: 1.0 },
  "veg pulao":         { kcal: 158, protein: 3.5, carbs: 30,  fat: 3.5,  fiber: 1.5 },
  "biryani":           { kcal: 180, protein: 10,  carbs: 26,  fat: 5.5,  fiber: 1.0 },
  "chicken biryani":   { kcal: 195, protein: 13,  carbs: 24,  fat: 6.5,  fiber: 0.8 },
  "mutton biryani":    { kcal: 205, protein: 12,  carbs: 24,  fat: 7.5,  fiber: 0.8 },
  "veg biryani":       { kcal: 165, protein: 4.5, carbs: 28,  fat: 4.5,  fiber: 1.5 },
  "paneer biryani":    { kcal: 185, protein: 7.5, carbs: 26,  fat: 6.5,  fiber: 1.0 },
  "egg biryani":       { kcal: 178, protein: 9.5, carbs: 24,  fat: 6.0,  fiber: 0.8 },
  "prawn biryani":     { kcal: 175, protein: 12,  carbs: 23,  fat: 5.5,  fiber: 0.8 },
  "hyderabadi biryani":{ kcal: 200, protein: 13,  carbs: 25,  fat: 7.0,  fiber: 0.8 },
  "dum biryani":       { kcal: 200, protein: 12,  carbs: 25,  fat: 7.0,  fiber: 0.8 },
  "khichdi":           { kcal: 124, protein: 5.0, carbs: 22,  fat: 2.5,  fiber: 2.0 },
  "curd rice":         { kcal: 128, protein: 4.0, carbs: 22,  fat: 3.0,  fiber: 0.5 },

  // ── DALS & LENTILS ───────────────────────────────────────────────────────────
  "dal":               { kcal: 102, protein: 6.5, carbs: 15,  fat: 2.0,  fiber: 3.5 },
  "dal makhani":       { kcal: 130, protein: 6.0, carbs: 16,  fat: 5.5,  fiber: 3.5 },
  "dal tadka":         { kcal: 108, protein: 6.5, carbs: 15,  fat: 2.5,  fiber: 3.5 },
  "dal fry":           { kcal: 115, protein: 6.5, carbs: 15,  fat: 3.5,  fiber: 3.0 },
  "chana masala":      { kcal: 128, protein: 7.0, carbs: 17,  fat: 4.0,  fiber: 5.0 },
  "rajma":             { kcal: 120, protein: 7.5, carbs: 16,  fat: 3.5,  fiber: 5.5 },
  "rajma chawal":      { kcal: 140, protein: 6.0, carbs: 24,  fat: 3.0,  fiber: 3.5 },
  "chole":             { kcal: 128, protein: 7.0, carbs: 17,  fat: 4.0,  fiber: 5.0 },
  "sambar":            { kcal: 55,  protein: 3.0, carbs: 8,   fat: 1.5,  fiber: 3.0 },
  "rasam":             { kcal: 30,  protein: 1.0, carbs: 5,   fat: 0.8,  fiber: 1.0 },

  // ── CURRIES & GRAVIES ────────────────────────────────────────────────────────
  "butter chicken":    { kcal: 165, protein: 15,  carbs: 8,   fat: 9.0,  fiber: 1.0 },
  "chicken tikka masala":{ kcal: 155, protein: 14, carbs: 7,  fat: 9.0,  fiber: 1.0 },
  "palak paneer":      { kcal: 162, protein: 8.0, carbs: 8,   fat: 12.0, fiber: 2.5 },
  "paneer butter masala":{ kcal: 175, protein: 8.0, carbs: 10, fat: 13.0, fiber: 1.0 },
  "shahi paneer":      { kcal: 185, protein: 8.5, carbs: 9,   fat: 14.5, fiber: 1.0 },
  "matar paneer":      { kcal: 145, protein: 7.5, carbs: 10,  fat: 9.5,  fiber: 2.5 },
  "kadai paneer":      { kcal: 158, protein: 8.0, carbs: 8,   fat: 11.5, fiber: 2.0 },
  "paneer bhurji":     { kcal: 168, protein: 10,  carbs: 5,   fat: 13.0, fiber: 1.0 },
  "chicken curry":     { kcal: 138, protein: 15,  carbs: 5,   fat: 7.5,  fiber: 1.0 },
  "mutton curry":      { kcal: 165, protein: 16,  carbs: 4,   fat: 10.0, fiber: 0.8 },
  "fish curry":        { kcal: 120, protein: 14,  carbs: 5,   fat: 5.5,  fiber: 0.8 },
  "egg curry":         { kcal: 125, protein: 9.0, carbs: 5,   fat: 8.5,  fiber: 1.0 },
  "aloo gobi":         { kcal: 95,  protein: 3.0, carbs: 13,  fat: 4.0,  fiber: 3.0 },
  "aloo matar":        { kcal: 105, protein: 3.5, carbs: 15,  fat: 4.0,  fiber: 3.0 },
  "baingan bharta":    { kcal: 85,  protein: 2.5, carbs: 10,  fat: 4.5,  fiber: 3.5 },
  "bhindi masala":     { kcal: 88,  protein: 2.5, carbs: 10,  fat: 4.8,  fiber: 4.0 },
  "aloo jeera":        { kcal: 112, protein: 2.5, carbs: 16,  fat: 4.5,  fiber: 2.5 },
  "pav bhaji":         { kcal: 155, protein: 4.0, carbs: 22,  fat: 6.0,  fiber: 3.5 },
  "korma":             { kcal: 175, protein: 12,  carbs: 8,   fat: 12.0, fiber: 1.0 },
  "rogan josh":        { kcal: 165, protein: 16,  carbs: 5,   fat: 10.0, fiber: 1.0 },

  // ── TANDOOR & GRILLS ─────────────────────────────────────────────────────────
  "chicken tikka":     { kcal: 170, protein: 25,  carbs: 4,   fat: 6.5,  fiber: 0.5 },
  "paneer tikka":      { kcal: 218, protein: 12,  carbs: 6,   fat: 17.0, fiber: 0.5 },
  "seekh kebab":       { kcal: 195, protein: 18,  carbs: 5,   fat: 12.0, fiber: 0.5 },
  "shammi kebab":      { kcal: 210, protein: 16,  carbs: 8,   fat: 13.5, fiber: 1.0 },
  "tandoori chicken":  { kcal: 165, protein: 28,  carbs: 3,   fat: 5.5,  fiber: 0.5 },
  "malai tikka":       { kcal: 195, protein: 20,  carbs: 4,   fat: 12.0, fiber: 0.3 },
  "haryali tikka":     { kcal: 162, protein: 24,  carbs: 3,   fat: 6.5,  fiber: 1.0 },
  "fish tikka":        { kcal: 148, protein: 22,  carbs: 3,   fat: 5.5,  fiber: 0.3 },

  // ── SOUTH INDIAN ─────────────────────────────────────────────────────────────
  "dosa":              { kcal: 168, protein: 4.5, carbs: 30,  fat: 3.8,  fiber: 1.5 },
  "masala dosa":       { kcal: 178, protein: 4.5, carbs: 30,  fat: 5.5,  fiber: 1.8 },
  "rava dosa":         { kcal: 185, protein: 4.0, carbs: 32,  fat: 5.5,  fiber: 1.0 },
  "set dosa":          { kcal: 158, protein: 4.0, carbs: 28,  fat: 3.5,  fiber: 1.5 },
  "idli":              { kcal: 58,  protein: 2.0, carbs: 11,  fat: 0.4,  fiber: 0.5 },
  "uttapam":           { kcal: 145, protein: 4.5, carbs: 26,  fat: 3.0,  fiber: 1.5 },
  "upma":              { kcal: 148, protein: 3.5, carbs: 24,  fat: 4.8,  fiber: 2.0 },
  "pongal":            { kcal: 140, protein: 4.0, carbs: 23,  fat: 4.5,  fiber: 1.5 },
  "medu vada":         { kcal: 212, protein: 7.0, carbs: 25,  fat: 10.0, fiber: 2.5 },
  "poha":              { kcal: 130, protein: 3.0, carbs: 24,  fat: 2.5,  fiber: 1.5 },
  "appam":             { kcal: 120, protein: 2.5, carbs: 23,  fat: 2.0,  fiber: 0.5 },

  // ── INDO-CHINESE ─────────────────────────────────────────────────────────────
  "veg fried rice":    { kcal: 155, protein: 3.5, carbs: 28,  fat: 3.8,  fiber: 1.5 },
  "chicken fried rice":{ kcal: 178, protein: 10,  carbs: 26,  fat: 5.0,  fiber: 1.0 },
  "egg fried rice":    { kcal: 162, protein: 7.0, carbs: 26,  fat: 4.5,  fiber: 0.8 },
  "schezwan fried rice":{ kcal: 168, protein: 4.0, carbs: 29, fat: 4.5,  fiber: 1.5 },
  "hakka noodles":     { kcal: 148, protein: 4.5, carbs: 26,  fat: 3.5,  fiber: 1.5 },
  "veg hakka noodles": { kcal: 145, protein: 4.0, carbs: 27,  fat: 3.0,  fiber: 2.0 },
  "chicken hakka noodles":{ kcal: 168, protein: 10, carbs: 24, fat: 4.5, fiber: 1.0 },
  "schezwan noodles":  { kcal: 160, protein: 4.5, carbs: 28,  fat: 4.0,  fiber: 1.5 },
  "gobi manchurian":   { kcal: 175, protein: 4.0, carbs: 22,  fat: 8.5,  fiber: 2.5 },
  "chicken manchurian":{ kcal: 178, protein: 14,  carbs: 12,  fat: 8.5,  fiber: 0.5 },
  "paneer manchurian": { kcal: 185, protein: 9.0, carbs: 14,  fat: 12.0, fiber: 0.5 },
  "chilli chicken":    { kcal: 185, protein: 16,  carbs: 10,  fat: 10.0, fiber: 1.0 },
  "chilli paneer":     { kcal: 195, protein: 9.5, carbs: 12,  fat: 13.5, fiber: 1.0 },
  "spring roll":       { kcal: 215, protein: 4.5, carbs: 26,  fat: 10.5, fiber: 1.5 },
  "dim sum":           { kcal: 155, protein: 7.0, carbs: 20,  fat: 5.5,  fiber: 1.0 },
  "wonton soup":       { kcal: 72,  protein: 4.5, carbs: 8,   fat: 2.5,  fiber: 0.5 },

  // ── STREET FOOD & CHAAT ──────────────────────────────────────────────────────
  "vada pav":          { kcal: 258, protein: 5.5, carbs: 38,  fat: 10.0, fiber: 2.5 },
  "samosa":            { kcal: 308, protein: 5.0, carbs: 35,  fat: 17.0, fiber: 2.5 },
  "bhel puri":         { kcal: 118, protein: 3.5, carbs: 22,  fat: 2.5,  fiber: 2.0 },
  "pani puri":         { kcal: 175, protein: 3.5, carbs: 28,  fat: 6.0,  fiber: 2.5 },
  "dahi puri":         { kcal: 188, protein: 5.0, carbs: 28,  fat: 7.0,  fiber: 2.0 },
  "sev puri":          { kcal: 195, protein: 4.5, carbs: 27,  fat: 8.5,  fiber: 2.0 },
  "aloo tikki":        { kcal: 225, protein: 4.0, carbs: 32,  fat: 9.5,  fiber: 3.0 },
  "papdi chaat":       { kcal: 210, protein: 5.5, carbs: 28,  fat: 9.0,  fiber: 2.5 },
  "dahi bhalla":       { kcal: 162, protein: 7.0, carbs: 22,  fat: 5.5,  fiber: 2.5 },
  "kachori":           { kcal: 348, protein: 7.0, carbs: 42,  fat: 18.0, fiber: 3.0 },
  "dabeli":            { kcal: 245, protein: 5.5, carbs: 36,  fat: 9.5,  fiber: 2.5 },
  "pakora":            { kcal: 268, protein: 6.5, carbs: 28,  fat: 15.0, fiber: 2.5 },
  "onion bhaji":       { kcal: 258, protein: 5.5, carbs: 27,  fat: 14.5, fiber: 2.5 },

  // ── MOMOS / DUMPLINGS ────────────────────────────────────────────────────────
  "momo":              { kcal: 165, protein: 8.5, carbs: 22,  fat: 5.0,  fiber: 1.5 },
  "veg momo":          { kcal: 148, protein: 5.5, carbs: 22,  fat: 4.5,  fiber: 2.0 },
  "chicken momo":      { kcal: 175, protein: 11,  carbs: 20,  fat: 5.5,  fiber: 1.0 },
  "pan fried momo":    { kcal: 210, protein: 9.0, carbs: 22,  fat: 9.5,  fiber: 1.5 },
  "fried momo":        { kcal: 225, protein: 8.5, carbs: 24,  fat: 11.0, fiber: 1.5 },

  // ── THALIS & COMBOS ──────────────────────────────────────────────────────────
  "thali":             { kcal: 145, protein: 5.5, carbs: 22,  fat: 4.5,  fiber: 2.5 },
  "gujarati thali":    { kcal: 155, protein: 5.0, carbs: 24,  fat: 5.0,  fiber: 2.5 },
  "rajasthani thali":  { kcal: 165, protein: 5.5, carbs: 23,  fat: 6.0,  fiber: 2.5 },

  // ── SALADS & HEALTHY ─────────────────────────────────────────────────────────
  "salad":             { kcal: 55,  protein: 2.5, carbs: 8,   fat: 2.0,  fiber: 3.0 },
  "caesar salad":      { kcal: 118, protein: 5.0, carbs: 8,   fat: 8.5,  fiber: 2.0 },
  "greek salad":       { kcal: 95,  protein: 3.5, carbs: 7,   fat: 7.0,  fiber: 2.5 },
  "grilled chicken":   { kcal: 165, protein: 31,  carbs: 0,   fat: 3.8,  fiber: 0 },
  "grilled fish":      { kcal: 128, protein: 24,  carbs: 0,   fat: 3.5,  fiber: 0 },
  "paneer":            { kcal: 265, protein: 18,  carbs: 2,   fat: 20.5, fiber: 0 },
  "tofu":              { kcal: 76,  protein: 8.0, carbs: 2,   fat: 4.5,  fiber: 0.3 },
  "quinoa bowl":       { kcal: 125, protein: 5.5, carbs: 21,  fat: 2.5,  fiber: 3.5 },
  "smoothie bowl":     { kcal: 145, protein: 4.5, carbs: 28,  fat: 2.5,  fiber: 4.0 },
  "avocado toast":     { kcal: 195, protein: 5.5, carbs: 22,  fat: 10.5, fiber: 5.0 },

  // ── EGGS ─────────────────────────────────────────────────────────────────────
  "boiled egg":        { kcal: 78,  protein: 6.5, carbs: 0.5, fat: 5.5,  fiber: 0 },
  "egg white":         { kcal: 52,  protein: 11,  carbs: 0.7, fat: 0.2,  fiber: 0 },
  "scrambled egg":     { kcal: 148, protein: 10,  carbs: 1.5, fat: 11.5, fiber: 0 },
  "omelette":          { kcal: 155, protein: 11,  carbs: 2,   fat: 12.0, fiber: 0 },
  "egg bhurji":        { kcal: 165, protein: 11,  carbs: 4,   fat: 12.5, fiber: 0.5 },
  "anda curry":        { kcal: 125, protein: 9.0, carbs: 5,   fat: 8.5,  fiber: 1.0 },

  // ── SANDWICHES & WRAPS ───────────────────────────────────────────────────────
  "sandwich":          { kcal: 215, protein: 8.0, carbs: 30,  fat: 7.5,  fiber: 2.5 },
  "veg sandwich":      { kcal: 195, protein: 6.5, carbs: 30,  fat: 6.0,  fiber: 3.0 },
  "chicken sandwich":  { kcal: 235, protein: 15,  carbs: 28,  fat: 8.0,  fiber: 2.0 },
  "club sandwich":     { kcal: 265, protein: 16,  carbs: 28,  fat: 11.5, fiber: 2.5 },
  "wrap":              { kcal: 220, protein: 10,  carbs: 28,  fat: 8.0,  fiber: 2.5 },
  "kathi roll":        { kcal: 238, protein: 10,  carbs: 30,  fat: 9.5,  fiber: 2.0 },
  "frankie":           { kcal: 232, protein: 9.5, carbs: 30,  fat: 9.0,  fiber: 2.0 },
  "burger":            { kcal: 258, protein: 12,  carbs: 30,  fat: 11.5, fiber: 2.0 },
  "veg burger":        { kcal: 238, protein: 8.0, carbs: 32,  fat: 9.5,  fiber: 3.0 },

  // ── PIZZA & PASTA ────────────────────────────────────────────────────────────
  "pizza":             { kcal: 248, protein: 10,  carbs: 32,  fat: 9.5,  fiber: 2.0 },
  "pasta":             { kcal: 195, protein: 7.0, carbs: 34,  fat: 4.5,  fiber: 2.5 },
  "mac and cheese":    { kcal: 235, protein: 9.0, carbs: 30,  fat: 9.5,  fiber: 1.5 },

  // ── SOUPS ────────────────────────────────────────────────────────────────────
  "soup":              { kcal: 55,  protein: 3.0, carbs: 7,   fat: 1.5,  fiber: 1.5 },
  "tomato soup":       { kcal: 62,  protein: 2.0, carbs: 10,  fat: 1.8,  fiber: 2.0 },
  "sweet corn soup":   { kcal: 75,  protein: 3.5, carbs: 12,  fat: 1.5,  fiber: 1.5 },
  "hot and sour soup": { kcal: 68,  protein: 3.0, carbs: 10,  fat: 2.0,  fiber: 1.0 },
  "manchow soup":      { kcal: 72,  protein: 3.5, carbs: 10,  fat: 2.5,  fiber: 1.0 },
  "mulligatawny":      { kcal: 82,  protein: 4.0, carbs: 10,  fat: 3.0,  fiber: 2.0 },

  // ── DESSERTS ─────────────────────────────────────────────────────────────────
  "gulab jamun":       { kcal: 382, protein: 5.0, carbs: 62,  fat: 13.0, fiber: 0.5 },
  "rasgulla":          { kcal: 186, protein: 5.0, carbs: 35,  fat: 3.5,  fiber: 0 },
  "kheer":             { kcal: 158, protein: 5.0, carbs: 24,  fat: 5.0,  fiber: 0.3 },
  "halwa":             { kcal: 268, protein: 4.0, carbs: 38,  fat: 12.0, fiber: 1.0 },
  "jalebi":            { kcal: 358, protein: 3.5, carbs: 68,  fat: 8.5,  fiber: 0.3 },
  "gajar halwa":       { kcal: 225, protein: 3.5, carbs: 32,  fat: 10.0, fiber: 2.5 },
  "barfi":             { kcal: 385, protein: 7.0, carbs: 58,  fat: 15.0, fiber: 0.5 },
  "kaju katli":        { kcal: 452, protein: 9.5, carbs: 62,  fat: 20.0, fiber: 1.5 },
  "ice cream":         { kcal: 210, protein: 3.5, carbs: 24,  fat: 11.0, fiber: 0 },
  "brownie":           { kcal: 388, protein: 5.0, carbs: 52,  fat: 19.0, fiber: 2.5 },
  "cheesecake":        { kcal: 325, protein: 5.5, carbs: 30,  fat: 20.5, fiber: 0.5 },
  "chocolate cake":    { kcal: 368, protein: 5.0, carbs: 52,  fat: 17.0, fiber: 2.0 },
  "rasmalai":          { kcal: 175, protein: 7.0, carbs: 20,  fat: 7.5,  fiber: 0 },
  "malpua":            { kcal: 295, protein: 5.0, carbs: 42,  fat: 12.5, fiber: 1.0 },
  "kulfi":             { kcal: 185, protein: 5.0, carbs: 22,  fat: 9.0,  fiber: 0 },

  // ── BEVERAGES ────────────────────────────────────────────────────────────────
  "lassi":             { kcal: 78,  protein: 3.5, carbs: 10,  fat: 2.5,  fiber: 0 },
  "sweet lassi":       { kcal: 110, protein: 3.5, carbs: 18,  fat: 2.5,  fiber: 0 },
  "mango lassi":       { kcal: 125, protein: 3.5, carbs: 22,  fat: 2.5,  fiber: 0.5 },
  "chaas":             { kcal: 35,  protein: 2.0, carbs: 4,   fat: 1.0,  fiber: 0 },
  "chai":              { kcal: 58,  protein: 1.5, carbs: 7,   fat: 2.2,  fiber: 0 },
  "masala chai":       { kcal: 65,  protein: 1.5, carbs: 8,   fat: 2.5,  fiber: 0 },
  "cold coffee":       { kcal: 115, protein: 3.5, carbs: 16,  fat: 4.0,  fiber: 0 },
  "smoothie":          { kcal: 85,  protein: 2.5, carbs: 18,  fat: 1.0,  fiber: 2.0 },
  "protein shake":     { kcal: 115, protein: 18,  carbs: 8,   fat: 2.0,  fiber: 1.0 },
  "fresh lime soda":   { kcal: 38,  protein: 0.2, carbs: 9,   fat: 0.1,  fiber: 0 },
};

// ── Portion size lookup ──────────────────────────────────────────────────────
function guessPortion(dishName) {
  const lower = dishName.toLowerCase();

  // Extract explicit weight from dish name ("500g", "500ml", "half kg")
  const kgMatch = lower.match(/(\d+(?:\.\d+)?)\s*kg/);
  const mlMatch = lower.match(/(\d+)\s*ml/);
  const gMatch  = lower.match(/(\d+)\s*g(?:m|ms|rams?)?\b/);
  const halfKg  = lower.includes("half kg") || lower.includes("half kilo");
  if (kgMatch) return Math.round(parseFloat(kgMatch[1]) * 1000);
  if (halfKg)  return 500;
  if (mlMatch) return parseInt(mlMatch[1]);
  if (gMatch && parseInt(gMatch[1]) >= 50) return parseInt(gMatch[1]);

  // Serves 2 modifier
  const serves2 = /serves?\s*2|for\s*2/.test(lower);

  // Keyword-based portion defaults
  for (const [key, grams] of Object.entries(PORTION_DEFAULTS)) {
    if (key === "default") continue;
    if (lower.includes(key)) return serves2 ? grams * 2 : grams;
  }
  return serves2 ? PORTION_DEFAULTS.default * 2 : PORTION_DEFAULTS.default;
}

// ── Main lookup function ─────────────────────────────────────────────────────
// Returns null if no match found.
export function lookupDish(dishName) {
  const lower = dishName.toLowerCase();

  // Sort by key length descending — longest/most specific match wins
  const entries = Object.entries(INDIAN_FOODS_PER_100G)
    .sort((a, b) => b[0].length - a[0].length);

  for (const [key, per100g] of entries) {
    if (lower.includes(key)) {
      const portionG = guessPortion(dishName);
      const ratio = portionG / 100;
      return {
        kcal:       Math.round(per100g.kcal * ratio),
        protein:    Math.round(per100g.protein * ratio * 10) / 10,
        carbs:      Math.round(per100g.carbs * ratio * 10) / 10,
        fat:        Math.round(per100g.fat * ratio * 10) / 10,
        fiber:      Math.round((per100g.fiber || 0) * ratio * 10) / 10,
        portionG,
        matchedKey: key,
        source:     "Indian Food DB (ICMR-NIN)",
        // ±20% range for restaurant variation
        kcalLow:    Math.round(per100g.kcal * ratio * 0.85),
        kcalHigh:   Math.round(per100g.kcal * ratio * 1.25),
      };
    }
  }
  return null;
}

export { INDIAN_FOODS_PER_100G, PORTION_DEFAULTS };
