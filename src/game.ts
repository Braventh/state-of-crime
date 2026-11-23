import { CARS, EXCHANGE_ROOF, GARAGES, GARAGE_TUNING, HIDEOUTS, JOBS, LIMIT, PLATFORMS, POINTS, ROAD, START, TOOLS, TUNE, UPGRADES, W, clamp, toward, type CarKind } from './config.ts';
import { held, tap } from './input.ts';
import { checkpointWriter, type Progress } from './save.ts';

export interface Vehicle { x: number; v: number; lane: number; yLane: number; dir: number; hp: number; kind: CarKind; owned: boolean; personal?: true }
export interface Person { x: number; home: number; y: number; dir: number; hp: number; hit: number; shot: number; hostile: boolean; coat: string }
export interface Unit { x: number; v: number; lane: number; dir: number; heavy: boolean; target: number }
export interface Dust { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; size: number }
type Action = 'confirm' | 'door' | 'alert' | 'hit' | 'reward' | 'jump' | 'step' | 'bad';
type JobStatus = { time: number; drove: boolean; driveStart: number; beacon: boolean; rival: number };
interface Signal { title: string; detail: string; kind: 'good' | 'bad' | 'info'; age: number }
export type Purchase = keyof typeof UPGRADES | 'compact';

const carAt = (x: number, kind: CarKind, owned = false, lane = 0): Vehicle =>
  ({ x, kind, owned, v: 0, lane, yLane: lane, dir: 1, hp: CARS[kind].health });
const STARTER_KITE_X = 720;
const LANE_SHIFT_SPEED = 5.4;
const spots: [number, CarKind, number][] = [
  [1590, 'van', 1], [2660, 'compact', 1], [3410, 'coupe', 0],
  [4300, 'van', 1], [5110, 'compact', 1], [6080, 'coupe', 1], [7150, 'compact', 1],
  [8540, 'van', 0], [9240, 'compact', 1], [10900, 'coupe', 0],
];
const lanes = [-1, 0, 1];
const coats = ['#b0dbaf', '#e7a173', '#9b93d9', '#d5677d', '#62a7b2'];
const delta = (a: number, b: number) => Math.abs(a - b);
const garageNear = (x: number) => GARAGES.find(point => delta(point.x, x) < 67);

export class Game {
  body = { x: START, y: ROAD, vx: 0, vy: 0, dir: 1, ground: true };
  intake = 0;
  hp = TUNE.maxHealth;
  heat = 0;
  search = 0;
  lastSeen = START;
  hide = false;
  units: Unit[] = [];
  private starterKite = carAt(STARTER_KITE_X, 'compact');
  cars = [this.starterKite, ...spots.map(([x, kind, lane]) => carAt(x, kind, false, lane))];
  traffic: Vehicle[] = [];
  people: Person[] = [];
  dust: Dust[] = [];
  car: Vehicle | null = null;
  job: JobStatus | null = null;
  notice: Signal | null = null;
  weapon = 0;
  charge = 14;
  attack = 0;
  damage = 0;
  jumpWindow = 0;
  groundWindow = 0;
  shake = 0;
  gait = 0;
  clock = 0;
  camera = 0;
  flash = 0;
  garage: (typeof GARAGES)[number] | null = null;
  lost = false;
  progress: Progress;
  private sound: (action: Action) => void;
  private save: ReturnType<typeof checkpointWriter>;
  private saveStatus: ReturnType<Game['save']> = 'saved';

  constructor(progress: Progress, sound: (action: Action) => void, save = checkpointWriter()) {
    this.progress = progress;
    this.sound = sound;
    this.save = save;
    this.body.x = progress.x;
    this.camera = clamp(progress.x - W * .4, 0, LIMIT - W);
    const garage = garageNear(progress.x);
    if (garage) this.stageRide(garage.x);
    for (let i = 0; i < 35; i++) {
      const x = 265 + i * 328 + (i % 5) * 39;
      if (x >= 9160 && x <= 10470) continue;
      this.people.push({ x, home: x, y: ROAD, dir: i % 2 ? 1 : -1, hp: 100, hit: 0, shot: 0,
        hostile: false, coat: coats[i % coats.length] });
    }
    for (let i = 0; i < 30; i++) {
      const t = carAt(270 + i * 390 + (i % 4) * 27, i % 6 === 0 ? 'van' : i % 4 === 0 ? 'coupe' : 'compact', false, i % 2 ? 1 : -1);
      t.dir = i % 2 ? 1 : -1;
      t.v = t.dir * (82 + (i % 4) * 15);
      this.traffic.push(t);
    }
  }

