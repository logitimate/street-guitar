import { Sample, judgeStroke } from './hand-tracker.service';

// a hand height sampled at 30fps around t=1000ms, moving at `perSec` picture heights per second
const stroke = (perSec: number, at = 1000): Sample[] =>
  Array.from({ length: 30 }, (_, i) => {
    const t = at - 500 + i * 33;
    return { t, y: 0.5 + ((t - at) / 1000) * perSec };
  });

describe('judgeStroke', () => {
  const slotMs = 60000 / 70 / 2; // an eighth note at 70 bpm

  it('reads a hand moving down the picture as a down strum', () => {
    expect(judgeStroke(stroke(1.2), 1000, slotMs)).toBe('down');
  });

  it('reads a hand moving up the picture as an up strum', () => {
    expect(judgeStroke(stroke(-1.2), 1000, slotMs)).toBe('up');
  });

  it('calls a hand that stopped "still"', () => {
    expect(judgeStroke(stroke(0.02), 1000, slotMs)).toBe('still');
  });

  it('says "none" when the camera barely saw the moment', () => {
    expect(judgeStroke(stroke(1.2, 5000), 1000, slotMs)).toBe('none');
  });
});
