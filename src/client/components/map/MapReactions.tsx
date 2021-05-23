import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
} from "react";
import {
  RRMessage,
  RRMessageReaction,
  useServerMessages,
} from "../../serverMessages";

export function MapReactions() {
  const { subscribe, unsubscribe } = useServerMessages();

  const [reactions, setReactions] = useState<RRMessageReaction[]>([]);

  const handleExpired = useCallback((message: RRMessageReaction) => {
    setReactions((r) => r.filter((r) => r !== message));
  }, []);

  useEffect(() => {
    const onMessage = (message: RRMessage) => {
      if (message.type === "reaction") {
        setReactions((r) => [...r, message]);
      }
    };
    subscribe(onMessage);

    return () => {
      unsubscribe(onMessage);
    };
  });

  return (
    <>
      {reactions.map((msg, i) => (
        <MapReaction key={i} reaction={msg} onExpired={handleExpired} />
      ))}
    </>
  );
}

function MapReaction({
  reaction,
  onExpired,
}: {
  reaction: RRMessageReaction;
  onExpired: (reaction: RRMessageReaction) => void;
}) {
  useLayoutEffect(() => {
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
}