  get x() { return this.car?.x ?? this.body.x; }
  get index() { return this.progress.completed; }
  get current() { return JOBS[this.index]; }
  get remainingSentries() { return this.people.filter(p => p.hostile && p.hp > 0).length; }
  get storageOK() { return this.saveStatus === 'saved'; }
  get storageWarning() {
    return this.saveStatus === 'changed' ? 'Browser checkpoint changed elsewhere. This checkpoint is kept in this tab only.'
      : this.saveStatus === 'unavailable' ? 'Browser storage unavailable. Your checkpoint is kept in this tab only.' : '';
  }
  private get onExchangeRoof() {
    return !this.car && delta(this.x, POINTS.exchange.x) < 46 && Math.abs(this.body.y - EXCHANGE_ROOF) <= 3;
  }

  goal(): { x: number; name: string; text: string; hint?: string } {
    if (!this.current) return { ...POINTS.garage, text: 'All five jobs cleared. The coast is yours.' };
    if (this.index === 0) {
      if (!this.job) return { ...POINTS.contact, text: 'Meet Mara to start First Light',
        hint: 'A / D to move. Follow the gold marker and press E when prompted.' };
      if (this.car !== this.starterKite && !this.job.drove) return { x: this.starterKite.x, name: 'Orange Kite', text: 'Borrow the orange Kite',
        hint: this.car ? 'Press E to exit, then walk to the marked car.' : 'Walk to the marked car and press E when prompted.' };
      return { ...POINTS.delivery, text: this.job.drove ? 'Deliver the canister to Tidelane' : 'Drive the orange Kite to Tidelane',
        hint: this.car ? 'A / D to drive, W / S to change lanes, Space to brake.' : 'Follow the gold marker to Tidelane.' };
    }
    if (!this.job) return {
      ...this.current.location, text: this.index === 3
        ? 'Meet Roux · bring your Sidecar ride or take a loaner'
        : 'Meet ' + this.current.contact + ' · ' + this.current.location.name,
    };
    switch (this.index) {
      case 1: return { ...POINTS.refuge, text: this.heat ? 'Lose the tail · outrun it or hide at Bluehour' : 'Check in at Bluehour · E' };
      case 2: return this.job.beacon
        ? { ...POINTS.refuge, text: this.heat
          ? this.onExchangeRoof
            ? 'Stay on the roof to lose the search, or flee'
            : 'Escape the search and return to Bluehour'
          : 'Return the cartridge to Bluehour · E' }
        : { ...POINTS.exchange, text: 'Climb the west roofs to reach the cartridge' };
      case 3: return { ...POINTS.finish, text: 'Beat Roux to the far toll · ' + Math.max(0, this.job.time).toFixed(1) + 's' };
      default: return this.job.beacon
        ? { ...POINTS.port, text: 'Return Beacon 06 to Inez · E' }
        : { ...POINTS.freight, text: this.remainingSentries
          ? 'Clear the sentries · ' + this.remainingSentries + ' remaining'
          : 'Climb the orange crate and grab Beacon 06 · E' };
    }
  }

  say(title: string, detail: string, kind: Signal['kind'] = 'info') { this.notice = { title, detail, kind, age: 4.8 }; }
  checkpoint(x = this.x) {
    this.progress.x = Math.round(x);
    this.saveStatus = this.save(this.progress);
  }

  retry() {
    const game = new Game({ ...this.progress, owned: [...this.progress.owned] }, this.sound, this.save);
    game.saveStatus = this.saveStatus;
    return game;
  }

