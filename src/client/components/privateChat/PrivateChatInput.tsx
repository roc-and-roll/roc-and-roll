import React, { useRef, useEffect } from "react";
import { RRPlayerID } from "../../../shared/state";
import useLocalState from "../../useLocalState";
import { Button } from "../ui/Button";

export function PrivateChatInput(props: {
  send: (message: string) => void;
  otherPlayerId: RRPlayerID;
}) {
  const [text, setText, forgetText] = useLocalState(
    `privateChat/input/${props.otherPlayerId}`,
    ""
  );

  // Automatically resize the textarea whenever the typed text changes
  const textarea = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (textarea.current) {
      textarea.current.style.height = "auto";
      textarea.current.style.height =
        (textarea.current.scrollHeight + 4).toString() + "px";
    }
  }, [text]);

  // On load...
  useEffect(() => {
    // ...focus the textarea
    textarea.current?.focus();
    // ...place cursor at the end of the text
    textarea.current?.setSelectionRange(
      textarea.current.value.length,
      textarea.current.value.length
    );
  }, []);

  const send = () => {
    const message = text.trim();
    if (message.length > 0) {
      props.send(message);
      forgetText();
      textarea.current?.focus();
    }
  };

  return (
    <div className="private-chat-input">
      <textarea
        ref={textarea}
        rows={1}
        placeholder="Type message..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyPress={(e) => {
          if (!e.shiftKey && e.key === "Enter") {
            e.preventDefault();
            send();
          }
        }}
      />
      <Button onClick={send} disabled={text.trim().length === 0}>
        send
      </Button>
    </div>
  );
}
