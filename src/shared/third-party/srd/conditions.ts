/*
See LICENSE-srd.md for the full license.

COPYRIGHT NOTICE Open Game License v 1.0a Copyright 2000, Wizards of the Coast, LLC. 
System Reference Document 5.1 Copyright 2016, Wizards of the Coast, Inc.; Authors Mike Mearls, Jeremy Crawford, Chris Perkins, Rodney Thompson, Peter Lee, James Wyatt, Robert J. Schwalb, Bruce R. Cordell, Chris Sims, and Steve Townshend, based on original material by E. Gary Gygax and Dave Arneson. 
*/

export const srdConditionNames = [
  "blinded",
  "charmed",
  "deafened",
  "exhaustion",
  "frightened",
  "grappled",
  "incapacitated",
  "invisible",
  "paralyzed",
  "petrified",
  "poisoned",
  "prone",
  "restrained",
  "stunned",
  "unconscious",
] as const;

export const srcExtraConditionLike = [
  "hasted",
  "polymorphed",
  "hunters mark",
  "slowed",
  "cursed",
  "concealed",
  "disarmed",
  "hidden",
  "raging",
  "surprised",
  "dead",
  "concentrating",
] as const;

export const srcConditionDescriptions: { [key: string]: string } = {
  blinded: `* A blinded creature can't see and automatically fails any ability check that requires sight. 
* Attack rolls against the creature have advantage, and the creature's attack rolls have disadvantage. `,
  charmed: `* A charmed creature can't attack the charmer or target the charmer with harmful abilities or magical effects.
* The charmer has advantage on any ability check to interact socially with the creature.`,
  deafened: `* A deafened creature can't hear and automatically fails any ability check that requires hearing.`,
  frightened: `* A frightened creature has disadvantage on ability checks and attack rolls while the source of its fear is within line of sight.
* The creature can't willingly move closer to the source of its fear.`,
  grappled: `* A grappled creature's speed becomes 0, and it can't benefit from any bonus to its speed.
* The condition ends if the grappler is incapacitated (see the condition).
* The condition also ends if an effect removes the grappled creature from the reach of the grappler or grappling effect, such as when a creature is hurled away by the thunderwave spell.`,
  incapacitated: `* An incapacitated creature can't take actions or reactions.`,
  invisible: `* An invisible creature is impossible to see without the aid of magic or a special sense. For the purpose of hiding, the creature is heavily obscured. The creature's location can be detected by any noise it makes or any tracks it leaves.
* Attack rolls against the creature have disadvantage, and the creature's attack rolls have advantage`,
  paralyzed: `* A paralyzed creature is incapacitated (see the condition) and can't move or speak.
* The creature automatically fails Strength and Dexterity saving throws.
* Attack rolls against the creature have advantage.
* Any attack that hits the creature is a critical hit if the attacker is within 5 feet of the creature`,
  petrified: `* A petrified creature is transformed, along with any nonmagical object it is wearing or carrying, into a solid inanimate substance (usually stone). Its weight increases by a factor of ten, and it ceases aging.
* The creature is incapacitated (see the condition), can't move or speak, and is unaware of its surroundings. 
* Attack rolls against the creature have advantage. 
* The creature automatically fails Strength and Dexterity saving throws. 
* The creature has resistance to all damage. 
* The creature is immune to poison and disease, although a poison or disease already in its system is suspended, not neutralized.`,
  poisoned: `* A poisoned creature has disadvantage on attack rolls and ability checks.`,
  prone: `* A prone creature's only movement option is to crawl, unless it stands up and thereby ends the condition.
* The creature has disadvantage on attack rolls.
* An attack roll against the creature has advantage if the attacker is within 5 feet of the creature.`,
  restrained: `* A restrained creature's speed becomes 0, and it can't benefit from any bonus to its speed.
* Attack rolls against the creature have advantage.
* The creature has disadvantage on Dexterity saving throws.`,
  stunned: `* A stunned creature is incapacitated (see the condition) and can't move or speak.
* The creature automatically fails Strength and Dexterity saving throws.
* Attack rolls against the creature have advantage.`,
  unconscious: `* An unconscious creature is incapacitated (see the condition), can't move or speak, and is unaware of its surroundings.
* The creature drops whatever it's holding and falls prone.
* The creature automatically fails Strength and Dexterity saving throws.
* Attack rolls against the creature have advantage.
* Any attack that hits the creature is a critical hit if the attacker is within 5 feet of the creature.`,
};