  reportCrime(level: number) {
    const prior = this.heat;
    this.heat = Math.min(4, Math.max(level, prior + 1));
    this.search = 0;
    this.lastSeen = this.x;
    this.hide = false;
    if (prior !== this.heat) {
      this.say(['', 'Suspicion', 'Active pursuit', 'Heavy pursuit', 'Maximum threat'][this.heat],
        'Break contact and leave the search radius, or hide at a refuge.', 'bad');
      this.sound('alert');
    }
  }

  private stepPolice(dt: number) {
    if (!this.heat) {
      for (const u of this.units) u.x += u.dir * 210 * dt;
      this.units = this.units.filter(u => delta(u.x, this.x) < 900);
      return;
    }
    const level = this.heat;
    const range = TUNE.police.range[level];
    const covered = this.hide || (this.index === 2 && this.job?.beacon && this.onExchangeRoof);
    if (!covered && this.units.some(u => delta(u.x, this.x) < range)) {
      this.lastSeen = this.x;
      this.search = 0;
    } else if (covered || delta(this.x, this.lastSeen) > TUNE.police.placeDistance ||
      (this.body.y < ROAD - 35 && !this.car)) {
      this.search += dt;
    } else {
      this.search = Math.max(0, this.search - dt * .65);
    }
    if (this.search >= TUNE.police.search[level]) {
      this.heat = 0;
      this.search = 0;
      this.units = [];
      this.say('Lost the signal', 'Heat cleared. The road is open again.', 'good');
      this.sound('confirm');
      return;
    }
    if (!covered && this.search === 0 && this.units.length < level && this.intake <= 0) {
      const heading = this.car?.dir ?? this.body.dir;
      const side = level >= 3 && this.units.length % 2 ? heading : -heading;
      let spawn = this.x + side * (TUNE.police.spawn + this.units.length * 88);
      if (spawn < 18 || spawn > LIMIT - 18) spawn = this.x - side * TUNE.police.spawn;
      if (delta(spawn, this.x) >= TUNE.police.spawn) {
        this.units.push({ x: spawn, v: 0, lane: this.units.length % 2 ? 1 : 0, dir: -side,
          heavy: level === 4 && this.units.length % 2 === 0, target: this.x });
        this.intake = 1.35;
      }
    }
    this.units = this.units.filter(u => delta(u.x, this.x) < 1430);
    for (const u of this.units) {
      const tracking = !covered && (delta(u.x, this.x) < range || this.search === 0);
      u.target = tracking ? this.x : this.lastSeen;
      const gap = u.target - u.x;
      const dir = Math.sign(gap) || u.dir;
      const targetV = delta(u.x, u.target) < 17 ? 0 : dir * TUNE.police.speed[level];
      u.v = toward(u.v, targetV, dt * 335);
      u.dir = Math.abs(u.v) > 9 ? Math.sign(u.v) : dir;
      u.x = clamp(u.x + u.v * dt, 10, LIMIT - 10);
      if (this.car && tracking) u.lane = toward(u.lane, this.car.yLane, dt * .8);
      if (level >= 2 && tracking && delta(u.x, this.x) < 32 && (!this.car ? this.body.y > ROAD - 22 : delta(u.lane, this.car.yLane) < .46))
        this.hurt(u.heavy ? 19 : 11, -u.dir);
    }
  }

  private hurt(amount: number, direction: number) {
    if (this.damage > 0 || this.hide) return;
    if (this.car) {
      this.car.hp -= amount * (this.progress.armor && this.car.personal ? 1 - GARAGE_TUNING.protection : 1);
      this.car.v *= .69;
      if (this.car.hp <= 0) {
        this.leave();
        this.hp = Math.max(0, this.hp - 26);
        this.fail('Ride disabled');
      }
    } else {
      this.hp = Math.max(0, this.hp - amount);
      this.body.vx = direction * 145;
      this.body.vy = -118;
    }
    this.damage = .66;
    this.shake = 8;
    this.sound('hit');
    if (this.hp <= 0) this.lost = true;
  }

