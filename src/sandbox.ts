import { CARS, clamp, W } from './config.ts';
import { Armory, clearShot, weapons, type Actor, type AttackInput, type Drop } from './combat.ts';
import { businesses, type Business, type Crime, type CrimeKind } from './crime.ts';
import { blockAt, DISTRICT_WIDTH, SPAWN, STREET } from './district.ts';
import { Police, type Suspect } from './police.ts';
import { savedHeight, type SandboxSave } from './sandbox-save.ts';
import { shopStock, type Stock } from './shops.ts';
import { advanceCrowd, gangLoot, streetLife } from './street-life.ts';
import { bodyAt, closeDoor, nearbyLadder, traverse, type MotionInput } from './traversal.ts';
import { commute, fleet, steer, type DriveInput, type Ride } from './vehicles.ts';

export type SandboxInput = MotionInput & AttackInput & DriveInput & { rob?: boolean };

export class Sandbox {
  body = bodyAt(SPAWN);
  time = 0;
  camera = 0;
  sound: (name: string) => void;
  hp = 100;
  hit = 0;
  outfit = 0;
  hair = 0;
  cash = 140;
  engine = false;
  armor = false;
  shop: Business | null = null;
  notice = '';
  noticeTime = 0;
  private stepAt = 0;
  crime: Crime | null = null;
  police = new Police();
  rides = fleet();
  ride: Ride | null = null;
  private lastExitedRide?: Ride;
  armory = new Armory();
  actors = streetLife();
  drops: Drop[] = [
    { x: 444, y: STREET, weapon: 1, covered: false },
    { x: 643, y: 188, weapon: 2, covered: false },
    { x: 1165, y: STREET, weapon: 2, covered: false },
    { x: 1794, y: 257, weapon: 3, covered: false },
    { x: 2160, y: STREET, weapon: 4, covered: false },
    { x: 3280, y: 190, weapon: 5, covered: false },
  ];

  constructor(sound: (name: string) => void = () => {}) { this.sound = sound; }

  get block() { return blockAt(this.body.x); }
  get suspect(): Suspect {
    return { x: this.body.x, y: this.body.y, covered: this.body.covered, camera: this.camera, ride: this.ride,
      identity: { outfit: this.outfit, hair: this.hair, ride: this.ride?.id ?? '', paint: this.ride?.color ?? '' } };
  }
  get pickup() {
    return !this.ride && this.drops.find(d => d.covered === this.body.covered && Math.abs(d.y - this.body.y) < 25 && Math.abs(d.x - this.body.x) < 29);
  }
  get roadside() { return !this.body.covered && this.body.grounded && this.body.y === STREET; }
  get business() { return this.roadside ? businesses.find(shop => Math.abs(shop.x - this.body.x) < 36) : undefined; }
  get garageRide() {
    if (this.business?.id !== 'paint') return;
    const stopped = (car: Ride) => car.hp > 0 && Math.abs(car.v) <= 28;
    if (this.ride) return stopped(this.ride) ? this.ride : undefined;
    let parked: Ride | undefined;
    let min = 52;
    for (const car of this.rides) {
      const gap = Math.abs(car.x - this.body.x);
      if (!car.taken || !stopped(car) || gap >= 52) continue;
      if (car === this.lastExitedRide) return car;
      if (gap < min) {
        parked = car;
        min = gap;
      }
    }
    return parked;
  }
  get garageRideLabel() {
    const car = this.garageRide;
    if (!car) return;
    const target = car === this.ride ? 'current car' : car === this.lastExitedRide ? 'your last car' : 'nearest parked car';
    return `${CARS[car.kind].label} (${target})`;
  }
  get ammoPackRounds() {
    const { gun, ammo } = this.armory;
    return Math.min(gun.refill, gun.refill * 4 - ammo.reserve);
  }
  get availableRide() {
    if (!this.roadside) return;
    let nearest: Ride | undefined;
    let min = 52;
    for (const ride of this.rides) {
      const distance = Math.abs(ride.x - this.body.x);
      if (ride.hp <= 0 || Math.abs(ride.v) > 145 || distance >= min) continue;
      min = distance;
      nearest = ride;
    }
    return nearest;
  }
  get robberyTarget() {
    if (!this.roadside || this.ride) return;
    const business = this.business;
    const clerk = business && this.actors.find(actor => actor.id === business.id && actor.hp && Math.abs(actor.x - business.x) < 40);
    if (clerk && !clerk.robbed) return { actor: clerk, amount: business.till, name: business.name, kind: 'shopRobbery' as const };
    let victim: Actor | undefined;
    let closest = 37;
    for (const actor of this.actors) {
      const gap = Math.abs(actor.x - this.body.x);
      if (actor.role !== 'pedestrian' || !actor.hp || actor.robbed || gap >= closest) continue;
      victim = actor;
      closest = gap;
    }
    if (victim) return { actor: victim, amount: 16 + victim.outfit * 5, name: 'Pedestrian', kind: 'robbery' as const };
  }

