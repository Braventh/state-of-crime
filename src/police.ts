import { actorAt, clearShot, type Actor } from './combat.ts';
import { clamp, toward, W } from './config.ts';
import { severity, type Crime } from './crime.ts';
import { DISTRICT_WIDTH, STREET } from './district.ts';
import { makeRide, type Ride } from './vehicles.ts';

export const responses = [
  { name: 'Clear', feet: 0, wheels: 0, range: 0, search: 0, speed: 0 },
  { name: 'Local attention', feet: 1, wheels: 0, range: 176, search: 5, speed: 123 },
  { name: 'Active pursuit', feet: 2, wheels: 1, range: 205, search: 7, speed: 155 },
  { name: 'Coordinated response', feet: 3, wheels: 1, range: 231, search: 9, speed: 195 },
  { name: 'Major manhunt', feet: 4, wheels: 2, range: 265, search: 12, speed: 221 },
  { name: 'Maximum response', feet: 5, wheels: 3, range: 289, search: 15, speed: 265 },
];
const thresholds = [10, 34, 65, 108, 153];
const searchRadius = 150;
const searchRate = (s: Suspect) => s.covered ? 1.32 : 1;
export interface Identity { outfit: number; hair: number; ride: string; paint: string }
export interface Suspect {
  x: number; y: number; covered: boolean; camera: number; ride: Ride | null; identity: Identity;
}
type Lead = { x: number; y: number; identity: Identity; age: number };
type Report = Lead & { delay: number };
interface Cruiser { ride: Ride; block: boolean; windup: number; delay: number }
const policeBlue = '#536689';

function lineup() {
  return [actorAt('beat-west', 985, 10, 'officer', 2), actorAt('beat-east', 2593, 16, 'officer', 2)];
}
export const recognition = (old: Identity, current: Identity) => {
  if (current.ride) {
    if (!old.ride || old.ride !== current.ride) return .27;
    return old.paint === current.paint ? 1 : .55;
  }
  if (old.ride) return .29;
  return .21 + (old.outfit === current.outfit ? .44 : 0) + (old.hair === current.hair ? .35 : 0);
};

export class Police {
  points = 0;
  spotted = false;
  sinceSeen = 0;
  last: Lead | null = null;
  evidence: Identity | null = null;
  officers = lineup();
  cruisers: Cruiser[] = [];
  private reports: Report[] = [];
  private dispatch = 0;
  private serial = 0;
  private primary = 1;
  private reportedNoiseAt = -Infinity;
  private clock = 0;
  get level() { return thresholds.filter(value => this.points >= value).length; }
  get response() { return responses[this.level]; }
  get mode() { return !this.level ? 'Clear' : this.spotted ? 'In sight' : this.sinceSeen < .6 ? 'Responding' : 'Searching'; }

  private outsideSearch(s: Suspect) {
    return s.covered || !this.last || Math.hypot(s.x - this.last.x, (s.y - this.last.y) * 1.25) >= searchRadius;
  }
  readout(s: Suspect) {
    if (!this.level) return 'Crownwater / Free roam';
    if (this.spotted || (this.mode === 'Responding' && !s.covered)) return this.mode + ' · ' + this.response.name;
    if (!this.outsideSearch(s)) return 'Searching · Move away or hide';
    const state = s.covered ? 'Hidden' : 'Out of sight';
    const seconds = Math.ceil((this.response.search - this.sinceSeen) / searchRate(s));
    return seconds > 0 ? `${state} · Cooling in ${seconds}s` : `${state} · Losing heat`;
  }

