import { loadFont as cinzel } from "@remotion/google-fonts/Cinzel";
import { loadFont as inter } from "@remotion/google-fonts/Inter";
import { loadFont as coptic } from "@remotion/google-fonts/NotoSansCoptic";

export const C = { burgundy: "#7A1F2B", gold: "#C9A24A", cream: "#FBF7EE", dark: "#2A0B10", deep: "#1a0f11" };
export const FONT = {
  title: cinzel("normal", { weights: ["600"] }).fontFamily,
  body: inter("normal", { weights: ["400", "600"], subsets: ["latin"] }).fontFamily,
  coptic: coptic("normal", { weights: ["400"], subsets: ["coptic"] }).fontFamily,
};