  announce(message: string) { this.notice = message; this.noticeTime = 3.2; }

  snapshot(): SandboxSave {
    const lead = this.police.last;
    return {
      version: 2, x: Math.round(clamp(this.body.x, 22, DISTRICT_WIDTH - 22)), covered: this.body.covered, hp: Math.max(1, this.hp), cash: this.cash,
      outfit: this.outfit, hair: this.hair, engine: this.engine, armor: this.armor,
      stock: structuredClone(this.armory.stock), selected: this.armory.slot, regions: ['Crownwater'],
      robbed: this.actors.filter(a => a.robbed).map(a => a.id), defeated: this.actors.filter(a => !a.hp).map(a => a.id),
      drops: this.drops.map(d => ({ ...d })),
      rides: this.rides.filter(r => r.taken || r.hp < CARS[r.kind].health).map(({ id, x, lane, dir, hp, color, taken }) =>
        ({ id, x: Math.round(clamp(x, 22, DISTRICT_WIDTH - 22)), lane, dir, hp, color, taken })),
      driving: this.ride?.hp ? this.ride.id : null, heat: this.police.points,
      evidence: this.police.evidence && { ...this.police.evidence },
      lead: lead ? Math.round(clamp(lead.x, 22, DISTRICT_WIDTH - 22)) : null,
      ...(lead && { leadY: Math.round(lead.y) }),
    };
  }

  restore(save: SandboxSave) {
    this.body = bodyAt(save.x);
    this.body.covered = save.covered;
    this.body.y = savedHeight(save);
    this.camera = clamp(save.x - W * .43, 0, DISTRICT_WIDTH - W);
    this.hp = save.hp;
    this.cash = save.cash;
    this.outfit = save.outfit;
    this.hair = save.hair;
    this.engine = save.engine;
    this.armor = save.armor;
    this.armory.stock = structuredClone(save.stock);
    this.armory.slot = save.selected;
    this.drops = save.drops.map(d => ({ ...d }));
    for (const a of this.actors) {
      if (save.robbed.includes(a.id)) a.robbed = true;
      if (save.defeated.includes(a.id)) { a.hp = 0; a.down = 10; }
    }
    for (const ride of this.rides) {
      const old = save.rides.find(r => r.id === ride.id);
      if (!old) continue;
      Object.assign(ride, old, { depth: old.lane, v: 0, traffic: !old.taken && ride.traffic });
    }
    this.ride = this.rides.find(ride => ride.id === save.driving) ?? null;
    if (this.ride) { this.body.x = this.ride.x; this.body.dir = this.ride.dir; }
    this.police.points = save.heat;
    this.police.evidence = save.evidence;
    if (save.lead !== null) this.police.last = { x: save.lead, y: save.leadY ?? STREET,
      identity: save.evidence ?? this.suspect.identity, age: 0 };
  }

