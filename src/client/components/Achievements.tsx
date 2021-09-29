import React, { useState } from "react";
import { logEntryAchievementAdd } from "../../shared/actions";
import { achievements, RRAchievement } from "./achievementList";
import { useServerDispatch } from "../state";
import { Players } from "./Players";
import { RRPlayerID } from "../../shared/state";
import { Button } from "./ui/Button";

export const Achievements = React.memo(function Achievements() {
  const dispatch = useServerDispatch();
  const [filterText, setFilterText] = useState("");
  const [selectedAchievement, setSelectedAchievement] =
    useState<RRAchievement | null>(null);

  function unlockAchievement(playerId: RRPlayerID, achievement: RRAchievement) {
    dispatch(
      logEntryAchievementAdd({
        payload: { achievementId: achievement.id },
        silent: false,
        playerId: playerId,
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
    <div className="achievements">
      {selectedAchievement && (
        <div className="achievement-player-select">
          Select a player to award &quot;{selectedAchievement.name}&quot; to:
          <Players
            onClickPlayer={(player) => {
              unlockAchievement(player.id, selectedAchievement);
              setSelectedAchievement(null);
            }}
          />
          <Button onClick={() => setSelectedAchievement(null)}>Cancel</Button>
        </div>
      )}
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
            onClick={() => setSelectedAchievement(achievement)}
          >
            <h4>{achievement.name}</h4>
            {achievement.requirement}
          </div>
        ))}
    </div>
  );
});
