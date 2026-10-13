export type ShipType = 'battleship' | 'cruiser' | 'destroyer';

export interface HexCell {
  q: number;
  r: number;
  isShip: boolean;
  isHit: boolean;
  isMiss: boolean;
  shipId: number | null;
  shipType: ShipType | null;
  currentHP: number | null;
}

export type CompartmentPosition = 'bow' | 'forward' | 'mid' | 'aft' | 'stern';
export type CompartmentDeck = 'upper' | 'middle' | 'lower' | 'bottom';
export type CompartmentSide = 'port' | 'center' | 'starboard';
export type CompartmentStatus = 'intact' | 'damaged' | 'flooded' | 'destroyed' | 'on_fire';

export interface BattleLogEntry {
  id: string;
  turn: number;
  timestamp: number;
  type: 'fire_start' | 'fire_spread' | 'fire_extinguished' | 'flooding_start' | 'flooding_spread' | 'ammo_detonation' | 'ship_sunk' | 'critical_damage' | 'shot_hit' | 'shot_miss';
  shipId: number;
  shipName: string;
  compartmentId?: string;
  compartmentName?: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
}

export type ComponentType = 
  | 'bridge' | 'forward_turret' | 'aft_turret' | 'engine' | 'boiler'
  | 'rudder' | 'propeller' | 'radar' | 'torpedo_tube' | 'ammo_magazine'
  | 'fuel_tank' | 'generator' | 'pump' | 'aa_gun' | 'fire_control';

export type ComponentStatus = 'operational' | 'damaged' | 'destroyed';

export interface Component {
  type: ComponentType;
  name: string;
  maxHP: number;
  currentHP: number;
  status: ComponentStatus;
  vulnerability: number;
  effect: string;
}

export interface Compartment {
  id: string;
  position: CompartmentPosition;
  deck: CompartmentDeck;
  side: CompartmentSide;
  name: string;
  maxHP: number;
  currentHP: number;
  status: CompartmentStatus;
  watertight: boolean;
  armor: number;
  flooded: number;
  fire: number;
  components: Component[];
  adjacentIds: string[];
  detonated?: boolean;
  lengthMeters?: number;
  positionFromBow?: number;
}

export interface ShipStats {
  speed: number;
  maneuverability: number;
  mainGunFire: number;
  aaFire: number;
  detection: number;
  buoyancy: number;
  list: number;
  trim: number;
  fires: number;
  flooding: number;
}

export interface Ship {
  id: number;
  type: ShipType;
  name: string;
  maxHP: number;
  currentHP: number;
  q: number;
  r: number;
  heading: Heading;
  accuracy: number;
  damage: number;
  speed: number;
  range: number;
  hasMoved: boolean;
  hasFired: boolean;
  compartments: Compartment[];
  stats: ShipStats;
  battleLog: BattleLogEntry[];
  isSunk: boolean;
  sinkCause?: 'flooding' | 'detonation' | 'buoyancy';
  length?: number;
  beam?: number;
  draft?: number;
  displacementStandard?: number;
  displacementFull?: number;
}

export type Heading = 0 | 1 | 2 | 3 | 4 | 5;

export interface Shot {
  shipId: number;
  shipName: string;
  shipType: ShipType;
  targetQ: number;
  targetR: number;
  hit: boolean;
  damage: number;
  targetShipId: number | null;
  targetShipName: string | null;
}

export interface Trajectory {
  shipId: number;
  path: { q: number; r: number }[];
}

export type GamePhase = 'placement' | 'movement' | 'planning' | 'execution' | 'results' | 'gameOver';

export const SHIP_FLEET = [
  { type: 'battleship' as ShipType, count: 1, name: 'Линкор', hp: 100, accuracy: 75, damage: 35, speed: 2, range: 10 },
  { type: 'cruiser' as ShipType, count: 1, name: 'Крейсер', hp: 50, accuracy: 70, damage: 25, speed: 3, range: 7 },
  { type: 'destroyer' as ShipType, count: 2, name: 'Эсминец', hp: 25, accuracy: 65, damage: 20, speed: 4, range: 4 },
];

export const TOTAL_SHIPS = SHIP_FLEET.reduce((sum, s) => sum + s.count, 0);
export const BOARD_SIZE = 25;