  private lines() {
    return [
      ...this.officers.filter(a => a.hp > 0),
      ...this.cruisers.filter(c => c.ride.hp > 0).map(({ ride }) => ({ x: ride.x, y: STREET })),
    ];
  }
  watched(s: Suspect, range?: number) {
    return !s.covered && this.lines().some(a => this.line(a, s, range));
  }
  private line(a: { x: number; y: number }, s: Suspect, range = Math.max(160, this.response.range)) {
    return !s.covered && Math.hypot(a.x - s.x, (a.y - s.y) * 1.25) <= range
      && clearShot(a.x, a.y - 33, s.x, s.y - 31);
  }
  private known(s: Suspect, continuousContact: boolean) {
    const signature = !continuousContact && this.evidence ? recognition(this.evidence, s.identity) : 1;
    return this.lines().some(a => {
      const range = this.response.range * signature;
      return this.line(a, s, Math.max(this.level >= 4 ? 65 : 33, range));
    });
  }
  report(crime: Crime, s: Suspect, downedOfficer?: Actor) {
    const observed = this.watched(s) || (downedOfficer !== undefined && this.line(downedOfficer, s));
    const noise = crime.kind === 'gunfire' || crime.kind === 'damage' || crime.kind === 'wreck';
    const rapid = noise && this.clock - this.reportedNoiseAt < .32;
    if (noise && !rapid) this.reportedNoiseAt = this.clock;
    const factor = rapid ? .31 : observed ? 1.25 : crime.witnesses ? 1 : noise ? .72 : .24;
    const serious = crime.kind === 'gunfire' || crime.kind === 'officerAttacked' || crime.kind === 'officerDown'
      || crime.kind === 'civilianDown';
    const limit = this.level === 5 || (observed && serious) ? 200 : Math.max(this.points, thresholds[4] - 1);
    const escalation = this.level < 2 ? 1 : .52;
    this.points = Math.min(limit, this.points + Math.ceil(severity[crime.kind] * factor * escalation));
    if (observed) this.remember(s);
    else if (!rapid && (crime.witnesses || noise || crime.kind === 'theft' || crime.kind === 'carjacking')) {
      this.sinceSeen = Math.min(this.sinceSeen, 2);
      this.reports.push({ x: Math.round(crime.x / 32) * 32, y: crime.y, identity: { ...s.identity }, age: 0,
        delay: crime.witnesses ? .8 : 1.25 });
    }
    if (!this.last && this.level) this.last = { x: Math.round(crime.x / 64) * 64, y: crime.y, identity: { ...s.identity }, age: 0 };
    return observed;
  }
  private remember(s: Suspect) {
    this.last = { x: s.x, y: s.y, identity: { ...s.identity }, age: 0 };
    this.evidence = { ...s.identity };
    this.spotted = true;
    this.sinceSeen = 0;
  }
  private spawn(s: Suspect, side: number) {
    const left = s.camera - 84;
    const right = s.camera + W + 84;
    const options = side > 0 ? [right, left] : [left, right];
    return options.find(x => x > 52 && x < DISTRICT_WIDTH - 52 && Math.abs(s.x - x) > 520);
  }
  private reinforce(s: Suspect) {
    if (this.dispatch > 0 || !this.last || this.sinceSeen > 4.5) return;
    const response = this.response;
    const desire = Math.sign(this.last.x - (s.camera + W / 2)) || 1;
    const x = this.spawn(s, this.level >= 3 ? desire * this.primary : -desire);
    if (x === undefined) return;
    const serial = this.serial++;
    this.primary *= -1;
    this.dispatch = [0, 2.8, 2.35, 1.85, 1.3, .92][this.level];
    if (this.cruisers.filter(c => c.ride.hp > 0).length < response.wheels) {
      const block = this.level === 5 && !this.cruisers.some(c => c.block && c.ride.hp > 0);
      const ride = makeRide('cruiser-' + serial, x, block ? 'van' : 'compact', serial % 3 - 1, x < this.last.x ? 1 : -1);
      ride.color = policeBlue;
      ride.v = ride.dir * 140;
      this.cruisers.push({ ride, block, windup: 0, delay: 1 });
      return;
    }
    const local = this.officers.filter(a => a.hp > 0 && Math.abs(a.x - this.last!.x) < 780).length;
    if (local < response.feet && this.officers.filter(a => a.hp > 0).length < response.feet + 2)
      this.officers.push(actorAt('response-' + serial, x, 10, 'officer', this.level >= 3 ? 2 : 0));
  }