  purchaseIssue(item: Stock) {
    if (!this.shop || this.business !== this.shop || !shopStock[this.shop.id].includes(item)) return 'Shop unavailable';
    if (item.kind === 'outfit' && this.outfit === item.value) return 'Already wearing this outfit';
    if (item.kind === 'hair' && this.hair === item.value) return 'Already styled this way';
    if (item.kind === 'gear' && this.armory.stock[item.value]) return 'Already in your inventory';
    if (item.kind === 'med' && this.hp === 100) return 'Health is already full';
    if ((item.kind === 'engine' || item.kind === 'armor') && this[item.kind]) return 'Upgrade already fitted';
    if (item.kind === 'ammo') {
      if (!this.armory.gun.mag) return 'Equip a firearm first';
      if (this.ammoPackRounds <= 0) return 'Ammunition reserve full';
    }
    if (item.kind === 'paint') {
      const car = this.garageRide;
      if (!car) return 'Stop a vehicle you have driven next to the shop';
      if (car.color === item.value) return 'Already painted this color';
      if (this.police.level &&
        (this.police.spotted || this.police.watched(this.suspect) || this.police.watched({ ...this.suspect, x: car.x })))
        return 'Police are watching · lose sight first';
    }
    if ((item.kind === 'outfit' || item.kind === 'hair') && this.police.level &&
      (this.police.spotted || this.police.watched(this.suspect))) return 'Police are watching · lose sight first';
    return this.cash < item.price ? 'Not enough cash' : '';
  }

  buy(item: Stock) {
    const issue = this.purchaseIssue(item);
    if (issue) return issue;
    switch (item.kind) {
      case 'outfit':
      case 'hair': this[item.kind] = item.value; break;
      case 'paint': this.garageRide!.color = item.value; break;
      case 'gear': this.armory.supply(item.value); break;
      case 'ammo': this.armory.supply(this.armory.slot); break;
      case 'med': this.hp = Math.min(100, this.hp + 60); break;
      case 'engine':
      case 'armor': this[item.kind] = true; break;
    }
    this.cash -= item.price;
    this.sound('confirm');
    this.announce(item.name + ' · −$' + item.price);
    return '';
  }

  offend(kind: CrimeKind) {
    const { x, y, covered } = this.body;
    const seen = this.actors.filter(actor => actor.hp > 0 && actor.faction === undefined && actor.covered === covered
      && Math.abs(actor.x - x) < 220 && clearShot(x, y - 30, actor.x, actor.y - 30));
    this.crime = { kind, x, y, covered, witnesses: seen.length };
    const before = this.police.level;
    const observed = this.police.report(this.crime, this.suspect);
    if (this.police.level > before) this.sound('radio');
    for (const actor of seen) {
      actor.panic = 4.5;
      actor.dir = actor.x < x ? -1 : 1;
    }
    return { observed, witnesses: seen.length };
  }

  hurt(damage: number) {
    if (this.hit || !this.hp) return;
    this.hp = Math.max(0, this.hp - damage);
    this.hit = .4;
    this.sound('hit');
  }

  get prompt() {
    const interact = this.interactionPrompt;
    const target = this.robberyTarget;
    const rob = target ? 'G  ·  Rob ' + target.name : '';
    return [interact, rob].filter(Boolean).join(' / ') ||
      (this.body.covered ? 'Find a lit door to return to the street' : 'Explore Crownwater');
  }