function createComponentsForCompartment(
  position: CompartmentPosition,
  deck: CompartmentDeck,
  shipType: ShipType
): Component[] {
  const components: Component[] = [];

  if (deck === 'upper' && (position === 'forward' || position === 'mid')) {
    components.push({
      type: 'bridge', name: 'Мостик', maxHP: 20, currentHP: 20,
      status: 'operational', vulnerability: 0.8, effect: 'Снижает управляемость на 50%'
    });
  }

  if (deck === 'upper' && position === 'mid') {
    components.push({
      type: 'fire_control', name: 'КДП', maxHP: 15, currentHP: 15,
      status: 'operational', vulnerability: 0.7, effect: 'Снижает точность огня на 40%'
    });
  }

  if (position === 'forward' && deck === 'upper') {
    components.push({
      type: 'forward_turret', name: 'Носовая башня ГК', maxHP: 30, currentHP: 30,
      status: 'operational', vulnerability: 0.6, effect: 'Снижает огонь ГК на 50%'
    });
  }
  if (position === 'aft' && deck === 'upper') {
    components.push({
      type: 'aft_turret', name: 'Кормовая башня ГК', maxHP: 30, currentHP: 30,
      status: 'operational', vulnerability: 0.6, effect: 'Снижает огонь ГК на 50%'
    });
  }

  if ((deck === 'middle' || deck === 'lower') && position === 'aft') {
    components.push({
      type: 'engine', name: 'Двигатель', maxHP: 40, currentHP: 40,
      status: 'operational', vulnerability: 0.5, effect: 'Снижает скорость на 50%'
    });
  }

  if (deck === 'middle' && position === 'mid') {
    components.push({
      type: 'boiler', name: 'Котёл', maxHP: 35, currentHP: 35,
      status: 'operational', vulnerability: 0.5, effect: 'Снижает скорость на 30%'
    });
  }

  if (position === 'stern' && deck === 'lower') {
    components.push({
      type: 'rudder', name: 'Руль', maxHP: 25, currentHP: 25,
      status: 'operational', vulnerability: 0.9, effect: 'Снижает управляемость на 70%'
    });
  }

  if (position === 'stern' && deck === 'bottom') {
    components.push({
      type: 'propeller', name: 'Винты', maxHP: 30, currentHP: 30,
      status: 'operational', vulnerability: 0.7, effect: 'Снижает скорость на 40%'
    });
  }

  if (deck === 'upper' && position === 'mid' && shipType !== 'destroyer') {
    components.push({
      type: 'radar', name: 'Радар', maxHP: 15, currentHP: 15,
      status: 'operational', vulnerability: 0.8, effect: 'Снижает дальность обнаружения'
    });
  }

  if (shipType !== 'battleship' && position === 'mid' && deck === 'upper') {
    components.push({
      type: 'torpedo_tube', name: 'Торпедный аппарат', maxHP: 20, currentHP: 20,
      status: 'operational', vulnerability: 0.6, effect: 'Отключает торпедное вооружение'
    });
  }

  if (deck === 'lower' && (position === 'forward' || position === 'aft')) {
    components.push({
      type: 'ammo_magazine', name: 'Погреб боеприпасов', maxHP: 25, currentHP: 25,
      status: 'operational', vulnerability: 0.95, effect: 'Риск детонации при уничтожении'
    });
  }

  if (deck === 'lower' && position === 'mid') {
    components.push({
      type: 'fuel_tank', name: 'Топливный бак', maxHP: 20, currentHP: 20,
      status: 'operational', vulnerability: 0.85, effect: 'Риск пожара при повреждении'
    });
  }

  if (deck === 'middle' && position === 'mid') {
    components.push({
      type: 'generator', name: 'Генератор', maxHP: 20, currentHP: 20,
      status: 'operational', vulnerability: 0.6, effect: 'Снижает эффективность радаров и ПВО'
    });
    components.push({
      type: 'pump', name: 'Насос', maxHP: 15, currentHP: 15,
      status: 'operational', vulnerability: 0.7, effect: 'Затрудняет откачку воды'
    });
  }

  if (deck === 'upper' && position === 'mid' && shipType !== 'destroyer') {
    components.push({
      type: 'aa_gun', name: 'Зенитное орудие', maxHP: 15, currentHP: 15,
      status: 'operational', vulnerability: 0.7, effect: 'Снижает ПВО'
    });
  }

  return components;
}