  step(dt: number, s: Suspect, sound: (cue: string) => void, hurt: (amount: number) => void) {
    this.clock += dt;
    this.dispatch = Math.max(0, this.dispatch - dt);
    for (const r of this.reports) {
      r.delay -= dt;
      if (r.delay > 0 || (this.spotted && this.last)) continue;
      this.last = { ...r, age: 0 };
      if (!this.evidence) this.evidence = { ...r.identity };
    }
    this.reports = this.reports.filter(r => r.delay > 0);
    const continuousContact = this.spotted;
    this.spotted = false;
    const level = this.level;
    if (level && this.known(s, continuousContact)) this.remember(s);
    else if (level) {
      this.sinceSeen += dt * searchRate(s);
      if (this.last) this.last.age += dt;
      if (this.sinceSeen > this.response.search && this.outsideSearch(s))
        this.points = Math.max(0, this.points - dt * (s.covered ? 17 : 12));
    } else this.points = Math.max(0, this.points - dt * .35);
    if (!this.level) {
      this.evidence = this.last = null;
      this.sinceSeen = 0;
    } else this.reinforce(s);
    this.cruisers = this.cruisers.filter(c => c.ride.hp > 0 && (this.level || Math.abs(c.ride.x - s.x) < W * .8));
    for (const [i, a] of this.officers.entries()) {
      a.hit = Math.max(0, a.hit - dt);
      a.pose = Math.max(0, a.pose - dt);
      a.ready = Math.max(0, a.ready - dt);
      if (!a.hp) { a.down += dt; continue; }
      if (!this.last || !this.level) {
        const home = a.id === 'beat-west' ? 985 : a.id === 'beat-east' ? 2593
          : a.x < DISTRICT_WIDTH / 2 ? -62 : DISTRICT_WIDTH + 62;
        const next = toward(a.x, home, dt * 104);
        a.dir = Math.sign(next - a.x) || a.dir;
        a.stride += Math.abs(next - a.x) / 13;
        a.x = next;
        continue;
      }
      const gap = Math.abs(s.x - a.x);
      const signature = this.evidence ? recognition(this.evidence, s.identity) : 1;
      const seen = this.spotted && this.line(a, s, Math.max(this.level >= 4 ? 65 : 33, this.response.range * signature));
      const sweep = this.spotted ? 0 : Math.sin(this.last.age * (.9 + i * .07) + i * 1.3) * (64 + this.level * 18);
      const canAttack = seen && Math.abs(s.y - a.y) < 35 && (gap < 30 || (this.level >= 3 && gap < 143 && a.weapon >= 2));
      const step = canAttack ? 0 : clamp(this.last.x + sweep - a.x, -144, 144);
      const pace = (a.hit ? 28 : this.level >= 3 ? 142 : 121) * dt;
      a.dir = Math.sign(canAttack ? s.x - a.x : step) || a.dir;
      const moved = clamp(step, -pace, pace);
      a.x = clamp(a.x + moved, 25, DISTRICT_WIDTH - 25);
      a.stride += Math.abs(moved) / 13;
      if (canAttack && !a.ready && !a.hit) {
        a.ready = this.level >= 4 ? 1.1 : 1.55;
        a.pose = .25;
        sound(gap > 30 ? 'shot' : 'swing');
        if (s.ride) s.ride.hp = Math.max(0, s.ride.hp - (gap > 30 ? 8 : 3));
        else hurt(gap > 30 ? 9 : 7);
      }
    }
    for (const [i, cruiser] of this.cruisers.entries()) {
      const { ride, block } = cruiser;
      cruiser.delay = Math.max(0, cruiser.delay - dt);
      const lead = this.last?.x ?? (ride.dir > 0 ? DISTRICT_WIDTH + 80 : -80);
      const sign = Math.sign(ride.x - lead) || 1;
      const target = clamp(lead + (block ? sign * 180 : this.spotted ? 0 : Math.cos((this.last?.age ?? 0) + i) * 112),
        this.level ? 44 : -91, this.level ? DISTRICT_WIDTH - 44 : DISTRICT_WIDTH + 91);
      const gap = target - ride.x;
      const lane = block ? 0 : this.spotted && s.ride ? s.ride.depth : i % 3 - 1;
      ride.depth = toward(ride.depth, lane, dt * 2.9);
      ride.v = toward(ride.v, Math.sign(gap) * Math.min(this.level ? this.response.speed + (s.ride ? 18 : 0) : 140,
        Math.abs(gap) * 3.7), dt * 280);
      if (Math.abs(ride.v) > 12) ride.dir = Math.sign(ride.v);
      if (!block && !cruiser.delay && !cruiser.windup && this.spotted && s.ride
        && Math.abs(ride.x - s.x) < 108 && Math.abs(ride.depth - s.ride.depth) < .54) {
        cruiser.windup = .53;
        sound('radio');
      }
      if (cruiser.windup > 0 && (cruiser.windup -= dt) <= 0) {
        cruiser.windup = 0;
        cruiser.delay = 1.42;
        if (this.spotted && s.ride && Math.abs(ride.x - s.x) < 101 && Math.abs(ride.depth - s.ride.depth) < .53) {
          s.ride.hp = Math.max(0, s.ride.hp - (this.level >= 4 ? 17 : 11));
          sound('crash');
        }
      }
      ride.x += ride.v * dt;
    }
    this.officers = this.officers.filter(a => a.down < 8 && (this.level || a.id.startsWith('beat-') || a.x > -62 && a.x < DISTRICT_WIDTH + 62));
  }

  get road() { return this.cruisers.map(unit => unit.ride); }
  get tells() { return this.level ? this.cruisers.filter(unit => unit.windup > 0 || unit.block) : []; }
}