  private get interactionPrompt() {
    if (this.ride) return Math.abs(this.ride.v) > 28 ? 'W / S  ·  Change lanes / Space  ·  Brake to exit'
      : this.business?.id === 'paint' ? 'E  ·  Prism Motorworks / X  ·  Exit' : 'W / S  ·  Change lanes / E or X  ·  Exit';
    const pickup = this.pickup;
    if (pickup) {
      const weapon = pickup.weapon === undefined ? undefined : weapons[pickup.weapon];
      const ammo = pickup.weapon !== undefined && weapon?.mag && this.armory.stock[pickup.weapon];
      const parked = this.garageRideLabel;
      return `E  ·  Pick up ${weapon?.name ?? 'cash'}${ammo ? ' ammo' : ''}${parked ? ' / X  ·  Enter ' + parked : ''}`;
    }
    const door = closeDoor(this.body);
    if (door) return `E  ·  ${this.body.covered ? 'Return to street' : 'Enter ' + door.passage.name}`;
    const business = this.business;
    if (business) {
      const parked = this.garageRideLabel;
      return `E  ·  ${business.name}${parked ? ' / X  ·  Enter ' + parked : ''}`;
    }
    const ladder = nearbyLadder(this.body);
    if (ladder) {
      const keys = this.body.y >= ladder.low ? 'W / ↑' : this.body.y <= ladder.high ? 'S / ↓' : 'W S / ↑ ↓';
      return `${keys}  ·  Climb fire escape`;
    }
    const ride = this.availableRide;
    if (ride) return `E  ·  ${ride.taken ? 'Enter' : ride.traffic ? 'Carjack' : 'Steal'} ${CARS[ride.kind].label}`;
    return '';
  }

  step(dt: number, input: SandboxInput) {
    this.time += dt;
    this.hit = Math.max(0, this.hit - dt);
    this.noticeTime = Math.max(0, this.noticeTime - dt);
    if (!this.hp) return;
    if (input.rob) {
      const target = this.robberyTarget;
      if (target) {
        target.actor.robbed = true;
        this.cash += target.amount;
        const { observed, witnesses } = this.offend(target.kind);
        const report = observed ? 'Spotted by police' : witnesses === 1 ? 'Witness calling police' :
          witnesses ? `${witnesses} witnesses calling police` : 'No witnesses';
        this.announce(`${target.name} robbed · +$${target.amount} · ${report}`);
        this.sound('reward');
      } else {
        this.announce(this.ride ? 'Exit the vehicle to rob on foot' : 'No robbery target nearby');
      }
    }
    if (input.use && this.business && !this.pickup && !closeDoor(this.body) &&
      (!this.ride || this.business.id === 'paint' && Math.abs(this.ride.v) <= 28)) {
      this.shop = this.business;
      this.sound('door');
      return;
    }
    if (this.ride) this.drive(dt, input);
    else this.onFoot(dt, input);
    for (const ride of this.rides) commute(ride, dt);
    for (const actor of this.actors) if (actor.role !== 'officer') advanceCrowd(actor, this.body, dt, this.sound,
      damage => this.ride ? this.ride.hp = Math.max(0, this.ride.hp - damage * .6) : this.hurt(damage));
    this.police.step(dt, this.suspect, this.sound, damage => this.hurt(damage));
    if (this.police.level > 1) for (const actor of this.actors) {
      if (actor.faction === undefined || !actor.hostile || !actor.hp || actor.pose || actor.ready) continue;
      const officer = this.police.officers.find(unit => unit.hp > 0 && Math.abs(unit.x - actor.x) < (actor.weapon > 1 ? 77 : 24));
      if (!officer) continue;
      actor.pose = .23;
      actor.ready = 1.3;
      actor.dir = Math.sign(officer.x - actor.x) || actor.dir;
      officer.hp = Math.max(0, officer.hp - (actor.weapon > 1 ? 16 : 8));
      officer.hit = .24;
      if (!officer.hp) officer.down = .01;
      if (Math.abs(officer.x - this.body.x) < 270) this.sound(actor.weapon > 1 ? 'shot' : 'hit');
    }
    const camera = clamp(this.body.x - W * .43, 0, DISTRICT_WIDTH - W);
    this.camera += (camera - this.camera) * (1 - Math.exp(-7 * dt));
  }