  private drive(dt: number) {
    const c = this.car!;
    const kind = CARS[c.kind];
    const tuned = c.personal && this.progress.engine;
    const direction = Number(held('KeyD', 'ArrowRight')) - Number(held('KeyA', 'ArrowLeft'));
    const brake = held('Space');
    const top = this.topSpeed(c);
    const up = tap('KeyW', 'ArrowUp'), down = tap('KeyS', 'ArrowDown');
    if (up || down) c.lane = clamp(c.lane + Number(down) - Number(up), -1, 1);
    c.yLane = toward(c.yLane, c.lane, dt * LANE_SHIFT_SPEED);
    c.v = toward(c.v, brake ? 0 : direction * top, dt * (brake ? kind.grip
      : !direction ? kind.coast : Math.sign(c.v) === -direction ? kind.grip : kind.accel * (tuned ? 1 + GARAGE_TUNING.acceleration : 1)));
    if (Math.abs(c.v) > 9) c.dir = Math.sign(c.v);
    c.x += c.v * dt;
    if (c.x < 22 || c.x > LIMIT - 24) {
      if (Math.abs(c.v) > 110) this.hurt(13, -c.dir);
      c.v *= -.28;
      c.x = clamp(c.x, 22, LIMIT - 24);
    }
    for (const t of this.traffic) {
      if (delta(t.x, c.x) > (kind.width + CARS[t.kind].width) * .38 || delta(t.yLane, c.yLane) > .53) continue;
      if (delta(t.v, c.v) > 105) {
        this.sparks(c.x + c.dir * 24, ROAD + c.yLane * TUNE.laneOffset - 5, '#ffb575', 11);
        this.hurt(10, -c.dir);
        if (Math.abs(c.v) > 135 && this.intake <= 0 && !this.heat && this.index !== 3) this.reportCrime(TUNE.crime.theft);
      }
      t.lane = c.lane === 0 ? -t.dir : 0;
      c.v = Math.sign(c.v) * Math.min(Math.abs(c.v), 145);
    }
    if ((brake || c.hp < 25 || Math.abs(c.v) > top * .7) && Math.random() < dt * 22)
      this.sparks(c.x - c.dir * 23, ROAD + c.yLane * TUNE.laneOffset, c.hp < 25 ? '#3c3444' : '#b89b8d', 1);
    if (this.job && this.index === 0 && c === this.starterKite)
      this.job.drove ||= delta(c.x, this.job.driveStart) > 90;
  }

  private walk(dt: number) {
    const p = this.body;
    const direction = Number(held('KeyD', 'ArrowRight')) - Number(held('KeyA', 'ArrowLeft'));
    const speed = held('ShiftLeft', 'ShiftRight') ? TUNE.run : TUNE.walk;
    if (direction && this.damage < .5) p.dir = direction;
    if (this.damage < .57) p.vx = toward(p.vx, direction * speed, (p.ground ? 1500 : 880) * dt);
    const lastGait = this.gait;
    this.gait += Math.abs(p.vx) * dt * .085;
    if (p.ground && Math.floor(lastGait / Math.PI) !== Math.floor(this.gait / Math.PI)) this.sound('step');
    this.jumpWindow = tap('Space', 'KeyW', 'ArrowUp') ? TUNE.jumpBuffer : this.jumpWindow - dt;
    this.groundWindow = p.ground ? TUNE.coyote : this.groundWindow - dt;
    if (this.jumpWindow > 0 && this.groundWindow > 0) {
      p.vy = -TUNE.jump;
      p.ground = false;
      this.groundWindow = this.jumpWindow = 0;
      this.sound('jump');
    }
    const oldY = p.y;
    p.x = clamp(p.x + p.vx * dt, 14, LIMIT - 14);
    p.vy += TUNE.gravity * dt;
    p.y += p.vy * dt;
    p.ground = false;
    if (p.vy >= 0) {
      const floor = PLATFORMS.find(o => p.x >= o.x - 3 && p.x <= o.x + o.width + 3 && oldY <= o.y + 1 && p.y >= o.y);
      if (floor || p.y >= ROAD) {
        if (p.vy > 190) this.sparks(p.x, p.y, '#e6a187', 4);
        p.y = floor?.y ?? ROAD;
        p.vy = 0;
        p.ground = true;
      }
    }
  }

