import React, {
  useEffect,
  useRef,
  useState,
  ReactNode,
  useCallback,
  useContext,
} from "react";
import { MakeRRID } from "../shared/state";
import { rrid } from "../shared/util";
import { Dialog, DialogActions } from "./components/Dialog";
import { Button } from "./components/ui/Button";
import { SmartTextareaInput, SmartTextInput } from "./components/ui/TextInput";
import { mapSetImmutably, mapDeleteImmutably } from "./immutable-helpers";
import { nl2br } from "./util";

function makeContexts<ID, Data>() {
  return {
    get: React.createContext<Map<ID, Data>>(new Map()),
    set: React.createContext<
      React.Dispatch<React.SetStateAction<Map<ID, Data>>>
    >(() => {
      throw new Error("Context not initialized");
    }),
  };
}

type AlertID = MakeRRID<"popup/alert">;

interface AlertData {
  message: ReactNode;
  onClose: () => void;
}

const alertCtxs = makeContexts<AlertID, AlertData>();

export function useAlert() {
  const setAlerts = useContext(alertCtxs.set);

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

interface ConfirmData {
  message: ReactNode;
  onClose: (confirmed: boolean) => void;
}

const confirmCtxs = makeContexts<ConfirmID, ConfirmData>();

export function useConfirm() {
  const setConfirms = useContext(confirmCtxs.set);

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

interface PromptData {
  message: ReactNode;
  initialValue: string | undefined;
  multiline: boolean;
  onClose: (result: string | null) => void;
}

const promptCtxs = makeContexts<PromptID, PromptData>();

export function usePrompt() {
  const setPrompts = useContext(promptCtxs.set);

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

interface DialogData<T> {
  content: (onClose: (result: T | null) => void) => ReactNode;
  onClose: (result: T | null) => void;
}

export const dialogCtxs = makeContexts<DialogID, DialogData<any>>();

export function useDialog() {
  const setDialogs = useContext(dialogCtxs.set);

  return useCallback(
    function <T>(content: DialogData<T>["content"]) {
      const id = rrid<{ id: DialogID }>();
      return {
        updateContent: (content: DialogData<T>["content"]) => {
          setDialogs((dialogs) => {
            const curr = dialogs.get(id);
            return curr
              ? mapSetImmutably(dialogs, id, {
                  content,
                  onClose: curr.onClose,
                })
              : dialogs;
          });
        },
        result: new Promise<T | null>((resolve) =>
          setDialogs((dialogs) =>
            mapSetImmutably(dialogs, id, {
              content,
              onClose: resolve,
            })
          )
        ),
      };
    },
    [setDialogs]
  );
}

export function DialogProvider({ children }: { children: ReactNode }) {
  const [alerts, setAlerts] = useState<Map<AlertID, AlertData>>(new Map());
  const [confirms, setConfirms] = useState<Map<ConfirmID, ConfirmData>>(
    new Map()
  );
  const [prompts, setPrompts] = useState<Map<PromptID, PromptData>>(new Map());
  const [dialogs, setDialogs] = useState<Map<DialogID, DialogData<any>>>(
    new Map()
  );

  return (
    <alertCtxs.set.Provider value={setAlerts}>
      <alertCtxs.get.Provider value={alerts}>
        <confirmCtxs.set.Provider value={setConfirms}>
          <confirmCtxs.get.Provider value={confirms}>
            <promptCtxs.set.Provider value={setPrompts}>
              <promptCtxs.get.Provider value={prompts}>
                <dialogCtxs.set.Provider value={setDialogs}>
                  <dialogCtxs.get.Provider value={dialogs}>
                    {children}
                  </dialogCtxs.get.Provider>
                </dialogCtxs.set.Provider>
              </promptCtxs.get.Provider>
            </promptCtxs.set.Provider>
          </confirmCtxs.get.Provider>
        </confirmCtxs.set.Provider>
      </alertCtxs.get.Provider>
    </alertCtxs.set.Provider>
  );
}

export function DialogBoxes() {
  const [alerts, setAlerts] = [
    useContext(alertCtxs.get),
    useContext(alertCtxs.set),
  ];
  const [confirms, setConfirms] = [
    useContext(confirmCtxs.get),
    useContext(confirmCtxs.set),
  ];
  const [prompts, setPrompts] = [
    useContext(promptCtxs.get),
    useContext(promptCtxs.set),
  ];
  const [dialogs, setDialogs] = [
    useContext(dialogCtxs.get),
    useContext(dialogCtxs.set),
  ];

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
