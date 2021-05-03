import React from "react";
import { logEntryAchievementAdd } from "../../shared/actions";
import { useMyself } from "../myself";
import { useServerDispatch } from "../state";

export interface RRAchievement {
  id: number;
  name: string;
  requirement: string;
}

export const achievements: RRAchievement[] = [
  { id: 1, name: "I Shall Name You Yoshi", requirement: "Acquire a mount" },
  {
    id: 2,
    name: "Put The “Tard” In “Tardy”",
    requirement: "Be the last person to the game",
  },
  {
    id: 3,
    name: "A Wizard Is Never Late",
    requirement: "Be the first person to the game",
  },
  {
    id: 4,
    name: "Thief Of Fate",
    requirement: "Be the only person to roll 20 at a session",
  },
  {
    id: 5,
    name: "Hey, It’s Enrico Pallazo!",
    requirement: "Beat a performance check while in disguise",
  },
  { id: 6, name: "You Bow To No One", requirement: "Beat the campaign" },
  {
    id: 7,
    name: "Did I Mention I’m A God Now?",
    requirement: "Become deified",
  },
];

export function Achievements() {
  const dispatch = useServerDispatch();
  const myself = useMyself();
  function unlockAchievement(achievement: RRAchievement) {
    dispatch(
      logEntryAchievementAdd({
        payload: { achievementId: achievement.id },
        silent: false,
        playerId: myself.id,
      })
    );
  }

  return (
    <div>
      {achievements.map((achievement) => (
        <div
          key={achievement.id}
          className="achievement-button"
          onClick={() => unlockAchievement(achievement)}
        >
          <h4>{achievement.name}</h4>
          {achievement.requirement}
        </div>
      ))}
    </div>
  );
}