  private stepPeople(dt: number) {
    for (const n of this.people) {
      if (delta(n.x, this.x) > 750) continue;
      n.hit = Math.max(0, n.hit - dt);
      n.shot = Math.max(0, n.shot - dt);
      if (n.hp <= 0) continue;
      if (!n.hostile) {
        if (delta(n.x, this.x) < 100 && (this.heat >= 2 || this.attack > .06)) n.dir = Math.sign(n.x - this.x) || 1;
        else if (delta(n.x, n.home) > 115) n.dir = Math.sign(n.home - n.x);
        n.x = clamp(n.x + n.dir * (this.heat >= 2 ? 86 : 31) * dt, 24, LIMIT - 24);
      } else if (delta(n.x, this.x) < 228) {
        n.dir = Math.sign(this.x - n.x) || n.dir;
        const floor = PLATFORMS.find(o => o.y === n.y && n.home >= o.x && n.home <= o.x + o.width);
        if (delta(n.x, this.x) > 67 && Math.abs(n.y - this.body.y) < 63)
          n.x = clamp(n.x + n.dir * dt * 44, floor?.x ?? n.home - 98, floor ? floor.x + floor.width : n.home + 98);
        if (n.shot <= 0 && delta(n.x, this.x) < 72 && delta(n.y, this.body.y) < 25 && !this.car) {
          n.shot = 1.15;
          this.hurt(14, n.dir);
        }
      }
    }
  }

  private fight() {
    if (tap('Digit1')) this.weapon = 0;
    if (tap('Digit2')) this.weapon = 1;
    if (tap('Digit3')) this.weapon = 2;
    if (!tap('KeyF') || this.attack > 0) return;
    if (this.weapon && this.charge <= 0) {
      this.say('Out of charge', 'Use palm strike (1) or restock at Sidecar.', 'bad');
      return;
    }
    const w = TOOLS[this.weapon];
    this.attack = w.cooldown;
    this.flash = .15;
    if (this.weapon) this.charge -= 1;
    this.sound('hit');
    const p = this.body;
    const victim = this.people.filter(n => n.hp > 0 && delta(n.y, p.y) <= w.vertical &&
      (n.x - p.x) * p.dir >= -12 && delta(n.x, p.x) <= w.range)
      .sort((a, b) => Number(b.hostile) - Number(a.hostile) || delta(a.x, p.x) - delta(b.x, p.x))[0];
    if (!victim) return;
    victim.hp -= w.damage;
    victim.hit = .28;
    if (victim.y === ROAD) victim.x += p.dir * 13;
    this.sparks(victim.x, victim.y - 29, w.color, 10);
    if (!victim.hostile) this.reportCrime(1);
  }

  private leave() {
    const c = this.car;
    if (!c) return;
    this.body.x = clamp(c.x - c.dir * 27, 15, LIMIT - 15);
    this.body.y = ROAD;
    this.body.vx = this.body.vy = 0;
    this.body.dir = c.dir;
    c.v = 0;
    this.car = null;
    this.sound('door');
  }

  private board(c: Vehicle, theft: boolean) {
    this.car = c;
    this.hide = false;
    if (theft && !c.owned) this.reportCrime(TUNE.crime.theft);
    this.sound('door');
  }

  private topSpeed(c: Vehicle) {
    return CARS[c.kind].speed * (c.personal && this.progress.engine ? 1 + GARAGE_TUNING.speed : 1);
  }

  private missionRide() {
    const car = this.car;
    return car?.personal && (this.index !== 3 || this.topSpeed(car) > TUNE.raceRival.speed + TUNE.raceRival.swing)
      ? car : null;
  }

