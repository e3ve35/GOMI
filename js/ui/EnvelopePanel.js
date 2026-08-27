import { COLORS } from "../config.js";

// name, initial value, y-offset from the first slider row. The gap between
// releaseTime and attackLevel separates the time controls from the levels.
const CONTROLS = [
  ["attackTime", 0.1, 0],
  ["decayTime", 0.2, 20],
  ["releaseTime", 1, 40],
  ["attackLevel", 1, 80],
  ["sustainLevel", 0.5, 100],
];

export class EnvelopePanel {
  constructor(box) {
    // Not a slider: p5's envelope always releases to silence.
    this.releaseLevel = 0;
    this.sliders = new Map();
    for (const [name, initial] of CONTROLS) {
      this.sliders.set(name, createSlider(0, 1, initial, 0.01));
    }
    this.applyLayout(box);
  }

  applyLayout(box) {
    this.x = box.x;
    this.y = box.y;
    this.w = box.graphW;
    this.h = box.h;
    this.sliderX = box.sliderX;
    this.sliderY = box.y + 14;
    this.labelX = box.labelX;
    for (const [name, , dy] of CONTROLS) {
      this.sliders.get(name).position(this.sliderX, this.sliderY + dy);
    }
  }

  value(name) {
    return this.sliders.get(name).value();
  }

  values() {
    return {
      attackTime: this.value("attackTime"),
      decayTime: this.value("decayTime"),
      sustainLevel: this.value("sustainLevel"),
      releaseTime: this.value("releaseTime"),
      attackLevel: this.value("attackLevel"),
      releaseLevel: this.releaseLevel,
    };
  }

  drawSelf() {
    const v = this.values();

    // Each stage is clamped to start no earlier than the one before it, so
    // dragging a slider backwards cannot make the curve run right to left.
    const t1 = this.w * v.attackTime;
    const l1 = -this.h * v.attackLevel;
    const t2 = max(this.w * v.decayTime, t1);
    const l2 = -this.h * v.sustainLevel;
    const t3 = t2 + this.w * 0.25;
    const t4 = max(this.w * v.releaseTime, t3);
    const l4 = -this.h * v.releaseLevel;

    push();
    fill(COLORS.content, 20);
    noStroke();
    rect(this.x, this.y, this.w, this.h);

    stroke(200, 100, 125, 200);
    translate(this.x, this.y + this.h);
    line(0, 0, t1, l1);
    line(t1, l1, t2, l2);
    line(t2, l2, t3, l2);
    line(t3, l2, t4, l4);
    pop();

    push();
    textSize(12);
    textAlign(LEFT);
    fill(COLORS.content);
    noStroke();
    for (const [name, , dy] of CONTROLS) {
      text(`${name}: ${this.value(name)}`, this.labelX, this.sliderY + dy + 7);
    }
    pop();
  }
}
