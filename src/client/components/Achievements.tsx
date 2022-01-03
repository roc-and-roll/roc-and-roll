import React, { useState } from "react";
import { logEntryAchievementAdd, playerUpdate } from "../../shared/actions";
import { achievements, RRAchievement } from "./achievementList";
import { useServerDispatch } from "../state";
import { Players } from "./Players";
import { RRPlayerID } from "../../shared/state";
import { Button } from "./ui/Button";
import { SmartTextInput } from "./ui/TextInput";
import { useMyProps } from "../myself";
import clsx from "clsx";

export const Achievements = React.memo(function Achievements() {
  const dispatch = useServerDispatch();
  const [filterText, setFilterText] = useState("");
  const [selectedAchievement, setSelectedAchievement] =
    useState<RRAchievement | null>(null);
  const myself = useMyProps("achievements");

  //TODO keep from unlocking the same achievement again
  function unlockAchievement(playerId: RRPlayerID, achievement: RRAchievement) {
    dispatch((state) => [
      logEntryAchievementAdd({
        payload: { achievementId: achievement.id },
        silent: false,
        playerId: playerId,
      }),
      playerUpdate({
        id: playerId,
        changes: {
          achievements: [
            ...(state.players.entities[playerId]?.achievements ?? []),
            { id: achievement.id, achievedAt: Date.now() },
          ],
        },
      }),
    ]);
  }

  function filterAchievement(achievement: RRAchievement) {
    return (
      achievement.name.toLowerCase().includes(filterText.toLowerCase()) ||
      achievement.requirement.toLowerCase().includes(filterText.toLowerCase())
    );
  }

  return (
    <div className="relative">
      {selectedAchievement && (
        <div className="absolute top-0 right-0 left-0 bottom-0 w-full h-full p-2 bg-black/90">
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
      <SmartTextInput
        value={filterText}
        onChange={(filterText) => setFilterText(filterText)}
      />
      {achievements
        .filter((a) => filterAchievement(a))
        .map((achievement) => (
          <div
            key={achievement.id}
            className={clsx(
              "border-solid border p-1 m-1 rounded cursor-pointer ",
              myself.achievements.find((a) => a.id === achievement.id)
                ? "bg-yellow-500 border-white"
                : "border-gray-400"
            )}
            onClick={() => setSelectedAchievement(achievement)}
          >
            <h4>{achievement.name}</h4>
            {achievement.requirement}
          </div>
        ))}
    </div>
  );
});
