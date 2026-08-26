import { Score } from "./score/Score.js";
import { handleMousePressed } from "./score/Cell.js";
import { EnvelopePanel } from "./ui/EnvelopePanel.js";
import * as sketch from "./sketch.js";

window.preload = sketch.preload;
window.setup = sketch.setup;
window.draw = sketch.draw;
window.mousePressed = handleMousePressed;