  private startJob() {
    if (!this.current) return;
    this.checkpoint(this.current.location.x);
    if (this.index === 0 && this.starterKite.hp <= 0) {
      this.cars = this.cars.filter(c => c !== this.starterKite);
      this.starterKite = carAt(STARTER_KITE_X, 'compact');
      this.cars.push(this.starterKite);
    }
    this.job = { time: 0, drove: false, driveStart: this.starterKite.x, beacon: false, rival: 0 };
    this.say(this.current.title, this.current.line);
    this.sound('confirm');
    if (this.index === 1 || this.index === 3) {
      const start = this.current.location.x + 26;
      const ride = this.missionRide();
      if (ride) {
        ride.x = start;
        ride.v = 0;
        ride.dir = 1;
        ride.lane = ride.yLane = 0;
      } else {
        this.leave();
        this.cars = this.cars.filter(c => !c.owned || c.personal);
        const loan = carAt(start, 'coupe', true);
        this.cars.push(loan);
        this.board(loan, false);
      }
    }
    if (this.index === 1) {
      this.job.time = TUNE.getawayTime;
      this.reportCrime(2);
      this.say(this.current.title, this.current.line);
    }
    if (this.index === 3) {
      this.job.time = TUNE.raceTime;
      this.job.rival = this.x - 45;
    }
    if (this.index === 4) {
      this.charge = Math.max(this.charge, 10);
      this.people = this.people.filter(n => !n.hostile);
      for (const [x, y] of [[9405, ROAD], [9690, ROAD - 70], [10048, ROAD - 52]])
        this.people.push({ x, home: x, y, dir: -1, hp: 70, shot: 0, hit: 0, coat: '#c78668', hostile: true });
    }
  }

  private finish() {
    if (!this.current) return;
    const { title, reward } = this.current;
    this.progress.cash += reward;
    this.progress.completed += 1;
    this.job = null;
    this.checkpoint();
    const garageHint = this.index === 2 ? ' · Sidecar Outpost is east of Bluehour' : '';
    this.say(this.current ? 'Job cleared · ' + title : 'The coast is yours',
      '+$' + reward + ' · ' + (this.storageOK ? 'Checkpoint saved' : 'Saved for this tab only') + garageHint, 'good');
    this.sound('reward');
  }

  private fail(reason: string) {
    if (!this.job) return;
    this.job = null;
    this.people = this.people.filter(n => !n.hostile);
    this.say('Job failed · ' + reason, 'Return to the contact to retry, or continue from the checkpoint.', 'bad');
    this.sound('bad');
  }

  private stepJob(dt: number) {
    if (!this.job) return;
    if (this.index === 0 && this.job.drove && delta(this.x, POINTS.delivery.x) < 66) this.finish();
    if (!this.job) return;
    if (this.index === 1) {
      this.job.time -= dt;
      if (this.job.time <= 0) this.fail('Out of time');
    }
    if (this.index === 3) {
      this.job.time -= dt;
      this.job.rival += (TUNE.raceRival.speed + Math.sin(this.clock * 1.6) * TUNE.raceRival.swing) * dt;
      if (this.car && this.x >= POINTS.finish.x && this.job.rival < POINTS.finish.x) this.finish();
      else if (this.job.time <= 0 || this.job.rival >= POINTS.finish.x) this.fail('Roux crossed first');
    }
  }

  private nearestCar() {
    return this.cars.filter(c => c.hp > 0 && c !== this.car && delta(c.x, this.x) < 60)
      .sort((a, b) => delta(a.x, this.x) - delta(b.x, this.x))[0];
  }

  private interaction(): { label: string; run: () => void } | null {
    const near = (x: number, distance = 72) => delta(this.x, x) < distance;
    const hideout = HIDEOUTS.find(p => near(p.x, TUNE.police.hideDistance));
    if (this.hide) {
      if (this.heat) return null;
      return { label: 'Leave refuge', run: () => { this.hide = false; this.sound('door'); } };
    }
    if (hideout && this.heat && (!this.car || Math.abs(this.car.v) < 105)) return {
      label: 'Hide at ' + hideout.name,
      run: () => { if (this.car) this.car.v = 0; this.hide = true; this.sound('door'); }
    };
    if (!this.job && this.current && near(this.current.location.x) && !this.heat) {
      const ride = this.missionRide();
      const via = this.index === 3 ? (ride ? ' · race your ' + CARS[ride.kind].label : ' · take the Sable loaner') : '';
      return { label: 'Talk to ' + this.current.contact + via, run: () => this.startJob() };
    }
    if (this.job) {
      if (this.index === 1 && !this.heat && near(POINTS.refuge.x))
        return { label: 'Check in with Mara', run: () => this.finish() };
      if (this.index === 2 && !this.job.beacon && this.onExchangeRoof)
        return { label: 'Take the cartridge', run: () => { this.job!.beacon = true; this.reportCrime(TUNE.crime.exchange); } };
      if (this.index === 2 && this.job.beacon && !this.heat && near(POINTS.refuge.x))
        return { label: 'Hand off the cartridge', run: () => this.finish() };
      if (this.index === 4 && !this.job.beacon && !this.car && near(POINTS.freight.x, 50) &&
        this.body.y <= ROAD - 44 && !this.remainingSentries)
        return { label: 'Retrieve Beacon 06', run: () => { this.job!.beacon = true; this.sound('confirm'); } };
      if (this.index === 4 && this.job.beacon && near(POINTS.port.x))
        return { label: 'Return the beacon', run: () => this.finish() };
    }
    if (this.car) return { label: 'Exit ' + CARS[this.car.kind].label, run: () => this.leave() };
    const garage = garageNear(this.x);
    if (!this.heat && garage) return { label: 'Open ' + garage.name, run: () => { this.garage = garage; this.sound('door'); } };
    const c = this.nearestCar();
    if (c && this.body.y > ROAD - 31) return {
      label: (c.owned ? 'Enter ' : 'Borrow ') + CARS[c.kind].label, run: () => this.board(c, true)
    };
    return null;
  }

