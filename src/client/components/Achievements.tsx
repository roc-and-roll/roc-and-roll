import React, { useState } from "react";
import { logEntryAchievementAdd } from "../../shared/actions";
import { achievements, RRAchievement } from "./achievementList";
import { useMyself } from "../myself";
import { useServerDispatch } from "../state";

export function Achievements() {
  const dispatch = useServerDispatch();
  const myself = useMyself();
  const [filterText, setFilterText] = useState("");

  function unlockAchievement(achievement: RRAchievement) {
    dispatch(
      logEntryAchievementAdd({
        payload: { achievementId: achievement.id },
        silent: false,
        playerId: myself.id,
      })
    );
  }

  function filterAchievement(achievement: RRAchievement) {
    return (
      achievement.name.toLowerCase().includes(filterText.toLowerCase()) ||
      achievement.requirement.toLowerCase().includes(filterText.toLowerCase())
    );
  }

  return (
    <div>
      <input
        value={filterText}
        onChange={(event) => setFilterText(event.target.value)}
      />
      {achievements
        .filter((a) => filterAchievement(a))
        .map((achievement) => (
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
