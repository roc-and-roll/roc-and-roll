import React, { useEffect, useRef, useState } from "react";
import { ReactNode, useCallback } from "react";
import { atom, useRecoilState, useSetRecoilState } from "recoil";
import { MakeRRID } from "../shared/state";
import { rrid } from "../shared/util";
import { Dialog, DialogActions } from "./components/Dialog";
import { Button } from "./components/ui/Button";
import { SmartTextareaInput, SmartTextInput } from "./components/ui/TextInput";
import { mapSetImmutably, mapDeleteImmutably } from "./immutable-helpers";
import { nl2br } from "./util";

type AlertID = MakeRRID<"popup/alert">;

type AlertData = { message: ReactNode; onClose: () => void };

const alertAtom = atom<Map<AlertID, AlertData>>({
  default: new Map(),
  key: "popup/alerts",
});

export function useAlert() {
  const setAlerts = useSetRecoilState(alertAtom);

  return useCallback(
    (message: ReactNode) => {
      const id = rrid<{ id: AlertID }>();
      return new Promise<void>((resolve) =>
        setAlerts((alerts) =>
          mapSetImmutably(alerts, id, { message, onClose: resolve })
        )
      );
    },
    [setAlerts]
  );
}

type ConfirmID = MakeRRID<"popup/confirm">;

type ConfirmData = {
  message: ReactNode;
  onClose: (confirmed: boolean) => void;
};

const confirmAtom = atom<Map<ConfirmID, ConfirmData>>({
  default: new Map(),
  key: "popup/confirm",
});

export function useConfirm() {
  const setConfirms = useSetRecoilState(confirmAtom);

  return useCallback(
    (message: ReactNode) => {
      const id = rrid<{ id: ConfirmID }>();
      return new Promise<boolean>((resolve) =>
        setConfirms((confirms) =>
          mapSetImmutably(confirms, id, {
            message,
            onClose: resolve,
          })
        )
      );
    },
    [setConfirms]
  );
}

type PromptID = MakeRRID<"popup/prompt">;

type PromptData = {
  message: ReactNode;
  initialValue: string | undefined;
  multiline: boolean;
  onClose: (result: string | null) => void;
};

const promptAtom = atom<Map<PromptID, PromptData>>({
  default: new Map(),
  key: "popup/prompt",
});

export function usePrompt() {
  const setPrompts = useSetRecoilState(promptAtom);

  return useCallback(
    (message: ReactNode, initialValue?: string, multiline: boolean = false) => {
      const id = rrid<{ id: PromptID }>();
      return new Promise<string | null>((resolve) =>
        setPrompts((prompts) =>
          mapSetImmutably(prompts, id, {
            message,
            onClose: resolve,
            initialValue,
            multiline,
          })
        )
      );
    },
    [setPrompts]
  );
}

type DialogID = MakeRRID<"popup/dialog">;

type DialogData<T> = {
  content: (onClose: (result: T | null) => void) => ReactNode;
  onClose: (result: T | null) => void;
};

const dialogAtom = atom<Map<DialogID, DialogData<any>>>({
  default: new Map(),
  key: "popup/dialog",
});

export function useDialog() {
  const setDialogs = useSetRecoilState(dialogAtom);

  return useCallback(
    function <T>(content: DialogData<T>["content"]) {
      const id = rrid<{ id: DialogID }>();
      return new Promise<T | null>((resolve) =>
        setDialogs((dialogs) =>
          mapSetImmutably(dialogs, id, {
            content,
            onClose: resolve,
          })
        )
      );
    },
    [setDialogs]
  );
}

export function DialogBoxes() {
  const [alerts, setAlerts] = useRecoilState(alertAtom);
  const [confirms, setConfirms] = useRecoilState(confirmAtom);
  const [prompts, setPrompts] = useRecoilState(promptAtom);
  const [dialogs, setDialogs] = useRecoilState(dialogAtom);

  return (
    <>
      {[...alerts.entries()].map(([id, { message, onClose }]) => (
        <Alert
          key={id}
          message={message}
          onClose={() => {
            setAlerts((alerts) => mapDeleteImmutably(alerts, id));
            onClose();
          }}
        />
      ))}
      {[...confirms.entries()].map(([id, { message, onClose }]) => (
        <Confirm
          key={id}
          message={message}
          onClose={(confirmed) => {
            setConfirms((confirms) => mapDeleteImmutably(confirms, id));
            onClose(confirmed);
          }}
        />
      ))}
      {[...prompts.entries()].map(
        ([id, { message, onClose, initialValue, multiline }]) => (
          <Prompt
            key={id}
            message={message}
            initialValue={initialValue}
            multiline={multiline}
            onClose={(result) => {
              setPrompts((prompts) => mapDeleteImmutably(prompts, id));
              onClose(result);
            }}
          />
        )
      )}
      {[...dialogs.entries()].map(([id, { content, onClose }]) => (
        <DialogHelper
          key={id}
          content={content}
          onClose={(result) => {
            setDialogs((dialogs) => mapDeleteImmutably(dialogs, id));
            onClose(result);
          }}
        />
      ))}
    </>
  );
}

function formatMessage(message: ReactNode) {
  return typeof message === "string" ? <p>{nl2br(message)}</p> : message;
}

function Alert({ message, onClose }: AlertData) {
  return (
    <Dialog open onClose={onClose}>
      {formatMessage(message)}
      <DialogActions>
        <Button onClick={onClose}>close</Button>
      </DialogActions>
    </Dialog>
  );
}

function Confirm({ message, onClose }: ConfirmData) {
  return (
    <Dialog open onClose={() => onClose(false)}>
      {formatMessage(message)}
      <DialogActions>
        <Button onClick={() => onClose(false)}>cancel</Button>
        <Button onClick={() => onClose(true)}>confirm</Button>
      </DialogActions>
    </Dialog>
  );
}

function Prompt({ message, onClose, initialValue, multiline }: PromptData) {
  const [value, setValue] = useState(initialValue ?? "");
  const ref = useRef<HTMLInputElement & HTMLTextAreaElement>(null);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  return (
    <Dialog open onClose={() => onClose(null)}>
      {formatMessage(message)}
      {multiline ? (
        <SmartTextareaInput
          value={value}
          onChange={(value) => setValue(value)}
          ref={ref}
        />
      ) : (
        <SmartTextInput
          type="text"
          value={value}
          onChange={(value) => setValue(value)}
          onKeyPress={(e) => {
            if (e.key === "Enter") {
              onClose(value);
            }
          }}
          ref={ref}
        />
      )}
      <DialogActions>
        <Button onClick={() => onClose(null)}>cancel</Button>
        <Button onClick={() => onClose(value)}>confirm</Button>
      </DialogActions>
    </Dialog>
  );
}

function DialogHelper({ content, onClose }: DialogData<unknown>) {
  return (
    <Dialog open onClose={() => onClose(null)}>
      {content(onClose)}
    </Dialog>
  );
}
