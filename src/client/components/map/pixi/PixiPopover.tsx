import React, { ReactNode, useEffect, useRef } from "react";
import { useDialog } from "../../../dialog-boxes";
import { useLatest } from "../../../useLatest";
import { DialogContent } from "../../Dialog";

export function PixiPopover({
  content,
  visible,
  onClickOutside,
  children,
}: {
  content: ReactNode;
  visible: boolean;
  onClickOutside: () => void;
  children: React.ReactElement;
}) {
  const dialog = useDialog();
  const onClickOutsideRef = useLatest(onClickOutside);
  const updateContentRef = useRef<
    | ((
        content: (close: (result: unknown) => void) => React.ReactElement
      ) => void)
    | null
  >(null);

  // This is very bad code, but it works for now :/
  useEffect(() => {
    if (visible) {
      let close = (result: unknown) => {};
      const { result: onClosePromise, updateContent } = dialog((close_) => {
        close = close_;
        return null;
      });
      updateContentRef.current = updateContent;
      void onClosePromise.then(() => {
        updateContentRef.current = null;
        onClickOutsideRef.current();
      });
      return () => {
        close(null);
      };
    }
  }, [dialog, visible, onClickOutsideRef]);

  useEffect(() => {
    updateContentRef.current?.(() => <DialogContent>{content}</DialogContent>);
  }, [content]);

  return children;
}