  private onFoot(dt: number, input: SandboxInput) {
    const pickup = input.use && this.pickup;
    const car = (input.use || input.exit) && !closeDoor(this.body)
      && (input.exit && this.garageRide || input.use && !pickup && this.availableRide);
    if (car) {
      this.ride = car;
      this.armory.impact = null;
      if (!car.taken) {
        this.offend(car.traffic ? 'carjacking' : 'theft');
        this.announce(car.traffic ? 'Vehicle taken from driver' : 'Vehicle stolen');
        if (car.traffic) {
          const driver = this.actors.find(a => a.role === 'pedestrian' && Math.abs(car.x - a.x) < 160);
          if (driver) { driver.panic = 5; driver.dir = -car.dir; }
        }
        if (car.faction !== undefined) for (const actor of this.actors)
          if (actor.faction === car.faction) actor.hostile = true;
      }
      car.taken = true;
      car.traffic = false;
      this.body.x = car.x;
      this.body.dir = car.dir;
      this.sound('door');
      return;
    }
    if (pickup) {
      let gear = '';
      if (pickup.weapon !== undefined) {
        const { name } = weapons[pickup.weapon];
        const rounds = this.armory.supply(pickup.weapon);
        gear = rounds === undefined ? `${name} equipped · Slot ${pickup.weapon + 1}`
          : rounds ? `${name} · +${rounds} reserve`
          : weapons[pickup.weapon].mag ? `${name} reserve full` : `${name} already owned`;
      }
      if (pickup.cash) this.cash += pickup.cash;
      this.announce([gear, pickup.cash ? '+$' + pickup.cash : ''].filter(Boolean).join(' · '));
      this.drops.splice(this.drops.indexOf(pickup), 1);
      this.sound('reward');
    } else if (input.slot !== undefined && !this.armory.stock[input.slot]) {
      this.announce(`Slot ${input.slot + 1} · ${weapons[input.slot].name} not owned`);
    }
    const cue = traverse(this.body, { ...input, vertical: input.aim ? 0 : input.vertical, use: input.use && !pickup }, dt);
    if (cue) this.sound(cue);
    if (this.body.grounded && Math.abs(this.body.vx) > 45 && this.time >= this.stepAt) {
      this.stepAt = this.time + 58 / Math.abs(this.body.vx);
      this.sound('step');
    }
    const attack = this.armory.step(dt, input, this.body, [...this.actors, ...this.police.officers], this.sound);
    if (attack?.loud) this.offend('gunfire');
    const enemy = attack?.target;
    if (enemy) {
      enemy.dir = this.body.dir;
      if (enemy.faction !== undefined) {
        for (const actor of this.actors) if (actor.faction === enemy.faction) actor.hostile = true;
        if (attack.killed) this.drops.push(gangLoot(enemy));
      }
      this.offend(enemy.role === 'officer' ? attack.killed ? 'officerDown' : 'officerAttacked'
        : enemy.role === 'gang' ? 'gangFight' : attack.killed ? 'civilianDown' : 'assault');
    }
  }

  private drive(dt: number, input: SandboxInput) {
    const car = this.ride!;
    const impact = steer(car, [...this.rides, ...this.police.road], input, dt, this.engine, this.armor);
    this.body.x = car.x;
    this.body.dir = car.dir;
    if (impact) {
      this.offend(car.hp ? 'damage' : 'wreck');
      this.sound('crash');
      this.announce(car.hp ? 'Collision · bodywork damaged' : 'Vehicle disabled');
    }
    if ((!car.hp || input.use || input.exit) && (Math.abs(car.v) <= 28 || !car.hp)) {
      car.v = 0;
      this.body = bodyAt(clamp(car.x - car.dir * 34, 22, DISTRICT_WIDTH - 22));
      this.body.dir = car.dir;
      this.lastExitedRide = car;
      this.ride = null;
      this.sound('door');
    }
  }
}
