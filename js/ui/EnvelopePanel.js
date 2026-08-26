import { COLORS } from "../config.js";

export class EnvelopePanel {
  constructor(x, y, w, h) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.attackTime = 0.1;
    this.decayTime = 0.2;
    this.releaseTime = 1;

    this.attackLevel = 1;
    this.sustainLevel = 0.5;
    this.releaseLevel = 0;

    // create sliders
    this.sliderX = this.x + this.w + 20;
    this.sliderY = this.y + 20;
    this.sliderTextX = this.sliderX + 50;
    this.sliderTextY = this.sliderY - 7;

    this.attackSlider = createSlider(0, 1, this.attackTime, 0.01);
    this.attackSlider.position(this.sliderX, this.sliderY);

    this.decaySlider = createSlider(0, 1, this.decayTime, 0.01);
    this.decaySlider.position(this.sliderX, this.sliderY + 20);

    this.releaseSlider = createSlider(0, 1, this.releaseTime, 0.01);
    this.releaseSlider.position(this.sliderX, this.sliderY + 40);

    this.attackLevelSlider = createSlider(0, 1, this.attackLevel, 0.01);
    this.attackLevelSlider.position(this.sliderX, this.sliderY + 80);

    this.sustainLevelSlider = createSlider(0, 1, this.sustainLevel, 0.01);
    this.sustainLevelSlider.position(this.sliderX, this.sliderY + 100);
  }

  drawSelf() {
    this.attackTime = this.attackSlider.value();
    this.decayTime = this.decaySlider.value();
    this.releaseTime = this.releaseSlider.value();

    this.attackLevel = this.attackLevelSlider.value();
    this.sustainLevel = this.sustainLevelSlider.value();

    let t1 = this.w * this.attackTime;
    let l1 = -this.h * this.attackLevel;
    let t2 = max(this.w * this.decayTime, t1);
    let l2 = -this.h * this.sustainLevel;
    const t3 = t2 + this.w * 0.25;
    let l3 = l2;
    let t4 = max(this.w * this.releaseTime, t3);
    let l4 = -this.h * this.releaseLevel;

    push();
    fill(COLORS.content, 20);
    noStroke();
    rect(this.x, this.y, this.w, this.h);

    // draw ADSR
    stroke(200, 100, 125, 200);
    translate(this.x, this.y + this.h);
    line(0, 0, t1, l1);
    line(t1, l1, t2, l2);
    line(t2, l2, t3, l3);
    line(t3, l3, t4, l4);
    pop();

    // annotate
    push();
    textSize(12);
    textAlign(LEFT);
    fill(COLORS.content);
    noStroke();
    text(
      "attackTime: " + this.attackSlider.value(),
      this.sliderTextX,
      this.sliderTextY
    );
    text(
      "decayTime: " + this.decaySlider.value(),
      this.sliderTextX,
      this.sliderTextY + 20
    );
    text(
      "releaseTime: " + this.releaseSlider.value(),
      this.sliderTextX,
      this.sliderTextY + 40
    );
    text(
      "attackLevel: " + this.attackLevelSlider.value(),
      this.sliderTextX,
      this.sliderTextY + 80
    );
    text(
      "sustainLevel: " + this.sustainLevelSlider.value(),
      this.sliderTextX,
      this.sliderTextY + 100
    );

    pop();
  }
}
