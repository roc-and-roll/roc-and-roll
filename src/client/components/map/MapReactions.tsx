import React, { useCallback, useEffect, useState } from "react";
import { RRMapID } from "../../../shared/state";
import {
  RRMessage,
  RRMessageReaction,
  useServerMessages,
} from "../../serverMessages";

export const MapReactions = React.memo(function MapReactions({
  mapId,
}: {
  mapId: RRMapID;
}) {
  const { subscribe, unsubscribe } = useServerMessages();

  const [reactions, setReactions] = useState<RRMessageReaction[]>([]);

  const handleExpired = useCallback((message: RRMessageReaction) => {
    setReactions((r) => r.filter((r) => r.id !== message.id));
  }, []);

  useEffect(() => {
    const onMessage = (message: RRMessage) => {
      if (message.type === "reaction" && message.mapId === mapId) {
        setReactions((r) => [...r, message]);
      }
    };
    subscribe(onMessage);

    return () => {
      unsubscribe(onMessage);
    };
  }, [mapId, subscribe, unsubscribe]);

  return (
    <>
      {reactions.map((msg) => (
        <MapReaction key={msg.id} reaction={msg} onExpired={handleExpired} />
      ))}
    </>
  );
});

const MapReaction = React.memo(function MapReaction({
  reaction,
  onExpired,
}: {
  reaction: RRMessageReaction;
  onExpired: (reaction: RRMessageReaction) => void;
}) {
  useEffect(() => {
    const id = setTimeout(() => {
      onExpired(reaction);
    }, 700);

    return () => {
      clearTimeout(id);
    };
  }, [onExpired, reaction]);

  return (
    <g transform={`translate(${reaction.point.x}, ${reaction.point.y})`}>
      <g className="map-reaction">
        <text dominantBaseline="middle" textAnchor="middle">
          {reaction.code}
        </text>
      </g>
    </g>
  );
});