export function createCompartments(shipType: ShipType, shipLengthMeters: number = 200): Compartment[] {
  const compartments: Compartment[] = [];
  const COMPARTMENT_LENGTH = 10;
  
  const numCompartments = Math.ceil(shipLengthMeters / COMPARTMENT_LENGTH);
  
  const decks: CompartmentDeck[] = shipType === 'destroyer' 
    ? ['upper', 'lower'] 
    : ['upper', 'middle', 'lower'];
  
  let compartmentId = 1;

  for (let i = 0; i < numCompartments; i++) {
    const positionFromBow = i * COMPARTMENT_LENGTH;
    
    let position: CompartmentPosition;
    const relativePos = i / numCompartments;
    
    if (relativePos < 0.15) {
      position = 'bow';
    } else if (relativePos < 0.35) {
      position = 'forward';
    } else if (relativePos < 0.65) {
      position = 'mid';
    } else if (relativePos < 0.85) {
      position = 'aft';
    } else {
      position = 'stern';
    }
    
    for (const deck of decks) {
      const id = `comp_${compartmentId++}`;
      
      let baseHP = 20;
      if (shipType === 'battleship') {
        baseHP = deck === 'upper' ? 25 : deck === 'middle' ? 30 : 35;
      } else if (shipType === 'cruiser') {
        baseHP = deck === 'upper' ? 20 : deck === 'middle' ? 25 : 30;
      } else {
        baseHP = deck === 'upper' ? 15 : 25;
      }
      
      let armor = 50;
      if (shipType === 'battleship') {
        armor = deck === 'upper' ? 100 : deck === 'middle' ? 150 : 200;
      } else if (shipType === 'cruiser') {
        armor = deck === 'upper' ? 75 : deck === 'middle' ? 100 : 125;
      } else {
        armor = deck === 'upper' ? 25 : 75;
      }

      compartments.push({
        id,
        position,
        deck,
        side: 'center',
        name: `Отсек ${i + 1} - ${getDeckName(deck)}`,
        maxHP: baseHP,
        currentHP: baseHP,
        status: 'intact',
        watertight: deck !== 'upper',
        armor,
        flooded: 0.0,
        fire: 0.0,
        components: createComponentsForCompartment(position, deck, shipType),
        adjacentIds: [],
        lengthMeters: COMPARTMENT_LENGTH,
        positionFromBow
      });
    }
  }

  compartments.forEach(comp => {
    const adjacent = compartments.filter(other => {
      if (other.id === comp.id) return false;
      
      if (comp.positionFromBow !== undefined && other.positionFromBow !== undefined) {
        const posDiff = Math.abs(comp.positionFromBow - other.positionFromBow);
        if (posDiff === COMPARTMENT_LENGTH && comp.deck === other.deck) {
          return true;
        }
      }
      
      const deckOrder: CompartmentDeck[] = ['upper', 'middle', 'lower'];
      const deckDiff = Math.abs(deckOrder.indexOf(comp.deck) - deckOrder.indexOf(other.deck));
      if (deckDiff === 1 && comp.positionFromBow === other.positionFromBow) {
        return true;
      }
      
      return false;
    });
    comp.adjacentIds = adjacent.map(a => a.id);
  });

  return compartments;
}

function getDeckName(deck: CompartmentDeck): string {
  switch (deck) {
    case 'upper': return 'Верхняя палуба';
    case 'middle': return 'Средняя палуба';
    case 'lower': return 'Нижняя палуба';
    case 'bottom': return 'Двойное дно';
    default: return 'Палуба';
  }
}

export function calculateShipStats(compartments: Compartment[]): ShipStats {
  const stats: ShipStats = {
    speed: 1.0,
    maneuverability: 1.0,
    mainGunFire: 1.0,
    aaFire: 1.0,
    detection: 1.0,
    buoyancy: 1.0,
    list: 0.0,
    trim: 0.0,
    fires: 0,
    flooding: 0.0
  };

  let totalFlooded = 0;
  let totalCompartments = 0;
  let portFlooded = 0;
  let starboardFlooded = 0;
  let bowFlooded = 0;
  let sternFlooded = 0;

  compartments.forEach(comp => {
    totalCompartments++;
    
    if (comp.flooded > 0) {
      totalFlooded += comp.flooded;
      if (comp.side === 'port') portFlooded += comp.flooded;
      if (comp.side === 'starboard') starboardFlooded += comp.flooded;
      if (comp.position === 'bow' || comp.position === 'forward') bowFlooded += comp.flooded;
      if (comp.position === 'stern' || comp.position === 'aft') sternFlooded += comp.flooded;
    }

    if (comp.fire > 0) {
      stats.fires++;
    }

    comp.components.forEach(component => {
      const effectiveness = component.currentHP / component.maxHP;
      
      switch (component.type) {
        case 'engine':
        case 'boiler':
        case 'propeller':
          stats.speed *= (0.5 + effectiveness * 0.5);
          break;
        case 'rudder':
        case 'bridge':
          stats.maneuverability *= (0.3 + effectiveness * 0.7);
          break;
        case 'forward_turret':
        case 'aft_turret':
        case 'fire_control':
          stats.mainGunFire *= (0.4 + effectiveness * 0.6);
          break;
        case 'aa_gun':
          stats.aaFire *= (0.4 + effectiveness * 0.6);
          break;
        case 'radar':
          stats.detection *= (0.5 + effectiveness * 0.5);
          break;
      }
    });
  });

  if (totalCompartments > 0) {
    stats.flooding = totalFlooded / totalCompartments;
    stats.buoyancy = Math.max(0, 1.0 - stats.flooding * 0.8);
    stats.list = (starboardFlooded - portFlooded) / totalCompartments;
    stats.trim = (sternFlooded - bowFlooded) / totalCompartments;
  }

  return stats;
}
