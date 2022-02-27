import React, { useCallback, useEffect, useState } from "react";
import { RRMapID } from "../../../shared/state";
import {
  RRMessage,
  RRMessageReaction,
  useServerMessages,
} from "../../serverMessages";
import { RoughText } from "../rough";

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

  // TODO(pixi): Re-add animation.
  //   <g className="map-reaction">

  return (
    <RoughText
      x={reaction.point.x}
      y={reaction.point.y}
      text={reaction.code}
      style={{ fontSize: 70 }}
      anchor={{ x: 0.5, y: 0.5 }}
    />
  );
});
