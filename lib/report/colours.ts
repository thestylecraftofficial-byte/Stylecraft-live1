const HEX: Record<string, string> = {
  black: "#1A1A1A", white: "#F5F5F2", navy: "#2F3E5C", grey: "#8A8D91", charcoal: "#3C3F44", olive: "#8A9A6B",
  maroon: "#7A3B3B", beige: "#D9C7A8", brown: "#6B4A35", blue: "#3F6FB5", "royal-blue": "#2D4FA3", green: "#4F7A57",
  emerald: "#1F7A5A", red: "#B3342B", pink: "#E3A1B0", "hot-pink": "#E2438C", yellow: "#E6C84A", mustard: "#C99A2E",
  orange: "#D9822B", rust: "#A5532B", terracotta: "#C98B6B", camel: "#B88B5A", cream: "#EFE6D2", purple: "#6F4A8E",
  lavender: "#B9A7D6", teal: "#2F7F86", burgundy: "#6E2433", "neon-yellow": "#DFFF2E", "neon-green": "#39FF14",
  "icy-blue": "#CFE8F5", "silver-grey": "#C4C7CB",
};
export const hexFor = (name: string) => HEX[name.toLowerCase()] ?? "#B8AD9D";
export const prettyColour = (name: string) => name.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase());

// One line on where each colour works best (a style judgement, shown under the swatch).
const USE: Record<string, string> = {
  navy: "Shirts, trousers, blazers", charcoal: "Trousers, suits, knitwear", olive: "Jackets, chinos, kurtas", burgundy: "Knitwear, accents, festive",
  white: "Shirts, tees, linings", beige: "Chinos, jackets, kurtas", grey: "Layers, trousers, tees", cream: "Shirts, kurtas, pyjamas",
  black: "Evening, shoes, belts", brown: "Shoes, belts, trousers", camel: "Jackets, shoes, bags", maroon: "Festive, sarees, knitwear",
  teal: "Shirts, kurtas, dresses", mustard: "Sweaters, scarves, kurtas", terracotta: "Overshirts, kurtas, tops", rust: "Overshirts, kurtas, festive",
  emerald: "Festive, dresses, kurtas", orange: "Accents, casual tops", royal: "Shirts, dresses", "royal-blue": "Shirts, dresses, festive",
  blue: "Shirts, denim, tops", green: "Tops, kurtas, jackets", purple: "Festive, accents", lavender: "Light tops, soft accents",
  pink: "Tops, kurtas, accents", red: "Accents, festive", yellow: "Accents, summer tops",
};
export const useFor = (name: string) => USE[name.toLowerCase().replace(/ /g, "-")] ?? "Mix with your neutrals";

// Shops rarely sell one exact shade. These are the shade names you will commonly see on clothes for each colour family,
// from lighter to deeper, with an approximate on-screen colour. Brands and screens differ, so match by name in daylight.
const SHADES: Record<string, [string, string][]> = {
  black: [["Jet black", "#141414"], ["Black", "#1A1A1A"], ["Washed black", "#3A3A3A"]],
  white: [["Off white", "#EFEBE0"], ["White", "#F5F5F2"], ["Bright white", "#FFFFFF"]],
  navy: [["Navy blue", "#2F3E5C"], ["Midnight navy", "#1F2A44"], ["Indigo", "#3B4A7A"]],
  grey: [["Light grey", "#B5B8BC"], ["Grey melange", "#8A8D91"], ["Slate grey", "#6A6F76"]],
  charcoal: [["Charcoal grey", "#3C3F44"], ["Anthracite", "#2B2D31"], ["Slate", "#555A61"]],
  olive: [["Sage green", "#A3AD7F"], ["Olive green", "#8A9A6B"], ["Army green", "#6B7550"]],
  maroon: [["Maroon", "#7A3B3B"], ["Wine", "#5E2633"], ["Oxblood", "#4A1F24"]],
  beige: [["Sand", "#E3D5B8"], ["Beige", "#D9C7A8"], ["Khaki", "#BFAA82"]],
  brown: [["Tan brown", "#8B6A4A"], ["Coffee brown", "#6B4A35"], ["Dark chocolate", "#46301F"]],
  blue: [["Sky blue", "#8FB1D8"], ["Cobalt blue", "#3F6FB5"], ["Denim blue", "#4A6A94"]],
  "royal-blue": [["Cobalt", "#2F5AB0"], ["Royal blue", "#2D4FA3"], ["Sapphire", "#223E86"]],
  green: [["Fern green", "#6E9A74"], ["Forest green", "#4F7A57"], ["Bottle green", "#2F5A3E"]],
  emerald: [["Jade green", "#2F9A74"], ["Emerald green", "#1F7A5A"], ["Peacock green", "#17685A"]],
  red: [["Cherry red", "#C94A3F"], ["Red", "#B3342B"], ["Brick red", "#8E2F28"]],
  pink: [["Baby pink", "#F0C4CE"], ["Blush pink", "#E3A1B0"], ["Onion pink", "#C97D8E"]],
  "hot-pink": [["Fuchsia", "#E2438C"], ["Magenta pink", "#C93A7E"], ["Rani pink", "#D4337A"]],
  yellow: [["Lemon yellow", "#EBD65C"], ["Yellow", "#E6C84A"], ["Butter yellow", "#F0DE8E"]],
  mustard: [["Honey mustard", "#D9AE4A"], ["Mustard yellow", "#C99A2E"], ["Ochre", "#B4821F"]],
  orange: [["Tangerine", "#E39A4A"], ["Orange", "#D9822B"], ["Burnt orange", "#C06A22"]],
  rust: [["Copper rust", "#B8683F"], ["Rust", "#A5532B"], ["Burnt sienna", "#8A4424"]],
  terracotta: [["Peach clay", "#D9A184"], ["Terracotta", "#C98B6B"], ["Brick clay", "#B26F52"]],
  camel: [["Light camel", "#CBA479"], ["Camel", "#B88B5A"], ["Tobacco", "#9A6E43"]],
  cream: [["Ivory", "#F4EDDC"], ["Cream", "#EFE6D2"], ["Ecru", "#E3D8BE"]],
  purple: [["Plum", "#7F5A9E"], ["Purple", "#6F4A8E"], ["Aubergine", "#4F3366"]],
  lavender: [["Lilac", "#C7B8E0"], ["Lavender", "#B9A7D6"], ["Mauve", "#A38DC0"]],
  teal: [["Aqua teal", "#4F9AA0"], ["Teal", "#2F7F86"], ["Petrol blue", "#1F5F68"]],
  burgundy: [["Claret", "#7E2C3E"], ["Burgundy", "#6E2433"], ["Deep wine", "#521A27"]],
  "icy-blue": [["Ice blue", "#CFE8F5"], ["Powder blue", "#B9D6EA"], ["Pale blue", "#DDEEF8"]],
  "silver-grey": [["Silver grey", "#C4C7CB"], ["Pewter", "#A9ADB2"], ["Ash grey", "#D2D4D7"]],
};
export type Shade = { name: string; hex: string };
export const shadesFor = (name: string): Shade[] =>
  (SHADES[name.toLowerCase().replace(/ /g, "-")] ?? []).map(([n, h]) => ({ name: n, hex: h }));
export const SHADE_NOTE = "Shade names are what shops commonly call each colour, from lighter to deeper. Brands and screens differ, so match by name and check the cloth in daylight.";
