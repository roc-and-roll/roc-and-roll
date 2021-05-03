export interface RRAchievement {
  id: number;
  name: string;
  requirement: string;
}

export const achievements: RRAchievement[] = [
  {
    id: 1,
    name: "The Flash",
    requirement: "Move more than 120ft in a single round",
  },
  {
    id: 2,
    name: "He's already on the ground!",
    requirement: "Crit twice in one round",
  },
  {
    id: 3,
    name: "You'll be spared",
    requirement: "Miss only because you rolled a natural one",
  },
];