  prompt() { return this.interaction()?.label ?? ''; }

  purchase(key: Purchase) {
    if (!this.garage) return;
    const p = this.progress;
    if (key === 'engine' || key === 'armor') {
      if (p[key] || p.cash < UPGRADES[key]) return;
      p.cash -= UPGRADES[key];
      p[key] = true;
    } else {
      if (!p.owned.includes(key)) {
        if (key === 'compact' || p.cash < UPGRADES[key]) return;
        p.cash -= UPGRADES[key];
        p.owned.push(key);
      }
      p.selected = key;
    }
    this.stageRide(this.garage.x);
    this.checkpoint(this.garage.x);
    this.sound('reward');
  }

  private stageRide(x: number) {
    this.cars = this.cars.filter(c => !c.personal);
    this.cars.push({ ...carAt(x + 115, this.progress.selected, true), personal: true });
  }

  service() {
    if (!this.garage) return;
    this.hp = TUNE.maxHealth;
    this.charge = 14;
    this.stageRide(this.garage.x);
    this.checkpoint(this.garage.x);
    this.say('Ride staged', 'Find your ' + CARS[this.progress.selected].label + ' just east of the garage.', 'good');
    this.sound('confirm');
  }

  sparks(x: number, y: number, color: string, count: number) {
    for (let i = 0; i < count; i++) {
      const life = .13 + Math.random() * .36;
      this.dust.push({ x, y, vx: (Math.random() - .5) * 105, vy: -Math.random() * 64,
        life, max: life, color, size: 1 + Math.random() * 3 });
    }
  }

  step(dt: number) {
    this.clock += dt;
    this.intake -= dt;
    this.damage = Math.max(0, this.damage - dt);
    this.attack = Math.max(0, this.attack - dt);
    this.flash = Math.max(0, this.flash - dt);
    this.shake *= Math.exp(-dt * 12);
    if (this.notice && (this.notice.age -= dt) <= 0) this.notice = null;
    if (tap('KeyE')) this.interaction()?.run();
    if (this.garage || this.lost) return;
    if (!this.hide) {
      if (this.car) this.drive(dt);
      else { this.walk(dt); this.fight(); }
    }
    for (const t of this.traffic) {
      t.yLane = toward(t.yLane, t.lane, dt * LANE_SHIFT_SPEED);
      t.x += t.v * dt;
      if (t.x > LIMIT + 95) t.x = -95;
      if (t.x < -95) t.x = LIMIT + 95;
    }
    this.stepPeople(dt);
    this.stepPolice(dt);
    this.stepJob(dt);
    for (const p of this.dust) {
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 38 * dt; p.life -= dt;
    }
    this.dust = this.dust.filter(p => p.life > 0);
    const look = this.car ? this.car.v * .36 : this.body.vx * .25;
    this.camera += (clamp(this.x - W * .44 + look, 0, LIMIT - W) - this.camera) * (1 - Math.exp(-dt * 5.8));
  }
}
